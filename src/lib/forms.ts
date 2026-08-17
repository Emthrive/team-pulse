"use client";
// ============================================================
//  CONSTRUCTORII DE FORMULARE (portați din apelurile openForm)
//  Fiecare re-găsește entitatea după id în onSubmit/onDelete,
//  folosind draft-ul de stare primit — fără referințe capturate.
// ============================================================
import { isAdminEmail } from "./admin";
import { CRIT, PRIO, STATUS } from "./constants";
import type { CrmState, Member, Task } from "./types";
import { todayISO, uid } from "./utils";
import { useStore, type FormField } from "./store";

const st = () => useStore.getState();
const memberOpts = (S: CrmState, extra: { v: string; l: string }[] = []) =>
  extra.concat(S.members.filter((m) => m.active).map((m) => ({ v: m.id, l: m.n })));

// ---------------------------------------------------------------- TASKURI
function taskFields(S: CrmState, t: Task | null, fltDept: string): FormField[] {
  return [
    { key: "title", label: "Denumire task", value: t ? t.title : "", ph: "ex: Postări SuccesPlus august" },
    {
      key: "dept",
      label: "Departament",
      type: "select",
      value: t ? t.dept : fltDept || S.departments[0].id,
      options: S.departments.map((d) => ({ v: d.id, l: d.n })),
    },
    {
      key: "assignee",
      label: "Responsabil",
      type: "select",
      value: t ? t.assignee : "",
      options: memberOpts(S, [{ v: "", l: "nealocat" }]),
    },
    { key: "deadline", label: "Termen limită", type: "date", value: t ? t.deadline : "" },
    { key: "priority", label: "Prioritate", type: "select", value: t ? t.priority : "medie", options: PRIO.map((p) => ({ v: p.id, l: p.n })) },
    { key: "status", label: "Status", type: "select", value: t ? t.status : "todo", options: STATUS.map((s) => ({ v: s.id, l: s.n })) },
    { key: "progress", label: "Progres manual (dacă nu are subtaskuri)", type: "range", value: t ? t.progress || 0 : 0 },
    { key: "tags", label: "Etichete (separate prin virgulă)", value: t ? (t.tags || []).join(", ") : "", ph: "SuccesPlus, Theona, Emthrive" },
    {
      key: "recurring",
      label: "Recurenţă",
      type: "select",
      value: t ? t.recurring || "" : "",
      options: [
        { v: "", l: "fără" },
        { v: "saptamanal", l: "Săptămânal" },
        { v: "lunar", l: "Lunar" },
      ],
    },
    { key: "coverLabel", label: "Etichetă pentru data de acoperire", value: t ? t.coverLabel || "" : "", ph: "ex: Programat până la" },
    { key: "coverDate", label: "Data de acoperire", type: "date", value: t ? t.coverDate || "" : "" },
    { key: "notes", label: "Note", type: "textarea", value: t ? t.notes : "" },
  ];
}

export function newTask() {
  const { S, flt, openForm } = st();
  if (!S) return;
  openForm({
    title: "Task nou",
    fields: taskFields(S, null, flt.dept),
    onSubmit: (d, draft) => {
      if (!d.title.trim()) return;
      draft.tasks.push({
        id: uid(),
        title: d.title.trim(),
        dept: d.dept,
        assignee: d.assignee,
        deadline: d.deadline,
        priority: d.priority as Task["priority"],
        status: d.status as Task["status"],
        progress: Number(d.progress) || 0,
        tags: d.tags.split(",").map((s) => s.trim()).filter(Boolean),
        notes: d.notes,
        subtasks: [],
        recurring: (d.recurring || "") as Task["recurring"],
        coverLabel: d.coverLabel || "",
        coverDate: d.coverDate || "",
        createdAt: todayISO(),
        completedAt: d.status === "gata" ? todayISO() : "",
      });
    },
  });
}

export function editTask(id: string) {
  const { S, openForm } = st();
  if (!S) return;
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  openForm({
    title: "Editează task",
    fields: taskFields(S, t, ""),
    onSubmit: (d, draft) => {
      const tk = draft.tasks.find((x) => x.id === id);
      if (!tk) return;
      tk.title = d.title.trim() || tk.title;
      tk.dept = d.dept;
      tk.assignee = d.assignee;
      tk.deadline = d.deadline;
      tk.priority = d.priority as Task["priority"];
      if (d.status === "gata" && tk.status !== "gata") tk.completedAt = todayISO();
      if (d.status !== "gata") tk.completedAt = "";
      tk.status = d.status as Task["status"];
      tk.progress = Number(d.progress) || 0;
      tk.tags = d.tags.split(",").map((s) => s.trim()).filter(Boolean);
      tk.notes = d.notes;
      tk.recurring = (d.recurring || "") as Task["recurring"];
      tk.coverLabel = d.coverLabel || "";
      tk.coverDate = d.coverDate || "";
    },
    onDelete: (draft) => {
      draft.tasks = draft.tasks.filter((x) => x.id !== id);
    },
  });
}

