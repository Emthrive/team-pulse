"use client";
// ============================================================
//  ACȚIUNI DIRECTE (fără formular) — portate din original
// ============================================================
import { isElevated } from "./admin";
import { currentMemberId, depName, memName, myDeptIds, taskProgress } from "./calc";
import { prName, stName } from "./constants";
import { seed } from "./seed";
import { logEvent } from "./history";
import { useStore } from "./store";
import type { CrmState } from "./types";
import { todayISO, uid } from "./utils";

const st = () => useStore.getState();
/** Membrul curent — autorul evenimentelor din jurnal. */
const actor = () => {
  const { S, me, authEmail } = st();
  return S ? currentMemberId(S, me, authEmail) : "";
};

export function toggleSub(tid: string, sid: string) {
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === tid);
    if (!t) return;
    const s = t.subtasks.find((x) => x.id === sid);
    if (!s) return;
    s.done = !s.done;
    s.doneAt = s.done ? todayISO() : "";
    if (t.subtasks.every((x) => x.done) && t.status !== "gata") t.status = "testing";
  });
}

export function addSub(tid: string, value: string) {
  const v = value.trim();
  if (!v) return;
  const by = actor();
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === tid);
    if (!t) return;
    t.subtasks.push({ id: uid(), title: v, assignee: t.assignee || "", deadline: "", done: false });
    logEvent(t, by, "subtask", v);
  });
}

export function finish(id: string) {
  const by = actor();
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === id);
    if (!t) return;
    t.status = "gata";
    t.progress = 100;
    t.completedAt = todayISO();
    // Jurnal de finalizări — alimentează KPI-urile automate, lună de lună.
    t.completions = t.completions || [];
    t.completions.push({
      d: todayISO(),
      onTime: !t.deadline || todayISO() <= t.deadline,
      n: (t.subtasks || []).length,
    });
    logEvent(t, by, "finalizat");
  });
}

export function reopen(id: string) {
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === id);
    if (!t) return;
    t.status = "lucru";
    t.completedAt = "";
    t.archived = false;
    // Redeschis → finalizarea nu mai e valabilă; scoatem ultima intrare din jurnal.
    if (t.completions && t.completions.length) t.completions.pop();
    logEvent(t, actor(), "redeschis");
  });
}

export function renew(id: string) {
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === id);
    if (!t) return;
    const shift = (d: string) => {
      if (!d) return d;
      const x = new Date(d + "T00:00:00");
      if (t.recurring === "lunar") x.setMonth(x.getMonth() + 1);
      else x.setDate(x.getDate() + 7);
      return x.toISOString().slice(0, 10);
    };
    t.deadline = shift(t.deadline);
    (t.subtasks || []).forEach((x) => {
      x.done = false;
      x.deadline = shift(x.deadline);
    });
    t.status = "lucru";
    t.progress = 0;
    t.completedAt = "";
    logEvent(t, actor(), "reinnoit");
  });
}

/** Adminul/managerul peste tot; altfel doar membrii departamentului pot modifica un KPI manual. */
function canEditKpiVals(S: import("./types").CrmState, deptId: string): boolean {
  const { me, authEmail } = st();
  return isElevated(S, me, authEmail) || myDeptIds(S, me, authEmail).includes(deptId);
}

export function bump(id: string, dir: number) {
  const { kstart, kend } = st();
  if (kstart !== kend) return; // editare doar pe o singură lună selectată
  const kmonth = kstart;
  st().mutate((S) => {
    const k = S.kpis.find((x) => x.id === id);
    if (!k || k.auto) return; // KPI auto: valoarea vine din taskuri
    if (!canEditKpiVals(S, k.dept)) return; // doar departamentul lui
    const step =
      Number(k.target) >= 1000 ? Math.round(Number(k.target) / 100) : Number(k.target) >= 100 ? 5 : 1;
    k.vals = k.vals || {};
    k.vals[kmonth] = Math.max(0, (Number(k.vals[kmonth]) || 0) + dir * step);
  });
}

export function setKpiVal(id: string, v: string) {
  const { kstart, kend } = st();
  if (kstart !== kend) return; // editare doar pe o singură lună selectată
  const kmonth = kstart;
  st().mutate((S) => {
    const k = S.kpis.find((x) => x.id === id);
    if (!k || k.auto) return; // KPI auto: valoarea vine din taskuri
    if (!canEditKpiVals(S, k.dept)) return; // doar departamentul lui
    k.vals = k.vals || {};
    k.vals[kmonth] = Math.max(0, Number(String(v).replace(",", ".")) || 0);
  });
}

