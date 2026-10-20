// Isolated UI fixtures. Never requests or changes production business data.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
const artifacts = new URL('../dist/interface-check/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const host = 'jfqutuptbrgtwbofpawp.supabase.co', owner = '11111111-1111-4111-8111-111111111111';
const audience = process.env.UI_TEST_AUDIENCE || 'tecnico';
try {
  for (const width of (process.env.UI_TEST_WIDTHS || '320,390,1440').split(',').map(Number)) {
    const user = { id: owner, email: 'interface@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { app_audience: audience } };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', exp })).toString('base64url'), 'fixture'].join('.');
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const errors = [];
    await context.addInitScript(({ host, user, token, exp }) => {
      localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: exp, token_type: 'bearer', user }));
    }, { host, user, token, exp });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const json = (value) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
      if (url.hostname === host) {
        if (url.pathname.startsWith('/auth/')) return json(user);
        if (url.pathname.endsWith('/profiles')) return json({ id: owner, email: user.email, full_name: 'Profesional de prueba', phone: '00000000', city: 'Pilar', business_name: 'Prueba', access_granted: true, profile_published: true, company_logo_url: null, avatar_url: null });
        return json([]);
      }
      if (url.hostname === 'www.urbanfix.com.ar' && url.pathname.startsWith('/api/')) return json({ requests: [], items: [], technician: { radius_km: 10, within_working_hours: true, working_hours_label: 'Prueba' } });
      return route.abort();
    });
    const page = await context.newPage(); page.setDefaultTimeout(45000);
    await page.routeWebSocket('**/realtime/**', (socket) => socket.close());
    page.on('pageerror', (error) => errors.push(error.message));
    const check = async (name, slug) => {
      const header = page.getByTestId('screen-header').filter({ has: page.getByRole('heading', { name, exact: true }) });
      await header.getByRole('heading', { name, exact: true }).waitFor();
      assert.equal(await header.count(), 1, `${slug}: one header`);
      assert.deepEqual(await header.evaluate((node) => { const css = getComputedStyle(node); return [css.backgroundColor, css.borderBottomLeftRadius]; }), ['rgb(44, 62, 80)', '24px']);
      const heading = header.getByRole('heading', { name, exact: true });
      assert.equal(await heading.evaluate((node) => getComputedStyle(node).fontSize), '22px');
      assert.ok((await heading.evaluate((node) => getComputedStyle(node).fontFamily)).includes('Montserrat'));
      const bounds = await heading.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${slug}: heading fits`);
      for (const button of await header.getByRole('button').all()) {
        const box = await button.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44, `${slug}: touch target`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${slug}: no overflow`);
      await page.screenshot({ path: fileURLToPath(new URL(`${slug}-${width}.png`, artifacts)) });
    };
    try {
      await page.goto(process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8082/', { waitUntil: 'domcontentloaded', timeout: 180000 });
      if (audience === 'cliente') {
        await page.getByRole('heading', { name: 'Mi perfil', exact: true }).waitFor({ timeout: 180000 });
        await check('Mi perfil', 'client-profile');
        for (const [tab, title, slug] of [[/Solicitudes/, 'Solicitudes', 'client-requests'], [/Publicar/, 'Publicar solicitud', 'client-publish'], [/Mapa/, 'Mapa tecnico', 'client-map']]) {
          await page.getByRole('tab', { name: tab }).click(); await check(title, slug);
        }
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ width, audience, consistentScreens: 4, passed: true, errors }));
        continue;
      }
      await page.getByText('Mis proyectos', { exact: true }).waitFor({ timeout: 180000 });
      await check('Mis proyectos', 'projects');
      await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
      await check('Nuevo proyecto', 'new-project');
      const input = page.getByLabel('Nombre del proyecto', { exact: true });
      assert.deepEqual(await input.evaluate((node) => { const css = getComputedStyle(node); return [css.fontSize, css.borderRadius, css.backgroundColor]; }), ['16px', '12px', 'rgb(255, 255, 255)']);
      assert.ok((await input.boundingBox()).height >= 48);
      await page.getByRole('button', { name: 'Volver', exact: true }).click();
      for (const [tab, title, slug] of [[/Dashboard/, 'Dashboard', 'dashboard'], [/Orden del dia/, 'Agenda', 'agenda'], [/Mapa operativo/, 'OPERATIVO', 'operational'], [/Más/, 'Más', 'more']]) {
        await page.getByRole('tab', { name: tab }).click(); await check(title, slug);
      }
      for (const [button, title, slug] of [['Catálogo de precios', 'CATALOGO MAESTRO', 'catalog'], ['Notificaciones', 'Notificaciones', 'notifications'], ['Mi perfil', 'Mi Perfil', 'profile'], ['Mapa de trabajos', 'MAPA', 'map']]) {
        await page.getByRole('button', { name: button, exact: true }).click(); await check(title, slug);
        if (slug === 'profile') {
          for (const [label, title, name] of [['Soporte', 'Soporte', 'support'], ['Historial de trabajos', 'Historial', 'job-history']]) {
            await page.getByText(label, { exact: true }).click(); await check(title, name);
            await page.getByRole('button', { name: 'Volver', exact: true }).click();
          }
        }
        await page.getByRole('button', { name: 'Volver', exact: true }).click();
        await page.getByRole('heading', { name: 'Más', exact: true }).waitFor();
      }
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, audience, consistentScreens: 12, passed: true, errors }));
    } catch (error) {
      await page.screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, artifacts)), timeout: 10000 }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
