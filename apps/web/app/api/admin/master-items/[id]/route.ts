import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

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

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('master_items')
    .update(patch)
    .eq('id', itemId)
    .select('id,name,type,suggested_price,category,source_ref,active,created_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data || null });
}
