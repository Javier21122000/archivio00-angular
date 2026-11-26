import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type { Env } from '../src/config/env.js';
import { eseguiSeed } from '../src/database/seed/seed.service.js';

/**
 * Test end-to-end: avviano l'applicazione Nest vera (stessa pipeline di main.ts)
 * contro PostgreSQL e chiamano le rotte via HTTP, senza mock.
 * Lo schema viene ricreato da zero a ogni esecuzione, perciò girano SOLO su un database "*_test".
 */

if (!process.env['DB_NAME']?.endsWith('_test') || process.env['DATABASE_URL']) {
  throw new Error('I test e2e distruggono il database: richiedono DB_NAME che termina con _test e nessun DATABASE_URL.');
}

const DTO_PUBBLICO = ['categoria', 'id', 'immagineUrl', 'inEvidenza', 'isSpecialEdition', 'nome', 'numeroRecensioni', 'prezzo', 'rating', 'variante'];
const DTO_ADMIN = [...DTO_PUBBLICO, 'createdAt', 'fornitore', 'prezzoAcquisto', 'pubblicato'].sort();

let app: INestApplication;
let dataSource: DataSource;
let http: ReturnType<typeof request>;
let tokenAdmin: string;
let idAdmin: string;
let tokenUser: string;
let idUser: string;
let contatore = 0;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

async function login(email: string, password: string) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
  return res.body as { token: string; user: { id: string; roles: string[] } };
}

/** Registra un utente nuovo (email/username unici per ogni chiamata) e restituisce token e id. */
async function nuovoUtente() {
  const n = ++contatore;
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ username: `tester${n}`, email: `Tester${n}@Example.it`, password: 'password123', firstName: 'Test', lastName: `Utente${n}` })
    .expect(201);
  return { token: res.body.token as string, id: res.body.user.id as string, email: `tester${n}@example.it` };
}

function bodyCapo(sovrascrivi: Record<string, unknown> = {}) {
  return { nome: `Capo di prova ${++contatore}`, prezzo: 100, prezzoAcquisto: 40, fornitore: 'Fornitore Test', pubblicato: true, inEvidenza: false, ...sovrascrivi };
}

async function creaCapo(sovrascrivi: Record<string, unknown> = {}) {
  const res = await request(app.getHttpServer()).post('/api/oggetti').set(bearer(tokenAdmin)).send(bodyCapo(sovrascrivi)).expect(201);
  return res.body as Record<string, unknown> & { id: string; nome: string };
}

beforeAll(async () => {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = modulo.createNestApplication();
  configureApp(app, modulo.get(ConfigService<Env, true>).get('FRONTEND_ORIGIN'));
  await app.init();
  dataSource = app.get(DataSource);

  // Seconda barriera: controlla il database a cui siamo DAVVERO connessi prima di cancellarlo.
  if (!String(dataSource.driver.database).endsWith('_test')) {
    await app.close();
    throw new Error(`Rifiuto di azzerare il database "${dataSource.driver.database}": non finisce con _test`);
  }
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  await eseguiSeed(dataSource, { utentiDemo: true });

  http = request(app.getHttpServer());
  const admin = await login('javier@archivio00.it', 'admin123');
  tokenAdmin = admin.token;
  idAdmin = admin.user.id;
  const utente = await login('utente@archivio00.it', 'password123');
  tokenUser = utente.token;
  idUser = utente.user.id;
});

afterAll(async () => {
  await app?.close();
});

describe('health', () => {
  it('GET /health fuori da /api verifica anche il database', async () => {
    const res = await http.get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });
});

