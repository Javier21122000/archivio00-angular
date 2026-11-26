import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCheck, LucideLockKeyhole, LucidePlus, LucideShieldCheck, LucideUsers } from '@lucide/angular';
import { startWith, switchMap } from 'rxjs';
import { vintageTemplates } from '../data/editorial';
import { ProductInput, ProductStats, User } from '../core/models';
import { AdminService } from '../core/services/admin.service';
import { AuthService, normalizeRoles } from '../core/services/auth.service';
import { ProductService } from '../core/services/product.service';
import { UiService } from '../core/services/ui.service';
import { errorMessage } from '../core/util/api-error';
import { ModalComponent } from '../shared/modal.component';
import { CreateProductComponent } from './admin/create-product.component';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLANK: ProductInput = { nome: '', prezzo: 0, prezzoAcquisto: 0, fornitore: '', pubblicato: false, inEvidenza: false };

/** Due cifre per i contatori del pannello: 7 diventa "07". */
export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Studio amministratore: riepilogo catalogo, creazione capi e gestione ruoli per UUID. */
@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, ModalComponent, CreateProductComponent, LucideCheck, LucideLockKeyhole, LucidePlus, LucideShieldCheck, LucideUsers],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.isAdmin()) {
      <section class="page-section">
        <div class="section-heading">
          <div>
            <span class="eyebrow">LIVELLO 03 / STUDIO AMMINISTRATORE</span>
            <h1>DIETRO LE QUINTE.</h1>
          </div>
          <svg lucideShieldCheck [size]="38" [strokeWidth]="1"></svg>
        </div>
        <div class="admin-summary">
          <div><span>Capi nell’archivio</span><strong>{{ pad2(stats().totale) }}</strong></div>
          <div><span>Pubblicati</span><strong>{{ pad2(stats().pubblicati) }}</strong></div>
          <div><span>In bozza</span><strong>{{ pad2(stats().bozze) }}</strong></div>
          <button type="button" class="button button-dark" (click)="openCreate(blank)">
            <svg lucidePlus [size]="18"></svg>Nuovo Capo Vintage
          </button>
        </div>
        <div class="admin-columns">
          <div class="admin-box">
            <span class="eyebrow">01 / CATALOGO</span>
            <h2>Un nuovo pezzo di storia.</h2>
            <p class="muted">Parti da un capo vuoto o usa una delle schede suggerite. Verifica prezzi e provenienza prima di pubblicare.</p>
            <div class="template-list">
              @for (item of templates; track item.nome) {
                <button type="button" (click)="openCreate({ ...item, pubblicato: false })">
                  <span>{{ item.nome }}</span><svg lucidePlus [size]="17"></svg>
                </button>
              }
            </div>
            <p class="form-note">Le bozze sono visibili soltanto agli amministratori. Puoi eliminare i capi direttamente dall’archivio.</p>
          </div>
          <div class="admin-box">
            <span class="eyebrow">02 / AUTORIZZAZIONI</span>
            <h2>Gestione Ruoli Utenti</h2>
            <p class="muted">Promuovi o revoca il ruolo amministratore indicando l’ID dell’account.</p>
            <form class="form-stack mt-6" (submit)="$event.preventDefault(); validateGrant()">
              <label>ID utente (UUID)
                <input name="userId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" [formControl]="userId" />
              </label>
              <div class="flex gap-3 flex-wrap">
                <button class="button button-dark" [disabled]="!canChangeRole()"><svg lucideUsers [size]="16"></svg>Promuovi ADMIN</button>
                <button class="button button-outline" type="button" [disabled]="!canChangeRole()" (click)="pendingRole.set('revoke')">Revoca ADMIN</button>
              </div>
            </form>
            @if (roleError() && !pendingRole()) {
              <p role="alert" class="error-text mt-4">{{ roleError() }}</p>
            }
            @if (updatedUser(); as updated) {
              <div role="status" class="role-result">
                <svg lucideCheck [size]="18"></svg>
                <div>
                  <strong>{{ updated.firstName }} {{ updated.lastName }}</strong>
                  <span>{{ updated.email }}</span>
                  <code>{{ roleLabel(updated) }}</code>
                </div>
              </div>
            }
            <p class="form-note mt-6"><svg lucideLockKeyhole [size]="14"></svg> L’ID dell’account si trova nel pannello Accessi. Il backend espone le operazioni sui ruoli tramite UUID, senza un elenco utenti.</p>
          </div>
        </div>
        @if (creating()) {
          <app-create-product [initial]="template()" (closed)="creating.set(false)" />
        }
        @if (pendingRole(); as role) {
          <app-modal [title]="role === 'grant' ? 'Concedere l’accesso admin?' : 'Revocare l’accesso admin?'" (closed)="cancelRole()">
            <p class="muted mb-4">{{ role === 'grant' ? 'L’utente potrà vedere dati riservati, modificare il catalogo e gestire i ruoli.' : 'L’utente perderà l’accesso ai dati riservati e alle operazioni amministrative.' }}</p>
            <code class="block break-all mb-6">{{ userId.value.trim() }}</code>
            @if (roleError()) {
              <p role="alert" class="error-text mb-4">{{ roleError() }}</p>
            }
            <div class="flex gap-3">
              <button type="button" class="button button-outline flex-1" [disabled]="roleBusy()" (click)="cancelRole()">Annulla</button>
              <button type="button" class="button button-dark flex-1" [disabled]="roleBusy()" (click)="confirmRole()">{{ roleBusy() ? 'Aggiornamento…' : 'Conferma' }}</button>
            </div>
          </app-modal>
        }
      </section>
    }
  `,
})
export class AdminPage {
  protected readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly products = inject(ProductService);
  private readonly ui = inject(UiService);

  protected readonly pad2 = pad2;
  protected readonly blank = BLANK;
  protected readonly templates = vintageTemplates;

  protected readonly stats = signal<ProductStats>({ totale: 0, pubblicati: 0, bozze: 0 });
  protected readonly creating = signal(false);
  protected readonly template = signal<ProductInput>(BLANK);

  protected readonly userId = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(UUID)] });
  protected readonly pendingRole = signal<'grant' | 'revoke' | null>(null);
  protected readonly roleBusy = signal(false);
  protected readonly roleError = signal('');
  protected readonly updatedUser = signal<User | null>(null);

  // Il valore del FormControl non e' un signal: lo specchiamo per usarlo nei computed.
  private readonly idValue = signal('');
  protected readonly isSelf = computed(() => this.idValue().trim() === this.auth.user()?.id);
  protected readonly canChangeRole = computed(() => UUID.test(this.idValue().trim()) && !this.isSelf());

  constructor() {
    this.userId.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((value) => {
      this.idValue.set(value);
      this.updatedUser.set(null);
      this.roleError.set('');
    });
    // Riepilogo: carica subito e ogni volta che il catalogo cambia (switchMap scarta la risposta superata).
    // Solo un admin puo' chiamare /statistiche: per gli altri il guard li ha gia' rimandati alla home.
    this.products.changes$
      .pipe(
        startWith(undefined),
        switchMap(() => this.products.stats()),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (s) => this.stats.set(s), error: (err: unknown) => this.ui.notify(errorMessage(err), true) });
  }

  protected openCreate(template: ProductInput): void {
    this.template.set(template);
    this.creating.set(true);
  }

  protected roleLabel(user: User): string {
    return normalizeRoles(user.roles).join(' · ') || 'Nessun ruolo';
  }

  protected validateGrant(): void {
    this.roleError.set('');
    if (this.isSelf()) {
      this.roleError.set('Questo pannello gestisce gli altri utenti. Non puoi modificare il tuo stesso ruolo.');
      return;
    }
    if (this.canChangeRole()) this.pendingRole.set('grant');
  }

  protected cancelRole(): void {
    if (!this.roleBusy()) this.pendingRole.set(null);
  }

  protected confirmRole(): void {
    const role = this.pendingRole();
    if (!role || this.roleBusy()) return;
    this.roleBusy.set(true);
    this.roleError.set('');
    this.admin.changeRole(this.userId.value.trim(), role === 'grant').subscribe({
      next: (updated) => {
        this.updatedUser.set(updated);
        this.pendingRole.set(null);
        this.roleBusy.set(false);
        this.ui.notify(`Ruoli aggiornati per ${updated.firstName}.`);
      },
      error: (err: unknown) => {
        this.roleError.set(errorMessage(err));
        this.roleBusy.set(false);
      },
    });
  }
}
