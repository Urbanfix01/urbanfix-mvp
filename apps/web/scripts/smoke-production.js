const DEFAULT_BASE_URL = 'https://www.urbanfix.com.ar';

const normalizeBaseUrl = (value) => {
  const raw = String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  try {
    return new URL(raw);
  } catch {
    throw new Error(`URL invalida para smoke test: ${raw}`);
  }
};

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_SMOKE_URL || process.env.NEXT_PUBLIC_PUBLIC_WEB_URL);
const isLocalTarget = ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname);
const isStrictProduction =
  process.env.PRODUCTION_SMOKE_STRICT === '1' ||
  (!isLocalTarget && baseUrl.hostname.endsWith('urbanfix.com.ar'));
const skipNotify = process.env.PRODUCTION_SMOKE_SKIP_NOTIFY === '1' || (!isStrictProduction && isLocalTarget);

const failures = [];
const warnings = [];

const buildUrl = (pathname) => new URL(pathname, baseUrl).toString();

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

const fetchText = async (pathname) => {
  const response = await fetch(buildUrl(pathname), {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'user-agent': 'urbanfix-production-smoke/1.0',
    },
  });
  const body = await response.text();
  return { response, body };
};

const assertPage = async (pathname, label) => {
  const { response, body } = await fetchText(pathname);
  const finalUrl = response.url || buildUrl(pathname);

  if (response.status < 200 || response.status >= 400) {
    fail(`${label}: HTTP ${response.status}`);
  }

  if (finalUrl.includes('placeholder.supabase.co')) {
    fail(`${label}: redirige a placeholder.supabase.co`);
  }

  const forbiddenBodyMarkers = [
    'placeholder.supabase.co',
    'missing-supabase-anon-key',
    'Falta configurar Supabase',
  ];

  forbiddenBodyMarkers.forEach((marker) => {
    if (body.includes(marker)) {
      fail(`${label}: expone marcador de configuracion "${marker}"`);
    }
  });

  return { response, body };
};

const assertHeader = (headers, name, expected) => {
  const actual = headers.get(name);
  if (!actual) {
    fail(`Header ${name} ausente`);
    return;
  }

  const normalizedActual = actual.toLowerCase();
  const normalizedExpected = expected.toLowerCase();
  if (!normalizedActual.includes(normalizedExpected)) {
    fail(`Header ${name} inesperado: ${actual}`);
  }
};

const assertSecurityHeaders = async () => {
  const { response } = await assertPage('/', 'Home');
  assertHeader(response.headers, 'x-frame-options', 'DENY');
  assertHeader(response.headers, 'x-content-type-options', 'nosniff');
  assertHeader(response.headers, 'referrer-policy', 'strict-origin-when-cross-origin');
  assertHeader(response.headers, 'permissions-policy', 'geolocation=(self)');

  if (baseUrl.protocol === 'https:') {
    assertHeader(response.headers, 'strict-transport-security', 'includeSubDomains');
  }
};

const assertApiNoStore = async () => {
  const response = await fetch(buildUrl('/api/geocode/search?query=ab'), {
    cache: 'no-store',
    redirect: 'manual',
    headers: {
      'user-agent': 'urbanfix-production-smoke/1.0',
    },
  });

  assertHeader(response.headers, 'cache-control', 'no-store');
};

const assertNotifyRejectsAnonymous = async () => {
  if (skipNotify) {
    warn('Notify endpoint omitido para target local/no estricto.');
    return;
  }

  const response = await fetch(buildUrl('/api/notify'), {
    method: 'POST',
    cache: 'no-store',
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'urbanfix-production-smoke/1.0',
    },
    body: JSON.stringify({ type: 'smoke_test' }),
  });

  if (![401, 403].includes(response.status)) {
    fail(`/api/notify debe rechazar sin secreto con 401/403; recibio HTTP ${response.status}`);
  }
};

const main = async () => {
  console.log(`Production smoke target: ${baseUrl.toString().replace(/\/$/, '')}`);

  await assertSecurityHeaders();
  await assertApiNoStore();
  await assertPage('/tecnicos', 'Tecnicos');
  await assertPage('/cliente', 'Cliente');
  await assertPage('/admin', 'Admin');
  await assertNotifyRejectsAnonymous();

  if (warnings.length) {
    console.log('\nWARN');
    warnings.forEach((message) => console.log(`- ${message}`));
  }

  if (failures.length) {
    console.error('\nFAIL');
    failures.forEach((message) => console.error(`- ${message}`));
    console.error(`\nProduction smoke failed: ${failures.length} bloqueo(s).`);
    process.exit(1);
  }

  console.log('\nOK');
  console.log('- Paginas principales responden.');
  console.log('- Headers de seguridad presentes.');
  console.log('- APIs responden sin cache.');
  console.log('- No se detectaron placeholders visibles.');
  if (!skipNotify) console.log('- Notify rechaza llamadas sin secreto.');
};

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
