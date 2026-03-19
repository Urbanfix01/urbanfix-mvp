import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

const isMissingColumnError = (error: any, column: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
};

const parseBoolean = (value: any) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Boolean(value);
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return null;
};

const parseSuggestedPrice = (value: any) => {
  if (value === null) return { ok: true, value: null as number | null };
  if (value === '') return { ok: true, value: null as number | null };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false, value: null as number | null };
  return { ok: true, value: parsed };
};

const parseTechnicalNotes = (value: any) => {
  if (value === null || value === undefined) return { ok: true, value: null as string | null };
  if (typeof value !== 'string') return { ok: false, value: null as string | null };
  const normalized = value.trim();
  return { ok: true, value: normalized || null };
};

const parseUnit = (value: any) => {
  if (value === null || value === undefined) return { ok: true, value: null as string | null };
  if (typeof value !== 'string') return { ok: false, value: null as string | null };
  const normalized = value.trim().toLowerCase();
  return { ok: true, value: normalized || null };
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
  const itemId = (resolvedParams?.id || '').toString();
  if (!itemId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const patch: Record<string, any> = {};

  if (body && Object.prototype.hasOwnProperty.call(body, 'active')) {
    const parsed = parseBoolean(body.active);
    if (parsed === null) {
      return NextResponse.json({ error: 'Invalid active' }, { status: 400 });
    }
    patch.active = parsed;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'suggested_price')) {
    const parsed = parseSuggestedPrice(body.suggested_price);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Invalid suggested_price' }, { status: 400 });
    }
    patch.suggested_price = parsed.value;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'technical_notes')) {
    const parsed = parseTechnicalNotes(body.technical_notes);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Invalid technical_notes' }, { status: 400 });
    }
    patch.technical_notes = parsed.value;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, 'unit')) {
    const parsed = parseUnit(body.unit);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'Invalid unit' }, { status: 400 });
    }
    patch.unit = parsed.value;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('master_items')
    .update(patch)
    .eq('id', itemId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, 'technical_notes') && Object.prototype.hasOwnProperty.call(patch, 'technical_notes')) {
      return NextResponse.json(
        { error: 'Falta ejecutar la migracion de observaciones tecnicas para master_items.' },
        { status: 409 }
      );
    }
    if (isMissingColumnError(error, 'unit') && Object.prototype.hasOwnProperty.call(patch, 'unit')) {
      return NextResponse.json(
        { error: 'Falta ejecutar la migracion de unidad para master_items.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data || null });
}
