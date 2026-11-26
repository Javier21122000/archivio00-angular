import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, Role, User } from '../models';

/**
 * Il backend manda "ADMIN"/"USER". Qui li riportiamo a un unico formato ROLE_*,
 * così il resto dell'app confronta sempre la stessa stringa; i ruoli sconosciuti vengono scartati.
 */
export function normalizeRoles(roles: string[]): Role[] {
  return roles.flatMap((role) => {
    const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return normalized === 'ROLE_ADMIN' || normalized === 'ROLE_USER' ? [normalized] : [];
  });
}

/**
 * Stato di autenticazione. La sessione vive SOLO in memoria (niente localStorage):
 * a ogni caricamento l'app riparte da Guest, così un token rubato non sopravvive al ricaricamento della pagina.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly user = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly roles = computed(() => normalizeRoles(this.user()?.roles ?? []));
  readonly isAdmin = computed(() => this.roles().includes('ROLE_ADMIN'));
  /** 1 = pubblico, 2 = utente, 3 = admin. */
  readonly level = computed<1 | 2 | 3>(() => (this.isAdmin() ? 3 : this.user() ? 2 : 1));

  login(input: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', input).pipe(tap((s) => this.setSession(s)));
  }

  register(input: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', input).pipe(tap((s) => this.setSession(s)));
  }

  /** Il JWT e' stateless: la chiamata e' solo cortesia, la sessione locale si chiude subito. */
  logout(): Observable<unknown> {
    const request = this.http.post('/api/auth/logout', null);
    this.clearSession();
    return request;
  }

  setSession({ user, token }: AuthResponse): void {
    this.user.set(user);
    this.token.set(token);
  }

  clearSession(): void {
    this.user.set(null);
    this.token.set(null);
  }
}
