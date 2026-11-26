import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UiService } from '../core/services/ui.service';
import { FavoritesPage } from './favorites.page';

function setup(loggedIn: boolean) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  const auth = TestBed.inject(AuthService);
  if (loggedIn) {
    auth.setSession({ token: 't', user: { id: 'u1', email: 'a@b.it', firstName: 'Ada', lastName: 'L', roles: ['USER'] } });
  }
  const fixture = TestBed.createComponent(FavoritesPage);
  fixture.detectChanges();
  TestBed.tick();
  return { fixture, el: fixture.nativeElement as HTMLElement, http: TestBed.inject(HttpTestingController) };
}

describe('FavoritesPage', () => {
  it('da non loggato invita ad accedere', () => {
    const { el, fixture } = setup(false);
    expect(el.textContent).toContain('La tua selezione inizia qui.');
    el.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    expect(TestBed.inject(UiService).authMode()).toBe('login');
    fixture.detectChanges();
  });

  it('mostra skeleton, poi lo stato vuoto', () => {
    const { el, fixture, http } = setup(true);
    expect(el.querySelector('app-grid-skeleton')).not.toBeNull();
    expect(el.querySelector('.privacy-note')?.textContent).toContain('Ada');
    http.match('/api/preferiti').filter((r) => !r.cancelled).forEach((r) => r.flush([]));
    fixture.detectChanges();
    expect(el.textContent).toContain('Fai spazio ai tuoi prossimi preferiti.');
    expect(el.textContent).toContain('(0)');
  });

  it('su errore mostra Riprova e ricarica al click', () => {
    const { el, fixture, http } = setup(true);
    http.match('/api/preferiti').filter((r) => !r.cancelled).forEach((r) => r.flush({}, { status: 500, statusText: 'Err' }));
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'Riprova')!.click();
    http.expectOne('/api/preferiti').flush([]);
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
