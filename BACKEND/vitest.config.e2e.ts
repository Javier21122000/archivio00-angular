import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// I test e2e usano un database SEPARATO (archivio00_angular_test): lo schema viene ricreato a ogni esecuzione.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      DB_NAME: 'archivio00_angular_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-0123456789',
      SEED_DEMO_USERS: 'true',
    },
  },
});
