const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const appRoot = path.resolve(__dirname, '..');

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_PUBLIC_WEB_URL',
  'NOTIFY_WEBHOOK_SECRET',
];

const launchEnv = [
  'MP_ACCESS_TOKEN',
  'RESEND_API_KEY',
  'NEWSLETTER_FROM_EMAIL',
];

const criticalTables = [
  { table: 'profiles', columns: 'id,access_granted,profile_published' },
  { table: 'quotes', columns: 'id,user_id,status' },
  { table: 'quote_items', columns: 'id,quote_id' },
  { table: 'quote_attachments', columns: 'id,quote_id,user_id' },
  { table: 'client_requests', columns: 'id,client_id,status' },
  { table: 'client_request_matches', columns: 'id,request_id,technician_id,quote_status' },
  { table: 'client_request_events', columns: 'id,request_id' },
  { table: 'billing_plans', columns: 'id,active' },
  { table: 'subscriptions', columns: 'id,user_id,status' },
  { table: 'subscription_payments', columns: 'id,user_id,status' },
  { table: 'notifications', columns: 'id,user_id,read_at' },
  { table: 'device_tokens', columns: 'id,user_id,expo_push_token' },
  { table: 'demo_requests', columns: 'id,email,status' },
  { table: 'quote_feedback_requests', columns: 'id,quote_id,technician_id,share_token' },
  { table: 'quote_feedback_reviews', columns: 'id,quote_id,technician_id,rating' },
  { table: 'beta_admins', columns: 'user_id' },
  { table: 'beta_support_messages', columns: 'id,user_id,sender_id' },
  { table: 'master_items', columns: 'id' },
];

const optionalTables = [
  { table: 'analytics_events', columns: 'id,event_type,path' },
  { table: 'roadmap_updates', columns: 'id,status' },
  { table: 'newsletter_campaigns', columns: 'id,status' },
];

const normalize = (value) => String(value || '').trim();

const isPlaceholder = (value) => {
  const normalized = normalize(value);
  return (
    !normalized ||
    normalized.includes('placeholder.supabase.co') ||
    normalized === 'placeholder-anon-key' ||
    normalized === 'missing-supabase-anon-key'
  );
};

const report = {
  ok: [],
  warn: [],
  fail: [],
};

const push = (level, message) => report[level].push(message);

const getFirstFailureLine = (output) => {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.find((line) => line.startsWith('- ')) || lines[0] || 'sin detalle';
};

const runLocalAudit = (scriptName, label) => {
  const result = spawnSync(
    process.execPath,
    ['--preserve-symlinks', '--preserve-symlinks-main', path.join(appRoot, 'scripts', scriptName)],
    { encoding: 'utf8' }
  );

  if (result.status === 0) {
    push('ok', `${label} sin bloqueos`);
    return;
  }

  const detail = getFirstFailureLine(result.stderr || result.stdout);
  push('fail', `${label}: ${detail}`);
};

const walkRouteFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkRouteFiles(fullPath);
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
  });
};

