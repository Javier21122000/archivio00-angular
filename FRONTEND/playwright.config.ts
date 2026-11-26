import { defineConfig, devices } from '@playwright/test';

// Gli e2e girano contro `ng serve` (4200), che inoltra /api al backend NestJS su :3000.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4200', trace: 'off', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  // Usa i server gia' attivi (4200 e backend 3000); se 4200 non c'e', lo avvia.
  webServer: { command: 'npx ng serve --port 4200', url: 'http://localhost:4200', reuseExistingServer: true, timeout: 180_000 },
});
