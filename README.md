# Emthrive · CRM intern (Next.js)

Port al CRM-ului intern din varianta HTML într-o aplicație **Next.js 15 (App Router) +
TypeScript + Tailwind v4**, cu date partajate în **Firebase Firestore** și login prin
**magic link** (email fără parolă), trimis prin **ZeptoMail**.

## Ce face

- **Panou** — progres general, taskuri active/întârziate, departamente, clasament echipă, „taskurile mele”.
- **Taskuri** — grupate pe status, filtre, subtaskuri, recurență, „data acoperită”, reînnoire ciclu.
- **KPI** — ținte lunare cu istoric lună de lună, pe departamente și persoane.
- **Echipă** — scoruri (execuție + KPI + evaluare calitativă), evaluări 1–5 pe criterii.
- **Setări** — departamente, ponderi scor, export/import JSON+CSV, reset.

Datele sunt un singur document Firestore (`crm/{docId}`) sincronizat în timp real între toți
membrii. „Cine sunt” se ține local, per dispozitiv. Fără config Firebase, aplicația rulează
local pe `localStorage` (util pentru dezvoltare).

## Setup

1. **Instalează dependențele**

   ```bash
   npm install
   ```

2. **Configurează `.env.local`** (pornind de la `.env.local.example`):

   - **Client (public):** din Firebase console → *Project settings → General → Your apps →
     Web app (`</>`) → SDK setup and configuration* → `NEXT_PUBLIC_FIREBASE_*`.
   - **Admin (secret, doar server):** din service account → `FIREBASE_ADMIN_*`. Folosit
     pentru a genera link-ul de sign-in.
   - **ZeptoMail:** `ZEPTOMAIL_TOKEN`, `ZEPTOMAIL_FROM` — pentru trimiterea email-ului.
   - **`BOOTSTRAP_ADMIN_EMAILS`** (ex. `contact@emthrive.com`) — cine poate intra din start,
     până există membri cu email în platformă.

3. **Activează Firebase Auth → Email link (passwordless)**
   Firebase console → *Authentication → Sign-in method → Email/Password* → activează
   **Email link (passwordless sign-in)**. Adaugă domeniile din care rulezi la
   *Authentication → Settings → Authorized domains* (`localhost` e deja permis).

4. **Publică regulile Firestore** din `firestore.rules` (acces doar utilizatorilor logați).

5. **Rulează**

   ```bash
   npm run dev      # dezvoltare
   npm run build && npm start   # producție
   ```

## Fluxul de login (magic link prin ZeptoMail)

1. Utilizatorul introduce email-ul → `POST /api/auth/magic-link`.
2. Serverul verifică **whitelist-ul**: emailurile membrilor din documentul CRM
   (`members[].email`) plus `BOOTSTRAP_ADMIN_EMAILS`.
   - Pe whitelist → generează link cu **Firebase Admin** și îl trimite prin **ZeptoMail**.
   - **Nu** e pe whitelist → răspuns generic de succes, **fără** email şi **fără** eroare
     (anti-enumerare: nu dezvăluim ce adrese există).
3. La click, aplicația finalizează sign-in-ul cu `signInWithEmailLink`.

**Gestionarea userilor** se face din platformă: *Echipă → „+ Persoană”* (sau editare) —
completezi emailul de acces, iar acel email intră automat în whitelist.

## Structură

```
src/
  app/            layout, page, globals.css, api/auth/magic-link
  components/     Header, Crm, AuthGate, Login, TaskCard, ui/, views/
  lib/            types, constants, utils, calc, seed (+migrare), store (Zustand+Firestore),
                  forms, actions, firebase (client), useAuth, server/ (admin + zeptomail)
reference/        varianta HTML originală (pentru comparație)
```

## ⚠️ Securitate

Cheia **service account** trebuie ținută doar în `.env.local` / variabilele de mediu ale
serverului — niciodată în client sau în git. Dacă a fost expusă, **rotește-o** din
*Firebase console → Project settings → Service accounts → Generate new private key* și
revocă cheia veche.
