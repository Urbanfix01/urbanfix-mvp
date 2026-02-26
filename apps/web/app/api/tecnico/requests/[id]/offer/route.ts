import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const getAuthUser = async (request: NextRequest) => {
  if (!supabase) return null;
  const authHeader = (request.headers.get('authorization') || '').trim();
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const parseArsValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = String(value).trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseHoursValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatArs = (value: number) => `$${value.toLocaleString('es-AR')}`;

const activeRequestStatuses = new Set(['published', 'matched', 'quoted', 'direct_sent']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const requestId = String(resolvedParams?.id || '').trim();
  if (!isUuid(requestId)) {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const parsedPrice = parseArsValue(body.price_ars);
  const parsedEta = parseHoursValue(body.eta_hours);
  if (parsedPrice === null || parsedPrice <= 0) {
    return NextResponse.json({ error: 'Ingresa un precio valido en ARS.' }, { status: 400 });
  }
  if (parsedEta === null || parsedEta <= 0) {
    return NextResponse.json({ error: 'Ingresa una ETA valida en horas.' }, { status: 400 });
  }

  const priceArs = Math.round(parsedPrice * 100) / 100;
  const etaHours = Math.max(1, Math.min(720, Math.round(parsedEta)));

  const { data: technicianProfile, error: technicianError } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, phone, specialties, service_city, city')
    .eq('id', user.id)
    .maybeSingle();

  if (technicianError) {
    return NextResponse.json(
      { error: technicianError.message || 'No se pudo cargar el perfil tecnico.' },
      { status: 500 }
    );
  }
  if (!technicianProfile) {
    return NextResponse.json({ error: 'Perfil tecnico no encontrado.' }, { status: 404 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('client_requests')
    .select('id, title, status, mode, target_technician_id')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json(
      { error: requestError.message || 'No se pudo cargar la solicitud.' },
      { status: 500 }
    );
  }
  if (!requestRow) {
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
  }

  const currentStatus = String(requestRow.status || '').trim();
  if (!activeRequestStatuses.has(currentStatus)) {
    return NextResponse.json({ error: 'La solicitud ya no acepta ofertas.' }, { status: 400 });
  }

  if (
    requestRow.mode === 'direct' &&
    requestRow.target_technician_id &&
    String(requestRow.target_technician_id) !== user.id
  ) {
    return NextResponse.json({ error: 'Esta solicitud directa no esta asignada a tu perfil.' }, { status: 403 });
  }

  const technicianName =
    String(technicianProfile.business_name || technicianProfile.full_name || 'Tecnico').trim() || 'Tecnico';
  const technicianPhone = String(technicianProfile.phone || '').trim() || null;
  const technicianSpecialty = String(technicianProfile.specialties || '').trim() || null;
  const technicianCity =
    String(technicianProfile.service_city || '').trim() || String(technicianProfile.city || '').trim() || null;

  const upsertPayload = {
    request_id: requestId,
    technician_id: user.id,
    technician_name: technicianName,
    technician_phone: technicianPhone,
    technician_specialty: technicianSpecialty,
    technician_city: technicianCity,
    quote_status: 'submitted',
    price_ars: priceArs,
    eta_hours: etaHours,
  };

  const { data: upsertRows, error: upsertError } = await supabase
    .from('client_request_matches')
    .upsert(upsertPayload, { onConflict: 'request_id,technician_id' })
    .select('id, quote_status, price_ars, eta_hours, updated_at')
    .limit(1);

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message || 'No se pudo registrar la oferta.' },
      { status: 500 }
    );
  }

  const nextStatus =
    currentStatus === 'published' || currentStatus === 'matched' || currentStatus === 'direct_sent'
      ? 'quoted'
      : currentStatus;

  if (nextStatus !== currentStatus) {
    const { error: statusError } = await supabase
      .from('client_requests')
      .update({ status: nextStatus })
      .eq('id', requestId);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message || 'No se pudo actualizar el estado de la solicitud.' },
        { status: 500 }
      );
    }
  }

  const eventLabel = `Oferta recibida de ${technicianName}: ${formatArs(priceArs)} - ETA ${etaHours} hs.`;
  const { error: eventError } = await supabase.from('client_request_events').insert({
    request_id: requestId,
    actor_id: user.id,
    label: eventLabel,
  });
  if (eventError) {
    console.error('offer event insert failed', eventError.message);
  }

  const firstMatch = Array.isArray(upsertRows) ? upsertRows[0] : null;
  const updatedAt = String(firstMatch?.updated_at || new Date().toISOString());
  return NextResponse.json({
    ok: true,
    message: 'Oferta enviada correctamente.',
    request: {
      id: requestId,
      status: nextStatus,
      my_quote_status: 'submitted',
      my_price_ars: priceArs,
      my_eta_hours: etaHours,
      my_quote_updated_at: updatedAt,
    },
    match: {
      id: firstMatch?.id || null,
      quote_status: 'submitted',
      price_ars: priceArs,
      eta_hours: etaHours,
      updated_at: updatedAt,
    },
  });
}

