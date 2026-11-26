import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RichiestaAutenticata } from './jwt-auth.guard.js';

const ROLES_KEY = 'ruoli';

/** @Roles('ADMIN') limita una rotta a chi ha quel ruolo. Va usato insieme a JwtAuthGuard. */
export const Roles = (...ruoli: string[]) => SetMetadata(ROLES_KEY, ruoli);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const richiesti = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!richiesti?.length) return true;
    const utente = context.switchToHttp().getRequest<RichiestaAutenticata>().user;
    if (!utente || !richiesti.some((ruolo) => utente.roles.includes(ruolo))) {
      throw new ForbiddenException('Accesso negato');
    }
    return true;
  }
}