describe('auth', () => {
  it('register: 201, ruolo USER, nessuna password nella risposta', async () => {
    const res = await http
      .post('/api/auth/register')
      .send({ username: 'nuovo.utente', email: 'Nuovo@Esempio.IT', password: 'password123', firstName: 'Nuovo', lastName: 'Utente' })
      .expect(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'nuovo@esempio.it', firstName: 'Nuovo', lastName: 'Utente', roles: ['USER'] });
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('register: email o username duplicati (anche con maiuscole diverse) => 409', async () => {
    const base = { password: 'password123', firstName: 'A', lastName: 'B' };
    const ris1 = await http.post('/api/auth/register').send({ ...base, username: 'altro.nome', email: 'NUOVO@esempio.it' }).expect(409);
    expect(ris1.body).toMatchObject({ statusCode: 409, message: 'Username o email già registrati' });
    await http.post('/api/auth/register').send({ ...base, username: 'NUOVO.UTENTE', email: 'diversa@esempio.it' }).expect(409);
  });

  it('register: dati non validi => 400 con details per campo', async () => {
    const res = await http.post('/api/auth/register').send({ username: '', email: 'non-una-email', password: 'corta', firstName: 'A', lastName: 'B' }).expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Object.keys(res.body.details).sort()).toEqual(['email', 'password', 'username']);
  });

  it('register: campo extra nel body => 400', async () => {
    const res = await http
      .post('/api/auth/register')
      .send({ username: 'extra', email: 'extra@esempio.it', password: 'password123', firstName: 'A', lastName: 'B', roles: ['ADMIN'] })
      .expect(400);
    expect(res.body.details).toHaveProperty('roles');
  });

  it('login: 200 con token e utente; l\'email è case-insensitive', async () => {
    const res = await http.post('/api/auth/login').send({ email: 'UTENTE@Archivio00.IT', password: 'password123' }).expect(200);
    expect(res.body.user).toMatchObject({ email: 'utente@archivio00.it', roles: ['USER'] });
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('login: password errata o utente inesistente => 401 con lo stesso messaggio', async () => {
    const a = await http.post('/api/auth/login').send({ email: 'utente@archivio00.it', password: 'sbagliata' }).expect(401);
    const b = await http.post('/api/auth/login').send({ email: 'nessuno@archivio00.it', password: 'password123' }).expect(401);
    expect(a.body.message).toBe('Credenziali non valide');
    expect(b.body.message).toBe(a.body.message);
  });

  it('logout: no-op senza contenuto', async () => {
    await http.post('/api/auth/logout').expect(204);
  });
});

describe('GET /oggetti (pubblico)', () => {
  it('restituisce esattamente le chiavi del DTO pubblico e la struttura paginata', async () => {
    const res = await http.get('/api/oggetti').expect(200);
    expect(Object.keys(res.body).sort()).toEqual(['catalogCount', 'items', 'limit', 'page', 'total', 'totalPages']);
    expect(res.body).toMatchObject({ page: 1, limit: 12, total: 28, catalogCount: 28, totalPages: 3 });
    expect(res.body.items).toHaveLength(12);
    for (const item of res.body.items) {
      expect(Object.keys(item).sort()).toEqual(DTO_PUBBLICO);
      expect(typeof item.prezzo).toBe('number');
    }
  });

  it('un visitatore non vede mai le bozze, nemmeno nel conteggio', async () => {
    const bozza = await creaCapo({ pubblicato: false, nome: 'Bozza segreta XYZ' });
    const res = await http.get('/api/oggetti').query({ limit: 60 }).expect(200);
    expect(res.body.items.map((i: { id: string }) => i.id)).not.toContain(bozza.id);
    expect(res.body.catalogCount).toBe(28);
    const ricerca = await http.get('/api/oggetti').query({ q: 'segreta' }).expect(200);
    expect(ricerca.body.total).toBe(0);
    // Anche un USER autenticato vede il DTO pubblico e nessuna bozza; soloBozze viene ignorato.
    const comeUser = await http.get('/api/oggetti').query({ soloBozze: true }).set(bearer(tokenUser)).expect(200);
    expect(comeUser.body.items.map((i: { id: string }) => i.id)).not.toContain(bozza.id);
    expect(Object.keys(comeUser.body.items[0]).sort()).toEqual(DTO_PUBBLICO);
  });

  it('limit oltre 60 => 400; page 0 => 400', async () => {
    await http.get('/api/oggetti').query({ limit: 61 }).expect(400);
    await http.get('/api/oggetti').query({ page: 0 }).expect(400);
    await http.get('/api/oggetti').query({ limit: 60 }).expect(200);
  });

  it.each(['archivio', 'prezzo-asc', 'prezzo-desc'])('paginazione con ordine %s: nessuna sovrapposizione né buchi', async (ordine) => {
    const visti: string[] = [];
    let totale = 0;
    for (let page = 1; ; page++) {
      const res = await http.get('/api/oggetti').query({ limit: 5, page, ordine }).expect(200);
      totale = res.body.total;
      visti.push(...res.body.items.map((i: { id: string }) => i.id));
      if (page >= res.body.totalPages) break;
    }
    expect(visti).toHaveLength(totale);
    expect(new Set(visti).size).toBe(totale);
  });

  it('ordine prezzo-asc / prezzo-desc ordina davvero per prezzo', async () => {
    const asc = (await http.get('/api/oggetti').query({ limit: 60, ordine: 'prezzo-asc' }).expect(200)).body.items.map((i: { prezzo: number }) => i.prezzo);
    const desc = (await http.get('/api/oggetti').query({ limit: 60, ordine: 'prezzo-desc' }).expect(200)).body.items.map((i: { prezzo: number }) => i.prezzo);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it('ordine archivio: i capi in evidenza vengono prima degli altri', async () => {
    const items = (await http.get('/api/oggetti').query({ limit: 60 }).expect(200)).body.items as { inEvidenza: boolean }[];
    const primoNonEvidenza = items.findIndex((i) => !i.inEvidenza);
    expect(primoNonEvidenza).toBeGreaterThan(0);
    expect(items.slice(primoNonEvidenza).some((i) => i.inEvidenza)).toBe(false);
  });

  it('filtro categoria e categoria sconosciuta', async () => {
    const res = await http.get('/api/oggetti').query({ categoria: 'Denim', limit: 60 }).expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.items.every((i: { categoria: string }) => i.categoria === 'Denim')).toBe(true);
    await http.get('/api/oggetti').query({ categoria: 'Inventata' }).expect(400);
  });

  it('filtro special=true: solo Special Edition', async () => {
    const res = await http.get('/api/oggetti').query({ special: true, limit: 60 }).expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.items.every((i: { isSpecialEdition: boolean }) => i.isSpecialEdition)).toBe(true);
  });

  it('q: ricerca parziale e case-insensitive', async () => {
    const minuscolo = await http.get('/api/oggetti').query({ q: 'beckham' }).expect(200);
    const maiuscolo = await http.get('/api/oggetti').query({ q: 'BECK' }).expect(200);
    expect(minuscolo.body.items.map((i: { nome: string }) => i.nome)).toEqual(['Beckham Baggy Denim Collab']);
    expect(maiuscolo.body.items.map((i: { nome: string }) => i.nome)).toEqual(['Beckham Baggy Denim Collab']);
  });

  it('q: % e _ sono caratteri letterali, non jolly', async () => {
    await creaCapo({ nome: 'Zeta 100% cotone' });
    await creaCapo({ nome: 'Zeta 100X cotone' });
    await creaCapo({ nome: 'Eta a_c' });
    await creaCapo({ nome: 'Eta abc' });
    const percento = await http.get('/api/oggetti').query({ q: '100%' }).expect(200);
    expect(percento.body.items.map((i: { nome: string }) => i.nome)).toEqual(['Zeta 100% cotone']);
    const underscore = await http.get('/api/oggetti').query({ q: 'a_c' }).expect(200);
    expect(underscore.body.items.map((i: { nome: string }) => i.nome)).toEqual(['Eta a_c']);
    // Un "%" da solo non deve corrispondere a tutto il catalogo.
    const solo = await http.get('/api/oggetti').query({ q: '%' }).expect(200);
    expect(solo.body.total).toBe(1);
  });

  it('chiavi=a,b restituisce solo quei capi', async () => {
    const res = await http.get('/api/oggetti').query({ chiavi: 'beckham-denim,cargo-denim' }).expect(200);
    expect(res.body.items.map((i: { nome: string }) => i.nome).sort()).toEqual(["Beckham Baggy Denim Collab", "Jeans Cargo Wide Leg '04"]);
    expect(res.body.total).toBe(2);
  });
});

describe('GET /oggetti come admin', () => {
  it('vede le bozze con i dati riservati; soloBozze=true mostra solo le bozze', async () => {
    const bozza = await creaCapo({ pubblicato: false });
    const tutti = await http.get('/api/oggetti').query({ limit: 60 }).set(bearer(tokenAdmin)).expect(200);
    const trovato = tutti.body.items.find((i: { id: string }) => i.id === bozza.id);
    expect(Object.keys(trovato).sort()).toEqual(DTO_ADMIN);
    expect(tutti.body.catalogCount).toBe(tutti.body.total);
    expect(tutti.body.catalogCount).toBeGreaterThan(28);

    const soloBozze = await http.get('/api/oggetti').query({ soloBozze: true, limit: 60 }).set(bearer(tokenAdmin)).expect(200);
    expect(soloBozze.body.items.length).toBeGreaterThan(0);
    expect(soloBozze.body.items.every((i: { pubblicato: boolean }) => i.pubblicato === false)).toBe(true);
  });

  it('token malformato su GET /oggetti = visitatore (200, non 401)', async () => {
    const res = await http.get('/api/oggetti').set({ Authorization: 'Bearer questo.non.etoken' }).expect(200);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(DTO_PUBBLICO);
    const [{ n }] = await dataSource.query('SELECT count(*)::int AS n FROM oggetti WHERE pubblicato');
    expect(res.body.catalogCount).toBe(n);
  });
});

describe('GET /oggetti/:id', () => {
  it('capo pubblicato => DTO pubblico', async () => {
    const lista = await http.get('/api/oggetti').query({ limit: 1 }).expect(200);
    const res = await http.get(`/api/oggetti/${lista.body.items[0].id}`).expect(200);
    expect(Object.keys(res.body).sort()).toEqual(DTO_PUBBLICO);
  });

  it('bozza => 404, id inesistente => 404, non UUID => 400', async () => {
    const bozza = await creaCapo({ pubblicato: false });
    const res = await http.get(`/api/oggetti/${bozza.id}`).expect(404);
    expect(res.body.message).toBe('Oggetto non trovato');
    await http.get(`/api/oggetti/${randomUUID()}`).expect(404);
    await http.get('/api/oggetti/non-un-uuid').expect(400);
  });
});

describe('CRUD admin', () => {
  it('POST => 201 con DTO admin; categoria dedotta dal nome se omessa', async () => {
    const res = await http.post('/api/oggetti').set(bearer(tokenAdmin)).send(bodyCapo({ nome: 'Jeans Prova Deduzione' })).expect(201);
    expect(Object.keys(res.body).sort()).toEqual(DTO_ADMIN);
    expect(res.body).toMatchObject({ categoria: 'Denim', variante: '', rating: 0, numeroRecensioni: 0, isSpecialEdition: false, immagineUrl: '/assets/products/unavailable.svg' });
    const esplicita = await creaCapo({ nome: 'Jeans Con Categoria', categoria: 'Pantaloni' });
    expect(esplicita.categoria).toBe('Pantaloni');
  });

  it('POST: nome+variante duplicati (case-insensitive) => 409; stessa nome con variante diversa ok', async () => {
    await creaCapo({ nome: 'Giacca Doppia', variante: 'Blu' });
    const dup = await http.post('/api/oggetti').set(bearer(tokenAdmin)).send(bodyCapo({ nome: 'GIACCA DOPPIA', variante: 'blu' })).expect(409);
    expect(dup.body.message).toBe('Nome e variante già presenti');
    await creaCapo({ nome: 'Giacca Doppia', variante: 'Rosso' });
  });

  it('POST: validazione => 400 con details (prezzo negativo, 3 decimali, campo extra)', async () => {
    const res = await http.post('/api/oggetti').set(bearer(tokenAdmin)).send(bodyCapo({ prezzo: -1, prezzoAcquisto: 1.234, colore: 'rosso' })).expect(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['colore', 'prezzo', 'prezzoAcquisto']);
  });

  it('PUT parziale non azzera categoria, rating, recensioni e special edition', async () => {
    const capo = await creaCapo({ categoria: 'Pelle', rating: 4, numeroRecensioni: 12, isSpecialEdition: true, variante: 'Nera' });
    const res = await http
      .put(`/api/oggetti/${capo.id}`)
      .set(bearer(tokenAdmin))
      .send({ nome: capo.nome, prezzo: 222, prezzoAcquisto: 50, fornitore: 'Nuovo Fornitore', pubblicato: true, inEvidenza: true })
      .expect(200);
    expect(res.body).toMatchObject({ prezzo: 222, fornitore: 'Nuovo Fornitore', inEvidenza: true, categoria: 'Pelle', rating: 4, numeroRecensioni: 12, isSpecialEdition: true, variante: 'Nera' });
  });

  it('PUT: id inesistente => 404; nome+variante di un altro capo => 409; il proprio nome ok', async () => {
    const a = await creaCapo({ nome: 'Capo Alfa' });
    const b = await creaCapo({ nome: 'Capo Beta' });
    const corpo = (nome: string) => ({ nome, prezzo: 10, prezzoAcquisto: 5, fornitore: 'F', pubblicato: true, inEvidenza: false });
    await http.put(`/api/oggetti/${randomUUID()}`).set(bearer(tokenAdmin)).send(corpo('X')).expect(404);
    await http.put(`/api/oggetti/${b.id}`).set(bearer(tokenAdmin)).send(corpo('capo alfa')).expect(409);
    await http.put(`/api/oggetti/${a.id}`).set(bearer(tokenAdmin)).send(corpo('Capo Alfa')).expect(200);
  });

  it('asset principale: creato con il capo, versione+1 solo quando cambia immagineUrl', async () => {
    const capo = await creaCapo({ immagineUrl: '/assets/products/prova-1.jpg' });
    const leggi = () => dataSource.query('SELECT url, versione FROM assets WHERE oggetto_id = $1 AND principale', [capo.id]) as Promise<{ url: string; versione: number }[]>;
    expect(await leggi()).toEqual([{ url: '/assets/products/prova-1.jpg', versione: 1 }]);

    const corpo = { nome: capo.nome, prezzo: 100, prezzoAcquisto: 40, fornitore: 'F', pubblicato: true, inEvidenza: false };
    await http.put(`/api/oggetti/${capo.id}`).set(bearer(tokenAdmin)).send({ ...corpo, immagineUrl: '/assets/products/prova-1.jpg' }).expect(200);
    expect(await leggi()).toEqual([{ url: '/assets/products/prova-1.jpg', versione: 1 }]);

    await http.put(`/api/oggetti/${capo.id}`).set(bearer(tokenAdmin)).send({ ...corpo, immagineUrl: '/assets/products/prova-2.jpg' }).expect(200);
    expect(await leggi()).toEqual([{ url: '/assets/products/prova-2.jpg', versione: 2 }]);
  });

  it('DELETE => 204; sparisce dal catalogo e porta via preferiti e asset (cascade)', async () => {
    const capo = await creaCapo();
    await http.post(`/api/preferiti/${capo.id}`).set(bearer(tokenUser)).expect(201);
    expect(await dataSource.query('SELECT 1 FROM assets WHERE oggetto_id = $1', [capo.id])).toHaveLength(1);

    await http.delete(`/api/oggetti/${capo.id}`).set(bearer(tokenAdmin)).expect(204);

    await http.get(`/api/oggetti/${capo.id}`).expect(404);
    const preferiti = await http.get('/api/preferiti').set(bearer(tokenUser)).expect(200);
    expect(preferiti.body.map((p: { oggetto: { id: string } }) => p.oggetto.id)).not.toContain(capo.id);
    expect(await dataSource.query('SELECT 1 FROM preferiti WHERE oggetto_id = $1', [capo.id])).toHaveLength(0);
    expect(await dataSource.query('SELECT 1 FROM assets WHERE oggetto_id = $1', [capo.id])).toHaveLength(0);
    await http.delete(`/api/oggetti/${capo.id}`).set(bearer(tokenAdmin)).expect(404);
  });

  it('GET /oggetti/statistiche: totale = pubblicati + bozze', async () => {
    const res = await http.get('/api/oggetti/statistiche').set(bearer(tokenAdmin)).expect(200);
    expect(Object.keys(res.body).sort()).toEqual(['bozze', 'pubblicati', 'totale']);
    expect(res.body.totale).toBe(res.body.pubblicati + res.body.bozze);
    expect(res.body.bozze).toBeGreaterThan(0);
  });

  it('USER => 403 e anonimo => 401 su POST/PUT/DELETE/statistiche', async () => {
    const capo = await creaCapo();
    const corpo = bodyCapo();
    const rotte: [string, string, object | undefined][] = [
      ['post', '/api/oggetti', corpo],
      ['put', `/api/oggetti/${capo.id}`, corpo],
      ['delete', `/api/oggetti/${capo.id}`, undefined],
      ['get', '/api/oggetti/statistiche', undefined],
    ];
    for (const [metodo, percorso, body] of rotte) {
      const comeUser = request(app.getHttpServer())[metodo as 'post'](percorso).set(bearer(tokenUser));
      await (body ? comeUser.send(body) : comeUser).expect(403);
      const anonimo = request(app.getHttpServer())[metodo as 'post'](percorso);
      await (body ? anonimo.send(body) : anonimo).expect(401);
    }
    await http.get(`/api/oggetti/${capo.id}`).expect(200); // nulla è stato cancellato
  });
});

describe('preferiti', () => {
  it('senza token => 401 su tutte le rotte', async () => {
    const id = randomUUID();
    await http.get('/api/preferiti').expect(401);
    await http.post(`/api/preferiti/${id}`).expect(401);
    await http.delete(`/api/preferiti/${id}`).expect(401);
  });

  it('add 201, duplicato 409, lista solo propri, remove 204 poi 404', async () => {
    const { token } = await nuovoUtente();
    const capo = await creaCapo();
    const aggiunto = await http.post(`/api/preferiti/${capo.id}`).set(bearer(token)).expect(201);
    expect(Object.keys(aggiunto.body).sort()).toEqual(['createdAt', 'id', 'oggetto']);
    expect(Object.keys(aggiunto.body.oggetto).sort()).toEqual(DTO_PUBBLICO);

    const dup = await http.post(`/api/preferiti/${capo.id}`).set(bearer(token)).expect(409);
    expect(dup.body.message).toBe('Oggetto già preferito');

    const lista = await http.get('/api/preferiti').set(bearer(token)).expect(200);
    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].oggetto.id).toBe(capo.id);

    await http.delete(`/api/preferiti/${capo.id}`).set(bearer(token)).expect(204);
    const secondo = await http.delete(`/api/preferiti/${capo.id}`).set(bearer(token)).expect(404);
    expect(secondo.body.message).toBe('Preferito non trovato');
    expect((await http.get('/api/preferiti').set(bearer(token)).expect(200)).body).toEqual([]);
  });

  it('una bozza o un capo inesistente => 404; id non UUID => 400', async () => {
    const bozza = await creaCapo({ pubblicato: false });
    await http.post(`/api/preferiti/${bozza.id}`).set(bearer(tokenUser)).expect(404);
    await http.post(`/api/preferiti/${randomUUID()}`).set(bearer(tokenUser)).expect(404);
    await http.post('/api/preferiti/xyz').set(bearer(tokenUser)).expect(400);
  });

  it('isolamento: ogni utente vede e può rimuovere solo i propri preferiti', async () => {
    const a = await nuovoUtente();
    const b = await nuovoUtente();
    const capo = await creaCapo();
    await http.post(`/api/preferiti/${capo.id}`).set(bearer(a.token)).expect(201);
    expect((await http.get('/api/preferiti').set(bearer(b.token)).expect(200)).body).toEqual([]);
    await http.delete(`/api/preferiti/${capo.id}`).set(bearer(b.token)).expect(404);
    expect((await http.get('/api/preferiti').set(bearer(a.token)).expect(200)).body).toHaveLength(1);
    // B può preferire lo stesso capo: il vincolo di unicità è per coppia utente+capo.
    await http.post(`/api/preferiti/${capo.id}`).set(bearer(b.token)).expect(201);
  });
});

