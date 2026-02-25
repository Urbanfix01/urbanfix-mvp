import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import { DIRECT_TIMEOUT_MS, getClientWorkspaceSnapshot, insertClientEvent } from '@/app/api/client/_shared/data';

const modeSet = new Set(['marketplace', 'direct']);
const urgencySet = new Set(['baja', 'media', 'alta']);

const toText = (value: unknown) => String(value || '').trim();

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await getClientWorkspaceSnapshot(supabase, user.id);
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No pudimos cargar datos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const title = toText(body.title);
  const category = toText(body.category);
  const address = toText(body.address);
  const city = toText(body.city);
  const description = toText(body.description);
  const preferredWindow = toText(body.preferredWindow);
  const mode = toText(body.mode).toLowerCase() || 'marketplace';
  const urgency = toText(body.urgency).toLowerCase() || 'media';
  const targetTechnicianId = toText(body.targetTechnicianId);

  if (!title || !category || !address || !description) {
    return NextResponse.json({ error: 'Completa titulo, categoria, direccion y descripcion.' }, { status: 400 });
  }
  if (!modeSet.has(mode)) {
    return NextResponse.json({ error: 'Modo invalido.' }, { status: 400 });
  }
  if (!urgencySet.has(urgency)) {
    return NextResponse.json({ error: 'Urgencia invalida.' }, { status: 400 });
  }
  if (mode === 'direct' && !targetTechnicianId) {
    return NextResponse.json({ error: 'Selecciona un tecnico para solicitud directa.' }, { status: 400 });
  }

  let targetName: string | null = null;
  let targetPhone: string | null = null;
  let targetId: string | null = null;

  if (mode === 'direct' && targetTechnicianId) {
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id,full_name,business_name,phone')
      .eq('id', targetTechnicianId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'No encontramos el tecnico seleccionado.' }, { status: 400 });
    }

    targetId = String(targetProfile.id);
    targetName = String(targetProfile.full_name || targetProfile.business_name || 'Tecnico').trim();
    targetPhone = String(targetProfile.phone || '').trim() || null;
  }

  const status = mode === 'direct' ? 'direct_sent' : 'published';
  const directExpiresAt = mode === 'direct' ? new Date(Date.now() + DIRECT_TIMEOUT_MS).toISOString() : null;

  const { data: insertedRow, error: insertError } = await supabase
    .from('client_requests')
    .insert({
      client_id: user.id,
      title,
      category,
      address,
      city: city || null,
      description,
      urgency,
      preferred_window: preferredWindow || null,
      mode,
      status,
      target_technician_id: targetId,
      target_technician_name: targetName,
      target_technician_phone: targetPhone,
      direct_expires_at: directExpiresAt,
    })
    .select('id')
    .single();

  if (insertError || !insertedRow) {
    return NextResponse.json({ error: insertError?.message || 'No pudimos crear la solicitud.' }, { status: 500 });
  }

  try {
    const label =
      mode === 'direct'
        ? `Solicitud directa enviada a ${targetName || 'tecnico'}.`
        : 'Solicitud publicada en marketplace.';
    await insertClientEvent(supabase, String(insertedRow.id), user.id, label);
  } catch (eventError: any) {
    return NextResponse.json({ error: eventError?.message || 'No pudimos registrar el evento inicial.' }, { status: 500 });
  }

  try {
    const snapshot = await getClientWorkspaceSnapshot(supabase, user.id);
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No pudimos cargar datos actualizados.' }, { status: 500 });
  }
}
