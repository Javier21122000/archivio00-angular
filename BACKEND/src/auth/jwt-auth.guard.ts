import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../common/auth-user.js';
import { SessionService } from './session.service.js';

export type RichiestaAutenticata = Request & { user?: AuthUser };

/** Richiede un token valido: altrimenti 401. (≈ anyRequest().authenticated()) */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly sessione: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RichiestaAutenticata>();
    const utente = await this.sessione.risolvi(request);
    if (!utente) throw new UnauthorizedException('Autenticazione richiesta');
    request.user = utente;
    return true;
  }
}

/** Per le rotte pubbliche che cambiano risposta se c'è un admin: un token assente o non valido = visitatore. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly sessione: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RichiestaAutenticata>();
    const utente = await this.sessione.risolvi(request);
    if (utente) request.user = utente;
    return true;
  }
}
