import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideSearch, LucideSlidersHorizontal, LucideX } from '@lucide/angular';
import { EMPTY, Subject, catchError, debounceTime, switchMap, tap } from 'rxjs';
import { Category, Product, ProductQuery, ProductSort } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { ProductService } from '../core/services/product.service';
import { errorMessage } from '../core/util/api-error';
import { COMPACT_SIZE, PAGE_SIZE, appendUnique, categoryToQuery, pad2 } from '../core/util/catalog-query';
import { categories } from '../data/editorial';
import { CardGridComponent } from './card-grid.component';
import { GridSkeletonComponent } from './grid-skeleton.component';

/** Una richiesta di caricamento: pagina 1 (sostituisce la lista) o pagina successiva (si accoda). */
interface LoadRequest {
  query: ProductQuery;
  page: number;
  append: boolean;
}

/**
 * Catalogo con filtri, ricerca, ordinamento e paginazione LATO SERVER.
 * Tutto lo stato e' in signal; un unico stream con switchMap garantisce che una richiesta
 * obsoleta (es. cambio categoria mentre ne e' in corso un'altra) venga annullata.
 */
@Component({
  selector: 'app-product-grid',
  imports: [RouterLink, CardGridComponent, GridSkeletonComponent, LucideArrowUpRight, LucideSearch, LucideSlidersHorizontal, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="selezione" class="catalog-section" [class.full-catalog]="!compact()">
      <div class="section-heading">
        <div>
          <span class="eyebrow">{{ compact() ? 'FRESH FROM THE ARCHIVE' : 'THE COMPLETE SELECTION' }}</span>
          <h2>
            @if (compact()) {
              IL PROSSIMO PEZZO<br />DELLA TUA STORIA.
            } @else {
              L’ARCHIVIO@if (catalogCount() !== null) {<span class="heading-count">({{ countLabel() }})</span>}
            }
          </h2>
        </div>
        <div class="section-aside">
          <p>Silhouette iconiche. Attitudine intatta.<br />Il meglio dei 2000, selezionato oggi.</p>
          @if (compact()) {
            <a routerLink="/catalogo" class="underlined-link">Tutti i capi <svg lucideArrowUpRight [size]="16"></svg></a>
          }
        </div>
      </div>

      <div class="catalog-toolbar">
        <div class="category-tabs" aria-label="Categorie">
          @for (item of categories; track item) {
            <button
              type="button"
              [class.selected]="category() === item"
              [class.special-tab]="item === 'SPECIAL EDITIONS'"
              [attr.aria-pressed]="category() === item"
              (click)="category.set(item)"
            >{{ item }}</button>
          }
        </div>
        <button type="button" class="filter-toggle" [class.selected]="filters()" [attr.aria-expanded]="filters()" (click)="filters.set(!filters())">
          <svg lucideSlidersHorizontal [size]="15"></svg> Filtra &amp; ordina
        </button>
      </div>

      @if (filters()) {
        <div class="filters-panel">
          <label class="search-field">
            <svg lucideSearch [size]="17"></svg>
            <input #q [value]="searchInput()" (input)="searchInput.set(q.value)" placeholder="Cerca nell’archivio" aria-label="Cerca un capo" />
            @if (searchInput()) {
              <button type="button" aria-label="Cancella ricerca" (click)="clearSearch()"><svg lucideX [size]="16"></svg></button>
            }
          </label>
          <label class="sort-field">Ordina per
            <select #s [value]="order()" (change)="order.set(asSort(s.value))">
              <option value="archivio">Selezione archivio</option>
              <option value="prezzo-asc">Prezzo crescente</option>
              <option value="prezzo-desc">Prezzo decrescente</option>
            </select>
          </label>
          @if (auth.isAdmin()) {
            <label class="checkbox-label">
              <input #d type="checkbox" [checked]="draftsOnly()" (change)="draftsOnly.set(d.checked)" />Solo bozze
            </label>
          }
        </div>
      }

      @if (loading()) {
        <app-grid-skeleton />
      } @else if (error()) {
        <div role="alert" class="empty-state">
          <h3>L’archivio è momentaneamente offline.</h3>
          <p>{{ error() }}</p>
          <button type="button" class="button button-dark" (click)="reload()">Riprova</button>
        </div>
      } @else if (items().length) {
        <app-card-grid [products]="items()" />
        @if (!compact() && (hasMore() || moreError())) {
          <div class="flex flex-col items-center gap-3 mt-10">
            @if (moreError()) {
              <p role="alert" class="error-text">{{ moreError() }}</p>
            }
            @if (hasMore()) {
              <button type="button" class="button button-outline" [disabled]="loadingMore()" (click)="loadMore()">
                {{ loadingMore() ? 'Caricamento…' : moreError() ? 'Riprova' : 'Mostra altri' }}
              </button>
            }
          </div>
        }
      } @else {
        <div class="empty-state">
          <span class="eyebrow">{{ hasCatalog() ? 'NESSUN RISULTATO' : 'IN ATTESA DEL PROSSIMO DROP' }}</span>
          <h3>{{ hasCatalog() ? 'Nessun capo con questi filtri.' : 'Le storie migliori devono ancora arrivare.' }}</h3>
          <p>
            {{ hasCatalog() ? 'Prova un’altra categoria o modifica la ricerca.' : 'Il catalogo non contiene ancora capi pubblicati. Torna a dare un’occhiata.' }}
          </p>
          @if (hasCatalog()) {
            <button type="button" class="button button-outline" (click)="resetFilters()">Azzera filtri</button>
          } @else if (auth.isAdmin()) {
            <a routerLink="/admin" class="button button-dark">Aggiungi il primo capo <svg lucideArrowUpRight [size]="17"></svg></a>
          }
        </div>
      }

      <!-- Annuncio per screen reader: la lista cresce senza che il focus si sposti. -->
      <p class="sr-only" role="status" aria-live="polite">{{ announcement() }}</p>

      <div class="catalog-footnote">
        <span>2000—2010 / CURATED MENSWEAR</span>
        <span>{{ loading() ? 'CARICAMENTO…' : footnote() }}</span>
      </div>
    </section>
  `,
})
export class ProductGridComponent {
  private readonly products = inject(ProductService);
  protected readonly auth = inject(AuthService);

  /** Home: solo i primi 8 capi, senza "Mostra altri". */
  readonly compact = input(false);
  readonly initialCategory = input<Category>('Tutti');

  protected readonly categories = categories;

  // --- Filtri (stato di interfaccia) ---
  /** linkedSignal: parte da initialCategory e, se il parametro ?categoria= cambia, si riallinea. */
  protected readonly category = linkedSignal<Category>(() => this.initialCategory());
  protected readonly searchInput = signal('');
  /** Ricerca "assestata": segue searchInput con 300 ms di ritardo, per non chiamare il server a ogni tasto. */
  private readonly search = signal('');
  protected readonly order = signal<ProductSort>('archivio');
  protected readonly draftsOnly = signal(false);
  protected readonly filters = signal(false);

  // --- Risultati ---
  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly catalogCount = signal<number | null>(null);
  private readonly page = signal(1);
  private readonly totalPages = signal(1);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly moreError = signal<string | null>(null);
  protected readonly announcement = signal('');

  protected readonly hasMore = computed(() => !this.compact() && this.page() < this.totalPages());
  protected readonly hasCatalog = computed(() => (this.catalogCount() ?? 0) > 0);
  protected readonly countLabel = computed(() => pad2(this.catalogCount() ?? 0));
  protected readonly footnote = computed(() => {
    const count = this.compact() ? this.items().length : this.total();
    return `${count} CAPI ${this.auth.isAdmin() ? '· BOZZE INCLUSE' : 'NELLA SELEZIONE'}`;
  });

  /** Query senza pagina: cambia solo quando cambiano filtri, ricerca, ordine o ruolo. */
  private readonly baseQuery = computed<ProductQuery>(() => ({
    ...categoryToQuery(this.category()),
    q: this.search(),
    ordine: this.order(),
    soloBozze: this.auth.isAdmin() && this.draftsOnly(),
  }));

  private readonly requests = new Subject<LoadRequest>();
  /** Incrementarlo forza un nuovo caricamento (dopo un errore o una modifica ai capi). */
  private readonly refresh = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // switchMap: una nuova richiesta annulla quella in corso (HTTP abortita, risposta mai applicata).
    this.requests
      .pipe(
        switchMap((req) => this.fetch(req)),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();

    // Debounce della ricerca: il campo e' reattivo, il server viene interrogato dopo 300 ms di pausa.
    toObservable(this.searchInput)
      .pipe(debounceTime(300), takeUntilDestroyed(destroyRef))
      .subscribe((value) => this.search.set(value.trim()));

    // Ricarica la prima pagina quando cambia un filtro, l'utente (token/ruolo) o il numero di capi per pagina.
    effect(() => {
      const query = this.baseQuery();
      const limit = this.compact() ? COMPACT_SIZE : PAGE_SIZE;
      this.auth.token();
      this.refresh();
      untracked(() => this.requests.next({ query: { ...query, limit }, page: 1, append: false }));
    });

    // Create/update/delete di un capo (anche da altre pagine): rilegge la lista.
    this.products.changes$.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.reload());
  }

  protected reload(): void {
    this.refresh.update((n) => n + 1);
  }

  /** Accoda la pagina successiva. Ignorata se una richiesta e' gia' in corso: niente doppioni. */
  protected loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    const limit = PAGE_SIZE;
    this.requests.next({ query: { ...this.baseQuery(), limit }, page: this.page() + 1, append: true });
  }

  protected clearSearch(): void {
    // Cancellare e' un'azione esplicita: niente attesa del debounce.
    this.searchInput.set('');
    this.search.set('');
  }

  protected resetFilters(): void {
    this.category.set('Tutti');
    this.clearSearch();
    this.draftsOnly.set(false);
  }

  protected asSort(value: string): ProductSort {
    return value === 'prezzo-asc' || value === 'prezzo-desc' ? value : 'archivio';
  }

  private fetch({ query, page, append }: LoadRequest) {
    if (append) {
      this.loadingMore.set(true);
      this.moreError.set(null);
    } else {
      this.loading.set(true);
      this.loadingMore.set(false);
      this.error.set(null);
      this.moreError.set(null);
    }
    return this.products.list({ ...query, page }).pipe(
      tap((result) => {
        const merged = append ? appendUnique(this.items(), result.items) : result.items;
        this.items.set(merged);
        this.total.set(result.total);
        this.page.set(result.page);
        this.totalPages.set(result.totalPages);
        // catalogCount e' il totale visibile senza filtri: alimenta il titolo "L'ARCHIVIO (NN)".
        this.catalogCount.set(result.catalogCount);
        this.loading.set(false);
        this.loadingMore.set(false);
        if (append) {
          this.announcement.set(`Caricati altri capi: ora ne vedi ${merged.length} su ${result.total}.`);
        }
      }),
      catchError((err: unknown) => {
        const message = errorMessage(err);
        if (append) {
          this.moreError.set(message);
          this.loadingMore.set(false);
        } else {
          this.items.set([]);
          this.error.set(message);
          this.loading.set(false);
        }
        return EMPTY; // l'errore e' gia' nello stato: lo stream principale non deve chiudersi
      }),
    );
  }
}
