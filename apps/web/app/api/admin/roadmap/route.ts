import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

const ROADMAP_UPDATES_SELECT_WITH_SECTOR =
  'id,title,description,status,area,priority,sector,owner,eta_date,source_key,source_branch,source_commit,source_files,created_by,updated_by,created_at,updated_at';
const ROADMAP_UPDATES_SELECT_WITHOUT_SECTOR =
  'id,title,description,status,area,priority,owner,eta_date,source_key,source_branch,source_commit,source_files,created_by,updated_by,created_at,updated_at';

const ROADMAP_STATUS = new Set(['planned', 'in_progress', 'done', 'blocked']);
const ROADMAP_AREA = new Set(['web', 'mobile', 'backend', 'ops']);
const ROADMAP_PRIORITY = new Set(['high', 'medium', 'low']);
const ROADMAP_SECTOR = new Set(['interfaz', 'operativo', 'clientes', 'web', 'app', 'funcionalidades']);
const ROADMAP_SENTIMENT = new Set(['positive', 'neutral', 'negative']);

type RoadmapUpdateRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  area: string;
  priority: string;
  sector?: string | null;
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

type RoadmapFeedbackRow = {
  id: string;
  roadmap_id: string;
  body: string;
  sentiment?: string | null;
  created_by?: string | null;
  created_at: string;
};

const toOptionalText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const resolveProfileLabel = (profile?: { business_name?: string | null; full_name?: string | null; email?: string | null }) =>
  profile?.business_name || profile?.full_name || profile?.email || 'Sin usuario';

const getLabelsByUserId = async (userIds: string[]) => {
  if (!supabase || !userIds.length) return {} as Record<string, string>;
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return {} as Record<string, string>;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, business_name, full_name, email')
    .in('id', uniqueIds);
  if (error) {
    return {} as Record<string, string>;
  }
  return (data || []).reduce((acc: Record<string, string>, row: any) => {
    acc[row.id] = resolveProfileLabel(row);
    return acc;
  }, {});
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

const normalizeSector = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_SECTOR.has(normalized)) return null;
  return normalized;
};

const inferSectorFromArea = (area: string) => {
  if (area === 'web') return 'web';
  if (area === 'mobile') return 'app';
  if (area === 'ops') return 'operativo';
  return 'funcionalidades';
};

const normalizeSentiment = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_SENTIMENT.has(normalized)) return 'neutral';
  return normalized;
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

const isMissingRoadmapSectorColumnError = (error: { code?: string | null; message?: string | null } | null) => {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  const isMissingColumn = code === '42703' || message.includes('does not exist');
  return isMissingColumn && message.includes('sector');
};

