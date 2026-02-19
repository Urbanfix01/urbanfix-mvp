import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const ROADMAP_STATUS = new Set(['planned', 'in_progress', 'done', 'blocked']);
const ROADMAP_AREA = new Set(['web', 'mobile', 'backend', 'ops']);
const ROADMAP_PRIORITY = new Set(['high', 'medium', 'low']);

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

const toOptionalText = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeStatus = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if (!ROADMAP_STATUS.has(normalized)) return undefined;
  return normalized;
};

const normalizeArea = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if (!ROADMAP_AREA.has(normalized)) return undefined;
  return normalized;
};

const normalizePriority = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if (!ROADMAP_PRIORITY.has(normalized)) return undefined;
  return normalized;
};

const normalizeEtaDate = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return trimmed;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const patch: Record<string, any> = {
    updated_by: user.id,
  };
  let hasChanges = false;

  if (body && Object.prototype.hasOwnProperty.call(body, 'title')) {
    const title = toOptionalText(body.title);
    if (title === undefined || title === null || title.length < 3) {
      return NextResponse.json({ error: 'Título inválido.' }, { status: 400 });
    }
    patch.title = title;
    hasChanges = true;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'description')) {
    const description = toOptionalText(body.description);
    if (description === undefined) {
      return NextResponse.json({ error: 'Descripción inválida.' }, { status: 400 });
    }
    patch.description = description;
    hasChanges = true;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'owner')) {
    const owner = toOptionalText(body.owner);
    if (owner === undefined) {
      return NextResponse.json({ error: 'Owner inválido.' }, { status: 400 });
    }
    patch.owner = owner;
    hasChanges = true;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'status')) {
    const status = normalizeStatus(body.status);
    if (status === undefined) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }
    patch.status = status;
    hasChanges = true;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'area')) {
    const area = normalizeArea(body.area);
    if (area === undefined) {
      return NextResponse.json({ error: 'Área inválida.' }, { status: 400 });
    }
    patch.area = area;
    hasChanges = true;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'priority')) {
    const priority = normalizePriority(body.priority);
    if (priority === undefined) {
      return NextResponse.json({ error: 'Prioridad inválida.' }, { status: 400 });
    }
    patch.priority = priority;
    hasChanges = true;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'eta_date')) {
    const etaDate = normalizeEtaDate(body.eta_date);
    if (etaDate === undefined) {
      return NextResponse.json({ error: 'ETA inválida (usar YYYY-MM-DD).' }, { status: 400 });
    }
    patch.eta_date = etaDate;
    hasChanges = true;
  }

  if (!hasChanges) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('roadmap_updates')
    .update(patch)
    .eq('id', roadmapId)
    .select('id,title,description,status,area,priority,owner,eta_date,created_by,updated_by,created_at,updated_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });
  }

  return NextResponse.json({ update: data });
}
