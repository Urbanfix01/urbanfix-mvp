const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'components', 'lib'].map((entry) => path.join(appRoot, entry));
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.next', '.next-codex-dev', '.npm-cache', 'node_modules']);

const authCalls = [
  'supabase.auth.getSession',
  'supabase.auth.onAuthStateChange',
  'supabase.auth.signInWithOAuth',
  'supabase.auth.signInWithPassword',
  'supabase.auth.signUp',
  'supabase.auth.resetPasswordForEmail',
  'supabase.auth.getUser',
  'supabase.auth.signOut',
];

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

const failures = [];
const sourceFiles = sourceRoots.flatMap(walk);

sourceFiles.forEach((filePath) => {
  const relativePath = path.relative(appRoot, filePath).split(path.sep).join('/');
  if (relativePath.startsWith('app/api/') || relativePath.startsWith('lib/auth/')) return;

  const source = fs.readFileSync(filePath, 'utf8');
  const usesAuth = authCalls.some((call) => source.includes(call));
  if (!usesAuth) return;

  if (!source.includes('hasSupabaseConfig')) {
    failures.push(`${relativePath} usa auth de Supabase sin guard de configuracion.`);
  }
});

const clientPath = path.join(appRoot, 'lib', 'supabase', 'supabase.ts');
const clientSource = fs.readFileSync(clientPath, 'utf8');
if (!clientSource.includes('hasSupabaseConfig') || !clientSource.includes('disabledLocalUrl')) {
  failures.push('lib/supabase/supabase.ts debe fallar cerrado cuando faltan credenciales publicas.');
}

if (failures.length > 0) {
  console.error('Guardas de Supabase incompletas:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Guardas de Supabase cliente sin bloqueos.');
