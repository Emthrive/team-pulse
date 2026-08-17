// ============================================================
//  DATE INIȚIALE + MIGRARE (portate din CRM-ul original)
// ============================================================
import type { CrmState, Kpi, KpiDir, PriorityId, StatusId, Subtask, Task } from "./types";
import { fmtDate, todayISO, uid } from "./utils";

export function seed(): CrmState {
  const D = [
    { id: "mkt", n: "Marketing" },
    { id: "it", n: "IT & App" },
    { id: "sales", n: "Vânzări" },
    { id: "part", n: "Parteneriate" },
    { id: "cons", n: "Consilieri" },
    { id: "adm", n: "Administrativ & Financiar" },
  ].map((d) => ({ ...d, leadId: "" }));

  const M = [
    { id: "m1", n: "Mihaela Ciuraru", role: "Fondator & coordonator", dept: "adm" },
    { id: "m2", n: "Cristina Stângă", role: "Colaborator · parteneriate", dept: "part" },
  ].map((x) => ({ ...x, active: true }));

  const mk = (
    title: string,
    dept: string,
    who: string,
    dl: string,
    tags: string[],
    prio: PriorityId,
    st: StatusId,
    subs: [string, string, string, boolean][],
  ): Task => ({
    id: uid(),
    title,
    dept,
    assignee: who,
    deadline: dl,
    priority: prio || "medie",
    status: st || "lucru",
    progress: 0,
    tags: tags || [],
    notes: "",
    recurring: "",
    subtasks: (subs || []).map((s) => ({
      id: uid(),
      title: s[0],
      assignee: s[1] || "",
      deadline: s[2] || "",
      done: !!s[3],
    })),
    createdAt: todayISO(),
    completedAt: "",
  });

  const T: Task[] = [
    mk("Postări Theona (calendar advent)", "mkt", "m7", "", ["Theona"], "ridicata", "lucru", [
      ["Cover postare lansare advent", "m7", "", false],
      ["Text postare comunitate", "m7", "", false],
    ]),
    mk("Postări SuccesPlus", "mkt", "m7", "", ["SuccesPlus"], "ridicata", "lucru", [
      ["Cover postare SP 12 august", "m7", "", false],
      ["Carusel „ce e testul vocaţional”", "m7", "", false],
    ]),
    mk("Postări Emthrive", "mkt", "m7", "", ["Emthrive"], "ridicata", "lucru", [
      ["Poveste din şedinţele de consiliere", "m7", "", false],
      ["Cover tabără Tineri de Succes", "m7", "", false],
    ]),
    mk("Plugin test vocaţional — bug-uri raportate", "it", "m8", "", ["Platformă"], "ridicata", "lucru", []),
    mk("Follow-up lead-uri consultaţii telefonice", "sales", "m1", "", [], "critica", "lucru", []),
    mk("Propuneri parteneriat licee private", "part", "m2", "", [], "ridicata", "todo", []),
    mk("Rapoarte de consiliere restante", "cons", "m3", "", [], "medie", "lucru", []),
  ];

  const kpi = (
    n: string,
    dept: string,
    who: string,
    target: number,
    unit: string,
    dir?: KpiDir,
  ): Kpi => ({ id: uid(), n, dept, assignee: who || "", target, unit, dir: dir || "up", vals: {} });

  const K: Kpi[] = [
    kpi("Postări publicate", "mkt", "m7", 30, "buc"),
    kpi("Reach organic lunar", "mkt", "m7", 200000, "vizualizări"),
    kpi("Lead-uri generate din social", "mkt", "m7", 60, "lead-uri"),
    kpi("Uptime platforme", "it", "m8", 99.5, "%"),
    kpi("Bug-uri rezolvate", "it", "m8", 15, "buc"),
    kpi("Funcţionalităţi livrate", "it", "m8", 3, "buc"),
    kpi("Venit lunar", "sales", "m1", 48000, "RON"),
    kpi("Sesiuni 1:1 vândute", "sales", "m1", 60, "sesiuni"),
    kpi("Rată de conversie consultaţie → client", "sales", "m1", 40, "%"),
    kpi("Parteneriate noi semnate", "part", "m2", 3, "buc"),
    kpi("Propuneri trimise", "part", "m2", 10, "buc"),
    kpi("Sponsorizări atrase", "part", "m2", 1500, "EUR"),
    kpi("Sesiuni susţinute / consilier", "cons", "", 45, "sesiuni"),
    kpi("Rapoarte livrate în 48h", "cons", "", 95, "%"),
    kpi("Satisfacţie client", "cons", "", 9.5, "/10"),
    kpi("Rată de no-show", "cons", "", 10, "%", "down"),
    kpi("Facturi emise la timp", "adm", "m1", 100, "%"),
  ];

  return {
    version: 1,
    departments: D,
    members: M,
    tasks: T,
    kpis: K,
    evals: [],
    weights: { exec: 40, kpi: 30, eval: 30 },
  };
}

