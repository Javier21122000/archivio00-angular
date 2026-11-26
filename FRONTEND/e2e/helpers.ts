import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

/** Backend NestJS (le chiamate dirette dei test; il browser passa dal proxy di :4200). */
export const backend = 'http://localhost:3000/api';

/** Account DEMO dei dati di seed (non sono segreti). */
export const demo = {
  admin: { email: 'javier@archivio00.it', password: 'admin123' },
  user: { email: 'utente@archivio00.it', password: 'password123' },
} as const;

export interface ApiProduct {
  id: string;
  nome: string;
  prezzo: number;
  inEvidenza: boolean;
  immagineUrl: string;
  isSpecialEdition: boolean;
  rating: number;
  numeroRecensioni: number;
  categoria: string;
  variante: string;
  pubblicato?: boolean;
  prezzoAcquisto?: number;
  fornitore?: string;
}
export interface ApiPage {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  catalogCount: number;
}
export interface Session {
  token: string;
  user: { id: string; email: string; firstName: string; lastName: string; roles: string[] };
}

export async function login(request: APIRequestContext, role: 'admin' | 'user'): Promise<Session> {
  const response = await request.post(`${backend}/auth/login`, { data: demo[role] });
  expect(response.status()).toBe(200);
  return response.json();
}

export const bearer = (session: Session) => ({ Authorization: `Bearer ${session.token}` });

/** Catalogo completo (pubblico o admin) leggendo tutte le pagine dal server. */
export async function allProducts(request: APIRequestContext, session?: Session): Promise<ApiProduct[]> {
  const headers = session ? bearer(session) : undefined;
  const items: ApiProduct[] = [];
  for (let page = 1; ; page++) {
    const body: ApiPage = await (await request.get(`${backend}/oggetti`, { headers, params: { page, limit: 60 } })).json();
    items.push(...body.items);
    if (page >= body.totalPages) return items;
  }
}

export async function deleteByName(request: APIRequestContext, session: Session, name: string) {
  const found: ApiPage = await (await request.get(`${backend}/oggetti`, { headers: bearer(session), params: { q: name, limit: 60 } })).json();
  for (const product of found.items.filter((p) => p.nome === name)) {
    await request.delete(`${backend}/oggetti/${product.id}`, { headers: bearer(session) });
  }
}

/** Login rapido dal pannello "Accessi" (la sessione vive solo in memoria: niente page.goto dopo). */
export async function quickLogin(page: Page, role: 'admin' | 'user') {
  await page.getByRole('button', { name: 'Accessi', exact: true }).click();
  await page.getByRole('button', { name: role === 'admin' ? 'Accedi come Admin (Javier)' : 'Accedi come Utente Standard', exact: true }).click();
  await expect(page.getByText('Accesso effettuato:', { exact: false })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Accessi', exact: true }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Chiudi', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export const cards = (page: Page): Locator => page.locator('.product-card');

/** Preme "Mostra altri" finche' il server non ha piu' pagine. Ritorna il numero di clic. */
export async function loadAll(page: Page): Promise<number> {
  let clicks = 0;
  await expect(cards(page).first()).toBeVisible(); // la prima pagina deve essere arrivata
  const more = page.getByRole('button', { name: 'Mostra altri', exact: true });
  while (await more.isVisible()) {
    const before = await cards(page).count();
    await more.click();
    await expect.poll(() => cards(page).count()).toBeGreaterThan(before);
    clicks++;
  }
  return clicks;
}

/**
 * Dopo setViewportSize Chromium puo' lasciare scrollWidth non aggiornato di 1px (nessun elemento sborda davvero:
 * qualunque modifica di stile lo riallinea). Forziamo un relayout completo prima di misurare.
 */
export const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => {
    document.body.style.display = 'none';
    void document.body.offsetHeight;
    document.body.style.display = '';
    return document.documentElement.scrollWidth <= window.innerWidth;
  });