describe('admin: ruoli', () => {
  it('grant e revoke sono idempotenti', async () => {
    const { id } = await nuovoUtente();
    for (let i = 0; i < 2; i++) {
      const res = await http.post(`/api/admin/utenti/${id}/ruolo-admin`).set(bearer(tokenAdmin)).expect(200);
      expect(res.body.roles.sort()).toEqual(['ADMIN', 'USER']);
    }
    for (let i = 0; i < 2; i++) {
      const res = await http.delete(`/api/admin/utenti/${id}/ruolo-admin`).set(bearer(tokenAdmin)).expect(200);
      expect(res.body.roles).toEqual(['USER']);
    }
  });

  it('un admin non può modificare il proprio ruolo => 400', async () => {
    const res = await http.delete(`/api/admin/utenti/${idAdmin}/ruolo-admin`).set(bearer(tokenAdmin)).expect(400);
    expect(res.body.message).toBe('Non puoi modificare il tuo stesso ruolo');
    await http.post(`/api/admin/utenti/${idAdmin}/ruolo-admin`).set(bearer(tokenAdmin)).expect(400);
  });

  it('non-admin => 403, anonimo => 401', async () => {
    await http.post(`/api/admin/utenti/${idAdmin}/ruolo-admin`).set(bearer(tokenUser)).expect(403);
    await http.delete(`/api/admin/utenti/${idAdmin}/ruolo-admin`).set(bearer(tokenUser)).expect(403);
    await http.post(`/api/admin/utenti/${idUser}/ruolo-admin`).expect(401);
  });

  it('id inesistente => 404, id non UUID => 400', async () => {
    await http.post(`/api/admin/utenti/${randomUUID()}/ruolo-admin`).set(bearer(tokenAdmin)).expect(404);
    await http.post('/api/admin/utenti/abc/ruolo-admin').set(bearer(tokenAdmin)).expect(400);
  });

  it('la revoca ha effetto IMMEDIATO sul token ancora valido', async () => {
    const { id, token } = await nuovoUtente();
    await http.get('/api/oggetti/statistiche').set(bearer(token)).expect(403);

    await http.post(`/api/admin/utenti/${id}/ruolo-admin`).set(bearer(tokenAdmin)).expect(200);
    // Stesso token di prima (emesso quando era solo USER): il ruolo è riletto dal database.
    await http.get('/api/oggetti/statistiche').set(bearer(token)).expect(200);

    await http.delete(`/api/admin/utenti/${id}/ruolo-admin`).set(bearer(tokenAdmin)).expect(200);
    await http.get('/api/oggetti/statistiche').set(bearer(token)).expect(403);
  });
});

