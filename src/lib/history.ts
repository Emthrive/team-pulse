"use client";
// ============================================================
//  JURNAL DE ACTIVITATE PE TASK — cine a creat / asignat /
//  mutat / editat. Plafonat per task: toată starea CRM stă
//  într-un singur document Firestore (limită ~1MB).
// ============================================================
import { MONTH_NAMES } from "./constants";
import type { Task, TaskEvent, TaskEventKind } from "./types";

const MAX_EVENTS = 40;

/** Adaugă un eveniment în istoricul taskului (cu momentul curent). */
export function logEvent(t: Task, by: string, k: TaskEventKind, v?: string) {
  const e: TaskEvent = { d: new Date().toISOString(), by, k };
  if (v) e.v = v;
  t.history = [...(t.history || []), e].slice(-MAX_EVENTS);
}

/** Textul acțiunii (fără autor — autorul se afișează separat, cu bold). */
export function evText(e: TaskEvent): string {
  switch (e.k) {
    case "creat": return "a creat taskul";
    case "asignat": return e.v ? "a asignat: " + e.v : "a schimbat responsabilul";
    case "propus": return "a propus asignarea către " + (e.v || "…");
    case "acceptat": return "a acceptat asignarea";
    case "refuzat": return "a refuzat asignarea";
    case "status": return "a mutat în „" + (e.v || "?") + "”";
    case "finalizat": return "a marcat finalizat";
    case "redeschis": return "a redeschis taskul";
    case "reinnoit": return "a reînnoit ciclul recurent";
    case "editat": return e.v ? "a editat: " + e.v : "a editat taskul";
    case "subtask": return "a adăugat în Epic: „" + (e.v || "") + "”";
  }
}

/** „18 aug · 14:05” — fără oră pentru datele vechi (doar zi, ex. createdAt). */
export function fmtEvDate(d: string): string {
  const x = new Date(d);
  if (isNaN(+x)) return d;
  const base = x.getDate() + " " + MONTH_NAMES[x.getMonth()];
  if (d.length <= 10) return base;
  return base + " · " + String(x.getHours()).padStart(2, "0") + ":" + String(x.getMinutes()).padStart(2, "0");
}
