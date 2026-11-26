import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema iniziale: crea le tabelle oggetti, utenti, roles, utente_ruoli, preferiti
 * e assets (base per la futura gestione degli asset digitali, DAM).
 * Lo schema è scritto in modo esplicito e versionato: ogni modifica passa da una migration.
 */
export class InitialSchema1764000000000 implements MigrationInterface {
  name = 'InitialSchema1764000000000';

  async up(q: QueryRunner): Promise<void> {
    // Ricerca parziale veloce (ILIKE '%testo%') tramite indici trigramma.
    await q.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await q.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(30) NOT NULL,
        CONSTRAINT uk_roles_name UNIQUE (name)
      )`);

    await q.query(`
      CREATE TABLE utenti (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(80) NOT NULL,
        email varchar(160) NOT NULL,
        password varchar(255) NOT NULL,
        first_name varchar(80) NOT NULL,
        last_name varchar(80) NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        CONSTRAINT uk_utente_username UNIQUE (username),
        CONSTRAINT uk_utente_email UNIQUE (email)
      )`);
    // Unicità case-insensitive: "Mario@x.it" e "mario@x.it" sono lo stesso account.
    await q.query(`CREATE UNIQUE INDEX uk_utente_email_lower ON utenti (lower(email))`);
    await q.query(`CREATE UNIQUE INDEX uk_utente_username_lower ON utenti (lower(username))`);

    await q.query(`
      CREATE TABLE utente_ruoli (
        utente_id uuid NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (utente_id, role_id)
      )`);
    await q.query(`CREATE INDEX idx_utente_ruoli_role ON utente_ruoli (role_id)`);

    await q.query(`
      CREATE TABLE oggetti (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome varchar(180) NOT NULL,
        prezzo numeric(6,2) NOT NULL CHECK (prezzo >= 0),
        prezzo_acquisto numeric(6,2) NOT NULL CHECK (prezzo_acquisto >= 0),
        fornitore varchar(180) NOT NULL,
        pubblicato boolean NOT NULL DEFAULT false,
        in_evidenza boolean NOT NULL DEFAULT false,
        special_edition boolean NOT NULL DEFAULT false,
        rating integer NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
        numero_recensioni integer NOT NULL DEFAULT 0 CHECK (numero_recensioni >= 0),
        categoria varchar(80) NOT NULL DEFAULT '',
        variante varchar(80) NOT NULL DEFAULT '',
        seed_key varchar(100),
        immagine_url varchar(500) NOT NULL DEFAULT '/assets/products/unavailable.svg',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uk_oggetto_seed_key UNIQUE (seed_key)
      )`);
    // Stesso nome con varianti diverse è lecito (camicie a righe, felpe Oldculture).
    await q.query(`CREATE UNIQUE INDEX uk_oggetto_nome_variante ON oggetti (lower(nome), lower(variante))`);
    // Ordinamento "archivio" del catalogo pubblico: in evidenza prima, poi i più recenti.
    await q.query(
      `CREATE INDEX idx_oggetti_catalogo ON oggetti (pubblicato, in_evidenza DESC, created_at DESC)`,
    );
    await q.query(`CREATE INDEX idx_oggetti_categoria ON oggetti (categoria)`);
    await q.query(`CREATE INDEX idx_oggetti_prezzo ON oggetti (prezzo)`);
    await q.query(`CREATE INDEX idx_oggetti_special ON oggetti (special_edition) WHERE special_edition`);
    await q.query(`CREATE INDEX idx_oggetti_nome_trgm ON oggetti USING gin (nome gin_trgm_ops)`);
    await q.query(`CREATE INDEX idx_oggetti_variante_trgm ON oggetti USING gin (variante gin_trgm_ops)`);

    await q.query(`
      CREATE TABLE preferiti (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        utente_id uuid NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
        oggetto_id uuid NOT NULL REFERENCES oggetti(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uk_preferito_utente_oggetto UNIQUE (utente_id, oggetto_id)
      )`);
    // L'indice unico copre le ricerche per utente; questo serve alla cancellazione a cascata dei capi.
    await q.query(`CREATE INDEX idx_preferiti_oggetto ON preferiti (oggetto_id)`);

    await q.query(`
      CREATE TABLE assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        oggetto_id uuid NOT NULL REFERENCES oggetti(id) ON DELETE CASCADE,
        tipo varchar(10) NOT NULL DEFAULT 'IMAGE' CHECK (tipo IN ('IMAGE', 'VIDEO')),
        url varchar(500) NOT NULL,
        principale boolean NOT NULL DEFAULT false,
        ordine integer NOT NULL DEFAULT 0,
        stato varchar(15) NOT NULL DEFAULT 'APPROVED'
          CHECK (stato IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
        versione integer NOT NULL DEFAULT 1,
        metadati jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX idx_assets_oggetto ON assets (oggetto_id, ordine)`);
    // Al massimo un asset principale per capo.
    await q.query(`CREATE UNIQUE INDEX uk_asset_principale ON assets (oggetto_id) WHERE principale`);
    await q.query(`CREATE INDEX idx_assets_metadati ON assets USING gin (metadati)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS assets`);
    await q.query(`DROP TABLE IF EXISTS preferiti`);
    await q.query(`DROP TABLE IF EXISTS oggetti`);
    await q.query(`DROP TABLE IF EXISTS utente_ruoli`);
    await q.query(`DROP TABLE IF EXISTS utenti`);
    await q.query(`DROP TABLE IF EXISTS roles`);
  }
}
