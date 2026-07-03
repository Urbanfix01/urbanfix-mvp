import { NextRequest, NextResponse } from 'next/server';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { getServiceRoleClient } from '@/lib/supabase/server';

const supabase = getServiceRoleClient();

const toText = (value: unknown) => String(value || '').trim();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const statusAliases: Record<string, string> = {
  accepted: 'approved',
  sent: 'presented',
  finalizado: 'completed',
  completado: 'completed',
  finalizados: 'completed',
  cobrado: 'paid',
  cobrados: 'paid',
  pagado: 'paid',
  pagados: 'paid',
  charged: 'paid',
  programado: 'scheduled',
  agendado: 'scheduled',
  'in-progress': 'in_progress',
  en_curso: 'in_progress',
  'en curso': 'in_progress',
  enproceso: 'in_progress',
  en_proceso: 'in_progress',
  borrador: 'draft',
  rechazado: 'rejected',
  rechazada: 'rejected',
  desestimado: 'discarded',
  desestimada: 'discarded',
  canceled: 'cancelled',
  cancelado: 'cancelled',
  cancelada: 'cancelled',
  vencido: 'expired',
  vencida: 'expired',
};

const allowedStatuses = new Set([
  'draft',
  'pending',
  'presented',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'paid',
  'rejected',
  'discarded',
  'cancelled',
  'expired',
]);

const resolveStatus = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  const canonical = statusAliases[normalized] || normalized;
  return allowedStatuses.has(canonical) ? canonical : null;
};

const CLIENT_REQUEST_CLOSING_STATUSES = new Set(['completed', 'paid']);

const loadLinkedMatch = async (client: NonNullable<typeof supabase>, quote: Record<string, any>) => {
  const matchId = toText(quote.client_request_match_id);
  const requestId = toText(quote.client_request_id);

  if (matchId) {
    const { data, error } = await client
      .from('client_request_matches')
      .select('id, request_id, technician_id, technician_name, technician_phone, quote_status, quote_id')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw new Error(error.message || 'No pudimos leer la oferta vinculada.');
    return data || null;
  }

  if (!requestId || !quote.id) return null;

  const { data, error } = await client
    .from('client_request_matches')
    .select('id, request_id, technician_id, technician_name, technician_phone, quote_status, quote_id')
    .eq('request_id', requestId)
    .eq('quote_id', quote.id)
    .maybeSingle();
  if (error) throw new Error(error.message || 'No pudimos leer la oferta vinculada.');

  if (data?.id) {
    await client
      .from('quotes')
      .update({ client_request_match_id: data.id, updated_at: new Date().toISOString() })
      .eq('id', quote.id);
  }

  return data || null;
};

const syncClosedQuoteWithClientRequest = async (
  client: NonNullable<typeof supabase>,
  quote: Record<string, any>,
  nextStatus: string,
  actorId: string
) => {
  if (!CLIENT_REQUEST_CLOSING_STATUSES.has(nextStatus)) return;

  const match = await loadLinkedMatch(client, quote);
  if (!match?.id || !match?.request_id) return;

  const matchStatus = toText(match.quote_status).toLowerCase();
  if (matchStatus === 'rejected') {
    throw new Error('Esta cotizacion fue rechazada y no puede cerrarse como cobrada.');
  }

  const { data: requestRow, error: requestError } = await client
    .from('client_requests')
    .select('id, selected_match_id, status')
    .eq('id', match.request_id)
    .maybeSingle();
  if (requestError) throw new Error(requestError.message || 'No pudimos leer la solicitud del cliente.');
  if (!requestRow) return;

  const selectedMatchId = toText(requestRow.selected_match_id);
  if (selectedMatchId && selectedMatchId !== String(match.id)) {
    throw new Error('La solicitud ya tiene otro presupuesto seleccionado.');
  }

  const { error: acceptMatchError } = await client
    .from('client_request_matches')
    .update({ quote_status: 'accepted' })
    .eq('id', match.id)
    .eq('request_id', match.request_id);
  if (acceptMatchError) {
    throw new Error(acceptMatchError.message || 'No pudimos marcar la oferta como aceptada.');
  }

  const { error: rejectOtherMatchesError } = await client
    .from('client_request_matches')
    .update({ quote_status: 'rejected' })
    .eq('request_id', match.request_id)
    .neq('id', match.id)
    .eq('quote_status', 'submitted');
  if (rejectOtherMatchesError) {
    throw new Error(rejectOtherMatchesError.message || 'No pudimos cerrar las otras cotizaciones.');
  }

  const { error: updateRequestError } = await client
    .from('client_requests')
    .update({
      status: 'completed',
      selected_match_id: match.id,
      assigned_technician_id: match.technician_id,
      assigned_technician_name: match.technician_name,
      assigned_technician_phone: match.technician_phone,
    })
    .eq('id', match.request_id);
  if (updateRequestError) {
    throw new Error(updateRequestError.message || 'No pudimos cerrar la solicitud del cliente.');
  }

  const technicianName = toText(match.technician_name) || 'tecnico';
  const eventLabel =
    nextStatus === 'paid'
      ? `Trabajo cobrado por ${technicianName}.`
      : `Trabajo finalizado por ${technicianName}.`;
  const { error: eventError } = await client.from('client_request_events').insert({
    request_id: match.request_id,
    actor_id: actorId,
    label: eventLabel,
    created_at: new Date().toISOString(),
  });
  if (eventError) {
    console.error('quote close client request event insert failed', eventError.message);
  }
};

const getAuthUser = async (request: NextRequest) => {
  if (!supabase) return null;
  const authHeader = (request.headers.get('authorization') || '').trim();
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  if (!token || token.length < 20) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const resolveQuoteId = async (params: Promise<{ id: string }>) => {
  const resolvedParams = await params;
  const quoteId = String(resolvedParams?.id || '').trim();
  return isUuid(quoteId) ? quoteId : null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quoteId = await resolveQuoteId(params);
  if (!quoteId) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 8 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const nextStatus = resolveStatus(bodyResult.body.status ?? bodyResult.body.nextStatus);
  if (!nextStatus) {
    return NextResponse.json({ error: 'Estado invalido.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('quotes')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .select('*')
    .limit(1);

  if (error) {
    return NextResponse.json(
      { error: error.message || 'No pudimos actualizar el estado.' },
      { status: 500 }
    );
  }

  const quote = Array.isArray(data) ? data[0] : null;
  if (!quote) {
    return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
  }

  try {
    await syncClosedQuoteWithClientRequest(supabase, quote as Record<string, any>, nextStatus, user.id);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'El presupuesto fue actualizado, pero no pudimos cerrar la solicitud vinculada.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, quote });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quoteId = await resolveQuoteId(params);
  if (!quoteId) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, user_id')
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message || 'No pudimos leer el presupuesto.' },
      { status: 500 }
    );
  }

  if (!quote || String(quote.user_id || '') !== user.id) {
    return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
  }

  const { error: itemsError } = await supabase.from('quote_items').delete().eq('quote_id', quoteId);
  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message || 'No pudimos eliminar los items del presupuesto.' },
      { status: 500 }
    );
  }

  const { error: attachmentsError } = await supabase.from('quote_attachments').delete().eq('quote_id', quoteId);
  if (attachmentsError) {
    return NextResponse.json(
      { error: attachmentsError.message || 'No pudimos eliminar los adjuntos del presupuesto.' },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase.from('quotes').delete().eq('id', quoteId).eq('user_id', user.id);
  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || 'No pudimos eliminar el presupuesto.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, quoteId });
}
