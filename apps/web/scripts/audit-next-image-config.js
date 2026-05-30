const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const nextConfigPath = path.join(appRoot, 'next.config.js');
const sourceRoots = ['app', 'components', 'lib'].map((entry) => path.join(appRoot, entry));
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.next', '.next-codex-dev', '.npm-cache', 'node_modules']);

const failures = [];

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

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

const configSource = readFile(nextConfigPath);
const wildcardPatterns = [
  /hostname\s*:\s*['"]\*\*['"]/,
  /hostname\s*:\s*['"]\*['"]/,
  /domains\s*:\s*\[\s*['"]\*\*?['"]\s*\]/,
];

if (wildcardPatterns.some((pattern) => pattern.test(configSource))) {
  failures.push('next.config.js permite imagenes remotas con wildcard.');
}

const sourceFiles = sourceRoots.flatMap(walk);
const nextImageFiles = sourceFiles.filter((filePath) => readFile(filePath).includes('next/image'));
const remotePatternsConfigured = /remotePatterns\s*:/.test(configSource) || /domains\s*:/.test(configSource);

if (nextImageFiles.length > 0 && remotePatternsConfigured) {
  const configAllowsOnlyExplicitHosts = !wildcardPatterns.some((pattern) => pattern.test(configSource));
  if (!configAllowsOnlyExplicitHosts) {
    failures.push('next/image debe usar solo hosts remotos explicitos.');
  }
}

if (failures.length > 0) {
  console.error('Configuracion de imagenes remotas insegura:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Configuracion de imagenes remotas sin wildcards.');
