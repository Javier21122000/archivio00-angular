import { expect, test } from '@playwright/test';
import { allProducts, backend, bearer, cards, deleteByName, loadAll, login, logout, quickLogin, noHorizontalOverflow, type ApiPage } from './helpers';

test('pubblico: solo DTO pubblici, cuore richiede login, admin protetto', async ({ page, request }) => {
  const body: ApiPage = await (await request.get(`${backend}/oggetti`, { params: { limit: 60 } })).json();
  expect(body.items.length).toBeGreaterThan(0);
  for (const product of body.items) {
    expect(Object.keys(product).sort()).toEqual(['categoria', 'id', 'immagineUrl', 'inEvidenza', 'isSpecialEdition', 'nome', 'numeroRecensioni', 'prezzo', 'rating', 'variante']);
  }
  await page.goto('/catalogo');
  await loadAll(page);
  await expect(cards(page)).toHaveCount(body.total);
  await expect(page.getByText('BOZZA', { exact: true })).toHaveCount(0);
  await expect(page.getByText('DATI RISERVATI', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Aggiungi ai preferiti:/ }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bentornato.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
});

test('utente: salva e rimuove un preferito senza dati admin', async ({ page, request }) => {
  const user = await login(request, 'user');
  const products = await allProducts(request);
  const favorites: { oggetto: { id: string } }[] = await (await request.get(`${backend}/preferiti`, { headers: bearer(user) })).json();
  const product = products.find((p) => !favorites.some((f) => f.oggetto.id === p.id))!;
  expect(product).toBeTruthy();
  const label = product.variante ? `${product.nome} · ${product.variante}` : product.nome;
  try {
    await page.goto(`/catalogo?categoria=${encodeURIComponent(product.categoria)}`);
    await quickLogin(page, 'user');
    await loadAll(page);
    await page.getByRole('button', { name: `Aggiungi ai preferiti: ${label}`, exact: true }).click();
    await expect(page.getByRole('button', { name: `Rimuovi dai preferiti: ${label}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('link', { name: /preferiti/i }).first().click();
    await expect(page).toHaveURL(/\/preferiti$/);
    await expect(cards(page).filter({ hasText: product.nome })).toBeVisible();
    await expect(page.getByText('DATI RISERVATI', { exact: true })).toHaveCount(0);
    // Dopo il reload la sessione in memoria e' sparita: si torna ospiti e si rientra.
    await page.reload();
    await expect(page.getByText('La tua selezione inizia qui.')).toBeVisible();
    await quickLogin(page, 'user');
    await expect(cards(page).filter({ hasText: product.nome })).toBeVisible();
    await page.getByRole('button', { name: `Rimuovi dai preferiti: ${label}`, exact: true }).click();
    await expect(cards(page).filter({ hasText: product.nome })).toHaveCount(0);
  } finally {
    await request.delete(`${backend}/preferiti/${product.id}`, { headers: bearer(user) });
  }
});

test('admin: bozze, margini, creazione ed eliminazione reali; logout ripulisce lo stato', async ({ page, request }) => {
  const admin = await login(request, 'admin');
  const name = `QA Vintage ${Date.now()}`;
  try {
    await page.goto('/');
    await quickLogin(page, 'admin');
    await expect(page.getByText('ADMIN MODE - JAVIER')).toBeVisible();
    await page.getByRole('link', { name: 'Studio admin' }).click();
    await page.getByRole('button', { name: 'Nuovo Capo Vintage' }).click();
    await page.getByRole('textbox', { name: 'Nome del capo' }).fill(name);
    await page.getByRole('spinbutton', { name: 'Prezzo di vendita' }).fill('100');
    await page.getByRole('spinbutton', { name: 'Prezzo d’acquisto' }).fill('30');
    await page.getByRole('textbox', { name: 'Fornitore', exact: true }).fill('QA locale');
    await page.getByRole('button', { name: 'Salva bozza', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('link', { name: 'L’archivio', exact: true }).first().click();
    // Solo bozze: il capo creato e' l'unico, quindi sta nella prima pagina.
    await page.getByRole('button', { name: /Filtra/ }).click();
    await page.getByRole('checkbox', { name: 'Solo bozze' }).check();
    const card = cards(page).filter({ hasText: name });
    await expect(card.getByText('BOZZA', { exact: true })).toBeVisible();
    await expect(card.getByText('DATI RISERVATI', { exact: true })).toBeVisible();
    await expect(card.locator('.private-data')).toContainText('70'); // margine lordo 100 - 30
    // Un visitatore non lo vede (ne' dall'elenco ne' dal dettaglio).
    const created = (await allProducts(request, admin)).find((p) => p.nome === name)!;
    expect((await allProducts(request)).some((p) => p.nome === name)).toBe(false);
    expect((await request.get(`${backend}/oggetti/${created.id}`)).status()).toBe(404);
    await card.getByRole('button', { name: 'Elimina Capo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Elimina Capo', exact: true }).click();
    await expect(card).toHaveCount(0);
    expect((await allProducts(request, admin)).some((p) => p.nome === name)).toBe(false);
    await logout(page);
    await expect(page.getByText('BOZZA', { exact: true })).toHaveCount(0);
    await expect(page.getByText('DATI RISERVATI', { exact: true })).toHaveCount(0);
    await expect(page.getByText('ADMIN MODE - JAVIER')).toHaveCount(0);
  } finally {
    await deleteByName(request, admin, name);
  }
});

test('sicurezza reale: preferiti isolati e mutazioni vietate allo standard', async ({ request }) => {
  const admin = await login(request, 'admin');
  const user = await login(request, 'user');
  const products = await allProducts(request);
  const taken: { oggetto: { id: string } }[] = [
    ...(await (await request.get(`${backend}/preferiti`, { headers: bearer(admin) })).json()),
    ...(await (await request.get(`${backend}/preferiti`, { headers: bearer(user) })).json()),
  ];
  const product = products.find((p) => !taken.some((f) => f.oggetto.id === p.id))!;
  expect(product).toBeTruthy();
  const draft = { nome: `Unauthorized ${Date.now()}`, prezzo: 1, prezzoAcquisto: 0, fornitore: 'test', pubblicato: false };
  try {
    expect((await request.post(`${backend}/preferiti/${product.id}`, { headers: bearer(admin) })).status()).toBe(201);
    const adminFavs: { oggetto: { id: string } }[] = await (await request.get(`${backend}/preferiti`, { headers: bearer(admin) })).json();
    const userFavs: { oggetto: { id: string } }[] = await (await request.get(`${backend}/preferiti`, { headers: bearer(user) })).json();
    expect(adminFavs.some((f) => f.oggetto.id === product.id)).toBe(true);
    expect(userFavs.some((f) => f.oggetto.id === product.id)).toBe(false);
    expect((await request.get(`${backend}/preferiti`)).status()).toBe(401);
    // USER: 403 su create / update / delete. Senza token: 401.
    expect((await request.post(`${backend}/oggetti`, { headers: bearer(user), data: draft })).status()).toBe(403);
    expect((await request.put(`${backend}/oggetti/${product.id}`, { headers: bearer(user), data: draft })).status()).toBe(403);
    expect((await request.delete(`${backend}/oggetti/${product.id}`, { headers: bearer(user) })).status()).toBe(403);
    expect((await request.post(`${backend}/oggetti`, { data: draft })).status()).toBe(401);
    expect((await request.get(`${backend}/oggetti/statistiche`, { headers: bearer(user) })).status()).toBe(403);
    // Le bozze non sono raggiungibili da fuori (richiede di crearne una: nessuna e' in seed).
    const created = await request.post(`${backend}/oggetti`, { headers: bearer(admin), data: draft });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id as string;
    try {
      expect((await request.get(`${backend}/oggetti/${id}`)).status()).toBe(404);
      expect((await request.get(`${backend}/oggetti/${id}`, { headers: bearer(user) })).status()).toBe(404);
      const userSees: ApiPage = await (await request.get(`${backend}/oggetti`, { headers: bearer(user), params: { limit: 60, soloBozze: true } })).json();
      expect(userSees.items.some((p) => p.id === id)).toBe(false);
    } finally {
      await request.delete(`${backend}/oggetti/${id}`, { headers: bearer(admin) });
    }
  } finally {
    await request.delete(`${backend}/preferiti/${product.id}`, { headers: bearer(admin) });
  }
});

test('admin: promozione e revoca ruoli con conferma e verifica server', async ({ page, request }) => {
  const admin = await login(request, 'admin');
  const user = await login(request, 'user');
  const endpoint = `${backend}/admin/utenti/${user.user.id}/ruolo-admin`;
  try {
    await page.goto('/');
    await quickLogin(page, 'admin');
    await page.getByRole('link', { name: 'Studio admin' }).click();
    await page.getByRole('textbox', { name: 'ID utente (UUID)' }).fill(user.user.id);
    await page.getByRole('button', { name: 'Promuovi ADMIN' }).click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(page.locator('.role-result')).toContainText('ADMIN');
    expect((await login(request, 'user')).user.roles).toContain('ADMIN');
    await page.getByRole('button', { name: 'Revoca ADMIN', exact: true }).click();
    await page.getByRole('button', { name: 'Conferma', exact: true }).click();
    await expect(page.locator('.role-result')).not.toContainText('ADMIN');
    expect((await login(request, 'user')).user.roles).not.toContain('ADMIN');
  } finally {
    await request.delete(endpoint, { headers: bearer(admin) });
  }
});

test('layout desktop e mobile, ritratti caricati e nessun overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();
  const ritratti = page.locator('.carta-leggenda img');
  await expect(ritratti).toHaveCount(3);
  for (const ritratto of await ritratti.all()) {
    await expect(ritratto).toHaveJSProperty('complete', true);
    expect(await ritratto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: /Y2K ATHLETIC/i })).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
