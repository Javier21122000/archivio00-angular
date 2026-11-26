import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { UiService } from '../core/services/ui.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, LucideArrowUpRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="footer-top">
        <div>
          <a routerLink="/" class="brand">ARCHIVIO<span class="brand-zero">00<sup>®</sup></span></a>
          <p>Vintage menswear. Modern attitude.<br />Curato in Italia, radicato nei 2000.</p>
        </div>
        <nav aria-label="Link footer">
          <a routerLink="/catalogo">L’archivio <svg lucideArrowUpRight [size]="14"></svg></a>
          <a routerLink="/editoriale">La cultura <svg lucideArrowUpRight [size]="14"></svg></a>
          <a routerLink="/preferiti">I tuoi preferiti <svg lucideArrowUpRight [size]="14"></svg></a>
        </nav>
        <button type="button" class="footer-access" (click)="ui.setTestDrawer(true)">
          <span class="eyebrow">IL TUO ACCESSO</span>
          <span><span class="status-dot"></span>LIVELLO {{ levelLabel() }}</span>
          <small>Scopri i tre livelli <svg lucideArrowUpRight [size]="13"></svg></small>
        </button>
      </div>
      <div class="footer-wordmark" aria-hidden="true">ARCHIVIO 00</div>
      <div class="footer-bottom">
        <span>© {{ year }} ARCHIVIO 00</span>
        <span>PAST PERFECT. PRESENT TENSE.</span>
        <span>ITALIA / EUR €</span>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  private readonly auth = inject(AuthService);
  protected readonly ui = inject(UiService);
  protected readonly year = new Date().getFullYear();
  protected readonly levelLabel = computed(
    () => ({ 1: '01 / PUBBLICO', 2: '02 / UTENTE', 3: '03 / AMMINISTRATORE' })[this.auth.level()],
  );
}
