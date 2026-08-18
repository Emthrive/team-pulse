# TeamPulse — ghid de context pentru agenți

Platformă internă de echipă/taskuri/KPI, „powered by Emthrive". Citește fișierul
ăsta o dată la început și folosește harta de mai jos în loc să scanezi proiectul.

## Tech stack
- Next.js 15 (App Router) + React 19, TypeScript, TailwindCSS v4
- State: Zustand (`src/lib/store.ts`)
- Backend: Firebase — Firestore (un singur doc `crm/main`), Auth magic-link, Admin SDK
- Email: ZeptoMail (EU). Charts: Recharts. Iconițe: lucide-react

## Comenzi
- Dev:   `npm run dev`   (Next pe :3000 — pornește-l prin preview_start, nu prin Bash)
- Build: `npm run build` (NU rula cât timp dev rulează — strică `.next`)
- Start: `npm start`   ·   Lint: `npm run lint`

## Hartă (mergi direct aici, nu căuta global)
- `src/app/`            — pagini (App Router)
- `src/app/api/`        — route handlers (server; trimit email/invite)
- `src/components/`     — UI  ·  `views/` = ecranele (Dash/Tasks/Team/Kpi/Settings)
                              ·  `ui/` = Modal & primitive  ·  `charts/` = Recharts
- `src/lib/`
  - `types.ts`      — tipurile partajate (începe de aici pt. model de date)
  - `store.ts`      — Zustand + tipul `FormField`
  - `admin.ts`      — roluri: `isElevated()`, hook `useRole()` {admin,manager,elevated}
  - `actions.ts`    — mutații gated pe permisiuni (move/assign/edit)
  - `forms.ts`      — definițiile formularelor (task/member/kpi/dept)
  - `calc.ts`       — matematica KPI/progres + snapshot-uri lunare
  - `seed.ts` `history.ts` `invite.ts` `users.ts` `firebase.ts` `utils.ts` `constants.ts`
  - `server/`       — cod strict server-side

## Roluri
admin (env `NEXT_PUBLIC_ADMIN_EMAILS`) > manager (`Member.platformRole === "manager"`)
> user. „elevated" = admin || manager. Sursa de adevăr: `src/lib/admin.ts`.

## Reguli de cod
- Componente funcționale + interfețe TypeScript. Comentarii în română (ca restul).
- Respectă gating-ul din `actions.ts`/`admin.ts` — nu ocoli verificările de rol.

## Economie de tokens (important)
- Nu lista/scana `node_modules`, `.next`, `dist`, `build` — sunt uriașe.
  (tool-ul Read e deja blocat pe ele din `.claude/settings.json`.)
- Pentru căutări folosește Grep/Glob (respectă `.gitignore`), NU `grep -r`/`find .`/`ls -R`
  pe rădăcină. Dacă chiar trebuie Bash recursiv: `--exclude-dir={node_modules,.next,dist,build}`.
- Ce pachete există → din `package.json`, nu din `node_modules`.
- Consultă harta de mai sus înainte să deschizi fișiere „pe ghicite".

## Reguli de proiect (standing)
- Push/commit DOAR când cere userul explicit. Deploy-ul e manual.
- Secrete doar în `.env.local` (gitignored). Cheia Firebase Admin: TODO de rotit.
