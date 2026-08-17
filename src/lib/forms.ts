"use client";
// ============================================================
//  CONSTRUCTORII DE FORMULARE (portați din apelurile openForm)
//  Fiecare re-găsește entitatea după id în onSubmit/onDelete,
//  folosind draft-ul de stare primit — fără referințe capturate.
// ============================================================
import { isAdminEmail } from "./admin";
import { currentMemberId, memberDepts, myDeptIds } from "./calc";
import { CRIT, PRIO, STATUS } from "./constants";
import { inviteUser } from "./invite";
import type { CrmState, KpiAuto, Member, Task } from "./types";
import { todayISO, uid } from "./utils";
import { useStore, type FormField } from "./store";

const st = () => useStore.getState();
const memberOpts = (S: CrmState, extra: { v: string; l: string }[] = []) =>
  extra.concat(S.members.filter((m) => m.active).map((m) => ({ v: m.id, l: m.n })));

// ---------------------------------------------------------------- TASKURI
/** Tipuri de livrabile — devin etichete și leagă taskul de KPI-urile auto cu filtru de tag. */
const TASK_TYPES = ["Bug", "Feature", "Postare", "Video", "Campanie", "Propunere"];
/** Gruparea tipurilor pe departamente, pentru delimitare clară în dropdown. */
const TASK_TYPE_OPTIONS: { v: string; l: string; g?: string }[] = [
  { v: "", l: "fără" },
  { v: "Bug", l: "Bug", g: "IT & App" },
  { v: "Feature", l: "Feature", g: "IT & App" },
  { v: "Postare", l: "Postare", g: "Marketing" },
  { v: "Video", l: "Video", g: "Marketing" },
  { v: "Campanie", l: "Campanie", g: "Marketing" },
  { v: "Propunere", l: "Propunere", g: "Parteneriate" },
];
const isType = (g: string) => TASK_TYPES.some((t) => t.toLowerCase() === g.trim().toLowerCase());
const findType = (tags: string[]) => tags.find((g) => isType(g)) || "";
/** Combină tipul ales + etichetele existente bifate + cele noi; dedup case-insensitive. */
function mergeTags(raw: string, ttype: string, extags = ""): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (g: string) => {
    const v = g.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };
  if (ttype) push(ttype);
  extags.split(",").forEach((g) => {
    if (!isType(g)) push(g);
  });
  raw.split(",").forEach((g) => {
    if (!isType(g)) push(g);
  });
  return out;
}

