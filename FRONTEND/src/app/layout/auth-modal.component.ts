import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideArrowUpRight, LucideEye, LucideEyeOff, LucideLoaderCircle } from '@lucide/angular';
import { Observable, finalize } from 'rxjs';
import { testCredentials } from '../../environments/test-credentials';
import { AuthResponse } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { AuthMode, UiService } from '../core/services/ui.service';
import { errorMessage } from '../core/util/api-error';
import { ModalComponent } from '../shared/modal.component';

@Component({
  selector: 'app-auth-modal',
  imports: [ReactiveFormsModule, ModalComponent, LucideArrowUpRight, LucideEye, LucideEyeOff, LucideLoaderCircle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="register() ? 'Entra nell’archivio.' : 'Bentornato.'" (closed)="ui.closeAuth()">
      <p class="muted mb-7">{{ register() ? 'Un account, la tua selezione personale.' : 'Accedi per ritrovare i capi che vuoi tenere d’occhio.' }}</p>
      @if (mode() === 'admin' || mode() === 'user') {
        <p class="form-note mb-5">Profilo di test: {{ mode() === 'admin' ? 'Javier · amministratore' : 'utente standard' }}. I permessi vengono verificati dal server.</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack">
        @if (register()) {
          <div class="form-row">
            <label>Nome<input formControlName="firstName" maxlength="80" autocomplete="given-name" /></label>
            <label>Cognome<input formControlName="lastName" maxlength="80" autocomplete="family-name" /></label>
          </div>
          <label>Username<input formControlName="username" maxlength="80" autocomplete="username" /></label>
        }
        <label>Email<input formControlName="email" type="email" autocomplete="email" /></label>
        <label>Password
          <div class="password-field">
            <input formControlName="password" [type]="visible() ? 'text' : 'password'" maxlength="100" [autocomplete]="register() ? 'new-password' : 'current-password'" />
            <button type="button" [attr.aria-label]="visible() ? 'Nascondi password' : 'Mostra password'" (click)="visible.set(!visible())">
              @if (visible()) { <svg lucideEyeOff [size]="18"></svg> } @else { <svg lucideEye [size]="18"></svg> }
            </button>
          </div>
        </label>
        @if (error()) { <p role="alert" class="error-text">{{ error() }}</p> }
        <button type="submit" class="button button-dark w-full" [disabled]="busy()">
          @if (busy()) { <svg lucideLoaderCircle class="animate-spin" [size]="18"></svg> }
          @else { {{ register() ? 'Crea account' : 'Accedi' }}<svg lucideArrowUpRight [size]="19"></svg> }
        </button>
      </form>
      @if (!register()) {
        <div class="quick-auth-box">
          <span class="eyebrow">DEV / TEST LOGIN</span>
          <p class="form-note">Esplora l’archivio con un profilo di prova.</p>
          <div class="quick-auth-buttons">
            <button type="button" [disabled]="busy()" (click)="testLogin('user')">LOGIN TEST UTENTE</button>
            <button type="button" [disabled]="busy()" (click)="testLogin('admin')">LOGIN TEST ADMIN</button>
          </div>
        </div>
      }
      <p class="auth-switch">
        {{ register() ? 'Hai già un account?' : 'Prima volta qui?' }}
        <button type="button" (click)="ui.openAuth(register() ? 'login' : 'register')">{{ register() ? 'Accedi' : 'Registrati' }}</button>
      </p>
    </app-modal>
  `,
})
export class AuthModalComponent implements OnInit {
  readonly mode = input.required<AuthMode>();

  protected readonly ui = inject(UiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly register = computed(() => this.mode() === 'register');
  protected readonly visible = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  /** Form tipizzato: ogni controllo ha il suo tipo, niente any. */
  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true }),
    lastName: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
  });

  ngOnInit(): void {
    const mode = this.mode();
    if (mode === 'admin' || mode === 'user') this.form.patchValue(testCredentials[mode]);
    if (this.register()) {
      // I campi in piu' (e la lunghezza minima) servono solo alla registrazione
      for (const name of ['firstName', 'lastName', 'username'] as const) {
        this.form.controls[name].addValidators([Validators.required, Validators.maxLength(80)]);
      }
      this.form.controls.password.addValidators(Validators.minLength(8));
      this.form.updateValueAndValidity();
    }
  }

  protected submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Controlla i campi: alcuni dati mancano o non sono validi.');
      return;
    }
    const { email, password, username, firstName, lastName } = this.form.getRawValue();
    this.run(
      this.register()
        ? this.auth.register({ email, password, username: username.trim(), firstName: firstName.trim(), lastName: lastName.trim() })
        : this.auth.login({ email, password }),
    );
  }

  protected testLogin(profile: 'admin' | 'user'): void {
    if (this.busy()) return;
    this.form.patchValue(testCredentials[profile]);
    this.run(this.auth.login(testCredentials[profile]));
  }

  private run(request: Observable<AuthResponse>): void {
    this.busy.set(true);
    this.error.set('');
    request
      .pipe(finalize(() => this.busy.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.ui.notify(`Benvenuto nell’archivio, ${session.user.firstName}.`);
          this.ui.closeAuth();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
