// Isolated profile regression tests. All external requests are mocked or blocked.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.env.PLAYWRIGHT_MODULE) throw new Error('Set PLAYWRIGHT_MODULE to playwright-core.');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
const host = 'jfqutuptbrgtwbofpawp.supabase.co', owner = '44444444-4444-4444-8444-444444444444';
const user = { id: owner, email: 'perfil@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { app_audience: 'tecnico' } };
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: owner, aud: 'authenticated', exp })).toString('base64url'), 'fixture-signature'].join('.');
const artifacts = new URL('../dist/mobile-smoke/', import.meta.url); await mkdir(artifacts, { recursive: true });
const cases = [
  { name: 'onboarding-empty-location', onboarding: true, address: '', precision: null, lat: null, lng: null },
  { name: 'onboarding-address-only', onboarding: true, address: 'Calle de prueba 123, Pilar', precision: null, lat: null, lng: null },
  { name: 'existing-exact-location', onboarding: false, address: 'Calle de prueba 123, Pilar', precision: 'exact', lat: -34.6, lng: -58.38 },
  { name: 'existing-approximate-location', onboarding: false, address: 'Pilar', precision: 'approx', lat: -34.45, lng: -58.91 },
  { name: 'changed-address-clears-stale-point', onboarding: false, address: 'Calle de prueba 123, Pilar', precision: 'exact', lat: -34.6, lng: -58.38, changeAddress: true },
  { name: 'optional-social-links', address: '', precision: null, lat: null, lng: null, addSocials: true },
  { name: 'clear-existing-social-links', address: '', precision: null, lat: null, lng: null, socials: true, clearSocials: true },
  { name: 'keep-existing-social-links', address: '', precision: null, lat: null, lng: null, socials: true },
  { name: 'legacy-optional-columns', address: '', precision: null, lat: null, lng: null, socials: true, legacy: true },
  { name: 'database-error-keeps-form', address: '', precision: null, lat: null, lng: null, addSocials: true, failSave: true },
  { name: 'unapproved-profile-stays-unpublished', address: '', precision: null, lat: null, lng: null, unpublished: true },
  { name: 'zero-updated-rows-keeps-form', address: '', precision: null, lat: null, lng: null, addSocials: true, zeroRows: true },
  { name: 'metadata-only-fills-missing-fields', address: '', precision: null, lat: null, lng: null, seedMetadata: true },
];
try {
  for (const scenario of cases) {
    const context = await browser.newContext({ viewport: { width: scenario.name === 'onboarding-empty-location' || scenario.name === 'optional-social-links' ? 320 : 390, height: 844 } });
    const errors = [], dialogs = [], dialogTasks = [], saves = [], schemaErrors = [], permissionErrors = [], metadataSaves = [];
    const scenarioUser = { ...user, user_metadata: { ...user.user_metadata, ...(scenario.seedMetadata ? { full_name: 'Nombre viejo', business_name: 'Empresa vieja', phone: '11111111', city: 'Ciudad vieja' } : {}) } };
    const instagramField = scenario.legacy ? 'instagram_profile_url' : 'instagram_url';
    const facebookField = scenario.legacy ? 'facebook_profile_url' : 'facebook_url';
    const instagramUrl = 'https://www.instagram.com/urbanfix_prueba/';
    const facebookUrl = 'https://www.facebook.com/urbanfix.prueba';
    let profile = {
      id: owner, full_name: 'Prueba', access_granted: !scenario.unpublished,
      email: scenario.seedMetadata ? null : user.email, phone: scenario.onboarding ? '' : '00000000',
      business_name: scenario.onboarding ? '' : 'Empresa de prueba',
      company_address: scenario.address, service_location_name: scenario.address,
      city: 'Pilar', service_city: 'Pilar', service_province: null,
      service_location_precision: scenario.precision, service_lat: scenario.lat, service_lng: scenario.lng,
      profile_published: !scenario.unpublished, profile_published_at: null, default_discount: null, working_hours: null, updated_at: null,
      [instagramField]: scenario.socials ? instagramUrl : null,
      [facebookField]: scenario.socials ? facebookUrl : null,
      ...(scenario.legacy ? { location_lat: null, location_lng: null, instagram_post_url: 'https://www.instagram.com/p/prueba/', facebook_post_url: null, work_photo_urls: ['https://example.invalid/work.png'] } : {}),
    };
    const columns = new Set(Object.keys(profile));
    // Native form subset of the hosted authenticated UPDATE grants, 2026-10-19.
    const writableColumns = new Set([
      'email', 'full_name', 'business_name', 'phone', 'city', 'company_address',
      'service_city', 'service_province', 'service_location_name', 'service_location_precision',
      'service_lat', 'service_lng', 'instagram_url', 'facebook_url', 'default_discount', 'working_hours', 'updated_at',
      ...(scenario.legacy ? ['location_lat', 'location_lng', 'instagram_profile_url', 'facebook_profile_url', 'instagram_post_url', 'facebook_post_url', 'work_photo_urls'] : []),
    ]);
    await context.addInitScript(({ host, token, exp, user }) => {
      localStorage.setItem(`sb-${host.split('.')[0]}-auth-token`, JSON.stringify({ access_token: token, refresh_token: 'fixture-refresh', expires_at: exp, token_type: 'bearer', user }));
    }, { host, token, exp, user: scenarioUser });
    await context.route('**/*', async (route) => {
      const request = route.request(), url = new URL(request.url());
      const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) {
        if (url.pathname.startsWith('/api/')) return json({ results: [] });
        return route.continue();
      }
      if (url.hostname !== host) return route.abort();
      if (url.pathname.startsWith('/auth/')) return json(scenarioUser);
      if (url.pathname.endsWith('/profiles')) {
        const selected = url.searchParams.get('select');
        const unknown = selected && selected !== '*' && selected.split(',').find((column) => !columns.has(column.trim()));
        if (unknown) {
          schemaErrors.push(unknown);
          return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '42703', message: `column profiles.${unknown} does not exist` }) });
        }
        if (request.method() === 'POST') {
          // Upsert updates id on conflict, but authenticated cannot update id.
          permissionErrors.push('upsert');
          return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied for table profiles' }) });
        }
        if (request.method() === 'PATCH') {
          const payload = request.postDataJSON();
          const missing = Object.keys(payload).find((column) => !columns.has(column));
          if (missing) {
            schemaErrors.push(missing);
            return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST204', message: `Could not find the '${missing}' column of 'profiles' in the schema cache` }) });
          }
          const forbidden = Object.keys(payload).find((column) => !writableColumns.has(column));
          if (forbidden || url.searchParams.get('id') !== `eq.${owner}`) {
            permissionErrors.push(forbidden || 'missing-owner-filter');
            return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied for table profiles' }) });
          }
          if ('working_hours' in payload) saves.push(payload);
          else metadataSaves.push(payload);
          if ('working_hours' in payload && scenario.failSave) {
            return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'No se pudo guardar el perfil de prueba.' }) });
          }
          if ('working_hours' in payload && scenario.zeroRows) {
            return route.fulfill({ status: 406, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object', details: 'The result contains 0 rows' }) });
          }
          profile = { ...profile, ...payload };
          return url.searchParams.has('select') ? json({ id: owner }) : route.fulfill({ status: 204 });
        }
        return json(profile);
      }
      return json([]);
    });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    await page.routeWebSocket('**/realtime/**', (ws) => ws.close());
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      dialogTasks.push(dialog.accept().catch((error) => errors.push(error.message)));
    });
    await page.goto(process.env.MOBILE_TEST_URL || 'http://127.0.0.1:8082', { waitUntil: 'domcontentloaded', timeout: 180000 });
    if (scenario.onboarding) {
      await page.getByText('Completa tu perfil', { exact: true }).waitFor();
      const validation = page.waitForEvent('dialog');
      await page.getByText('GUARDAR DATOS', { exact: true }).click();
      assert.ok((await validation).message().includes('Completa telefono y nombre comercial'));
      assert.equal(saves.length, 0);
      await page.getByPlaceholder('Ej: FixIt Soluciones', { exact: true }).fill('Empresa de prueba');
      await page.getByPlaceholder('+54 9 11...', { exact: true }).fill('00000000');
    } else {
      // Access must not require a confirmed map point, including approximate profiles.
      await page.getByText('Mis proyectos', { exact: true }).waitFor();
      await page.getByText('Más', { exact: true }).click();
      await page.getByRole('button', { name: 'Mi perfil', exact: true }).click();
      await page.getByText('Editar perfil', { exact: true }).click();
      if (scenario.seedMetadata) {
        assert.equal(await page.getByPlaceholder('Ej: FixIt Soluciones', { exact: true }).inputValue(), 'Empresa de prueba');
        assert.equal(await page.getByPlaceholder('+54 9 11...', { exact: true }).inputValue(), '00000000');
      }
      await page.getByPlaceholder('Ej: FixIt Soluciones', { exact: true }).fill('Empresa de prueba editada');
    }
    if (scenario.changeAddress) await page.getByPlaceholder('Calle, altura, localidad y provincia', { exact: true }).fill('Otra dirección sin confirmar');
    const instagramInput = page.getByPlaceholder('https://www.instagram.com/tu_cuenta/', { exact: true });
    const facebookInput = page.getByPlaceholder('https://www.facebook.com/tu.pagina', { exact: true });
    await page.getByText('PERFIL DE INSTAGRAM (OPCIONAL)', { exact: true }).waitFor();
    await page.getByText('PERFIL DE FACEBOOK (OPCIONAL)', { exact: true }).waitFor();
    assert.equal(await instagramInput.inputValue(), scenario.socials ? instagramUrl : '');
    assert.equal(await facebookInput.inputValue(), scenario.socials ? facebookUrl : '');
    if (scenario.addSocials || scenario.clearSocials) {
      await instagramInput.fill(scenario.clearSocials ? '' : instagramUrl.replace('https://', ''));
      await facebookInput.fill(scenario.clearSocials ? '' : facebookUrl);
    }
    await page.getByText('BASE OPERATIVA (OPCIONAL)', { exact: true }).waitFor();
    await page.getByText('BASE OPERATIVA (OPCIONAL)', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: fileURLToPath(new URL(`profile-${scenario.name}.png`, artifacts)), fullPage: true });
    if (scenario.addSocials && !scenario.failSave) {
      await instagramInput.scrollIntoViewIfNeeded();
      await page.screenshot({ path: fileURLToPath(new URL('profile-optional-socials.png', artifacts)), fullPage: true });
    }
    const savedResponse = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/profiles') && response.request().method() === 'PATCH' && 'working_hours' in response.request().postDataJSON());
    const successDialog = page.waitForEvent('dialog', { predicate: (dialog) => scenario.failSave
      ? dialog.message() === 'No se pudo guardar el perfil de prueba.'
      : scenario.zeroRows ? dialog.message().startsWith('No se pudo confirmar el guardado')
      : dialog.message().startsWith('Perfil ') });
    await page.getByText('GUARDAR DATOS', { exact: true }).click();
    await savedResponse;
    await successDialog;
    await Promise.all(dialogTasks);
    assert.equal(saves.length, 1, `Profile should save in ${scenario.name}`);
    const saved = saves[0], clear = scenario.changeAddress || scenario.precision === null;
    for (const field of ['id', 'access_granted', 'profile_published', 'profile_published_at']) assert.equal(field in saved, false);
    assert.equal(profile.profile_published, !scenario.unpublished);
    assert.equal(profile.profile_published_at, null);
    assert.equal(profile.access_granted, !scenario.unpublished);
    assert.deepEqual(permissionErrors, []);
    if (scenario.seedMetadata) assert.deepEqual(metadataSaves, [{ email: user.email }]);
    assert.equal(saved.service_lat, clear ? null : scenario.lat);
    assert.equal(saved.service_lng, clear ? null : scenario.lng);
    if (scenario.legacy) {
      assert.equal(saved.location_lat, null);
      assert.equal(saved.location_lng, null);
      assert.equal(saved.instagram_post_url, profile.instagram_post_url);
      assert.equal(saved.facebook_post_url, null);
      assert.deepEqual(saved.work_photo_urls, ['https://example.invalid/work.png']);
    } else {
      for (const column of ['location_lat', 'location_lng', 'instagram_profile_url', 'facebook_profile_url', 'instagram_post_url', 'facebook_post_url', 'work_photo_urls']) {
        assert.equal(column in saved, false, `Must not send unsupported field ${column}`);
      }
    }
    assert.equal(saved[instagramField], !scenario.clearSocials && (scenario.socials || scenario.addSocials) ? instagramUrl : null);
    assert.equal(saved[facebookField], !scenario.clearSocials && (scenario.socials || scenario.addSocials) ? facebookUrl : null);
    assert.deepEqual(schemaErrors, []);
    assert.equal(saved.service_location_precision, clear ? null : scenario.precision);
    assert.equal(saved.company_address, scenario.changeAddress ? 'Otra dirección sin confirmar' : scenario.address);
    assert.ok(!dialogs.some((message) => message.includes('Elige y confirma')));
    if (scenario.onboarding) {
      assert.ok(dialogs.some((message) => message.includes('Completa telefono y nombre comercial')));
      await page.getByText('Mis proyectos', { exact: true }).waitFor();
    }
    if (scenario.failSave || scenario.zeroRows) {
      assert.ok(!dialogs.some((message) => message.startsWith('Perfil ')));
      assert.equal(await instagramInput.inputValue(), instagramUrl.replace('https://', ''));
      await page.getByText('GUARDAR DATOS', { exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ scenario: scenario.name, passed: true, saves: saves.length }));
    await context.close();
  }
} finally { await browser.close(); }
