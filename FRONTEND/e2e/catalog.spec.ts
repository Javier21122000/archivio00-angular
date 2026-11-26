import { expect, test } from '@playwright/test';
import { allProducts, backend, bearer, cards, loadAll, login, noHorizontalOverflow, quickLogin, type ApiProduct } from './helpers';

const label = (p: ApiProduct) => (p.variante ? `${p.nome} · ${p.variante}` : p.nome);

test('catalogo: filtri, varianti, immagini isolate, recensioni e accessibilità tastiera', async ({ page, request }) => {
  const products = await allProducts(request);
  expect(products.length).toBeGreaterThanOrEqual(28);
  expect(products.filter((p) => p.isSpecialEdition)).toHaveLength(6);
  for (const name of ['Vintage 00s Striped Shirt', 'Oldculture Graphic Sweatshirt']) {
    const variants = products.filter((p) => p.nome === name);
    expect(variants).toHaveLength(2);
    expect(new Set(variants.map((p) => p.immagineUrl)).size).toBe(2);
  }
  await page.goto('/catalogo');
  await loadAll(page);
  await expect(cards(page)).toHaveCount(products.length);
  await expect(page.locator('.quick-edit-button')).toHaveCount(0);
  for (const category of ['Top & Camicie', 'Scarpe', 'Pantaloni', 'SPECIAL EDITIONS']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    const expected = products.filter((p) => (category === 'SPECIAL EDITIONS' ? p.isSpecialEdition : p.categoria === category));
    await expect(cards(page)).toHaveCount(expected.length);
    for (const card of await cards(page).all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator('app-product-reviews')).toBeVisible();
      const img = card.locator('.product-image img');
      await expect(img).toHaveJSProperty('complete', true);
      expect(await img.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
      await expect(img).toHaveCSS('object-fit', 'contain');
      const box = await card.locator('.product-image').boundingBox();
      expect(box!.width / box!.height).toBeCloseTo(0.8, 2);
    }
  }
  const card = cards(page).first();
  await card.locator('img').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.getByRole('button', { name: /Aggiungi ai preferiti/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Bentornato.' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('');
});

test('login test admin, modifica PUT, metadati conservati, sessione ospite al reload', async ({ page, request }) => {
  const admin = await login(request, 'admin');
  const original = (await allProducts(request, admin)).find((p) => p.nome === 'Artistic Renaissance Denim (Spezzettata)')!;
  expect(original).toBeTruthy();
  const changedName = `${original.nome} QA`;
  // Corpo di ripristino: solo i campi dell'OggettoRequest (il backend rifiuta id/createdAt).
  const restore = {
    nome: original.nome, prezzo: original.prezzo, prezzoAcquisto: original.prezzoAcquisto, fornitore: original.fornitore,
    pubblicato: original.pubblicato, inEvidenza: original.inEvidenza, immagineUrl: original.immagineUrl,
    isSpecialEdition: original.isSpecialEdition, rating: original.rating, numeroRecensioni: original.numeroRecensioni,
    categoria: original.categoria, variante: original.variante,
  };
  try {
    await page.goto('/catalogo');
    await page.locator('.heart-button').first().click();
    await page.getByRole('button', { name: 'LOGIN TEST ADMIN', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Denim', exact: true }).click();
    const card = cards(page).filter({ hasText: original.nome });
    await card.hover();
    await card.getByRole('button', { name: `Modifica: ${original.nome}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Nome del capo' }).fill(changedName);
    await page.getByRole('spinbutton', { name: 'Prezzo di vendita' }).fill('399');
    await page.getByRole('switch', { name: 'In evidenza', exact: true }).click();
    await page.getByRole('switch', { name: 'Special Edition', exact: true }).click();
    await page.getByRole('button', { name: 'Salva modifiche', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'SPECIAL EDITIONS', exact: true }).click();
    const edited = cards(page).filter({ hasText: changedName });
    await expect(edited).toBeVisible();
    await expect(edited.locator('.product-special')).toBeVisible();
    await expect(edited.locator('.feature-badge')).toHaveCount(original.inEvidenza ? 0 : 1);
    const updated = await (await request.get(`${backend}/oggetti/${original.id}`)).json();
    expect(updated).toMatchObject({
      prezzo: 399, isSpecialEdition: true, rating: original.rating, numeroRecensioni: original.numeroRecensioni,
      categoria: original.categoria, immagineUrl: original.immagineUrl,
    });
    await page.reload();
    await expect(page.locator('.quick-edit-button')).toHaveCount(0);
    await expect(page.getByText('DATI RISERVATI', { exact: true })).toHaveCount(0);
    await page.locator('.heart-button').first().click();
    await page.getByRole('button', { name: 'LOGIN TEST UTENTE', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.quick-edit-button')).toHaveCount(0);
    const user = await login(request, 'user');
    expect((await request.put(`${backend}/oggetti/${original.id}`, { headers: bearer(user), data: restore })).status()).toBe(403);
    expect((await request.put(`${backend}/oggetti/${original.id}`, { data: restore })).status()).toBe(401);
    expect((await request.put(`${backend}/oggetti/${original.id}`, { headers: bearer(admin), data: { ...restore, rating: 6 } })).status()).toBe(400);
  } finally {
    expect((await request.put(`${backend}/oggetti/${original.id}`, { headers: bearer(admin), data: restore })).status()).toBe(200);
  }
});

test('catalogo desktop e mobile: tutte le immagini caricate, filtri e nessun overflow', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const published = await allProducts(request);
  await page.goto('/catalogo');
  await loadAll(page);
  await expect(cards(page)).toHaveCount(published.length);
  for (const img of await page.locator('.product-card img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty('complete', true);
    expect(await img.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  }
  for (const card of await cards(page).all()) await expect(card).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'artifacts/catalog-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Top & Camicie', exact: true }).click();
  await expect(cards(page)).toHaveCount(published.filter((p) => p.categoria === 'Top & Camicie').length);
  expect(await noHorizontalOverflow(page)).toBe(true);
  await expect(page.getByRole('button', { name: 'Top & Camicie', exact: true })).toHaveCSS('background-color', 'rgb(23, 23, 23)');
  for (const card of await cards(page).all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveCSS('opacity', '1');
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'artifacts/catalog-mobile.png', fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('i capi del dettaglio mostrano la scheda e il cuore funziona anche dal dettaglio', async ({ page, request }) => {
  const user = await login(request, 'user');
  const target = (await allProducts(request))[0];
  try {
    await page.goto('/catalogo');
    await quickLogin(page, 'user');
    await page.getByRole('button', { name: `Apri dettaglio: ${label(target)}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Salva nei preferiti|Rimuovi dai preferiti/ }).click();
    await expect(dialog.getByRole('button', { name: 'Rimuovi dai preferiti' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: `Rimuovi dai preferiti: ${label(target)}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  } finally {
    await request.delete(`${backend}/preferiti/${target.id}`, { headers: bearer(user) });
  }
});
