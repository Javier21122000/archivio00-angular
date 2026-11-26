import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UiService } from '../../core/services/ui.service';
import { CreateProductComponent } from './create-product.component';

function setup(pubblicato = false) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(CreateProductComponent);
  fixture.componentRef.setInput('initial', { nome: 'Capo', prezzo: 10, prezzoAcquisto: 4, fornitore: 'Forn', pubblicato });
  const closed = vi.fn();
  fixture.componentInstance.closed.subscribe(closed);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, http: TestBed.inject(HttpTestingController), closed };
}

beforeEach(() => {
  // jsdom non implementa <dialog>.showModal/close: bastano due finti metodi
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});

describe('CreateProductComponent', () => {
  it('precompila il form dalla scheda e rispetta il toggle pubblicato', () => {
    const { el, fixture } = setup();
    expect(el.querySelector<HTMLInputElement>('input[formcontrolname="nome"]')!.value).toBe('Capo');
    const toggle = el.querySelector('[role="switch"]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    (toggle as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(el.textContent).toContain('Pubblica capo');
  });

  it('non invia un form non valido (prezzo oltre 9999.99)', () => {
    const { el, fixture, http } = setup();
    const price = el.querySelector<HTMLInputElement>('input[formcontrolname="prezzo"]')!;
    price.value = '10000';
    price.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    http.expectNone('/api/oggetti');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('crea il capo, notifica e chiude', () => {
    const { el, http, closed } = setup(true);
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/oggetti');
    expect(req.request.body).toMatchObject({ nome: 'Capo', prezzo: 10, prezzoAcquisto: 4, fornitore: 'Forn', pubblicato: true });
    req.flush({});
    expect(TestBed.inject(UiService).toast()?.message).toBe('Capo pubblicato nell’archivio.');
    expect(closed).toHaveBeenCalled();
  });

  it('mostra l errore del server e resta aperto', () => {
    const { el, fixture, http, closed } = setup();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/oggetti').flush({ message: 'Nome e variante già presenti' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(closed).not.toHaveBeenCalled();
  });
});
