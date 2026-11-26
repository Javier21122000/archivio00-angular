import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../common/security.js';
import type { Utente } from '../utenti/utente.entity.js';
import { UtentiService, type UtenteResponse } from '../utenti/utenti.service.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';

export interface AuthResponse {
  token: string;
  user: UtenteResponse;
}

// Hash fittizio: il confronto avviene anche per email sconosciute, così il tempo di risposta non rivela se l'account esiste.
const HASH_FITTIZIO = bcrypt.hashSync('hash-fittizio', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly utenti: UtentiService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const utente = await this.utenti.crea({
      username: dto.username,
      email: dto.email,
      password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    return this.risposta(utente);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const utente = await this.utenti.trovaPerEmail(dto.email);
    const valida = await bcrypt.compare(dto.password, utente?.password ?? HASH_FITTIZIO);
    if (!utente || !valida || !utente.enabled) throw new UnauthorizedException('Credenziali non valide');
    return this.risposta(utente);
  }

  private async risposta(utente: Utente): Promise<AuthResponse> {
    const user = this.utenti.comeResponse(utente);
    const token = await this.jwt.signAsync({ sub: utente.id, email: utente.email, roles: user.roles });
    return { token, user };
  }
}
