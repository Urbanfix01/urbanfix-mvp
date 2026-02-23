import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const DEFAULT_DIAGRAM_KEY = 'app_web_operativo';

type FlowNodePosition = {
  id: string;
  x: number;
  y: number;
};

type FlowDiagramStateRow = {
  diagram_key: string;
  nodes: unknown;
  note?: string | null;
  updated_by?: string | null;
  updated_at: string;
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

const toOptionalText = (value: unknown, maxLength = 600) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const normalizeDiagramKey = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return DEFAULT_DIAGRAM_KEY;
  if (!/^[a-z0-9_-]{3,80}$/.test(normalized)) return null;
  return normalized;
};

const normalizeNodes = (value: unknown): FlowNodePosition[] | null => {
  if (!Array.isArray(value)) return null;
  const map = new Map<string, FlowNodePosition>();
  value.forEach((entry: any) => {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const x = Number(entry?.x);
    const y = Number(entry?.y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) return;
    map.set(id, {
      id,
      x: Math.round(Math.max(-5000, Math.min(5000, x))),
      y: Math.round(Math.max(-5000, Math.min(5000, y))),
    });
  });
  return Array.from(map.values());
};

const toApiErrorMessage = (error: any, fallback: string) => {
  const message = String(error?.message || fallback);
  const normalized = message.toLowerCase();
  if (
    normalized.includes('flow_diagram_states') &&
    (normalized.includes('schema cache') || normalized.includes('could not find the table'))
  ) {
    return 'Falta la migración de base para flow_diagram_states. Ejecuta las migraciones de Supabase y recarga.';
  }
  return message;
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
  if (error) return {} as Record<string, string>;
  return (data || []).reduce((acc: Record<string, string>, row: any) => {
    acc[row.id] = resolveProfileLabel(row);
    return acc;
  }, {});
};

const mapState = (row: FlowDiagramStateRow, labels: Record<string, string>) => ({
  diagram_key: row.diagram_key,
  nodes: normalizeNodes(row.nodes) || [],
  note: row.note || null,
  updated_by: row.updated_by || null,
  updated_by_label: row.updated_by ? labels[row.updated_by] || row.updated_by : 'Sistema',
  updated_at: row.updated_at,
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

  const diagramKey = normalizeDiagramKey(request.nextUrl.searchParams.get('diagram_key'));
  if (!diagramKey) {
    return NextResponse.json({ error: 'diagram_key invalido.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('flow_diagram_states')
    .select('diagram_key,nodes,note,updated_by,updated_at')
    .eq('diagram_key', diagramKey)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: toApiErrorMessage(error, 'Flow diagram query failed') }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ state: null });
  }

  const labels = await getLabelsByUserId(data.updated_by ? [data.updated_by] : []);
  return NextResponse.json({
    state: mapState(data as FlowDiagramStateRow, labels),
  });
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

  const diagramKey = normalizeDiagramKey(body?.diagram_key);
  if (!diagramKey) {
    return NextResponse.json({ error: 'diagram_key invalido.' }, { status: 400 });
  }

  const nodes = normalizeNodes(body?.nodes);
  if (!nodes || !nodes.length) {
    return NextResponse.json({ error: 'Debes enviar al menos un nodo con x/y.' }, { status: 400 });
  }

  const payload = {
    diagram_key: diagramKey,
    nodes,
    note: toOptionalText(body?.note, 600),
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from('flow_diagram_states')
    .upsert(payload, { onConflict: 'diagram_key' })
    .select('diagram_key,nodes,note,updated_by,updated_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: toApiErrorMessage(error, 'No se pudo guardar la revisión.') },
      { status: 500 }
    );
  }

  const labels = await getLabelsByUserId([user.id]);
  return NextResponse.json({
    state: mapState(data as FlowDiagramStateRow, labels),
  });
}
