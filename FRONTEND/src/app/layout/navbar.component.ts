import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideArrowUpRight, LucideHeart, LucideSettings2, LucideUserRound } from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { FavoriteService } from '../core/services/favorite.service';
import { UiService } from '../core/services/ui.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideArrowUpRight, LucideHeart, LucideSettings2, LucideUserRound],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="announcement">
      <span>IL PASSATO HA ANCORA QUALCOSA DA DIRE.</span>
      <span class="hidden sm:inline">SELEZIONE VINTAGE / 2000—2010 <svg lucideArrowUpRight [size]="12"></svg></span>
    </div>
    <header class="navbar">
      <a routerLink="/" class="brand" aria-label="ARCHIVIO 00 — Home">ARCHIVIO<span class="brand-zero">00<sup>®</sup></span></a>
      <nav class="main-nav" aria-label="Navigazione principale">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/catalogo" routerLinkActive="active">L’archivio</a>
        <a routerLink="/editoriale" routerLinkActive="active">La cultura <svg lucideArrowUpRight [size]="12"></svg></a>
        @if (auth.isAdmin()) { <a routerLink="/admin" routerLinkActive="active">Studio admin</a> }
      </nav>
      <div class="nav-actions">
        <button type="button" class="access-button" title="Prova i tre livelli di accesso" (click)="ui.setTestDrawer(true)">
          <svg lucideSettings2 [size]="16"></svg><span>Accessi</span>
        </button>
        <a routerLink="/preferiti" class="icon-button favorite-nav" [attr.aria-label]="'Preferiti, ' + favorites.favorites().length + ' capi'">
          <svg lucideHeart [size]="20"></svg>
          @if (favorites.favorites().length > 0) { <span>{{ favorites.favorites().length }}</span> }
        </a>
        <button type="button" class="account-button" (click)="auth.user() ? ui.setTestDrawer(true) : ui.openAuth()">
          <svg lucideUserRound [size]="17"></svg><span>{{ auth.user()?.firstName ?? 'Accedi' }}</span>
        </button>
      </div>
    </header>
    @if (auth.isAdmin()) {
      <div class="admin-mode">
        <span class="status-dot"></span>ADMIN MODE - {{ (auth.user()?.firstName ?? 'JAVIER').toUpperCase() }}<span>Bozze e dati riservati visibili</span>
      </div>
    }
  `,
})
export class NavbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly favorites = inject(FavoriteService);
  protected readonly ui = inject(UiService);
}
