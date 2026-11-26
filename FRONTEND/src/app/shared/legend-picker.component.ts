import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';
import { leggende } from '../data/leggende';
import { RevealDirective } from './reveal.directive';

/**
 * L'ingresso della home: le tre leggende sono disposte come una mano di carte.
 * L'apertura a ventaglio e l'alzata al passaggio del mouse sono CSS puro sul link;
 * appReveal anima solo l'opacita'/traslazione dello slot: due transform sullo
 * stesso elemento si sovrascriverebbero a vicenda.
 */
@Component({
  selector: 'app-legend-picker',
  imports: [RouterLink, RevealDirective, LucideArrowUpRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ingresso" aria-labelledby="ingresso-titolo">
      <div class="ingresso-testa">
        <span class="eyebrow"><span class="status-dot"></span> ROBA DEI 2000, TROVATA UNA PER UNA</span>
        <h1 id="ingresso-titolo">Y2K ATHLETIC<br />&amp; STREETWEAR<br /><span>ARCHIVE.</span></h1>
        <p>
          Tre modi di attraversare lo stesso decennio.<br />
          <em>Pesca quello che ti somiglia e ti facciamo strada.</em>
        </p>
      </div>

      <div class="ingresso-mazzo">
        @for (l of leggende; track l.slug; let i = $index) {
          <div class="carta-slot" appReveal [appRevealDelay]="i * 100">
            <a [routerLink]="['/leggenda', l.slug]" class="carta-leggenda">
              <div class="carta-media">
                <!-- Solo la prima carta e' il candidato LCP: le altre aspettano -->
                <img
                  [src]="l.ritratto"
                  [alt]="l.nome + ' negli anni Duemila'"
                  [attr.loading]="i === 0 ? null : 'lazy'"
                  [attr.fetchpriority]="i === 0 ? 'high' : null"
                />
                <span class="carta-numero" aria-hidden="true">{{ l.numero }}</span>
              </div>
              <div class="carta-testo">
                <span class="carta-soprannome">{{ l.soprannome }}</span>
                <h2>{{ l.nome }}</h2>
                <p>«{{ l.claim }}»</p>
                <span class="carta-invito">{{ l.occhiello }} <svg lucideArrowUpRight [size]="15"></svg></span>
              </div>
            </a>
          </div>
        }
      </div>
    </section>
  `,
})
export class LegendPickerComponent {
  protected readonly leggende = leggende;
}
