import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Category } from '../core/models';
import { categories } from '../data/editorial';
import { ProductGridComponent } from '../shared/product-grid.component';

/** Valida il valore di ?categoria= contro l'elenco reale: qualunque altra cosa vale "Tutti". */
export function parseCategory(value: string | null): Category {
  return categories.find((c) => c === value) ?? 'Tutti';
}

/** Pagina /catalogo: legge ?categoria= e lo passa alla griglia, rileggendolo quando cambia. */
@Component({
  selector: 'app-catalog-page',
  imports: [ProductGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-product-grid [initialCategory]="category()" />`,
})
export class CatalogPage {
  private readonly param = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((p) => p.get('categoria'))),
    { initialValue: null },
  );
  protected readonly category = computed(() => parseCategory(this.param()));
}
