import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { leggende } from '../data/leggende';
import { LegendPickerComponent } from './legend-picker.component';

describe('LegendPickerComponent', () => {
  function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LegendPickerComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra una carta per leggenda con link alla sua pagina', () => {
    const links = Array.from(render().querySelectorAll('a.carta-leggenda'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(leggende.map((l) => `/leggenda/${l.slug}`));
  });

  it('solo la prima immagine ha priorita alta, le altre sono lazy', () => {
    const imgs = Array.from(render().querySelectorAll('.carta-media img'));
    expect(imgs[0].getAttribute('fetchpriority')).toBe('high');
    expect(imgs[0].getAttribute('loading')).toBeNull();
    for (const img of imgs.slice(1)) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('fetchpriority')).toBeNull();
    }
  });
});