const validateAdminRoutes = () => {
  const adminApiDir = path.join(appRoot, 'app', 'api', 'admin');
  const tokenOnlyRoutes = new Map([
    [
      path.join('roadmap', 'auto-sync', 'route.ts').split(path.sep).join('/'),
      {
        header: 'x-roadmap-autosync-token',
        guards: ['timingSafeEqual', 'ROADMAP_AUTOSYNC_TOKEN'],
      },
    ],
  ]);

  const files = walkRouteFiles(adminApiDir);
  files.forEach((filePath) => {
    const relativeRoute = path.relative(adminApiDir, filePath).split(path.sep).join('/');
    const source = fs.readFileSync(filePath, 'utf8');
    const tokenRoute = tokenOnlyRoutes.get(relativeRoute);

    if (/['"`](Missing|Misconfigured)\s+[A-Z0-9_]+/.test(source)) {
      push('fail', `${relativeRoute}: no debe exponer nombres de secretos en errores de configuracion`);
      return;
    }

    if (tokenRoute) {
      const hasTokenGuard =
        source.includes(tokenRoute.header) && tokenRoute.guards.every((guard) => source.includes(guard));
      if (!hasTokenGuard) {
        push('fail', `${relativeRoute}: token interno incompleto`);
      } else {
        push('ok', `${relativeRoute}: token interno`);
      }
      return;
    }

    if (!source.includes('getAuthUser(') || !source.includes('ensureAdmin(')) {
      push('fail', `${relativeRoute}: falta validacion de admin`);
    } else {
      push('ok', `${relativeRoute}: admin validado`);
    }
  });
};

const validateEnv = () => {
  requiredEnv.forEach((name) => {
    if (isPlaceholder(process.env[name])) {
      push('fail', `Falta ${name}`);
    } else {
      push('ok', `${name} configurada`);
    }
  });

  launchEnv.forEach((name) => {
    if (isPlaceholder(process.env[name])) {
      push('warn', `${name} no configurada`);
    } else {
      push('ok', `${name} configurada`);
    }
  });
};

const validateUrlAlignment = () => {
  const publicUrl = normalize(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serverUrl = normalize(process.env.SUPABASE_URL);
  if (publicUrl && serverUrl && publicUrl !== serverUrl) {
    push('warn', 'SUPABASE_URL y NEXT_PUBLIC_SUPABASE_URL no coinciden');
  }

  const webUrl = normalize(process.env.NEXT_PUBLIC_PUBLIC_WEB_URL);
  if (webUrl && !/^https:\/\/www\.urbanfix\.com\.ar\/?$/.test(webUrl)) {
    push('warn', `NEXT_PUBLIC_PUBLIC_WEB_URL apunta a ${webUrl}`);
  }

  if (normalize(process.env.ALLOW_LEGACY_ACCESS_BACKFILL).toLowerCase() === 'true') {
    push('fail', 'ALLOW_LEGACY_ACCESS_BACKFILL esta activo; desactivarlo antes de abrir usuarios reales');
  }

  const notifySecret = normalize(process.env.NOTIFY_WEBHOOK_SECRET);
  if (notifySecret && notifySecret.length < 32) {
    push('fail', 'NOTIFY_WEBHOOK_SECRET debe tener al menos 32 caracteres');
  }
};

const checkTable = async (supabase, entry, level = 'fail') => {
  const { table, columns } = entry;
  const { error } = await supabase.from(table).select(columns, { count: 'exact', head: true });
  if (error) {
    push(level, `${table}: ${error.message}`);
    return;
  }
  push('ok', `${table} disponible`);
};

const validateSupabase = async () => {
  const url = normalize(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalize(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (isPlaceholder(url) || isPlaceholder(key)) {
    push('warn', 'No se pudo consultar Supabase: faltan SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const entry of criticalTables) {
    await checkTable(supabase, entry, 'fail');
  }

  for (const entry of optionalTables) {
    await checkTable(supabase, entry, 'warn');
  }
};

const printSection = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title}`);
  items.forEach((item) => console.log(`- ${item}`));
};

const main = async () => {
  validateEnv();
  validateUrlAlignment();
  validateAdminRoutes();
  runLocalAudit('audit-auth-session-cookie.js', 'Cookie de sesion');
  runLocalAudit('audit-cookie-policy.js', 'Politica de cookies');
  runLocalAudit('audit-env-template.js', 'Plantilla de variables');
  runLocalAudit('audit-next-image-config.js', 'Imagenes remotas');
  runLocalAudit('audit-post-auth-redirects.js', 'Redirects post-auth');
  runLocalAudit('audit-secret-boundaries.js', 'Limites de secretos');
  runLocalAudit('audit-security-headers.js', 'Headers de seguridad');
  runLocalAudit('audit-supabase-client-guards.js', 'Guardas Supabase cliente');
  runLocalAudit('audit-supabase-migrations.js', 'Migraciones Supabase');
  runLocalAudit('audit-storage-migrations.js', 'Storage Supabase');
  runLocalAudit('audit-api-routes.js', 'Rutas API no admin');
  await validateSupabase();

  printSection('OK', report.ok);
  printSection('WARN', report.warn);
  printSection('FAIL', report.fail);

  if (report.fail.length > 0) {
    console.error(`\nProduccion no lista: ${report.fail.length} bloqueo(s).`);
    process.exit(1);
  }

  console.log('\nProduccion sin bloqueos criticos detectados.');
};

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
