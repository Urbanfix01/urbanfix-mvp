const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'components', 'lib'].map((entry) => path.join(appRoot, entry));
const envExamplePath = path.join(appRoot, '.env.example');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.next', '.next-codex-dev', '.npm-cache', 'node_modules']);

const serverOnlyEnv = new Set([
  'SUPABASE_SERVICE_ROLE_KEY',
  'MP_ACCESS_TOKEN',
  'RESEND_API_KEY',
  'NEWSLETTER_FROM_EMAIL',
  'NEWSLETTER_REPLY_TO_EMAIL',
  'NEWSLETTER_UNSUBSCRIBE_SECRET',
  'NOTIFY_WEBHOOK_SECRET',
  'ROADMAP_AUTOSYNC_TOKEN',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_B64',
  'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
  'GOOGLE_PLAY_PACKAGE_NAME',
  'ANDROID_PACKAGE',
  'ALLOW_LEGACY_ACCESS_BACKFILL',
]);

const forbiddenPublicEnv = [
  /^NEXT_PUBLIC_.*SERVICE_ROLE/i,
  /^NEXT_PUBLIC_.*SECRET/i,
  /^NEXT_PUBLIC_MP_ACCESS_TOKEN$/i,
  /^NEXT_PUBLIC_RESEND_API_KEY$/i,
  /^NEXT_PUBLIC_ROADMAP_AUTOSYNC_TOKEN$/i,
  /^NEXT_PUBLIC_GOOGLE_PLAY_SERVICE_ACCOUNT/i,
];

const failures = [];

const walk = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) return [];
    return [fullPath];
  });
};

const toRelative = (filePath) => path.relative(appRoot, filePath).split(path.sep).join('/');

const isClientVisibleFile = (relativePath, source) => {
  if (relativePath.startsWith('app/api/')) return false;
  if (relativePath.startsWith('lib/supabase/')) return false;
  if (relativePath.startsWith('lib/newsletter')) return false;
  if (source.includes("'use client'") || source.includes('"use client"')) return true;
  return relativePath.startsWith('components/');
};

const findProcessEnvNames = (source) => {
  const names = new Set();
  const dotAccess = source.matchAll(/process\.env\.([A-Z0-9_]+)/g);
  for (const match of dotAccess) names.add(match[1]);

  const bracketAccess = source.matchAll(/process\.env\[['"]([A-Z0-9_]+)['"]\]/g);
  for (const match of bracketAccess) names.add(match[1]);

  return Array.from(names);
};

for (const filePath of walk(appRoot)) {
  const relativePath = toRelative(filePath);
  if (!sourceRoots.some((root) => filePath.startsWith(root))) continue;

  const source = fs.readFileSync(filePath, 'utf8');
  const envNames = findProcessEnvNames(source);
  if (!envNames.length) continue;

  if (isClientVisibleFile(relativePath, source)) {
    const leaked = envNames.filter((name) => serverOnlyEnv.has(name));
    leaked.forEach((name) => {
      failures.push(`${relativePath}: usa ${name} en codigo visible para navegador.`);
    });
  }

  envNames
    .filter((name) => forbiddenPublicEnv.some((pattern) => pattern.test(name)))
    .forEach((name) => {
      failures.push(`${relativePath}: declara variable publica sensible ${name}.`);
    });
}

if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  envExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim())
    .filter((name) => forbiddenPublicEnv.some((pattern) => pattern.test(name)))
    .forEach((name) => {
      failures.push(`.env.example: no debe declarar ${name}.`);
    });
}

if (failures.length > 0) {
  console.error('Limites de secretos incompletos:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Limites de secretos sin bloqueos.');
