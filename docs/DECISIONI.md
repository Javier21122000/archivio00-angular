# Registro delle decisioni di design — ARCHIVIO 00

Ogni voce ha la stessa forma: **contesto** (il problema), **decisione**, **motivi**, **alternative scartate**. Descrive ciò che è nel codice; i riferimenti ai file sono sotto `BACKEND/src/` salvo diversa indicazione.

---

## 1. Catalogo paginato, filtrato e ordinato dal server

**Contesto.** Il catalogo è la pagina più visitata e deve restare veloce anche se i capi crescono da 28 a migliaia.
**Decisione.** `GET /oggetti` restituisce una pagina (`items`, `total`, `page`, `limit`, `totalPages`, `catalogCount`). Ricerca, categoria, Special Edition, ordinamento e paginazione sono eseguiti da PostgreSQL (`oggetti/oggetti.service.ts`). `limit` ha un massimo di 60.
**Motivi.** Il browser riceve solo ciò che mostra; il database ha indici adatti (btree su catalogo, categoria, prezzo; GIN trigram su nome e variante per la ricerca parziale). Il tetto su `limit` impedisce di richiedere l'intera tabella.
**Alternative scartate.** Inviare tutto l'array e filtrare nel client: semplice, ma il costo cresce con il catalogo e espone anche dati non necessari. Paginazione a cursore: più robusta su insiemi enormi, ma qui serve saltare a una pagina qualsiasi e mostrare il totale.

## 2. Ordinamento stabile con tie-break

**Contesto.** Molti capi hanno lo stesso valore di ordinamento (stesso prezzo, stesso stato "in evidenza").
**Decisione.** Ogni ordinamento termina con `createdAt` e poi `id` (`oggetti.service.ts`). I preferiti seguono la stessa logica.
**Motivi.** Senza un ordine totale PostgreSQL può restituire righe uguali in ordine diverso tra due richieste: con la paginazione un capo comparirebbe due volte o mai.
**Alternative scartate.** Affidarsi all'ordine fisico delle righe (non garantito); ordinare solo per prezzo.

## 3. Ruoli riletti dal database a ogni richiesta

**Contesto.** Un JWT firmato resta valido fino alla scadenza (24h): se contenesse i ruoli come fonte di verità, revocare ADMIN non avrebbe effetto subito.
**Decisione.** Il token identifica solo l'utente; `SessionService` (`auth/session.service.ts`) verifica la firma, carica l'utente dal database e ne usa i ruoli reali. Un utente disabilitato o cancellato risulta non autenticato.
**Motivi.** Revoca immediata dei privilegi e dell'account, al costo di una query per richiesta autenticata (una lettura per chiave primaria).
**Alternative scartate.** Fidarsi dei claim del token (veloce, ma privilegi "zombie"); token a vita breve con refresh (più complessità di quanta ne richieda il progetto); lista di token revocati (stato da gestire).

## 4. JWT con `sub` = id utente

**Contesto.** Il claim `sub` deve identificare il soggetto in modo stabile.
**Decisione.** `sub` contiene l'UUID dell'utente (`auth/auth.service.ts`); `email` e `roles` sono nel token solo come informazione per il client.
**Motivi.** L'email può cambiare, l'id no; la ricerca per chiave primaria è la più economica e non dipende dalla normalizzazione del testo. Coerente con la decisione 3.
**Alternative scartate.** `sub` = email (identificativo mutabile e confronto su testo); lasciar fuori `email`/`roles` (il client dovrebbe chiamare un endpoint in più dopo il login).

## 5. Errori in un unico formato

