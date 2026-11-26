import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';

/** Dialog nativo: showModal() da' gia' focus trap, Esc e backdrop. Qui aggiungiamo cio' che manca. */
@Component({
  selector: 'app-modal',
  imports: [LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="modal"
      [class.drawer]="drawer()"
      aria-labelledby="modal-title"
      (cancel)="$event.preventDefault(); closed.emit()"
      (click)="onBackdropClick($event)"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title">{{ title() }}</h2>
          <button type="button" class="icon-button" aria-label="Chiudi" (click)="closed.emit()">
            <svg lucideX [size]="20"></svg>
          </button>
        </div>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  readonly title = input.required<string>();
  readonly drawer = input(false);
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previous: HTMLElement | null = null;
  private overflow = '';

  ngAfterViewInit(): void {
    this.previous = document.activeElement as HTMLElement | null;
    this.overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // niente scroll della pagina sotto la modale
    this.dialog().nativeElement.showModal();
  }

  ngOnDestroy(): void {
    const el = this.dialog().nativeElement;
    if (el.open) el.close();
    document.body.style.overflow = this.overflow;
    this.previous?.focus(); // ridiamo il focus a chi ha aperto la modale
  }

  protected onBackdropClick(event: MouseEvent): void {
    // Il click sul backdrop ha come target il <dialog> stesso, non il contenuto
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
