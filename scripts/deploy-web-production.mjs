import { execSync } from 'node:child_process';

const run = (command) => execSync(command, { stdio: 'pipe', encoding: 'utf8' }).trim();

const fail = (message) => {
  console.error(`\n[deploy:web:prod] ${message}\n`);
  process.exit(1);
};

let branch = '';
try {
  branch = run('git rev-parse --abbrev-ref HEAD');
} catch {
  fail('No se pudo leer la rama actual.');
}

if (branch !== 'main') {
  fail(`La rama actual es "${branch}". Cambia a "main" para desplegar a produccion.`);
}

try {
  const status = run('git status --porcelain');
  if (status) {
    fail('Hay cambios sin commitear. Limpia el working tree antes de desplegar.');
  }
} catch {
  fail('No se pudo validar el estado de git.');
}

console.log('[deploy:web:prod] Ejecutando deploy de apps/web a produccion...');
execSync('npx vercel --cwd apps/web --prod --yes', { stdio: 'inherit' });

console.log('\n[deploy:web:prod] Verificando alias activo...');
execSync('npx vercel inspect https://www.urbanfix.com.ar', { stdio: 'inherit' });