const toTimestampMs = (value?: string | null) => {
  if (!value) return Number.NaN;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const isAutoSyncFeedback = (item: RoadmapFeedbackRow) => {
  const body = String(item.body || '').trim().toLowerCase();
  return body.startsWith('[auto]') && body.includes('sync');
};

const resolveCurrentRoadmapId = (updates: RoadmapUpdateRow[], feedback: RoadmapFeedbackRow[]) => {
  let currentRoadmapId: string | null = null;
  let currentTimestamp = Number.NEGATIVE_INFINITY;

  feedback.forEach((item) => {
    if (!isAutoSyncFeedback(item)) return;
    const timestamp = toTimestampMs(item.created_at);
    if (!Number.isFinite(timestamp)) return;
    if (timestamp > currentTimestamp) {
      currentTimestamp = timestamp;
      currentRoadmapId = item.roadmap_id;
    }
  });

  if (currentRoadmapId) return currentRoadmapId;

  updates.forEach((item) => {
    const hasSourceMetadata = Boolean(
      toOptionalText(item.source_key) || toOptionalText(item.source_branch) || toOptionalText(item.source_commit)
    );
    if (!hasSourceMetadata) return;
    const timestamp = toTimestampMs(item.updated_at) || toTimestampMs(item.created_at) || Number.NEGATIVE_INFINITY;
    if (timestamp > currentTimestamp) {
      currentTimestamp = timestamp;
      currentRoadmapId = item.id;
    }
  });

  return currentRoadmapId;
};

const mapFeedback = (item: RoadmapFeedbackRow, labels: Record<string, string>) => ({
  id: item.id,
  roadmap_id: item.roadmap_id,
  body: item.body,
  sentiment: normalizeSentiment(item.sentiment),
  created_by: item.created_by || null,
  created_by_label: item.created_by ? labels[item.created_by] || item.created_by : 'Sistema',
  created_at: item.created_at,
});

const mapUpdate = (
  item: RoadmapUpdateRow,
  labels: Record<string, string>,
  feedback: ReturnType<typeof mapFeedback>[],
  currentRoadmapId: string | null
) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  status: normalizeStatus(item.status) || 'planned',
  area: normalizeArea(item.area) || 'web',
  priority: normalizePriority(item.priority) || 'medium',
  sector: normalizeSector(item.sector) || inferSectorFromArea(normalizeArea(item.area) || 'web'),
  owner: item.owner || '',
  eta_date: item.eta_date || null,
  source_key: item.source_key || null,
  source_branch: item.source_branch || null,
  source_commit: item.source_commit || null,
  source_files: Array.isArray(item.source_files) ? item.source_files : [],
  created_by: item.created_by || null,
  created_by_label: item.created_by ? labels[item.created_by] || item.created_by : 'Sistema',
  updated_by: item.updated_by || null,
  updated_by_label: item.updated_by ? labels[item.updated_by] || item.updated_by : null,
  created_at: item.created_at,
  updated_at: item.updated_at,
  is_current: currentRoadmapId ? item.id === currentRoadmapId : false,
  feedback,
});

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updatesPromise = (async () => {
    let result: any = await supabase
      .from('roadmap_updates')
      .select(ROADMAP_UPDATES_SELECT_WITH_SECTOR)
      .order('created_at', { ascending: false })
      .limit(400);
    if (isMissingRoadmapSectorColumnError(result.error || null)) {
      result = await supabase
        .from('roadmap_updates')
        .select(ROADMAP_UPDATES_SELECT_WITHOUT_SECTOR)
        .order('created_at', { ascending: false })
        .limit(400);
    }
    return result;
  })();

  const feedbackPromise = supabase
    .from('roadmap_feedback')
    .select('id,roadmap_id,body,sentiment,created_by,created_at')
    .order('created_at', { ascending: true })
    .limit(3000);

  const [updatesRes, feedbackRes] = await Promise.all([updatesPromise, feedbackPromise]);

  if (updatesRes.error || feedbackRes.error) {
    return NextResponse.json(
      { error: updatesRes.error?.message || feedbackRes.error?.message || 'Roadmap query failed' },
      { status: 500 }
    );
  }

  const updates = (updatesRes.data || []) as RoadmapUpdateRow[];
  const feedback = (feedbackRes.data || []) as RoadmapFeedbackRow[];

  const userIds = new Set<string>();
  updates.forEach((item) => {
    if (item.created_by) userIds.add(item.created_by);
    if (item.updated_by) userIds.add(item.updated_by);
  });
  feedback.forEach((item) => {
    if (item.created_by) userIds.add(item.created_by);
  });

  const labels = await getLabelsByUserId(Array.from(userIds));

  const feedbackByRoadmap = new Map<string, ReturnType<typeof mapFeedback>[]>();
  feedback.forEach((item) => {
    const mapped = mapFeedback(item, labels);
    const list = feedbackByRoadmap.get(item.roadmap_id) || [];
    list.push(mapped);
    feedbackByRoadmap.set(item.roadmap_id, list);
  });

  const currentRoadmapId = resolveCurrentRoadmapId(updates, feedback);
  const payload = updates.map((item) => mapUpdate(item, labels, feedbackByRoadmap.get(item.id) || [], currentRoadmapId));
  return NextResponse.json({ updates: payload });
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const title = toOptionalText(body?.title);
  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'El título es obligatorio (mínimo 3 caracteres).' }, { status: 400 });
  }

  const status = normalizeStatus(body?.status) || 'planned';
  const area = normalizeArea(body?.area) || 'web';
  const priority = normalizePriority(body?.priority) || 'medium';
  const sector = normalizeSector(body?.sector) || inferSectorFromArea(area);
  const feedbackBody = toOptionalText(body?.feedback_body);
  if (!feedbackBody || feedbackBody.length < 2) {
    return NextResponse.json(
      { error: 'Cada tarea de roadmap debe crearse con feedback inicial (mínimo 2 caracteres).' },
      { status: 400 }
    );
  }

  const feedbackSentiment = normalizeSentiment(body?.feedback_sentiment);
  const sourceFiles = normalizeSourceFiles(body?.source_files);

  const payloadBase = {
    title,
    description: toOptionalText(body?.description),
    status,
    area,
    priority,
    owner: toOptionalText(body?.owner),
    eta_date: toOptionalText(body?.eta_date),
    source_key: toOptionalText(body?.source_key),
    source_branch: toOptionalText(body?.source_branch),
    source_commit: toOptionalText(body?.source_commit),
    source_files: sourceFiles,
    created_by: user.id,
    updated_by: user.id,
  };

  let insertResult: any = await supabase
    .from('roadmap_updates')
    .insert({ ...payloadBase, sector })
    .select(ROADMAP_UPDATES_SELECT_WITH_SECTOR)
    .maybeSingle();

  if (isMissingRoadmapSectorColumnError(insertResult.error || null)) {
    insertResult = await supabase
      .from('roadmap_updates')
      .insert(payloadBase)
      .select(ROADMAP_UPDATES_SELECT_WITHOUT_SECTOR)
      .maybeSingle();
  }

  const { data, error } = insertResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const createdUpdate = data as RoadmapUpdateRow;
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('roadmap_feedback')
    .insert({
      roadmap_id: createdUpdate.id,
      body: feedbackBody,
      sentiment: feedbackSentiment,
      created_by: user.id,
    })
    .select('id,roadmap_id,body,sentiment,created_by,created_at')
    .maybeSingle();

  if (feedbackError || !feedbackData) {
    await supabase.from('roadmap_updates').delete().eq('id', createdUpdate.id);
    return NextResponse.json(
      { error: feedbackError?.message || 'No se pudo guardar el feedback inicial.' },
      { status: 500 }
    );
  }

  const labels = await getLabelsByUserId([user.id]);
  const mappedFeedback = mapFeedback(feedbackData as RoadmapFeedbackRow, labels);
  const mapped = mapUpdate(createdUpdate, labels, [mappedFeedback], null);
  return NextResponse.json({ update: mapped });
}
