import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { getServiceRoleClient } from '@/lib/supabase/server';

const supabase = getServiceRoleClient();

const QUOTE_SELECT =
  'id, user_id, client_name, client_address, location_address, location_lat, location_lng, total_amount, tax_rate, discount_percent, status, created_at, client_request_id';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeStatus = (value: unknown) => String(value || '').trim().toLowerCase();

const APPROVABLE_QUOTE_STATUSES = new Set(['sent', 'presented', 'pending', 'pendiente']);
const ALREADY_APPROVED_STATUSES = new Set(['approved', 'accepted', 'aprobado']);

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
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
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
    .in('status', Array.from(APPROVABLE_QUOTE_STATUSES))
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

  return NextResponse.json(
    { quote: updatedQuote },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
