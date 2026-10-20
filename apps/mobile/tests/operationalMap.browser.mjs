import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
const artifacts = new URL('../dist/operational-map/', import.meta.url); await mkdir(artifacts, { recursive: true });
const owner = '11111111-1111-4111-8111-111111111111', host = 'jfqutuptbrgtwbofpawp.supabase.co';
const live = process.env.MAP_LIVE_TILES === '1';
const user = { id: owner, email: 'map@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { app_audience: 'tecnico' } };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', exp })).toString('base64url'), 'fixture'].join('.');
const row = (id, title, extra = {}) => ({ id, title, status: 'published', mode: 'marketplace', city: 'Buenos Aires', category: 'Electricidad', public_lat: -34.6, public_lng: -58.38, ...extra });
const payload = { ok: true, supabase_user_id: owner, matches: [], requests: [
  row('public', 'Reparacion de agua'),
  row('assigned', 'Instalacion electrica', { mode: 'direct', status: 'scheduled', assigned_technician_id: owner, location_lat: -34.7, location_lng: -58.5 }),
  row('missing', 'Sin coordenadas', { public_lat: null, public_lng: '' }),
  row('zero', 'Coordenadas antiguas', { public_lat: 0, public_lng: 0 }),
  row('completed', 'Trabajo terminado', { status: 'completed' }),
] };
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64');
try {
 for (const width of (process.env.MAP_TEST_WIDTHS || '320,390,1440').split(',').map(Number)) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const errors = [], urls = []; let badHtml = false, badTiles = !live, calls = 0;
  await context.addInitScript(({ host, user, token, exp }) => localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: exp, token_type: 'bearer', user })), { host, user, token, exp });
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (value) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/api/functions/supabase-technician-data') {
      assert.equal(request.method(), 'POST'); assert.deepEqual(request.postDataJSON(), { op: 'dashboard' }); calls++;
      if (badHtml) return route.fulfill({ contentType: 'text/html', body: '<html>Old web route</html>' });
      return json(payload);
    }
    assert.ok(!url.pathname.includes('/api/tecnico/requests/nearby'), 'No obsolete API request');
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    if (url.hostname === host) {
      if (url.pathname.startsWith('/auth/')) return json(user);
      if (url.pathname.endsWith('/profiles')) return json({ id: owner, full_name: 'Prueba', email: user.email, phone: '00000000', city: 'Pilar', business_name: 'Prueba', access_granted: true, profile_published: true, service_lat: -34.45, service_lng: -58.9, service_radius_km: 20 });
      return json([]);
    }
    if (url.hostname === 'tile.openstreetmap.org') {
      urls.push(request.url());
      if (live) return route.continue();
      return badTiles ? route.fulfill({ status: 503, body: '' }) : route.fulfill({ contentType: 'image/png', body: tile });
    }
    return route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  await page.routeWebSocket('**/realtime/**', (socket) => socket.close());
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8082/', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByText('Mis proyectos', { exact: true }).waitFor({ timeout: 180000 });
    await page.getByRole('tab', { name: /Mapa operativo/ }).click();
    await page.getByText('4 solicitudes · 2 en mapa', { exact: true }).waitFor();
    const map = page.getByRole('region', { name: 'Mapa geografico de solicitudes', exact: true });
    await map.locator('.leaflet-marker-icon').first().waitFor();
    assert.equal(await map.locator('.leaflet-marker-icon').count(), 2);
    assert.equal(await page.getByTestId('operational-request-completed').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Ver en mapa Sin coordenadas', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Ver en mapa Coordenadas antiguas', exact: true }).isDisabled(), true);
    await map.getByRole('link', { name: 'OpenStreetMap', exact: true }).waitFor();
    if (live) {
      await map.locator('img.leaflet-tile-loaded').first().waitFor();
      assert.ok(await map.locator('img.leaflet-tile-loaded').first().evaluate((img) => img.complete && img.naturalWidth >= 256));
      await page.screenshot({ path: fileURLToPath(new URL(`live-map-${width}.png`, artifacts)) });
      console.log(JSON.stringify({ width, liveCartography: true, tileRequests: urls.length, passed: true }));
      continue;
    }
    await page.getByText('No se pudo cargar la cartografia.', { exact: true }).waitFor();
    badTiles = false; await page.getByRole('button', { name: 'Reintentar cartografia' }).click();
    await page.getByText('No se pudo cargar la cartografia.', { exact: true }).waitFor({ state: 'hidden' });
    await map.getByRole('button', { name: 'Ver en mapa: Reparacion de agua', exact: true }).click();
    await page.getByTestId('selected-operational-request').getByText('Ubicacion aproximada por privacidad').waitFor();
    await map.getByText(/Sin cotizacion/).waitFor();
    const mapElement = await map.elementHandle();
    await page.getByRole('button', { name: 'Ver en mapa Instalacion electrica', exact: true }).click();
    await page.getByTestId('selected-operational-request').getByText('Instalacion electrica', { exact: true }).waitFor();
    await map.locator('.leaflet-popup-content strong').filter({ hasText: 'Instalacion electrica' }).waitFor();
    const header = await page.getByTestId('screen-header').filter({ has: page.getByRole('heading', { name: 'OPERATIVO', exact: true }) }).boundingBox();
    let panelVisible = false;
    for (let attempt = 0; attempt < 25 && !panelVisible; attempt++) {
      panelVisible = await page.getByTestId('operational-map-panel').evaluate((element, bottom) => element.getBoundingClientRect().top >= bottom, header.y + header.height);
      if (!panelVisible) await page.waitForTimeout(60);
    }
    const layout = await page.getByTestId('operational-map-panel').evaluate((element) => {
      const ancestors = []; let node = element;
      while (node && ancestors.length < 7) { const rect = node.getBoundingClientRect(); ancestors.push({ tag: node.tagName, y: rect.y, height: rect.height, scroll: node.scrollTop, overflow: getComputedStyle(node).overflowY }); node = node.parentElement; }
      return ancestors;
    });
    assert.ok(panelVisible, `The map heading is not hidden behind the fixed screen header: ${JSON.stringify({ header, layout })}`);
    assert.equal(await mapElement.evaluate((element) => element.isConnected), true, 'Selecting does not remount the map');
    const marker = map.getByRole('button', { name: 'Ver en mapa: Instalacion electrica', exact: true });
    // Measure both in the same frame while the native scroll animation finishes.
    assert.ok(await marker.evaluate((element) => {
      const m = element.getBoundingClientRect(), bounds = element.closest('.leaflet-container').getBoundingClientRect();
      return m.left >= bounds.left && m.right <= bounds.right && m.top >= bounds.top && m.bottom <= bounds.bottom;
    }), 'Selected marker is in view');
    await page.getByRole('button', { name: 'Directa (1)', exact: true }).click();
    assert.equal(await map.locator('.leaflet-marker-icon').count(), 1);
    await page.getByRole('button', { name: 'Todo (4)', exact: true }).click();
    await map.getByRole('button', { name: 'Ver en mapa: Reparacion de agua', exact: true }).waitFor();
    badHtml = true; await page.getByRole('button', { name: 'Actualizar solicitudes' }).click();
    await page.getByText(/No se pudo actualizar\. Se conserva/).waitFor();
    assert.equal(await map.locator('.leaflet-marker-icon').count(), 2);
    badHtml = false; await page.getByRole('button', { name: 'Actualizar solicitudes' }).click();
    await page.getByText(/No se pudo actualizar\. Se conserva/).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Encuadrar solicitudes' }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`operational-${width}.png`, artifacts)) });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    console.log(JSON.stringify({ width, requests: 4, markers: 2, tileRequests: urls.length, apiCalls: calls, passed: true }));
  } catch (error) {
    await page.screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, artifacts)), timeout: 10000 }).catch(() => {});
    console.error(errors); throw error;
  } finally { await context.close(); }
 }
} finally { await browser.close(); }
