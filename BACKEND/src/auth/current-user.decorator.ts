import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user.js';
import type { RichiestaAutenticata } from './jwt-auth.guard.js';

/** Inietta l'utente autenticato nel parametro del metodo (valorizzato dalla guard JWT). */
export const CurrentUser = createParamDecorator((_dati: unknown, context: ExecutionContext): AuthUser | undefined =>
  context.switchToHttp().getRequest<RichiestaAutenticata>().user,
);
