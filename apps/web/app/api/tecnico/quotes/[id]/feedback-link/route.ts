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

const normalizeStatusValue = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'draft';
  if (normalized === 'accepted') return 'approved';
  if (normalized === 'sent') return 'presented';
  if (normalized === 'finalizado') return 'completed';
  if (['cobrado', 'cobrados', 'pagado', 'pagados', 'charged'].includes(normalized)) return 'paid';
  if (['completed', 'completado', 'finalizados'].includes(normalized)) return 'completed';
  if (['presented', 'pending'].includes(normalized)) return normalized;
  if (['approved', 'paid', 'draft'].includes(normalized)) return normalized;
  return normalized;
};

const canShareFeedbackForStatus = (status?: string | null) => {
  const normalized = normalizeStatusValue(status);
  return normalized === 'completed' || normalized === 'paid';
};

const getAuthUser = async (request: NextRequest) => {
  if (!supabase) return null;
  const authHeader = (request.headers.get('authorization') || '').trim();
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const buildPublicBaseUrl = (request: NextRequest) => {
  const envUrl = String(process.env.NEXT_PUBLIC_PUBLIC_WEB_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const origin = request.nextUrl.origin || '';
  if (origin) return origin.replace(/\/+$/, '');
  return 'https://www.urbanfix.com.ar';
};

const generateShareToken = () => crypto.randomUUID().replace(/-/g, '');

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
  const quoteId = String(resolvedParams?.id || '').trim();
  if (!isUuid(quoteId)) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, user_id, client_name, status')
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message || 'No pudimos leer el presupuesto.' },
      { status: 500 }
    );
  }
  if (!quote || String(quote.user_id || '') !== user.id) {
    return NextResponse.json({ error: 'No encontramos ese presupuesto en tu cuenta.' }, { status: 404 });
  }
  if (!canShareFeedbackForStatus(quote.status)) {
    return NextResponse.json(
      { error: 'El link de calificacion se habilita cuando el trabajo este finalizado o cobrado.' },
      { status: 400 }
    );
  }

  const { data: existingRequest, error: existingError } = await supabase
    .from('quote_feedback_requests')
    .select('id, share_token, completed_at')
    .eq('quote_id', quoteId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message || 'No pudimos consultar el link de calificacion.' },
      { status: 500 }
    );
  }

  let shareToken = String(existingRequest?.share_token || '').trim();
  if (!shareToken) {
    const { data: createdRows, error: createError } = await supabase
      .from('quote_feedback_requests')
      .insert({
        quote_id: quoteId,
        technician_id: user.id,
        share_token: generateShareToken(),
        client_name_snapshot: String(quote.client_name || '').trim() || null,
      })
      .select('id, share_token, completed_at')
      .limit(1);

    if (createError) {
      return NextResponse.json(
        { error: createError.message || 'No pudimos generar el link de calificacion.' },
        { status: 500 }
      );
    }

    const created = Array.isArray(createdRows) ? createdRows[0] : null;
    shareToken = String(created?.share_token || '').trim();
  }

  if (!shareToken) {
    return NextResponse.json({ error: 'No pudimos generar el link de calificacion.' }, { status: 500 });
  }

  const baseUrl = buildPublicBaseUrl(request);
  const url = `${baseUrl}/calificar/${shareToken}`;

  return NextResponse.json({
    ok: true,
    url,
    token: shareToken,
    quoteId,
    alreadyReviewed: Boolean(existingRequest?.completed_at),
  });
}
