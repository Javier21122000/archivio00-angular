import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowUpRight, LucideAsterisk } from '@lucide/angular';
import { ProductService } from '../core/services/product.service';
import { leggende, leggendaDi } from '../data/leggende';
import { CardGridComponent } from '../shared/card-grid.component';
import { GridSkeletonComponent } from '../shared/grid-skeleton.component';
import { LegendBackdropComponent } from '../shared/legend-backdrop.component';

/** Pagina del personaggio: racconto e capi che gli somigliano. Lo slug arriva da /leggenda/:slug. */
@Component({
  selector: 'app-legend-page',
  imports: [RouterLink, CardGridComponent, GridSkeletonComponent, LegendBackdropComponent, LucideArrowLeft, LucideArrowUpRight, LucideAsterisk],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (leggenda(); as l) {
      <section class="leggenda leggenda-{{ l.slug }}">
        <app-legend-backdrop [video]="l.videoSfondo ?? l.video" [portrait]="l.ritratto" />

        <a routerLink="/" class="leggenda-indietro underlined-link"><svg lucideArrowLeft [size]="15"></svg> Cambia leggenda</a>

        <div class="leggenda-testa">
          <div class="leggenda-ritratto">
            <img [src]="l.ritratto" [alt]="l.nome + ' negli anni Duemila'" />
            <img class="leggenda-fermo" [src]="l.video ?? l.fermo" alt="" aria-hidden="true" />
          </div>
          <div class="leggenda-copy">
            <span class="eyebrow">{{ l.soprannome }} · {{ l.numero }}</span>
            <h1>{{ l.nome }}</h1>
            <p class="leggenda-claim">«{{ l.claim }}»</p>
            @for (testo of l.paragrafi; track $index) {
              <p>{{ testo }}</p>
            }
            <span class="signature signature-grande">{{ l.firma }}</span>
          </div>
        </div>

        <div class="leggenda-regole">
          <span class="eyebrow"><svg lucideAsterisk [size]="15" [strokeWidth]="1.6"></svg> LE SUE TRE REGOLE</span>
          <ol>
            @for (regola of l.regole; track regola) {
              <li>{{ regola }}</li>
            }
          </ol>
        </div>

        <div class="section-heading leggenda-selezione">
          <div>
            <span class="eyebrow">LA SUA SELEZIONE</span>
            <h2>I CAPI CHE<br /><em>GLI SOMIGLIANO.</em></h2>
          </div>
          <p class="section-description">
            @if (capi.hasValue()) {
              {{ capi.value().items.length }} capi dell’archivio parlano la sua lingua.<br />
            }
            <em>Se hai scelto lui, comincia da qui.</em>
          </p>
        </div>

        @if (capi.error()) {
          <div class="empty-state" role="alert">
            <p>Non riusciamo a caricare i capi in questo momento.</p>
            <button type="button" class="button button-dark" (click)="capi.reload()">Riprova</button>
          </div>
        } @else if (capi.hasValue()) {
          <app-card-grid [products]="capi.value().items" />
        } @else {
          <app-grid-skeleton />
        }

        <div class="leggenda-altre">
          <span class="eyebrow">OPPURE</span>
          <div>
            @for (altra of altre(); track altra.slug) {
              <a [routerLink]="['/leggenda', altra.slug]" class="leggenda-altra">
                <img [src]="altra.ritratto" alt="" aria-hidden="true" loading="lazy" />
                <span><strong>{{ altra.nome }}</strong><small>{{ altra.soprannome }}</small></span>
                <svg lucideArrowUpRight [size]="16"></svg>
              </a>
            }
          </div>
        </div>
      </section>
    } @else {
      <section class="empty-state page-section">
        <span class="eyebrow">FUORI ARCHIVIO</span>
        <h1>Questa leggenda non l’abbiamo.</h1>
        <a class="button button-dark" routerLink="/">Torna alla home</a>
      </section>
    }
  `,
})
export class LegendPage {
  private readonly products = inject(ProductService);

  readonly slug = input<string>();
  protected readonly leggenda = computed(() => leggendaDi(this.slug()));
  protected readonly altre = computed(() => leggende.filter((l) => l.slug !== this.slug()));

  /**
   * Chiede al server solo i capi della leggenda (non tutto il catalogo).
   * rxResource annulla da solo la richiesta in volo quando cambia lo slug,
   * cosi' una risposta vecchia non puo' sovrascrivere quella nuova.
   */
  protected readonly capi = rxResource({
    params: () => this.leggenda()?.capi,
    stream: ({ params }) => this.products.list({ chiavi: params, limit: 60 }),
  });
}
