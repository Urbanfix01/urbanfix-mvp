const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const adminApiDir = path.join(appRoot, 'app', 'api', 'admin');

const tokenOnlyRoutes = new Map([
  [
    path.join('roadmap', 'auto-sync', 'route.ts').split(path.sep).join('/'),
    {
      header: 'x-roadmap-autosync-token',
      guards: ['timingSafeEqual', 'ROADMAP_AUTOSYNC_TOKEN', 'readLimitedJsonBody'],
    },
  ],
]);

const walk = (directory) => {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
  });
};

const toRelativeRoute = (filePath) => path.relative(adminApiDir, filePath).split(path.sep).join('/');

const report = {
  ok: [],
  fail: [],
};

for (const filePath of walk(adminApiDir)) {
  const relativeRoute = toRelativeRoute(filePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const tokenRoute = tokenOnlyRoutes.get(relativeRoute);

  if (/['"`](Missing|Misconfigured)\s+[A-Z0-9_]+/.test(source)) {
    report.fail.push(`${relativeRoute}: no debe exponer nombres de secretos en errores de configuracion`);
    continue;
  }

  if (tokenRoute) {
    const missingGuard = tokenRoute.guards.find((guard) => !source.includes(guard));
    if (!source.includes(tokenRoute.header) || missingGuard) {
      report.fail.push(`${relativeRoute}: token interno incompleto`);
    } else {
      report.ok.push(`${relativeRoute}: token interno`);
    }
    continue;
  }

  const hasAuthUser = source.includes('getAuthUser(');
  const hasEnsureAdmin = source.includes('ensureAdmin(');
  if (!hasAuthUser || !hasEnsureAdmin) {
    report.fail.push(`${relativeRoute}: falta validacion de admin`);
  } else {
    report.ok.push(`${relativeRoute}: admin validado`);
  }
}

if (report.ok.length) {
  console.log('\nOK');
  report.ok.forEach((item) => console.log(`- ${item}`));
}

if (report.fail.length) {
  console.error('\nFAIL');
  report.fail.forEach((item) => console.error(`- ${item}`));
  console.error(`\nAdmin routes audit failed: ${report.fail.length} route(s).`);
  process.exit(1);
}

console.log('\nAdmin routes audit passed.');
