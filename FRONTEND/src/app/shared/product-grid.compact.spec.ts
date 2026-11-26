import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductGridComponent } from './product-grid.component';

describe('ProductGridComponent compact (home)', () => {
  it('chiede solo 8 capi e non mostra "Mostra altri"', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProductGridComponent);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const req = http.expectOne((r) => r.url === '/api/oggetti');
    expect(req.request.params.get('limit')).toBe('8');
    expect(req.request.params.get('ordine')).toBe('archivio');
    req.flush({
      items: [{ id: 'a', nome: 'A', prezzo: 1 }],
      total: 30,
      page: 1,
      limit: 8,
      totalPages: 4,
      catalogCount: 30,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.button-outline')).toBeNull();
    expect(el.querySelector('.underlined-link')?.textContent).toContain('Tutti i capi');
  });
});
