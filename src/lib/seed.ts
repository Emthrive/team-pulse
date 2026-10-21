// ============================================================
//  DATE INIȚIALE — start curat: departamente + KPI de business,
//  fără persoane și fără taskuri hardcodate (le adaugă echipa
//  din platformă). Fără roster hardcodat.
// ============================================================
import { kpiAutoVal } from "./calc";
import { kpiTypeTag, retagTasks } from "./taskRules";
import type { CrmState, Kpi } from "./types";
import { monthISO, uid } from "./utils";

export function seed(): CrmState {
  const D = [
    { id: "mkt", n: "Marketing" },
    { id: "it", n: "IT & App" },
    { id: "sales", n: "Vânzări" },
    { id: "part", n: "Parteneriate" },
    { id: "cons", n: "Consilieri" },
    { id: "adm", n: "Administrativ & Financiar" },
  ];

  // KPI de business, la nivel de departament (fără responsabil).
  const kpi = (n: string, dept: string, target: number, unit: string): Kpi => ({
    id: uid(),
    n,
    dept,
    assignee: "",
    target,
    unit,
    vals: {},
  });

  const K: Kpi[] = [
    kpi("Postări publicate", "mkt", 30, "buc"),
    kpi("Videoclipuri editate", "mkt", 28, "buc"),
    kpi("Campanii realizate", "mkt", 2, "buc"),
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
    kpi("Rată de no-show", "cons", 10, "%"),
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

  // v5: eliminăm KPI-urile care nu au sens introduse manual (Uptime vine din monitoring, nu de la oameni).
  if ((S.version || 2) < 5) {
    S.kpis = S.kpis.filter((k) => !(k.n === "Uptime platforme" && k.dept === "it"));
    S.version = 5;
    changed = true;
  }

  // v6: un membru poate fi în mai multe departamente — `dept` devine `depts[]`.
  if ((S.version || 2) < 6) {
    S.members.forEach((m) => {
      if (!Array.isArray(m.depts) || !m.depts.length) m.depts = m.dept ? [m.dept] : [];
    });
    S.version = 6;
    changed = true;
  }

  // v7: KPI pentru tipul de livrabil „Campanie" (Marketing).
  if ((S.version || 2) < 7) {
    if (!S.kpis.some((k) => k.dept === "mkt" && (k.tag || "") === "Campanie")) {
      S.kpis.push({
        id: uid(),
        n: "Campanii realizate",
        dept: "mkt",
        assignee: "",
        target: 2,
        unit: "buc",
        vals: {},
        auto: "tasks_done",
        tag: "Campanie",
      });
    }
    S.version = 7;
    changed = true;
  }

  // v8: scoatem din Marketing metricile care nu-şi au locul aici (vin din analytics, nu din muncă de echipă).
  if ((S.version || 2) < 8) {
    S.kpis = S.kpis.filter(
      (k) => !(k.dept === "mkt" && (k.n === "Reach organic lunar" || k.n === "Lead-uri generate din social")),
    );
    S.version = 8;
    changed = true;
  }

  // v9: KPI automat „Epice finalizate" per departament (taskuri cu subtaskuri, finalizate).
  if ((S.version || 2) < 9) {
    S.departments.forEach((d) => {
      if (!S.kpis.some((k) => k.dept === d.id && k.auto === "epics_done"))
        S.kpis.push({
          id: uid(),
          n: "Epice finalizate",
          dept: d.id,
          assignee: "",
          target: 2,
          unit: "buc",
          vals: {},
          auto: "epics_done",
          tag: "",
        });
    });
    S.version = 9;
    changed = true;
  }

  // v10: flux nou de coloane — „În verificare" devine „Testing", „Blocat" dispare (→ „În lucru").
  if ((S.version || 2) < 10) {
    S.tasks.forEach((t) => {
      const st = t.status as string;
      if (st === "review") t.status = "testing";
      if (st === "blocat") t.status = "lucru";
    });
    S.version = 10;
    changed = true;
  }

  // v11: prioritate simplificată la 2 trepte — orice nu e „critica" devine „normala".
  if ((S.version || 2) < 11) {
    S.tasks.forEach((t) => {
      if ((t.priority as string) !== "critica") t.priority = "normala";
    });
    S.version = 11;
    changed = true;
  }

  // v12: KPI doar automate — ştergem KPI-urile manuale (cele fără sursă auto, cu cifre din
  // afara platformei: venit, satisfacţie, rate etc.). Rămân doar cele calculate din taskuri.
  if ((S.version || 2) < 12) {
    S.kpis = S.kpis.filter((k) => !!k.auto);
    S.version = 12;
    changed = true;
  }

  // v13: „Epice finalizate" rămâne doar la IT & App — se scoate din restul departamentelor.
  // (La nevoie se re-adaugă din formularul de KPI, sursa „Auto · Epice finalizate".)
  if ((S.version || 2) < 13) {
    S.kpis = S.kpis.filter((k) => !(k.auto === "epics_done" && k.dept !== "it"));
    S.version = 13;
    changed = true;
  }

  // v14: fără procente la KPI — unitatea e mereu „buc" (se numără bucăţi: taskuri, epice).
  if ((S.version || 2) < 14) {
    S.kpis.forEach((k) => {
      k.unit = "buc";
    });
    S.version = 14;
    changed = true;
  }

  // v15: eticheta (tipul de livrabil) unui KPI e mereu denumirea lui. KPI-urile cu altă etichetă
  // (ex. „Postări publicate" #Postare) o primesc pe cea nouă, iar taskurile lor sunt re-etichetate,
  // ca să rămână numărate. Cele generice („Taskuri finalizate", „Epice finalizate") rămân fără.
  if ((S.version || 2) < 15) {
    S.kpis.forEach((k) => {
      const tag = kpiTypeTag(k);
      retagTasks(S.tasks, k.dept, k.tag || "", tag);
      k.tag = tag;
    });
    S.version = 15;
    changed = true;
  }

  // v16: KPI-ul generic de taskuri numără tot departamentul — fără etichetă. Repară cazul în care
  // redenumirea lui (ex. „Taskuri finalizate" → „Taskuri") i-a pus din greşeală o etichetă.
  if ((S.version || 2) < 16) {
    S.kpis.forEach((k) => {
      const tag = (k.tag || "").trim().toLowerCase();
      if (k.auto === "tasks_done" && (tag === "taskuri" || tag === "taskuri finalizate")) k.tag = "";
    });
    S.version = 16;
    changed = true;
  }

  // v17: KPI-urile de sistem — „Taskuri finalizate" (generic, numără tot departamentul) şi
  // „Epice finalizate" — se marchează system: nu mai pot fi editate. Fiecare departament are unul
  // „Taskuri finalizate" (se adaugă dacă lipseşte).
  if ((S.version || 2) < 17) {
    S.kpis.forEach((k) => {
      const generic = k.auto === "tasks_done" && !(k.tag || "").trim();
      if (k.auto === "epics_done" || generic) k.system = true;
    });
    S.departments.forEach((d) => {
      if (S.kpis.some((k) => k.dept === d.id && k.system && k.auto === "tasks_done")) return;
      S.kpis.push({ id: uid(), n: "Taskuri finalizate", dept: d.id, assignee: "", target: 10, unit: "buc", vals: {}, auto: "tasks_done", tag: "", system: true });
    });
    S.version = 17;
    changed = true;
  }

  // Arhivare automată (rulează mereu, idempotent): în Finalizat de peste 7 zile
  // de la ULTIMA finalizare (completedAt se resetează la reopen → cronometrul repornește).
  {
    const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    (S.tasks || []).forEach((t) => {
      if (t.status === "gata" && !t.archived && t.completedAt && t.completedAt <= cutoff) {
        t.archived = true;
        changed = true;
      }
    });
  }

  // Snapshot lunar KPI (rulează mereu, idempotent): la închiderea unei luni, valorile
  // auto se îngheaţă în k.vals — ştergerea/arhivarea taskurilor nu mai rescrie istoricul.
  {
    const cur = monthISO();
    let [y, m] = cur.split("-").map(Number);
    const past: string[] = [];
    for (let i = 0; i < 12; i++) {
      m--;
      if (m === 0) {
        m = 12;
        y--;
      }
      past.push(y + "-" + String(m).padStart(2, "0"));
    }
    S.kpis.forEach((k) => {
      if (!k.auto) return;
      k.vals = k.vals || {};
      past.forEach((mm) => {
        if (k.vals[mm] === undefined) {
          const v = kpiAutoVal(S, k, mm);
          if (v > 0) {
            k.vals[mm] = v;
            changed = true;
          }
        }
      });
    });
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
