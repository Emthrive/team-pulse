// ============================================================
//  REGULILE TASKURILOR — partajate de formularul din UI (forms.ts)
//  și de API-ul pentru asistent (server). Fără „use client": doar
//  funcții pure, ca să poată rula și pe server.
// ============================================================

/** Tipurile de livrabil pe departament (id-urile stabile din seed) — devin
 *  etichete și leagă taskul de KPI-urile auto cu filtru de tag. Derivate din
 *  KPI-urile numărabile ale fiecărui departament (dashboard-ul KPI). */
export const TASK_TYPES_BY_DEPT: { dept: string; types: string[] }[] = [
  { dept: "it", types: ["Bug", "Feature"] },
  { dept: "mkt", types: ["Postare", "Video", "Campanie"] },
  { dept: "sales", types: ["Sesiune 1:1"] },
  { dept: "cons", types: ["Sesiune consiliere", "Raport"] },
  { dept: "adm", types: ["Factură", "Raportare financiară"] },
  { dept: "part", types: ["Propunere", "Parteneriat semnat", "Sponsorizare"] },
];

export const TASK_TYPES = TASK_TYPES_BY_DEPT.flatMap((x) => x.types);

/** Tipurile de livrabil permise pentru un departament. */
export const typesForDept = (deptId: string): string[] =>
  TASK_TYPES_BY_DEPT.find((x) => x.dept === deptId)?.types || [];

/** Etichetele unui task = tipul de livrabil (leagă de KPI) + proiectul ales; ambele opționale. */
export function mergeTags(ttype: string, project: string): string[] {
  const out: string[] = [];
  if (ttype.trim()) out.push(ttype.trim());
  if (project.trim()) out.push(project.trim());
  return out;
}

/** Validarea formularului de task: titlu (≥3 după tăierea spaţiilor), departament, tip livrabil şi
 *  proiect sunt obligatorii. Responsabilul e opţional (gol = nealocat → backlog); la fel termen,
 *  recurenţă şi note. */
export function validateTask(d: Record<string, string>): Record<string, string> | null {
  const e: Record<string, string> = {};
  const title = (d.title || "").trim();
  if (!title) e.title = "Titlul e obligatoriu.";
  else if (title.length < 3) e.title = "Minim 3 caractere.";
  if (!d.dept) e.dept = "Alege un departament.";
  if (!d.ttype) e.ttype = "Alege tipul livrabilului.";
  if (!d.project) e.project = "Alege un proiect.";
  return Object.keys(e).length ? e : null;
}
