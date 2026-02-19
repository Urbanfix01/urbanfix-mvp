import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const ROADMAP_SENTIMENT = new Set(['positive', 'neutral', 'negative']);

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
  const { data, error } = await supabase.from('beta_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error || !data) return false;
  return true;
};

const toText = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeSentiment = (value: unknown) => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (!ROADMAP_SENTIMENT.has(normalized)) return 'neutral';
  return normalized;
};

const resolveProfileLabel = (profile?: { business_name?: string | null; full_name?: string | null; email?: string | null }) =>
  profile?.business_name || profile?.full_name || profile?.email || 'Sin usuario';

const getLabelsByUserId = async (userIds: string[]) => {
  if (!supabase || !userIds.length) return {} as Record<string, string>;
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return {} as Record<string, string>;
  const { data, error } = await supabase.from('profiles').select('id,business_name,full_name,email').in('id', uniqueIds);
  if (error) return {} as Record<string, string>;
  return (data || []).reduce((acc: Record<string, string>, row: any) => {
    acc[row.id] = resolveProfileLabel(row);
    return acc;
  }, {});
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const roadmapId = (resolvedParams?.id || '').toString().trim();
  if (!roadmapId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('roadmap_feedback')
    .select('id,roadmap_id,body,sentiment,created_by,created_at')
    .eq('roadmap_id', roadmapId)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  const labels = await getLabelsByUserId(rows.map((row) => row.created_by || '').filter(Boolean));
  const feedback = rows.map((row) => ({
    id: row.id,
    roadmap_id: row.roadmap_id,
    body: row.body,
    sentiment: normalizeSentiment(row.sentiment),
    created_by: row.created_by || null,
    created_by_label: row.created_by ? labels[row.created_by] || row.created_by : 'Sistema',
    created_at: row.created_at,
  }));

  return NextResponse.json({ feedback });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const resolvedParams = await params;
  const roadmapId = (resolvedParams?.id || '').toString().trim();
  if (!roadmapId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const message = toText(body?.body);
  if (message.length < 2) {
    return NextResponse.json({ error: 'Feedback demasiado corto.' }, { status: 400 });
  }

  const sentiment = normalizeSentiment(body?.sentiment);

  const { data, error } = await supabase
    .from('roadmap_feedback')
    .insert({
      roadmap_id: roadmapId,
      body: message,
      sentiment,
      created_by: user.id,
    })
    .select('id,roadmap_id,body,sentiment,created_by,created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'No se pudo crear el feedback.' }, { status: 500 });
  }

  const labels = await getLabelsByUserId([user.id]);
  return NextResponse.json({
    feedback: {
      ...data,
      created_by_label: labels[user.id] || user.id,
      sentiment: normalizeSentiment(data.sentiment),
    },
  });
}
