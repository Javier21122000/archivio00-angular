import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, ProductInput } from '../core/models';
import { FavoriteService } from '../core/services/favorite.service';
import { ProductService } from '../core/services/product.service';
import { UiService } from '../core/services/ui.service';
import { errorMessage } from '../core/util/api-error';
import { ModalComponent } from './modal.component';

/** Modifica rapida di un capo (solo admin). Gli altri campi del capo vengono rimandati invariati. */
@Component({
  selector: 'app-edit-product',
  imports: [ModalComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Modifica capo" (closed)="close()">
      <form class="form-stack" [formGroup]="form" (ngSubmit)="submit()">
        <label>Nome del capo
          <input name="nome" formControlName="nome" maxlength="180" [attr.aria-invalid]="invalid('nome')" />
        </label>
        @if (product().variante) {
          <p class="form-note">Variante: {{ product().variante }}</p>
        }
        <div class="form-row">
          <label>Prezzo di vendita (€)
            <input name="prezzo" type="number" formControlName="prezzo" min="0" max="9999.99" step="0.01" [attr.aria-invalid]="invalid('prezzo')" />
          </label>
          <label>Prezzo d’acquisto (€)
            <input name="prezzoAcquisto" type="number" formControlName="prezzoAcquisto" min="0" max="9999.99" step="0.01" [attr.aria-invalid]="invalid('prezzoAcquisto')" />
          </label>
        </div>
        <label>Fornitore
          <input name="fornitore" formControlName="fornitore" maxlength="180" [attr.aria-invalid]="invalid('fornitore')" />
        </label>
        <div class="publish-row">
          <div><strong>In evidenza</strong><span>Mostra il badge IN EVIDENZA nel catalogo.</span></div>
          <button type="button" role="switch" aria-label="In evidenza" class="toggle"
            [class.on]="form.controls.inEvidenza.value" [attr.aria-checked]="form.controls.inEvidenza.value"
            (click)="flip('inEvidenza')"><span></span></button>
        </div>
        <div class="publish-row">
          <div><strong>Special Edition</strong><span>Includi il capo nella selezione speciale.</span></div>
          <button type="button" role="switch" aria-label="Special Edition" class="toggle"
            [class.on]="form.controls.isSpecialEdition.value" [attr.aria-checked]="form.controls.isSpecialEdition.value"
            (click)="flip('isSpecialEdition')"><span></span></button>
        </div>
        @if (error()) {
          <p role="alert" class="error-text">{{ error() }}</p>
        }
        <div class="flex gap-3">
          <button type="button" class="button button-outline flex-1" [disabled]="busy()" (click)="close()">Annulla</button>
          <button type="submit" class="button button-dark flex-1" [disabled]="busy()">{{ busy() ? 'Salvataggio…' : 'Salva modifiche' }}</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class EditProductComponent implements OnInit {
  private readonly products = inject(ProductService);
  private readonly favorites = inject(FavoriteService);
  private readonly ui = inject(UiService);

  readonly product = input.required<Product>();
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly error = signal('');

  // Form tipizzato: i numeri sono number|null perche' un <input type="number"> vuoto da' null.
  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    prezzo: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(9999.99)]),
    prezzoAcquisto: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(9999.99)]),
    fornitore: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(180)] }),
    inEvidenza: new FormControl(false, { nonNullable: true }),
    isSpecialEdition: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    // Si legge l'input qui (non nel costruttore) perche' solo ora il valore e' disponibile.
    const p = this.product();
    this.form.setValue({
      nome: p.nome,
      prezzo: p.prezzo,
      prezzoAcquisto: p.prezzoAcquisto ?? 0,
      fornitore: p.fornitore ?? '',
      inEvidenza: Boolean(p.inEvidenza),
      isSpecialEdition: Boolean(p.isSpecialEdition),
    });
  }

  protected invalid(name: 'nome' | 'prezzo' | 'prezzoAcquisto' | 'fornitore'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected flip(name: 'inEvidenza' | 'isSpecialEdition'): void {
    const control = this.form.controls[name];
    control.setValue(!control.value);
  }

  protected close(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Controlla i campi: nome e fornitore sono obbligatori, i prezzi vanno da 0 a 9999,99.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.products.update(this.product().id, this.toInput()).subscribe({
      next: () => {
        // Un capo modificato puo' cambiare anche nei preferiti: li ricarichiamo.
        this.favorites.load();
        this.ui.notify('Capo aggiornato correttamente.');
        this.busy.set(false);
        this.closed.emit();
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }

  /** PUT completo: i campi non modificabili qui (immagine, rating...) si rimandano com'erano. */
  private toInput(): ProductInput {
    const p = this.product();
    const v = this.form.getRawValue();
    return {
      nome: v.nome.trim(),
      prezzo: Number(v.prezzo),
      prezzoAcquisto: Number(v.prezzoAcquisto),
      fornitore: v.fornitore.trim(),
      pubblicato: p.pubblicato ?? false,
      inEvidenza: v.inEvidenza,
      isSpecialEdition: v.isSpecialEdition,
      immagineUrl: p.immagineUrl,
      rating: p.rating,
      numeroRecensioni: p.numeroRecensioni,
      categoria: p.categoria,
      variante: p.variante,
    };
  }
}
