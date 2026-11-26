import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { Utente } from '../utenti/utente.entity.js';
import type { UtentiService } from '../utenti/utenti.service.js';
import { AuthService } from './auth.service.js';

function creaServizio(utente: Utente | null) {
  const utenti = {
    trovaPerEmail: vi.fn().mockResolvedValue(utente),
    crea: vi.fn().mockImplementation(async (dati) => ({ id: 'id-1', enabled: true, roles: [{ name: 'USER' }], ...dati })),
    comeResponse: (u: Utente) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, roles: u.roles.map((r) => r.name) }),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('token-finto') };
  return { service: new AuthService(utenti as unknown as UtentiService, jwt as unknown as JwtService), utenti, jwt };
}

describe('AuthService', () => {
  it('login: credenziali corrette → token e utente senza password', async () => {
    const utente = { id: 'u1', email: 'a@b.it', firstName: 'A', lastName: 'B', enabled: true, password: await bcrypt.hash('segreta123', 4), roles: [{ name: 'USER' }] } as Utente;
    const { service, jwt } = creaServizio(utente);
    const risposta = await service.login({ email: 'a@b.it', password: 'segreta123' });
    expect(risposta.token).toBe('token-finto');
    expect(risposta.user).toEqual({ id: 'u1', email: 'a@b.it', firstName: 'A', lastName: 'B', roles: ['USER'] });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.it', roles: ['USER'] });
  });

  it('login: password errata, utente inesistente o disabilitato → 401 identico', async () => {
    const hash = await bcrypt.hash('giusta', 4);
    const casi: (Utente | null)[] = [
      { id: 'u', email: 'a@b.it', enabled: true, password: hash, roles: [] } as unknown as Utente,
      null,
      { id: 'u', email: 'a@b.it', enabled: false, password: hash, roles: [] } as unknown as Utente,
    ];
    for (const utente of casi) {
      const { service } = creaServizio(utente);
      await expect(service.login({ email: 'a@b.it', password: 'sbagliata' })).rejects.toBeInstanceOf(UnauthorizedException);
    }
    const { service } = creaServizio(casi[2]);
    await expect(service.login({ email: 'a@b.it', password: 'giusta' })).rejects.toThrow('Credenziali non valide');
  });

  it('register: salva una password hashata, mai in chiaro', async () => {
    const { service, utenti } = creaServizio(null);
    await service.register({ username: 'mario', email: 'm@x.it', password: 'password123', firstName: 'M', lastName: 'R' });
    const salvato = utenti.crea.mock.calls[0][0];
    expect(salvato.password).not.toBe('password123');
    expect(await bcrypt.compare('password123', salvato.password)).toBe(true);
  });

  it('register: propaga il conflitto per username/email già usati', async () => {
    const { service, utenti } = creaServizio(null);
    utenti.crea.mockRejectedValue(new ConflictException('Username o email già registrati'));
    await expect(service.register({ username: 'm', email: 'm@x.it', password: 'password123', firstName: 'M', lastName: 'R' })).rejects.toBeInstanceOf(ConflictException);
  });
});
