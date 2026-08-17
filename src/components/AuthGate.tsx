"use client";
// ============================================================
//  POARTĂ DE AUTENTIFICARE — CRM-ul e vizibil doar după login
// ============================================================
import { firebaseReady } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { Crm } from "./Crm";
import { Login } from "./Login";

export function AuthGate() {
  const { ready, user, finishing } = useAuth();

  // Fără config Firebase rulăm local, fără login (dezvoltare).
  if (!firebaseReady) return <Crm />;

  if (!ready || finishing) {
    return (
      <main className="app-main">
        <Login finishing />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-main">
        <Login />
      </main>
    );
  }

  return <Crm />;
}
