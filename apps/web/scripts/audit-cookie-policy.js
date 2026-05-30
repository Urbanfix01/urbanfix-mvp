const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'components', 'lib'].map((entry) => path.join(appRoot, entry));
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.next', '.next-codex-dev', '.npm-cache', 'node_modules']);
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

sourceRoots.flatMap(walk).forEach((filePath) => {
  const source = fs.readFileSync(filePath, 'utf8');
  const relativePath = toRelative(filePath);

  if (source.includes('document.cookie')) {
    failures.push(`${relativePath}: no debe usar document.cookie para cookies de app.`);
  }

  if (!source.includes('cookies.set')) return;

  const requiredMarkers = [
    'httpOnly: true',
    "sameSite: 'lax'",
    "secure: process.env.NODE_ENV === 'production'",
    "path: '/'",
  ];

  requiredMarkers.forEach((marker) => {
    if (!source.includes(marker)) {
      failures.push(`${relativePath}: falta ${marker} en politica de cookies.`);
    }
  });
});

if (failures.length > 0) {
  console.error('Politica de cookies incompleta:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Politica de cookies sin bloqueos.');
