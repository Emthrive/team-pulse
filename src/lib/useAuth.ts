"use client";
// ============================================================
//  AUTENTIFICARE — sesiune Firebase + finalizarea magic link-ului
// ============================================================
import { isSignInWithEmailLink, onAuthStateChanged, signInWithEmailLink, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseReady, getAuthClient } from "./firebase";
import { useStore } from "./store";

const EMAIL_KEY = "emthrive_signin_email";

export interface AuthState {
  ready: boolean;
  user: User | null;
  finishing: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    ready: false,
    user: null,
    finishing: false,
    error: null,
  });

  useEffect(() => {
    if (!firebaseReady) {
      // fără config Firebase: nu blocăm aplicația (mod local de dezvoltare)
      setState({ ready: true, user: null, finishing: false, error: null });
      return;
    }

    const auth = getAuthClient();

    // Dacă URL-ul curent e un link de sign-in, finalizăm autentificarea.
    if (typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)) {
      setState((s) => ({ ...s, finishing: true }));
      let email = "";
      try {
        email = window.localStorage.getItem(EMAIL_KEY) || "";
      } catch {
        /* ignore */
      }
      if (!email) {
        email = window.prompt("Confirmă adresa de email pentru autentificare:") || "";
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            try {
              window.localStorage.removeItem(EMAIL_KEY);
            } catch {
              /* ignore */
            }
            // curățăm parametrii din URL
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((e) => {
            setState((s) => ({ ...s, finishing: false, error: e?.message || "Link invalid sau expirat." }));
          });
      } else {
        setState((s) => ({ ...s, finishing: false, error: "Autentificare anulată." }));
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setState((s) => ({ ...s, ready: true, user, finishing: false }));
      useStore.getState().setAuthEmail(user?.email || "");
    });
    return unsub;
  }, []);

  return state;
}

export function rememberEmail(email: string) {
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* ignore */
  }
}
