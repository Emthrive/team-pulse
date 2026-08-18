# TeamPulse — note pentru agenți

## Economie de context — NU citi directoare mari
Nu lista și nu căuta niciodată în `node_modules`, `.next`, `dist`, `build`.

- Pentru căutări în cod folosește tool-urile Grep/Glob (respectă `.gitignore`,
- Dacă chiar trebuie Bash recursiv, exclude explicit:
  `grep -r ... --exclude-dir={node_modules,.next,dist,build}`
- Ce pachete sunt instalate se vede din `package.json`, nu din `node_modules`.
