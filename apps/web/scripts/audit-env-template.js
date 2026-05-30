const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const envExamplePath = path.join(appRoot, '.env.example');

const scanRoots = [
  path.join(appRoot, 'app'),
  path.join(appRoot, 'components'),
  path.join(appRoot, 'lib'),
  path.join(appRoot, 'scripts'),
  path.join(appRoot, 'next.config.js'),
];

const ignoredEnv = new Set(['NODE_ENV', 'NEXT_DIST_DIR']);
const ignoredDirs = new Set(['.next', '.next-codex-dev', '.npm-cache', 'node_modules']);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

const walk = (target) => {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return sourceExtensions.has(path.extname(target)) ? [target] : [];
  if (!stat.isDirectory()) return [];

  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) return [];
    return walk(path.join(target, entry.name));
  });
};

const parseEnvExample = () => {
  if (!fs.existsSync(envExamplePath)) return new Set();
  const source = fs.readFileSync(envExamplePath, 'utf8');
  const keys = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim())
    .filter(Boolean);
  return new Set(keys);
};

const findUsedEnv = () => {
  const files = scanRoots.flatMap(walk);
  const used = new Map();
  const dotPattern = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const bracketPattern = /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g;

  files.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const pattern of [dotPattern, bracketPattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) {
        const key = match[1];
        if (ignoredEnv.has(key)) continue;
        if (!used.has(key)) used.set(key, []);
        used.get(key).push(path.relative(appRoot, filePath).split(path.sep).join('/'));
      }
    }
  });

  return used;
};

const exampleKeys = parseEnvExample();
const usedEnv = findUsedEnv();
const missing = Array.from(usedEnv.keys()).filter((key) => !exampleKeys.has(key)).sort();
const unused = Array.from(exampleKeys).filter((key) => !usedEnv.has(key)).sort();

if (missing.length) {
  console.error('\nFAIL');
  missing.forEach((key) => {
    const files = Array.from(new Set(usedEnv.get(key))).slice(0, 3);
    console.error(`- ${key}: usado en ${files.join(', ')}`);
  });
  console.error(`\nEnv template audit failed: ${missing.length} variable(s) missing from .env.example.`);
  process.exit(1);
}

console.log('\nOK');
console.log('- .env.example cubre las variables usadas por la app');

if (unused.length) {
  console.log('\nINFO');
  unused.forEach((key) => console.log(`- ${key}: documentada para configuracion externa u operativa`));
}

console.log('\nEnv template audit passed.');
