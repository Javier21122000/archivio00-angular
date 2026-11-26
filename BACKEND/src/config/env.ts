/**
 * Validazione delle variabili d'ambiente all'avvio.
 *
 * Un valore mancante o sbagliato (database, segreto JWT...) blocca subito l'avvio
 * con un messaggio chiaro, invece di fallire alla prima richiesta.
 */
export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  FRONTEND_ORIGIN: string;
  DATABASE_URL?: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SEED_DEMO_USERS: boolean;
  /** Tentativi massimi di login/registrazione per IP al minuto. */
  AUTH_RATE_LIMIT: number;
  /** Quanti proxy fidati stanno davanti all'API (Render: 1), per leggere l'IP vero del client. 0 = nessuno. */
  TRUST_PROXY: number;
}

const DEV_SECRET_PLACEHOLDER = 'change-me';

export function validateEnv(raw: Record<string, unknown>): Env {
  const str = (key: string, fallback?: string): string => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (fallback !== undefined) return fallback;
    throw new Error(`Variabile d'ambiente mancante: ${key}`);
  };
  const num = (key: string, fallback: number): number => {
    const parsed = Number(str(key, String(fallback)));
    if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${key} deve essere un intero positivo`);
    return parsed;
  };
  const bool = (key: string, fallback: boolean): boolean => str(key, String(fallback)).toLowerCase() === 'true';

  const nodeEnv = str('NODE_ENV', 'development');
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error('NODE_ENV deve essere development, production o test');
  }
  const jwtSecret = str('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET deve avere almeno 32 caratteri');
  if (nodeEnv === 'production' && jwtSecret.includes(DEV_SECRET_PLACEHOLDER)) {
    throw new Error('JWT_SECRET di esempio non ammesso in produzione');
  }

  return {
    NODE_ENV: nodeEnv as Env['NODE_ENV'],
    PORT: num('PORT', 3000),
    FRONTEND_ORIGIN: str('FRONTEND_ORIGIN', 'http://localhost:4200'),
    DATABASE_URL: typeof raw['DATABASE_URL'] === 'string' && raw['DATABASE_URL'] ? raw['DATABASE_URL'] : undefined,
    DB_HOST: str('DB_HOST', 'localhost'),
    DB_PORT: num('DB_PORT', 5432),
    DB_USER: str('DB_USER', process.env['USER'] ?? 'postgres'),
    DB_PASSWORD: typeof raw['DB_PASSWORD'] === 'string' ? raw['DB_PASSWORD'] : '',
    DB_NAME: str('DB_NAME', 'archivio00_angular'),
    DB_SSL: bool('DB_SSL', false),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', '24h'),
    // Il seed degli account dimostrativi è spento di default in produzione.
    SEED_DEMO_USERS: bool('SEED_DEMO_USERS', nodeEnv !== 'production'),
    AUTH_RATE_LIMIT: num('AUTH_RATE_LIMIT', 30),
    TRUST_PROXY: num('TRUST_PROXY', 0),
  };
}
