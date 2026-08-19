# TeamPulse — Cloud Functions

Automatizări server-side care rulează în Firebase, independent de cine e online.

## Ce conține

- **`recurringTasks`** — zilnic la 03:05 (Europe/Bucharest). Pentru fiecare task
  recurent (`recurring: "lunar"`) al cărui termen a trecut, creează o **copie
  identică** pentru luna următoare (deadline +1 lună, în „De făcut"). Originalul
  rămâne ca istoric; ștafeta recurenței trece la copie → fără duplicate.

Nu folosește cheia Admin exportată — rulează cu credențialele runtime-ului
Firebase (`applicationDefault`).

## Prima dată: activează Blaze

Cloud Functions cere planul **Blaze** (pay-as-you-go, card atașat). Un job zilnic
minuscul stă în free tier → practic **$0/lună**.

1. Firebase Console → ⚙️ → *Usage and billing* → *Modify plan* → **Blaze**.
2. (Recomandat) *Budget alert* la ~1–5 $/lună, ca plasă de siguranță.

## Deploy

Din **rădăcina** proiectului (nu din `functions/`):

```bash
cd functions && npm install && cd ..
firebase login            # o singură dată
firebase deploy --only functions
```

Primul deploy activează automat API-urile necesare (Scheduler, Pub/Sub, Cloud
Run, Artifact Registry, Build).

## Testare fără să aștepți ora

Console → **Cloud Scheduler** → job-ul `recurringTasks` → **Run now**. Apoi:

```bash
firebase functions:log --only recurringTasks
```

## Reglaje (în `index.js`)

- **Ora / frecvența**: `schedule: "5 3 * * *"` (cron) + `timeZone`.
- **Și săptămânal**: adaugă `"saptamanal"` în `AUTO_TYPES`.
- **Alt doc CRM**: setează `CRM_DOC_ID` (ex. `functions/.env` cu
  `CRM_DOC_ID=...`). Implicit `main`.
- **Regiune**: `region: "europe-west1"`.

## Cum evită duplicatele

Doar **un** task din lanț e `recurring` la un moment dat. Când termenul trece,
funcția clonează și șterge `recurring` de pe original → copia (cu termen în
viitor) nu redevine scadentă până în ciclul următor. Rulările zilnice repetate
nu produc dubluri, iar tranzacția Firestore evită coliziunile cu scrierile din
aplicație.
