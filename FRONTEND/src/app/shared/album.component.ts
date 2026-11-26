import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';
import { diario, diarioHome, manifesto, Scatto } from '../data/culture';
import { RevealDirective } from './reveal.directive';

/** Quali scatti mostrare: in home solo quelli scelti, nella pagina editoriale tutto il diario. */
export function selectScatti(full: boolean, tutti: readonly Scatto[] = diario): Scatto[] {
  return full ? [...tutti] : tutti.filter((s) => (diarioHome as readonly string[]).includes(s.id));
}

/** Il diario fotografico: versione breve (home) o completa con il manifesto (/editoriale). */
@Component({
  selector: 'app-album',
  imports: [RouterLink, RevealDirective, LucideArrowUpRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="album" [class.album-full]="full()" aria-labelledby="album-title">
      <div class="section-heading">
        <div>
          <span class="eyebrow">IL DIARIO</span>
          <h2 id="album-title">NON ERA UN’EPOCA.<br /><em>ERA CASA NOSTRA.</em></h2>
        </div>
        <p class="section-description">
          Foto trovate, mosse, rovinate. Le teniamo così come sono.<br />
          <em>Se fossero venute bene non vorrebbero dire niente.</em>
        </p>
      </div>

      <div class="album-griglia">
        @for (scatto of scatti(); track scatto.id; let i = $index) {
          <figure class="scatto" appReveal [appRevealDelay]="ritardo(i)">
            <div class="scatto-media">
              <img [src]="scatto.file" [alt]="scatto.alt" loading="lazy" />
            </div>
            <figcaption>
              <span class="scatto-luogo">{{ scatto.luogo }}</span>
              <h3>{{ scatto.titolo }}</h3>
              <p>{{ scatto.testo }}</p>
              @if (scatto.firma) {
                <span class="signature">{{ scatto.firma }}</span>
              }
            </figcaption>
          </figure>
        }
      </div>

      @if (!full()) {
        <a routerLink="/editoriale" class="underlined-link album-tutto">
          Tutto il diario <svg lucideArrowUpRight [size]="17"></svg>
        </a>
      } @else {
        <div class="album-manifesto">
          <span class="eyebrow">{{ manifesto.occhiello }}</span>
          <h2>{{ manifesto.titolo }}</h2>
          @for (testo of manifesto.paragrafi; track $index) {
            <p>{{ testo }}</p>
          }
          <span class="signature signature-grande">{{ manifesto.chiusura }}</span>
        </div>
      }
    </section>
  `,
})
export class AlbumComponent {
  readonly full = input(false, { transform: booleanAttribute });
  protected readonly scatti = computed(() => selectScatti(this.full()));
  protected readonly manifesto = manifesto;

  protected ritardo(index: number): number {
    return Math.min(index, 3) * 80;
  }
}
