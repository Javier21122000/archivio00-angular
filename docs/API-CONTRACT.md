# Contratto API REST — ARCHIVIO 00

Fonte di verità condivisa da backend (`BACKEND/`, NestJS) e frontend (`FRONTEND/`, Angular).
Base URL: `http://localhost:3000/api`. In sviluppo il frontend chiama `/api` (same-origin) e il dev server inoltra a `:3000` (`proxy.conf.json`). CORS è comunque abilitato per `FRONTEND_ORIGIN` (default `http://localhost:4200`), con metodi `GET, POST, PUT, DELETE, OPTIONS` e header `Content-Type` e `Authorization`.

Formati: JSON, UTF-8. Gli ID sono UUID. I prezzi sono **number** nel JSON (la colonna `numeric` di PostgreSQL viene convertita da un transformer TypeORM). Date in ISO-8601.
Ruoli nel JSON e nel JWT: `"USER"`, `"ADMIN"` (un admin ha entrambi). Il frontend li normalizza in `ROLE_USER` / `ROLE_ADMIN` per le sue guard e i suoi template.

## Errori (uniformi, via exception filter globale)

```json
{ "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": { "prezzo": "prezzo must not be less than 0" } }
```

`details` è presente solo per gli errori di validazione (campo → primo messaggio violato). Codici:

| Codice | Quando |
|---|---|
| 400 | validazione fallita (body, query, `:id` non UUID, campi sconosciuti) e valori non accettati da PostgreSQL (es. byte NUL → `"Valore non valido"`) |
| 401 | non autenticato, credenziali errate (`"Credenziali non valide"`), token scaduto o firma errata |
| 403 | ruolo insufficiente |
| 404 | risorsa inesistente |
| 409 | duplicato (anche come rete di sicurezza sui vincoli UNIQUE in caso di richieste concorrenti: `"Elemento già presente"`) |
| 429 | troppe richieste su `/auth/login` e `/auth/register` (default 30/minuto per IP, configurabile con `AUTH_RATE_LIMIT`) |
| 500 | errore imprevisto: il dettaglio resta nei log, al client arriva solo `"Errore interno del server"` |

I messaggi funzionali sono in italiano (`"Oggetto non trovato"`, `"Nome e variante già presenti"`, `"Oggetto già preferito"`, `"Username o email già registrati"`, `"Credenziali non valide"`).

## Auth — pubblico

| Metodo | Percorso | Body | Risposta |
|---|---|---|---|
| POST | `/auth/register` | `{ username (≤80), email (≤160), password (8–100), firstName (≤80), lastName (≤80) }` | **201** `AuthResponse` (ruolo `USER`); 409 se username o email esistono già |
| POST | `/auth/login` | `{ email, password (≤100) }` | **200** `AuthResponse` |
| POST | `/auth/logout` | – | **204**, nessuna azione lato server (JWT stateless) |

```ts
AuthResponse = { token: string; user: { id; email; firstName; lastName; roles: string[] } }
```

- JWT HS256 firmato con `JWT_SECRET` (almeno 32 caratteri), scadenza `JWT_EXPIRES_IN` (default 24h). Claim: `sub` = id utente, `email`, `roles`. Header: `Authorization: Bearer <token>`.
- Le email sono salvate in minuscolo; login e unicità di email e username sono case-insensitive.
- Password con bcrypt. Il login esegue il confronto anche per email sconosciute (hash fittizio), così il tempo di risposta non rivela se un account esiste.
- Il token prova solo chi è l'utente: il ruolo e lo stato dell'account sono riletti dal database a ogni richiesta autenticata, quindi una revoca di ADMIN ha effetto immediato. Un utente disabilitato o cancellato viene trattato come non autenticato.

## Catalogo

### `GET /oggetti` — pubblico, JWT **opzionale**

Paginato e filtrato lato server.

Query (tutti opzionali):

| Parametro | Valori |
|---|---|
| `page` | intero ≥ 1 (default 1) |
| `limit` | 1–60 (default 12) |
| `q` | ricerca parziale case-insensitive su nome e variante, max 100 caratteri |
| `categoria` | `Denim`, `Pelle`, `Top & Camicie`, `Trackwear`, `Outerwear`, `Pantaloni`, `Scarpe` |
| `special` | `true` = solo Special Edition |
| `chiavi` | lista separata da virgole di `seedKey`, max 50 (usata dalle pagine leggenda) |
| `ordine` | `archivio` (default: in evidenza prima, poi più recenti), `prezzo-asc`, `prezzo-desc` |
| `soloBozze` | `true` = solo bozze; ha effetto solo per un admin, per gli altri è ignorato |

Ordinamento stabile: a parità di chiave si usano `createdAt` (più recenti prima) e infine `id`, così le pagine non si sovrappongono e non saltano elementi.

Risposta **200**:

