import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from './modal.component';

/** Conferma prima di eliminare un capo. Resta "stupido": la chiamata HTTP la fa chi lo usa. */
@Component({
  selector: 'app-confirm-delete',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Eliminare questo capo?" (closed)="cancel()">
      <p class="muted mb-6">“{{ name() }}” verrà rimosso dal catalogo. L’operazione non può essere annullata.</p>
      <div class="flex gap-3">
        <button type="button" class="button button-outline flex-1" [disabled]="busy()" (click)="cancel()">Annulla</button>
        <button type="button" class="button button-dark flex-1" [disabled]="busy()" (click)="confirmed.emit()">
          {{ busy() ? 'Eliminazione…' : 'Elimina Capo' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ConfirmDeleteComponent {
  readonly name = input.required<string>();
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  /** Durante l'eliminazione la modale non si chiude (evita di chiudere a metà richiesta e perdere l'esito). */
  protected cancel(): void {
    if (!this.busy()) this.cancelled.emit();
  }
}
