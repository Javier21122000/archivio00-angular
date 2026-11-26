import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResponse } from '../models';
import { AuthService, normalizeRoles } from './auth.service';

const adminSession: AuthResponse = {
  token: 'jwt',
  user: { id: '1', email: 'a@b.it', firstName: 'Ada', lastName: 'L', roles: ['USER', 'ADMIN'] },
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  it('parte da Guest (livello 1)', () => {
    expect(service.user()).toBeNull();
    expect(service.level()).toBe(1);
    expect(service.isAdmin()).toBe(false);
  });

  it('normalizza i ruoli e ignora quelli sconosciuti', () => {
    expect(normalizeRoles(['USER', 'ROLE_ADMIN', 'BOH'])).toEqual(['ROLE_USER', 'ROLE_ADMIN']);
  });

  it('il login imposta la sessione: admin => livello 3', () => {
    service.login({ email: 'a@b.it', password: 'x' }).subscribe();
    http.expectOne('/api/auth/login').flush(adminSession);
    expect(service.token()).toBe('jwt');
    expect(service.isAdmin()).toBe(true);
    expect(service.level()).toBe(3);
  });

  it('un utente semplice e a livello 2, clearSession torna a 1', () => {
    service.setSession({ ...adminSession, user: { ...adminSession.user, roles: ['USER'] } });
    expect(service.level()).toBe(2);
    service.clearSession();
    expect(service.level()).toBe(1);
    expect(service.token()).toBeNull();
  });

  it('il logout chiude subito la sessione locale', () => {
    service.setSession(adminSession);
    service.logout().subscribe();
    expect(service.user()).toBeNull();
    http.expectOne('/api/auth/logout').flush(null);
  });
});
