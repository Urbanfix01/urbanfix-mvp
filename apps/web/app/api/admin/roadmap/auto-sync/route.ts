import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const autosyncToken = process.env.ROADMAP_AUTOSYNC_TOKEN;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const ROADMAP_STATUS = new Set(['planned', 'in_progress', 'done', 'blocked']);
const ROADMAP_AREA = new Set(['web', 'mobile', 'backend', 'ops']);
const ROADMAP_PRIORITY = new Set(['high', 'medium', 'low']);
const ROADMAP_SENTIMENT = new Set(['positive', 'neutral', 'negative']);

type RoadmapUpdateRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  area: string;
  priority: string;
  owner?: string | null;
  eta_date?: string | null;
  source_key?: string | null;
  source_branch?: string | null;
  source_commit?: string | null;
  source_files?: string[] | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

const toOptionalText = (value: unknown, maxLength = 300) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const normalizeStatus = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_STATUS.has(normalized)) return null;
  return normalized;
};

const normalizeArea = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_AREA.has(normalized)) return null;
  return normalized;
};

const normalizePriority = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_PRIORITY.has(normalized)) return null;
  return normalized;
};

const normalizeSentiment = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_SENTIMENT.has(normalized)) return 'neutral';
  return normalized;
};

const normalizeEtaDate = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return trimmed;
};

const normalizeSourceFiles = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  const deduped = new Set<string>();
  value.forEach((item) => {
    if (typeof item !== 'string') return;
    const trimmed = item.trim();
    if (!trimmed) return;
    deduped.add(trimmed.slice(0, 240));
  });
  return Array.from(deduped).slice(0, 200);
};

const inferAreaFromFiles = (files: string[]) => {
  if (!files.length) return 'ops';
  const hasWeb = files.some((file) => file.startsWith('apps/web/'));
  const hasMobile = files.some((file) => file.startsWith('apps/mobile/'));
  const hasBackend = files.some(
    (file) => file.includes('/supabase/migrations/') || file.startsWith('packages/')
  );

  const matchedAreas = [hasWeb, hasMobile, hasBackend].filter(Boolean).length;
  if (matchedAreas > 1) return 'ops';
  if (hasBackend) return 'backend';
  if (hasMobile) return 'mobile';
  if (hasWeb) return 'web';
  return 'ops';
};

const buildAutoDescription = (branch: string, commit: string | null, files: string[]) => {
  const shortCommit = commit ? commit.slice(0, 12) : null;
  const lines = [
    `Sincronizacion automatica detectada para la rama \`${branch}\`.`,
    shortCommit ? `Commit: \`${shortCommit}\`.` : null,
    `Archivos tocados: ${files.length}.`,
  ].filter(Boolean) as string[];

  const preview = files.slice(0, 30).map((file) => `- ${file}`);
  if (preview.length) {
    lines.push('', 'Resumen de archivos:', ...preview);
  }
  if (files.length > preview.length) {
    lines.push(`- ... +${files.length - preview.length} archivo(s)`);
  }
  return lines.join('\n').slice(0, 6000);
};

