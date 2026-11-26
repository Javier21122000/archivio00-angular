import { DataSource } from 'typeorm';
import { loadEnvFile } from '../config/load-env.js';
import { validateEnv } from '../config/env.js';
import { buildDataSourceOptions } from './data-source.js';
import { eseguiSeed } from './seed/seed.service.js';

loadEnvFile();
const env = validateEnv(process.env);
const dataSource = new DataSource(buildDataSourceOptions(env));
await dataSource.initialize();
try {
  await eseguiSeed(dataSource, { utentiDemo: env.SEED_DEMO_USERS });
} finally {
  await dataSource.destroy();
}