export function setCover(id: string) {
  const { S, openForm } = st();
  if (!S) return;
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  openForm({
    title: t.coverLabel || "Data acoperită",
    note: "Până la ce dată este acoperit/realizat acest task (ex: programări făcute până la…, rapoarte trimise până la…).",
    fields: [
      { key: "coverLabel", label: "Etichetă", value: t.coverLabel || "Acoperit până la" },
      { key: "coverDate", label: "Dată", type: "date", value: t.coverDate || "" },
    ],
    onSubmit: (d, draft) => {
      const tk = draft.tasks.find((x) => x.id === id);
      if (!tk) return;
      tk.coverLabel = d.coverLabel.trim() || tk.coverLabel;
      tk.coverDate = d.coverDate;
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
      draft.kpis.push({ id: uid(), n: d.n.trim(), dept: d.dept, assignee: d.assignee, target: Number(d.target) || 0, unit: d.unit, dir: d.dir as "up" | "down", vals: {} });
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
    },
    onDelete: (draft) => {
      draft.kpis = draft.kpis.filter((x) => x.id !== id);
    },
  });
}

// ---------------------------------------------------------------- MEMBRI
function memberFields(S: CrmState, m: Member | null): FormField[] {
  return [
    { key: "n", label: "Nume", value: m ? m.n : "" },
    { key: "email", label: "Email de acces (whitelist login)", type: "text", value: m ? m.email || "" : "", ph: "ex: prenume@emthrive.com" },
    { key: "role", label: "Rol", value: m ? m.role : "", ph: "ex: Consilier vocaţional" },
    { key: "dept", label: "Departament", type: "select", value: m ? m.dept : S.departments[0].id, options: S.departments.map((d) => ({ v: d.id, l: d.n })) },
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
      draft.members.push({
        id: uid(),
        n: d.n.trim(),
        role: d.role,
        dept: d.dept,
        active: d.active === "1",
        email: d.email.trim().toLowerCase(),
      });
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
      mm.dept = d.dept;
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

// ---------------------------------------------------------------- IDENTITATE
export function whoAmI() {
  const { S, me, authEmail, openForm, setMe } = st();
  if (!S) return;
  const canSelfAdd = isAdminEmail(authEmail);
  const opts = [{ v: "", l: "— nesetat —" }].concat(
    S.members.filter((m) => m.active).map((m) => ({ v: m.id, l: m.n })),
  );
  if (canSelfAdd) opts.push({ v: "__new", l: "+ nu sunt în listă, mă adaug" });
  openForm({
    title: "Cine sunt?",
    note: "Alegerea se salvează doar pe dispozitivul tău. Nu schimbă nimic pentru ceilalţi.",
    fields: [
      {
        key: "id",
        label: "Eu sunt",
        type: "select",
        value: me,
        options: opts,
      },
    ],
    onSubmit: (d) => {
      if (d.id === "__new") {
        joinTeam();
        return;
      }
      setMe(d.id);
    },
  });
}

export function joinTeam() {
  const { S, openForm, setMe } = st();
  if (!S) return;
  openForm({
    title: "Mă adaug în echipă",
    note: "Completează cum vrei să apari în CRM. Coordonatorul poate ajusta ulterior.",
    fields: [
      { key: "n", label: "Nume şi prenume", value: "", ph: "ex: Alex Chiriac" },
      { key: "role", label: "Ce faci în echipă", value: "", ph: "ex: editare video, 7 postări/săptămână" },
      { key: "dept", label: "Departament", type: "select", value: "mkt", options: S.departments.map((d) => ({ v: d.id, l: d.n })) },
    ],
    onSubmit: (d, draft) => {
      if (!d.n.trim()) return;
      const ex = draft.members.find((m) => m.n.toLowerCase() === d.n.trim().toLowerCase());
      if (ex) {
        ex.role = d.role || ex.role;
        ex.dept = d.dept;
        ex.active = true;
        setMe(ex.id);
        return;
      }
      const m = { id: uid(), n: d.n.trim(), role: d.role, dept: d.dept, active: true };
      draft.members.push(m);
      setMe(m.id);
    },
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
