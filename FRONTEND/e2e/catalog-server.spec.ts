import { expect, test } from '@playwright/test';
import { allProducts, backend, bearer, cards, login, noHorizontalOverflow, quickLogin, loadAll, logout, type ApiPage } from './helpers';

const isList = (url: string) => new URL(url).pathname === '/api/oggetti';

test('paginazione: 12 per volta con "Mostra altri" fino al totale, senza doppioni', async ({ page, request }) => {
  const total = (await allProducts(request)).length;
  expect(total).toBeGreaterThan(12);
  await page.goto('/catalogo');
  await expect(cards(page)).toHaveCount(12);
  await expect(page.locator('.heading-count')).toHaveText(`(${String(total).padStart(2, '0')})`);
  const more = page.getByRole('button', { name: 'Mostra altri', exact: true });
  await expect(more).toBeVisible();
  const pages: number[] = [];
  page.on('request', (r) => { if (isList(r.url())) pages.push(Number(new URL(r.url()).searchParams.get('page'))); });
  await more.click();
  await expect(cards(page)).toHaveCount(Math.min(24, total));
  await expect(page.getByRole('status')).toContainText('Caricati altri capi');
  if (total > 24) {
    await more.click();
    await expect(cards(page)).toHaveCount(total);
  }
  await expect(more).toHaveCount(0);
  expect(pages).toEqual(total > 24 ? [2, 3] : [2]);
  const names = await cards(page).locator('strong').allTextContents();
  const labels = await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(new Set(labels).size).toBe(labels.length);
  expect(names).toHaveLength(total);
});

test('ricerca server-side con debounce: una sola richiesta con q, risultati dal server', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(cards(page)).toHaveCount(12);
  const queries: string[] = [];
  page.on('request', (r) => { if (isList(r.url())) queries.push(new URL(r.url()).searchParams.get('q') ?? ''); });
  await page.getByRole('button', { name: /Filtra/ }).click();
  const input = page.getByRole('textbox', { name: 'Cerca un capo' });
  await input.pressSequentially('striped', { delay: 40 });
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).first()).toContainText('Striped');
  expect(queries).toEqual(['striped']); // niente richieste intermedie: il debounce assesta i tasti
  await expect(page.getByText('2 CAPI NELLA SELEZIONE')).toBeVisible();
  await page.getByRole('button', { name: 'Cancella ricerca' }).click();
  await expect(cards(page)).toHaveCount(12);
  await input.fill('zzzzqqq');
  await expect(page.getByText('Nessun capo con questi filtri.')).toBeVisible();
  await page.getByRole('button', { name: 'Azzera filtri' }).click();
  await expect(cards(page)).toHaveCount(12);
});

test('ordinamento per prezzo lato server', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(cards(page)).toHaveCount(12);
  await page.getByRole('button', { name: /Filtra/ }).click();
  await page.getByLabel('Ordina per').selectOption('prezzo-asc');
  await expect.poll(async () => {
    const prices = await cards(page).locator('.product-caption > span > span').allTextContents();
    const nums = prices.map((t) => Number(t.replace(/[^\d,]/g, '').replace(',', '.')));
    return nums.length === 12 && nums.every((n, i) => i === 0 || n >= nums[i - 1]);
  }).toBe(true);
});

test('annullamento richieste: cambiando categoria la risposta lenta obsoleta non viene applicata', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(cards(page)).toHaveCount(12);
  const failed: string[] = [];
  page.on('requestfailed', (r) => { if (isList(r.url())) failed.push(new URL(r.url()).searchParams.get('categoria') ?? ''); });
  // Le richieste per "Scarpe" restano appese 2 s: se la UI le applicasse, sovrascriverebbero "Pantaloni".
  await page.route((url) => isList(url.href) && url.searchParams.get('categoria') === 'Scarpe', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue().catch(() => undefined);
  });
  await page.getByRole('button', { name: 'Scarpe', exact: true }).click();
  await page.getByRole('button', { name: 'Pantaloni', exact: true }).click();
  await expect(cards(page)).toHaveCount(1);
  await page.waitForTimeout(2600);
  await expect(cards(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Pantaloni', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(failed).toContain('Scarpe'); // la richiesta HTTP e' stata davvero abortita dal browser
});

