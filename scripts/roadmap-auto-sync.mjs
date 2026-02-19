import { execSync } from 'node:child_process';

const run = (command) =>
  execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const tryRun = (command) => {
  try {
    return run(command);
  } catch {
    return '';
  }
};

const detectArea = (files) => {
  const hasWeb = files.some((file) => file.startsWith('apps/web/'));
  const hasMobile = files.some((file) => file.startsWith('apps/mobile/'));
  const hasBackend = files.some(
    (file) => file.includes('/supabase/migrations/') || file.startsWith('packages/')
  );
  const buckets = [hasWeb, hasMobile, hasBackend].filter(Boolean).length;
  if (buckets > 1) return 'ops';
  if (hasBackend) return 'backend';
  if (hasMobile) return 'mobile';
  if (hasWeb) return 'web';
  return 'ops';
};

const endpoint = (process.env.ROADMAP_AUTOSYNC_URL || '').trim();
const token = (process.env.ROADMAP_AUTOSYNC_TOKEN || '').trim();

if (!endpoint || !token) {
  console.log('[roadmap-auto-sync] Skipped: missing ROADMAP_AUTOSYNC_URL or ROADMAP_AUTOSYNC_TOKEN.');
  process.exit(0);
}

const baseRef = (process.env.ROADMAP_AUTOSYNC_BASE_REF || 'origin/master').trim();
const baseRefRemote = baseRef.startsWith('origin/') ? baseRef.replace('origin/', '') : null;

if (baseRefRemote) {
  tryRun(`git fetch --no-tags --prune --depth=1 origin ${baseRefRemote}`);
}

const branch =
  (process.env.GITHUB_HEAD_REF || '').trim() ||
  (process.env.GITHUB_REF_NAME || '').trim() ||
  tryRun('git rev-parse --abbrev-ref HEAD') ||
  'unknown-branch';

const commit = (process.env.GITHUB_SHA || '').trim() || tryRun('git rev-parse HEAD') || null;
const shortCommit = commit ? commit.slice(0, 12) : 'sin-commit';

let changedRaw = tryRun(`git diff --name-only ${baseRef}...HEAD`);
if (!changedRaw) {
  changedRaw = tryRun('git diff --name-only HEAD~1..HEAD');
}

const files = changedRaw
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean)
  .slice(0, 200);

if (!files.length) {
  console.log('[roadmap-auto-sync] No hay archivos cambiados para sincronizar.');
  process.exit(0);
}

const area = detectArea(files);
const sourceKey = `git:${branch}`;
const today = new Date().toISOString().slice(0, 10);
const title = `[AUTO] Cambios fuera de roadmap · ${branch}`;
const description = [
  `Sincronizacion automatica de cambios detectados en la rama \`${branch}\`.`,
  `Commit: \`${shortCommit}\`.`,
  `Fecha: ${today}.`,
  `Archivos (${files.length}):`,
  ...files.map((file) => `- ${file}`),
]
  .join('\n')
  .slice(0, 6000);

const feedbackBody = `[AUTO] Sync ${today} · ${shortCommit} · ${files.length} archivo(s).`;

const payload = {
  source_key: sourceKey,
  source_branch: branch,
  source_commit: commit,
  source_files: files,
  title,
  description,
  area,
  status: 'in_progress',
  priority: 'medium',
  owner: 'AUTO',
  feedback_body: feedbackBody,
  feedback_sentiment: 'neutral',
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-roadmap-autosync-token': token,
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const text = await response.text();
  console.error('[roadmap-auto-sync] Error:', text || response.statusText);
  process.exit(1);
}

const result = await response.json();
console.log(
  `[roadmap-auto-sync] OK | created=${Boolean(result?.created)} | feedbackCreated=${Boolean(
    result?.feedbackCreated
  )} | source=${sourceKey}`
);
