import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';

/** Sezione "Non è nostalgia": due card verso il catalogo; nella versione full anche la storia del negozio. */
@Component({
  selector: 'app-editorial',
  imports: [RouterLink, LucideArrowUpRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="editorial-section" [class.editorial-full]="full()">
      <div class="section-heading">
        <div>
          <span class="eyebrow">NON SOLO VESTITI. UN MODO DI STARE AL MONDO.</span>
          <h2>NON È NOSTALGIA.<br /><em>È ATTITUDINE.</em></h2>
        </div>
        <p class="section-description">
          Dai tunnel degli stadi alle strade bagnate di Manchester.<br />
          <em>Nessuno chiedeva il permesso. Tantomeno lo chiedeva a noi.</em>
        </p>
      </div>

      <div class="editorial-grid">
        <a routerLink="/catalogo" [queryParams]="{ categoria: 'Trackwear' }" class="editorial-card editorial-athletic">
          <img src="/images/culture/campo-vuoto.jpg" alt="Due giocatori in tuta larga su un campo vuoto prima della partita" loading="lazy" />
          <div class="editorial-card-top"><span class="eyebrow">01 / PRIMA DEL FISCHIO</span><svg lucideArrowUpRight [size]="22"></svg></div>
          <div class="editorial-card-copy">
            <span class="eyebrow">TRACKWEAR</span>
            <h3>DAL CAMPO.<br />ALLA STRADA.</h3>
            <span class="editorial-pill">Guarda le tute <svg lucideArrowUpRight [size]="14"></svg></span>
          </div>
        </a>
        <a routerLink="/catalogo" [queryParams]="{ categoria: 'Denim' }" class="editorial-card editorial-street">
          <img src="/images/culture/cr7-terminal.jpg" alt="Jeans a zampa larga e camicia stampata in aeroporto, stile primi anni 2000" loading="lazy" />
          <div class="editorial-card-top"><span class="eyebrow">02 / IN TRANSITO</span><svg lucideArrowUpRight [size]="22"></svg></div>
          <div class="editorial-card-copy">
            <span class="eyebrow">DENIM</span>
            <h3>ZAMPA LARGA.<br />PASSO LENTO.</h3>
            <span class="editorial-pill">Guarda il denim <svg lucideArrowUpRight [size]="14"></svg></span>
          </div>
        </a>
      </div>

      @if (full()) {
        <div class="editorial-story">
          <span class="eyebrow">ARCHIVIO 00 / COME È NATO</span>
          <h2>IL VINTAGE NON STA FERMO.</h2>
          <p>Le zip delle track jacket tirate fino al mento. Il denim che cade largo e si consuma sulle sneakers. La pelle che dopo dieci anni smette di essere una giacca e diventa una seconda pelle. Siamo partiti da lì, da come si vestiva la gente quando nessuno la stava guardando.</p>
          <p>Cerchiamo i capi uno alla volta, li controlliamo, li fotografiamo e li rimettiamo in giro. <em>Niente riproduzioni, niente «ispirato a».</em> Roba vera, con i segni addosso.</p>
          <p class="editorial-nota">Le fotografie del diario ritraggono personaggi pubblici degli anni 2000 e servono a raccontare un’epoca. Non c’è nessun accordo, nessuna sponsorizzazione e nessun legame fra loro e questo negozio.</p>
          <a class="button button-dark" routerLink="/catalogo">Vai a vedere i capi <svg lucideArrowUpRight [size]="18"></svg></a>
        </div>
      }
    </section>
  `,
})
export class EditorialComponent {
  readonly full = input(false, { transform: booleanAttribute });
}