test('redirect: /admin da ospite e da utente standard torna alla home', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await quickLogin(page, 'user');
  await expect(page.getByRole('link', { name: 'Studio admin' })).toHaveCount(0);
  await page.goto('/admin'); // ricarica completa: sessione persa, quindi ospite
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'L’archivio', exact: true }).first().click();
  await quickLogin(page, 'user');
  // Navigazione interna (senza reload) da USER loggato: la guardia lo rimanda comunque a casa.
  await page.evaluate(() => { history.pushState({}, '', '/admin'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'DIETRO LE QUINTE.' })).toHaveCount(0);
});

test('API: USER riceve 403 su POST /oggetti e nessun capo viene creato', async ({ request }) => {
  const user = await login(request, 'user');
  const name = `Non autorizzato ${Date.now()}`;
  const response = await request.post(`${backend}/oggetti`, {
    headers: bearer(user),
    data: { nome: name, prezzo: 10, prezzoAcquisto: 1, fornitore: 'qa', pubblicato: true, inEvidenza: false },
  });
  expect(response.status()).toBe(403);
  const found: ApiPage = await (await request.get(`${backend}/oggetti`, { params: { q: name } })).json();
  expect(found.items).toHaveLength(0);
});

test('preferiti isolati tra utenti nell\'interfaccia', async ({ page, request }) => {
  const admin = await login(request, 'admin');
  const user = await login(request, 'user');
  const products = await allProducts(request);
  const used: { oggetto: { id: string } }[] = [
    ...(await (await request.get(`${backend}/preferiti`, { headers: bearer(admin) })).json()),
    ...(await (await request.get(`${backend}/preferiti`, { headers: bearer(user) })).json()),
  ];
  const free = products.filter((p) => !used.some((f) => f.oggetto.id === p.id));
  const [forAdmin, forUser] = [free[0], free[1]];
  expect(forUser).toBeTruthy();
  try {
    await request.post(`${backend}/preferiti/${forAdmin.id}`, { headers: bearer(admin) });
    await request.post(`${backend}/preferiti/${forUser.id}`, { headers: bearer(user) });
    await page.goto('/');
    await quickLogin(page, 'user');
    await page.getByRole('link', { name: /preferiti/i }).first().click();
    await expect(cards(page).filter({ hasText: forUser.nome }).first()).toBeVisible();
    await expect(cards(page).filter({ hasText: forAdmin.nome })).toHaveCount(forAdmin.nome === forUser.nome ? 1 : 0);
    // Cambio utente senza ricaricare: la lista deve cambiare, senza residui dell'altro.
    await logout(page);
    await expect(page.getByText('La tua selezione inizia qui.')).toBeVisible();
    await quickLogin(page, 'admin');
    await expect(cards(page).filter({ hasText: forAdmin.nome }).first()).toBeVisible();
    await expect(cards(page).filter({ hasText: forUser.nome })).toHaveCount(forAdmin.nome === forUser.nome ? 1 : 0);
  } finally {
    await request.delete(`${backend}/preferiti/${forAdmin.id}`, { headers: bearer(admin) });
    await request.delete(`${backend}/preferiti/${forUser.id}`, { headers: bearer(user) });
  }
});

test.describe('mobile 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ['/', '/catalogo', '/preferiti', '/editoriale', '/leggenda/ronaldinho']) {
    test(`nessun overflow orizzontale su ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.locator('main, app-root').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await noHorizontalOverflow(page)).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('catalogo mobile dopo "Mostra altri" resta senza overflow', async ({ page }) => {
    await page.goto('/catalogo');
    await loadAll(page);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});
