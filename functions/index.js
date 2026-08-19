// ============================================================
//  TeamPulse — Cloud Function: recurență automată a taskurilor
//
//  Rulează zilnic. Pentru fiecare task recurent al cărui termen
//  a trecut, creează o COPIE identică pentru ciclul următor
//  (deadline +1 lună), în rubrica „De făcut". Originalul rămâne
//  ca istoric și iese din recurență — ștafeta trece la copie,
//  așa nu apar duplicate.
//
//  NU folosește cheia Admin exportată: rulează cu credențialele
//  runtime-ului Firebase (applicationDefault).
// ============================================================
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Documentul unic cu toată starea CRM (vezi src/lib/store.ts). Implicit „main".
const CRM_DOC_ID = process.env.CRM_DOC_ID || "main";

// Tipurile de recurență care se auto-clonează. Cerut: lunar.
// Ca să activezi și „săptămânal", adaugă-l în listă.
const AUTO_TYPES = ["lunar"];

// --- helperi de dată (pe string-uri YYYY-MM-DD, în UTC, determinist) ---
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);

function addDays(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// +n luni cu clamp pe ultima zi (31 aug + 1 lună → 30 sep, nu 1 oct).
function addMonths(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  const idx = m - 1 + n;
  const ty = y + Math.floor(idx / 12);
  const tm = ((idx % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ty, tm, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

function shift(dl, type, periods) {
  if (!dl) return dl;
  return type === "lunar" ? addMonths(dl, periods) : addDays(dl, periods * 7);
}

// Copie identică a taskului pentru ciclul următor.
function cloneTask(t, periods, today, nowIso) {
  return {
    ...t,
    id: uid(),
    deadline: shift(t.deadline, t.recurring, periods),
    status: "todo", // mereu „De făcut"
    progress: 0,
    completedAt: "",
    pendingAssignee: "",
    assignedBy: "",
    createdAt: today,
    completions: [], // ciclu nou; istoricul KPI rămâne pe originalul finalizat
    archived: false,
    recurring: t.recurring, // copia preia ștafeta recurenței
    subtasks: (t.subtasks || []).map((s) => {
      const ns = { ...s, id: uid(), done: false, deadline: shift(s.deadline, t.recurring, periods) };
      delete ns.doneAt;
      return ns;
    }),
    history: [{ d: nowIso, by: "", k: "creat" }], // intrare sintetizată (autor necunoscut)
  };
}

exports.recurringTasks = onSchedule(
  {
    schedule: "5 3 * * *", // zilnic la 03:05
    timeZone: "Europe/Bucharest",
    region: "europe-west1",
  },
  async () => {
    const ref = db.collection("crm").doc(CRM_DOC_ID);
    const spawned = [];

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return logger.warn("Doc crm lipsă", { doc: CRM_DOC_ID });

      const data = snap.data();
      if (!data || !data.json) return logger.warn("crm.json lipsă");

      let state;
      try {
        state = JSON.parse(data.json);
      } catch (e) {
        return logger.error("crm.json invalid — abandonez", e);
      }
      if (!state || !Array.isArray(state.tasks)) return logger.warn("Fără listă de taskuri");

      const today = todayISO();
      const nowIso = new Date().toISOString();
      const fresh = [];

      for (const t of state.tasks) {
        if (!AUTO_TYPES.includes(t.recurring)) continue; // doar tipurile auto
        if (!t.deadline) continue; // fără termen n-avem ancoră
        if (today < t.deadline) continue; // ciclul nu s-a încheiat încă

        // Câte perioade sărim ca noul termen să fie strict în viitor.
        // Normal = 1; >1 doar dacă funcția a fost oprită mai multe cicluri.
        let periods = 1;
        while (shift(t.deadline, t.recurring, periods) <= today && periods < 60) periods++;

        const clone = cloneTask(t, periods, today, nowIso);
        t.recurring = ""; // originalul iese din recurență → evită duplicatele
        fresh.push(clone);
        spawned.push({ from: t.id, to: clone.id, title: clone.title, deadline: clone.deadline });
      }

      if (!fresh.length) return; // nimic scadent → nu rescriem documentul
      state.tasks.push(...fresh);
      tx.set(ref, { json: JSON.stringify(state), updatedAt: Date.now() });
    });

    if (spawned.length) logger.info(`Recurență: ${spawned.length} task(uri) clonate`, { spawned });
    else logger.info("Recurență: nimic scadent azi");
  },
);
