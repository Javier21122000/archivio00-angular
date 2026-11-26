import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Product, ProductInput } from '../core/models';
import { stubDialog } from '../testing/dialog-stub';
import { EditProductComponent } from './edit-product.component';

const product: Product = {
  id: 'p1',
  nome: 'Giacca',
  prezzo: 100,
  prezzoAcquisto: 40,
  fornitore: 'ACME',
  pubblicato: true,
  inEvidenza: false,
  immagineUrl: '/assets/products/x.png',
  rating: 4,
  numeroRecensioni: 3,
  categoria: 'Outerwear',
  variante: 'Nera',
};

describe('EditProductComponent', () => {
  let fixture: ComponentFixture<EditProductComponent>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const field = (name: string) => el().querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  const type = (name: string, value: string) => {
    field(name).value = value;
    field(name).dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    stubDialog();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EditProductComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('precompila il form dal capo', () => {
    expect(field('nome').value).toBe('Giacca');
    expect(field('prezzo').value).toBe('100');
    expect(field('prezzoAcquisto').value).toBe('40');
    expect(el().querySelector('.form-note')?.textContent).toContain('Nera');
  });

  it('invia un PUT completo conservando i metadati non modificabili e chiude', async () => {
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    type('nome', '  Giacca QA ');
    type('prezzo', '120.5');
    el().querySelector<HTMLButtonElement>('[aria-label="Special Edition"]')!.click();
    el().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    const req = http.expectOne('/api/oggetti/p1');
    expect(req.request.method).toBe('PUT');
    const body = req.request.body as ProductInput;
    expect(body).toMatchObject({
      nome: 'Giacca QA',
      prezzo: 120.5,
      prezzoAcquisto: 40,
      pubblicato: true,
      isSpecialEdition: true,
      immagineUrl: '/assets/products/x.png',
      rating: 4,
      numeroRecensioni: 3,
      categoria: 'Outerwear',
      variante: 'Nera',
    });
    req.flush({ ...product });
    await fixture.whenStable();
    expect(closed).toBe(true);
  });

  it('con campi non validi non invia nulla e mostra l’errore', () => {
    type('nome', '');
    el().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    http.expectNone('/api/oggetti/p1');
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Controlla i campi');
  });

  it('mostra l’errore del server e non chiude', async () => {
    el().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/oggetti/p1').flush({ message: 'Nome e variante già presenti' }, { status: 400, statusText: 'x' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Nome e variante già presenti');
  });
});