**Contesto.** Frontend e test devono gestire gli errori senza casi speciali per ogni origine (validazione, guard, database).
**Decisione.** Un exception filter globale (`common/all-exceptions.filter.ts`) produce sempre `{ statusCode, error, message, details? }`. Gli errori di validazione hanno `details` campo → messaggio (`app.setup.ts`). Violazioni UNIQUE di PostgreSQL (23505) diventano 409, dati non validi (classe 22, come il byte NUL) diventano 400, il resto è un 500 generico con il dettaglio solo nei log.
**Motivi.** Un solo parser lato client; nessuna fuga di stack trace o di dettagli SQL; una richiesta concorrente che scavalca il controllo applicativo di duplicati riceve comunque un 409 pulito.
**Alternative scartate.** Lasciare i formati di default di NestJS (tre forme diverse); un filtro per ogni tipo di errore.

## 6. Un solo punto di configurazione dell'app, usato anche dai test

**Contesto.** Se i test e2e montassero una pipeline diversa da `main.ts`, non proverebbero il comportamento reale.
**Decisione.** `configureApp` in `app.setup.ts` applica helmet, prefisso `/api`, `ValidationPipe` (whitelist, `forbidNonWhitelisted`, transform), filtro errori e CORS; lo chiamano sia `main.ts` sia i test.
**Motivi.** I test esercitano la stessa validazione e gli stessi errori della produzione; le regole di sicurezza stanno in un posto solo.
**Alternative scartate.** Duplicare la configurazione nei test; configurare tutto con decoratori sparsi nei controller.

## 7. Variabili d'ambiente validate all'avvio

**Contesto.** Un segreto mancante o debole non deve emergere alla prima richiesta, magari in produzione.
**Decisione.** `config/env.ts` valida tutto all'avvio: `JWT_SECRET` di almeno 32 caratteri e mai il valore di esempio in produzione, numeri interi validi, `NODE_ENV` ammesso. Gli account dimostrativi sono attivi per default solo fuori produzione (`SEED_DEMO_USERS`).
**Motivi.** Fallire subito con un messaggio chiaro è più semplice da diagnosticare che fallire in modo parziale; i default sicuri evitano credenziali note online.
**Alternative scartate.** Leggere `process.env` dove serve, senza controlli.

## 8. Seed idempotente con `seed_key`

