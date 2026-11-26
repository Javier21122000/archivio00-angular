# Guida allo studio: Angular, NestJS e TypeORM su ARCHIVIO 00

Questa guida usa il codice di ARCHIVIO 00 come materiale di studio. Ogni concetto
rimanda a un file e a una riga reali, così puoi leggere la teoria e vederla subito
al lavoro in un'applicazione completa: catalogo con filtri lato server, preferiti,
autenticazione JWT, ruoli, area admin.

Come usarla:

1. Leggi il concetto e apri il file indicato (i numeri di riga sono quelli del codice attuale;
   se il file cambia, cerca il nome del simbolo).
2. Prova l'esercizio collegato.
3. Rispondi alle domande da colloquio senza guardare le risposte, poi confrontati.

Stack: Angular 22 (standalone, signals, build `@angular/build`), NestJS 12, TypeORM 1.x, PostgreSQL,
test con Vitest (unitari frontend e backend, e2e backend) e Playwright (e2e frontend).
Prima di tutto: `docs/ARCHITECTURE.md` descrive la mappa generale, `docs/API-CONTRACT.md` il contratto HTTP.

---

## Indice

1. [I 10 file da leggere in ordine](#1-i-10-file-da-leggere-in-ordine)
2. [Parte A, Angular](#2-parte-a-angular)
3. [Parte B, NestJS](#3-parte-b-nestjs)
4. [Parte C, TypeORM e PostgreSQL](#4-parte-c-typeorm-e-postgresql)
5. [Parte D, Sicurezza e JWT](#5-parte-d-sicurezza-e-jwt)
6. [Parte E, Test](#6-parte-e-test)
7. [Esercizi](#7-esercizi)
8. [Domande da colloquio](#8-domande-da-colloquio)
9. [Cosa non è stato verificato](#9-cosa-non-è-stato-verificato)

---

## 1. I 10 file da leggere in ordine

L'ordine segue il viaggio di una richiesta: dal browser all'API fino al database, e ritorno.

| # | File | Cosa impari |
|---|------|-------------|
| 1 | `FRONTEND/src/app/app.config.ts` | Come si configura un'app Angular standalone: router, HttpClient, interceptor. |
| 2 | `FRONTEND/src/app/app.routes.ts` | Rotte con `loadComponent` (lazy), `canActivate`, titoli di pagina. |
| 3 | `FRONTEND/src/app/core/services/auth.service.ts` | Stato con `signal` e `computed`, servizio `providedIn: 'root'`, `inject()`. |
| 4 | `FRONTEND/src/app/core/interceptors/auth.interceptor.ts` e `error.interceptor.ts` | Interceptor funzionali e ordine di esecuzione. |
| 5 | `FRONTEND/src/app/shared/product-grid.component.ts` | Il cuore del frontend: signal, `effect`, `linkedSignal`, `switchMap`, debounce, `@if`/`@for`. |
| 6 | `BACKEND/src/main.ts` e `BACKEND/src/app.setup.ts` | Avvio di Nest, pipe globale di validazione, filtro errori, Helmet, CORS. |
| 7 | `BACKEND/src/app.module.ts` e `BACKEND/src/auth/auth.module.ts` | Moduli, provider, `imports`/`exports`, `forRootAsync`. |
| 8 | `BACKEND/src/oggetti/oggetti.controller.ts` e `oggetti.service.ts` | Controller sottile, service con la logica, QueryBuilder, transazioni. |
| 9 | `BACKEND/src/oggetti/oggetto.entity.ts`, `preferiti/preferito.entity.ts` e `database/migrations/1764000000000-InitialSchema.ts` | Entity, relazioni, vincoli, migration. |
| 10 | `BACKEND/test/api.e2e-spec.ts` | Il comportamento dell'API raccontato dai test: permessi, validazione, token. |

Dopo questi dieci, leggi `FRONTEND/src/app/core/services/favorite.service.ts` (RxJS e signal insieme)
e `BACKEND/src/auth/session.service.ts` (perché i ruoli si rileggono dal database).

---

## 2. Parte A, Angular

### 2.1 Applicazione standalone e configurazione

Non ci sono `NgModule`: ogni componente dichiara le proprie dipendenze nell'array `imports`
e l'intera app si configura con un oggetto `ApplicationConfig`.

- `FRONTEND/src/app/app.config.ts:8-20` registra i provider globali: router (`provideRouter`),
  HTTP (`provideHttpClient`) e gestione errori globali del browser.
- `FRONTEND/src/main.ts` avvia l'app con `bootstrapApplication`.

Perché è fatto così: la configurazione è una lista di funzioni `provide...` e `with...`.
Ogni funzionalità la attivi solo se la dichiari, e il bundle contiene solo ciò che usi
(tree shaking efficace).

Due opzioni del router da notare, `app.config.ts:12-16`:

- `withInMemoryScrolling({ scrollPositionRestoration: 'top' })`: a ogni navigazione si riparte dall'alto della pagina.
- `withComponentInputBinding()`: i parametri di rotta (`:slug`) e i query param arrivano ai componenti
  come `input()`. Lo vedi in `FRONTEND/src/app/pages/legend.page.ts:97`, dove `slug = input<string>()` riceve
  il valore di `/leggenda/:slug` senza leggere `ActivatedRoute`.

### 2.2 Iniezione delle dipendenze con `inject()`

Angular costruisce le istanze e le consegna a chi le chiede. Il modo moderno è la funzione `inject()`,
usata come inizializzatore di campo:

```ts
private readonly http = inject(HttpClient);
```

Esempi: `auth.service.ts:23`, `product.service.ts:9`, `favorite.service.ts:10-11`.

Vantaggi rispetto al costruttore con parametri: funziona anche nelle funzioni (interceptor, guard),
non obbliga a ripetere i tipi nelle sottoclassi e si legge in una riga.

`@Injectable({ providedIn: 'root' })` crea un'unica istanza condivisa in tutta l'app e permette
di eliminare dal bundle i servizi mai usati. Gli stessi servizi (`AuthService`, `UiService`, `ProductService`)
sono quindi il punto in cui vive lo stato condiviso.

### 2.3 Signal, computed, effect

Un `signal` è un contenitore di valore che notifica chi lo legge quando cambia.

```ts
readonly user = signal<User | null>(null);                       // auth.service.ts:25
readonly isAdmin = computed(() => this.roles().includes('ROLE_ADMIN'));  // auth.service.ts:28
```

- Si legge chiamandolo come funzione: `this.user()`.
- Si scrive con `set()` oppure `update(fn)`: `auth.service.ts:48-49`, `favorite.service.ts:84`.
- `computed` deriva un valore da altri signal ed è pigro e memorizzato: ricalcola solo se una dipendenza cambia.
  Vedi la catena `user` -> `roles` -> `isAdmin` -> `level` in `auth.service.ts:25-30`.
- Regola utile: ciò che puoi calcolare, calcolalo con `computed` invece di tenerlo in un secondo signal
  da sincronizzare a mano. In `product-grid.component.ts:172-178` `hasMore`, `hasCatalog`, `countLabel`
  e `footnote` sono tutti derivati.

`effect` esegue un effetto collaterale quando cambiano i signal che legge. Va usato poco: serve per
sincronizzare con il mondo esterno, non per derivare dati. Due usi reali:

- `product-grid.component.ts:209-215`: quando cambia query, token o numero di capi per pagina, richiede la prima pagina.
- `favorite.service.ts:48-56`: quando cambia il token (login, logout, scadenza) svuota i preferiti e li ricarica.

`untracked(() => ...)` dentro l'effect (stessi punti) serve a *non* registrare come dipendenza ciò che
si legge o si scrive dentro: senza, l'effect scriverebbe su signal che lui stesso legge e si riattiverebbe in loop.

`linkedSignal` è un signal scrivibile che si riallinea quando cambia la sua sorgente:
`product-grid.component.ts:152`. La categoria parte da `initialCategory()`; l'utente può cambiarla
cliccando una tab (`category.set(item)`), ma se l'URL cambia `?categoria=` il valore si ricalcola.
Un `computed` non andrebbe bene perché è di sola lettura; un semplice `signal` non seguirebbe l'input.

### 2.4 Input e output basati su funzioni

- `input()`, `input.required<T>()`: `product-grid.component.ts:145-146`, `legend-backdrop.component.ts:32-33`.
  Sono signal di sola lettura: nei template e nei `computed` si leggono con `()`.
- `output<T>()` e `.emit()`: `create-product.component.ts:65` e `:90`.
- `input` con alias: `reveal.directive.ts:14` espone `delay` come `appRevealDelay` nel template.

Attenzione, lo dice anche il commento a `create-product.component.ts:78`: il valore di un `input()` non è
disponibile nel costruttore, ma solo da `ngOnInit` in poi (o dentro `computed`/`effect`).

### 2.5 Change detection OnPush

Tutti i componenti dichiarano `changeDetection: ChangeDetectionStrategy.OnPush`
(per esempio `catalog.page.ts:18`, `product-grid.component.ts:30`, `legend-backdrop.component.ts:15`).

Con OnPush Angular ricontrolla il template solo quando cambia un signal letto nel template (o un input,
o scatta un evento del componente). Il risultato è un'app prevedibile: se lo stato è tutto in signal,
l'interfaccia si aggiorna esattamente quando serve e non c'è bisogno di chiamare nulla a mano.

### 2.6 Template con control flow integrato

`@if`, `@else if`, `@else`, `@for ... track` e `@switch` sono sintassi del template, senza importare direttive.

- `product-grid.component.ts:54`: `@for (item of categories; track item)`. `track` è obbligatorio:
  dice ad Angular come riconoscere un elemento tra un render e l'altro, per riusare il DOM.
- `product-grid.component.ts:93-128`: la catena `@if (loading()) ... @else if (error()) ... @else if (items().length) ... @else`
  copre in modo esplicito ogni stato della lista (caricamento, errore, dati, vuoto). Quando progetti
  una schermata che carica dati, elenca sempre questi quattro stati.
- `@if (clip(); as src)`: `legend-backdrop.component.ts:18` assegna il risultato a una variabile locale.

### 2.7 Route lazy, guard funzionali, titoli

`app.routes.ts:6-13`:

```ts
{ path: 'catalogo', title: '...', loadComponent: () => import('./pages/catalog.page').then(m => m.CatalogPage) }
```

`loadComponent` con `import()` dinamico crea un chunk separato per pagina: il browser lo scarica solo
quando l'utente la visita. `title` imposta il titolo del documento a ogni navigazione.

Il guard è una semplice funzione, `core/guards/admin.guard.ts:6-9`:

```ts
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/']);
};
```

Restituire un `UrlTree` invece di fare una navigazione manuale è il modo corretto per reindirizzare:
il router gestisce cronologia e annullamento. Nota il commento nel file: il guard è solo comodità
di interfaccia. La vera protezione sta nel backend (vedi Parte D), perché chiunque può manipolare il codice nel browser.

### 2.8 Interceptor HTTP funzionali

`core/interceptors/auth.interceptor.ts:6-10` aggiunge `Authorization: Bearer <token>` clonando la richiesta
(le richieste sono immutabili, quindi `req.clone({ setHeaders })`). Esclude `/auth/`: login e registrazione non hanno token.

`core/interceptors/error.interceptor.ts:7-17` intercetta la risposta con `catchError`: un 401 fuori da `/auth/`
significa sessione scaduta, quindi chiama `auth.clearSession()`; poi rilancia l'errore con `throwError`
perché lo gestisca anche chi ha fatto la chiamata.

L'ordine in `app.config.ts:18` conta: `withInterceptors([authInterceptor, errorInterceptor])`.
Nella richiesta si attraversano nell'ordine dichiarato; nella risposta nell'ordine inverso.

Test: `core/interceptors/interceptors.spec.ts` verifica i quattro casi (con token, senza token su `/auth/`,
401 normale, 401 su `/auth/`).

### 2.9 RxJS: quando serve e quando bastano i signal

I signal gestiscono lo *stato*. RxJS resta lo strumento giusto per i *flussi nel tempo*: richieste HTTP,
debounce, cancellazione. In questo progetto convivono, con un confine chiaro:

- Debounce della ricerca, `product-grid.component.ts:204-206`:
  `toObservable(this.searchInput).pipe(debounceTime(300), takeUntilDestroyed(destroyRef))`.
  Il campo di testo scrive subito in un signal (l'interfaccia è reattiva), il server viene interrogato dopo 300 ms di pausa.
- `switchMap`, `product-grid.component.ts:196-199`: ogni nuova richiesta di caricamento annulla la precedente.
  Lo prova il test `product-grid.component.spec.ts:62`: `expect(first.cancelled).toBe(true)`.
  Senza `switchMap` una risposta lenta e vecchia potrebbe arrivare dopo quella nuova e mostrare dati sbagliati.
- `catchError` che restituisce `EMPTY`, `product-grid.component.ts:273-284`: l'errore viene messo nello stato (signal `error`)
  e lo stream principale resta vivo. Se l'errore uscisse dallo stream, il `switchMap` si chiuderebbe e i filtri successivi non farebbero più nulla.
- `takeUntilDestroyed(destroyRef)`: `product-grid.component.ts:199, 205, 218`. Chiude la sottoscrizione quando il componente viene distrutto.
- `Subject` come "campanello": `product.service.ts:10-13`. `changes$` emette dopo ogni creazione, modifica o eliminazione,
  e la griglia lo ascolta (`product-grid.component.ts:218`) per ricaricarsi senza che i componenti si conoscano.
- `toSignal`: `catalog.page.ts:22-25` converte i query param (un Observable) in un signal con `initialValue`.
- `rxResource`: `legend.page.ts:106-109` carica i capi della leggenda. Quando cambia `slug` annulla la richiesta in volo
  e rilancia; espone `value()`, `error()`, `hasValue()`, `reload()`, usati nel template (`legend.page.ts:60-67`).

Una regola pratica: dati che arrivano una volta e si mostrano, `rxResource` o `toSignal`; flussi con
debounce/cancellazione/combinazioni, RxJS con il risultato scritto in un signal.

### 2.10 Il pattern "preferiti" come caso di studio

`core/services/favorite.service.ts` mette insieme quasi tutto:

- Un `Subject` (`loadRequests`, riga 12) alimenta un `switchMap` (riga 24): più richieste di caricamento ravvicinate collassano in una sola.
- L'`effect` (riga 48) risponde al cambio di token: dopo un logout i preferiti dell'utente precedente spariscono subito.
- `pendingIds` (riga 16) è un signal con gli id in corso: `toggle` (riga 67) ignora il secondo click su un capo già in attesa.
- `sameSession` (riga 74): se nel frattempo l'utente è cambiato, la risposta in arrivo non tocca lo stato del nuovo utente.
- `ignoreElements()` e `finalize()` (righe 89-94): `toggle` non emette valori, si completa a fine chiamata e libera sempre `pendingIds`.

Leggilo con calma: ogni riga risolve un problema reale di concorrenza lato client.

### 2.11 Form reattivi tipizzati

`pages/admin/create-product.component.ts:71-76`:

```ts
protected readonly form = new FormGroup({
  nome: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
  prezzo: new FormControl<number | null>(null, priceValidators),
  ...
});
```

- `nonNullable: true` evita che `reset()` riporti il campo a `null` e dà tipi più precisi (`string` e non `string | null`).
- Un validatore personalizzato è una funzione che restituisce `null` (valido) o un oggetto errore:
  `twoDecimals`, `create-product.component.ts:11-15`. Lavora in centesimi (`Math.round(value * 100)`) per non
  inciampare nei decimali in virgola mobile.
- `form.getRawValue()` (riga 100) restituisce i valori tipizzati; `markAllAsTouched()` (riga 96) fa comparire gli errori su tutti i campi.
- Validazione lato client e lato server si completano: gli stessi limiti (0 a 9999,99, due decimali, 180 caratteri)
  sono nel DTO del backend (`BACKEND/src/oggetti/dto/oggetto-request.dto.ts:12-19`). Il client migliora l'esperienza, il server è l'unico garante.

### 2.12 Pipe, direttive e API del browser

- Pipe pura: `shared/euro.pipe.ts` formatta i prezzi nei template con `{{ prezzo | euro }}`. Delega a `core/util/euro.ts`,
  una funzione semplice e testata (`euro.spec.ts`): la logica sta in una funzione, la pipe è solo il ponte con il template.
- Direttiva attributo: `shared/reveal.directive.ts` anima l'ingresso nel viewport con `IntersectionObserver`.
  Rispetta `prefers-reduced-motion` (riga 17), si disconnette dopo la prima volta (riga 25) e in `ngOnDestroy` (riga 33).
- Elemento `<dialog>` nativo: `shared/modal.component.ts` usa `viewChild.required` (riga 44) e `showModal()` (riga 52)
  per ottenere focus trap e tasto Esc dal browser invece di reimplementarli.
- Accessibilità: la griglia ha un'area `role="status" aria-live="polite"` (`product-grid.component.ts:131`)
  che annuncia ai lettori di schermo quando la lista cresce.

### 2.13 Funzioni pure per la logica

Tutto ciò che si può testare senza Angular sta in `core/util/`: `catalog-query.ts` (traduzione categoria in parametri,
`appendUnique` per evitare id duplicati nel `@for`, ritardi di comparsa), `api-error.ts` (da errore HTTP a messaggio italiano),
`euro.ts`. I componenti restano sottili e i test di queste funzioni sono immediati (`*.spec.ts` accanto a ciascuna).

---

## 3. Parte B, NestJS

### 3.1 Moduli, provider e iniezione

Un modulo raggruppa controller e provider. `BACKEND/src/app.module.ts:12-35` è la radice:
importa `ConfigModule`, `TypeOrmModule` e i moduli di funzionalità (`AuthModule`, `OggettiModule`, `PreferitiModule`, `AdminModule`, `HealthModule`).

Concetti chiave:

- `providers`: ciò che Nest sa istanziare (servizi, guard).
- `exports`: ciò che altri moduli possono usare. In `auth/auth.module.ts:31` si esportano `JwtAuthGuard`, `RolesGuard` e `SessionService`:
  gli altri moduli importano `AuthModule` (`oggetti/oggetti.module.ts:9`) per usare i guard nei propri controller.
- `forRootAsync` / `registerAsync` con `inject: [ConfigService]` e `useFactory`: la configurazione dipende da altri provider (`app.module.ts:15-27`, `auth.module.ts:20-26`).
  Così il segreto JWT e i dati del database arrivano dall'ambiente validato.
- Costruttore con modificatori `private readonly`: è l'iniezione di Nest (`oggetti.controller.ts:11`, `auth.service.ts:19-22`).
  Il tipo del parametro è il token di iniezione.
- `@InjectRepository(Oggetto)` (`oggetti.service.ts:23`): il repository TypeORM di un'entity è un provider registrato da `TypeOrmModule.forFeature([Oggetto])`.

### 3.2 Controller sottili, service con la logica

`oggetti/oggetti.controller.ts` fa tre cose: dichiara rotta e permessi, estrae i dati dalla richiesta
(`@Query`, `@Param`, `@Body`), chiama il service. Nessuna logica di business. Tutto ciò che decide
(filtri, duplicati, transazioni) è in `oggetti.service.ts`, testabile senza HTTP.

Dettagli da notare:

- Ordine delle rotte, `oggetti.controller.ts:20-28`: `statistiche` va dichiarata prima di `:id`, altrimenti la stringa "statistiche" verrebbe letta come id. È un classico errore.
- `@HttpCode(HttpStatus.NO_CONTENT)` (riga 50): il DELETE risponde 204 senza corpo.
- `ParseUUIDPipe` (righe 29, 43, 51): un id che non è un UUID produce 400 prima di arrivare al service, e al database non arriva mai un valore che causerebbe un errore di tipo.

### 3.3 Validazione con DTO, `class-validator` e `ValidationPipe`

I DTO sono classi con decoratori: `oggetti/dto/oggetto-request.dto.ts`, `lista-oggetti.query.ts`, `auth/dto/auth.dto.ts`.

La pipe globale è configurata in `app.setup.ts:27-35`:

- `whitelist: true`: elimina i campi non dichiarati.
- `forbidNonWhitelisted: true`: li rifiuta con 400 (un client non può "contrabbandare" campi extra; test `api.e2e-spec.ts:122`).
- `transform: true`: converte i tipi (la stringa `"12"` del query string diventa numero grazie a `@Type(() => Number)`, `lista-oggetti.query.ts:12`).
- `exceptionFactory`: costruisce l'errore nel formato del contratto, con `details` per campo.

`@Transform` normalizza prima di validare: `trim` (`oggetto-request.dto.ts:5`), email in minuscolo (`auth.dto.ts:5`).
Il filtro `chiavi=a,b,c` diventa un array con un `@Transform` (`lista-oggetti.query.ts:32`) ed è limitato con `@ArrayMaxSize(50)`.

Un campo di URL immagine è vincolato da una regex (`oggetto-request.dto.ts:28`): ammette percorsi locali o `http(s)`,
nessun `javascript:` o `data:`. Il validatore è un confine di sicurezza, non solo di forma.

### 3.4 Guard, decoratori e metadati

I guard decidono se la richiesta può proseguire. In `auth/`:

- `JwtAuthGuard` (`jwt-auth.guard.ts:9-20`): chiede a `SessionService` di risolvere l'utente; se manca risponde 401, altrimenti mette `request.user`.
- `OptionalJwtAuthGuard` (`jwt-auth.guard.ts:23-33`): non rifiuta mai. Serve a `GET /oggetti`, che è pubblica ma mostra bozze e costi se chi chiede è admin.
- `RolesGuard` (`roles.guard.ts:10-23`) legge i ruoli richiesti con `Reflector` dai metadati impostati dal decoratore `@Roles('ADMIN')` (`roles.guard.ts:8`, basato su `SetMetadata`).
  Se manca il ruolo risponde 403.
- Combinazione: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')` (`oggetti.controller.ts:33-35`). L'ordine conta: prima l'identità (401), poi il permesso (403).
- A livello di classe: `admin/admin.module.ts:9-12` protegge l'intero controller con un solo gruppo di decoratori.
- Decoratore di parametro personalizzato: `@CurrentUser()` (`auth/current-user.decorator.ts`) estrae l'utente dalla richiesta; lo usa `admin.module.ts:18`.

### 3.5 Filtro delle eccezioni e formato degli errori

`common/all-exceptions.filter.ts` con `@Catch()` intercetta ogni errore e risponde sempre con `{ statusCode, error, message, details? }`:

- le `HttpException` mantengono il loro stato;
- l'errore PostgreSQL `23505` (violazione di UNIQUE) diventa 409: è la rete di sicurezza per le richieste concorrenti che superano il controllo applicativo dei duplicati;
- la classe `22` (dati non validi per il tipo di colonna) diventa 400;
- tutto il resto diventa 500 con messaggio generico, e lo stack va solo nei log: il client non vede mai dettagli interni.

Il frontend lo sfrutta: `core/util/api-error.ts` mostra all'utente i messaggi del server solo sotto il 500.

### 3.6 Configurazione validata all'avvio

`config/env.ts:30-72` (`validateEnv`) controlla le variabili d'ambiente prima che l'app parta: segreto JWT di almeno 32 caratteri,
nessun segreto di esempio in produzione, porte e `NODE_ENV` validi. Un errore blocca subito l'avvio con un messaggio chiaro invece di
manifestarsi alla prima richiesta. Il seed degli account dimostrativi è spento di default in produzione (riga 68).
Test: `config/env.spec.ts`.

### 3.7 Avvio e configurazione condivisa

`main.ts` crea l'app e chiama `configureApp` (`app.setup.ts:21`), una funzione condivisa con i test e2e: così i test passano per la stessa pipeline
di validazione, errori, prefisso `/api`, CORS e Helmet della produzione. `app.setGlobalPrefix('api', { exclude: ['health'] })` lascia la rotta di
health fuori dal prefisso. `enableShutdownHooks()` chiude pulitamente le connessioni all'arresto.

---

## 4. Parte C, TypeORM e PostgreSQL

### 4.1 Entity

Un'entity è una classe mappata su una tabella: `oggetti/oggetto.entity.ts`.

- `@PrimaryGeneratedColumn('uuid')`: chiave primaria generata dal database (riga 13).
- `@Column({ name: 'prezzo_acquisto', ... })`: nelle colonne il nome SQL è in `snake_case`, nel codice in `camelCase`.
- Colonne con default, `nullable` e `unique` (`seedKey`, riga 50): la chiave stabile del seed permette di rilanciarlo senza duplicare né sovrascrivere le modifiche degli admin.
- `numeric(6,2)` con `numericTransformer` (`common/numeric.transformer.ts`): PostgreSQL restituisce i `numeric` come stringhe per non perdere precisione;
  il transformer li converte in `number` in lettura. Per i prezzi si usa `numeric` e non `float`.
- Tipo `Relation<...>` (`oggetto.entity.ts:61`, `utente.entity.ts:35`): evita problemi di riferimenti circolari tra moduli ESM.

### 4.2 Relazioni

- Uno a molti: `Oggetto.assets` (`oggetto.entity.ts:60`) verso `Asset.oggetto`.
- Molti a uno con cascata: `Preferito.utente` e `Preferito.oggetto` (`preferito.entity.ts:14-23`) con `onDelete: 'CASCADE'`:
  eliminando un capo o un utente, i preferiti collegati spariscono dal database. Il test `api.e2e-spec.ts:338` lo verifica.
- Molti a molti con tabella ponte: `Utente.roles` (`utente.entity.ts:29-35`) usa `@JoinTable` con i nomi delle colonne; `eager: true` carica i ruoli insieme all'utente.
- Vincolo composito: `@Unique('uk_preferito_utente_oggetto', ['utenteId', 'oggettoId'])` (`preferito.entity.ts:6`): un utente non può avere lo stesso capo due volte, nemmeno con due richieste simultanee.
- Colonna chiave esterna *e* relazione sulla stessa colonna (`utenteId` + `utente`, `preferito.entity.ts:11-16`): permette di filtrare per id senza caricare l'oggetto collegato.

### 4.3 Repository e QueryBuilder

I metodi semplici del repository bastano per le operazioni singole: `findOneBy`, `countBy`, `existsBy`, `delete`
(`oggetti.service.ts:50, 63, 68, 124`; `preferiti.service.ts:36, 43`). Il `delete` restituisce `affected`: se è 0 l'elemento non esisteva, e si risponde 404.

Il `QueryBuilder` serve per le query composte, `oggetti.service.ts:28-60`, il pezzo più istruttivo del backend:

- Condizioni aggiunte solo se il filtro è presente (`andWhere`), con parametri nominati (`:categoria`, `:...chiavi` per la lista).
  I valori non finiscono mai concatenati nell'SQL: i parametri sono legati dal driver, quindi niente SQL injection.
- Ricerca con `ILIKE` e `escapeLike` (`categorie.ts`): `%`, `_` e `\` digitati dall'utente diventano caratteri letterali, non jolly. Test: `categorie.spec.ts:17` e `api.e2e-spec.ts:226`.
- Ordinamento stabile (riga 42 e 46): `addOrderBy('o.id', 'ASC')` chiude sempre l'ordinamento. Senza uno spareggio deterministico, due capi con lo stesso prezzo
  potrebbero cambiare posizione tra una pagina e l'altra e comparire due volte o mai.
- Paginazione lato server: `skip/take` e `getManyAndCount()` (righe 48-49) restituiscono pagina e totale con due query coordinate.
- DTO pubblico e DTO admin distinti (`oggetti/oggetti.mapper.ts`): `toPublic` elenca esplicitamente i campi, così una colonna riservata
  (`prezzoAcquisto`, `fornitore`) non esce per errore. Il test `api.e2e-spec.ts:149` verifica che le chiavi siano esattamente quelle attese.

Join esplicita: `preferiti.service.ts:22-31` usa `innerJoinAndSelect('p.oggetto', 'o')` per leggere preferiti e capi con un'unica `SELECT`.
Senza il join si farebbe una query in più per ogni preferito (problema N+1).

### 4.4 Transazioni

`oggetti.service.ts:76-95` e `102-119` usano `dataSource.transaction(async (em) => ...)`: capo e asset principale si salvano insieme o per niente.
Dentro la callback si usa `em` (l'entity manager della transazione), mai il repository normale, altrimenti le query uscirebbero dalla transazione.

`allineaAssetPrincipale` (riga 146) mantiene coerente l'asset principale con `immagineUrl` e incrementa `versione` solo quando l'immagine cambia (test: `api.e2e-spec.ts:325`).

### 4.5 Migration

Lo schema cambia solo tramite migration versionate: in `database/data-source.ts:26-27` `synchronize: false` e `migrationsRun: false`.
Perché: la sincronizzazione automatica può cancellare colonne o dati senza avvisare. Con una migration lo schema è esplicito, rivedibile in una pull request e riproducibile.

- `database/migrations/1764000000000-InitialSchema.ts`: crea le tabelle in SQL, con `up`. Contiene scelte da studiare:
  `CHECK` sui valori (prezzo >= 0, rating tra 0 e 5), indici univoci su `lower(email)` e `lower(username)` per l'unicità senza distinzione di maiuscole,
  estensione `pg_trgm` per accelerare le ricerche `ILIKE '%testo%'`.
- Comandi (`BACKEND/package.json`): `npm run db:migrate`, `db:migrate:revert`, `db:seed`, `db:setup`.
- `data-source.ts` è l'unica definizione della connessione, usata sia da Nest sia dagli script. Supporta `DATABASE_URL` (utile sui servizi in cloud) oppure host/porta/utente separati.
- `seed/seed.service.ts` è idempotente: ruoli e utenti si creano solo se mancano, i capi si riconoscono dalla `seed_key`.

---

## 5. Parte D, Sicurezza e JWT

Tutte le misure sono nel codice, verificabili:

| Misura | Dove | Perché |
|--------|------|--------|
| Password con hash `bcryptjs` (10 round) | `auth/auth.service.ts:28`, `common/security.ts` | Mai password in chiaro. Il test `auth.service.spec.ts:43` lo controlla. |
| Confronto con hash fittizio per utenti sconosciuti | `auth.service.ts:15, 37` | Il tempo di risposta non rivela se un'email esiste. |
| Stesso errore 401 per password errata, utente inesistente o disabilitato | `auth.service.ts:38` | Niente enumerazione degli account. Test `api.e2e-spec.ts:136`. |
| JWT firmato HS256, algoritmo fissato in verifica | `auth.module.ts:24`, `session.service.ts:23` | Un token con `alg: none` o firmato con un altro segreto viene rifiutato (`api.e2e-spec.ts:473-490`). |
| Ruoli riletti dal database a ogni richiesta | `auth/session.service.ts:19-30` | Il token prova *chi sei*; se un admin perde il ruolo, l'effetto è immediato. Test `api.e2e-spec.ts:457`. |
| Rate limit su login e registrazione | `auth.controller.ts:6-9`, `auth.module.ts:16-19` | Frena il brute force. Limite per IP configurabile (`AUTH_RATE_LIMIT`). Test `test/rate-limit.e2e-spec.ts`. |
| Helmet | `app.setup.ts:23` | Header di sicurezza e niente `X-Powered-By`. |
| CORS ristretto | `app.setup.ts:37-41` | Solo l'origine del frontend, metodi e header necessari. |
| Whitelist dei campi + validazione | `app.setup.ts:27-35` | Campi sconosciuti rifiutati, limiti su lunghezze e numeri. |
| Segreto validato all'avvio | `config/env.ts:48-52` | Almeno 32 caratteri, niente segreto di esempio in produzione. |
| Un admin non può cambiare il proprio ruolo | `utenti/utenti.service.ts:57` | Evita di restare senza amministratori per errore. Test `api.e2e-spec.ts:440`. |
| DTO pubblico senza dati riservati | `oggetti/oggetti.mapper.ts` | Costi e fornitori non escono mai verso i visitatori. |
| Query parametrizzate e `escapeLike` | `oggetti.service.ts` | Niente SQL injection e niente jolly involontari. |
| URL immagine limitato a percorsi locali o http(s) | `oggetto-request.dto.ts:28` | Niente `javascript:` o `data:`. |
| Sessione solo in memoria nel frontend | `core/services/auth.service.ts:17-20` | Nessun token in `localStorage` esposto a script malevoli; a ogni ricarica si riparte da visitatore. |

Flusso completo di un login, da seguire con gli occhi nel codice:

1. `FRONTEND/.../auth-modal.component.ts` chiama `AuthService.login()` (`auth.service.ts:32`), che fa `POST /api/auth/login`.
2. `AuthController.login` (`auth.controller.ts:17`) è protetto da `ThrottlerGuard`, la pipe valida `LoginDto`.
3. `AuthService.login` (backend, riga 35) cerca l'utente, confronta con bcrypt, firma il JWT (`risposta`, riga 42) con `sub`, `email`, `roles`.
4. Il frontend riceve `{ token, user }` e chiama `setSession` (`auth.service.ts:47`): i signal cambiano.
5. `authInterceptor` ora aggiunge il Bearer a ogni richiesta; `FavoriteService` reagisce al cambio di token con il suo `effect` e carica i preferiti.
6. Lato server `JwtAuthGuard` -> `SessionService.risolvi` verifica la firma e rilegge utente e ruoli dal database.

Limite onesto da conoscere: il JWT è stateless, quindi il logout (`auth.controller.ts:24`) è un'azione senza effetto sul server; il token resta valido
fino alla scadenza (`JWT_EXPIRES_IN`, 24h di default). La mitigazione è la rilettura dello stato utente a ogni richiesta (un utente disabilitato viene rifiutato subito).

---

## 6. Parte E, Test

- **Unitari frontend** (`ng test`, Vitest): accanto ai file, `*.spec.ts`. Esempi da leggere:
  - `core/guards/admin.guard.spec.ts`: un guard funzionale si prova con `TestBed.runInInjectionContext`.
  - `core/interceptors/interceptors.spec.ts`: `provideHttpClientTesting` e `HttpTestingController` per ispezionare e rispondere alle richieste.
  - `shared/product-grid.component.spec.ts`: test di componente con richieste simulate; verifica la cancellazione con `switchMap` (riga 62),
    il debounce di 300 ms (riga 132), "Mostra altri" senza richieste doppie (riga 86) e gli stati di errore (righe 109 e 120).
  - `core/util/*.spec.ts`: funzioni pure, i test più semplici e veloci.
- **Unitari backend** (`npm test`, Vitest): `auth/auth.service.spec.ts`, `config/env.spec.ts`, `oggetti/categorie.spec.ts`.
- **E2E backend** (`npm run test:e2e`): `BACKEND/test/api.e2e-spec.ts` avvia l'applicazione Nest vera con `supertest` e un database PostgreSQL dedicato.
  Per sicurezza si rifiuta di partire se `DB_NAME` non termina con `_test` o se è impostato `DATABASE_URL` (stessa guardia in `rate-limit.e2e-spec.ts:13`).
  Il file è la documentazione più completa dell'API: permessi (anonimo 401, USER 403, ADMIN ok), validazione, duplicati, cascata, sicurezza dei token.
- **E2E frontend** (`npm run e2e`, Playwright): cartella `FRONTEND/e2e`. Gli account usati sono quelli dimostrativi del seed (`e2e/helpers.ts`).
  Richiedono backend e database attivi.

Buona abitudine che il progetto applica: un test per ogni regola di sicurezza (il bug è sempre nel caso che non hai provato).

---

## 7. Esercizi

Ordinati per difficoltà. Per ciascuno, scrivi prima il test che deve fallire.

1. **(Angular, signal)** Aggiungi in `UiService` un signal `menuOpen` e un `computed` che dica se è aperto un qualsiasi overlay (modale, drawer o menu). Scrivi il test accanto a `ui.service.spec.ts`.
2. **(Angular, pipe)** Crea una pipe pura `pad2` che usi `pad2` di `core/util/catalog-query.ts`, e usala nel template al posto delle chiamate dirette dove serve. Perché una pipe pura è preferibile a una funzione chiamata nel template?
3. **(Angular, route)** Aggiungi una rotta `/info` lazy con titolo e un componente minimo `OnPush`. Controlla nel build che compaia un chunk separato.
4. **(Angular, RxJS)** In `product-grid.component.ts` il debounce è 300 ms. Estrai il valore in una costante nominata e spiega in un commento perché 300 e non 0 né 2000. Poi aggiungi `distinctUntilChanged()` e verifica col test che digitare e cancellare lo stesso testo non produca una richiesta inutile.
5. **(Angular, form)** Aggiungi al form di `create-product.component.ts` un campo facoltativo `variante` (massimo 80 caratteri, come nel DTO) e invialo a `ProductService.create`.
6. **(Angular, interceptor)** Scrivi un `loggingInterceptor` che misuri la durata delle richieste con `tap` e `finalize`. Registrarlo prima o dopo `errorInterceptor` cambia qualcosa? Dimostralo con un test.
7. **(Nest, DTO)** Aggiungi `GET /oggetti?prezzoMax=` con validazione (`@Type(() => Number)`, `@Min(0)`), filtro nel QueryBuilder e un test e2e che verifica anche il 400 per un valore negativo.
8. **(Nest, guard)** Scrivi un decoratore `@Public()` e fai in modo che `JwtAuthGuard` lasci passare le rotte che lo hanno (usa `Reflector` come `RolesGuard`).
9. **(TypeORM, migration)** Aggiungi alla tabella `oggetti` una colonna `taglia varchar(10)` con una nuova migration (non modificare quella esistente), aggiorna l'entity, il DTO e il mapper. Esegui `db:migrate` e poi `db:migrate:revert`: la `down` funziona?
10. **(TypeORM, performance)** Attiva il log delle query in sviluppo e confronta `lista` dei preferiti con una versione senza join (carica i capi uno per uno). Conta le query: è il problema N+1 dal vivo.
11. **(Sicurezza)** Scrivi un test e2e che dimostri che un utente non può leggere la bozza di un capo per id (`GET /oggetti/:id` risponde 404). Poi spiega perché è 404 e non 403.
12. **(Progettazione)** Il logout non invalida il token. Disegna (a parole o in un diagramma) due modi per farlo: una lista di token revocati e un `tokenVersion` sull'utente. Quale costo introduce ciascuno rispetto alla rilettura dello stato a ogni richiesta?

---

## 8. Domande da colloquio

Le risposte fanno riferimento a quanto implementato qui.

**1. Che cos'è un signal e in cosa differisce da una variabile normale?**
È un contenitore reattivo: chi lo legge in un template, un `computed` o un `effect` viene notificato quando il valore cambia, senza `subscribe` né pipe. Una variabile normale non
notifica nessuno. In `auth.service.ts` lo stato di sessione è in signal e la navbar, il guard e la griglia reagiscono da soli.

**2. Quando usare `computed` e quando `effect`?**
`computed` per *derivare* un valore (puro, memorizzato, senza effetti collaterali): `isAdmin`, `hasMore`, `footnote`. `effect` per eseguire un'azione verso l'esterno quando qualcosa cambia:
ricaricare i dati al cambio del token. Se scrivi un `effect` che calcola un valore e lo mette in un altro signal, quasi sempre doveva essere un `computed` o un `linkedSignal`.

**3. Perché `untracked` dentro un `effect`?**
Per evitare che l'effect dipenda da ciò che legge solo di passaggio. In `favorite.service.ts:48-56` l'effect deve reagire solo al token; le scritture sugli altri signal vanno isolate, altrimenti
creerebbero dipendenze indesiderate e potenziali cicli.

**4. Cosa fa `ChangeDetectionStrategy.OnPush` e perché usarlo con i signal?**
Il componente viene ricontrollato solo se cambia un input, scatta un suo evento o cambia un signal letto nel template. Con lo stato in signal è sufficiente, e riduce i controlli inutili.

**5. Differenza fra `signal`, `linkedSignal` e `computed`.**
`computed` è derivato e di sola lettura. `signal` è scrivibile e indipendente. `linkedSignal` è scrivibile ma si riallinea alla sorgente quando questa cambia: la categoria della griglia
parte dall'URL, l'utente può cambiarla, e un nuovo URL la ripristina.

**6. Perché `switchMap` per le ricerche e non `mergeMap`?**
`switchMap` annulla la richiesta precedente quando ne arriva una nuova, quindi una risposta vecchia non sovrascrive quella corrente. Con `mergeMap` le risposte potrebbero arrivare in disordine.
Il test `product-grid.component.spec.ts:62` verifica `first.cancelled === true`.

**7. Perché catturare l'errore dentro il `switchMap` interno e non fuori?**
Un errore che esce dallo stream esterno lo termina: dopo il primo errore, i filtri non farebbero più nulla. Con `catchError(() => EMPTY)` interno (`product-grid.component.ts:273-284`)
l'errore finisce nello stato e lo stream resta vivo.

**8. Come funziona un interceptor funzionale e perché conta l'ordine?**
È una funzione `(req, next) => Observable`. Le richieste sono immutabili, quindi si usa `req.clone`. Nella richiesta gli interceptor si eseguono nell'ordine dichiarato, nella risposta in ordine
inverso. Qui il token si aggiunge prima, e l'errore 401 si gestisce sulla risposta.

**9. Un guard di rotta basta a proteggere l'area admin?**
No. Nasconde la pagina ma il codice del frontend è modificabile dall'utente. La protezione vera sono `JwtAuthGuard` + `RolesGuard` sulle rotte del backend: anche con `/admin` raggiunta a forza,
le chiamate `POST/PUT/DELETE` rispondono 401/403 (`api.e2e-spec.ts:360`).

**10. Cosa sono i moduli di Nest e come condividi un provider tra moduli?**
Un modulo è un confine di visibilità. Un provider è visibile solo nel proprio modulo, a meno che lo si esporti (`exports`) e l'altro modulo importi il primo. `AuthModule` esporta i guard e `SessionService`
perché `OggettiModule` e `PreferitiModule` li usino.

**11. Qual è la differenza fra guard, pipe, interceptor e filtro in Nest?**
Guard: decide se la richiesta prosegue (autenticazione e permessi). Pipe: trasforma o valida i dati in ingresso (`ValidationPipe`, `ParseUUIDPipe`). Interceptor: avvolge l'esecuzione del
handler (non usato nel progetto). Filtro: trasforma un'eccezione in risposta (`AllExceptionsFilter`). L'ordine è: guard, interceptor, pipe, handler; il filtro agisce sugli errori.

**12. Perché separare controller e service?**
Il controller conosce HTTP, il service conosce il dominio. Così la logica si testa senza server e lo stesso service è riutilizzabile (per esempio dal seed).

**13. Che cosa fa `whitelist` + `forbidNonWhitelisted`?**
Elimina o rifiuta i campi non dichiarati nel DTO. Previene il *mass assignment*: un client non può impostare campi che non dovrebbe, come un ruolo o uno stato di pubblicazione non previsto.

**14. Perché l'ordinamento ha sempre `o.id` come ultimo criterio?**
La paginazione richiede un ordine totale. Se due righe hanno lo stesso prezzo e il database le restituisce in ordine diverso tra due query, la stessa riga può comparire in due pagine o in nessuna.

**15. Perché i prezzi sono `numeric` e hanno un transformer?**
I `float` introducono errori di arrotondamento; `numeric(6,2)` è esatto. Il driver PostgreSQL però restituisce `numeric` come stringa per non perdere precisione, quindi il transformer li converte in `number` per l'applicazione.

**16. Che cos'è una migration e perché `synchronize: false`?**
Una migration è un cambiamento di schema versionato e reversibile (`up`/`down`). `synchronize` allinea lo schema alle entity in automatico, ma può cancellare colonne o dati senza avvisare.
Con le migration lo schema è rivisto, ripetibile e uguale in sviluppo e produzione.

**17. Cos'è il problema N+1 e dove è evitato qui?**
Una query per la lista più una per ogni elemento. In `preferiti.service.ts:22-31` una sola `SELECT` con `innerJoinAndSelect` porta preferiti e capi insieme.

**18. Come funziona l'autenticazione JWT qui e quali sono i suoi limiti?**
Al login il server firma un token (HS256) con `sub`, `email` e ruoli e il client lo manda come `Authorization: Bearer`. Il server verifica la firma, poi rilegge l'utente dal database: se un ruolo
viene revocato o l'utente disabilitato, l'effetto è immediato. Limite: il token non è revocabile prima della scadenza, quindi il logout è solo locale al client.

**19. Perché confrontare la password anche quando l'utente non esiste?**
Per tenere il tempo di risposta simile e non permettere di capire, misurandolo, quali email sono registrate. Si usa un hash fittizio (`auth.service.ts:15`).

**20. Perché la sessione non è salvata in `localStorage`?**
Un token in `localStorage` è leggibile da qualunque script iniettato (XSS). Tenerlo solo in memoria riduce l'esposizione, al costo di dover accedere di nuovo a ogni ricarica. È un compromesso dichiarato.

**21. Come testi un componente che fa richieste HTTP?**
Con `provideHttpClientTesting` e `HttpTestingController`: si intercetta la richiesta (`expectOne`), si controllano URL e parametri, si risponde con `flush` e si verifica il DOM. Si può anche
verificare che una richiesta sia stata annullata (`cancelled`).

**22. Perché il debounce sta su un Observable e non in un `setTimeout` manuale?**
`debounceTime` gestisce da solo l'annullamento del timer precedente e si compone con `takeUntilDestroyed`, per cui non restano timer o sottoscrizioni dopo la distruzione del componente.

**23. Che cosa accade se due utenti creano nello stesso istante due capi con lo stesso nome e variante?**
Il controllo applicativo `verificaDuplicato` può lasciarli passare entrambi; il vincolo UNIQUE del database ne rifiuta uno con errore `23505`, che `AllExceptionsFilter` trasforma in 409.
Due livelli di difesa: uno per il messaggio chiaro, uno per la correttezza.

**24. Perché una pagina è caricata con `loadComponent`?**
Per dividere il bundle: l'utente scarica il codice di una pagina solo quando la visita, e la prima visualizzazione è più veloce.

**25. Come renderesti sicuro il deploy in produzione?**
Segreto JWT lungo e casuale (la validazione lo impone), `SEED_DEMO_USERS` spento, `FRONTEND_ORIGIN` impostato sul dominio reale, `TRUST_PROXY` corretto per leggere l'IP vero dietro un proxy (serve al rate limit),
database con SSL, migration eseguite prima dell'avvio.

---

## 9. Cosa non è stato verificato

Per essere onesti su cosa questa guida garantisce:

- I riferimenti ai file e alle righe sono stati letti nel codice al momento della scrittura. Se modifichi i file, i numeri di riga si spostano: cerca per nome del simbolo.
- I numeri di test in questa guida non sono dichiarati di proposito: esegui `npm test` nelle due cartelle per vedere lo stato reale.
- I test e2e del backend richiedono PostgreSQL attivo e un database con nome `*_test`; non sono stati rieseguiti per scrivere questa guida.
- Il `docker-compose.yml` e il deploy su Render (`render.yaml`) non sono stati verificati end-to-end in questa fase: trattali come configurazione di partenza da provare.