/** Mutare pe board (drag & drop): userul doar taskurile lui, adminul şi managerul pe toate. */
export function moveTask(id: string, newStatus: import("./types").StatusId) {
  const { S, me, authEmail } = st();
  if (!S) return;
  const t = S.tasks.find((x) => x.id === id);
  if (!t || t.status === newStatus) return;
  const myId = currentMemberId(S, me, authEmail);
  const allowed = isElevated(S, me, authEmail) || (myId && t.assignee === myId);
  if (!allowed) return;
  st().mutate((St) => {
    const tk = St.tasks.find((x) => x.id === id);
    if (!tk) return;
    // Mutat în „Finalizat” → aceleași efecte ca „Marchez finalizat”.
    if (newStatus === "gata" && tk.status !== "gata") {
      tk.progress = 100;
      tk.completedAt = todayISO();
      tk.completions = tk.completions || [];
      tk.completions.push({
        d: todayISO(),
        onTime: !tk.deadline || todayISO() <= tk.deadline,
        n: (tk.subtasks || []).length,
      });
    }
    // Scos din „Finalizat” → ca „Redeschid”; iese și din arhivă, cronometrul repornește la re-finalizare.
    if (tk.status === "gata" && newStatus !== "gata") {
      tk.completedAt = "";
      tk.archived = false;
      if (tk.completions && tk.completions.length) tk.completions.pop();
    }
    tk.status = newStatus;
    logEvent(tk, myId, "status", stName(newStatus));
  });
}

export function onlyMine() {
  const { S, me, authEmail } = st();
  const id = S ? currentMemberId(S, me, authEmail) : me;
  st().setFlt({ dept: "", member: id, status: "", only: "" });
}

/** Accept o asignare propusă → devin responsabil. */
export function acceptAssignment(taskId: string) {
  const by = actor();
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === taskId);
    if (!t || !t.pendingAssignee) return;
    t.assignee = t.pendingAssignee;
    t.pendingAssignee = "";
    t.assignedBy = "";
    logEvent(t, by, "acceptat");
  });
}

/** Refuz o asignare propusă → rămâne la responsabilul curent. */
export function rejectAssignment(taskId: string) {
  const by = actor();
  st().mutate((S) => {
    const t = S.tasks.find((x) => x.id === taskId);
    if (!t) return;
    t.pendingAssignee = "";
    t.assignedBy = "";
    logEvent(t, by, "refuzat");
  });
}

// ---------------------------------------------------------------- date / export
function download(name: string, content: string, type?: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: type || "application/json" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportJson() {
  const { S } = st();
  if (!S) return;
  download("emthrive-crm-" + todayISO() + ".json", JSON.stringify(S, null, 2));
}

export function exportCsv() {
  const { S } = st();
  if (!S) return;
  const rows: (string | number)[][] = [
    ["Task", "Departament", "Responsabil", "Termen", "Prioritate", "Status", "Progres %", "Taskuri Epic", "Etichete"],
  ];
  S.tasks.forEach((t) =>
    rows.push([
      t.title,
      depName(S, t.dept),
      memName(S, t.assignee),
      t.deadline,
      prName(t.priority),
      stName(t.status),
      taskProgress(t),
      (t.subtasks || []).filter((s) => s.done).length + "/" + (t.subtasks || []).length,
      (t.tags || []).join(" "),
    ]),
  );
  const csv = rows
    .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))
    .join("\n");
  download("emthrive-taskuri-" + todayISO() + ".csv", "﻿" + csv, "text/csv");
}

export function importJson() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = ".json";
  i.onchange = () => {
    const f = i.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(String(r.result)) as CrmState;
        if (!d.departments) throw new Error("bad");
        st().replaceState(d);
      } catch {
        alert("Fişierul nu are structura aşteptată. Foloseşte un export făcut din această aplicaţie.");
      }
    };
    r.readAsText(f);
  };
  i.click();
}

export function resetAll() {
  if (!confirm("Se şterg toate taskurile, KPI-urile şi evaluările şi se revine la structura iniţială. Continui?"))
    return;
  st().replaceState(seed());
}
