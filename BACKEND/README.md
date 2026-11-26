# ARCHIVIO 00 - API

API REST di ARCHIVIO 00: catalogo, autenticazione, preferiti e gestione dei ruoli. NestJS 12, TypeORM e PostgreSQL, in TypeScript con moduli ES.

Il contratto completo (rotte, parametri, formato degli errori) è in [`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md); il quadro d'insieme è nel [README principale](../README.md).

## Requisiti

Node 22 o superiore e PostgreSQL.

## Avvio

```sh
cp .env.example .env       # imposta almeno DB_USER e JWT_SECRET (>= 32 caratteri)
npm ci
npm run db:setup           # applica le migration e il seed
npm run start:dev          # API su http://localhost:3000, con ricarica automatica
```

Controllo: `GET http://localhost:3000/health` risponde solo se anche il database è raggiungibile. Le rotte applicative stanno sotto `/api`.

## Script

| Comando | Cosa fa |
| --- | --- |
| `npm run start:dev` | avvio con watch |
| `npm run build` / `npm run start:prod` | compila in `dist/` e avvia `dist/main.js` |
| `npm run db:migrate` | applica le migration |
| `npm run db:migrate:revert` | annulla l'ultima migration |
| `npm run db:seed` | esegue il seed (idempotente) |
| `npm run db:setup` | migration + seed |
| `npm test` | test unitari (Vitest) |
| `npm run test:e2e` | test dell'API contro un PostgreSQL reale (`test/`) |
| `npm run lint` | oxlint con controllo dei tipi |

## Variabili d'ambiente

Validate all'avvio da `src/config/env.ts`: se un valore manca o è sbagliato l'app non parte e dice perché. Esempio in `.env.example` (il file `.env` non è versionato).

| Variabile | Default | Note |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `production`, `test` |
| `PORT` | `3000` | |
| `FRONTEND_ORIGIN` | `http://localhost:4200` | unica origine ammessa da CORS |
| `DATABASE_URL` | - | alternativa a `DB_*` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `localhost`, `5432`, utente di sistema, vuota, `archivio00_angular` | |
| `DB_SSL` | `false` | `true` sui database gestiti |
| `JWT_SECRET` | obbligatoria | almeno 32 caratteri; in produzione il segreto di esempio è rifiutato |
| `JWT_EXPIRES_IN` | `24h` | |
| `SEED_DEMO_USERS` | `true` fuori produzione | account dimostrativi, solo per lo sviluppo locale |
| `AUTH_RATE_LIMIT` | `30` | richieste al minuto per IP su login e registrazione |
| `TRUST_PROXY` | `0` | numero di proxy fidati (su Render: `1`) |

## Struttura

```text
src/
├── main.ts              bootstrap
├── app.setup.ts         helmet, prefisso /api, ValidationPipe, filtro errori, CORS
├── app.module.ts        modulo radice
├── config/              validazione dell'ambiente
├── common/              filtro eccezioni, trasformatore numerico, costanti di sicurezza
├── auth/                login, registrazione, JWT, guard, @Roles, @CurrentUser
├── utenti/              entity Utente e Role, UtentiService
├── oggetti/             catalogo: controller, service, mapper DTO, categorie, query
├── preferiti/           preferiti per utente
├── admin/               gestione del ruolo ADMIN
├── assets/              entity Asset (base per un futuro DAM)
├── health/              GET /health
└── database/
    ├── data-source.ts   unica definizione della connessione
    ├── migrations/      schema versionato
    ├── seed/            catalogo di partenza e seed idempotente
    └── run-migrations.ts, run-seed.ts
test/                    test e2e dell'API
```

## Come funziona, in breve

- **Una richiesta** attraversa helmet e CORS, i guard (JWT e ruoli), la `ValidationPipe`, il controller, il service e TypeORM. Qualsiasi errore passa dal filtro globale, che risponde sempre `{ statusCode, error, message, details? }`.
- **Schema.** `synchronize` è sempre `false`: il database cambia solo con le migration, elencate in `data-source.ts` (una migration non inserita nell'elenco non viene applicata). Indici trigramma (`pg_trgm`) su nome e variante rendono veloce la ricerca parziale.
- **Seed idempotente.** I capi hanno una `seed_key` stabile: rilanciare il seed non duplica né sovrascrive le modifiche di un admin. È sicuro eseguirlo a ogni avvio.
- **Autorizzazione.** Il JWT dice chi sei; i ruoli vengono riletti dal database a ogni richiesta, quindi la revoca di un admin è immediata.
- **Catalogo.** Filtri, ricerca, ordinamento e paginazione sono eseguiti da PostgreSQL con query parametrizzate; i visitatori vedono solo i capi pubblicati e un DTO senza dati riservati.

## Docker

`Dockerfile` e il profilo `backend` di `../docker-compose.yml` esistono, ma non sono mai stati eseguiti: Docker non è installato sulla macchina di sviluppo.
