/** L'utente autenticato che i guard attaccano a `request.user`. */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}
