import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return '';
  return (args[index + 1] || '').trim();
};

const expectedBranch = (process.env.DEPLOY_EXPECTED_BRANCH || 'master').trim();
const expectedRemoteRef = (process.env.DEPLOY_EXPECTED_REMOTE_REF || 'origin/master').trim();
const expectedProject = (process.env.VERCEL_EXPECTED_PROJECT || 'urbanfix-web').trim();
const expectedScope = (process.env.VERCEL_EXPECTED_SCOPE || 'urbanfix01s-projects').trim();
const expectedCommit = getArgValue('--expected-commit') || (process.env.DEPLOY_EXPECTED_COMMIT || '').trim();
const skipFetch = hasFlag('--skip-fetch');
const skipVercelLink = hasFlag('--skip-vercel-link');

const run = (command) =>
  execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const fail = (message) => {
  console.error(`[deploy:precheck] ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`[deploy:precheck] ${message}`);
};

const shortSha = (sha) => (sha || '').slice(0, 7);

const ensureCleanWorkingTree = () => {
  const status = run('git status --porcelain');
  if (status) {
    fail('Working tree con cambios. Commit/stash antes de deploy.');
  }
};

const ensureBranch = () => {
  const branch = run('git rev-parse --abbrev-ref HEAD');
  if (branch !== expectedBranch) {
    fail(`Rama invalida: ${branch}. Debe ser ${expectedBranch}.`);
  }
};

const ensureRemoteSync = () => {
  if (!skipFetch) {
    info('Actualizando refs remotas...');
    execSync('git fetch origin', { stdio: 'inherit' });
  }

  const localHead = run('git rev-parse HEAD');
  const remoteHead = run(`git rev-parse ${expectedRemoteRef}`);

  if (localHead !== remoteHead) {
    fail(
      [
        `HEAD local (${shortSha(localHead)}) no coincide con ${expectedRemoteRef} (${shortSha(remoteHead)}).`,
        'Ejecuta: git pull --ff-only origin master',
      ].join(' ')
    );
  }

  if (expectedCommit) {
    const remoteShort = shortSha(remoteHead);
    const normalizedExpected = expectedCommit.toLowerCase();
    if (!remoteShort.startsWith(normalizedExpected)) {
      fail(`Commit esperado ${expectedCommit} no coincide con remoto actual ${remoteShort}.`);
    }
  }
};

const runVercelLink = () => {
  if (skipVercelLink) {
    info('Saltando verificacion de link Vercel (--skip-vercel-link).');
    return;
  }

  info(`Linkeando Vercel a ${expectedProject} (${expectedScope})...`);
  const linkResult = spawnSync(
    'npx',
    ['vercel', 'link', '--project', expectedProject, '--scope', expectedScope, '--yes'],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    }
  );

  if (linkResult.status !== 0) {
    fail('No se pudo linkear Vercel al proyecto esperado.');
  }

  const projectJsonPath = path.resolve(process.cwd(), '.vercel', 'project.json');
  if (!fs.existsSync(projectJsonPath)) {
    fail('No existe .vercel/project.json luego del link. Verifica login de Vercel.');
  }

  const linked = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
  if (!linked.projectId || !linked.orgId) {
    fail('Link Vercel incompleto: faltan projectId u orgId en .vercel/project.json.');
  }

  if (process.env.VERCEL_EXPECTED_PROJECT_ID && linked.projectId !== process.env.VERCEL_EXPECTED_PROJECT_ID) {
    fail(
      `projectId linkeado (${linked.projectId}) distinto a VERCEL_EXPECTED_PROJECT_ID (${process.env.VERCEL_EXPECTED_PROJECT_ID}).`
    );
  }

  if (process.env.VERCEL_EXPECTED_ORG_ID && linked.orgId !== process.env.VERCEL_EXPECTED_ORG_ID) {
    fail(`orgId linkeado (${linked.orgId}) distinto a VERCEL_EXPECTED_ORG_ID (${process.env.VERCEL_EXPECTED_ORG_ID}).`);
  }
};

ensureCleanWorkingTree();
ensureBranch();
ensureRemoteSync();
runVercelLink();
info('OK: pre-deploy check aprobado.');
