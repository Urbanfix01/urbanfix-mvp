import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const workdir = path.resolve(rootDir, process.env.SUPABASE_WORKDIR || 'apps/web/lib');
const migrationsDir = path.join(workdir, 'supabase', 'migrations');

const dbUrl = (process.env.SUPABASE_DB_URL || '').trim();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const projectRef = (process.env.SUPABASE_PROJECT_REF || '').trim();
const dbPassword = (process.env.SUPABASE_DB_PASSWORD || '').trim();

const includeAll = process.argv.includes('--include-all');
const dryRun = process.argv.includes('--dry-run');

const fail = (message) => {
  console.error(`[migrations:push] ${message}`);
  process.exit(1);
};

const runSupabase = (args, extraEnv = {}) => {
  const result = spawnSync('npx', ['--yes', 'supabase', ...args], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    fail(`Fallo comando: supabase ${args.join(' ')}`);
  }
};

if (!fs.existsSync(workdir)) {
  fail(`No existe workdir: ${workdir}`);
}

if (!fs.existsSync(migrationsDir)) {
  fail(`No existe carpeta de migraciones: ${migrationsDir}`);
}

const commonPushArgs = ['db', 'push', '--workdir', workdir, '--yes'];

if (includeAll) {
  commonPushArgs.push('--include-all');
}

if (dryRun) {
  commonPushArgs.push('--dry-run');
}

if (dbUrl) {
  console.log(`[migrations:push] Usando SUPABASE_DB_URL en ${workdir}`);
  runSupabase([...commonPushArgs, '--db-url', dbUrl]);
  process.exit(0);
}

if (!accessToken || !projectRef || !dbPassword) {
  fail(
    [
      'Faltan credenciales.',
      'Opciones validas:',
      '1) SUPABASE_DB_URL',
      '2) SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD',
    ].join('\n')
  );
}

console.log(`[migrations:push] Linkeando proyecto ${projectRef} en ${workdir}`);
runSupabase(
  ['link', '--workdir', workdir, '--project-ref', projectRef, '--password', dbPassword],
  { SUPABASE_ACCESS_TOKEN: accessToken }
);

console.log('[migrations:push] Ejecutando db push sobre proyecto linkeado');
runSupabase(
  [...commonPushArgs, '--linked', '--password', dbPassword],
  { SUPABASE_ACCESS_TOKEN: accessToken }
);
