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

const isFeedbackEnabledStatus = (status?: string | null) => {
  const normalized = normalizeStatusValue(status);
  return normalized === 'completed' || normalized === 'paid';
};

const getStatusLabel = (status?: string | null) => {
  const normalized = normalizeStatusValue(status);
  if (normalized === 'paid') return 'Cobrado';
  if (normalized === 'completed') return 'Finalizado';
  if (normalized === 'approved') return 'Aprobado';
  if (normalized === 'presented') return 'Presentado';
  if (normalized === 'rejected') return 'Rechazado';
  return 'Pendiente';
};

const sanitizeToken = (value: string) => String(value || '').trim();

const loadFeedbackContext = async (token: string) => {
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) {
    return { error: 'Link invalido.', status: 400 } as const;
  }

  const { data: requestRow, error: requestError } = await supabase!
    .from('quote_feedback_requests')
    .select('id, quote_id, technician_id, share_token, client_name_snapshot, created_at, completed_at, revoked_at')
    .eq('share_token', cleanToken)
    .maybeSingle();

  if (requestError) {
    return {
      error: requestError.message || 'No pudimos validar el link de calificacion.',
      status: 500,
    } as const;
  }
  if (!requestRow || requestRow.revoked_at) {
    return { error: 'Este link ya no esta disponible.', status: 404 } as const;
  }

  const { data: quote, error: quoteError } = await supabase!
    .from('quotes')
    .select('id, client_name, client_address, status, created_at, total_amount, user_id')
    .eq('id', requestRow.quote_id)
    .maybeSingle();

  if (quoteError) {
    return { error: quoteError.message || 'No pudimos leer el trabajo asociado.', status: 500 } as const;
  }
  if (!quote) {
    return { error: 'No encontramos el trabajo asociado a este link.', status: 404 } as const;
  }

  const { data: technician, error: technicianError } = await supabase!
    .from('profiles')
    .select(
      'id, full_name, business_name, phone, avatar_url, company_logo_url, public_rating, public_reviews_count'
    )
    .eq('id', requestRow.technician_id)
    .maybeSingle();

  if (technicianError) {
    return { error: technicianError.message || 'No pudimos leer el perfil tecnico.', status: 500 } as const;
  }
  if (!technician) {
    return { error: 'Perfil tecnico no encontrado.', status: 404 } as const;
  }

  const { data: review, error: reviewError } = await supabase!
    .from('quote_feedback_reviews')
    .select('id, client_name, rating, comment, is_public, submitted_at, updated_at')
    .eq('feedback_request_id', requestRow.id)
    .maybeSingle();

  if (reviewError) {
    return { error: reviewError.message || 'No pudimos leer la calificacion actual.', status: 500 } as const;
  }

  const feedbackAllowed = isFeedbackEnabledStatus(quote.status);

  return {
    status: 200,
    feedbackAllowed,
    payload: {
      requestId: requestRow.id,
      quote: {
        id: quote.id,
        clientName: String(quote.client_name || requestRow.client_name_snapshot || '').trim() || null,
        address: String(quote.client_address || '').trim() || null,
        status: String(quote.status || '').trim() || null,
        statusLabel: getStatusLabel(quote.status),
        createdAt: quote.created_at,
        totalAmount: quote.total_amount,
      },
      technician: {
        id: technician.id,
        displayName:
          String(technician.business_name || technician.full_name || 'Tecnico').trim() || 'Tecnico UrbanFix',
        fullName: String(technician.full_name || '').trim() || null,
        businessName: String(technician.business_name || '').trim() || null,
        phone: String(technician.phone || '').trim() || null,
        avatarUrl: String(technician.avatar_url || '').trim() || null,
        companyLogoUrl: String(technician.company_logo_url || '').trim() || null,
        publicRating:
          technician.public_rating === null || technician.public_rating === undefined
            ? null
            : Number(technician.public_rating),
        publicReviewsCount: Math.max(0, Number(technician.public_reviews_count || 0)),
      },
      review: review
        ? {
            id: review.id,
            clientName: String(review.client_name || '').trim() || null,
            rating: Math.max(1, Math.min(5, Number(review.rating || 0))),
            comment: String(review.comment || ''),
            isPublic: Boolean(review.is_public),
            submittedAt: review.submitted_at,
            updatedAt: review.updated_at,
          }
        : null,
      feedbackAllowed,
      disabledReason: feedbackAllowed
        ? null
        : 'La calificacion se habilita cuando el trabajo este finalizado o cobrado.',
      clientNameSuggestion: String(requestRow.client_name_snapshot || quote.client_name || '').trim() || '',
    },
  } as const;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const resolvedParams = await params;
  const context = await loadFeedbackContext(resolvedParams?.token || '');
  if (context.status !== 200) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  return NextResponse.json(context.payload);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const resolvedParams = await params;
  const context = await loadFeedbackContext(resolvedParams?.token || '');
  if (context.status !== 200) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!context.feedbackAllowed) {
    return NextResponse.json(
      { error: 'La calificacion todavia no esta habilitada para este trabajo.' },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const rating = Math.round(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Selecciona una calificacion valida de 1 a 5.' }, { status: 400 });
  }

  const clientName =
    String(body.clientName || context.payload.clientNameSuggestion || '').trim().slice(0, 120) || null;
  const comment = String(body.comment || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 1200);
  const isPublic = body.isPublic === undefined ? true : Boolean(body.isPublic);

  const upsertPayload = {
    feedback_request_id: context.payload.requestId,
    quote_id: context.payload.quote.id,
    technician_id: context.payload.technician.id,
    client_name: clientName,
    rating,
    comment: comment || null,
    is_public: isPublic,
  };

  const { data: reviewRows, error: reviewError } = await supabase!
    .from('quote_feedback_reviews')
    .upsert(upsertPayload, { onConflict: 'feedback_request_id' })
    .select('id, client_name, rating, comment, is_public, submitted_at, updated_at')
    .limit(1);

  if (reviewError) {
    return NextResponse.json(
      { error: reviewError.message || 'No pudimos guardar la calificacion.' },
      { status: 500 }
    );
  }

  const review = Array.isArray(reviewRows) ? reviewRows[0] : null;
  if (!review) {
    return NextResponse.json({ error: 'No pudimos confirmar la calificacion.' }, { status: 500 });
  }

  await supabase!
    .from('quote_feedback_requests')
    .update({
      completed_at: new Date().toISOString(),
      client_name_snapshot: clientName || context.payload.clientNameSuggestion || null,
    })
    .eq('id', context.payload.requestId);

  return NextResponse.json({
    ok: true,
    review: {
      id: review.id,
      clientName: String(review.client_name || '').trim() || null,
      rating: Math.max(1, Math.min(5, Number(review.rating || 0))),
      comment: String(review.comment || ''),
      isPublic: Boolean(review.is_public),
      submittedAt: review.submitted_at,
      updatedAt: review.updated_at,
    },
  });
}