const buildAutoFeedback = (branch: string, commit: string | null, files: string[]) => {
  const shortCommit = commit ? commit.slice(0, 12) : 'sin-commit';
  return `[AUTO] Sync rama ${branch} commit ${shortCommit} (${files.length} archivo(s)).`;
};

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }
  if (!autosyncToken) {
    return NextResponse.json({ error: 'Missing ROADMAP_AUTOSYNC_TOKEN' }, { status: 500 });
  }

  const incomingToken = (request.headers.get('x-roadmap-autosync-token') || '').trim();
  if (!incomingToken || incomingToken !== autosyncToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sourceKey = toOptionalText(body?.source_key, 180);
  if (!sourceKey) {
    return NextResponse.json({ error: 'source_key es obligatorio.' }, { status: 400 });
  }

  const sourceBranch = toOptionalText(body?.source_branch, 140) || sourceKey;
  const sourceCommit = toOptionalText(body?.source_commit, 80);
  const sourceFiles = normalizeSourceFiles(body?.source_files);
  const area = normalizeArea(body?.area) || inferAreaFromFiles(sourceFiles);
  const status = normalizeStatus(body?.status) || 'in_progress';
  const priority = normalizePriority(body?.priority) || 'medium';
  const owner = toOptionalText(body?.owner, 140) || 'AUTO';
  const etaDate = normalizeEtaDate(body?.eta_date);
  if (etaDate === undefined) {
    return NextResponse.json({ error: 'eta_date invalida (usar YYYY-MM-DD).' }, { status: 400 });
  }

  const title = toOptionalText(body?.title, 220) || `[AUTO] Cambios fuera de roadmap · ${sourceBranch}`;
  const description =
    toOptionalText(body?.description, 6000) || buildAutoDescription(sourceBranch, sourceCommit, sourceFiles);
  const feedbackBody =
    toOptionalText(body?.feedback_body, 6000) || buildAutoFeedback(sourceBranch, sourceCommit, sourceFiles);
  const feedbackSentiment = normalizeSentiment(body?.feedback_sentiment);

  const selectFields =
    'id,title,description,status,area,priority,owner,eta_date,source_key,source_branch,source_commit,source_files,created_by,updated_by,created_at,updated_at';

  const { data: existing, error: existingError } = await supabase
    .from('roadmap_updates')
    .select(selectFields)
    .eq('source_key', sourceKey)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  let updateRow: RoadmapUpdateRow | null = null;
  let created = false;

  if (!existing) {
    const { data, error } = await supabase
      .from('roadmap_updates')
      .insert({
        title,
        description,
        status,
        area,
        priority,
        owner,
        eta_date: etaDate,
        source_key: sourceKey,
        source_branch: sourceBranch,
        source_commit: sourceCommit,
        source_files: sourceFiles,
      })
      .select(selectFields)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'No se pudo crear el item auto-sync.' }, { status: 500 });
    }

    updateRow = data as RoadmapUpdateRow;
    created = true;
  } else {
    const patch: Record<string, any> = {
      description,
      source_branch: sourceBranch,
      source_commit: sourceCommit,
      source_files: sourceFiles,
      updated_by: null,
    };

    if ((existing.title || '').startsWith('[AUTO]')) {
      patch.title = title;
    }

    const { data, error } = await supabase
      .from('roadmap_updates')
      .update(patch)
      .eq('id', existing.id)
      .select(selectFields)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'No se pudo actualizar el item auto-sync.' },
        { status: 500 }
      );
    }

    updateRow = data as RoadmapUpdateRow;
  }

  const { data: repeatedFeedback, error: repeatedFeedbackError } = await supabase
    .from('roadmap_feedback')
    .select('id')
    .eq('roadmap_id', updateRow.id)
    .eq('body', feedbackBody)
    .maybeSingle();

  if (repeatedFeedbackError) {
    return NextResponse.json({ error: repeatedFeedbackError.message }, { status: 500 });
  }

  let feedbackCreated = false;
  if (!repeatedFeedback) {
    const { error: feedbackInsertError } = await supabase.from('roadmap_feedback').insert({
      roadmap_id: updateRow.id,
      body: feedbackBody,
      sentiment: feedbackSentiment,
      created_by: null,
    });

    if (feedbackInsertError) {
      return NextResponse.json({ error: feedbackInsertError.message }, { status: 500 });
    }
    feedbackCreated = true;
  }

  return NextResponse.json({
    ok: true,
    created,
    feedbackCreated,
    update: {
      id: updateRow.id,
      title: updateRow.title,
      status: updateRow.status,
      area: updateRow.area,
      priority: updateRow.priority,
      source_key: updateRow.source_key,
      source_branch: updateRow.source_branch,
      source_commit: updateRow.source_commit,
    },
  });
}
