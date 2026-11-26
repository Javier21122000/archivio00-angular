import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AlbumComponent } from '../shared/album.component';
import { EditorialComponent } from '../shared/editorial.component';
import { LegendPickerComponent } from '../shared/legend-picker.component';
import { ManifestoComponent } from '../shared/manifesto.component';
import { NastroComponent } from '../shared/nastro.component';
import { ProductGridComponent } from '../shared/product-grid.component';

/** La home e' solo composizione: ogni blocco e' un componente con una sola responsabilita'. */
@Component({
  selector: 'app-home-page',
  imports: [LegendPickerComponent, ProductGridComponent, NastroComponent, AlbumComponent, EditorialComponent, ManifestoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legend-picker />
    <div class="era-strip">
      <span><em>Vintage, not ordinary.</em></span>
      <span>PELLE VISSUTA</span>
      <span>DENIM CHE STRISCIA</span>
      <span>TUTE DUE TAGLIE IN PIÙ</span>
      <span>2000—2010 <span class="strip-star">✳</span></span>
    </div>
    <app-product-grid [compact]="true" />
    <app-nastro />
    <app-album />
    <app-editorial />
    <app-manifesto />
  `,
})
export class HomePage {}