describe('sicurezza dei token', () => {
  const claim = () => ({ sub: idAdmin, email: 'javier@archivio00.it', roles: ['USER', 'ADMIN'] });

  it('token firmato con un altro segreto => 401', async () => {
    const falso = await new JwtService({ secret: 'un-altro-segreto-un-altro-segreto-0123456789' }).signAsync(claim(), { expiresIn: '1h' });
    await http.get('/api/preferiti').set(bearer(falso)).expect(401);
    await http.get('/api/oggetti/statistiche').set(bearer(falso)).expect(401);
  });

  it('token con alg "none" (senza firma) => 401', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const senzaFirma = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...claim(), exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
    await http.get('/api/preferiti').set(bearer(senzaFirma)).expect(401);
    await http.get('/api/oggetti/statistiche').set(bearer(senzaFirma)).expect(401);
  });

  it('token scaduto => 401', async () => {
    const secret = app.get(ConfigService<Env, true>).get('JWT_SECRET');
    const scaduto = await new JwtService({ secret }).signAsync(claim(), { expiresIn: '-10s' });
    await http.get('/api/preferiti').set(bearer(scaduto)).expect(401);
  });

  it('token valido ma utente inesistente => 401', async () => {
    const secret = app.get(ConfigService<Env, true>).get('JWT_SECRET');
    const orfano = await new JwtService({ secret }).signAsync({ ...claim(), sub: randomUUID() }, { expiresIn: '1h' });
    await http.get('/api/preferiti').set(bearer(orfano)).expect(401);
  });
});

