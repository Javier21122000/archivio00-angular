import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideHeart, LucideLockKeyhole } from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { FavoriteService } from '../core/services/favorite.service';
import { UiService } from '../core/services/ui.service';
import { CardGridComponent } from '../shared/card-grid.component';
import { GridSkeletonComponent } from '../shared/grid-skeleton.component';

/**
 * Preferiti dell'utente. Il ricaricamento al cambio utente e' gia' nel FavoriteService
 * (effect sul token): qui basta chiedere un load all'ingresso nella pagina.
 */
@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink, CardGridComponent, GridSkeletonComponent, LucideArrowUpRight, LucideHeart, LucideLockKeyhole],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-section">
      <div class="section-heading">
        <div>
          <span class="eyebrow">YOUR PERSONAL ARCHIVE</span>
          <h1>I TUOI PREFERITI<span class="heading-count">({{ favorites.favorites().length }})</span></h1>
        </div>
        <svg lucideHeart [size]="38" [strokeWidth]="1"></svg>
      </div>
      @if (auth.user(); as user) {
        <div class="privacy-note">
          <svg lucideLockKeyhole [size]="16"></svg>
          <span>La selezione di <strong>{{ user.firstName }}</strong>. Visibile soltanto a questo account.</span>
          <span class="eyebrow">LIVELLO 02 / PERSONALE</span>
        </div>
        @if (favorites.loading()) {
          <app-grid-skeleton />
        } @else if (favorites.error(); as message) {
          <div role="alert" class="empty-state">
            <h3>Non riusciamo a caricare i tuoi preferiti.</h3>
            <p>{{ message }}</p>
            <button type="button" class="button button-outline" (click)="favorites.load()">Riprova</button>
          </div>
        } @else if (products().length) {
          <app-card-grid [products]="products()" />
        } @else {
          <div class="empty-state">
            <svg lucideHeart [size]="30" [strokeWidth]="1.2"></svg>
            <h3>Fai spazio ai tuoi prossimi preferiti.</h3>
            <p>Tocca il cuore su un capo per ritrovarlo qui.</p>
            <a routerLink="/catalogo" class="button button-dark">Esplora l’archivio<svg lucideArrowUpRight [size]="18"></svg></a>
          </div>
        }
      } @else {
        <div class="empty-state">
          <svg lucideLockKeyhole [size]="30" [strokeWidth]="1.2"></svg>
          <h3>La tua selezione inizia qui.</h3>
          <p>Accedi per salvare i capi che raccontano il tuo stile.</p>
          <button type="button" class="button button-dark" (click)="ui.openAuth()">Accedi al tuo archivio<svg lucideArrowUpRight [size]="18"></svg></button>
        </div>
      }
    </section>
  `,
})
export class FavoritesPage {
  protected readonly auth = inject(AuthService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly ui = inject(UiService);
  protected readonly products = computed(() => this.favorites.favorites().map((f) => f.oggetto));

  constructor() {
    this.favorites.load(); // ingresso nella pagina: dati freschi (il cambio utente e' gestito dal servizio)
  }
}
