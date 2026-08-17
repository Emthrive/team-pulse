import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/server/adminFirebase";
import { sendMagicLinkEmail } from "@/lib/server/zeptomail";

export const runtime = "nodejs";

const CRM_DOC_ID = process.env.NEXT_PUBLIC_CRM_DOC_ID || "main";

// Adminii de bootstrap pot intra chiar dacă whitelist-ul e gol (primul acces).
const bootstrapAdmins = (process.env.BOOTSTRAP_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Citește whitelist-ul = emailurile membrilor din documentul CRM. */
async function allowedEmails(): Promise<Set<string>> {
  const set = new Set<string>(bootstrapAdmins);
  try {
    const snap = await adminDb().doc("crm/" + CRM_DOC_ID).get();
    const json = snap.exists ? (snap.data()?.json as string | undefined) : undefined;
    if (json) {
      const state = JSON.parse(json) as { members?: { email?: string; active?: boolean }[] };
      (state.members || []).forEach((m) => {
        const e = (m.email || "").trim().toLowerCase();
        if (e) set.add(e);
      });
    }
  } catch {
    /* dacă nu putem citi, rămân doar adminii de bootstrap */
  }
  return set;
}

export async function POST(req: Request) {
  let body: { email?: string; continueUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();

  // Nu confirmăm/negăm existența adresei: format invalid → răspuns generic de succes.
  if (!validEmail(email)) {
    return NextResponse.json({ ok: true });
  }

  const allowed = await allowedEmails();

  // Cine NU e pe whitelist: nu trimitem email și NU dăm eroare (anti-enumerare).
  if (!allowed.has(email)) {
    return NextResponse.json({ ok: true });
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
    console.error("magic-link error:", err);
    // Eroare reală (config Admin/ZeptoMail) — o vede doar un email de pe whitelist.
    const message = err instanceof Error ? err.message : "Eroare la trimiterea link-ului.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
