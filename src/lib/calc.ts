// ============================================================
//  HELPERI DE CALCUL — scoruri, progres, KPI (portați din original)
// ============================================================
import { CRIT } from "./constants";
import type { CrmState, Kpi, Member, MemberStats, Task } from "./types";
import { todayISO } from "./utils";

export const dep = (S: CrmState, id: string) => S.departments.find((d) => d.id === id);
export const mem = (S: CrmState, id: string) => S.members.find((m) => m.id === id);
export const depName = (S: CrmState, id: string) => {
  const d = dep(S, id);
  return d ? d.n : "—";
};
export const memName = (S: CrmState, id: string) => {
  const m = mem(S, id);
  return m ? m.n : "nealocat";
};

export function taskProgress(t: Task): number {
  if (t.status === "gata") return 100;
  if (t.subtasks && t.subtasks.length)
    return Math.round((t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 100);
  return Number(t.progress) || 0;
}

export function isLate(t: Task): boolean {
  if (!t.deadline || t.status === "gata") return false;
  return t.deadline < todayISO();
}

/** Valoarea calculată automat din taskuri pentru un KPI cu sursă auto. */
export function kpiAutoVal(S: CrmState, k: Kpi, mth: string): number {
  const tag = (k.tag || "").trim().toLowerCase();
  // Scoping pe departament + filtru opțional de etichetă.
  const base = S.tasks.filter(
    (t) =>
      t.dept === k.dept &&
      (!tag || (t.tags || []).some((g) => g.trim().toLowerCase() === tag)),
  );
  // Dacă KPI-ul are responsabil, numărăm doar taskurile lui.
  const scoped = k.assignee ? base.filter((t) => t.assignee === k.assignee) : base;

  switch (k.auto) {
    case "tasks_done":
      return scoped.reduce(
        (a, t) => a + (t.completions || []).filter((c) => c.d.slice(0, 7) === mth).length,
        0,
      );
    case "on_time_rate": {
      const comps = scoped.flatMap((t) =>
        (t.completions || []).filter((c) => c.d.slice(0, 7) === mth),
      );
      if (!comps.length) return 0;
      return Math.round((comps.filter((c) => c.onTime).length / comps.length) * 100);
    }
    case "subtasks_done": {
      // Subtaskurile se filtrează pe responsabilul lor, nu al taskului-părinte.
      let n = 0;
      base.forEach((t) =>
        (t.subtasks || []).forEach((s) => {
          if (k.assignee && s.assignee !== k.assignee) return;
          if (s.done && s.doneAt && s.doneAt.slice(0, 7) === mth) n++;
        }),
      );
      return n;
    }
    case "tasks_created":
      return scoped.filter((t) => (t.createdAt || "").slice(0, 7) === mth).length;
    default:
      return 0;
  }
}

export function kpiVal(S: CrmState, k: Kpi, mth: string): number {
  if (k.auto) return kpiAutoVal(S, k, mth);
  return Number((k.vals || {})[mth] || 0);
}
export function kpiHas(S: CrmState, k: Kpi, mth: string): boolean {
  if (k.auto) return true;
  return (k.vals || {})[mth] !== undefined;
}
export function kpiScore(S: CrmState, k: Kpi, mth: string): number {
  const v = kpiVal(S, k, mth);
  const t = Number(k.target) || 0;
  if (!t || !kpiHas(S, k, mth)) return 0;
  if (k.dir === "down") return v <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((t / v) * 100)));
  return Math.max(0, Math.min(100, Math.round((v / t) * 100)));
}

export const memberTasks = (S: CrmState, id: string) => S.tasks.filter((t) => t.assignee === id);

/** Membrul curent = cel al cărui email coincide cu contul logat (fallback: identitate de dispozitiv). */
export function currentMemberId(S: CrmState, me: string, authEmail: string): string {
  if (authEmail) {
    const m = S.members.find((x) => (x.email || "").toLowerCase() === authEmail.toLowerCase());
    if (m) return m.id;
  }
  return me || "";
}

/** Toate departamentele unui membru (compatibil cu datele vechi cu un singur `dept`). */
export function memberDepts(m: Member): string[] {
  if (m.depts && m.depts.length) return m.depts;
  return m.dept ? [m.dept] : [];
}

/** Departamentele utilizatorului curent (gol dacă nu e asociat unui membru). */
export function myDeptIds(S: CrmState, me: string, authEmail: string): string[] {
  const id = currentMemberId(S, me, authEmail);
  const m = id ? mem(S, id) : undefined;
  return m ? memberDepts(m) : [];
}

export function memberStats(
  S: CrmState,
  id: string,
  kmonth: string,
  emonth: string,
): MemberStats {
  const ts = memberTasks(S, id);
  const done = ts.filter((t) => t.status === "gata");
  const active = ts.filter((t) => t.status !== "gata");
  const late = active.filter(isLate);
  const onTime = done.filter(
    (t) => !t.deadline || !t.completedAt || t.completedAt <= t.deadline,
  ).length;

  let exec: number | null = null;
  if (ts.length) {
    const rate = done.length ? (onTime / done.length) * 100 : null;
    const prog = active.length
      ? active.reduce((a, t) => a + taskProgress(t), 0) / active.length
      : null;
    const pen = active.length ? (late.length / active.length) * 35 : 0;
    const parts: number[] = [];
    if (rate !== null) parts.push(rate);
    if (prog !== null) parts.push(prog);
    exec = parts.length
      ? Math.max(0, Math.round(parts.reduce((a, b) => a + b, 0) / parts.length - pen))
      : null;
  }

  const ks = S.kpis.filter((k) => k.assignee === id);
  const kp = ks.length
    ? Math.round(ks.reduce((a, k) => a + kpiScore(S, k, kmonth), 0) / ks.length)
    : null;

  const ev = S.evals.find((e) => e.member === id && e.month === emonth);
  const evs = ev
    ? Math.round(
        (CRIT.reduce((a, c) => a + (Number(ev.scores[c.id]) || 0), 0) / CRIT.length / 5) * 100,
      )
    : null;

  const W = S.weights || { exec: 40, kpi: 30, eval: 30 };
  let num = 0;
  let den = 0;
  if (exec !== null) {
    num += exec * W.exec;
    den += W.exec;
  }
  if (kp !== null) {
    num += kp * W.kpi;
    den += W.kpi;
  }
  if (evs !== null) {
    num += evs * W.eval;
    den += W.eval;
  }
  const total = den ? Math.round(num / den) : null;

  return {
    tasks: ts.length,
    active: active.length,
    done: done.length,
    late: late.length,
    exec,
    kpi: kp,
    eval: evs,
    total,
  };
}

export function deptProgress(S: CrmState, id: string): number {
  const ts = S.tasks.filter((t) => t.dept === id);
  if (!ts.length) return 0;
  return Math.round(ts.reduce((a, t) => a + taskProgress(t), 0) / ts.length);
}

export function deptKpi(S: CrmState, id: string, kmonth: string): number | null {
  const ks = S.kpis.filter((k) => k.dept === id);
  if (!ks.length) return null;
  return Math.round(ks.reduce((a, k) => a + kpiScore(S, k, kmonth), 0) / ks.length);
}
