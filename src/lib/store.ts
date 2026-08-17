"use client";
// ============================================================
//  STORE GLOBAL (Zustand) + sincronizare Firestore
//  Datele întregului CRM sunt ținute într-un singur document
//  Firestore („crm/{docId}”), la fel ca blob-ul unic din varianta HTML.
//  Când Firebase nu e configurat, cade automat pe localStorage.
// ============================================================
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { create } from "zustand";
import { CRM_DOC_ID } from "./constants";
import { db, firebaseReady } from "./firebase";
import { migrate, seed } from "./seed";
import type { CrmState, Filters, SyncState, TabId } from "./types";
import { monthISO } from "./utils";

const LS_KEY = "emthrive_crm_v1";
const ME_KEY = "emthrive_crm_me";

export interface FormField {
  key: string;
  label: string;
  /** „checks” = listă de checkbox-uri; valoarea e id-urile bifate, separate prin virgulă. */
  type?: "text" | "select" | "textarea" | "range" | "date" | "number" | "checks";
  value?: string | number;
  ph?: string;
  options?: { v: string; l: string }[];
  min?: number;
  max?: number;
  step?: number | string;
}

export interface FormConfig {
  title: string;
  note?: string;
  ok?: string;
  fields: FormField[];
  // Primesc draft-ul de stare (`S`) și re-găsesc entitățile după id în interior,
  // ca să nu depindem de referințe capturate la deschiderea formularului.
  onSubmit: (data: Record<string, string>, S: CrmState) => void;
  onDelete?: ((S: CrmState) => void) | null;
}

interface Store {
  S: CrmState | null;
  me: string;
  authEmail: string;
  sync: SyncState;
  loaded: boolean;

  tab: TabId;
  open: Record<string, boolean>;
  flt: Filters;
  kmonth: string;
  emonth: string;
  form: FormConfig | null;
  collapsed: boolean;

  bootstrap: () => void;
  mutate: (fn: (s: CrmState) => void) => void;
  replaceState: (next: CrmState) => void;
  setMe: (id: string) => void;
  setAuthEmail: (email: string) => void;

  setTab: (t: TabId) => void;
  toggleOpen: (id: string) => void;
  setFlt: (patch: Partial<Filters>) => void;
  resetFlt: () => void;
  setKMonth: (v: string) => void;
  setEMonth: (v: string) => void;
  toggleCollapsed: () => void;

  openForm: (cfg: FormConfig) => void;
  closeForm: () => void;
  submitForm: (data: Record<string, string>) => void;
  deleteForm: () => void;
}

const emptyFlt: Filters = { dept: "", member: "", status: "", only: "" };

let started = false;

function clone(s: CrmState): CrmState {
  return JSON.parse(JSON.stringify(s));
}

export const useStore = create<Store>((set, get) => {
  // --- persistență (Firestore sau localStorage) ---
  async function persist(next: CrmState) {
    set({ sync: "wait" });
    const json = JSON.stringify(next);
    if (firebaseReady) {
      try {
        await setDoc(doc(db, "crm", CRM_DOC_ID), { json, updatedAt: Date.now() });
        set({ sync: "ok" });
      } catch {
        set({ sync: "err" });
      }
    } else {
      try {
        localStorage.setItem(LS_KEY, json);
        set({ sync: "ok" });
      } catch {
        set({ sync: "err" });
      }
    }
  }

  return {
    S: null,
    me: "",
    authEmail: "",
    sync: "ok",
    loaded: false,

    tab: "dash",
    open: {},
    flt: { ...emptyFlt },
    kmonth: monthISO(),
    emonth: monthISO(),
    form: null,
    collapsed: false,

    bootstrap() {
      if (started) return;
      started = true;

      // identitatea „cine sunt” e per-dispozitiv
      try {
        const me = localStorage.getItem(ME_KEY) || "";
        if (me) set({ me });
      } catch {
        /* fără localStorage */
      }

      // starea sidebar-ului (colapsat/extins) e per-dispozitiv
      try {
        const c = localStorage.getItem("emthrive_nav_collapsed");
        if (c === "1") set({ collapsed: true });
      } catch {
        /* ignore */
      }

      if (firebaseReady) {
        onSnapshot(
          doc(db, "crm", CRM_DOC_ID),
          (snap) => {
            const data = snap.data() as { json?: string } | undefined;
            if (!data || !data.json) {
              // primul boot — semănăm datele inițiale
              const s = seed();
              migrate(s);
              persist(s);
              set({ S: s, loaded: true, sync: "ok" });
              return;
            }
            let s: CrmState;
            try {
              s = JSON.parse(data.json);
            } catch {
              return;
            }
            if (!s || !s.departments) {
              const fresh = seed();
              migrate(fresh);
              persist(fresh);
              set({ S: fresh, loaded: true });
              return;
            }
            const changed = migrate(s);
            set({ S: s, loaded: true, sync: "ok" });
            if (changed) persist(s);
          },
          () => set({ sync: "err" }),
        );
      } else {
        // fallback local
        let s: CrmState | null = null;
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) s = JSON.parse(raw);
        } catch {
          /* prima rulare */
        }
        if (!s || !s.departments) {
          s = seed();
          migrate(s);
          persist(s);
        } else if (migrate(s)) {
          persist(s);
        }
        set({ S: s, loaded: true });
      }
    },

    mutate(fn) {
      const cur = get().S;
      if (!cur) return;
      // Mutăm starea curentă în loc (callback-urile de formular capturează
      // referințe la entități, ca în varianta originală), apoi punem o
      // referință nouă ca React să re-randeze.
      fn(cur);
      const next = clone(cur);
      set({ S: next });
      persist(next);
    },

    replaceState(next) {
      set({ S: next });
      persist(next);
    },

    setMe(id) {
      set({ me: id || "" });
      try {
        localStorage.setItem(ME_KEY, id || "");
      } catch {
        /* ignore */
      }
    },

    setAuthEmail(email) {
      set({ authEmail: (email || "").toLowerCase() });
    },

    setTab(t) {
      if (typeof window !== "undefined") window.scrollTo(0, 0);
      set({ tab: t });
    },
    toggleOpen(id) {
      set((st) => ({ open: { ...st.open, [id]: !st.open[id] } }));
    },
    setFlt(patch) {
      set((st) => ({ flt: { ...st.flt, ...patch } }));
    },
    resetFlt() {
      set({ flt: { ...emptyFlt } });
    },
    setKMonth(v) {
      set({ kmonth: v });
    },
    setEMonth(v) {
      set({ emonth: v });
    },
    toggleCollapsed() {
      const v = !get().collapsed;
      set({ collapsed: v });
      try {
        localStorage.setItem("emthrive_nav_collapsed", v ? "1" : "0");
      } catch {
        /* ignore */
      }
    },

    openForm(cfg) {
      set({ form: cfg });
    },
    closeForm() {
      set({ form: null });
    },
    submitForm(data) {
      const cfg = get().form;
      if (!cfg) return;
      set({ form: null });
      get().mutate((S) => cfg.onSubmit(data, S));
    },
    deleteForm() {
      const cfg = get().form;
      if (!cfg || !cfg.onDelete) return;
      const del = cfg.onDelete;
      set({ form: null });
      get().mutate((S) => del(S));
    },
  };
});