**Contesto.** Il catalogo iniziale (28 capi) e i ruoli devono poter essere caricati a ogni avvio, anche su un database già popolato e modificato da un admin.
**Decisione.** Ogni capo del seed ha una `seed_key` univoca, che coincide con il nome del file immagine (`database/seed/`). Il seed crea solo ciò che manca: un capo già presente, anche rinominato o modificato, non viene toccato né duplicato; un omonimo (nome + variante) inserito a mano viene rispettato. I capi creati da un admin hanno `seed_key` nulla. Le date di creazione partono da un'epoca fissa (+1 secondo per capo) per un ordine di "più recenti" riproducibile.
**Motivi.** Il seed si può rilanciare senza paura (deploy, riavvii); l'identità del capo non dipende dal nome, che l'admin può cambiare; la `seed_key` serve anche alle pagine leggenda per chiedere esattamente i loro capi (parametro `chiavi`).
**Alternative scartate.** Svuotare e ricaricare a ogni avvio (distrugge le modifiche); identificare i capi per nome (si rompe al primo rinomina); `INSERT ... ON CONFLICT DO UPDATE` (sovrascriverebbe le modifiche dell'admin).

## 9. Tabella `assets` separata dai capi

**Contesto.** Oggi ogni capo ha una foto, ma le foto sono il cuore del progetto e potranno diventare più d'una, con versioni, video e un flusso di approvazione.
**Decisione.** La tabella `assets` (`assets/asset.entity.ts`) ha tipo (`IMAGE`/`VIDEO`), url, flag `principale`, `ordine`, `stato` (`DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED`), `versione` e `metadati` JSONB. Un indice parziale univoco garantisce un solo asset principale per capo. Il servizio lo tiene allineato a `oggetti.immagine_url` e incrementa `versione` se l'immagine cambia. Per ora è popolata solo con l'asset principale.
**Motivi.** I metadati del prodotto restano separati dai contenuti multimediali; aggiungere galleria o approvazione non richiede di rompere la tabella dei capi. Il JSONB lascia spazio a didascalie e tag senza una migration per ogni campo.
**Alternative scartate.** Più colonne immagine su `oggetti` (non scalano); tabella creata solo quando servirà (migration più invasiva con dati in produzione). Va detto onestamente: il workflow di approvazione è previsto dal modello ma non è ancora esposto dall'API.

## 10. Schema gestito con migration, non con sincronizzazione automatica

**Contesto.** Lo schema contiene elementi che le annotazioni delle entità non esprimono bene: indici su `lower(...)`, indici parziali, indici GIN trigram.
**Decisione.** Lo schema è definito da migration TypeORM (`database/migrations/`) eseguite con uno script dedicato; niente `synchronize`. I vincoli di unicità sono nel database (email e username in minuscolo, `nome`+`variante` in minuscolo, `seed_key`, un solo preferito per coppia utente-capo).
**Motivi.** Lo schema è versionato e rivedibile come il codice; i vincoli proteggono i dati anche contro richieste concorrenti (vedi decisione 5).
**Alternative scartate.** `synchronize: true` (rischioso fuori dallo sviluppo, non crea gli indici avanzati); SQL manuale non versionato.

## 11. Dati riservati fuori dal DTO pubblico

**Contesto.** Il capo ha prezzo di acquisto e fornitore, che un cliente non deve mai vedere.
**Decisione.** Due mapper (`oggetti/oggetti.mapper.ts`): il DTO pubblico ha un elenco esplicito di chiavi; il DTO admin lo estende. La scelta è fatta dal ruolo riletto dal database (decisione 3). Le bozze sono invisibili ai non admin anche sul dettaglio (404).
**Motivi.** Un elenco esplicito di campi non può far uscire per errore un campo aggiunto in seguito all'entità; il 404 sulle bozze non rivela che esistono.
**Alternative scartate.** Restituire l'entità e nascondere i campi nel client (i dati sarebbero comunque nella risposta); un solo DTO con campi opzionali.

## 12. Difese su autenticazione e input

**Contesto.** Login e registrazione sono i punti più esposti; i campi di testo e gli URL immagine arrivano da fuori.
**Decisione.** Rate limit per IP su `/auth/*` (default 30/min, `AUTH_RATE_LIMIT`; `TRUST_PROXY` per leggere l'IP reale dietro un proxy); bcrypt per le password; confronto con hash fittizio per email sconosciute; `helmet`; whitelist dei campi nei DTO; `immagineUrl` limitato a percorsi locali o http(s), niente `javascript:` o `data:`; ricerca con carattere jolly `LIKE` neutralizzato (`escapeLike`); parametri sempre associati, mai concatenati nelle query.
**Motivi.** Frenare il brute force, non far trapelare l'esistenza di un account dal tempo di risposta, chiudere le vie di XSS e injection più comuni.
**Alternative scartate.** Lockout dell'account dopo N tentativi (permetterebbe a un terzo di bloccare un utente reale); CAPTCHA (peso sul design senza necessità a questa scala).

## 13. Il database è un'unica fonte per l'ordine e il conteggio del catalogo

**Contesto.** L'intestazione del catalogo mostra "L'ARCHIVIO (28)" anche quando si filtra.
**Decisione.** La risposta paginata include `catalogCount`, i capi visibili all'utente senza filtri, separato da `total`, che rispetta i filtri.
**Motivi.** Il frontend non deve fare una seconda chiamata né ricostruire il totale; un admin vede un conteggio che include le bozze, un visitatore no.
**Alternative scartate.** Endpoint dedicato al conteggio (una richiesta in più per ogni apertura della pagina).

---

*Non verificato in questo registro:* il comportamento sotto carico reale e il deploy gestito sono descritti nel README e nei file di configurazione; qui si documentano solo le scelte presenti nel codice.
