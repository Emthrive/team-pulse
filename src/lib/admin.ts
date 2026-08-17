"use client";
// ============================================================
//  ROLURI — admin vs utilizator normal
//  Adminii (NEXT_PUBLIC_ADMIN_EMAILS) pot adăuga/crea și văd Setări.
//  Restul au acces de vizualizare + interacțiune (bifare, editare
//  status), fără creare de entități și fără zona de Setări.
// ============================================================
import { firebaseReady } from "./firebase";
import { useStore } from "./store";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  // În dev fără Firebase (fără login) lăsăm acces complet, ca să se poată lucra.
  if (!firebaseReady) return true;
  return ADMIN_EMAILS.includes((email || "").toLowerCase());
}

/** Hook: true dacă utilizatorul curent e admin. */
export function useIsAdmin(): boolean {
  const email = useStore((s) => s.authEmail);
  return isAdminEmail(email);
}
