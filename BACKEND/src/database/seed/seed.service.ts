import { Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { DataSource, EntityManager } from 'typeorm';
import { BCRYPT_ROUNDS } from '../../common/security.js';
import { Oggetto } from '../../oggetti/oggetto.entity.js';
import { Role, type NomeRuolo } from '../../utenti/role.entity.js';
import { Utente } from '../../utenti/utente.entity.js';
import { CATALOGO_SEED, UTENTI_DEMO } from './catalogo.seed.js';

/**
 * Seed idempotente: puoi lanciarlo quante volte vuoi senza creare duplicati.
 *  - ruoli e utenti: creati solo se mancano;
 *  - capi: identificati dalla `seed_key`, quindi un capo già presente (anche rinominato
 *    o modificato da un admin) non viene mai toccato né duplicato;
 *  - asset principale: creato solo per i capi che non ne hanno ancora uno.
 */
export async function eseguiSeed(dataSource: DataSource, opzioni: { utentiDemo: boolean }): Promise<void> {
  const log = new Logger('Seed');
  await dataSource.transaction(async (em) => {
    const ruoli = await assicuraRuoli(em);
    if (opzioni.utentiDemo) await assicuraUtentiDemo(em, ruoli, log);
    await assicuraCatalogo(em, log);
  });
  log.log('Seed completato');
}

async function assicuraRuoli(em: EntityManager): Promise<Record<NomeRuolo, Role>> {
  const risultato = {} as Record<NomeRuolo, Role>;
  for (const name of ['USER', 'ADMIN'] as const) {
    risultato[name] = (await em.findOneBy(Role, { name })) ?? (await em.save(em.create(Role, { name })));
  }
  return risultato;
}

async function assicuraUtentiDemo(em: EntityManager, ruoli: Record<NomeRuolo, Role>, log: Logger): Promise<void> {
  for (const demo of UTENTI_DEMO) {
    const esiste = await em
      .createQueryBuilder(Utente, 'u')
      .where('lower(u.email) = :email OR lower(u.username) = :username', {
        email: demo.email.toLowerCase(),
        username: demo.username.toLowerCase(),
      })
      .getExists();
    if (esiste) continue;
    await em.save(
      em.create(Utente, {
        username: demo.username,
        email: demo.email.toLowerCase(),
        password: await bcrypt.hash(demo.password, BCRYPT_ROUNDS),
        firstName: demo.firstName,
        lastName: demo.lastName,
        enabled: true,
        roles: demo.admin ? [ruoli.USER, ruoli.ADMIN] : [ruoli.USER],
      }),
    );
    log.log(`Utente demo creato: ${demo.email}`);
  }
}

async function assicuraCatalogo(em: EntityManager, log: Logger): Promise<void> {
  // Le date partono da un'epoca fissa e crescono di un secondo per capo: l'ordine
  // "più recenti prima" resta quello del catalogo e non dipende dal momento del seed.
  const base = Date.parse('2025-09-22T10:00:00Z');
  let creati = 0;
  for (const [indice, seed] of CATALOGO_SEED.entries()) {
    if (await em.existsBy(Oggetto, { seedKey: seed.key })) continue;
    // Stesso nome+variante già inserito a mano: non si duplica (vincolo di unicità).
    const omonimo = await em
      .createQueryBuilder(Oggetto, 'o')
      .where('lower(o.nome) = :nome AND lower(o.variante) = :variante', {
        nome: seed.nome.toLowerCase(),
        variante: seed.variante.toLowerCase(),
      })
      .getExists();
    if (omonimo) continue;
    await em.save(
      em.create(Oggetto, {
        nome: seed.nome,
        categoria: seed.categoria,
        variante: seed.variante,
        prezzo: seed.prezzo,
        prezzoAcquisto: Math.round(seed.prezzo * 0.35),
        fornitore: 'Archivio 00 Studio',
        pubblicato: true,
        inEvidenza: seed.featured,
        specialEdition: seed.special,
        rating: seed.rating,
        numeroRecensioni: seed.recensioni,
        seedKey: seed.key,
        immagineUrl: `/assets/products/${seed.key}.jpg`,
        createdAt: new Date(base + indice * 1000),
      }),
    );
    creati++;
  }
  log.log(`Catalogo: ${creati} capi creati, ${CATALOGO_SEED.length - creati} già presenti`);
  await assicuraAssetPrincipali(em);
}

/** Un asset principale per ogni capo che ne è privo (backfill idempotente). */
async function assicuraAssetPrincipali(em: EntityManager): Promise<void> {
  await em.query(
    `INSERT INTO assets (oggetto_id, tipo, url, principale, ordine, stato, metadati)
     SELECT o.id, 'IMAGE', o.immagine_url, true, 0, 'APPROVED', '{}'::jsonb
     FROM oggetti o
     WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.oggetto_id = o.id AND a.principale)`,
  );
}