```ts
{
  items: Prodotto[]          // DTO pubblico oppure admin, vedi sotto
  total: number              // elementi che corrispondono ai filtri
  page: number; limit: number; totalPages: number
  catalogCount: number       // capi visibili all'utente senza filtri (per "L'ARCHIVIO (28)")
}
```

- Visitatore o `USER`: solo `pubblicato = true`, **DTO pubblico**.
- `ADMIN`: bozze incluse, **DTO admin**.
- Un token non valido o scaduto su questa rotta equivale a un visitatore (non 401).

**DTO pubblico** (esattamente queste chiavi): `id, nome, prezzo, inEvidenza, immagineUrl, isSpecialEdition, rating, numeroRecensioni, categoria, variante`.
**DTO admin**: pubblico + `prezzoAcquisto, fornitore, pubblicato, createdAt`. Prezzo di acquisto e fornitore non escono mai verso visitatori o utenti.

### `GET /oggetti/statistiche` — solo ADMIN
`{ totale, pubblicati, bozze }` (pannello admin).

### `GET /oggetti/:id` — pubblico
DTO pubblico di un capo **pubblicato**; 404 altrimenti (anche per le bozze, per non rivelarne l'esistenza). `:id` non UUID → 400.

### `POST /oggetti` — ADMIN → **201** DTO admin
### `PUT /oggetti/:id` — ADMIN → **200** DTO admin
### `DELETE /oggetti/:id` — ADMIN → **204**

Body (`OggettoRequest`):

| Campo | Regola |
|---|---|
| `nome` | obbligatorio, ≤180 |
| `prezzo`, `prezzoAcquisto` | obbligatori, ≥0, ≤9999.99, max 2 decimali |
| `fornitore` | obbligatorio, ≤180 |
| `pubblicato`, `inEvidenza` | booleani, default `false` |
| `immagineUrl` | ≤500; solo percorso locale `/...` o URL http(s), altrimenti 400; vuoto → `/assets/products/unavailable.svg` |
| `isSpecialEdition` | booleano |
| `rating` | intero 0–5 |
| `numeroRecensioni` | intero ≥0 |
| `categoria` | `""` oppure una delle 7 categorie |
| `variante` | ≤80 |

Comportamento:
- I campi opzionali omessi in `PUT` **non** cancellano i metadati esistenti (aggiornamento parziale dei soli metadati di catalogo).
- `nome` + `variante` sono unici (case-insensitive): in conflitto → **409** `"Nome e variante già presenti"`.
- In creazione, se `categoria` è vuota o omessa viene dedotta dal nome (`deriveCategoria`).
- Campi sconosciuti nel body → 400 (whitelist + `forbidNonWhitelisted`).
- Creazione e modifica tengono allineato l'asset principale del capo (tabella `assets`); se l'immagine cambia, la sua `versione` sale.
- La cancellazione elimina anche preferiti e asset collegati (FK `ON DELETE CASCADE`).

## Preferiti — JWT richiesto (qualsiasi ruolo)

| Metodo | Percorso | Risposta |
|---|---|---|
| GET | `/preferiti` | **200** `Preferito[]` dal più recente (un solo SELECT con join, niente N+1); i capi tornati in bozza non compaiono |
| POST | `/preferiti/:oggettoId` | **201** `Preferito`; 404 se il capo non esiste o è bozza; 409 `"Oggetto già preferito"` |
| DELETE | `/preferiti/:oggettoId` | **204**; 404 `"Preferito non trovato"` |

`Preferito = { id, oggetto: DTO pubblico, createdAt }`. Ogni utente vede solo i propri preferiti: l'utente deriva dal token, mai dal path.

## Admin — ruolo ADMIN

| Metodo | Percorso | Risposta |
|---|---|---|
| POST | `/admin/utenti/:id/ruolo-admin` | **200** `UserResponse` con ADMIN aggiunto (idempotente) |
| DELETE | `/admin/utenti/:id/ruolo-admin` | **200** `UserResponse` con ADMIN rimosso (idempotente) |

`UserResponse = { id, email, firstName, lastName, roles: string[] }`. Un admin non può modificare il proprio ruolo (→ 400 `"Non puoi modificare il tuo stesso ruolo"`), così non si resta mai senza amministratori per distrazione. `:id` non UUID → 400; utente inesistente → 404 `"Utente non trovato"`.

## Sicurezza trasversale

- `helmet` attivo su tutte le risposte (header di sicurezza, niente `X-Powered-By`).
- Rate limit per IP su registrazione e login; con un proxy davanti (es. Render) si imposta `TRUST_PROXY` per leggere l'IP reale del client.
- Validazione globale con whitelist: ciò che non è dichiarato nei DTO viene rifiutato.

## Salute
`GET /health` (fuori da `/api`, pubblico): `{ status: "ok", database: "up" }`; esegue una query su PostgreSQL, quindi segnala anche un database irraggiungibile.
