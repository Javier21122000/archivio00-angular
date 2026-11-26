import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('interceptor HTTP', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setSession({ token: 'jwt', user: { id: '1', email: 'e', firstName: 'f', lastName: 'l', roles: ['USER'] } });
  });

  it('aggiunge il Bearer alle richieste normali', () => {
    http.get('/api/oggetti').subscribe();
    expect(ctrl.expectOne('/api/oggetti').request.headers.get('Authorization')).toBe('Bearer jwt');
  });

  it('non lo aggiunge a /auth/', () => {
    http.post('/api/auth/login', {}).subscribe();
    expect(ctrl.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('un 401 fuori da /auth/ chiude la sessione', () => {
    http.get('/api/preferiti').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/preferiti').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token()).toBeNull();
  });

  it('un 401 su /auth/ non tocca la sessione', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    ctrl.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token()).toBe('jwt');
  });
});
