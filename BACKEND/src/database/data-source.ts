import type { DataSourceOptions } from 'typeorm';
import { Asset } from '../assets/asset.entity.js';
import { Oggetto } from '../oggetti/oggetto.entity.js';
import { Preferito } from '../preferiti/preferito.entity.js';
import { Role } from '../utenti/role.entity.js';
import { Utente } from '../utenti/utente.entity.js';
import { InitialSchema1764000000000 } from './migrations/1764000000000-InitialSchema.js';
import type { Env } from '../config/env.js';

export const ENTITIES = [Role, Utente, Oggetto, Preferito, Asset];
export const MIGRATIONS = [InitialSchema1764000000000];

/**
 * Unica definizione della connessione, usata sia dall'app Nest (TypeOrmModule)
 * sia dagli script di migration e seed.
 * `synchronize` è SEMPRE false: lo schema cambia solo tramite migration.
 */
export function buildDataSourceOptions(env: Pick<Env, 'DATABASE_URL' | 'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_SSL'>): DataSourceOptions {
  return {
    type: 'postgres',
    ...(env.DATABASE_URL
      ? { url: env.DATABASE_URL }
      : { host: env.DB_HOST, port: env.DB_PORT, username: env.DB_USER, password: env.DB_PASSWORD || undefined, database: env.DB_NAME }),
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize: false,
    migrationsRun: false,
    uuidExtension: 'pgcrypto',
  };
}
