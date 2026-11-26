import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const run = () =>
    TestBed.runInInjectionContext(() => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] }));

  it('reindirizza a / se non admin', () => {
    const result = run();
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('lascia passare un admin', () => {
    TestBed.inject(AuthService).setSession({
      token: 't',
      user: { id: '1', email: 'e', firstName: 'f', lastName: 'l', roles: ['ADMIN'] },
    });
    expect(run()).toBe(true);
  });
});
