"use client";
// ============================================================
//  COLECȚIA `users` — un document per cont autentificat,
//  ca să vezi utilizatorii ca tabel în consola Firestore.
// ============================================================
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { isAdminEmail } from "./admin";
import { db, firebaseReady } from "./firebase";

/** Upsert `users/{uid}` la login. Fire-and-forget — nu blochează autentificarea. */
export async function recordUserLogin(user: User) {
  if (!firebaseReady || !user) return;
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const email = (user.email || "").toLowerCase();
    const data: Record<string, unknown> = {
      uid: user.uid,
      email,
      role: isAdminEmail(email) ? "admin" : "user",
      lastLoginAt: serverTimestamp(),
    };
    if (!snap.exists()) data.createdAt = serverTimestamp();
    await setDoc(ref, data, { merge: true });
  } catch {
    /* dacă regulile nu permit încă scrierea, ignorăm */
  }
}
