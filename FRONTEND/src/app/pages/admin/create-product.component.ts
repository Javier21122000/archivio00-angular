import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { LucideArrowUpRight } from '@lucide/angular';
import { ProductInput } from '../../core/models';
import { ProductService } from '../../core/services/product.service';
import { UiService } from '../../core/services/ui.service';
import { errorMessage } from '../../core/util/api-error';
import { ModalComponent } from '../../shared/modal.component';

/** Come lo `step="0.01"` dell'input HTML: al massimo due decimali (lavoriamo in centesimi per evitare errori float). */
export function twoDecimals(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined) return null;
  return Math.abs(Math.round(value * 100) - value * 100) < 1e-6 ? null : { decimals: true };
}

const priceValidators = [Validators.required, Validators.min(0), Validators.max(9999.99), twoDecimals];

/** Dialog "Nuovo Capo Vintage": form reattivo tipizzato con validazione lato client (quella vera resta nel backend). */
@Component({
  selector: 'app-create-product',
  imports: [ModalComponent, ReactiveFormsModule, LucideArrowUpRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Nuovo Capo Vintage" (closed)="close()">
      <form class="form-stack" [formGroup]="form" (ngSubmit)="submit()">
        <label>Nome del capo
          <input formControlName="nome" maxlength="180" placeholder="Biker Leather Jacket '03" />
        </label>
        <div class="form-row">
          <label>Prezzo di vendita (€)
            <input formControlName="prezzo" type="number" min="0" max="9999.99" step="0.01" />
          </label>
          <label>Prezzo d’acquisto (€)
            <input formControlName="prezzoAcquisto" type="number" min="0" max="9999.99" step="0.01" />
          </label>
        </div>
        <label>Fornitore
          <input formControlName="fornitore" maxlength="180" placeholder="Nome dell’archivio o del fornitore" />
        </label>
        <div class="publish-row">
          <div>
            <strong>{{ published() ? 'Pubblica nella vetrina' : 'Salva come bozza' }}</strong>
            <span>{{ published() ? 'Visibile a tutti i visitatori.' : 'Visibile soltanto agli amministratori.' }}</span>
          </div>
          <button type="button" role="switch" [attr.aria-checked]="published()" aria-label="Pubblicato"
            class="toggle" [class.on]="published()" (click)="togglePublished()"><span></span></button>
        </div>
        @if (error()) {
          <p role="alert" class="error-text">{{ error() }}</p>
        }
        <button class="button button-dark w-full" [disabled]="busy()">
          {{ busy() ? 'Salvataggio…' : published() ? 'Pubblica capo' : 'Salva bozza' }}
          <svg lucideArrowUpRight [size]="18"></svg>
        </button>
      </form>
    </app-modal>
  `,
})
export class CreateProductComponent implements OnInit {
  private readonly products = inject(ProductService);
  private readonly ui = inject(UiService);

  readonly initial = input.required<ProductInput>();
  readonly closed = output<void>();

  protected readonly published = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    prezzo: new FormControl<number | null>(null, priceValidators),
    prezzoAcquisto: new FormControl<number | null>(null, priceValidators),
    fornitore: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
  });

  /** Gli input signal sono disponibili solo dopo la creazione: i valori iniziali si caricano qui, non nel costruttore. */
  ngOnInit(): void {
    const { nome, prezzo, prezzoAcquisto, fornitore, pubblicato } = this.initial();
    this.form.setValue({ nome, prezzo: prezzo || null, prezzoAcquisto: prezzoAcquisto || null, fornitore });
    this.published.set(pubblicato);
  }

  protected togglePublished(): void {
    this.published.update((v) => !v);
  }

  protected close(): void {
    if (!this.busy()) this.closed.emit(); // niente chiusura a meta' salvataggio
  }

  protected submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Controlla i campi: nome e fornitore obbligatori, prezzi tra 0 e 9999,99.');
      return;
    }
    const value = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    this.products
      .create({
        nome: value.nome.trim(),
        prezzo: Number(value.prezzo),
        prezzoAcquisto: Number(value.prezzoAcquisto),
        fornitore: value.fornitore.trim(),
        pubblicato: this.published(),
        inEvidenza: this.initial().inEvidenza ?? false,
      })
      .subscribe({
        // ProductService.create emette gia' changes$: le liste si ricaricano da sole
        next: () => {
          this.ui.notify(this.published() ? 'Capo pubblicato nell’archivio.' : 'Capo salvato in bozza.');
          this.busy.set(false);
          this.closed.emit();
        },
        error: (err: unknown) => {
          this.error.set(errorMessage(err));
          this.busy.set(false);
        },
      });
  }
}
