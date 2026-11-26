import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

/**
 * Il limite va impostato PRIMA di importare AppModule (ConfigModule legge l'ambiente all'import),
 * quindi questo file è separato da api.e2e-spec.ts, che usa un limite largo.
 */
process.env['AUTH_RATE_LIMIT'] = '5';

if (!process.env['DB_NAME']?.endsWith('_test') || process.env['DATABASE_URL']) {
  throw new Error('I test e2e richiedono DB_NAME che termina con _test e nessun DATABASE_URL.');
}

let app: INestApplication;

beforeAll(async () => {
  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/app.setup.js');
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = modulo.createNestApplication();
  configureApp(app, modulo.get(ConfigService).getOrThrow<string>('FRONTEND_ORIGIN'));
  await app.init();
  await app.get(DataSource).runMigrations();
});

afterAll(async () => {
  await app?.close();
});

describe('rate limit su /auth', () => {
  it('dopo 5 login falliti dallo stesso IP risponde 429', async () => {
    const http = request(app.getHttpServer());
    const credenziali = { email: 'nessuno@esempio.it', password: 'sbagliata123' };
    for (let i = 0; i < 5; i++) await http.post('/api/auth/login').send(credenziali).expect(401);
    const res = await http.post('/api/auth/login').send(credenziali).expect(429);
    expect(res.body.statusCode).toBe(429);
  });

  it('le rotte pubbliche del catalogo non sono limitate', async () => {
    const http = request(app.getHttpServer());
    for (let i = 0; i < 8; i++) await http.get('/api/oggetti').expect(200);
  });
});
