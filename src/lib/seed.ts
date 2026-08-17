// ============================================================
//  DATE INIȚIALE — start curat: departamente + KPI de business,
//  fără persoane și fără taskuri hardcodate (le adaugă echipa
//  din platformă). Fără roster hardcodat.
// ============================================================
import type { CrmState, Kpi, KpiDir } from "./types";
import { uid } from "./utils";

export function seed(): CrmState {
  const D = [
    { id: "mkt", n: "Marketing" },
    { id: "it", n: "IT & App" },
    { id: "sales", n: "Vânzări" },
    { id: "part", n: "Parteneriate" },
    { id: "cons", n: "Consilieri" },
    { id: "adm", n: "Administrativ & Financiar" },
  ].map((d) => ({ ...d, leadId: "" }));

  // KPI de business, la nivel de departament (fără responsabil).
  const kpi = (n: string, dept: string, target: number, unit: string, dir?: KpiDir): Kpi => ({
    id: uid(),
    n,
    dept,
    assignee: "",
    target,
    unit,
    dir: dir || "up",
    vals: {},
  });

  const K: Kpi[] = [
    kpi("Postări publicate", "mkt", 30, "buc"),
    kpi("Reach organic lunar", "mkt", 200000, "vizualizări"),
    kpi("Lead-uri generate din social", "mkt", 60, "lead-uri"),
    kpi("Videoclipuri editate", "mkt", 28, "buc"),
    kpi("Uptime platforme", "it", 99.5, "%"),
    kpi("Bug-uri rezolvate", "it", 15, "buc"),
    kpi("Funcţionalităţi livrate", "it", 3, "buc"),
    kpi("Venit lunar", "sales", 48000, "RON"),
    kpi("Sesiuni 1:1 vândute", "sales", 60, "sesiuni"),
    kpi("Rată de conversie consultaţie → client", "sales", 40, "%"),
    kpi("Parteneriate noi semnate", "part", 3, "buc"),
    kpi("Propuneri trimise", "part", 10, "buc"),
    kpi("Sponsorizări atrase", "part", 1500, "EUR"),
    kpi("Sesiuni susţinute / consilier", "cons", 45, "sesiuni"),
    kpi("Rapoarte livrate în 48h", "cons", 95, "%"),
    kpi("Satisfacţie client", "cons", 9.5, "/10"),
    kpi("Rată de no-show", "cons", 10, "%", "down"),
    kpi("Facturi emise la timp", "adm", 100, "%"),
    kpi("Raportare financiară trimisă până pe 5", "adm", 100, "%"),
  ];

  return {
    version: 2,
    departments: D,
    members: [],
    tasks: [],
    kpis: K,
    evals: [],
    weights: { exec: 40, kpi: 30, eval: 30 },
  };
}

/** Migrare defensivă — doar completează câmpuri lipsă. Fără injectare de persoane. */
export function migrate(S: CrmState): boolean {
  let changed = false;
  if (!S.version) {
    S.version = 2;
    changed = true;
  }
  if (!S.weights) {
    S.weights = { exec: 40, kpi: 30, eval: 30 };
    changed = true;
  }
  if (!Array.isArray(S.members)) {
    S.members = [];
    changed = true;
  }
  if (!Array.isArray(S.evals)) {
    S.evals = [];
    changed = true;
  }
  // v3: KPI automat „Taskuri finalizate” per departament — legat de taskuri, fără +/−.
  if ((S.version || 2) < 3) {
    S.departments.forEach((d) => {
      if (!S.kpis.some((k) => k.dept === d.id && k.auto === "tasks_done" && !(k.tag || "")))
        S.kpis.push({
          id: uid(),
          n: "Taskuri finalizate",
          dept: d.id,
          assignee: "",
          target: 10,
          unit: "buc",
          dir: "up",
          vals: {},
          auto: "tasks_done",
          tag: "",
        });
    });
    S.version = 3;
    changed = true;
  }

  // v4: KPI-urile care numără livrabile devin automate, legate de taskuri prin etichete.
  // (Cele de business — venit, reach, uptime, satisfacţie — rămân manuale: cifrele vin din afara platformei.)
  if ((S.version || 2) < 4) {
    const conv: { n: string; dept: string; tag: string }[] = [
      { n: "Postări publicate", dept: "mkt", tag: "Postare" },
      { n: "Videoclipuri editate", dept: "mkt", tag: "Video" },
      { n: "Bug-uri rezolvate", dept: "it", tag: "Bug" },
      { n: "Funcţionalităţi livrate", dept: "it", tag: "Feature" },
      { n: "Propuneri trimise", dept: "part", tag: "Propunere" },
    ];
    conv.forEach((c) => {
      const k = S.kpis.find((x) => x.n === c.n && x.dept === c.dept);
      if (k && !k.auto) {
        k.auto = "tasks_done";
        k.tag = c.tag;
      }
    });
    S.version = 4;
    changed = true;
  }

  // „Data de acoperire" a fost unificată cu deadline-ul: mutăm valorile vechi.
  (S.tasks || []).forEach((t) => {
    const legacy = t as { coverDate?: string; coverLabel?: string };
    if (legacy.coverDate) {
      if (!t.deadline) t.deadline = legacy.coverDate;
      delete legacy.coverDate;
      changed = true;
    }
    if (legacy.coverLabel !== undefined) {
      delete legacy.coverLabel;
      changed = true;
    }
  });
  return changed;
}
