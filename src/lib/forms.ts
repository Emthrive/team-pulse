"use client";
// ============================================================
//  CONSTRUCTORII DE FORMULARE (portați din apelurile openForm)
//  Fiecare re-găsește entitatea după id în onSubmit/onDelete,
//  folosind draft-ul de stare primit — fără referințe capturate.
// ============================================================
import { isAdminEmail, isElevated } from "./admin";
import { currentMemberId, memberDepts, memName, myDeptIds } from "./calc";
import { PRIO, PROJECTS, STATUS, prName, stName } from "./constants";
import { logEvent } from "./history";
import { inviteUser } from "./invite";
import type { CrmState, KpiAuto, Member, Task } from "./types";
import {
  LEGACY_TASK_TYPES,
  allTaskTypes,
  kpiTypeTag,
  mergeTags,
  retagTasks,
  typesForDept,
  validateTask,
} from "./taskRules";
import { fmtDate, todayISO, uid } from "./utils";
import { useStore, type FormField } from "./store";

const st = () => useStore.getState();
const memberOpts = (S: CrmState, extra: { v: string; l: string }[] = []) =>
  extra.concat(S.members.filter((m) => m.active).map((m) => ({ v: m.id, l: m.n })));

// ---------------------------------------------------------------- TASKURI
/** Opțiunile „Tip livrabil" pentru UN departament (cel ales în formular): „fără" + tipurile
 *  acelui departament, adică etichetele KPI-urilor lui (vezi typesForDept). Tipul deja setat pe
 *  task (`current`) rămâne selectabil chiar dacă între timp s-a schimbat departamentul sau KPI-ul,
 *  ca editarea să nu-l piardă. */
function taskTypeOptionsForDept(S: CrmState, deptId: string, current = ""): { v: string; l: string }[] {
  const out: { v: string; l: string }[] = [{ v: "", l: "fără" }];
  typesForDept(S.kpis, deptId).forEach((t) => out.push({ v: t, l: t }));
  if (current && !out.some((o) => o.v === current)) out.push({ v: current, l: current });
  return out;
}
/** Tipul unui task = prima etichetă care e tip: din KPI-urile de acum sau din lista veche. */
const findType = (S: CrmState, tags: string[]) => {
  const known = [...allTaskTypes(S.kpis), ...LEGACY_TASK_TYPES].map((t) => t.toLowerCase());
  return tags.find((g) => known.includes(g.trim().toLowerCase())) || "";
};
/** Validarea formularului, cu tipurile departamentului ales (tipul e obligatoriu doar dacă există). */
const validateWithTypes = (S: CrmState) => (d: Record<string, string>) =>
  validateTask(d, typesForDept(S.kpis, d.dept));
