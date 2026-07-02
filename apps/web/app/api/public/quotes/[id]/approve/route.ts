import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { getServiceRoleClient } from '@/lib/supabase/server';

const supabase = getServiceRoleClient();

const QUOTE_SELECT =
  'id, user_id, client_name, client_address, location_address, location_lat, location_lng, total_amount, tax_rate, discount_percent, status, created_at, client_request_id, client_request_match_id';

const MATCH_SELECT =
  'id, request_id, technician_id, technician_name, technician_phone, quote_status, quote_id';

const toText = (value: unknown) => String(value || '').trim();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();

const APPROVABLE_QUOTE_STATUSES = new Set(['sent', 'presented', 'pending', 'pendiente']);
const APPROVABLE_QUOTE_DB_STATUSES = ['sent', 'presented', 'pending'];
const ALREADY_APPROVED_STATUSES = new Set(['approved', 'accepted', 'aprobado']);

const loadLinkedMatch = async (client: NonNullable<typeof supabase>, quote: Record<string, any>) => {
  const matchId = toText(quote.client_request_match_id);
  const requestId = toText(quote.client_request_id);

  if (matchId) {
    const { data, error } = await client
      .from('client_request_matches')
      .select(MATCH_SELECT)
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw new Error(error.message || 'No pudimos leer la oferta vinculada.');
    return data || null;
  }

  if (!requestId) return null;

  const { data, error } = await client
    .from('client_request_matches')
    .select(MATCH_SELECT)
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

const syncAcceptedQuoteWithClientRequest = async (client: NonNullable<typeof supabase>, quote: Record<string, any>) => {
  const match = await loadLinkedMatch(client, quote);
  if (!match?.id || !match?.request_id) return;

  const matchStatus = normalizeStatus(match.quote_status);
  if (matchStatus === 'rejected') {
    throw new Error('Esta oferta fue rechazada y ya no se puede aceptar desde este enlace.');
  }

  const { data: requestRow, error: requestError } = await client
    .from('client_requests')
    .select('id, selected_match_id, assigned_technician_id, status')
    .eq('id', match.request_id)
    .maybeSingle();
  if (requestError) throw new Error(requestError.message || 'No pudimos leer la solicitud del cliente.');
  if (!requestRow) return;

  const selectedMatchId = toText(requestRow.selected_match_id);
  if (selectedMatchId && selectedMatchId !== String(match.id)) {
    throw new Error('La solicitud ya tiene otro presupuesto aceptado.');
  }

  const now = new Date().toISOString();
  const { error: acceptMatchError } = await client
    .from('client_request_matches')
    .update({ quote_status: 'accepted' })
    .eq('id', match.id)
    .eq('request_id', match.request_id);
  if (acceptMatchError) {
    throw new Error(acceptMatchError.message || 'No pudimos seleccionar esta cotizacion.');
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

  const { error: requestUpdateError } = await client
    .from('client_requests')
    .update({
      status: 'selected',
      selected_match_id: match.id,
      assigned_technician_id: match.technician_id,
      assigned_technician_name: match.technician_name,
      assigned_technician_phone: match.technician_phone,
    })
    .eq('id', match.request_id);
  if (requestUpdateError) {
    throw new Error(requestUpdateError.message || 'No pudimos actualizar la solicitud del cliente.');
  }

  const technicianName = toText(match.technician_name) || 'tecnico';
  const { error: eventError } = await client.from('client_request_events').insert({
    request_id: match.request_id,
    actor_id: null,
    label: `Presupuesto aceptado desde enlace publico: ${technicianName} seleccionado.`,
    created_at: now,
  });
  if (eventError) {
    console.error('public quote accept event insert failed', eventError.message);
  }
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = enforceRateLimit(_request, {
    keyPrefix: 'public-quote-approve',
    max: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status, headers: rateLimit.headers });
  }

  const resolvedParams = await params;
  const quoteId = String(resolvedParams?.id || '').trim();

  if (!isUuid(quoteId)) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(QUOTE_SELECT)
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message || 'No pudimos leer el presupuesto.' },
      { status: 500 }
    );
  }

  if (!quote) {
    return NextResponse.json({ error: 'Presupuesto no disponible.' }, { status: 404 });
  }

  const quoteStatus = normalizeStatus(quote.status);

  if (ALREADY_APPROVED_STATUSES.has(quoteStatus)) {
    try {
      await syncAcceptedQuoteWithClientRequest(supabase, quote as Record<string, any>);
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'No pudimos sincronizar la solicitud del cliente.' },
        {
          status: 409,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }
    return NextResponse.json(
      { quote },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (!APPROVABLE_QUOTE_STATUSES.has(quoteStatus)) {
    return NextResponse.json(
      { error: 'Este presupuesto no esta disponible para aprobar.' },
      {
        status: quoteStatus === 'draft' || quoteStatus === 'borrador' || !quoteStatus ? 404 : 409,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const { data: updatedQuote, error: updateError } = await supabase
    .from('quotes')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', quoteId)
    .in('status', APPROVABLE_QUOTE_DB_STATUSES)
    .select(QUOTE_SELECT)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'No pudimos aprobar el presupuesto.' },
      { status: 500 }
    );
  }

  if (!updatedQuote) {
    return NextResponse.json(
      { error: 'El presupuesto ya no esta disponible para aprobar.' },
      {
        status: 409,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  try {
    await syncAcceptedQuoteWithClientRequest(supabase, updatedQuote as Record<string, any>);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'El presupuesto fue aprobado, pero no pudimos actualizar la solicitud del cliente.' },
      {
        status: 409,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return NextResponse.json(
    { quote: updatedQuote },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
