import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/adminFirebase";
import { assistantAuthorized } from "@/lib/server/assistantAuth";
import { CRM_DOC_ID, STATUS } from "@/lib/constants";
import { applyStatusChange } from "@/lib/taskRules";
import type { CrmState, StatusId, Task, TaskEvent } from "@/lib/types";
import { todayISO } from "@/lib/utils";

export const runtime = "nodejs";

// ============================================================
//  API PENTRU ASISTENTUL DE ECHIPĂ (GrowGrow / WhatsApp)
//  POST /api/assistant/tasks/status — mută un task în altă coloană
//  (Backlog / De făcut / În lucru / Testing / Finalizat), cu ACELEAȘI
//  reguli ca mutarea pe board (actions.ts → moveTask): doar
//  responsabilul taskului, managerul sau adminul; „Finalizat" intră
//  în jurnalul de finalizări (KPI), scos din „Finalizat" = redeschis.
//  Acces doar cu token: `Authorization: Bearer <ASSISTANT_API_TOKEN>`.
// ============================================================

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const MAX_EVENTS = 40; // la fel ca history.ts

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Body = {
  by?: string; // id-ul membrului care cere (obligatoriu)
  taskId?: string;
  status?: string; // backlog | todo | lucru | testing | gata
};

export async function POST(req: Request) {
  if (!assistantAuthorized(req)) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  const by = (body.by || "").trim();
  const taskId = (body.taskId || "").trim();
  const status = (body.status || "").trim() as StatusId;
  if (!STATUS.some((s) => s.id === status)) {
    return NextResponse.json(
      { error: `Status invalid. Permise: ${STATUS.map((s) => `${s.id} (${s.n})`).join(", ")}.` },
      { status: 400 },
    );
  }

  const ref = adminDb().doc(`crm/${CRM_DOC_ID}`);
  try {
    const moved = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.data() as { json?: string } | undefined;
      if (!raw?.json) throw new HttpError(500, "Datele TeamPulse lipsesc.");
      const S = JSON.parse(raw.json) as CrmState;

      const member = S.members.find((m) => m.id === by && m.active);
      if (!member) throw new HttpError(400, "Cel care cere nu e un membru activ TeamPulse.");
      const t = S.tasks.find((x) => x.id === taskId);
      if (!t) throw new HttpError(404, "Taskul nu există.");
      if (t.status === status) throw new HttpError(400, "Taskul e deja în coloana asta.");

      // Regula de pe board: userul doar taskurile lui, adminul şi managerul pe toate.
      const elevated =
        adminEmails.includes((member.email || "").toLowerCase()) || member.platformRole === "manager";
      if (!elevated && t.assignee !== member.id) {
        throw new HttpError(403, "Poți muta doar taskurile la care ești responsabil (managerii și adminii pot muta orice task).");
      }

      const from = t.status;
      applyStatusChange(t, status, todayISO());
      const e: TaskEvent = { d: new Date().toISOString(), by: member.id, k: "status", v: STATUS.find((s) => s.id === status)!.n };
      t.history = [...(t.history || []), e].slice(-MAX_EVENTS);

      tx.set(ref, { json: JSON.stringify(S), updatedAt: Date.now() });
      return { t, from };
    });

    const name = (id: string) => STATUS.find((s) => s.id === id)?.n || id;
    const t: Task = moved.t;
    return NextResponse.json({
      ok: true,
      task: { id: t.id, title: t.title, from: name(moved.from), to: name(t.status), completedAt: t.completedAt },
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("assistant task status error:", err);
    return NextResponse.json({ error: "Eroare la mutarea taskului." }, { status: 500 });
  }
}