const isProject = (g: string) => PROJECTS.some((p) => p.toLowerCase() === g.trim().toLowerCase());
const findProject = (tags: string[]) => tags.find((g) => isProject(g)) || "";

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
    : memberOpts(S, [{ v: "", l: "nealocat (backlog echipă)" }]);

  const fields: FormField[] = [
    { key: "title", label: "Denumire task", value: t ? t.title : "", ph: "ex: Postări SuccesPlus august" },
    {
      key: "assignee",
      label: lockAssignee ? "Responsabil (tu)" : "Responsabil",
      type: "select",
      value: lockAssignee || (t ? t.assignee : self?.id || ""),
      options: assigneeOptions,
      // La alegerea responsabilului, precompletăm departamentul cu al lui (rămâne editabil).
      // Dacă departamentul se schimbă, resetăm și „Tip livrabil" (tipurile sunt per-departament).
      onChange: (v, d) => {
        if (!v) return;
        const m = S.members.find((x) => x.id === v);
        if (!m) return;
        const nd = memberDepts(m)[0] || m.dept;
        const out: Record<string, string> = { dept: nd };
        if (nd !== d.dept) out.ttype = ""; // departament schimbat → resetăm tipul de livrabil
        return out;
      },
    },
    {
      key: "dept",
      label: restricted ? "Departament (ale tale)" : "Departament",
      type: "select",
      value: t ? t.dept : fallbackDept,
      options: deptOptions,
      // Schimbarea departamentului invalidează tipul de livrabil (e specific departamentului).
      onChange: () => ({ ttype: "" }),
    },
    { key: "deadline", label: "Termen limită", type: "date", value: t ? t.deadline : "" },
    { key: "priority", label: "Prioritate", type: "select", value: t ? t.priority : "normala", options: PRIO.map((p) => ({ v: p.id, l: p.n })) },
  ];

  // Status doar la editare — la creare taskul e mereu „De făcut". Progresul se
  // derivă din status (task simplu) sau din subtaskuri (Epic); nu mai e manual.
  if (!forNew) {
    fields.push({ key: "status", label: "Status", type: "select", value: t ? t.status : "todo", options: STATUS.map((s) => ({ v: s.id, l: s.n })) });
  }

  const curType = t ? findType(S, t.tags || []) : "";
  fields.push({
    key: "ttype",
    label: "Tip livrabil (se leagă automat de KPI)",
    type: "select",
    value: curType,
    // Opțiunile depind de departamentul ales — se re-filtrează când schimbi departamentul.
    optionsFn: (d) => taskTypeOptionsForDept(S, d.dept, d.ttype),
  });
  // Proiectul taskului — listă fixă (înlocuiește etichetele libere de dinainte).
  fields.push({
    key: "project",
    label: "Proiect",
    type: "select",
    value: t ? findProject(t.tags || []) : "",
    options: [{ v: "", l: "fără" }, ...PROJECTS.map((p) => ({ v: p, l: p }))],
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
  const S = st().S;
  const nameOf = (id: string) => (S ? memName(S, id) : id);
  if (chosen === "" || chosen === selfId) {
    // nealocat sau ție însuți → direct, fără acceptare
    tk.assignee = chosen;
    tk.pendingAssignee = "";
    tk.assignedBy = "";
    logEvent(tk, selfId, "asignat", chosen ? nameOf(chosen) : "nealocat");
  } else {
    // propus altui utilizator → trebuie să accepte; responsabilul rămâne neschimbat
    tk.pendingAssignee = chosen;
    tk.assignedBy = selfId;
    logEvent(tk, selfId, "propus", nameOf(chosen));
  }
}


export function newTask() {
  const { S, me, authEmail, flt, openForm } = st();
  if (!S) return;
  // Pre-completăm cu utilizatorul curent ca responsabil + departamentul lui.
  const selfId = currentMemberId(S, me, authEmail);
  const selfMember = selfId ? S.members.find((m) => m.id === selfId) : undefined;
  const self = selfMember ? { id: selfMember.id, dept: memberDepts(selfMember)[0] || selfMember.dept } : undefined;
  const elev = isElevated(S, me, authEmail); // admin sau manager
  const deptChoices = !elev && selfMember ? memberDepts(selfMember) : undefined;
  // Oricine poate pune responsabil pe oricine la creare; propunerea către
  // altă persoană devine „pending" și rămâne pe creator până se acceptă.
  openForm({
    title: "Task nou",
    fields: taskFields(S, null, flt.dept, { self, deptChoices, forNew: true }),
    validate: validateWithTypes(S),
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
        status: d.assignee ? "todo" : "backlog", // nealocat (fără responsabil) → Backlog (pool echipei)
        progress: 0,
        tags: mergeTags(d.ttype || "", d.project || ""),
        notes: d.notes,
        subtasks: [],
        recurring: (d.recurring || "") as Task["recurring"],
        createdAt: todayISO(),
        completedAt: "",
        version: 1, // creat sub regulile noi — se validează şi la editare
      };
      logEvent(t, selfId, "creat");
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
  // Utilizatorul normal poate muta taskul doar între departamentele lui (+ cel curent al taskului).
  const deptChoices = !isElevated(S, me, authEmail)
    ? Array.from(new Set([t.dept, ...myDeptIds(S, me, authEmail)])).filter(Boolean)
    : undefined;
  openForm({
    title: "Editează task",
    fields: taskFields(S, t, "", { deptChoices }),
    // Validăm la editare doar taskurile create sub regulile noi (version 1); cele vechi rămân permisive.
    validate: t.version === 1 ? validateWithTypes(S) : undefined,
    onSubmit: (d, draft) => {
      const tk = draft.tasks.find((x) => x.id === id);
      if (!tk) return;
      // Ce s-a schimbat — pentru jurnalul de activitate (un singur eveniment pe salvare).
      const newTitle = d.title.trim();
      const newTags = mergeTags(d.ttype || "", d.project || "");
      const changes: string[] = [];
      if (newTitle && newTitle !== tk.title) changes.push("titlu");
      if (d.dept !== tk.dept)
        changes.push("departament → " + (draft.departments.find((x) => x.id === d.dept)?.n || "?"));
      if (d.deadline !== tk.deadline) changes.push("termen → " + (d.deadline ? fmtDate(d.deadline) : "fără"));
      if (d.priority !== tk.priority) changes.push("prioritate → " + prName(d.priority));
      if (d.status !== tk.status) changes.push("status → " + stName(d.status));
      if (newTags.join("|") !== (tk.tags || []).join("|")) changes.push("tip/proiect");
      if ((d.notes || "") !== (tk.notes || "")) changes.push("note");
      if ((d.recurring || "") !== (tk.recurring || "")) changes.push("recurență");
      tk.title = newTitle || tk.title;
      tk.dept = d.dept;
      // Reasignarea către alt utilizator devine propunere care trebuie acceptată.
      applyAssignment(tk, d.assignee, selfId);
      tk.deadline = d.deadline;
      tk.priority = d.priority as Task["priority"];
      if (d.status === "gata" && tk.status !== "gata") tk.completedAt = todayISO();
      if (d.status !== "gata") tk.completedAt = "";
      tk.status = d.status as Task["status"];
      tk.tags = newTags;
      tk.notes = d.notes;
      tk.recurring = (d.recurring || "") as Task["recurring"];
      if (changes.length) logEvent(tk, selfId, "editat", changes.join(", "));
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
    title: "Task din Epic",
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
      value: k ? k.auto || "tasks_done" : "tasks_done",
      options: [
        { v: "tasks_done", l: "Auto · taskuri finalizate în lună" },
        { v: "epics_done", l: "Auto · Epice finalizate în lună" },
        { v: "subtasks_done", l: "Auto · taskuri bifate în Epice, în lună" },
        { v: "tasks_created", l: "Auto · taskuri create în lună" },
      ],
    },
    { key: "dept", label: "Departament", type: "select", value: k ? k.dept : S.departments[0].id, options: S.departments.map((d) => ({ v: d.id, l: d.n })) },
    { key: "target", label: "Ţintă lunară", type: "number", value: k ? k.target : 0, step: "any" },
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
        assignee: "",
        target: Number(d.target) || 0,
        unit: "buc", // fără procente — se numără bucăţi (taskuri/epice)
        vals: {},
        auto: (d.auto || "") as KpiAuto,
        // Eticheta = denumirea KPI-ului → apare singur ca „Tip livrabil" la taskurile departamentului.
        tag: kpiTypeTag({ n: d.n, auto: (d.auto || "") as KpiAuto }),
      });
    },
  });
}

