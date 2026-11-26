import { DataSource } from 'typeorm';
import { loadEnvFile } from '../config/load-env.js';
import { validateEnv } from '../config/env.js';
import { buildDataSourceOptions } from './data-source.js';

/**
 * Uso: `npm run db:migrate` (applica) · `npm run db:migrate -- revert` (annulla l'ultima)
 * · `npm run db:migrate -- show` (elenca lo stato).
 */
loadEnvFile();
const env = validateEnv(process.env);
const dataSource = new DataSource(buildDataSourceOptions(env));
const comando = process.argv[2] ?? 'run';

await dataSource.initialize();
try {
  if (comando === 'revert') await dataSource.undoLastMigration();
  else if (comando === 'show') console.log((await dataSource.showMigrations()) ? 'Ci sono migration da applicare' : 'Database aggiornato');
  else {
    const applicate = await dataSource.runMigrations();
    console.log(applicate.length ? `Applicate: ${applicate.map((m) => m.name).join(', ')}` : 'Nessuna migration da applicare');
  }
} finally {
  await dataSource.destroy();
}