/** Etichetele deja folosite în taskuri (fără tipurile de livrabil), unice case-insensitive. */
function existingTags(S: CrmState): string[] {
  const map = new Map<string, string>();
  S.tasks.forEach((t) =>
    (t.tags || []).forEach((g) => {
      const v = g.trim();
      if (!v || isType(v)) return;
      const key = v.toLowerCase();
      if (!map.has(key)) map.set(key, v);
    }),
  );
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

interface TaskFieldOpts {
  self?: { id: string; dept: string };
  /** non-admin: doar departamentele lui (poate fi în mai multe) */
  deptChoices?: string[];
  lockAssignee?: string; // la creare, non-admin: doar el
  forNew?: boolean; // la creare: fără status/progres (mereu „De făcut" / 0)
}
function taskFields(S: CrmState, t: Task | null, fltDept: string, opts: TaskFieldOpts = {}): FormField[] {
  const { self, deptChoices, lockAssignee, forNew } = opts;
  const restricted = !!(deptChoices && deptChoices.length);
  const deptOptions = restricted
    ? S.departments.filter((d) => deptChoices!.includes(d.id)).map((d) => ({ v: d.id, l: d.n }))
    : S.departments.map((d) => ({ v: d.id, l: d.n }));
  // Valoarea implicită: departamentul taskului > filtrul curent (dacă e permis) > primul permis.
  const fallbackDept = restricted
    ? (fltDept && deptChoices!.includes(fltDept) ? fltDept : deptChoices![0])
    : self?.dept || fltDept || S.departments[0].id;
  const assigneeOptions = lockAssignee
    ? S.members.filter((m) => m.id === lockAssignee).map((m) => ({ v: m.id, l: m.n }))
    : memberOpts(S, [{ v: "", l: "nealocat" }]);

  const fields: FormField[] = [
    { key: "title", label: "Denumire task", value: t ? t.title : "", ph: "ex: Postări SuccesPlus august" },
    {
      key: "dept",
      label: restricted ? "Departament (ale tale)" : "Departament",
      type: "select",
      value: t ? t.dept : fallbackDept,
      options: deptOptions,
    },
    {
      key: "assignee",
      label: lockAssignee ? "Responsabil (tu)" : "Responsabil",
      type: "select",
      value: lockAssignee || (t ? t.assignee : self?.id || ""),
      options: assigneeOptions,
    },
    { key: "deadline", label: "Termen limită", type: "date", value: t ? t.deadline : "" },
    { key: "priority", label: "Prioritate", type: "select", value: t ? t.priority : "medie", options: PRIO.map((p) => ({ v: p.id, l: p.n })) },
  ];

  // Status și progres doar la editare — la creare taskul e mereu „De făcut" / progres 0.
  if (!forNew) {
    fields.push({ key: "status", label: "Status", type: "select", value: t ? t.status : "todo", options: STATUS.map((s) => ({ v: s.id, l: s.n })) });
    // Progres manual doar dacă taskul NU are subtaskuri — altfel progresul se ia din subtaskuri.
    const hasSubtasks = !!(t && t.subtasks && t.subtasks.length);
    if (!hasSubtasks) {
      fields.push({ key: "progress", label: "Progres manual", type: "range", value: t ? t.progress || 0 : 0 });
    }
  }

  fields.push({
    key: "ttype",
    label: "Tip livrabil (se leagă automat de KPI)",
    type: "select",
    value: t ? findType(t.tags || []) : "",
    options: TASK_TYPE_OPTIONS,
  });
  // Refolosirea etichetelor existente (evită dubluri gen „Emthrive” / „Emthrive.com”):
  // bifezi din listă; câmpul text e doar pentru etichete complet noi.
  const known = existingTags(S);
  if (known.length) {
    fields.push({
      key: "extags",
      label: "Etichete existente (bifează pentru a refolosi)",
      type: "checks",
      value: t ? (t.tags || []).filter((g) => !isType(g)).join(",") : "",
      options: known.map((g) => ({ v: g, l: "#" + g })),
    });
  }
  fields.push({
    key: "tags",
    label: "Etichete noi (doar dacă nu există în listă)",
    value: "",
    ph: "ex: CampanieBTS",
  });
  fields.push({
    key: "recurring",
    label: "Recurenţă",
    type: "select",
    value: t ? t.recurring || "" : "",
    options: [
      { v: "", l: "fără" },
      { v: "saptamanal", l: "Săptămânal" },
      { v: "lunar", l: "Lunar" },
    ],
  });
  fields.push({ key: "notes", label: "Note", type: "textarea", value: t ? t.notes : "" });
  return fields;
}

/** Regula de asignare cu acceptare: propunerea către altcineva devine „pending". */
function applyAssignment(tk: Task, chosen: string, selfId: string) {
  if (chosen === tk.assignee) return; // fără schimbare
  if (chosen === "" || chosen === selfId) {
    // nealocat sau ție însuți → direct, fără acceptare
    tk.assignee = chosen;
    tk.pendingAssignee = "";
    tk.assignedBy = "";
  } else {
    // propus altui utilizator → trebuie să accepte; responsabilul rămâne neschimbat
    tk.pendingAssignee = chosen;
    tk.assignedBy = selfId;
  }
}

export function newTask() {
  const { S, me, authEmail, flt, openForm } = st();
  if (!S) return;
  // Pre-completăm cu utilizatorul curent ca responsabil + departamentul lui.
  const selfId = currentMemberId(S, me, authEmail);
  const selfMember = selfId ? S.members.find((m) => m.id === selfId) : undefined;
  const self = selfMember ? { id: selfMember.id, dept: memberDepts(selfMember)[0] || selfMember.dept } : undefined;
  const admin = isAdminEmail(authEmail);
  const deptChoices = !admin && selfMember ? memberDepts(selfMember) : undefined;
  const lockAssignee = !admin && selfMember ? selfMember.id : undefined;
  openForm({
    title: "Task nou",
    fields: taskFields(S, null, flt.dept, { self, deptChoices, lockAssignee, forNew: true }),
    onSubmit: (d, draft) => {
      if (!d.title.trim()) return;
      const t: Task = {
        id: uid(),
        title: d.title.trim(),
        dept: d.dept,
        assignee: selfId, // creatorul devine automat responsabil
        pendingAssignee: "",
        assignedBy: "",
        deadline: d.deadline,
        priority: d.priority as Task["priority"],
        status: "todo", // mereu „De făcut" la creare
        progress: 0,
        tags: mergeTags(d.tags, d.ttype || "", d.extags || ""),
        notes: d.notes,
        subtasks: [],
        recurring: (d.recurring || "") as Task["recurring"],
        createdAt: todayISO(),
        completedAt: "",
      };
      // Dacă la creare (ca admin) alegi alt responsabil, devine propunere (pending).
      applyAssignment(t, d.assignee, selfId);
      draft.tasks.push(t);
    },
  });
}

export function editTask(id: string) {
  const { S, me, authEmail, openForm } = st();
  if (!S) return;
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  const selfId = currentMemberId(S, me, authEmail);
  // Non-adminul poate muta taskul doar între departamentele lui (+ cel curent al taskului).
  const deptChoices = !isAdminEmail(authEmail)
    ? Array.from(new Set([t.dept, ...myDeptIds(S, me, authEmail)])).filter(Boolean)
    : undefined;
  openForm({
    title: "Editează task",
    fields: taskFields(S, t, "", { deptChoices }),
    onSubmit: (d, draft) => {
      const tk = draft.tasks.find((x) => x.id === id);
      if (!tk) return;
      tk.title = d.title.trim() || tk.title;
      tk.dept = d.dept;
      // Reasignarea către alt utilizator devine propunere care trebuie acceptată.
      applyAssignment(tk, d.assignee, selfId);
      tk.deadline = d.deadline;
      tk.priority = d.priority as Task["priority"];
      if (d.status === "gata" && tk.status !== "gata") tk.completedAt = todayISO();
      if (d.status !== "gata") tk.completedAt = "";
      tk.status = d.status as Task["status"];
      // Progresul manual se actualizează doar dacă câmpul a fost prezent (task fără subtaskuri).
      if (d.progress !== undefined) tk.progress = Number(d.progress) || 0;
      tk.tags = mergeTags(d.tags, d.ttype || "", d.extags || "");
      tk.notes = d.notes;
      tk.recurring = (d.recurring || "") as Task["recurring"];
    },
    onDelete: (draft) => {
      draft.tasks = draft.tasks.filter((x) => x.id !== id);
    },
  });
}

export function editSub(tid: string, sid: string) {
  const { S, openForm } = st();
  if (!S) return;
  const t = S.tasks.find((x) => x.id === tid);
  const s = t?.subtasks.find((x) => x.id === sid);
  if (!t || !s) return;
  openForm({
    title: "Subtask",
    fields: [
      { key: "title", label: "Denumire", value: s.title },
      { key: "assignee", label: "Responsabil", type: "select", value: s.assignee, options: memberOpts(S, [{ v: "", l: "nealocat" }]) },
      { key: "deadline", label: "Termen", type: "date", value: s.deadline },
    ],
    onSubmit: (d, draft) => {
      const dt = draft.tasks.find((x) => x.id === tid);
      const ds = dt?.subtasks.find((x) => x.id === sid);
      if (!ds) return;
      ds.title = d.title.trim() || ds.title;
      ds.assignee = d.assignee;
      ds.deadline = d.deadline;
    },
    onDelete: (draft) => {
      const dt = draft.tasks.find((x) => x.id === tid);
      if (dt) dt.subtasks = dt.subtasks.filter((x) => x.id !== sid);
    },
  });
}

// ---------------------------------------------------------------- KPI
function kpiFields(S: CrmState, k: CrmState["kpis"][number] | null): FormField[] {
  return [
    { key: "n", label: "Denumire KPI", value: k ? k.n : "", ph: "ex: Sesiuni 1:1 vândute" },
    {
      key: "auto",
      label: "Sursă valoare",
      type: "select",
      value: k ? k.auto || "" : "",
      options: [
        { v: "", l: "Manual (introduci valoarea lunar)" },
        { v: "tasks_done", l: "Auto · taskuri finalizate în lună" },
        { v: "epics_done", l: "Auto · Epice finalizate în lună" },
        { v: "on_time_rate", l: "Auto · % finalizate la termen" },
        { v: "subtasks_done", l: "Auto · subtaskuri bifate în lună" },
        { v: "tasks_created", l: "Auto · taskuri create în lună" },
      ],
    },
    { key: "tag", label: "Filtru etichetă (opţional, doar la auto)", value: k ? k.tag || "" : "", ph: "ex: Video" },
    { key: "dept", label: "Departament", type: "select", value: k ? k.dept : S.departments[0].id, options: S.departments.map((d) => ({ v: d.id, l: d.n })) },
    { key: "assignee", label: "Responsabil", type: "select", value: k ? k.assignee : "", options: memberOpts(S, [{ v: "", l: "la nivel de departament" }]) },
    { key: "target", label: "Ţintă lunară", type: "number", value: k ? k.target : 0, step: "any" },
    { key: "unit", label: "Unitate", value: k ? k.unit : "", ph: "buc / RON / % / sesiuni" },
    {
      key: "dir",
      label: "Direcţie",
      type: "select",
      value: k ? k.dir : "up",
      options: [
        { v: "up", l: "Mai mult = mai bine" },
        { v: "down", l: "Mai puţin = mai bine" },
      ],
    },
  ];
}

export function newKpi() {
  const { S, openForm } = st();
  if (!S) return;
  openForm({
    title: "KPI nou",
    fields: kpiFields(S, null),
    onSubmit: (d, draft) => {
      if (!d.n.trim()) return;
      draft.kpis.push({
        id: uid(),
        n: d.n.trim(),
        dept: d.dept,
        assignee: d.assignee,
        target: Number(d.target) || 0,
        unit: d.unit,
        dir: d.dir as "up" | "down",
        vals: {},
        auto: (d.auto || "") as KpiAuto,
        tag: (d.tag || "").trim(),
      });
    },
  });
}

export function editKpi(id: string) {
  const { S, openForm } = st();
  if (!S) return;
  const k = S.kpis.find((x) => x.id === id);
  if (!k) return;
  openForm({
    title: "Editează KPI",
    fields: kpiFields(S, k),
    onSubmit: (d, draft) => {
      const kk = draft.kpis.find((x) => x.id === id);
      if (!kk) return;
      kk.n = d.n.trim() || kk.n;
      kk.dept = d.dept;
      kk.assignee = d.assignee;
      kk.target = Number(d.target) || 0;
      kk.unit = d.unit;
      kk.dir = d.dir as "up" | "down";
      kk.auto = (d.auto || "") as KpiAuto;
      kk.tag = (d.tag || "").trim();
    },
    onDelete: (draft) => {
      draft.kpis = draft.kpis.filter((x) => x.id !== id);
    },
  });
}

// ---------------------------------------------------------------- MEMBRI
function memberFields(S: CrmState, m: Member | null): FormField[] {
  return [
    { key: "n", label: "Nume şi prenume", value: m ? m.n : "" },
    { key: "email", label: "Email de acces (primeşte link de login)", type: "text", value: m ? m.email || "" : "", ph: "ex: prenume@emthrive.com" },
    { key: "role", label: "Poziţie", value: m ? m.role : "", ph: "ex: Programator, Consilier vocaţional" },
    {
      key: "depts",
      label: "Departamente (poate fi în mai multe)",
      type: "checks",
      value: m ? memberDepts(m).join(",") : S.departments[0].id,
      options: S.departments.map((d) => ({ v: d.id, l: d.n })),
    },
    {
      key: "active",
      label: "Stare",
      type: "select",
      value: m ? (m.active ? "1" : "0") : "1",
      options: [
        { v: "1", l: "Activ" },
        { v: "0", l: "Inactiv" },
      ],
    },
  ];
}

export function newMember() {
  const { S, openForm } = st();
  if (!S) return;
  openForm({
    title: "Persoană nouă",
    fields: memberFields(S, null),
    onSubmit: (d, draft) => {
      if (!d.n.trim()) return;
      const email = d.email.trim().toLowerCase();
      const depts = (d.depts || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!depts.length) depts.push(S.departments[0].id);
      draft.members.push({
        id: uid(),
        n: d.n.trim(),
        role: d.role,
        dept: depts[0],
        depts,
        active: d.active === "1",
        email,
      });
      // Trimitem automat link-ul de acces (fire-and-forget).
      if (email) {
        inviteUser(email).then((r) => {
          if (r.ok) alert("Persoană adăugată. Link de acces trimis către " + email + ".");
          else alert("Persoană adăugată, dar link-ul de acces nu a putut fi trimis: " + r.error);
        });
      }
    },
  });
}

export function editMember(id: string) {
  const { S, openForm } = st();
  if (!S) return;
  const m = S.members.find((x) => x.id === id);
  if (!m) return;
  openForm({
    title: "Editează persoana",
    fields: memberFields(S, m),
    onSubmit: (d, draft) => {
      const mm = draft.members.find((x) => x.id === id);
      if (!mm) return;
      mm.n = d.n.trim() || mm.n;
      mm.email = d.email.trim().toLowerCase();
      mm.role = d.role;
      const depts = (d.depts || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (depts.length) {
        mm.depts = depts;
        mm.dept = depts[0];
      }
      mm.active = d.active === "1";
    },
    onDelete: (draft) => {
      draft.members = draft.members.filter((x) => x.id !== id);
      draft.tasks.forEach((t) => {
        if (t.assignee === id) t.assignee = "";
        (t.subtasks || []).forEach((s) => {
          if (s.assignee === id) s.assignee = "";
        });
      });
      draft.kpis.forEach((k) => {
        if (k.assignee === id) k.assignee = "";
      });
      draft.evals = draft.evals.filter((e) => e.member !== id);
    },
  });
}

export function evalMember(id: string) {
  const { S, emonth, openForm } = st();
  if (!S) return;
  const ev = S.evals.find((e) => e.member === id && e.month === emonth);
  const sc = ev ? ev.scores : {};
  const name = S.members.find((m) => m.id === id)?.n || "nealocat";
  const fields: FormField[] = CRIT.map((c) => ({
    key: c.id,
    label: c.n,
    type: "range",
    min: 1,
    max: 5,
    value: sc[c.id] || 3,
  }));
  fields.push({ key: "notes", label: "Observaţii şi plan de dezvoltare", type: "textarea", value: ev ? ev.notes : "" });
  openForm({
    title: "Evaluare · " + name,
    note: "Notează de la 1 la 5 pentru luna selectată.",
    fields,
    onSubmit: (d, draft) => {
      const scores: Record<string, number> = {};
      CRIT.forEach((c) => (scores[c.id] = Number(d[c.id]) || 3));
      const cur = draft.evals.find((e) => e.member === id && e.month === emonth);
      if (cur) {
        cur.scores = scores;
        cur.notes = d.notes;
      } else {
        draft.evals.push({ id: uid(), member: id, month: emonth, scores, notes: d.notes });
      }
    },
    onDelete: ev
      ? (draft) => {
          draft.evals = draft.evals.filter((e) => e.id !== ev.id);
        }
      : null,
  });
}

// ---------------------------------------------------------------- DEPARTAMENTE / PONDERI
export function newDept() {
  const { S, openForm } = st();
  if (!S) return;
  openForm({
    title: "Departament nou",
    fields: [
      { key: "n", label: "Denumire", value: "" },
      { key: "leadId", label: "Coordonator", type: "select", value: "", options: [{ v: "", l: "nesetat" }].concat(S.members.map((m) => ({ v: m.id, l: m.n }))) },
    ],
    onSubmit: (d, draft) => {
      if (d.n.trim()) draft.departments.push({ id: uid(), n: d.n.trim(), leadId: d.leadId });
    },
  });
}

export function editDept(id: string) {
  const { S, openForm } = st();
  if (!S) return;
  const d = S.departments.find((x) => x.id === id);
  if (!d) return;
  openForm({
    title: "Editează departamentul",
    fields: [
      { key: "n", label: "Denumire", value: d.n },
      { key: "leadId", label: "Coordonator", type: "select", value: d.leadId || "", options: [{ v: "", l: "nesetat" }].concat(S.members.map((m) => ({ v: m.id, l: m.n }))) },
    ],
    onSubmit: (x, draft) => {
      const dd = draft.departments.find((z) => z.id === id);
      if (!dd) return;
      dd.n = x.n.trim() || dd.n;
      dd.leadId = x.leadId;
    },
    onDelete: (draft) => {
      draft.departments = draft.departments.filter((z) => z.id !== id);
      draft.tasks = draft.tasks.filter((t) => t.dept !== id);
      draft.kpis = draft.kpis.filter((k) => k.dept !== id);
    },
  });
}

export function editWeights() {
  const { S, openForm } = st();
  if (!S) return;
  const W = S.weights;
  openForm({
    title: "Ponderi scor final",
    note: "Se normalizează automat la 100%.",
    fields: [
      { key: "exec", label: "Execuţie taskuri", type: "range", min: 0, max: 100, step: 5, value: W.exec },
      { key: "kpi", label: "Realizare KPI", type: "range", min: 0, max: 100, step: 5, value: W.kpi },
      { key: "eval", label: "Evaluare calitativă", type: "range", min: 0, max: 100, step: 5, value: W.eval },
    ],
    onSubmit: (d, draft) => {
      const e = Number(d.exec);
      const k = Number(d.kpi);
      const v = Number(d.eval);
      const s = e + k + v || 1;
      draft.weights = {
        exec: Math.round((e / s) * 100),
        kpi: Math.round((k / s) * 100),
        eval: Math.round((v / s) * 100),
      };
    },
  });
}
