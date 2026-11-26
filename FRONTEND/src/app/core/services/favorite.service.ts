import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, Observable, Subject, catchError, finalize, ignoreElements, switchMap, tap } from 'rxjs';
import { Favorite } from '../models';
import { errorMessage } from '../util/api-error';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly loadRequests = new Subject<void>();

  readonly favorites = signal<Favorite[]>([]);
  /** Id dei capi con una chiamata in corso: servono a bloccare i doppi click. */
  readonly pendingIds = signal<string[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // switchMap annulla la richiesta precedente (evita che una risposta lenta sovrascriva una più recente)
    this.loadRequests
      .pipe(
        switchMap(() => {
          if (!this.auth.token()) {
            this.favorites.set([]);
            this.loading.set(false);
            return EMPTY;
          }
          this.loading.set(true);
          this.error.set(null);
          return this.http.get<Favorite[]>('/api/preferiti').pipe(
            tap((list) => {
              this.favorites.set(list);
              this.loading.set(false);
            }),
            catchError((err: unknown) => {
              this.error.set(errorMessage(err));
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe();

    // Cambia utente/token: svuota subito (niente preferiti di altri che "lampeggiano") e ricarica.
    effect(() => {
      this.auth.token();
      untracked(() => {
        this.favorites.set([]);
        this.pendingIds.set([]);
        this.error.set(null);
        this.load();
      });
    });
  }

  load(): void {
    this.loadRequests.next();
  }

  isFavorite(productId: string): boolean {
    return this.favorites().some((f) => f.oggetto.id === productId);
  }

  /** Aggiunge o toglie un preferito. Non emette valori: si completa a chiamata finita (o subito se ignorata) e propaga gli errori. */
  toggle(productId: string): Observable<void> {
    const token = this.auth.token();
    if (!token || this.pendingIds().includes(productId)) return EMPTY;
    this.pendingIds.update((ids) => [...ids, productId]);

    // Se nel frattempo l'utente e' cambiato, la risposta non deve toccare lo stato del nuovo utente.
    const sameSession = () => token === this.auth.token();
    const request$: Observable<unknown> = this.isFavorite(productId)
      ? this.http.delete<void>(`/api/preferiti/${encodeURIComponent(productId)}`).pipe(
          tap(() => {
            if (sameSession()) this.favorites.update((l) => l.filter((f) => f.oggetto.id !== productId));
          }),
        )
      : this.http.post<Favorite>(`/api/preferiti/${encodeURIComponent(productId)}`, null).pipe(
          tap((fav) => {
            if (sameSession()) {
              this.favorites.update((l) => [fav, ...l.filter((f) => f.oggetto.id !== productId)]);
            }
          }),
        );

    return request$.pipe(
      ignoreElements(),
      finalize(() => {
        if (sameSession()) this.pendingIds.update((ids) => ids.filter((id) => id !== productId));
      }),
    );
  }
}
