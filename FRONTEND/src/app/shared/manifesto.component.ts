import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideAsterisk } from '@lucide/angular';
import { RevealDirective } from './reveal.directive';

/** Chiusura della home: slogan e invito al diario. */
@Component({
  selector: 'app-manifesto',
  imports: [RouterLink, RevealDirective, LucideArrowUpRight, LucideAsterisk],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="manifesto rounded-3xl" appReveal>
      <span class="eyebrow">ARCHIVIO 00 — NATO ADESSO, CRESCIUTO ALLORA.</span>
      <svg lucideAsterisk [size]="58" [strokeWidth]="1"></svg>
      <h2>GOOD STYLE.<br /><span>SECOND LIFE.</span></h2>
      <p>Non serve inventarsi un’altra epoca.<br /><em>Basta ridare vita a quella giusta.</em></p>
      <a routerLink="/editoriale" class="underlined-link">Entra nel diario <svg lucideArrowUpRight [size]="17"></svg></a>
    </section>
  `,
})
export class ManifestoComponent {}
