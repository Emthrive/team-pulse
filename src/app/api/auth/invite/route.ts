import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/server/adminFirebase";
import { sendMagicLinkEmail } from "@/lib/server/zeptomail";

export const runtime = "nodejs";

// Adminii care pot trimite invitații (verificat pe server, nu doar în UI).
const adminEmails = [
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(","),
  ...(process.env.BOOTSTRAP_ADMIN_EMAILS || "").split(","),
]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: Request) {
  // 1) Autentificare: token-ul Firebase al apelantului
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Neautentificat." }, { status: 401 });

  let caller;
  try {
    caller = await adminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token invalid." }, { status: 401 });
  }

  // 2) Autorizare: doar adminii pot invita
  const callerEmail = (caller.email || "").toLowerCase();
  if (!adminEmails.includes(callerEmail)) {
    return NextResponse.json({ error: "Doar adminii pot trimite invitații." }, { status: 403 });
  }

  // 3) Emailul destinatarului
  let body: { email?: string; continueUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalid." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || body.continueUrl || new URL(req.url).origin;

  try {
    const link = await adminAuth().generateSignInWithEmailLink(email, {
      url: base,
      handleCodeInApp: true,
    });
    await sendMagicLinkEmail(email, link);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("invite error:", err);
    const message = err instanceof Error ? err.message : "Eroare la trimiterea link-ului.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
