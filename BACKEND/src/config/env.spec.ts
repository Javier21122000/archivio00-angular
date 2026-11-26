import { validateEnv } from './env.js';

const base = { JWT_SECRET: 'a'.repeat(40) };

describe('validateEnv', () => {
  it('applica i valori di default', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.DB_NAME).toBe('archivio00_angular');
    expect(env.SEED_DEMO_USERS).toBe(true);
  });
  it('rifiuta un JWT_SECRET mancante o corto', () => {
    expect(() => validateEnv({})).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ JWT_SECRET: 'corto' })).toThrow(/32/);
  });
  it('in produzione spegne il seed demo e vieta il segreto di esempio', () => {
    expect(validateEnv({ ...base, NODE_ENV: 'production' }).SEED_DEMO_USERS).toBe(false);
    expect(() => validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'change-me-' + 'x'.repeat(30) })).toThrow(/produzione/);
  });
  it('rifiuta NODE_ENV e porte non validi', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow(/PORT/);
  });
});
