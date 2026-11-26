import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

// Ogni pagina e' un chunk separato (loadComponent): si scarica solo quando serve.
export const routes: Routes = [
  { path: '', title: 'ARCHIVIO 00 — Vintage menswear. Modern attitude.', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
  { path: 'catalogo', title: 'L’archivio — ARCHIVIO 00', loadComponent: () => import('./pages/catalog.page').then((m) => m.CatalogPage) },
  { path: 'leggenda/:slug', title: 'Leggenda — ARCHIVIO 00', loadComponent: () => import('./pages/legend.page').then((m) => m.LegendPage) },
  { path: 'preferiti', title: 'I tuoi preferiti — ARCHIVIO 00', loadComponent: () => import('./pages/favorites.page').then((m) => m.FavoritesPage) },
  { path: 'admin', title: 'Studio admin — ARCHIVIO 00', canActivate: [adminGuard], loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPage) },
  { path: 'editoriale', title: 'La cultura — ARCHIVIO 00', loadComponent: () => import('./pages/editorial.page').then((m) => m.EditorialPage) },
  { path: '**', title: 'Fuori archivio — ARCHIVIO 00', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage) },
];
