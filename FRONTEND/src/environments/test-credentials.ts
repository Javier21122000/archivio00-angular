/**
 * Account DEMO per il "login di prova" (AuthModal e AccessDrawer).
 * Sono credenziali solo dimostrative dei dati di seed del backend: non sono segreti
 * e non danno accesso a nulla di reale. Mai metterci password vere.
 */
export type TestProfile = 'admin' | 'user';

export const testCredentials: Record<TestProfile, { email: string; password: string }> = {
  admin: { email: 'javier@archivio00.it', password: 'admin123' },
  user: { email: 'utente@archivio00.it', password: 'password123' },
};
