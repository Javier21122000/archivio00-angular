import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Product } from '../core/models';
import { AuthService } from '../core/services/auth.service';
import { UiService } from '../core/services/ui.service';
import { stubDialog } from '../testing/dialog-stub';
import { FALLBACK_IMAGE, ProductCardComponent, imageOf } from './product-card.component';

const base: Product = {
  id: 'p1',
  nome: 'Giacca',
  prezzo: 100,
  variante: 'Nera',
  prezzoAcquisto: 40,
  fornitore: 'ACME',
  pubblicato: false,
};

describe('imageOf', () => {
  it('usa il segnaposto se manca o e’ vuota', () => {
    expect(imageOf({ ...base, immagineUrl: undefined })).toBe(FALLBACK_IMAGE);
    expect(imageOf({ ...base, immagineUrl: '   ' })).toBe(FALLBACK_IMAGE);
    expect(imageOf({ ...base, immagineUrl: ' /a.png ' })).toBe('/a.png');
  });
});

describe('ProductCardComponent', () => {
  let fixture: ComponentFixture<ProductCardComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const card = () => el().querySelector<HTMLElement>('.product-card')!;

  const create = async (product: Product = base) => {
    stubDialog();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', product);
    fixture.componentRef.setInput('index', 2);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('espone nome accessibile, numero progressivo e ruolo button', async () => {
    await create();
    expect(card().getAttribute('role')).toBe('button');
    expect(card().getAttribute('aria-label')).toBe('Apri dettaglio: Giacca · Nera');
    expect(el().querySelector('.product-number')?.textContent).toContain('ARCHIVE / 03');
    expect(el().querySelector('.quick-edit-button')).toBeNull();
    expect(el().querySelector('.private-data')).toBeNull();
  });

  it('Invio sulla card apre il dettaglio, Invio sul cuore no', async () => {
    await create();
    const heart = el().querySelector<HTMLElement>('.heart-button')!;
    heart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(el().querySelector('app-modal')).toBeNull();
    card().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(el().querySelector('app-modal')).toBeTruthy();
  });

  it('il cuore da non loggato apre la modale di accesso senza aprire il dettaglio', async () => {
    await create();
    el().querySelector<HTMLButtonElement>('.heart-button')!.click();
    fixture.detectChanges();
    expect(TestBed.inject(UiService).authMode()).toBe('login');
    expect(el().querySelector('app-modal')).toBeNull();
  });

  it('un admin vede margine, bozza e Edit rapido; il cuore e’ disabilitato sulle bozze', async () => {
    await create();
    TestBed.inject(AuthService).user.set({ id: 'u', email: 'a@a.it', firstName: 'A', lastName: 'B', roles: ['ADMIN'] });
    fixture.detectChanges();
    expect(el().querySelector('.private-data')?.textContent).toContain('60,00');
    expect(el().querySelector('.draft-badge')).toBeTruthy();
    expect(el().querySelector('.quick-edit-button')?.getAttribute('aria-label')).toBe('Modifica: Giacca · Nera');
    expect(el().querySelector<HTMLButtonElement>('.heart-button')!.disabled).toBe(true);
  });

  it('se l’immagine non carica passa al segnaposto una sola volta', async () => {
    await create({ ...base, immagineUrl: '/assets/products/rotta.png' });
    const img = el().querySelector<HTMLImageElement>('.product-image img')!;
    img.dispatchEvent(new Event('error'));
    expect(img.src.endsWith(FALLBACK_IMAGE)).toBe(true);
  });
});
