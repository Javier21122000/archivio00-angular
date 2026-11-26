import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowUpRight,
  LucideHeart,
  LucideLoaderCircle,
  LucideLockKeyhole,
  LucidePencilLine,
  LucideTrash2,
} from '@lucide/angular';
import { Product } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { FavoriteService } from '../core/services/favorite.service';
import { ProductService } from '../core/services/product.service';
import { UiService } from '../core/services/ui.service';
import { errorMessage } from '../core/util/api-error';
import { pad2, revealDelay } from '../core/util/catalog-query';
import { descrizioneDi } from '../data/descrizioni';
import { leggendaDelCapo } from '../data/leggende';
import { ConfirmDeleteComponent } from './confirm-delete.component';
import { EditProductComponent } from './edit-product.component';
import { EuroPipe } from './euro.pipe';
import { ModalComponent } from './modal.component';
import { ProductReviewsComponent } from './product-reviews.component';
import { RevealDirective } from './reveal.directive';

export const FALLBACK_IMAGE = '/assets/products/unavailable.svg';

/** Immagine da mostrare: quella del capo, oppure il segnaposto se manca o e' vuota. */
export const imageOf = (product: Product): string => product.immagineUrl?.trim() || FALLBACK_IMAGE;

@Component({
  selector: 'app-product-card',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    EuroPipe,
    RevealDirective,
    ModalComponent,
    EditProductComponent,
    ConfirmDeleteComponent,
    ProductReviewsComponent,
    LucideArrowUpRight,
    LucideHeart,
    LucideLoaderCircle,
    LucideLockKeyhole,
    LucidePencilLine,
    LucideTrash2,
  ],
  // display: contents = l'host sparisce dal layout e <article> resta figlio diretto della griglia CSS.
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="product-card"
      [class.special]="product().isSpecialEdition"
      appReveal
      [appRevealDelay]="delay()"
      role="button"
      tabindex="0"
      [attr.aria-label]="'Apri dettaglio: ' + label()"
      (click)="details.set(true)"
      (keydown)="onKeydown($event)"
    >
      <div class="product-image aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100">
        <img
          [src]="image()"
          [alt]="label()"
          class="product-card-image w-full h-full object-contain p-4 mix-blend-multiply"
          loading="lazy"
          (error)="onImageError($event)"
        />
        <div class="product-badges">
          @if (featured()) {
            <span class="feature-badge">IN EVIDENZA</span>
          }
          @if (draft()) {
            <span class="draft-badge">BOZZA</span>
          } @else {
            <span class="product-number">ARCHIVE / {{ number() }}</span>
          }
        </div>
        <button
          type="button"
          class="heart-button"
          [class.saved]="saved()"
          [disabled]="pending() || favorites.loading() || draft()"
          [attr.aria-label]="(saved() ? 'Rimuovi dai' : 'Aggiungi ai') + ' preferiti: ' + label()"
          [attr.aria-pressed]="saved()"
          [attr.title]="draft() ? 'Pubblica il capo per aggiungerlo ai preferiti' : null"
          (click)="favorite($event)"
        >
          @if (pending()) {
            <svg lucideLoaderCircle [size]="17" class="animate-spin"></svg>
          } @else {
            <svg lucideHeart [size]="18" [strokeWidth]="1.6" [style.fill]="saved() ? 'currentColor' : 'none'"></svg>
          }
        </button>
        @if (auth.isAdmin()) {
          <button type="button" class="quick-edit-button" [attr.aria-label]="'Modifica: ' + label()" (click)="openEdit($event)">
            <svg lucidePencilLine [size]="16"></svg><span>Edit</span>
          </button>
        }
      </div>
      <div class="product-caption">
        <span>
          <strong>{{ product().nome }}</strong>
          @if (product().variante) {
            <small class="product-variant">{{ product().variante }}</small>
          }
          @if (product().isSpecialEdition) {
            <small class="product-special">Special Edition</small>
          }
          <span>{{ product().prezzo | euro }}</span>
          <app-product-reviews [rating]="product().rating ?? 0" [numeroRecensioni]="product().numeroRecensioni ?? 0" />
        </span>
        <span class="product-arrow" aria-hidden="true"><svg lucideArrowUpRight [size]="19"></svg></span>
      </div>
      <ng-container *ngTemplateOutlet="adminInfo" />
    </article>

    <!-- Dati riservati: vivono nella card e nel dettaglio, per questo sono un template riusabile. -->
    <ng-template #adminInfo>
      @if (auth.isAdmin() && product().prezzoAcquisto !== undefined) {
        <div class="private-data">
          <span class="eyebrow"><svg lucideLockKeyhole [size]="12"></svg> DATI RISERVATI</span>
          <dl>
            <div><dt>Acquisto</dt><dd>{{ product().prezzoAcquisto ?? 0 | euro }}</dd></div>
            <div><dt>Margine lordo</dt><dd>{{ margin() | euro }}</dd></div>
            <div><dt>Fornitore</dt><dd>{{ product().fornitore || 'Non disponibile' }}</dd></div>
          </dl>
          <div class="admin-actions">
            <button type="button" class="button button-outline" (click)="openEdit($event)">
              <svg lucidePencilLine [size]="13"></svg> Modifica
            </button>
            <button type="button" class="delete-button" (click)="askDelete($event)">
              <svg lucideTrash2 [size]="13"></svg> Elimina Capo
            </button>
          </div>
        </div>
      }
    </ng-template>

    <!-- Le modali sono FRATELLI dell'article (non figli): cosi' i loro click non salgono alla card. -->
    @if (details()) {
      <app-modal [title]="label()" (closed)="details.set(false)">
        <div class="detail-media">
          <img [src]="image()" [alt]="product().nome" class="product-card-image w-full h-full object-contain p-4 mix-blend-multiply" style="object-position: center" />
        </div>
        <div class="flex items-center justify-between my-5">
          <strong class="text-2xl">{{ product().prezzo | euro }}</strong>
          @if (featured()) {
            <span class="feature-badge">IN EVIDENZA</span>
          } @else if (draft()) {
            <span class="draft-badge">BOZZA</span>
          }
        </div>
        @if (descrizione()) {
          <p class="product-descrizione">{{ descrizione() }}</p>
        }
        @if (leggenda(); as l) {
          <a [routerLink]="['/leggenda', l.slug]" class="product-leggenda">
            <img [src]="l.video ?? l.fermo" alt="" aria-hidden="true" />
            <span><small>Lo sceglierebbe</small><strong>{{ l.nome }}</strong></span>
            <svg lucideArrowUpRight [size]="15"></svg>
          </a>
        }
        <div class="mb-5">
          <app-product-reviews [rating]="product().rating ?? 0" [numeroRecensioni]="product().numeroRecensioni ?? 0" />
        </div>
        <button type="button" class="button button-dark w-full" [disabled]="pending() || draft() || favorites.loading()" (click)="favorite($event)">
          <svg lucideHeart [size]="18" [style.fill]="saved() ? 'currentColor' : 'none'"></svg>
          {{ saved() ? 'Rimuovi dai preferiti' : 'Salva nei preferiti' }}
        </button>
        <ng-container *ngTemplateOutlet="adminInfo" />
      </app-modal>
    }
    @if (editing()) {
      <app-edit-product [product]="product()" (closed)="editing.set(false)" />
    }
    @if (confirmingDelete()) {
      <app-confirm-delete [name]="product().nome" [busy]="deleting()" (confirmed)="remove()" (cancelled)="confirmingDelete.set(false)" />
    }
  `,
})
export class ProductCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly favorites = inject(FavoriteService);
  private readonly products = inject(ProductService);
  private readonly ui = inject(UiService);

  readonly product = input.required<Product>();
  /** Posizione nell'elenco: decide il numero ARCHIVE / NN e il ritardo dell'animazione. */
  readonly index = input(0);

  protected readonly details = signal(false);
  protected readonly editing = signal(false);
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);

  protected readonly draft = computed(() => this.auth.isAdmin() && this.product().pubblicato === false);
  protected readonly featured = computed(() => Boolean(this.product().inEvidenza));
  protected readonly image = computed(() => imageOf(this.product()));
  protected readonly label = computed(() => {
    const { nome, variante } = this.product();
    return variante ? `${nome} · ${variante}` : nome;
  });
  protected readonly descrizione = computed(() => descrizioneDi(this.product().immagineUrl));
  protected readonly leggenda = computed(() => leggendaDelCapo(this.product().immagineUrl));
  protected readonly margin = computed(() => this.product().prezzo - (this.product().prezzoAcquisto ?? 0));
  protected readonly number = computed(() => pad2(this.index() + 1));
  protected readonly delay = computed(() => revealDelay(this.index()));
  protected readonly saved = computed(() => this.favorites.favorites().some((f) => f.oggetto.id === this.product().id));
  protected readonly pending = computed(() => this.favorites.pendingIds().includes(this.product().id));

  /** Card cliccabile da tastiera, ma solo se il focus e' sulla card: Invio sul cuore non deve aprire il dettaglio. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.details.set(true);
    }
  }

  /** Se l'immagine non carica si passa al segnaposto una volta sola (evita il loop di errori). */
  protected onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
  }

  protected openEdit(event: Event): void {
    event.stopPropagation();
    this.editing.set(true);
  }

  protected askDelete(event: Event): void {
    event.stopPropagation();
    this.confirmingDelete.set(true);
  }

  protected favorite(event: Event): void {
    event.stopPropagation();
    if (!this.auth.token()) {
      this.ui.openAuth(); // non loggato: si apre la modale di accesso
      return;
    }
    this.favorites.toggle(this.product().id).subscribe({
      error: (err: unknown) => this.ui.notify(errorMessage(err), true),
    });
  }

  protected remove(): void {
    this.deleting.set(true);
    this.products.remove(this.product().id).subscribe({
      next: () => {
        // La lista si ricarica da sola (changes$); i preferiti vanno riallineati a mano.
        this.favorites.load();
        this.confirmingDelete.set(false);
        this.details.set(false);
        this.deleting.set(false);
        this.ui.notify('Capo eliminato dall’archivio.');
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.ui.notify(errorMessage(err), true);
      },
    });
  }
}
