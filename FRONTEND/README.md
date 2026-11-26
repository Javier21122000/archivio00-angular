# ARCHIVIO 00 - Sito

Interfaccia di ARCHIVIO 00 in Angular 22: componenti standalone, stato a signal, `OnPush`, rotte caricate in lazy e Tailwind CSS 4. Parla con l'API NestJS descritta in [`../BACKEND/README.md`](../BACKEND/README.md); il quadro d'insieme è nel [README principale](../README.md).

## Avvio

```sh
npm ci
npm start                  # http://localhost:4200
```

`proxy.conf.json` inoltra `/api` all'API su `http://localhost:3000`, quindi in locale basta avere il backend attivo (o usare `../avvia.command`, che avvia tutto).

## Script

| Comando | Cosa fa |
| --- | --- |
| `npm start` | dev server con ricarica |
| `npm run build` | build di produzione in `dist/frontend/browser` |
| `npm test` | test unitari e di componente (Vitest + jsdom, tramite `ng test`) |
| `npm run e2e` | test Playwright nel browser, contro `ng serve` e l'API attivi |
| `npm run lint` | oxlint |
| `node scripts/check-assets.mjs` | verifica che ogni immagine o clip citata in `src/app/data` esista in `public/` |

I test e2e hanno bisogno dell'API e di PostgreSQL attivi; se la porta 4200 è libera Playwright avvia da solo `ng serve`.

## Struttura

```text
src/app/
├── app.routes.ts        rotte, tutte lazy con loadComponent; /admin protetta da guard
├── app.config.ts        router e HttpClient con gli interceptor
├── core/
│   ├── guards/          adminGuard
│   ├── interceptors/    Bearer token (non su /auth/) e gestione errori
│   ├── models/          tipi condivisi con il contratto API
│   ├── services/        auth, prodotti, preferiti, admin, UI (stato in signal)
│   └── util/            query del catalogo, errori API, formattazione euro
├── pages/               home, catalogo, leggenda, preferiti, admin, editoriale, 404
├── shared/              griglia e card prodotto, modali, album, nastro, reveal, toast
├── layout/              navbar, footer, modale di accesso, drawer
└── data/                leggende, schede dei capi, diario fotografico
public/                  immagini dei capi, del diario e delle leggende, clip WebP
e2e/                     test Playwright
scripts/check-assets.mjs
```

## Scelte che vale la pena conoscere

- **Il catalogo è del server.** `ProductGridComponent` tiene lo stato in signal e chiede una pagina alla volta (12 nel catalogo, 8 in home). Un unico stream con `debounceTime(300)` per la ricerca e `switchMap` annulla la richiesta in corso quando ne parte una nuova, così una risposta lenta e obsoleta non viene mai applicata. Le pagine successive si accodano scartando i capi già presenti (`appendUnique`).
- **Sessione solo in memoria.** Il token vive in un signal di `AuthService`, non in `localStorage`: al ricaricamento si riparte da ospite.
- **`adminGuard` è un aiuto per l'interfaccia**, non una protezione: l'autorizzazione vera è nel backend.
- **Contenuti statici in `data/`.** Le leggende, le schede dei capi (indicizzate sul nome del file immagine, così sopravvivono a una rinomina del prodotto) e il diario sono dati TypeScript tipizzati, non chiamate API.
- **Accessibilità e movimento.** `RevealDirective` anima l'ingresso con `IntersectionObserver` e si disattiva con `prefers-reduced-motion`; la griglia annuncia i cambi di lista agli screen reader; le immagini hanno `alt` descrittivi.
- **Font self-hosted** (Inter, Barlow Condensed, Caveat via Fontsource): nessuna richiesta a CDN esterne.
- **Build di produzione**: `npm run build` produce un sito statico; su Render viene servito come static site con un rewrite di `/api/*` verso l'API (vedi `../render.yaml`, deploy non ancora verificato).
