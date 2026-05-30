import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

const VALID_STATUSES = new Set(['new', 'contacted', 'qualified', 'closed']);

const sanitizeText = (value: unknown, maxLength: number) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('demo_requests')
    .select(
      'id, source, status, full_name, email, phone, company_name, role, city, team_size, platform_interest, use_case, notes, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: error.message || 'No se pudieron cargar las solicitudes de demo.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ requests: data || [] });
}

export async function PATCH(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 4 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const body = bodyResult.body;

  const id = sanitizeText(body.id, 80);
  const status = sanitizeText(body.status, 40).toLowerCase();

  if (!id) {
    return NextResponse.json({ error: 'Falta el id de la solicitud.' }, { status: 400 });
  }

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Estado invalido.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('demo_requests')
    .update({ status })
    .eq('id', id)
    .select(
      'id, source, status, full_name, email, phone, company_name, role, city, team_size, platform_interest, use_case, notes, created_at, updated_at'
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message || 'No se pudo actualizar la solicitud.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ request: data });
}
