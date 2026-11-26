import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest usa esbuild, che non emette i metadati dei decoratori: serve SWC perché
// l'injection tramite tipo del costruttore (UtentiService, Repository…) funzioni nei test.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
