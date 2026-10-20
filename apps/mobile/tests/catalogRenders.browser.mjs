// Own isolated session; prices, renders and storage are fixtures, never live writes.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true, args: ['--enable-unsafe-swiftshader', '--disable-renderer-backgrounding'] });
const host = 'jfqutuptbrgtwbofpawp.supabase.co', owner = '11111111-1111-4111-8111-111111111111';
const user = { id: owner, email: 'catalog@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { app_audience: 'tecnico' } };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', exp })).toString('base64url'), 'fixture'].join('.');
const items = [
  { id: '11111111-2222-4333-8444-555555555555', name: 'Cemento Holcim - 25 kg', source_ref: 'cifras-367-2026-10:material:cement-holcim', type: 'material', suggested_price: 12300 },
  { id: '22222222-2222-4333-8444-555555555555', name: 'Ladrillo cerámico hueco 18 x 18 x 33 cm', source_ref: 'cifras-367-2026-10:material:hollow-brick-18-retail', type: 'material', suggested_price: 900 },
  { id: '33333333-2222-4333-8444-555555555555', name: 'Gastos varios sin imagen', source_ref: 'generales', type: 'consumable', suggested_price: null },
  { id: '44444444-2222-4333-8444-555555555555', name: 'Colocación de contrapiso', source_ref: 'albanileria', type: 'labor', suggested_price: 9400 },
  { id: '55555555-2222-4333-8444-555555555555', name: 'Acometida en pilar o muro - Gabinete para 1 medidor monofásico', source_ref: 'aaieric', type: 'labor', suggested_price: 235137 },
  { id: '77777777-2222-4333-8444-555555555555', name: 'Accesorios de baño loza blanca (9 pzas.)', source_ref: 'mo_rubro_sanitarios', type: 'labor', suggested_price: 61341 },
  { id: '88888888-2222-4333-8444-555555555555', name: 'Acrílica transparente para muros exteriores', source_ref: 'mo_rubro_pinturas', type: 'labor', suggested_price: 9458 },
];
const master = JSON.parse(await readFile(new URL('fixtures/master-materials-2026-10-20.json', import.meta.url)));
const newNames = ['Bastidor + Tapa', 'Bastidor Rectangular 10x5 (Plástico)', 'Caja medidor', 'Caja Octogonal', 'Cal viva', 'Cano galvanizado', 'Chapa color', 'Conector PVC', 'Kit Armado', 'Portalámpara', 'Precintos', 'Reflector', 'Tapa Bastidor', 'Tarugos + Tornillos', 'Tortuga', 'Vidrio templado'];
const added = newNames.map((name) => master.find((row) => row.name.startsWith(name)));
assert.ok(added.every(Boolean));
items.push(...added.map((row) => ({ ...row, suggested_price: null })));
const laborOnly = process.env.CATALOG_LABOR_ONLY === '1';
const laborRows = JSON.parse(await readFile(new URL('fixtures/master-labor-2026-10-20.json', import.meta.url)));
if (laborOnly) items.splice(0, items.length, ...laborRows.map((row) => ({ ...row, suggested_price: 12345 })));
const imageBytes = await readFile(new URL('../assets/material-renders/obra-gruesa-cemento-portland.webp', import.meta.url));
const artifacts = new URL('../dist/mobile-smoke/', import.meta.url); await mkdir(artifacts, { recursive: true });
try {
 for (const width of (process.env.CATALOG_TEST_WIDTHS || '390,320,768,1440').split(',').map(Number)) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const errors = [], requests = []; let published = false, brokenImage = false, unavailable = false, signs = 0;
  await context.addInitScript(({ host, token, exp, user, dropReady }) => {
    if (window !== window.top) return;
    localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: exp, token_type: 'bearer', user }));
    window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; };
    window.__readyDropped = 0;
    if (dropReady) window.addEventListener('message', (event) => {
      if (window.__readyDropped || typeof event.data !== 'string') return;
      try { if (JSON.parse(event.data).type === 'ready') { window.__readyDropped++; event.stopImmediatePropagation(); } } catch {}
    }, true);
  }, { host, token, exp, user, dropReady: process.env.CATALOG_DROP_READY === '1' });
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url());
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    if (url.hostname !== host) return route.abort();
    if (url.pathname.startsWith('/auth/')) return json(user);
    if (url.pathname.endsWith('/profiles')) return json({ id: owner, full_name: 'Prueba', phone: '00000000', city: 'Pilar', business_name: 'Prueba', access_granted: true, profile_published: true });
    if (url.pathname.endsWith('/master_items')) return json([...items].sort((a, b) => a.name.localeCompare(b.name)));
    if (url.pathname.endsWith('/render_library')) {
      requests.push(url.searchParams.get('material_id'));
      assert.equal(url.searchParams.get('status'), 'eq.published');
      assert.ok(!url.searchParams.get('material_id').includes(items[3].id));
      assert.ok(items.filter((item) => item.type === 'labor').every((item) => !url.searchParams.get('material_id').includes(item.id)));
      if (unavailable) return json({ message: 'offline' }, 503);
      return json(published && url.searchParams.get('material_id')?.includes('obra-gruesa-cemento-portland') ? [{ id: '66666666-2222-4333-8444-555555555555', material_id: 'obra-gruesa-cemento-portland', title: 'Cemento publicado de prueba', thumbnail_path: 'fixture/preview.webp', object_path: 'fixture/original.webp', is_primary: true }] : []);
    }
    if (url.pathname.includes('/storage/v1/object/sign/')) {
      if (request.method() === 'POST') {
        signs++; const body = request.postDataJSON();
        if (body.paths) return json(body.paths.map((path) => ({ path, signedURL: `/object/sign/render-library/${path}?token=fixture-${signs}`, error: null })));
        return json({ signedURL: `/object/sign/render-library/fixture/original.webp?token=fixture-${signs}` });
      }
      if (brokenImage) return route.fulfill({ status: 403, body: 'expired' });
      return route.fulfill({ contentType: 'image/webp', body: imageBytes });
    }
    return json([]);
  });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  await page.routeWebSocket('**/realtime/**', (socket) => socket.close());
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8082', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByText('Mis proyectos', { exact: true }).waitFor({ timeout: 180000 });
    await page.getByRole('tab', { name: /Más/ }).click();
    await page.getByRole('button', { name: 'Catálogo de precios', exact: true }).click();
    await page.getByText('CATALOGO MAESTRO', { exact: true }).waitFor();
    if (laborOnly) {
      await page.getByRole('button', { name: 'Mano de obra', exact: true }).click();
      const samples = [
        ['Columnas H°A°', 'column'], ['Instalación cañería termofusión engrampada', 'water-network'],
        ['Cañería EPOXI Ø 025 mm', 'gas-network'], ['Demolición mamposterías ladrillos comunes', 'wall-demolition'],
        ['Cambio cartucho monocomando', 'faucet-repair'], ['Certificado DCI-CAIE T1 comercial trifásico', 'documentation'],
        ['Jornal de oficial electricista', 'service-time'], ['Mantenimiento split (sin desinst.)', 'ac-maintenance'],
      ];
      for (const [prefix, scene] of samples) {
        const row = laborRows.find((r) => r.name.startsWith(prefix)); assert.ok(row, prefix);
        await page.getByLabel('Buscar material o servicio').fill(row.name);
        const img = page.getByRole('img', { name: `Vista orientativa de ${row.name}`, exact: true }); await img.waitFor();
        assert.ok(await img.evaluate((node) => { const image = node instanceof HTMLImageElement ? node : node.querySelector('img'); return image.decode().then(() => image.naturalWidth > 0); }));
        await page.getByRole('button', { name: `Ver detalle de ${row.name}`, exact: true }).click();
        await page.getByText('$12.345', { exact: true }).last().waitFor();
        await page.getByRole('button', { name: 'Ver trabajo en 3D', exact: true }).click();
        const frame = page.frameLocator('iframe[title="Editor integrado UrbanFix"]');
        await frame.locator(`[data-work-scene="${scene}"]`).waitFor();
        await frame.getByRole('heading', { name: row.name, exact: true }).waitFor();
        assert.equal(await frame.getByRole('button', { name: /Separar capas/ }).count(), 0);
        const canvas = frame.locator('canvas[data-subfloor-3d]'); await canvas.scrollIntoViewIfNeeded();
        const colors = await canvas.evaluate((surface) => new Promise((resolve) => requestAnimationFrame(() => {
          const gl = surface.getContext('webgl2'), data = new Uint8Array(surface.width * surface.height * 4); gl.readPixels(0, 0, surface.width, surface.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
          const colors = new Set(); for (let i = 0; i < data.length; i += 128) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`); resolve(colors.size);
        })));
        assert.ok(colors > 3, `${scene}: nonblank`);
        // Wait for native navigation transitions before measuring iframe coordinates.
        await canvas.hover();
        const before = await canvas.screenshot(); const bounds = await canvas.boundingBox();
        await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5); await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .6, { steps: 8 }); await page.mouse.up();
        let after = before;
        for (let attempt = 0; attempt < 20 && before.equals(after); attempt++) {
          await page.waitForTimeout(100);
          after = await canvas.screenshot();
        }
        assert.notDeepEqual(before, after, `${scene}: interactive`);
        await page.screenshot({ path: fileURLToPath(new URL(`labor-${scene}-${width}.png`, artifacts)), fullPage: true });
        await page.getByRole('button', { name: 'Volver', exact: true }).click(); await page.getByRole('button', { name: 'Volver', exact: true }).click();
      }
      await page.getByLabel('Buscar material o servicio').fill('');
      await page.screenshot({ path: fileURLToPath(new URL(`labor-catalog-${width}.png`, artifacts)), fullPage: true });
      assert.equal(requests.length, 0, 'Labor does not query the material-image library');
      assert.equal(signs, 0); assert.deepEqual(errors, []); assert.deepEqual(await page.evaluate(() => window.__opened), []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      console.log(JSON.stringify({ width, labor: 410, testedScenes: samples.length, passed: true, imageLibraryQueries: requests.length }));
      continue;
    }
    await page.getByRole('button', { name: 'Todos', exact: true }).waitFor();
    for (const item of items.filter((item) => item.type === 'labor')) {
      await page.getByLabel('Buscar material o servicio').fill(item.name);
      await page.getByRole('img', { name: `Vista orientativa de ${item.name}`, exact: true }).waitFor();
    }
    await page.getByLabel('Buscar material o servicio').fill('');
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-todos-renders-${width}.png`, artifacts)), fullPage: true });
    const workCard = page.getByRole('button', { name: `Ver detalle de ${items[4].name}`, exact: true });
    await workCard.click();
    await page.getByText('Vista orientativa de la familia de trabajo', { exact: true }).waitFor();
    await page.getByRole('button', { name: `Ampliar render de ${items[4].name}`, exact: true }).click();
    await page.getByText('RENDER DEL TRABAJO', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar render', exact: true }).click();
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: 'Materiales', exact: true }).click();
    await page.getByLabel('Buscar material o servicio').fill('Cemento');
    const localImage = page.getByRole('img', { name: `Render ilustrativo de ${items[0].name}` });
    await localImage.waitFor();
    assert.ok(await localImage.evaluate((node) => { const image = node instanceof HTMLImageElement ? node : node.querySelector('img'); return image?.complete ? image.naturalWidth > 0 : new Promise((resolve) => { if (!image) return resolve(false); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); }); }));
    assert.equal(await page.getByRole('button', { name: `Ver detalle de ${items[3].name}` }).count(), 0);
    const card = page.getByRole('button', { name: `Ver detalle de ${items[0].name}`, exact: true });
    assert.equal(await card.evaluate((node) => getComputedStyle(node).borderRadius), '20px');
    assert.equal(await card.evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
    assert.ok((await card.getByText('MATERIAL', { exact: true }).boundingBox()).height < 22);
    const heading = await page.getByText('CATALOGO MAESTRO', { exact: true }).boundingBox();
    assert.ok(heading.x >= 0 && heading.x + heading.width <= width + 1);
    await page.getByRole('button', { name: 'Mano de obra', exact: true }).click();
    await page.getByLabel('Buscar material o servicio').fill('Colocación de contrapiso');
    await page.getByRole('button', { name: `Ver detalle de ${items[3].name}` }).waitFor();
    await page.getByRole('img', { name: `Vista orientativa de ${items[3].name}`, exact: true }).waitFor();
    assert.equal(await page.getByRole('img', { name: `Render ilustrativo de ${items[0].name}`, exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Materiales', exact: true }).click();
    await page.getByLabel('Buscar material o servicio').fill('Ladrillo');
    await page.getByRole('img', { name: `Render ilustrativo de ${items[1].name}` }).waitFor();
    await page.getByLabel('Buscar material o servicio').fill('');
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-renders-${width}.png`, artifacts)), fullPage: true });
    await page.getByLabel('Buscar material o servicio').fill('Cemento');
    published = true; await page.getByRole('button', { name: 'Actualizar catálogo y renders' }).click();
    await page.getByRole('img', { name: `Render publicado de ${items[0].name}` }).waitFor();
    assert.ok(signs > 0);
    brokenImage = true; await page.getByRole('button', { name: 'Actualizar catálogo y renders' }).click();
    await localImage.waitFor(); // Expired published URL falls back, without breaking the card.
    brokenImage = false; await page.getByRole('button', { name: 'Actualizar catálogo y renders' }).click();
    await page.getByRole('img', { name: `Render publicado de ${items[0].name}` }).waitFor();
    if (width === 390) {
      unavailable = true; await page.getByRole('button', { name: 'Actualizar catálogo y renders' }).click();
      await page.getByRole('button', { name: 'Reintentar renders', exact: true }).waitFor();
      await card.waitFor(); // A library error does not replace the working price catalog.
      unavailable = false; await page.getByRole('button', { name: 'Reintentar renders', exact: true }).click();
      await page.getByRole('img', { name: `Render publicado de ${items[0].name}` }).waitFor();
    }
    await card.click();
    await page.getByRole('button', { name: `Ampliar render de ${items[0].name}` }).click();
    await page.getByText('RENDER DEL MATERIAL', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar render' }).click({ trial: true });
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-preview-${width}.png`, artifacts)), fullPage: true });
    await page.getByRole('button', { name: 'Cerrar render' }).click();
    await page.getByRole('button', { name: 'Ver material en 3D', exact: true }).click();
    await page.getByText('RENDER 3D', { exact: true }).waitFor();
    const frame = page.frameLocator('iframe[title="Editor integrado UrbanFix"]');
    await frame.getByRole('heading', { name: 'Cemento Portland', exact: true }).waitFor();
    const canvas = frame.locator('canvas[data-material-3d]'); await canvas.scrollIntoViewIfNeeded();
    const colors = await canvas.evaluate((surface) => new Promise((resolve) => requestAnimationFrame(() => {
      const gl = surface.getContext('webgl2'), data = new Uint8Array(surface.width * surface.height * 4);
      gl.readPixels(0, 0, surface.width, surface.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const colors = new Set(); for (let i = 0; i < data.length; i += 128) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`); resolve(colors.size);
    })));
    assert.ok(colors > 3);
    assert.equal(await frame.locator('.mobile-original .outline').first().evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(255, 143, 31)');
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-model-${width}.png`, artifacts)), fullPage: true });
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    // Search also exercises virtualized rows below the first screen.
    for (const row of added) {
      await page.getByLabel('Buscar material o servicio').fill(row.name);
      const image = page.getByRole('img', { name: `Render ilustrativo de ${row.name}`, exact: true }).first();
      await image.waitFor();
      assert.ok(await image.evaluate((node) => { const img = node instanceof HTMLImageElement ? node : node.querySelector('img'); return img?.complete ? img.naturalWidth > 0 : new Promise((resolve) => { if (!img) return resolve(false); img.onload = () => resolve(img.naturalWidth > 0); img.onerror = () => resolve(false); }); }), row.name);
    }
    await page.getByLabel('Buscar material o servicio').fill('Reflector LED 50W');
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-new-render-${width}.png`, artifacts)), fullPage: true });
    await page.getByRole('button', { name: 'Ver detalle de Reflector LED 50W', exact: true }).click();
    await page.getByRole('button', { name: 'Ver material en 3D', exact: true }).click();
    const newFrame = page.frameLocator('iframe[title="Editor integrado UrbanFix"]');
    await newFrame.getByRole('heading', { name: 'Reflector LED', exact: true }).waitFor();
    await newFrame.getByText('Carcasa metálica pintada', { exact: true }).waitFor();
    const newCanvas = newFrame.locator('canvas[data-material-3d]'); await newCanvas.scrollIntoViewIfNeeded();
    const before = await newCanvas.screenshot();
    const bounds = await newCanvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5);
    await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .75, bounds.y + bounds.height * .6, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(350);
    assert.notDeepEqual(before, await newCanvas.screenshot(), 'New material model rotates');
    const newColors = await newCanvas.evaluate((surface) => new Promise((resolve) => requestAnimationFrame(() => {
      const gl = surface.getContext('webgl2'), data = new Uint8Array(surface.width * surface.height * 4);
      gl.readPixels(0, 0, surface.width, surface.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const colors = new Set(); for (let i = 0; i < data.length; i += 128) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`); resolve(colors.size);
    })));
    assert.ok(newColors > 3, 'New 3D canvas is nonblank');
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-new-model-${width}.png`, artifacts)), fullPage: true });
    assert.deepEqual(await page.evaluate(() => window.__opened), []);
    if (process.env.CATALOG_DROP_READY === '1') assert.equal(await page.evaluate(() => window.__readyDropped), 1, 'Dropped startup notification is recovered by iframe load');
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.ok(requests.some((ids) => ids.includes(items[0].id) && ids.includes(added[0].id)), 'Visible products share a batched query');
    assert.ok(requests.length < 60, 'Request budget includes the 16 separate search/filter scenarios');
    console.log(JSON.stringify({ width, passed: true, publishedQueries: requests.length, signedBatches: signs, modelColors: colors, newMaterialPreviews: added.length, newModelColors: newColors }));
  } catch (error) {
    console.error(error);
    console.error(JSON.stringify({ width, errors, tabs: await page.getByRole('tab').allTextContents().catch(() => []) }));
    await page.screenshot({ path: fileURLToPath(new URL(`catalog-failure-${width}.png`, artifacts)), fullPage: true, timeout: 10000 }).catch(() => {});
    throw error;
  } finally { await context.close(); }
 }
} finally { await browser.close(); }
