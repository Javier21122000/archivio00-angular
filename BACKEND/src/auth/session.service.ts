import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser } from '../common/auth-user.js';
import { UtentiService } from '../utenti/utenti.service.js';

/**
 * Trasforma l'header `Authorization: Bearer …` in un AuthUser.
 * Il token prova solo CHI sei: i ruoli vengono riletti dal database a ogni richiesta,
 * perciò revocare ADMIN ha effetto subito, anche se il token non è ancora scaduto.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly utenti: UtentiService,
  ) {}

  async risolvi(request: Request): Promise<AuthUser | null> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7), { algorithms: ['HS256'] });
      const utente = await this.utenti.trovaPerId(payload.sub);
      if (!utente?.enabled) return null;
      return { id: utente.id, email: utente.email, roles: utente.roles.map((r) => r.name) };
    } catch {
      return null; // firma errata, token scaduto o malformato
    }
  }
}
