import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { diario, diarioHome } from '../data/culture';
import { AlbumComponent, selectScatti } from './album.component';

describe('selectScatti', () => {
  it('in home mostra solo gli scatti scelti, nell’ordine del diario', () => {
    const ids = selectScatti(false).map((s) => s.id);
    expect(ids.sort()).toEqual([...diarioHome].sort());
  });

  it('nella versione full mostra tutto il diario', () => {
    expect(selectScatti(true)).toHaveLength(diario.length);
  });
});

describe('AlbumComponent', () => {
  function render(full: boolean) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AlbumComponent);
    fixture.componentRef.setInput('full', full);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('la versione breve ha il link al diario completo e non il manifesto', () => {
    const el = render(false);
    expect(el.querySelectorAll('figure.scatto')).toHaveLength(diarioHome.length);
    expect(el.querySelector('a.album-tutto')?.getAttribute('href')).toBe('/editoriale');
    expect(el.querySelector('.album-manifesto')).toBeNull();
  });

  it('la versione full ha tutti gli scatti e il manifesto', () => {
    const el = render(true);
    expect(el.querySelectorAll('figure.scatto')).toHaveLength(diario.length);
    expect(el.querySelector('.album-manifesto')).not.toBeNull();
    expect(el.querySelector('a.album-tutto')).toBeNull();
  });
});
