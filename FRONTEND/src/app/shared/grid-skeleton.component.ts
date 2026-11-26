import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Segnaposto di caricamento: usa le stesse classi della griglia vera, così il layout non salta a caricamento finito. */
@Component({
  selector: 'app-grid-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="product-grid" role="status" aria-label="Caricamento capi">
      @for (n of items; track n) {
        <div class="product-skeleton rounded-2xl"></div>
      }
    </div>
  `,
})
export class GridSkeletonComponent {
  protected readonly items = [0, 1, 2, 3];
}
