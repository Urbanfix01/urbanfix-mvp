// Isolated React Native Web smoke test. Every remote request is mocked or blocked.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set PLAYWRIGHT_MODULE to an installed playwright-core entry point.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
const artifacts = new URL('../dist/mobile-smoke/', import.meta.url); await mkdir(artifacts, { recursive: true });
const owner = '11111111-1111-4111-8111-111111111111', host = 'jfqutuptbrgtwbofpawp.supabase.co';
const user = { id: owner, email: 'prueba@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { app_audience: 'tecnico' }, created_at: '2026-01-01T00:00:00.000Z' };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', role: 'authenticated', exp })).toString('base64url'), 'test-only-signature'].join('.');
try {
  for (const width of [390, 320, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, geolocation: { latitude: -34.6, longitude: -58.38 }, permissions: ['geolocation'], acceptDownloads: true });
    const history = new Map(), errors = [], blocked = []; let offline = false;
    await context.addInitScript(({ host, token, exp, user }) => {
      localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
      window.__openedProjectUrls = []; window.open = (url) => { window.__openedProjectUrls.push(String(url)); return null; };
    }, { host, token, exp, user });
    await context.route('**/*', async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
      if (url.hostname !== host) { blocked.push(url.hostname); return route.abort(); }
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.startsWith('/auth/')) return json(user);
      if (offline && url.pathname.includes('design_project')) return json({ message: 'fixture offline', code: 'NETWORK' }, 503);
      if (url.pathname.endsWith('/technician_clients')) return json([{ id: '33333333-3333-4333-8333-333333333333', name: 'Cliente de prueba', phone: '', email: '', address: 'Pilar' }]);
      if (url.pathname.endsWith('/design_project_history') && request.method() === 'POST') { const row = request.postDataJSON(); history.set(row.id, row); return route.fulfill({ status: 201, body: '' }); }
      if (url.pathname.endsWith('/design_project_latest') || url.pathname.endsWith('/design_project_history')) {
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        const rows = [...history.values()].filter((row) => !id || row.id === id);
        return json(id && request.headers().accept?.includes('object') ? rows[0] : rows);
      }
      if (url.pathname.endsWith('/profiles')) return json({ id: owner, access_granted: true, full_name: 'Profesional de prueba', phone: '00000000', city: 'Pilar', business_name: 'Prueba', company_address: 'Pilar', service_lat: -34.6, service_lng: -58.38 });
      return json([]);
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.routeWebSocket('**/realtime/**', (ws) => ws.close());
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8082', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByText('Mis proyectos', { exact: true }).waitFor({ timeout: 180000 });
    await page.screenshot({ path: fileURLToPath(new URL(`projects-${width}.png`, artifacts)), fullPage: true });
    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
    await page.getByLabel('Nombre del proyecto', { exact: true }).fill(`Casa móvil ${width}`);
    await page.getByRole('button', { name: 'Elegir de mis clientes' }).click();
    await page.getByText('Cliente de prueba', { exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Dirección de la obra (opcional)', { exact: true }).fill('Pilar, Buenos Aires');
    await page.getByRole('button', { name: 'Cargar coordenadas manuales' }).click();
    await page.getByLabel('Latitud', { exact: true }).fill('-34.6'); await page.getByLabel('Longitud', { exact: true }).fill('-58.38');
    await page.getByRole('button', { name: 'Aplicar coordenadas' }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Frente del terreno (m)', { exact: true }).fill('22'); await page.getByLabel('Fondo del terreno (m)', { exact: true }).fill('33');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`review-${width}.png`, artifacts)), fullPage: true });
    await page.getByRole('button', { name: 'Crear proyecto' }).click();
    await page.getByText('Respaldado en tu cuenta', { exact: true }).waitFor();
    assert.equal(history.size, 1);
    const saved = [...history.values()][0]; assert.equal(saved.owner_user_id, owner); assert.equal(saved.document.draft.settings.lotDepth, 33);
    assert.equal(saved.document.draft.projectInfo.siteLocation.lat, -34.6); assert.equal(saved.document.draft.projectInfo.clientReference.owner, owner);
    assert.equal(await page.locator('svg rect').count() > 0, true);
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar copia editable' }).click(); const download = await downloadPromise; assert.ok(download.suggestedFilename().endsWith('.json'));
    await page.getByRole('button', { name: 'Ver versiones' }).click(); await page.getByText('Versiones del proyecto', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar versiones' }).click();
    await page.getByRole('button', { name: 'Continuar en web' }).click();
    const links = await page.evaluate(() => window.__openedProjectUrls); assert.equal(new URL(links[0]).searchParams.get('proyecto'), saved.project_key);
    await page.screenshot({ path: fileURLToPath(new URL(`detail-${width}.png`, artifacts)), fullPage: true });
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: `Abrir proyecto Casa móvil ${width}` }).waitFor();
    // The same user can recover a local project after reload even while cloud reads fail.
    offline = true; await page.reload(); await page.getByRole('button', { name: `Abrir proyecto Casa móvil ${width}` }).waitFor();
    await page.getByRole('button', { name: `Abrir proyecto Casa móvil ${width}` }).click(); await page.getByText('Respaldado en tu cuenta', { exact: true }).waitFor();
    assert.deepEqual(errors, [], 'No uncaught runtime errors');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false);
    console.log(JSON.stringify({ width, passed: true, snapshots: history.size, externalRequestsBlocked: [...new Set(blocked)], errors }));
    await context.close();
  }
} finally { await browser.close(); }
