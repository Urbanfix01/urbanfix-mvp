import fs from 'node:fs';
import path from 'node:path';
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

const MAX_SOURCE_FILES = 200;
const MAX_TEXT_SHORT = 300;
const MAX_TEXT_LONG = 6000;
const ALLOWED_STATUS = new Set(['planned', 'in_progress', 'done', 'blocked']);
const ALLOWED_AREA = new Set(['web', 'mobile', 'backend', 'ops']);
const ALLOWED_PRIORITY = new Set(['high', 'medium', 'low']);
const ALLOWED_SENTIMENT = new Set(['positive', 'neutral', 'negative']);
const ALLOWED_SECTOR = new Set(['interfaz', 'operativo', 'clientes', 'web', 'app', 'funcionalidades']);

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eqIndex = normalized.indexOf('=');
    if (eqIndex === -1) continue;
    const key = normalized.slice(0, eqIndex).trim();
    if (!key) continue;
    let value = normalized.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
};

const loadEnv = () => {
  const candidates = [
    '.env',
    '.env.local',
    'apps/web/.env',
    'apps/web/.env.local',
    '.env.roadmap',
    '.env.roadmap.local',
    'apps/web/.env.roadmap',
    'apps/web/.env.roadmap.local',
  ];
  const merged = {};
  for (const relativePath of candidates) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    Object.assign(merged, parseEnvFile(absolutePath));
  }
  return {
    ...merged,
    ...process.env,
  };
};

const env = loadEnv();
const isDryRun = process.argv.includes('--dry-run');

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return '';
};

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

const maybeWithHttps = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
};

const toOptionalText = (value, max = MAX_TEXT_SHORT) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

const normalizeStatus = (value) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ALLOWED_STATUS.has(normalized)) return 'in_progress';
  return normalized;
};

const normalizeArea = (value) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ALLOWED_AREA.has(normalized)) return null;
  return normalized;
};

const normalizePriority = (value) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ALLOWED_PRIORITY.has(normalized)) return 'medium';
  return normalized;
};

const normalizeSentiment = (value) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ALLOWED_SENTIMENT.has(normalized)) return 'neutral';
  return normalized;
};

const normalizeSector = (value) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ALLOWED_SECTOR.has(normalized)) return null;
  return normalized;
};

const normalizeSourceFiles = (value) => {
  if (!Array.isArray(value)) return [];
  const deduped = new Set();
  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const trimmed = item.trim();
    if (!trimmed) return;
    deduped.add(trimmed.slice(0, 240));
  });
  return Array.from(deduped).slice(0, MAX_SOURCE_FILES);
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

const inferSectorFromContext = (area, branch, title, description, files) => {
  const sourceText = [branch, title || '', description || '', ...files].join(' ').toLowerCase();
  if (sourceText.includes('cliente')) return 'clientes';
  if (
    sourceText.includes('interfaz') ||
    sourceText.includes('visual') ||
    sourceText.includes('ui') ||
    sourceText.includes('header') ||
    sourceText.includes('landing')
  ) {
    return 'interfaz';
  }
  if (area === 'web') return 'web';
  if (area === 'mobile') return 'app';
  if (area === 'ops') return 'operativo';
  return 'funcionalidades';
};

const buildAutoDescription = (branch, shortCommit, files, today) =>
  [
    `Sincronizacion automatica de cambios detectados en la rama \`${branch}\`.`,
    `Commit: \`${shortCommit}\`.`,
    `Fecha: ${today}.`,
    `Archivos (${files.length}):`,
    ...files.map((file) => `- ${file}`),
  ]
    .join('\n')
    .slice(0, MAX_TEXT_LONG);

const parseJsonSafe = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const formatError = (prefix, details) => {
  const asText = typeof details === 'string' ? details : JSON.stringify(details);
  return `${prefix}${asText ? `: ${asText}` : ''}`;
};

const isMissingSectorColumnError = (errorLike) => {
  const text = String(typeof errorLike === 'string' ? errorLike : JSON.stringify(errorLike || {})).toLowerCase();
  return text.includes('sector') && (text.includes('does not exist') || text.includes('42703'));
};

