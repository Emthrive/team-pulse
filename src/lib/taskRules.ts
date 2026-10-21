// ============================================================
//  REGULILE TASKURILOR — partajate de formularul din UI (forms.ts)
//  și de API-ul pentru asistent (server). Fără „use client": doar
//  funcții pure, ca să poată rula și pe server.
// ============================================================

import type { Kpi, Task } from "./types";

/** Tipurile de livrabil ale unui departament = etichetele („Filtru etichetă") KPI-urilor lui.
 *  Eticheta e chiar legătura task → KPI (KPI-ul automat numără taskurile cu eticheta lui), deci
 *  un KPI nou cu etichetă apare singur ca tip în formularul de task, fără modificări de cod.
 *  KPI-urile fără etichetă (ex. „Taskuri finalizate") numără tot și nu devin tipuri. */
export function typesForDept(kpis: Pick<Kpi, "dept" | "tag">[] | undefined, deptId: string): string[] {
  const out: string[] = [];
  for (const k of kpis || []) {
    const tag = (k.tag || "").trim();
    if (k.dept !== deptId || !tag) continue;
    if (!out.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push(tag);
  }
  return out;
}

/** Toate tipurile de livrabil (din toate departamentele) — ca să recunoaștem tipul unui task. */
export function allTaskTypes(kpis: Pick<Kpi, "dept" | "tag">[] | undefined): string[] {
  const depts = Array.from(new Set((kpis || []).map((k) => k.dept)));
  return depts.flatMap((d) => typesForDept(kpis, d));
}

/** Tipurile din lista fixă de dinainte. NU se mai oferă în formular — servesc doar ca să
 *  recunoaștem tipul taskurilor vechi (altfel editarea lor l-ar pierde din etichete). */
export const LEGACY_TASK_TYPES = [
  "Bug", "Feature", "Postare", "Video", "Campanie", "Sesiune 1:1", "Sesiune consiliere", "Raport",
  "Factură", "Raportare financiară", "Propunere", "Parteneriat semnat", "Sponsorizare",
];

/** Etichetele unui task = tipul de livrabil (leagă de KPI) + proiectul ales; ambele opționale. */
export function mergeTags(ttype: string, project: string): string[] {
  const out: string[] = [];
  if (ttype.trim()) out.push(ttype.trim());
  if (project.trim()) out.push(project.trim());
  return out;
}

/** Validarea formularului de task: titlu (≥3 după tăierea spaţiilor), departament şi proiect sunt
 *  obligatorii; tipul de livrabil e obligatoriu doar dacă departamentul are tipuri (KPI-uri cu
 *  etichetă) — `types` = typesForDept(...) pentru departamentul ales. Responsabilul e opţional
 *  (gol = nealocat → backlog); la fel termen, recurenţă şi note. */
export function validateTask(d: Record<string, string>, types: string[] = []): Record<string, string> | null {
  const e: Record<string, string> = {};
  const title = (d.title || "").trim();
  if (!title) e.title = "Titlul e obligatoriu.";
  else if (title.length < 3) e.title = "Minim 3 caractere.";
  if (!d.dept) e.dept = "Alege un departament.";
  if (!d.ttype && types.length) e.ttype = "Alege tipul livrabilului.";
  if (!d.project) e.project = "Alege un proiect.";
  return Object.keys(e).length ? e : null;
}

/** KPI-urile generice („Taskuri finalizate", „Epice finalizate") numără toate taskurile
 *  departamentului — rămân fără etichetă şi nu apar ca tip de livrabil. */
export function isGenericKpi(k: Pick<Kpi, "n" | "auto">): boolean {
  return k.auto === "epics_done" || k.n.trim().toLowerCase() === "taskuri finalizate";
}

/** Eticheta unui KPI e mereu denumirea lui (excepţie: cele generice, fără etichetă). */
export function kpiTypeTag(k: Pick<Kpi, "n" | "auto">): string {
  return isGenericKpi(k) ? "" : k.n.trim();
}

/** Re-etichetează taskurile unui departament: eticheta veche → cea nouă (la redenumirea KPI-ului),
 *  ca taskurile deja legate să rămână numărate. Fără etichetă nouă → eticheta veche se scoate. */
export function retagTasks(tasks: Task[], deptId: string, oldTag: string, newTag: string): void {
  const from = oldTag.trim().toLowerCase();
  if (!from || from === newTag.trim().toLowerCase()) return;
  tasks.forEach((t) => {
    if (t.dept !== deptId || !(t.tags || []).some((g) => g.trim().toLowerCase() === from)) return;
    const rest = t.tags.filter((g) => g.trim().toLowerCase() !== from);
    t.tags = newTag.trim() ? [newTag.trim(), ...rest] : rest;
  });
}
