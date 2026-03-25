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
const toText = (value: unknown) => String(value || '').trim();
const normalizeResponseType = (value: unknown) =>
  String(value || '').trim().toLowerCase() === 'application' ? 'application' : 'direct_quote';

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

  const responseType = normalizeResponseType(body.response_type);
  const parsedPrice = parseArsValue(body.price_ars);
  const parsedEta = parseHoursValue(body.eta_hours);
  const parsedVisitEta = parseHoursValue(body.visit_eta_hours);
  const responseMessage = toText(body.message);
  const quoteIdRaw = toText(body.quote_id);

  const priceArs =
    parsedPrice === null || parsedPrice <= 0 ? null : Math.round(parsedPrice * 100) / 100;
  const etaHours =
    parsedEta === null || parsedEta <= 0 ? null : Math.max(1, Math.min(720, Math.round(parsedEta)));
  const visitEtaHours =
    parsedVisitEta === null || parsedVisitEta <= 0 ? null : Math.max(1, Math.min(720, Math.round(parsedVisitEta)));
  const quoteId = quoteIdRaw ? (isUuid(quoteIdRaw) ? quoteIdRaw : '__invalid__') : null;

  if (responseType === 'direct_quote') {
    if (priceArs === null) {
      return NextResponse.json({ error: 'Ingresa un precio valido en ARS.' }, { status: 400 });
    }
    if (etaHours === null) {
      return NextResponse.json({ error: 'Ingresa una ETA valida en horas.' }, { status: 400 });
    }
    if (quoteId === '__invalid__') {
      return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
    }
  } else {
    if (responseMessage.length < 12) {
      return NextResponse.json({ error: 'Escribe un mensaje breve para postularte.' }, { status: 400 });
    }
    if (visitEtaHours === null) {
      return NextResponse.json({ error: 'Indica en cuantas horas puedes coordinar la visita.' }, { status: 400 });
    }
  }

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
    quote_id: responseType === 'direct_quote' ? quoteId : null,
    response_type: responseType,
    response_message: responseType === 'application' ? responseMessage : null,
    visit_eta_hours: responseType === 'application' ? visitEtaHours : null,
    price_ars: responseType === 'direct_quote' ? priceArs : null,
    eta_hours: responseType === 'direct_quote' ? etaHours : null,
  };

  const { data: upsertRows, error: upsertError } = await supabase
    .from('client_request_matches')
    .upsert(upsertPayload, { onConflict: 'request_id,technician_id' })
    .select('id, quote_status, quote_id, response_type, response_message, visit_eta_hours, price_ars, eta_hours, updated_at')
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

  const eventLabel =
    responseType === 'application'
      ? `Postulacion recibida de ${technicianName}: visita en ${visitEtaHours} hs.${responseMessage ? ` ${responseMessage}` : ''}`
      : `Oferta recibida de ${technicianName}: ${formatArs(priceArs!)} - ETA ${etaHours} hs.`;
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

  if (responseType === 'direct_quote' && quoteId && firstMatch?.id) {
    const { error: quoteLinkError } = await supabase
      .from('quotes')
      .update({
        client_request_id: requestId,
        client_request_match_id: firstMatch.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .eq('user_id', user.id);
    if (quoteLinkError) {
      console.error('offer quote link update failed', quoteLinkError.message);
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Oferta enviada correctamente.',
    request: {
      id: requestId,
      status: nextStatus,
      my_quote_status: 'submitted',
      my_response_type: responseType,
      my_response_message: responseType === 'application' ? responseMessage : null,
      my_visit_eta_hours: responseType === 'application' ? visitEtaHours : null,
      my_price_ars: responseType === 'direct_quote' ? priceArs : null,
      my_eta_hours: responseType === 'direct_quote' ? etaHours : null,
      my_quote_updated_at: updatedAt,
    },
    match: {
      id: firstMatch?.id || null,
      quote_status: 'submitted',
      quote_id: responseType === 'direct_quote' ? quoteId : null,
      response_type: responseType,
      response_message: responseType === 'application' ? responseMessage : null,
      visit_eta_hours: responseType === 'application' ? visitEtaHours : null,
      price_ars: responseType === 'direct_quote' ? priceArs : null,
      eta_hours: responseType === 'direct_quote' ? etaHours : null,
      updated_at: updatedAt,
    },
  });
}