const resolveAutosyncEndpoint = () => {
  const explicit = getEnv('ROADMAP_AUTOSYNC_URL');
  if (explicit) return explicit;
  const base = getEnv(
    'NEXT_PUBLIC_PUBLIC_WEB_URL',
    'PUBLIC_WEB_URL',
    'WEB_PUBLIC_URL',
    'NEXT_PUBLIC_SITE_URL',
    'SITE_URL',
    'VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_URL'
  );
  if (!base) return '';
  try {
    const normalized = maybeWithHttps(base);
    const endpointUrl = new URL('/api/admin/roadmap/auto-sync', normalized);
    return endpointUrl.toString();
  } catch {
    return '';
  }
};

const selectWithSector =
  'id,title,description,status,area,priority,sector,owner,eta_date,source_key,source_branch,source_commit,source_files,created_by,updated_by,created_at,updated_at';
const selectWithoutSector =
  'id,title,description,status,area,priority,owner,eta_date,source_key,source_branch,source_commit,source_files,created_by,updated_by,created_at,updated_at';

const autosyncEndpoint = resolveAutosyncEndpoint();
const autosyncToken = getEnv('ROADMAP_AUTOSYNC_TOKEN');
const supabaseUrlRaw = getEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supabaseUrl = supabaseUrlRaw ? normalizeBaseUrl(supabaseUrlRaw) : '';
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const requestSupabaseRest = async ({
  method = 'GET',
  table,
  query = {},
  body = undefined,
  prefer = undefined,
}) => {
  const requestUrl = new URL(`/rest/v1/${table}`, supabaseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    requestUrl.searchParams.set(key, String(value));
  });

  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(requestUrl, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = parseJsonSafe(text);
  return {
    ok: response.ok,
    status: response.status,
    data: json ?? text ?? null,
  };
};

const findExistingUpdateBySourceKey = async (sourceKey) => {
  let usingSector = true;
  let response = await requestSupabaseRest({
    method: 'GET',
    table: 'roadmap_updates',
    query: {
      select: selectWithSector,
      source_key: `eq.${sourceKey}`,
      limit: 1,
    },
  });
  if (!response.ok && isMissingSectorColumnError(response.data)) {
    usingSector = false;
    response = await requestSupabaseRest({
      method: 'GET',
      table: 'roadmap_updates',
      query: {
        select: selectWithoutSector,
        source_key: `eq.${sourceKey}`,
        limit: 1,
      },
    });
  }
  if (!response.ok) {
    throw new Error(formatError('No se pudo buscar item existente', response.data));
  }
  const list = Array.isArray(response.data) ? response.data : [];
  return {
    row: list[0] || null,
    usingSector,
  };
};

const createUpdateDirect = async ({ patch, usingSector }) => {
  const safePatch = { ...patch };
  if (!usingSector) delete safePatch.sector;

  let response = await requestSupabaseRest({
    method: 'POST',
    table: 'roadmap_updates',
    query: {
      select: usingSector ? selectWithSector : selectWithoutSector,
    },
    body: safePatch,
    prefer: 'return=representation',
  });
  if (!response.ok && usingSector && isMissingSectorColumnError(response.data)) {
    const fallbackPatch = { ...patch };
    delete fallbackPatch.sector;
    response = await requestSupabaseRest({
      method: 'POST',
      table: 'roadmap_updates',
      query: {
        select: selectWithoutSector,
      },
      body: fallbackPatch,
      prefer: 'return=representation',
    });
    usingSector = false;
  }
  if (!response.ok) {
    throw new Error(formatError('No se pudo crear item auto-sync', response.data));
  }
  const list = Array.isArray(response.data) ? response.data : [];
  const created = list[0] || null;
  if (!created) {
    throw new Error('No se obtuvo respuesta al crear el item auto-sync.');
  }
  return { row: created, usingSector };
};