// ---------- echipa reală (se adaugă o singură dată, prin migrare) ----------
const ROSTER = [
  { n: "Olaru Dragoş", role: "IT · dezvoltare Emthrive", dept: "it" },
  { n: "Silviu Paraschiv", role: "IT · dezvoltare SuccesPlus", dept: "it" },
  { n: "Alex Chiriac", role: "Editare video · 7 postări/săptămână Emthrive", dept: "mkt" },
  { n: "Nicoleta Stamate", role: "Prezentări workshopuri · grafică statică", dept: "mkt" },
  { n: "Maria Zănoagă", role: "Postări SuccesPlus · teste şi programări", dept: "mkt" },
  { n: "David Grinberg", role: "Postări SuccesPlus · teste şi programări", dept: "mkt" },
  { n: "Daniela Lupaşcu", role: "Control documente · rapoarte consiliere", dept: "adm" },
  { n: "Cosmin", role: "Raportare financiară", dept: "adm" },
];

const ZILE = ["luni", "marţi", "miercuri", "joi", "vineri", "sâmbătă", "duminică"];

function weekDates(): string[] {
  const d = new Date();
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function next5th(): string {
  const d = new Date();
  let y = d.getFullYear();
  let m = d.getMonth();
  if (d.getDate() > 5) {
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return y + "-" + String(m + 1).padStart(2, "0") + "-05";
}

interface RosterTaskDef {
  title: string;
  dept: string;
  who: string;
  priority: PriorityId;
  status?: StatusId;
  tags?: string[];
  deadline?: string;
  recurring?: "saptamanal" | "lunar";
  coverLabel?: string;
  notes?: string;
  subs?: [string, string][];
}

function ROSTER_TASKS(): RosterTaskDef[] {
  const W = weekDates();
  return [
    { title: "Dezvoltare platformă Emthrive", dept: "it", who: "Olaru Dragoş", priority: "ridicata", tags: ["Emthrive"], coverLabel: "Livrat până la" },
    { title: "Dezvoltare platformă SuccesPlus", dept: "it", who: "Silviu Paraschiv", priority: "ridicata", tags: ["SuccesPlus"], coverLabel: "Livrat până la" },
    {
      title: "Editare video — 7 postări / săptămână Emthrive",
      dept: "mkt",
      who: "Alex Chiriac",
      priority: "ridicata",
      deadline: W[6],
      recurring: "saptamanal",
      tags: ["Emthrive", "Video"],
      coverLabel: "Editat până la",
      notes:
        "Săptămâna " + fmtDate(W[0]) + " – " + fmtDate(W[6]) +
        ". La final de săptămână apeşi „Reînnoiesc ciclul” şi subtaskurile se resetează pe săptămâna următoare.",
      subs: ZILE.map((z, i) => ["Video " + (i + 1) + " · " + z, W[i]] as [string, string]),
    },
    { title: "Editare clipuri de prezentare Gala (Opus Clip)", dept: "mkt", who: "Alex Chiriac", priority: "ridicata", tags: ["Gala", "Opus Clip"], coverLabel: "Clipuri gata până la" },
    { title: "Prezentări pentru workshopuri", dept: "mkt", who: "Nicoleta Stamate", priority: "medie", tags: ["Emthrive", "Workshop"] },
    {
      title: "Postări statice Theona Balan — Gala + covere",
      dept: "mkt",
      who: "Nicoleta Stamate",
      priority: "ridicata",
      tags: ["Theona", "Gala"],
      subs: [["Set postări statice Gala", ""], ["Covere postări", ""]],
    },
    { title: "Teste + programări SuccesPlus", dept: "cons", who: "David Grinberg", priority: "ridicata", tags: ["SuccesPlus"], coverLabel: "Programat până la", notes: "Completează în „Programat până la” data limită până la care sunt programate testele." },
    { title: "Bibliorafturi SuccesPlus — control şi finalizare", dept: "adm", who: "Daniela Lupaşcu", priority: "medie", coverLabel: "Verificat până la" },
    { title: "Rapoarte Emthrive — finalizare şi trimitere către părinţi", dept: "cons", who: "Daniela Lupaşcu", priority: "ridicata", coverLabel: "Trimise părinţilor până la" },
    { title: "Raportare financiară către contabilitate", dept: "adm", who: "Cosmin", priority: "critica", status: "todo", deadline: next5th(), recurring: "lunar", notes: "Termen fix: 5 ale fiecărei luni." },
  ];
}

/** Migrare in-place. Întoarce true dacă starea s-a schimbat (trebuie salvată). */
export function migrate(S: CrmState): boolean {
  let changed = false;
  if (!S.version) S.version = 1;
  if (!S.weights) S.weights = { exec: 40, kpi: 30, eval: 30 };

  if (S.version < 2) {
    const ph = ["Consilier 1", "Consilier 2", "Consilier 3", "Consilier 4", "Marketing 1", "Developer 1"];
    const phIds = S.members.filter((m) => ph.includes(m.n)).map((m) => m.id);
    if (phIds.length) {
      S.tasks.forEach((t) => {
        if (phIds.includes(t.assignee)) t.assignee = "";
        (t.subtasks || []).forEach((x) => {
          if (phIds.includes(x.assignee)) x.assignee = "";
        });
      });
      S.kpis.forEach((k) => {
        if (phIds.includes(k.assignee)) k.assignee = "";
      });
      S.evals = S.evals.filter((e) => !phIds.includes(e.member));
      S.members = S.members.filter((m) => !ph.includes(m.n));
    }

    ROSTER.forEach((r) => {
      if (!S.members.some((m) => m.n === r.n))
        S.members.push({ id: uid(), n: r.n, role: r.role, dept: r.dept, active: true });
    });

    const ids = S.members.map((m) => m.id);
    S.tasks.forEach((t) => {
      if (t.assignee && !ids.includes(t.assignee)) t.assignee = "";
      (t.subtasks || []).forEach((x) => {
        if (x.assignee && !ids.includes(x.assignee)) x.assignee = "";
      });
    });
    S.kpis.forEach((k) => {
      if (k.assignee && !ids.includes(k.assignee)) k.assignee = "";
    });

    const byName = (n: string) => {
      const m = S.members.find((x) => x.n === n);
      return m ? m.id : "";
    };

    (
      [
        ["Postări SuccesPlus", "Maria Zănoagă"],
        ["Postări Theona (calendar advent)", "Nicoleta Stamate"],
        ["Postări Emthrive", "Alex Chiriac"],
        ["Plugin test vocaţional — bug-uri raportate", "Silviu Paraschiv"],
      ] as [string, string][]
    ).forEach((pair) => {
      const tk = S.tasks.find((x) => x.title === pair[0]);
      if (tk && !tk.assignee) {
        tk.assignee = byName(pair[1]);
        (tk.subtasks || []).forEach((x) => {
          if (!x.assignee) x.assignee = tk.assignee;
        });
      }
    });

    (
      [
        ["Postări publicate", "Maria Zănoagă"],
        ["Reach organic lunar", "Alex Chiriac"],
        ["Uptime platforme", "Silviu Paraschiv"],
        ["Bug-uri rezolvate", "Silviu Paraschiv"],
        ["Funcţionalităţi livrate", "Olaru Dragoş"],
      ] as [string, string][]
    ).forEach((pair) => {
      const k = S.kpis.find((x) => x.n === pair[0]);
      if (k && !k.assignee) k.assignee = byName(pair[1]);
    });

    if (!S.kpis.some((k) => k.n === "Videoclipuri editate"))
      S.kpis.push({ id: uid(), n: "Videoclipuri editate", dept: "mkt", assignee: byName("Alex Chiriac"), target: 28, unit: "buc", dir: "up", vals: {} });
    if (!S.kpis.some((k) => k.n === "Raportare financiară trimisă până pe 5"))
      S.kpis.push({ id: uid(), n: "Raportare financiară trimisă până pe 5", dept: "adm", assignee: byName("Cosmin"), target: 100, unit: "%", dir: "up", vals: {} });

    ROSTER_TASKS().forEach((d) => {
      if (S.tasks.some((t) => t.title === d.title)) return;
      const who = byName(d.who);
      const subtasks: Subtask[] = (d.subs || []).map((x) => ({
        id: uid(),
        title: x[0],
        assignee: who,
        deadline: x[1] || "",
        done: false,
      }));
      S.tasks.push({
        id: uid(),
        title: d.title,
        dept: d.dept,
        assignee: who,
        deadline: d.deadline || "",
        priority: d.priority || "medie",
        status: d.status || "lucru",
        progress: 0,
        tags: d.tags || [],
        notes: d.notes || "",
        recurring: d.recurring || "",
        coverLabel: d.coverLabel || "",
        coverDate: "",
        subtasks,
        createdAt: todayISO(),
        completedAt: "",
      });
    });

    S.version = 2;
    changed = true;
  }

  return changed;
}
