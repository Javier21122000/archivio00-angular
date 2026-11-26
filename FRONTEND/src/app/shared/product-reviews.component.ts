import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-product-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="product-reviews" [attr.aria-label]="score() + ' su 5, ' + numeroRecensioni() + ' recensioni'">
      <span class="review-stars" aria-hidden="true">
        @for (n of stars; track n) {
          <span [class]="n < score() ? 'star-filled' : 'star-empty'">{{ n < score() ? '★' : '☆' }}</span>
        }
      </span>
      <span class="review-count">({{ numeroRecensioni() }} {{ numeroRecensioni() === 1 ? 'recensione' : 'recensioni' }})</span>
    </span>
  `,
})
export class ProductReviewsComponent {
  readonly rating = input(0);
  readonly numeroRecensioni = input(0);
  protected readonly stars = [0, 1, 2, 3, 4];
  protected readonly score = computed(() => Math.max(0, Math.min(5, Math.round(this.rating()))));
}
