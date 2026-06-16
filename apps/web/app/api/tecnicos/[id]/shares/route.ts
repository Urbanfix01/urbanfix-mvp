import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { buildTechnicianPath } from '@/lib/seo/technician-profile';
import { getServiceRoleClient } from '@/lib/supabase/server';

const SHARE_COOKIE_KEY = 'urbanfix_profile_share_sid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const PROFILE_SHARE_EVENT = 'profile_share';
const SHARE_CHANNELS = new Set(['whatsapp', 'facebook', 'copy', 'native', 'other']);

const supabase = getServiceRoleClient();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isAnalyticsSchemaFallback = (message: string) => {
  const lower = String(message || '').toLowerCase();
  return lower.includes('event_name') || lower.includes('event_context') || lower.includes('schema cache');
};

const isMissingAnalytics = (message: string) => {
  const lower = String(message || '').toLowerCase();
  return lower.includes('analytics_events') || lower.includes('does not exist');
};

type ShareAnalyticsRow = {
  session_id?: string | null;
  user_id?: string | null;
};

const countUniqueVisitors = (rows: ShareAnalyticsRow[] | null | undefined) => {
  const visitors = new Set<string>();
  (rows || []).forEach((row, index) => {
    const userId = String(row?.user_id || '').trim();
    const sessionId = String(row?.session_id || '').trim();
    if (userId) {
      visitors.add(`user:${userId}`);
      return;
    }
    if (sessionId) {
      visitors.add(`session:${sessionId}`);
      return;
    }
    visitors.add(`event:${index}`);
  });
  return visitors.size;
};

const getOrCreateSessionKey = async () => {
  const cookieStore = await cookies();
  const existing = String(cookieStore.get(SHARE_COOKIE_KEY)?.value || '').trim();
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
      name: SHARE_COOKIE_KEY,
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
    .select('id, access_granted, profile_published, full_name, business_name')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    return { status: 500, error: error.message || 'No se pudo leer el perfil.' } as const;
  }

  if (!data?.id || !data.access_granted || data.profile_published === false) {
    return { status: 404, error: 'Perfil no disponible.' } as const;
  }

  const displayName = String(data.business_name || data.full_name || 'Tecnico UrbanFix').trim();
  return {
    status: 200,
    profile: data,
    displayName,
    path: buildTechnicianPath(profileId, displayName),
  } as const;
};

const getSharesCount = async (path: string) => {
  if (!supabase) return { sharesCount: 0, unavailable: true } as const;

  const { data, error } = await supabase
    .from('analytics_events')
    .select('session_id, user_id')
    .eq('event_type', 'funnel')
    .eq('event_name', PROFILE_SHARE_EVENT)
    .eq('path', path)
    .range(0, 9999);

  if (!error) {
    return { sharesCount: countUniqueVisitors(data), unavailable: false } as const;
  }

  if (isAnalyticsSchemaFallback(error.message || '')) {
    const legacyResult = await supabase
      .from('analytics_events')
      .select('session_id, user_id')
      .eq('event_type', 'funnel')
      .eq('path', path)
      .range(0, 9999);

    if (!legacyResult.error) {
      return { sharesCount: countUniqueVisitors(legacyResult.data), unavailable: false } as const;
    }
  }

  if (isMissingAnalytics(error.message || '')) {
    return { sharesCount: 0, unavailable: true } as const;
  }

  return { sharesCount: 0, unavailable: true } as const;
};

const hasVisitorSharedProfile = async (path: string, sessionKey: string) => {
  if (!supabase) return { shared: false, unavailable: true } as const;

  const { count, error } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'funnel')
    .eq('event_name', PROFILE_SHARE_EVENT)
    .eq('path', path)
    .eq('session_id', sessionKey);

  if (!error) {
    return { shared: Number(count || 0) > 0, unavailable: false } as const;
  }

  if (isAnalyticsSchemaFallback(error.message || '')) {
    const legacyResult = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'funnel')
      .eq('path', path)
      .eq('session_id', sessionKey);

    if (!legacyResult.error) {
      return { shared: Number(legacyResult.count || 0) > 0, unavailable: false } as const;
    }
  }

  if (isMissingAnalytics(error.message || '')) {
    return { shared: false, unavailable: true } as const;
  }

  return { shared: false, unavailable: false, error: error.message || 'No se pudo consultar el compartido.' } as const;
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

  const sharesState = await getSharesCount(profileState.path);
  return buildResponse(
    {
      profileId,
      sharesCount: sharesState.sharesCount,
      unavailable: sharesState.unavailable,
      countMode: 'unique_visitors',
    },
    200,
    created,
    sessionKey
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'profile-share',
    max: 90,
    windowMs: 60 * 1000,
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

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 4 * 1024, allowEmpty: true });
  if (!bodyResult.ok) {
    return buildResponse({ error: bodyResult.error }, bodyResult.status, created, sessionKey);
  }

  const requestedChannel = String(bodyResult.body?.channel || 'other').toLowerCase().trim();
  const channel = SHARE_CHANNELS.has(requestedChannel) ? requestedChannel : 'other';
  const referrer = (request.headers.get('referer') || '').slice(0, 240);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 240);

  if (supabase) {
    const previousShare = await hasVisitorSharedProfile(profileState.path, sessionKey);
    if ('error' in previousShare && previousShare.error) {
      return buildResponse({ error: previousShare.error }, 500, created, sessionKey);
    }

    if (previousShare.shared) {
      const sharesState = await getSharesCount(profileState.path);
      return buildResponse(
        {
          profileId,
          sharesCount: sharesState.sharesCount,
          unavailable: sharesState.unavailable,
          alreadyCounted: true,
          countMode: 'unique_visitors',
        },
        200,
        created,
        sessionKey
      );
    }

    const payloadWithContext = {
      session_id: sessionKey,
      event_type: 'funnel',
      event_name: PROFILE_SHARE_EVENT,
      event_context: {
        profileId,
        channel,
      },
      path: profileState.path,
      duration_ms: null,
      referrer,
      user_agent: userAgent,
    };

    let { error } = await supabase.from('analytics_events').insert(payloadWithContext);
    if (error && isAnalyticsSchemaFallback(error.message || '')) {
      const legacyResult = await supabase.from('analytics_events').insert({
        session_id: sessionKey,
        event_type: 'funnel',
        path: profileState.path,
        duration_ms: null,
        referrer,
        user_agent: userAgent,
      });
      error = legacyResult.error;
    }

    if (error && !isMissingAnalytics(error.message || '')) {
      return buildResponse({ error: error.message || 'No se pudo registrar el compartido.' }, 500, created, sessionKey);
    }
  }

  const sharesState = await getSharesCount(profileState.path);
  return buildResponse(
    {
      profileId,
      sharesCount: sharesState.sharesCount,
      unavailable: sharesState.unavailable,
      alreadyCounted: false,
      countMode: 'unique_visitors',
    },
    200,
    created,
    sessionKey
  );
}
