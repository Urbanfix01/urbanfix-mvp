import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const ROADMAP_UPDATE_SELECT_WITH_SECTOR =
  'id,title,description,status,area,priority,sector,owner,eta_date,created_by,updated_by,created_at,updated_at';
const ROADMAP_UPDATE_SELECT_WITHOUT_SECTOR =
  'id,title,description,status,area,priority,owner,eta_date,created_by,updated_by,created_at,updated_at';

const ROADMAP_STATUS = new Set(['planned', 'in_progress', 'done', 'blocked']);
const ROADMAP_AREA = new Set(['web', 'mobile', 'backend', 'ops']);
const ROADMAP_PRIORITY = new Set(['high', 'medium', 'low']);
const ROADMAP_SECTOR = new Set(['interfaz', 'operativo', 'clientes', 'web', 'app', 'funcionalidades']);
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

const normalizeSector = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if (!ROADMAP_SECTOR.has(normalized)) return undefined;
  return normalized;
};

const normalizeSentiment = (value: unknown) => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (!ROADMAP_SENTIMENT.has(normalized)) return 'neutral';
  return normalized;
};

const isMissingRoadmapSectorColumnError = (error: { code?: string | null; message?: string | null } | null) => {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  const isMissingColumn = code === '42703' || message.includes('does not exist');
  return isMissingColumn && message.includes('sector');
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

  const includesAuditMessage = body && Object.prototype.hasOwnProperty.call(body, 'audit_message');
  const auditMessage = includesAuditMessage ? toOptionalText(body.audit_message) : null;
  if (includesAuditMessage && (auditMessage === undefined || auditMessage === null || auditMessage.length < 2)) {
    return NextResponse.json({ error: 'Audit inválido. Usa al menos 2 caracteres.' }, { status: 400 });
  }
  const auditSentiment = normalizeSentiment(body?.audit_sentiment);

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

  if (body && Object.prototype.hasOwnProperty.call(body, 'sector')) {
    const sector = normalizeSector(body.sector);
    if (sector === undefined) {
      return NextResponse.json({ error: 'Sector inválido.' }, { status: 400 });
    }
    patch.sector = sector;
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

  let updateResult: any = await supabase
    .from('roadmap_updates')
    .update(patch)
    .eq('id', roadmapId)
    .select(ROADMAP_UPDATE_SELECT_WITH_SECTOR)
    .maybeSingle();

  if (isMissingRoadmapSectorColumnError(updateResult.error || null)) {
    const fallbackPatch = { ...patch } as Record<string, any>;
    delete fallbackPatch.sector;
    updateResult = await supabase
      .from('roadmap_updates')
      .update(fallbackPatch)
      .eq('id', roadmapId)
      .select(ROADMAP_UPDATE_SELECT_WITHOUT_SECTOR)
      .maybeSingle();
  }

  const { data, error } = updateResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 });
  }

  let auditFeedback: Record<string, any> | null = null;
  let auditError: string | null = null;

  if (auditMessage) {
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('roadmap_feedback')
      .insert({
        roadmap_id: roadmapId,
        body: auditMessage,
        sentiment: auditSentiment,
        created_by: user.id,
      })
      .select('id,roadmap_id,body,sentiment,created_by,created_at')
      .maybeSingle();

    if (feedbackError) {
      auditError = feedbackError.message;
    } else if (feedbackData) {
      auditFeedback = {
        ...feedbackData,
        sentiment: normalizeSentiment(feedbackData.sentiment),
        created_by_label: user.email || user.id,
      };
    }
  }

  return NextResponse.json({ update: data, audit_feedback: auditFeedback, audit_error: auditError });
}
