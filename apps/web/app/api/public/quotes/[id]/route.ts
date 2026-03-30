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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const resolvedParams = await params;
  const quoteId = String(resolvedParams?.id || '').trim();

  if (!isUuid(quoteId)) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select(
      'id, user_id, client_name, client_address, location_address, location_lat, location_lng, total_amount, tax_rate, discount_percent, status, created_at, client_request_id'
    )
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

  const [itemsResult, attachmentsResult, profileResult] = await Promise.all([
    supabase
      .from('quote_items')
      .select('id, quote_id, description, quantity, unit_price, metadata')
      .eq('quote_id', quoteId),
    supabase
      .from('quote_attachments')
      .select('id, quote_id, file_url, file_name, file_type, created_at')
      .eq('quote_id', quoteId),
    supabase
      .from('profiles')
      .select('id, full_name, business_name, phone, email, company_address, avatar_url, company_logo_url')
      .eq('id', quote.user_id)
      .maybeSingle(),
  ]);

  if (itemsResult.error) {
    return NextResponse.json(
      { error: itemsResult.error.message || 'No pudimos leer los items del presupuesto.' },
      { status: 500 }
    );
  }

  if (attachmentsResult.error) {
    return NextResponse.json(
      { error: attachmentsResult.error.message || 'No pudimos leer los adjuntos del presupuesto.' },
      { status: 500 }
    );
  }

  if (profileResult.error) {
    return NextResponse.json(
      { error: profileResult.error.message || 'No pudimos leer el perfil del tecnico.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      quote,
      items: Array.isArray(itemsResult.data) ? itemsResult.data : [],
      attachments: Array.isArray(attachmentsResult.data) ? attachmentsResult.data : [],
      profile: profileResult.data || null,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}