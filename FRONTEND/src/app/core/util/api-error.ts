import { HttpErrorResponse } from '@angular/common/http';

/** Trasforma qualunque errore in un messaggio italiano da mostrare all'utente. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // status 0 = nessuna risposta (server spento, CORS, rete)
    if (error.status === 0) {
      return 'Il server non risponde. Verifica che il server NestJS sia attivo sulla porta 3000 e riprova.';
    }
    if (error.status === 401) return 'Sessione scaduta o credenziali non valide. Accedi di nuovo.';
    if (error.status === 403) {
      return 'Accesso non consentito. Verifica le credenziali e il ruolo del tuo account.';
    }
    if (error.status === 404) {
      return 'Elemento non trovato. Potrebbe essere stato rimosso o non essere pubblicato.';
    }
    if (error.status === 409) {
      return 'Questo elemento esiste già. Aggiorna la pagina o scegli un nome diverso.';
    }
    const body: unknown = error.error;
    // Sotto i 500 il backend manda messaggi pensati per l'utente (es. validazione)
    if (error.status < 500 && body && typeof body === 'object' && 'message' in body) {
      const { message } = body;
      if (typeof message === 'string') return message;
    }
    return 'Non è stato possibile completare la richiesta. Riprova tra poco.';
  }
  return error instanceof Error ? error.message : 'Si è verificato un errore inatteso.';
}
