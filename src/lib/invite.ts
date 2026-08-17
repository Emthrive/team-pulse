"use client";
// ============================================================
//  INVITAȚIE — adminul trimite link de acces unei persoane.
// ============================================================
import { getAuthClient } from "./firebase";

export async function inviteUser(email: string): Promise<{ ok: boolean; error?: string }> {
  const addr = (email || "").trim().toLowerCase();
  if (!addr) return { ok: false, error: "fără email" };
  try {
    const user = getAuthClient().currentUser;
    if (!user) return { ok: false, error: "neautentificat" };
    const token = await user.getIdToken();
    const res = await fetch("/api/auth/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ email: addr, continueUrl: window.location.origin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error || "eroare la trimitere" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "eroare" };
  }
}
