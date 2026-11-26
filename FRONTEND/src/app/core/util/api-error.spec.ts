import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './api-error';

const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('errorMessage', () => {
  it('server irraggiungibile', () => {
    expect(errorMessage(http(0))).toContain('NestJS sia attivo sulla porta 3000');
  });
  it('messaggi fissi per 401/403/404/409', () => {
    expect(errorMessage(http(401))).toContain('Sessione scaduta');
    expect(errorMessage(http(403))).toContain('Accesso non consentito');
    expect(errorMessage(http(404))).toContain('Elemento non trovato');
    expect(errorMessage(http(409))).toContain('esiste già');
  });
  it('usa il message del body sotto i 500', () => {
    expect(errorMessage(http(400, { message: 'Nome obbligatorio' }))).toBe('Nome obbligatorio');
  });
  it('ignora il body per i 500', () => {
    expect(errorMessage(http(500, { message: 'stack segreto' }))).toContain('Riprova tra poco');
  });
  it('errori generici', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('x')).toBe('Si è verificato un errore inatteso.');
  });
});
