import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowUpRight, LucideCheck, LucideGlobe, LucideHeart, LucideLoaderCircle, LucideLogOut, LucideShieldCheck,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { testCredentials } from '../../environments/test-credentials';
import { AuthService } from '../core/services/auth.service';
import { UiService } from '../core/services/ui.service';
import { errorMessage } from '../core/util/api-error';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'app-access-drawer',
  imports: [ModalComponent, LucideArrowUpRight, LucideCheck, LucideGlobe, LucideHeart, LucideLoaderCircle, LucideLogOut, LucideShieldCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Tre livelli. Un archivio." [drawer]="true" (closed)="ui.setTestDrawer(false)">
      <p class="muted mb-8">Prova gli accessi e osserva come cambia la tua esperienza.</p>
      <div class="access-levels">
        @for (l of levels; track l.n) {
          <div class="access-level" [class.active]="auth.level() === l.n">
            <div class="flex items-center justify-between">
              <span class="eyebrow">LIVELLO 0{{ l.n }}</span>
              @if (auth.level() === l.n) { <svg lucideCheck [size]="18"></svg> }
              @else if (l.n === 1) { <svg lucideGlobe [size]="18"></svg> }
              @else if (l.n === 2) { <svg lucideHeart [size]="18"></svg> }
              @else { <svg lucideShieldCheck [size]="18"></svg> }
            </div>
            <h3>{{ l.title }}</h3>
            <p>{{ l.text }}</p>
          </div>
        }
      </div>
      <div class="test-actions">
        <span class="eyebrow">ACCESSO RAPIDO · ACCOUNT REALI</span>
        <button type="button" class="button button-dark" [disabled]="busy() !== null" (click)="quickLogin('admin')">
          @if (busy() === 'admin') { <svg lucideLoaderCircle class="animate-spin" [size]="18"></svg> } @else { <svg lucideShieldCheck [size]="18"></svg> }
          Accedi come Admin (Javier)<svg lucideArrowUpRight [size]="18"></svg>
        </button>
        <button type="button" class="button button-outline" [disabled]="busy() !== null" (click)="quickLogin('user')">
          @if (busy() === 'user') { <svg lucideLoaderCircle class="animate-spin" [size]="18"></svg> } @else { <svg lucideHeart [size]="18"></svg> }
          Accedi come Utente Standard
        </button>
        @if (auth.user()) {
          <button type="button" class="text-button" (click)="logout()"><svg lucideLogOut [size]="16"></svg>Logout</button>
        } @else {
          <button type="button" class="text-button" (click)="ui.openAuth('register')">Registrati</button>
        }
      </div>
      @if (auth.user(); as user) {
        <div class="session-details">
          <span class="eyebrow">SESSIONE ATTUALE</span>
          <strong>{{ user.firstName }} {{ user.lastName }}</strong>
          <span>{{ user.email }}</span>
          <code>{{ rolesLabel() }}</code>
          <span class="break-all">ID: {{ user.id }}</span>
        </div>
      }
      <p class="form-note mt-6">I pulsanti eseguono un login reale: i ruoli non vengono assegnati dal browser. Il backend filtra i dati e autorizza ogni operazione.</p>
    </app-modal>
  `,
})
export class AccessDrawerComponent {
  protected readonly auth = inject(AuthService);
  protected readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly busy = signal<'admin' | 'user' | null>(null);
  protected readonly rolesLabel = computed(() => this.auth.roles().join(' · '));
  protected readonly levels = [
    { n: 1, title: 'Vetrina pubblica', text: 'Solo capi pubblicati, nome e prezzo. Nessun dato riservato.' },
    { n: 2, title: 'Il tuo archivio', text: 'Salva i preferiti. Ogni account ritrova soltanto la propria selezione.' },
    { n: 3, title: 'Dietro le quinte', text: 'Bozze, costi, fornitori e gestione del catalogo e dei ruoli.' },
  ];

  protected quickLogin(profile: 'admin' | 'user'): void {
    this.busy.set(profile);
    this.auth
      .login(testCredentials[profile])
      .pipe(finalize(() => this.busy.set(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.ui.notify(`Accesso effettuato: ${s.user.firstName}.`),
        error: (err: unknown) => this.ui.notify(errorMessage(err), true),
      });
  }

  protected logout(): void {
    this.ui.notify('Hai effettuato il logout.');
    // La sessione locale e' gia' chiusa: se la chiamata fallisce non cambia nulla per l'utente.
    this.auth.logout().subscribe({ error: () => undefined });
  }
}
