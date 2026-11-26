import { Injectable, signal } from '@angular/core';

export type AuthMode = 'login' | 'register' | 'admin' | 'user';
export interface Toast {
  message: string;
  error: boolean;
}

/** Stato di interfaccia condiviso: modale di accesso, drawer e notifica (toast). */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly authMode = signal<AuthMode | null>(null);
  readonly testDrawer = signal(false);
  readonly toast = signal<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  openAuth(mode: AuthMode = 'login'): void {
    this.authMode.set(mode);
    this.testDrawer.set(false);
  }

  closeAuth(): void {
    this.authMode.set(null);
  }

  setTestDrawer(open: boolean): void {
    this.testDrawer.set(open);
  }

  /** Mostra un toast; sparisce da solo (piu' tardi se e' un errore, da leggere con calma). */
  notify(message: string, error = false): void {
    clearTimeout(this.timer);
    this.toast.set({ message, error });
    this.timer = setTimeout(() => this.clearToast(), error ? 8000 : 4500);
  }

  clearToast(): void {
    clearTimeout(this.timer);
    this.toast.set(null);
  }
}
