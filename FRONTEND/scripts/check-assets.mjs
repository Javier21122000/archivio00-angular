// Verifica che ogni immagine/video citato in src/app/data esista in public/.
// Uso: node scripts/check-assets.mjs  (exit code 1 se manca qualcosa)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = 'src/app/data';
const riferimenti = new Set();
for (const file of readdirSync(dataDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))) {
  const testo = readFileSync(join(dataDir, file), 'utf8');
  for (const m of testo.matchAll(/['"`](\/(?:images|videos|assets)\/[^'"`\s]+)['"`]/g)) riferimenti.add(m[1]);
}

const mancanti = [...riferimenti].filter((p) => !existsSync(join('public', p)));
console.log(`${riferimenti.size} riferimenti controllati, ${mancanti.length} mancanti`);
for (const p of mancanti) console.log(`  MANCANTE: public${p}`);
process.exit(mancanti.length ? 1 : 0);
