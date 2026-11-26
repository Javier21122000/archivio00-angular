import { existsSync } from 'node:fs';

/** Carica `.env` quando si lancia uno script fuori da Nest (migration, seed). */
export function loadEnvFile(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
