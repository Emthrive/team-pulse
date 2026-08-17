// ============================================================
//  HELPERI DE CALCUL — scoruri, progres, KPI (portați din original)
// ============================================================
import { CRIT } from "./constants";
import type { CrmState, Kpi, MemberStats, Task } from "./types";
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

export function kpiVal(k: Kpi, mth: string): number {
  return Number((k.vals || {})[mth] || 0);
}
export function kpiHas(k: Kpi, mth: string): boolean {
  return (k.vals || {})[mth] !== undefined;
}
export function kpiScore(k: Kpi, mth: string): number {
  const v = kpiVal(k, mth);
  const t = Number(k.target) || 0;
  if (!t || !kpiHas(k, mth)) return 0;
  if (k.dir === "down") return v <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((t / v) * 100)));
  return Math.max(0, Math.min(100, Math.round((v / t) * 100)));
}

export const memberTasks = (S: CrmState, id: string) => S.tasks.filter((t) => t.assignee === id);

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
    ? Math.round(ks.reduce((a, k) => a + kpiScore(k, kmonth), 0) / ks.length)
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
  return Math.round(ks.reduce((a, k) => a + kpiScore(k, kmonth), 0) / ks.length);
}
