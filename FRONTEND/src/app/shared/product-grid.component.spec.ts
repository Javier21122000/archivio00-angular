import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Page, Product } from '../core/models';
import { ProductGridComponent } from './product-grid.component';

const product = (n: number): Product => ({ id: `id-${n}`, nome: `Capo ${n}`, prezzo: 10 + n });
const page = (from: number, count: number, extra: Partial<Page<Product>> = {}): Page<Product> => ({
  items: Array.from({ length: count }, (_, i) => product(from + i)),
  total: 30,
  page: 1,
  limit: 12,
  totalPages: 3,
  catalogCount: 30,
  ...extra,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ProductGridComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ProductGridComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  const lastList = (): TestRequest => {
    const open = http.match((r) => r.url === '/api/oggetti');
    return open[open.length - 1];
  };
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductGridComponent);
    await settle();
  });

  it('chiede la prima pagina al server (12 capi, ordine archivio) e mostra lo scheletro', () => {
    expect(el().querySelector('.product-skeleton')).toBeTruthy();
    const req = http.expectOne((r) => r.url === '/api/oggetti');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('12');
    expect(req.request.params.get('ordine')).toBe('archivio');
  });

  it('mostra i capi, il conteggio nel titolo e il totale nella nota', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 12));
    await settle();
    expect(el().querySelectorAll('.product-card').length).toBe(12);
    expect(el().querySelector('.heading-count')?.textContent).toBe('(30)');
    expect(el().querySelector('.catalog-footnote')?.textContent).toContain('30 CAPI NELLA SELEZIONE');
    expect(el().querySelector('.product-number')?.textContent).toContain('ARCHIVE / 01');
  });

  it('un cambio di categoria annulla la richiesta in corso e ne invia una nuova', async () => {
    const first = http.expectOne((r) => r.url === '/api/oggetti');
    const denim = Array.from(el().querySelectorAll('.category-tabs button')).find((b) => b.textContent === 'Denim');
    (denim as HTMLButtonElement).click();
    await settle();
    expect(first.cancelled).toBe(true);
    const second = lastList();
    expect(second.request.params.get('categoria')).toBe('Denim');
    second.flush(page(1, 2, { total: 2, totalPages: 1 }));
    await settle();
    expect(el().querySelectorAll('.product-card').length).toBe(2);
  });

  it('SPECIAL EDITIONS usa special=true e non categoria', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 12));
    const tab = Array.from(el().querySelectorAll('.category-tabs button')).find((b) => b.textContent === 'SPECIAL EDITIONS');
    (tab as HTMLButtonElement).click();
    await settle();
    const req = lastList();
    expect(req.request.params.get('special')).toBe('true');
    expect(req.request.params.has('categoria')).toBe(false);
    req.flush(page(1, 1, { total: 1, totalPages: 1 }));
  });

  it('"Mostra altri" accoda la pagina successiva senza richieste doppie e continua la numerazione', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 12));
    await settle();
    const more = () => el().querySelector<HTMLButtonElement>('.button-outline');
    expect(more()?.textContent).toContain('Mostra altri');
    more()?.click();
    more()?.click(); // secondo click ignorato: la richiesta e' gia' in corso
    await settle();
    const req = http.expectOne((r) => r.url === '/api/oggetti');
    expect(req.request.params.get('page')).toBe('2');
    req.flush(page(13, 12, { page: 2 }));
    await settle();
    expect(el().querySelectorAll('.product-card').length).toBe(24);
    expect(el().querySelectorAll('.product-number')[23].textContent).toContain('ARCHIVE / 24');
    expect(el().querySelector('[aria-live="polite"]')?.textContent).toContain('24 su 30');
  });

  it('l’ultima pagina nasconde "Mostra altri"', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 5, { total: 5, totalPages: 1 }));
    await settle();
    expect(el().querySelector('.button-outline')).toBeNull();
  });

  it('errore al primo caricamento: avviso e "Riprova" che richiede la lista', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush({ message: 'giu' }, { status: 500, statusText: 'x' });
    await settle();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('momentaneamente offline');
    el().querySelector<HTMLButtonElement>('.empty-state .button-dark')?.click();
    await settle();
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 3, { total: 3, totalPages: 1 }));
    await settle();
    expect(el().querySelectorAll('.product-card').length).toBe(3);
  });

  it('errore su "Mostra altri": la lista resta e si puo’ riprovare', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 12));
    await settle();
    el().querySelector<HTMLButtonElement>('.button-outline')?.click();
    await settle();
    http.expectOne((r) => r.url === '/api/oggetti').flush({}, { status: 500, statusText: 'x' });
    await settle();
    expect(el().querySelectorAll('.product-card').length).toBe(12);
    expect(el().querySelector('.error-text')).toBeTruthy();
    expect(el().querySelector('.button-outline')?.textContent).toContain('Riprova');
  });

  it('la ricerca e’ ritardata di 300 ms', async () => {
    http.expectOne((r) => r.url === '/api/oggetti').flush(page(1, 12));
    el().querySelector<HTMLButtonElement>('.filter-toggle')?.click();
    await settle();
    const input = el().querySelector<HTMLInputElement>('.search-field input')!;
    input.value = 'denim';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Tempi reali: rxjs legge il timer all'avvio e i fake timer di vitest non lo intercettano.
    await sleep(150);
    fixture.detectChanges();
    http.expectNone((r) => r.url === '/api/oggetti');
    await sleep(250);
    fixture.detectChanges();
    expect(lastList().request.params.get('q')).toBe('denim');
  });
});
