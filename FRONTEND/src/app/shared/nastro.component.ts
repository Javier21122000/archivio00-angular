import { ChangeDetectionStrategy, Component } from '@angular/core';
import { nastro } from '../data/culture';
import { RevealDirective } from './reveal.directive';

/** Banda di immagini che danno il tono fra il catalogo e il diario. */
@Component({
  selector: 'app-nastro',
  imports: [RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="nastro" aria-label="Riferimenti visivi degli anni Duemila">
      <span class="nastro-occhiello eyebrow">L’ARIA CHE TIRAVA</span>
      <div class="nastro-pista">
        @for (tassello of tasselli; track tassello.file; let i = $index) {
          <figure class="tassello" appReveal [appRevealDelay]="ritardo(i)">
            <div class="tassello-media">
              <img [src]="tassello.file" [alt]="tassello.alt" loading="lazy" />
            </div>
            <figcaption>{{ tassello.didascalia }}</figcaption>
          </figure>
        }
      </div>
    </section>
  `,
})
export class NastroComponent {
  protected readonly tasselli = nastro;

  /** Scagliona l'ingresso dei primi tasselli; dal quinto in poi il ritardo non cresce piu'. */
  protected ritardo(index: number): number {
    return Math.min(index, 4) * 70;
  }
}