const updateExistingDirect = async ({ id, patch, usingSector }) => {
  let response = await requestSupabaseRest({
    method: 'PATCH',
    table: 'roadmap_updates',
    query: {
      id: `eq.${id}`,
      select: usingSector ? selectWithSector : selectWithoutSector,
    },
    body: patch,
    prefer: 'return=representation',
  });
  if (!response.ok && usingSector && isMissingSectorColumnError(response.data)) {
    const fallbackPatch = { ...patch };
    delete fallbackPatch.sector;
    response = await requestSupabaseRest({
      method: 'PATCH',
      table: 'roadmap_updates',
      query: {
        id: `eq.${id}`,
        select: selectWithoutSector,
      },
      body: fallbackPatch,
      prefer: 'return=representation',
    });
    usingSector = false;
  }
  if (!response.ok) {
    throw new Error(formatError('No se pudo actualizar item auto-sync', response.data));
  }
  const list = Array.isArray(response.data) ? response.data : [];
  const updated = list[0] || null;
  if (!updated) {
    throw new Error('No se obtuvo respuesta al actualizar el item auto-sync.');
  }
  return { row: updated, usingSector };
};

const ensureFeedbackDirect = async ({ roadmapId, feedbackBody, feedbackSentiment }) => {
  const existingResponse = await requestSupabaseRest({
    method: 'GET',
    table: 'roadmap_feedback',
    query: {
      select: 'id',
      roadmap_id: `eq.${roadmapId}`,
      body: `eq.${feedbackBody}`,
      limit: 1,
    },
  });

  if (!existingResponse.ok) {
    throw new Error(formatError('No se pudo consultar feedback existente', existingResponse.data));
  }

  const existing = Array.isArray(existingResponse.data) ? existingResponse.data[0] : null;
  if (existing) return false;

  const insertResponse = await requestSupabaseRest({
    method: 'POST',
    table: 'roadmap_feedback',
    body: {
      roadmap_id: roadmapId,
      body: feedbackBody,
      sentiment: feedbackSentiment,
      created_by: null,
    },
    prefer: 'return=minimal',
  });
  if (!insertResponse.ok) {
    throw new Error(formatError('No se pudo crear feedback auto-sync', insertResponse.data));
  }
  return true;
};

const syncThroughEndpoint = async (payload) => {
  const response = await fetch(autosyncEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-roadmap-autosync-token': autosyncToken,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText || `HTTP ${response.status}`);
  }
  const result = await response.json();
  return {
    created: Boolean(result?.created),
    feedbackCreated: Boolean(result?.feedbackCreated),
    sourceKey: payload.source_key,
  };
};

const syncDirectlyToSupabase = async (payload) => {
  const existingLookup = await findExistingUpdateBySourceKey(payload.source_key);

  let row = null;
  let created = false;
  let usingSector = existingLookup.usingSector;
  const insertPatch = {
    title: payload.title,
    description: payload.description,
    status: payload.status,
    area: payload.area,
    priority: payload.priority,
    sector: payload.sector,
    owner: payload.owner,
    eta_date: payload.eta_date,
    source_key: payload.source_key,
    source_branch: payload.source_branch,
    source_commit: payload.source_commit,
    source_files: payload.source_files,
  };

  if (!existingLookup.row) {
    const createdResult = await createUpdateDirect({ patch: insertPatch, usingSector });
    row = createdResult.row;
    usingSector = createdResult.usingSector;
    created = true;
  } else {
    const patch = {
      description: payload.description,
      source_branch: payload.source_branch,
      source_commit: payload.source_commit,
      source_files: payload.source_files,
      sector: payload.sector,
      updated_by: null,
    };
    if (String(existingLookup.row.title || '').startsWith('[AUTO]')) {
      patch.title = payload.title;
    }
    const updatedResult = await updateExistingDirect({
      id: existingLookup.row.id,
      patch,
      usingSector,
    });
    row = updatedResult.row;
    usingSector = updatedResult.usingSector;
  }

  const feedbackCreated = await ensureFeedbackDirect({
    roadmapId: row.id,
    feedbackBody: payload.feedback_body,
    feedbackSentiment: payload.feedback_sentiment,
  });

  return {
    created,
    feedbackCreated,
    sourceKey: payload.source_key,
    sectorMode: usingSector ? 'with-sector' : 'without-sector',
  };
};

const baseRef = getEnv('ROADMAP_AUTOSYNC_BASE_REF') || 'origin/master';
const baseRefRemote = baseRef.startsWith('origin/') ? baseRef.replace('origin/', '') : null;
if (baseRefRemote) {
  tryRun(`git fetch --no-tags --prune --depth=1 origin ${baseRefRemote}`);
}

