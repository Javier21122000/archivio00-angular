import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AlbumComponent } from '../shared/album.component';
import { EditorialComponent } from '../shared/editorial.component';

/** /editoriale: le stesse sezioni della home, ma nella versione completa. */
@Component({
  selector: 'app-editorial-page',
  imports: [EditorialComponent, AlbumComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-editorial full />
    <app-album full />
  `,
})
export class EditorialPage {}
