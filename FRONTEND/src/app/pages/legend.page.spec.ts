import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { Page, Product } from '../core/models';
import { ProductService } from '../core/services/product.service';
import { leggendaDi } from '../data/leggende';
import { LegendPage } from './legend.page';

const page = (items: Product[]): Page<Product> => ({ items, total: items.length, page: 1, limit: 60, totalPages: 1, catalogCount: 28 });
const capo = (id: string): Product => ({ id, nome: `Capo ${id}`, prezzo: 10 });

describe('LegendPage', () => {
  let list: ReturnType<typeof vi.fn>;

  function setup(slug: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ProductService, useValue: { list } }],
    });
    const fixture = TestBed.createComponent(LegendPage);
    fixture.componentRef.setInput('slug', slug);
    fixture.detectChanges();
    return fixture;
  }
  const html = (f: { nativeElement: unknown }) => f.nativeElement as HTMLElement;

  it('chiede al server solo i capi della leggenda (limit 60) e mostra lo skeleton nell’attesa', () => {
    list = vi.fn(() => new Subject<Page<Product>>());
    const fixture = setup('messi');
    expect(list).toHaveBeenCalledWith({ chiavi: leggendaDi('messi')!.capi, limit: 60 });
    expect(html(fixture).querySelector('app-grid-skeleton')).not.toBeNull();
  });

  it('a risposta arrivata mostra la griglia e il conteggio', async () => {
    const response = new Subject<Page<Product>>();
    list = vi.fn(() => response);
    const fixture = setup('messi');
    response.next(page([capo('1'), capo('2')]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html(fixture).querySelector('app-card-grid')).not.toBeNull();
    expect(html(fixture).querySelector('app-grid-skeleton')).toBeNull();
    expect(html(fixture).querySelector('.section-description')?.textContent).toContain('2 capi dell’archivio');
  });

  it('in caso di errore mostra "Riprova" e ripete la richiesta', async () => {
    list = vi.fn(() => throwError(() => new Error('rete')));
    const fixture = setup('cristiano');
    await fixture.whenStable();
    fixture.detectChanges();
    const button = html(fixture).querySelector<HTMLButtonElement>('[role="alert"] button')!;
    expect(button.textContent).toContain('Riprova');
    button.click();
    await fixture.whenStable();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('con uno slug sconosciuto mostra lo stato vuoto e non chiama il server', () => {
    list = vi.fn();
    const fixture = setup('pelè');
    expect(html(fixture).querySelector('h1')?.textContent).toBe('Questa leggenda non l’abbiamo.');
    expect(list).not.toHaveBeenCalled();
  });

  it('cambiando slug richiede i capi della nuova leggenda', () => {
    list = vi.fn(() => new Subject<Page<Product>>());
    const fixture = setup('messi');
    fixture.componentRef.setInput('slug', 'ronaldinho');
    fixture.detectChanges();
    TestBed.tick(); // lascia girare gli effect della resource (whenStable resterebbe in attesa del Subject)
    expect(list).toHaveBeenLastCalledWith({ chiavi: leggendaDi('ronaldinho')!.capi, limit: 60 });
  });
});
