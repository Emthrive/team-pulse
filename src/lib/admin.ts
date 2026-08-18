"use client";
// ============================================================
//  ROLURI — admin, manager, utilizator normal
//  Admin (NEXT_PUBLIC_ADMIN_EMAILS): acces complet.
//  Manager (platformRole pe membru): ca adminul — creează/mută/asignează
//  taskuri oriunde (cu aceeaşi regulă de acceptare), editează KPI, vede
//  Setări — dar NU gestionează utilizatori (adăugare/editare/ştergere),
//  NU şterge KPI/departamente şi NU are zona de date (export/import/reset).
//  Utilizator normal: vizualizare + interacţiune pe taskurile lui.
// ============================================================
import { currentMemberId } from "./calc";
import { firebaseReady } from "./firebase";
import { useStore } from "./store";
import type { CrmState } from "./types";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  // În dev fără Firebase (fără login) lăsăm acces complet, ca să se poată lucra.
  // Pentru testare locală poţi simula un non-admin cu localStorage.TP_DEV_ROLE = "user"
  // (rolul de manager vine atunci din membrul curent, ca în producţie).
  if (!firebaseReady)
    return typeof window === "undefined" || window.localStorage.getItem("TP_DEV_ROLE") !== "user";
  return ADMIN_EMAILS.includes((email || "").toLowerCase());
}

/** Membrul curent are rol de manager în platformă? */
export function isManagerUser(S: CrmState | null, me: string, authEmail: string): boolean {
  if (!S) return false;
  const id = currentMemberId(S, me, authEmail);
  const m = id ? S.members.find((x) => x.id === id) : undefined;
  return m?.platformRole === "manager";
}

/** Admin sau manager — drepturi extinse pe taskuri/KPI/Setări (nu şi pe utilizatori). */
export function isElevated(S: CrmState | null, me: string, authEmail: string): boolean {
  return isAdminEmail(authEmail) || isManagerUser(S, me, authEmail);
}

/** Hook: true dacă utilizatorul curent e admin. */
export function useIsAdmin(): boolean {
  const email = useStore((s) => s.authEmail);
  return isAdminEmail(email);
}

/** Hook: rolul curent — { admin, manager, elevated = admin sau manager }. */
export function useRole(): { admin: boolean; manager: boolean; elevated: boolean } {
  const email = useStore((s) => s.authEmail);
  const S = useStore((s) => s.S);
  const me = useStore((s) => s.me);
  const admin = isAdminEmail(email);
  const manager = !admin && isManagerUser(S, me, email);
  return { admin, manager, elevated: admin || manager };
}
