import { BadRequestException, ValidationError, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';

/** Raccoglie gli errori di class-validator in { campo: messaggio }. */
function raccogliDettagli(errors: ValidationError[], prefisso = ''): Record<string, string> {
  const details: Record<string, string> = {};
  for (const error of errors) {
    const campo = prefisso + error.property;
    if (error.constraints) details[campo] = Object.values(error.constraints)[0] ?? 'valore non valido';
    if (error.children?.length) Object.assign(details, raccogliDettagli(error.children, `${campo}.`));
  }
  return details;
}

/**
 * Configurazione condivisa da main.ts e dai test e2e, così i test
 * esercitano la stessa pipeline di validazione e di errori della produzione.
 */
export function configureApp(app: INestApplication, frontendOrigin: string, trustProxy = 0): void {
  // Header di sicurezza (nosniff, no-referrer, CSP restrittiva...) e niente "X-Powered-By: Express".
  app.use(helmet());
  const express = app as NestExpressApplication;
  if (trustProxy > 0) express.set('trust proxy', trustProxy);
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ message: 'Validation failed', details: raccogliDettagli(errors) }),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: frontendOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