describe('seed', () => {
  const conta = async () => {
    const [o, u, a, r] = await Promise.all(
      ['oggetti', 'utenti', 'assets', 'roles'].map(async (t) => Number((await dataSource.query(`SELECT count(*)::int AS n FROM ${t}`))[0].n)),
    );
    return { oggetti: o, utenti: u, assets: a, roles: r };
  };

  it('eseguirlo due volte non duplica nulla', async () => {
    const prima = await conta();
    await eseguiSeed(dataSource, { utentiDemo: true });
    await eseguiSeed(dataSource, { utentiDemo: true });
    expect(await conta()).toEqual(prima);
  });

  it('non sovrascrive le modifiche di un admin a un capo del seed', async () => {
    const [{ id }] = await dataSource.query(`SELECT id FROM oggetti WHERE seed_key = 'beckham-denim'`);
    const corpo = { nome: 'Beckham Rinominato', prezzo: 1, prezzoAcquisto: 1, fornitore: 'F', pubblicato: true, inEvidenza: true };
    await http.put(`/api/oggetti/${id}`).set(bearer(tokenAdmin)).send(corpo).expect(200);
    await eseguiSeed(dataSource, { utentiDemo: true });
    const res = await http.get(`/api/oggetti/${id}`).expect(200);
    expect(res.body.nome).toBe('Beckham Rinominato');
    expect(await dataSource.query(`SELECT 1 FROM oggetti WHERE seed_key = 'beckham-denim'`)).toHaveLength(1);
  });

  it('ricrea l\'asset principale mancante di un capo', async () => {
    const [{ id }] = await dataSource.query(`SELECT id FROM oggetti WHERE seed_key = 'cargo-denim'`);
    await dataSource.query('DELETE FROM assets WHERE oggetto_id = $1', [id]);
    await eseguiSeed(dataSource, { utentiDemo: true });
    const asset = await dataSource.query('SELECT url, versione, principale FROM assets WHERE oggetto_id = $1', [id]);
    expect(asset).toEqual([{ url: '/assets/products/cargo-denim.jpg', versione: 1, principale: true }]);
  });
});

