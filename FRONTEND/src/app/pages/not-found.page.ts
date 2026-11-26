import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="empty-state page-section">
      <span class="eyebrow">404 / FUORI ARCHIVIO</span>
      <h1>Questa pagina non sta in archivio.</h1>
      <a class="button button-dark" routerLink="/">Torna alla home</a>
    </section>
  `,
})
export class NotFoundPage {}
