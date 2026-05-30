const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const apiDir = path.join(appRoot, 'app', 'api');

const failures = [];

const walk = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name === 'route.ts' ? [fullPath] : [];
  });
};

const toRelative = (filePath) => path.relative(appRoot, filePath).split(path.sep).join('/');

for (const filePath of walk(apiDir)) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (/\brequest\.json\s*\(/.test(source)) {
    failures.push(`${toRelative(filePath)}: usa request.json() sin limite; usar readLimitedJsonBody.`);
  }
}

if (failures.length > 0) {
  console.error('Lectura JSON sin limite detectada:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Limites de body JSON sin bloqueos.');