describe('sicurezza', () => {
  it('header di sicurezza presenti e nessun X-Powered-By', async () => {
    const res = await http.get('/api/oggetti').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('byte NUL nella ricerca o nel nome => 400, non 500', async () => {
    await http.get('/api/oggetti?q=%00').expect(400);
    await http.post('/api/oggetti').set(bearer(tokenAdmin)).send(bodyCapo({ nome: 'Capo\u0000nul' })).expect(400);
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.example/x.jpg', 'ftp://x/y.jpg', 'file:///etc/passwd'])(
    'immagineUrl con schema non ammesso (%s) => 400',
    async (immagineUrl) => {
      await http.post('/api/oggetti').set(bearer(tokenAdmin)).send(bodyCapo({ immagineUrl })).expect(400);
    },
  );

  it('immagineUrl http(s) e percorsi locali restano ammessi; il nome con <script> è salvato come testo', async () => {
    const capo = await creaCapo({ nome: `Capo <script>alert(1)</script> ${++contatore}`, immagineUrl: 'https://cdn.example.org/a.jpg' });
    expect(capo.immagineUrl).toBe('https://cdn.example.org/a.jpg');
    expect(capo.nome).toContain('<script>');
    await http.delete(`/api/oggetti/${capo.id}`).set(bearer(tokenAdmin)).expect(204);
  });

  it('un token con alg none o firmato con un altro segreto non dà accesso admin', async () => {
    const jwt = app.get(JwtService);
    const falso = await jwt.signAsync({ sub: idAdmin, roles: ['ADMIN'] }, { secret: 'un-altro-segreto-un-altro-segreto-0123456789' });
    await http.get('/api/oggetti/statistiche').set(bearer(falso)).expect(401);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: idAdmin, roles: ['ADMIN'] })}.`;
    await http.get('/api/oggetti/statistiche').set(bearer(none)).expect(401);
  });
});
