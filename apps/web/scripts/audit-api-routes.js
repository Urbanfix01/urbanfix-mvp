const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const apiDir = path.join(appRoot, 'app', 'api');

const protectedRoutes = new Set([
  'billing/checkout/route.ts',
  'billing/coupon/validate/route.ts',
  'billing/subscription/route.ts',
  'client/requests/route.ts',
  'client/requests/[id]/route.ts',
  'client/technicians/map/route.ts',
  'client/technicians/nearby/route.ts',
  'tecnico/dashboard/route.ts',
  'tecnico/quotes/[id]/feedback-link/route.ts',
  'tecnico/requests/nearby/route.ts',
  'tecnico/requests/[id]/offer/route.ts',
  'tecnicos/[id]/likes/route.ts',
]);

const tokenGuardedRoutes = new Map([
  [
    'notify/route.ts',
    {
      label: 'token interno',
      guards: ['NOTIFY_WEBHOOK_SECRET', 'x-hook-secret', 'timingSafeEqual'],
    },
  ],
  [
    'billing/webhook/route.ts',
    {
      label: 'verificacion proveedor',
      guards: ['MP_ACCESS_TOKEN', 'fetchMpPayment', 'fetchMpPreapproval'],
    },
  ],
]);

const publicRoutes = new Set([
  'analytics/track/route.ts',
  'auth/session/route.ts',
  'billing/plans/route.ts',
  'demo-requests/route.ts',
  'geocode/search/route.ts',
  'localities/search/route.ts',
  'public/quote-feedback/[token]/route.ts',
  'public/quotes/[id]/route.ts',
]);

const walk = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
  });
};

const toRoute = (filePath) => path.relative(apiDir, filePath).split(path.sep).join('/');

const report = { ok: [], fail: [] };

for (const filePath of walk(apiDir)) {
  const route = toRoute(filePath);
  if (route.startsWith('admin/')) continue;

  const source = fs.readFileSync(filePath, 'utf8');
  const tokenGuard = tokenGuardedRoutes.get(route);

  if (protectedRoutes.has(route)) {
    if (source.includes('getAuthUser') || source.includes('auth.getUser')) {
      report.ok.push(`${route}: sesion requerida`);
    } else {
      report.fail.push(`${route}: falta validacion de sesion`);
    }
    continue;
  }

  if (tokenGuard) {
    const missingGuard = tokenGuard.guards.find((guard) => !source.includes(guard));
    if (missingGuard) {
      report.fail.push(`${route}: falta ${missingGuard}`);
    } else {
      report.ok.push(`${route}: ${tokenGuard.label}`);
    }
    continue;
  }

  if (publicRoutes.has(route)) {
    report.ok.push(`${route}: publica por diseno`);
    continue;
  }

  report.fail.push(`${route}: ruta no clasificada`);
}

if (report.ok.length) {
  console.log('\nOK');
  report.ok.forEach((item) => console.log(`- ${item}`));
}

if (report.fail.length) {
  console.error('\nFAIL');
  report.fail.forEach((item) => console.error(`- ${item}`));
  console.error(`\nAPI routes audit failed: ${report.fail.length} route(s).`);
  process.exit(1);
}

console.log('\nAPI routes audit passed.');
