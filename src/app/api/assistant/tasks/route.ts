import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/adminFirebase";
import { memberDepts } from "@/lib/calc";
import { CRM_DOC_ID, PRIO, PROJECTS } from "@/lib/constants";
import { mergeTags, typesForDept, validateTask } from "@/lib/taskRules";
import type { CrmState, Task, TaskEvent, TaskEventKind } from "@/lib/types";
import { todayISO } from "@/lib/utils";

export const runtime = "nodejs";

// ============================================================
//  API PENTRU ASISTENTUL DE ECHIPĂ (GrowGrow / WhatsApp)
//  POST /api/assistant/tasks — creează un task cu ACELEAȘI reguli
//  ca formularul „Task nou" (forms.ts → newTask): validare comună,
//  departamentele permise, asignare cu acceptare, jurnal „creat".
//  Acces doar cu token: `Authorization: Bearer <ASSISTANT_API_TOKEN>`.
// ============================================================

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const MAX_EVENTS = 40; // la fel ca history.ts (doc-ul CRM are limită ~1MB)

/** Token-ul din header, comparat în timp constant. Fără token configurat → refuz tot. */
function authorized(req: Request): boolean {
  const expected = process.env.ASSISTANT_API_TOKEN || "";
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  const got = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function pushEvent(t: Task, by: string, k: TaskEventKind, v?: string) {
  const e: TaskEvent = { d: new Date().toISOString(), by, k };
  if (v) e.v = v;
  t.history = [...(t.history || []), e].slice(-MAX_EVENTS);
}

function newId(existing: Set<string>): string {
  let id = "";
  do id = Math.random().toString(36).slice(2, 9);
  while (!id || existing.has(id));
  return id;
}

type Body = {
  createdBy?: string; // id-ul membrului care cere (obligatoriu)
  title?: string;
  dept?: string; // id departament
  type?: string; // tip livrabil (din departamentul ales)
  project?: string; // unul din PROJECTS
  assignee?: string; // id membru; gol = nealocat (backlog echipă)
  deadline?: string; // YYYY-MM-DD, opțional
  priority?: string; // "normala" | "critica"
  notes?: string;
};

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }

  const input = {
    createdBy: (body.createdBy || "").trim(),
    title: (body.title || "").trim(),
    dept: (body.dept || "").trim(),
    type: (body.type || "").trim(),
    project: (body.project || "").trim(),
    assignee: (body.assignee || "").trim(),
    deadline: (body.deadline || "").trim(),
    priority: (body.priority || "normala").trim(),
    notes: (body.notes || "").trim(),
  };

  const ref = adminDb().doc(`crm/${CRM_DOC_ID}`);
  try {
    const created = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const raw = snap.data() as { json?: string } | undefined;
      if (!raw?.json) throw new HttpError(500, "Datele TeamPulse lipsesc.");
      const S = JSON.parse(raw.json) as CrmState;

      // --- cine creează: trebuie să fie un membru activ ---
      const creator = S.members.find((m) => m.id === input.createdBy && m.active);
      if (!creator) throw new HttpError(400, "Creatorul nu e un membru activ TeamPulse.");
      const elevated =
        adminEmails.includes((creator.email || "").toLowerCase()) || creator.platformRole === "manager";

      // --- validarea formularului (comună cu UI-ul) + verificările de valori ---
      // Tipurile permise = etichetele KPI-urilor departamentului (ca în formular).
      const types = typesForDept(S.kpis, input.dept);
      const errors: Record<string, string> =
        validateTask({ title: input.title, dept: input.dept, ttype: input.type, project: input.project }, types) || {};
      if (input.dept && !S.departments.some((d) => d.id === input.dept)) errors.dept = "Departament inexistent.";
      if (input.dept && !elevated && !memberDepts(creator).includes(input.dept)) {
        errors.dept = "Poți crea taskuri doar în departamentele tale.";
      }
      if (input.type && input.dept && !types.includes(input.type)) {
        errors.ttype = `Tip invalid pentru departament. Permise: ${types.join(", ") || "niciunul (lasă gol)"}.`;
      }
      if (input.project && !PROJECTS.includes(input.project)) {
        errors.project = `Proiect invalid. Permise: ${PROJECTS.join(", ")}.`;
      }
      if (!PRIO.some((p) => p.id === input.priority)) errors.priority = "Prioritate invalidă (normala / critica).";
      if (input.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) {
        errors.deadline = "Termen invalid (format YYYY-MM-DD).";
      }
      const chosen = input.assignee;
      if (chosen && !S.members.some((m) => m.id === chosen && m.active)) {
        errors.assignee = "Responsabilul nu e un membru activ.";
      }
      if (Object.keys(errors).length) throw new HttpError(400, "Date invalide.", errors);

      // --- construcția taskului: ca newTask() din forms.ts ---
      const t: Task = {
        id: newId(new Set(S.tasks.map((x) => x.id))),
        title: input.title,
        dept: input.dept,
        assignee: creator.id, // creatorul devine automat responsabil
        pendingAssignee: "",
        assignedBy: "",
        deadline: input.deadline,
        priority: input.priority as Task["priority"],
        status: chosen ? "todo" : "backlog", // nealocat → Backlog (pool-ul echipei)
        progress: 0,
        tags: mergeTags(input.type, input.project),
        notes: input.notes,
        subtasks: [],
        recurring: "",
        createdAt: todayISO(),
        completedAt: "",
        version: 1,
      };
      pushEvent(t, creator.id, "creat");

      // Regula de asignare (applyAssignment): nealocat / ție → direct; altcuiva → propunere.
      if (chosen !== t.assignee) {
        const nameOf = (id: string) => S.members.find((m) => m.id === id)?.n || id;
        if (chosen === "") {
          t.assignee = "";
          pushEvent(t, creator.id, "asignat", "nealocat");
        } else {
          t.pendingAssignee = chosen;
          t.assignedBy = creator.id;
          pushEvent(t, creator.id, "propus", nameOf(chosen));
        }
      }

      S.tasks.push(t);
      tx.set(ref, { json: JSON.stringify(S), updatedAt: Date.now() });
      return t;
    });

    return NextResponse.json({
      ok: true,
      task: {
        id: created.id,
        title: created.title,
        dept: created.dept,
        status: created.status,
        assignee: created.assignee,
        pendingAssignee: created.pendingAssignee,
        priority: created.priority,
        deadline: created.deadline,
        tags: created.tags,
      },
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message, errors: err.errors }, { status: err.status });
    }
    console.error("assistant task create error:", err);
    return NextResponse.json({ error: "Eroare la crearea taskului." }, { status: 500 });
  }
}
