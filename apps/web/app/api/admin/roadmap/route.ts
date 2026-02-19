import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const getAuthUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const ensureAdmin = async (userId: string) => {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('beta_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
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

const normalizeSentiment = (value: unknown) => {
  const normalized = String(value || '').toLowerCase().trim();
  if (!ROADMAP_SENTIMENT.has(normalized)) return 'neutral';
  return normalized;
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
  feedback: ReturnType<typeof mapFeedback>[]
) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  status: normalizeStatus(item.status) || 'planned',
  area: normalizeArea(item.area) || 'web',
  priority: normalizePriority(item.priority) || 'medium',
  owner: item.owner || '',
  eta_date: item.eta_date || null,
  created_by: item.created_by || null,
  created_by_label: item.created_by ? labels[item.created_by] || item.created_by : 'Sistema',
  updated_by: item.updated_by || null,
  updated_by_label: item.updated_by ? labels[item.updated_by] || item.updated_by : null,
  created_at: item.created_at,
  updated_at: item.updated_at,
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

  const [updatesRes, feedbackRes] = await Promise.all([
    supabase
      .from('roadmap_updates')
      .select('id,title,description,status,area,priority,owner,eta_date,created_by,updated_by,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(400),
    supabase
      .from('roadmap_feedback')
      .select('id,roadmap_id,body,sentiment,created_by,created_at')
      .order('created_at', { ascending: true })
      .limit(3000),
  ]);

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

  const payload = updates.map((item) => mapUpdate(item, labels, feedbackByRoadmap.get(item.id) || []));
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

  const payload = {
    title,
    description: toOptionalText(body?.description),
    status,
    area,
    priority,
    owner: toOptionalText(body?.owner),
    eta_date: toOptionalText(body?.eta_date),
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from('roadmap_updates')
    .insert(payload)
    .select('id,title,description,status,area,priority,owner,eta_date,created_by,updated_by,created_at,updated_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const labels = await getLabelsByUserId([user.id]);
  const mapped = mapUpdate(data as RoadmapUpdateRow, labels, []);
  return NextResponse.json({ update: mapped });
}
