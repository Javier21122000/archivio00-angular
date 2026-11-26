import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/services/auth.service';
import { ProductService } from '../core/services/product.service';
import { AdminPage, pad2 } from './admin.page';
import { twoDecimals } from './admin/create-product.component';
import { FormControl } from '@angular/forms';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const auth = TestBed.inject(AuthService);
  auth.user.set({ id: ME, email: 'a@b.it', firstName: 'Ada', lastName: 'Admin', roles: ['USER', 'ADMIN'] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AdminPage);
  fixture.detectChanges();
  http.expectOne('/api/oggetti/statistiche').flush({ totale: 7, pubblicati: 5, bozze: 2 });
  fixture.detectChanges();
  return { fixture, http, el: fixture.nativeElement as HTMLElement };
}

beforeEach(() => {
  // jsdom non implementa <dialog>.showModal/close: bastano due finti metodi
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});

describe('AdminPage', () => {
  it('pad2 aggiunge lo zero iniziale', () => {
    expect(pad2(7)).toBe('07');
    expect(pad2(28)).toBe('28');
  });

  it('twoDecimals accetta 19.99 ma non 1.005', () => {
    expect(twoDecimals(new FormControl(19.99))).toBeNull();
    expect(twoDecimals(new FormControl(1.005))).toEqual({ decimals: true });
  });

  it('mostra il riepilogo dalle statistiche', () => {
    const { el } = setup();
    expect(Array.from(el.querySelectorAll('.admin-summary strong')).map((s) => s.textContent)).toEqual(['07', '05', '02']);
  });

  it('ricarica il riepilogo quando il catalogo cambia', () => {
    const { http, fixture } = setup();
    TestBed.inject(ProductService)['changesSubject'].next();
    http.expectOne('/api/oggetti/statistiche').flush({ totale: 8, pubblicati: 6, bozze: 2 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.admin-summary strong').textContent).toBe('08');
  });

  it('non mostra nulla a chi non e admin', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AdminPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('impedisce di modificare il proprio ruolo', () => {
    const { el, fixture } = setup();
    const input = el.querySelector<HTMLInputElement>('input[name="userId"]')!;
    input.value = ME;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const buttons = el.querySelectorAll<HTMLButtonElement>('.admin-box form button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Non puoi modificare il tuo stesso ruolo');
  });

  it('promuove un altro utente dopo la conferma e mostra il risultato', () => {
    const { el, fixture, http } = setup();
    const input = el.querySelector<HTMLInputElement>('input[name="userId"]')!;
    input.value = OTHER;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(el.querySelector('#modal-title')?.textContent).toContain('Concedere l’accesso admin?');
    const confirm = Array.from(el.querySelectorAll('dialog button')).find((b) => b.textContent?.trim() === 'Conferma') as HTMLButtonElement;
    confirm.click();
    const req = http.expectOne(`/api/admin/utenti/${OTHER}/ruolo-admin`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: OTHER, email: 'u@x.it', firstName: 'Ugo', lastName: 'Rossi', roles: ['USER', 'ADMIN'] });
    fixture.detectChanges();
    expect(el.querySelector('.role-result')?.textContent).toContain('ROLE_USER · ROLE_ADMIN');
    expect(el.querySelector('dialog')).toBeNull();
  });
});
