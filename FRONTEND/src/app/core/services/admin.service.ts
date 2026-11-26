import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  /** grant = true assegna il ruolo ADMIN, false lo revoca (POST/DELETE come da contratto). */
  changeRole(userId: string, grant: boolean): Observable<User> {
    const url = `/api/admin/utenti/${encodeURIComponent(userId)}/ruolo-admin`;
    return grant ? this.http.post<User>(url, null) : this.http.delete<User>(url);
  }
}
