import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { Page, Product, ProductInput, ProductQuery, ProductStats } from '../models';

/** Accesso al catalogo. Filtri, ricerca e paginazione sono lato server (vedi API-CONTRACT). */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly changesSubject = new Subject<void>();

  /** Emette dopo ogni create/update/delete: le liste si ascoltano questo stream per ricaricarsi. */
  readonly changes$ = this.changesSubject.asObservable();

  list(query: ProductQuery = {}): Observable<Page<Product>> {
    return this.http.get<Page<Product>>('/api/oggetti', { params: toParams(query) });
  }

  stats(): Observable<ProductStats> {
    return this.http.get<ProductStats>('/api/oggetti/statistiche');
  }

  create(input: ProductInput): Observable<Product> {
    return this.http.post<Product>('/api/oggetti', input).pipe(tap(() => this.changesSubject.next()));
  }

  update(id: string, input: ProductInput): Observable<Product> {
    return this.http
      .put<Product>(`/api/oggetti/${encodeURIComponent(id)}`, input)
      .pipe(tap(() => this.changesSubject.next()));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`/api/oggetti/${encodeURIComponent(id)}`)
      .pipe(tap(() => this.changesSubject.next()));
  }
}

/** Costruisce i query param omettendo valori vuoti/falsi, cosi' l'URL resta pulito. */
export function toParams(query: ProductQuery): HttpParams {
  let params = new HttpParams();
  const text = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  };
  text('page', query.page);
  text('limit', query.limit);
  text('q', query.q?.trim());
  text('categoria', query.categoria);
  text('ordine', query.ordine);
  if (query.special) params = params.set('special', 'true');
  if (query.soloBozze) params = params.set('soloBozze', 'true');
  if (query.chiavi?.length) params = params.set('chiavi', query.chiavi.join(','));
  return params;
}
