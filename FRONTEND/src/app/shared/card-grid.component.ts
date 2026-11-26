import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Product } from '../core/models';
import { ProductCardComponent } from './product-card.component';

/** Griglia di schede capo. startIndex serve a far proseguire la numerazione ARCHIVE / NN. */
@Component({
  selector: 'app-card-grid',
  imports: [ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="product-grid">
      @for (product of products(); track product.id; let i = $index) {
        <app-product-card [product]="product" [index]="startIndex() + i" />
      }
    </div>
  `,
})
export class CardGridComponent {
  readonly products = input.required<Product[]>();
  readonly startIndex = input(0);
}
