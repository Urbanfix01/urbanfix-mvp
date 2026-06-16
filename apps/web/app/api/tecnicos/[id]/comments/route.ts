import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { getServiceRoleClient } from '@/lib/supabase/server';

const REVIEW_COOKIE_KEY = 'urbanfix_profile_review_sid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const supabase = getServiceRoleClient();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isMissingReviewsMigration = (message: string) => {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('profile_public_reviews') ||
    lower.includes('quote_feedback_reviews') ||
    lower.includes('schema cache') ||
    lower.includes('does not exist')
  );
};

const getOrCreateSessionKey = async () => {
  const cookieStore = await cookies();
  const existing = String(cookieStore.get(REVIEW_COOKIE_KEY)?.value || '').trim();
  if (existing) {
    return { key: existing, created: false };
  }
  return { key: crypto.randomUUID(), created: true };
};

const buildResponse = (
  payload: Record<string, unknown>,
  status: number,
  shouldSetCookie: boolean,
  cookieValue: string
) => {
  const response = NextResponse.json(payload, { status });
  if (shouldSetCookie && cookieValue) {
    response.cookies.set({
      name: REVIEW_COOKIE_KEY,
      value: cookieValue,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return response;
};

const getPublishedProfile = async (profileId: string) => {
  if (!supabase) {
    return { status: 503, error: 'Servicio no disponible.' } as const;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, access_granted, profile_published, full_name, business_name, public_rating, public_reviews_count')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    return { status: 500, error: error.message || 'No se pudo leer el perfil.' } as const;
  }

  if (!data?.id || !data.access_granted || data.profile_published === false) {
    return { status: 404, error: 'Perfil no disponible.' } as const;
  }

  return {
    status: 200,
    profile: data,
    reviewsCount: Math.max(0, Number(data.public_reviews_count || 0)),
    rating:
      data.public_rating === null || data.public_rating === undefined
        ? null
        : Number(data.public_rating),
  } as const;
};

const normalizeReviewRow = (
  row: any,
  source: 'verified' | 'profile'
) => ({
  id: `${source}:${String(row?.id || '')}`,
  source,
  clientName: String(row?.client_name || row?.visitor_name || '').trim() || 'Cliente UrbanFix',
  rating: Math.max(1, Math.min(5, Math.round(Number(row?.rating || 5)))),
  comment: String(row?.comment || '').trim(),
  submittedAt: String(row?.submitted_at || row?.updated_at || ''),
});

const loadReviews = async (profileId: string, sessionKey: string) => {
  if (!supabase) {
    return { reviews: [], ownReview: null, unavailable: true } as const;
  }

  const verifiedResult = await supabase
    .from('quote_feedback_reviews')
    .select('id, client_name, rating, comment, submitted_at, updated_at')
    .eq('technician_id', profileId)
    .eq('is_public', true)
    .order('submitted_at', { ascending: false })
    .limit(8);

  const profileResult = await supabase
    .from('profile_public_reviews')
    .select('id, visitor_name, rating, comment, submitted_at, updated_at')
    .eq('technician_id', profileId)
    .eq('is_public', true)
    .order('submitted_at', { ascending: false })
    .limit(8);

  const ownResult = await supabase
    .from('profile_public_reviews')
    .select('id, visitor_name, rating, comment, submitted_at, updated_at')
    .eq('technician_id', profileId)
    .eq('session_key', sessionKey)
    .maybeSingle();

  const directUnavailable =
    Boolean(profileResult.error && isMissingReviewsMigration(profileResult.error.message || '')) ||
    Boolean(ownResult.error && isMissingReviewsMigration(ownResult.error.message || ''));

  const verifiedRows =
    verifiedResult.error && isMissingReviewsMigration(verifiedResult.error.message || '')
      ? []
      : verifiedResult.data || [];
  const profileRows = directUnavailable ? [] : profileResult.data || [];

  const reviews = [...verifiedRows.map((row) => normalizeReviewRow(row, 'verified')), ...profileRows.map((row) => normalizeReviewRow(row, 'profile'))]
    .filter((row) => row.comment)
    .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
    .slice(0, 6);

  const countableReviews = [
    ...verifiedRows.map((row) => normalizeReviewRow(row, 'verified')),
    ...profileRows.map((row) => normalizeReviewRow(row, 'profile')),
  ].filter((row) => Number.isFinite(row.rating) && row.rating >= 1);
  const reviewsCount = countableReviews.length;
  const rating =
    reviewsCount > 0
      ? Number((countableReviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount).toFixed(1))
      : null;

  const ownReview = directUnavailable || ownResult.error || !ownResult.data
    ? null
    : normalizeReviewRow(ownResult.data, 'profile');

  return {
    reviews,
    reviewsCount,
    rating,
    ownReview,
    unavailable: directUnavailable,
  } as const;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const profileId = String(resolvedParams?.id || '').trim();
  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  const { key: sessionKey, created } = await getOrCreateSessionKey();
  const profileState = await getPublishedProfile(profileId);
  if (profileState.status !== 200) {
    return buildResponse({ error: profileState.error }, profileState.status, created, sessionKey);
  }

  const reviewState = await loadReviews(profileId, sessionKey);
  return buildResponse(
    {
      profileId,
      reviewsCount: reviewState.reviewsCount || profileState.reviewsCount,
      rating: reviewState.rating ?? profileState.rating,
      reviews: reviewState.reviews,
      ownReview: reviewState.ownReview,
      unavailable: reviewState.unavailable,
    },
    200,
    created,
    sessionKey
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'profile-comment',
    max: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status, headers: rateLimit.headers });
  }

  const resolvedParams = await params;
  const profileId = String(resolvedParams?.id || '').trim();
  if (!isUuid(profileId)) {
    return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
  }

  const { key: sessionKey, created } = await getOrCreateSessionKey();
  const profileState = await getPublishedProfile(profileId);
  if (profileState.status !== 200) {
    return buildResponse({ error: profileState.error }, profileState.status, created, sessionKey);
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 8 * 1024 });
  if (!bodyResult.ok) {
    return buildResponse({ error: bodyResult.error }, bodyResult.status, created, sessionKey);
  }

  const rating = Math.max(1, Math.min(5, Math.round(Number(bodyResult.body?.rating || 5))));
  const clientName = String(bodyResult.body?.clientName || '').trim().replace(/\s+/g, ' ').slice(0, 90);
  const comment = String(bodyResult.body?.comment || '').trim().replace(/\s+/g, ' ').slice(0, 700);

  if (comment.length < 4) {
    return buildResponse({ error: 'Escribe un comentario breve para publicar la reseña.' }, 400, created, sessionKey);
  }

  if (!supabase) {
    return buildResponse({ error: 'Servicio no disponible.' }, 503, created, sessionKey);
  }

  const payload = {
    technician_id: profileId,
    session_key: sessionKey,
    visitor_name: clientName || null,
    rating,
    comment,
    is_public: true,
    referrer: (request.headers.get('referer') || '').slice(0, 240),
    user_agent: (request.headers.get('user-agent') || '').slice(0, 240),
  };

  const { data, error } = await supabase
    .from('profile_public_reviews')
    .upsert(payload, { onConflict: 'technician_id,session_key' })
    .select('id, visitor_name, rating, comment, submitted_at, updated_at')
    .maybeSingle();

  if (error) {
    const status = isMissingReviewsMigration(error.message || '') ? 503 : 500;
    return buildResponse(
      { error: error.message || 'No se pudo guardar la reseña.', unavailable: status === 503 },
      status,
      created,
      sessionKey
    );
  }

  const nextProfileState = await getPublishedProfile(profileId);
  const reviewState = await loadReviews(profileId, sessionKey);

  return buildResponse(
    {
      ok: true,
      profileId,
      reviewsCount:
        reviewState.reviewsCount ||
        (nextProfileState.status === 200 ? nextProfileState.reviewsCount : profileState.reviewsCount),
      rating: reviewState.rating ?? (nextProfileState.status === 200 ? nextProfileState.rating : profileState.rating),
      review: data ? normalizeReviewRow(data, 'profile') : null,
      reviews: reviewState.reviews,
      ownReview: reviewState.ownReview,
      unavailable: false,
    },
    200,
    created,
    sessionKey
  );
}