const branch =
  getEnv('GITHUB_HEAD_REF') ||
  getEnv('GITHUB_REF_NAME') ||
  tryRun('git rev-parse --abbrev-ref HEAD') ||
  'unknown-branch';
const commit = getEnv('GITHUB_SHA') || tryRun('git rev-parse HEAD') || null;
const shortCommit = commit ? commit.slice(0, 12) : 'sin-commit';
const today = new Date().toISOString().slice(0, 10);

let changedRaw = tryRun(`git diff --name-only ${baseRef}...HEAD`);
if (!changedRaw) {
  changedRaw = tryRun('git diff --name-only HEAD~1..HEAD');
}

const files = normalizeSourceFiles(
  changedRaw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
);

if (!files.length) {
  console.log('[roadmap-auto-sync] No hay archivos cambiados para sincronizar.');
  process.exit(0);
}

const resolvedArea = normalizeArea(detectArea(files)) || 'ops';
const title = toOptionalText(`[AUTO] Cambios fuera de roadmap · ${branch}`, 220);
const description = toOptionalText(buildAutoDescription(branch, shortCommit, files, today), MAX_TEXT_LONG);
const sector = normalizeSector(
  inferSectorFromContext(resolvedArea, branch, title, description, files)
);

const payload = {
  source_key: `git:${branch}`,
  source_branch: branch,
  source_commit: commit,
  source_files: files,
  title: title || `[AUTO] Cambios fuera de roadmap · ${branch}`,
  description: description || buildAutoDescription(branch, shortCommit, files, today),
  area: resolvedArea,
  status: normalizeStatus('in_progress'),
  priority: normalizePriority('medium'),
  sector: sector || 'funcionalidades',
  owner: toOptionalText('AUTO', 140) || 'AUTO',
  eta_date: null,
  feedback_body: `[AUTO] Sync ${today} · ${shortCommit} · ${files.length} archivo(s).`,
  feedback_sentiment: normalizeSentiment('neutral'),
};

const hasEndpointMode = Boolean(autosyncEndpoint && autosyncToken);
const hasSupabaseDirectMode = Boolean(supabaseUrl && supabaseServiceRoleKey);

if (isDryRun) {
  const mode = hasEndpointMode ? 'endpoint' : hasSupabaseDirectMode ? 'supabase-direct' : 'none';
  console.log(`[roadmap-auto-sync] DRY RUN | mode=${mode} | source=${payload.source_key}`);
  console.log(
    JSON.stringify(
      {
        endpointConfigured: hasEndpointMode,
        supabaseDirectConfigured: hasSupabaseDirectMode,
        endpoint: autosyncEndpoint || null,
        branch,
        commit: shortCommit,
        filesCount: files.length,
        area: payload.area,
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (!hasEndpointMode && !hasSupabaseDirectMode) {
  console.log(
    '[roadmap-auto-sync] Skipped: configure endpoint mode (ROADMAP_AUTOSYNC_URL + ROADMAP_AUTOSYNC_TOKEN) or direct mode (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).'
  );
  process.exit(0);
}

let result = null;
let modeUsed = '';

if (hasEndpointMode) {
  try {
    result = await syncThroughEndpoint(payload);
    modeUsed = 'endpoint';
  } catch (error) {
    if (!hasSupabaseDirectMode) {
      console.error('[roadmap-auto-sync] Error:', error?.message || String(error));
      process.exit(1);
    }
    console.warn(
      `[roadmap-auto-sync] Endpoint fallo (${error?.message || String(
        error
      )}). Intentando sync directo a Supabase...`
    );
  }
}

if (!result && hasSupabaseDirectMode) {
  try {
    result = await syncDirectlyToSupabase(payload);
    modeUsed = 'supabase-direct';
  } catch (error) {
    console.error('[roadmap-auto-sync] Error:', error?.message || String(error));
    process.exit(1);
  }
}

console.log(
  `[roadmap-auto-sync] OK | mode=${modeUsed} | created=${Boolean(result?.created)} | feedbackCreated=${Boolean(
    result?.feedbackCreated
  )} | source=${payload.source_key}`
);
