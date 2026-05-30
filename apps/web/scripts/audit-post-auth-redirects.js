const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const postAuthPath = path.join(appRoot, 'lib', 'auth', 'post-auth.ts');
const authHashPath = path.join(appRoot, 'components', 'AuthHashHandler.tsx');
const techniciansPath = path.join(appRoot, 'app', 'tecnicos', 'page.tsx');

const failures = [];

const read = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '');

const postAuth = read(postAuthPath);
const authHash = read(authHashPath);
const technicians = read(techniciansPath);

[
  'POST_AUTH_ALLOWED_PATH_PREFIXES',
  "'/admin'",
  'decodeURIComponent',
  'normalized.startsWith',
  'decoded.startsWith',
  'hasAllowedPostAuthPrefix',
  "segment === '..'",
  'u0000-\\u001F\\u007F',
].forEach((marker) => {
  if (!postAuth.includes(marker)) {
    failures.push(`post-auth.ts falta ${marker}`);
  }
});

if (!authHash.includes('sanitizeNextPath')) {
  failures.push('AuthHashHandler debe sanitizar redirects post-auth.');
}

if (!authHash.includes('sanitizeNextPath(window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY))')) {
  failures.push('AuthHashHandler debe sanitizar redirects guardados en sessionStorage.');
}

if (!technicians.includes('const nextPath = sanitizeNextPath(params.get(\'next\'))')) {
  failures.push('tecnicos/page.tsx debe sanitizar el parametro next antes de usarlo.');
}

if (technicians.includes('window.location.replace(params.get(\'next\')')) {
  failures.push('tecnicos/page.tsx no debe redirigir directamente a params.get(next).');
}

if (failures.length > 0) {
  console.error('Redirects post-auth incompletos:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Redirects post-auth sin bloqueos.');
