import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Ad ogni navigazione si riparte dall'alto (scrollPositionRestoration).
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withComponentInputBinding(), // i parametri di route (:slug) arrivano come input()
    ),
    // L'ordine conta: prima aggiungiamo il token, poi gestiamo gli errori della risposta.
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
