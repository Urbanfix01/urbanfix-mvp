// Native host + sandboxed editor; no requests reach a live business record.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true, args: ['--enable-unsafe-swiftshader'] });
const owner = '11111111-1111-4111-8111-111111111111', host = 'jfqutuptbrgtwbofpawp.supabase.co';
const user = { id: owner, email: 'design@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { app_audience: 'tecnico' } };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', exp })).toString('base64url'), 'fixture'].join('.');
const artifacts = new URL('../dist/mobile-smoke/', import.meta.url); await mkdir(artifacts, { recursive: true });
const sampleCanvas = (canvas, frames = 1) => canvas.evaluate((surface, count) => new Promise((resolve) => {
  const collect = () => {
    if (--count > 0) return requestAnimationFrame(collect);
    const gl = surface.getContext('webgl2'); if (!gl) return resolve({ colors: 0, hash: 0 });
    const pixels = new Uint8Array(surface.width * surface.height * 4); gl.readPixels(0, 0, surface.width, surface.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const colors = new Set(); let hash = 0;
    for (let i = 0; i < pixels.length; i += 128) { colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`); hash = (Math.imul(hash, 31) + pixels[i] * 65536 + pixels[i + 1] * 256 + pixels[i + 2]) | 0; }
    resolve({ colors: colors.size, hash });
  };
  requestAnimationFrame(collect);
}), frames);
try {
 for (const width of [390, 320, 1024]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: true }), history = new Map(), errors = [], calls = [], quotes = [];
  let offline = false, signedImages = 0, publishedPrices = false;
  const laborId = '77777777-7777-4777-8777-777777777777';
  await context.addInitScript(({ host, token, exp, user }) => {
    if (window !== window.top) return;
    localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: exp, token_type: 'bearer', user }));
    window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; };
  }, { host, token, exp, user });
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (['127.0.0.1', 'localhost'].includes(url.hostname) && !url.pathname.startsWith('/api/functions/')) return route.continue();
    if (url.hostname === 'www.urbanfix.com.ar' || ['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.startsWith('/api/functions/')) {
      assert.ok(request.headers().authorization?.startsWith('Bearer '));
      const payload = request.postDataJSON(); calls.push({ path: url.pathname, payload });
      if (offline) return json({ ok: false, error: 'Sin conexión de prueba' }, 503);
      if (url.pathname.endsWith('/pricing-workflow-v2')) return json({ ok: true, items: !publishedPrices ? [] : payload.data.type === 'labor'
        ? [{ id: laborId, type: 'labor', name: 'MO publicada de prueba', unit: 'm²', suggested_price: 9400, country_code: 'AR', currency: 'ARS', active: true, source_ref: 'cifras-367-2026-10:labor:subfloor-10' }]
        : [{ id: '88888888-8888-4888-8888-888888888888', type: 'material', name: 'Cemento publicado de prueba', unit: 'bolsa', suggested_price: 12300, country_code: 'AR', currency: 'ARS', active: true, source_ref: 'cifras-367-2026-10:material:cement-holcim' }], pagination: { pages: 1 } });
      if (url.pathname.endsWith('/pricing-review')) return json({ ok: true, references: [] });
      if (url.pathname.endsWith('/quote-workflow')) { quotes.push(payload); return json({ ok: true, quote: { id: '55555555-5555-4555-8555-555555555555', quote_number: 'UF-PRUEBA' } }); }
      throw new Error(`Unexpected API: ${url.pathname}`);
    }
    if (url.hostname !== host) return route.abort();
    if (url.pathname.startsWith('/auth/')) return json(user);
    if (url.pathname.endsWith('/profiles')) return json({ id: owner, email: user.email, full_name: 'Prueba', phone: '00000000', city: 'Pilar', business_name: 'Prueba', access_granted: true, profile_published: true });
    if (url.pathname.endsWith('/technician_clients')) return json([]);
    if (url.pathname.endsWith('/design_project_history') && request.method() === 'POST') {
      if (offline) return json({ message: 'offline' }, 503);
      const row = request.postDataJSON(); assert.equal(row.owner_user_id, owner); history.set(row.id, row); return route.fulfill({ status: 201 });
    }
    if (url.pathname.endsWith('/design_project_latest') || url.pathname.endsWith('/design_project_history')) {
      const id = url.searchParams.get('id')?.slice(3), rows = [...history.values()].filter((r) => !id || r.id === id);
      return json(id ? rows[0] : rows);
    }
    if (url.pathname.endsWith('/render_library')) {
      assert.equal(url.searchParams.get('status'), 'eq.published');
      return json([{ id: '66666666-6666-4666-8666-666666666666', title: 'Render publicado de prueba', object_path: 'fixture/original.png', thumbnail_path: 'fixture/preview.png', is_primary: true }]);
    }
    if (url.pathname.includes('/storage/v1/object/sign/')) {
      if (request.method() === 'POST') { signedImages++; return json({ signedURL: '/object/sign/render-library/fixture/original.png?token=fixture' }); }
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
    }
    return json([]);
  });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  await page.routeWebSocket('**/realtime/**', (socket) => socket.close());
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => { if (message.type() === 'error' && /ReferenceError|TypeError|SecurityError|Content Security Policy/.test(message.text())) errors.push(message.text()); });
  try {
  await page.goto(process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8082', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del proyecto', { exact: true }).fill(`Diseño integrado ${width}`);
  await page.getByLabel('Cliente (opcional)', { exact: true }).fill('Cliente de prueba');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Frente del terreno (m)', { exact: true }).fill('12');
  await page.getByLabel('Fondo del terreno (m)', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await page.getByRole('button', { name: 'Diseñar y cotizar', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Editor integrado UrbanFix"]');
  await frame.getByRole('tab', { name: 'Plano', exact: true }).waitFor();
  if (width === 390) {
    await frame.getByRole('button', { name: 'Dibujar rectángulo', exact: true }).click();
    const board = await frame.getByRole('application', { name: 'Lienzo de dibujo de la casa' }).boundingBox();
    await page.touchscreen.tap(board.x + board.width * .25, board.y + board.height * .3);
    await page.touchscreen.tap(board.x + board.width * .7, board.y + board.height * .55);
    assert.equal(await frame.locator('[data-wall-id]').count(), 4);
    await frame.getByRole('button', { name: 'Colocar puerta', exact: true }).click();
    const wall = await frame.locator('[data-wall-id]').first().locator('line').first().boundingBox();
    await page.touchscreen.tap(wall.x + wall.width / 2, wall.y + wall.height / 2);
    await frame.locator('[data-opening-id]').waitFor();
    await frame.getByRole('tab', { name: 'Piezas', exact: true }).click();
    await frame.getByLabel('Tipo de abertura', { exact: true }).waitFor();
    await frame.getByRole('button', { name: 'Quitar pieza seleccionada', exact: true }).click();
    await frame.getByRole('tab', { name: 'Plano', exact: true }).click();
    assert.equal(await frame.locator('[data-wall-id]').count(), 4);
    assert.equal(await frame.locator('[data-opening-id]').count(), 0);
    await frame.getByRole('button', { name: 'Deshacer', exact: true }).click();
    assert.equal(await frame.locator('[data-opening-id]').count(), 1);
    await frame.getByRole('button', { name: 'Deshacer', exact: true }).click();
    await frame.getByRole('button', { name: 'Deshacer', exact: true }).click();
    assert.equal(await frame.locator('[data-wall-id]').count(), 0);
  }
  await frame.getByRole('tab', { name: 'Piezas', exact: true }).click();
  await frame.getByLabel('Elementos constructivos', { exact: true }).selectOption('contrapiso-cascote');
  await frame.getByRole('tab', { name: 'Piezas', exact: true }).click();
  await frame.getByRole('button', { name: 'Agregar elemento al centro del terreno' }).click();
  await frame.getByRole('button', { name: 'Contrapiso de cascote', exact: true }).waitFor();
  await frame.getByRole('tab', { name: '3D', exact: true }).click();
  const canvas = frame.locator('canvas'); await canvas.waitFor();
  await page.screenshot({ path: fileURLToPath(new URL(`design-3d-${width}.png`, artifacts)), fullPage: true });
  const pixels = await sampleCanvas(canvas);
  assert.ok(pixels.colors > 3, `3D should contain visible geometry, got ${pixels.colors} colors`);
  await frame.getByRole('button', { name: /^Girar / }).click();
  assert.notEqual((await sampleCanvas(canvas, 45)).hash, pixels.hash, 'The project camera should rotate');
  await frame.getByRole('button', { name: 'Pausar rotación', exact: true }).click();
  await frame.getByRole('tab', { name: 'Cotizar', exact: true }).click();
  await frame.getByRole('button', { name: 'Guardar borrador del presupuesto', exact: true }).click();
  await frame.getByText(/Completá los valores pendientes/).waitFor(); assert.equal(quotes.length, 0);
  publishedPrices = true;
  await frame.getByRole('button', { name: 'Actualizar valores', exact: true }).click();
  const tariff = frame.getByRole('combobox', { name: 'Origen de tarifa de Contrapiso de cascote', exact: true });
  await tariff.selectOption(`catalog:${laborId}`);
  const cement = frame.getByRole('combobox', { name: /^Precio de Cemento Portland/ });
  await cement.selectOption('cifras-367-2026-10:material:cement-holcim');
  if (width === 390) {
    await tariff.selectOption('manual');
    await frame.getByLabel('Tarifa por m²', { exact: true }).fill('10000'); await frame.getByLabel('Tarifa por m²', { exact: true }).press('Enter');
  }
  const materialPrices = frame.getByRole('spinbutton', { name: /^Precio por / });
  for (let i = 0; i < await materialPrices.count(); i++) { await materialPrices.nth(i).fill('1200'); await materialPrices.nth(i).press('Enter'); }
  await frame.getByRole('button', { name: 'Guardar borrador del presupuesto', exact: true }).click();
  await frame.getByText(/Borrador UF-PRUEBA guardado/).waitFor();
  assert.equal(quotes.length, 1); assert.equal(quotes[0].data.client_name, 'Cliente de prueba');
  assert.ok(quotes[0].data.items.every((r) => r.unit_price > 0));
  if (width !== 390) {
    const laborLine = quotes[0].data.items.find((r) => r.item_type === 'labor');
    assert.equal(laborLine.master_item_id, laborId); assert.equal(laborLine.unit_price, 9400);
  }
  assert.ok(history.size > 1); assert.ok([...history.values()].some((r) => r.document.draft.elements?.length === 1));
  if (width === 390) {
    offline = true;
    const count = history.size;
    await frame.getByLabel('Tarifa por m²', { exact: true }).fill('11000'); await frame.getByLabel('Tarifa por m²', { exact: true }).press('Enter');
    await page.getByText('Copia local guardada · respaldo pendiente', { exact: true }).waitFor();
    assert.equal(history.size, count);
    offline = false; await page.getByRole('button', { name: 'Sincronizar historial', exact: true }).click();
    await page.getByText('Historial respaldado en tu cuenta', { exact: true }).waitFor();
    assert.ok(history.size > count);
    assert.ok([...history.values()].some((row) => row.document.draft.elements?.[0]?.laborRate === 11000));
  }
  await frame.getByRole('tab', { name: 'Cómputo', exact: true }).click();
  await frame.getByRole('heading', { name: 'Total de materiales del proyecto' }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL(`design-compute-${width}.png`, artifacts)), fullPage: true });
  await frame.getByRole('tab', { name: 'Renders', exact: true }).click();
  await frame.getByLabel('Buscar material', { exact: true }).fill('Cemento Portland');
  await frame.getByRole('button', { name: /Cemento Portland/ }).first().click();
  const image = frame.getByRole('img', { name: 'Render publicado de prueba' });
  await image.waitFor(); assert.ok(await image.evaluate((node) => node.complete ? node.naturalWidth > 0 : new Promise((resolve) => { node.onload = () => resolve(node.naturalWidth > 0); node.onerror = () => resolve(false); })));
  await frame.getByRole('button', { name: 'Actualizar renders', exact: true }).click();
  await image.waitFor(); assert.ok(signedImages >= 2);
  const materialCanvas = frame.locator('canvas[data-material-3d]');
  await materialCanvas.scrollIntoViewIfNeeded();
  const materialPixels = await sampleCanvas(materialCanvas);
  assert.ok(materialPixels.colors > 3, 'The material model should not be blank');
  await frame.getByRole('button', { name: 'Girar pieza', exact: true }).click();
  assert.notEqual((await sampleCanvas(materialCanvas, 45)).hash, materialPixels.hash, 'The material model should rotate');
  await frame.getByRole('button', { name: 'Pausar rotación', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL(`design-material-${width}.png`, artifacts)), fullPage: true });
  assert.deepEqual(await page.evaluate(() => window.__opened), []);
  assert.deepEqual(errors, []);
  assert.equal(await frame.locator('html').evaluate((_, accessToken) => JSON.stringify({ ...localStorage }).includes(accessToken), token), false);
  assert.ok(calls.some((call) => call.path.endsWith('pricing-workflow-v2')));
  assert.equal(await frame.locator('html').evaluate((node) => node.scrollWidth > innerWidth + 1), false);
  console.log(JSON.stringify({ width, snapshots: history.size, quotes: quotes.length, colors: pixels.colors, materialColors: materialPixels.colors, passed: true }));
  } catch (error) {
    await page.screenshot({ path: fileURLToPath(new URL(`design-failure-${width}.png`, artifacts)), fullPage: true }).catch(() => {});
    console.error(JSON.stringify({ width, frame: await page.locator('iframe').boundingBox().catch(() => null), errors }));
    throw error;
  }
  await context.close();
 }
} finally { await browser.close(); }
