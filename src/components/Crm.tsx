"use client";
// ============================================================
//  SHELL-UL APLICAȚIEI (portat din render + init)
// ============================================================
import { useEffect, useRef } from "react";
import { useIsAdmin } from "@/lib/admin";
import { newTask } from "@/lib/forms";
import { useStore } from "@/lib/store";
import { currentMemberId, mem } from "@/lib/calc";
import { ProfileModal } from "./ProfileModal";
import { Sidebar } from "./Sidebar";
import { Modal } from "./ui/Modal";
import { Dash } from "./views/Dash";
import { Kpi } from "./views/Kpi";
import { Notifications } from "./views/Notifications";
import { Settings } from "./views/Settings";
import { Tasks } from "./views/Tasks";
import { Team } from "./views/Team";

export function Crm() {
  const bootstrap = useStore((s) => s.bootstrap);
  const loaded = useStore((s) => s.loaded);
  const S = useStore((s) => s.S);
  const tab = useStore((s) => s.tab);
  const collapsed = useStore((s) => s.collapsed);
  const authEmail = useStore((s) => s.authEmail);
  const mutate = useStore((s) => s.mutate);
  const admin = useIsAdmin();
  const profileOpen = useStore((s) => s.profileOpen);
  const setProfileOpen = useStore((s) => s.setProfileOpen);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Onboarding: membru fără poză de profil → modalul se deschide singur la
  // fiecare intrare (o dată per încărcare, până îşi pune poza).
  const promptedRef = useRef(false);
  useEffect(() => {
    if (promptedRef.current || !S) return;
    const m0 = currentMemberId(S, useStore.getState().me, authEmail);
    const memb = m0 ? mem(S, m0) : undefined;
    if (memb && !memb.photo) {
      promptedRef.current = true;
      setProfileOpen(true);
    }
  }, [S, authEmail, setProfileOpen]);

  // Primul login al unui membru invitat → marcăm contul ca activat (o singură dată).
  useEffect(() => {
    if (!S || !authEmail) return;
    const m = S.members.find((x) => (x.email || "").toLowerCase() === authEmail);
    if (m && !m.activatedAt) {
      mutate((St) => {
        const mm = St.members.find((x) => x.id === m.id);
        if (mm && !mm.activatedAt) mm.activatedAt = new Date().toISOString().slice(0, 10);
      });
    }
  }, [S, authEmail, mutate]);

  // Setări e doar pentru admin; dacă un user normal ajunge cumva pe „set”, cade pe Panou.
  const activeTab = tab === "set" && !admin ? "dash" : tab;
  // Oricine autentificat îşi poate crea taskuri.
  const showFab = activeTab === "tasks" || activeTab === "dash";

  return (
    <div className="shell">
      <Sidebar />
      <div className={`content ${collapsed ? "collapsed" : ""}`}>
        <main className="app-main">
          {!loaded || !S ? (
            <div className="empty">Se încarcă…</div>
          ) : activeTab === "dash" ? (
            <Dash />
          ) : activeTab === "tasks" ? (
            <Tasks />
          ) : activeTab === "kpi" ? (
            <Kpi />
          ) : activeTab === "team" ? (
            <Team />
          ) : activeTab === "notif" ? (
            <Notifications />
          ) : (
            <Settings />
          )}
        </main>
      </div>
      {showFab && loaded && S && (
        <button className="fab" title="Adaugă" onClick={() => newTask()}>
          +
        </button>
      )}
      <Modal />
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
