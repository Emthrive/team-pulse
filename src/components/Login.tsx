"use client";
// ============================================================
//  ECRAN DE LOGIN — magic link prin email (ZeptoMail)
// ============================================================
import { useState } from "react";
import { rememberEmail } from "@/lib/useAuth";

type Phase = "idle" | "sending" | "sent" | "error";

export function Login({ finishing }: { finishing?: boolean }) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr || !addr.includes("@")) {
      setPhase("error");
      setMsg("Introdu o adresă de email validă.");
      return;
    }
    setPhase("sending");
    setMsg("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, continueUrl: window.location.origin + window.location.pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Nu am putut trimite email-ul.");
      rememberEmail(addr);
      setPhase("sent");
    } catch (err) {
      setPhase("error");
      setMsg(err instanceof Error ? err.message : "Eroare necunoscută.");
    }
  }

  return (
    <div className="ovl" style={{ position: "static", background: "transparent", minHeight: "70vh", alignItems: "center" }}>
      <div className="sheet" style={{ borderRadius: 18, maxWidth: 420 }}>
        <div className="row" style={{ gap: 11, marginBottom: 6 }}>
          <div className="mark">T</div>
          <div>
            <div className="htitle">TeamPulse</div>
            <div className="hsub">powered by Emthrive</div>
          </div>
        </div>

        {finishing ? (
          <p className="mini" style={{ margin: "14px 0" }}>
            Te autentificăm…
          </p>
        ) : phase === "sent" ? (
          <>
            <h3 style={{ marginTop: 14 }}>Verifică-ţi email-ul</h3>
            <p className="mini" style={{ lineHeight: 1.6 }}>
              Dacă <b style={{ color: "var(--color-turq)" }}>{email}</b> este o adresă autorizată,
              vei primi un link de acces în câteva momente. Deschide-l pe acest dispozitiv ca să intri
              în CRM. Link-ul e valabil o oră.
            </p>
            <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setPhase("idle")}>
              Foloseşte altă adresă
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3 style={{ marginTop: 14 }}>Autentificare</h3>
            <p className="mini" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              Introdu email-ul de echipă. Îţi trimitem un link magic — fără parolă.
            </p>
            <div className="f">
              <label className="lbl">Email</label>
              <input
                type="email"
                value={email}
                autoFocus
                placeholder="prenume@emthrive.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {phase === "error" && (
              <p className="mini" style={{ color: "var(--color-red)", marginBottom: 10 }}>
                {msg}
              </p>
            )}
            <button className="btn" style={{ width: "100%", padding: 12 }} disabled={phase === "sending"}>
              {phase === "sending" ? "Se trimite…" : "Trimite link-ul de acces"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