export function editKpi(id: string) {
  const { S, authEmail, openForm } = st();
  if (!S) return;
  const k = S.kpis.find((x) => x.id === id);
  if (!k) return;
  openForm({
    title: "Editează KPI",
    fields: kpiFields(S, k),
    onSubmit: (d, draft) => {
      const kk = draft.kpis.find((x) => x.id === id);
      if (!kk) return;
      const oldTag = kk.tag || "";
      const oldDept = kk.dept;
      kk.n = d.n.trim() || kk.n;
      kk.dept = d.dept;
      kk.target = Number(d.target) || 0;
      kk.unit = "buc";
      kk.auto = (d.auto || "") as KpiAuto;
      kk.tag = kpiTypeTag(kk);
      // Redenumit → taskurile legate primesc noul nume ca tip, ca să rămână numărate.
      retagTasks(draft.tasks, oldDept, oldTag, kk.tag);
    },
    // Ştergerea distruge şi istoricul (snapshot-uri) — doar adminul.
    onDelete: isAdminEmail(authEmail)
      ? (draft) => {
          draft.kpis = draft.kpis.filter((x) => x.id !== id);
        }
      : null,
  });
}

// ---------------------------------------------------------------- MEMBRI
function memberFields(S: CrmState, m: Member | null): FormField[] {
  return [
    { key: "n", label: "Nume şi prenume", value: m ? m.n : "" },
    { key: "email", label: "Email de acces (primeşte link de login)", type: "text", value: m ? m.email || "" : "", ph: "ex: prenume@emthrive.com" },
    { key: "role", label: "Poziţie", value: m ? m.role : "", ph: "ex: Programator, Consilier vocaţional" },
    {
      key: "platformRole",
      label: "Rol în platformă",
      type: "select",
      value: m ? m.platformRole || "" : "",
      options: [
        { v: "", l: "Utilizator" },
        { v: "manager", l: "Manager" },
      ],
    },
    {
      key: "depts",
      label: "Departamente (poate fi în mai multe)",
      type: "checks",
      value: m ? memberDepts(m).join(",") : S.departments[0].id,
      options: S.departments.map((d) => ({ v: d.id, l: d.n })),
      // Managerul are acces peste tot — nu ţine de un departament.
      showIf: (d) => (d.platformRole || "") !== "manager",
    },
    // „Stare" (Activ/Inactiv) apare doar la editare — o persoană nouă e mereu activă.
    ...(m
      ? ([
          {
            key: "active",
            label: "Stare",
            type: "select",
            value: m.active ? "1" : "0",
            options: [
              { v: "1", l: "Activ" },
              { v: "0", l: "Inactiv" },
            ],
          },
        ] as FormField[])
      : []),
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
      const isMgr = (d.platformRole || "") === "manager";
      // Managerul nu ţine de un departament — are acces peste tot.
      const depts = isMgr ? [] : (d.depts || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!isMgr && !depts.length) depts.push(S.departments[0].id);
      draft.members.push({
        id: uid(),
        n: d.n.trim(),
        role: d.role,
        dept: depts[0] || "",
        depts,
        active: true, // persoană nouă = activă (câmpul „Stare" apare doar la editare)
        email,
        platformRole: (d.platformRole || "") as "" | "manager",
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
      mm.platformRole = (d.platformRole || "") as "" | "manager";
      if (mm.platformRole === "manager") {
        // Managerul nu ţine de un departament — are acces peste tot.
        mm.depts = [];
        mm.dept = "";
      } else {
        const depts = (d.depts || "").split(",").map((x) => x.trim()).filter(Boolean);
        if (depts.length) {
          mm.depts = depts;
          mm.dept = depts[0];
        }
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

// ---------------------------------------------------------------- DEPARTAMENTE / PONDERI
export function newDept() {
  const { S, openForm } = st();
  if (!S) return;
  openForm({
    title: "Departament nou",
    fields: [{ key: "n", label: "Denumire", value: "" }],
    onSubmit: (d, draft) => {
      if (d.n.trim()) draft.departments.push({ id: uid(), n: d.n.trim() });
    },
  });
}

export function editDept(id: string) {
  const { S, authEmail, openForm } = st();
  if (!S) return;
  const d = S.departments.find((x) => x.id === id);
  if (!d) return;
  openForm({
    title: "Editează departamentul",
    fields: [{ key: "n", label: "Denumire", value: d.n }],
    onSubmit: (x, draft) => {
      const dd = draft.departments.find((z) => z.id === id);
      if (!dd) return;
      dd.n = x.n.trim() || dd.n;
    },
    // Ştergerea unui departament şterge şi taskurile/KPI-urile lui — doar adminul.
    onDelete: isAdminEmail(authEmail)
      ? (draft) => {
          draft.departments = draft.departments.filter((z) => z.id !== id);
          draft.tasks = draft.tasks.filter((t) => t.dept !== id);
          draft.kpis = draft.kpis.filter((k) => k.dept !== id);
        }
      : null,
  });
}
