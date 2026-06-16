import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { buildTechnicianPath } from '@/lib/seo/technician-profile';
import { getServiceRoleClient } from '@/lib/supabase/server';

const VISIT_COOKIE_KEY = 'urbanfix_profile_visit_sid';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const PROFILE_VISIT_EVENT = 'profile_visit';

const supabase = getServiceRoleClient();

type VisitAnalyticsRow = {
  session_id?: string | null;
  user_id?: string | null;
};

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

const countUniqueVisitors = (rows: VisitAnalyticsRow[] | null | undefined) => {
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
  const existing = String(cookieStore.get(VISIT_COOKIE_KEY)?.value || '').trim();
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
      name: VISIT_COOKIE_KEY,
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

const getVisitsCount = async (path: string) => {
  if (!supabase) return { visitsCount: 0, unavailable: true } as const;

  const { data, error } = await supabase
    .from('analytics_events')
    .select('session_id, user_id')
    .eq('event_type', 'funnel')
    .eq('event_name', PROFILE_VISIT_EVENT)
    .eq('path', path)
    .range(0, 9999);

  if (!error) {
    return { visitsCount: countUniqueVisitors(data), unavailable: false } as const;
  }

  if (isAnalyticsSchemaFallback(error.message || '')) {
    const legacyResult = await supabase
      .from('analytics_events')
      .select('session_id, user_id')
      .eq('event_type', 'funnel')
      .eq('path', path)
      .range(0, 9999);

    if (!legacyResult.error) {
      return { visitsCount: countUniqueVisitors(legacyResult.data), unavailable: false } as const;
    }
  }

  if (isMissingAnalytics(error.message || '')) {
    return { visitsCount: 0, unavailable: true } as const;
  }

  return { visitsCount: 0, unavailable: true } as const;
};

const hasVisitorSeenProfile = async (path: string, sessionKey: string) => {
  if (!supabase) return { visited: false, unavailable: true } as const;

  const { count, error } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'funnel')
    .eq('event_name', PROFILE_VISIT_EVENT)
    .eq('path', path)
    .eq('session_id', sessionKey);

  if (!error) {
    return { visited: Number(count || 0) > 0, unavailable: false } as const;
  }

  if (isAnalyticsSchemaFallback(error.message || '')) {
    const legacyResult = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'funnel')
      .eq('path', path)
      .eq('session_id', sessionKey);

    if (!legacyResult.error) {
      return { visited: Number(legacyResult.count || 0) > 0, unavailable: false } as const;
    }
  }

  if (isMissingAnalytics(error.message || '')) {
    return { visited: false, unavailable: true } as const;
  }

  return { visited: false, unavailable: false, error: error.message || 'No se pudo consultar la visita.' } as const;
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

  const visitsState = await getVisitsCount(profileState.path);
  return buildResponse(
    {
      profileId,
      visitsCount: visitsState.visitsCount,
      unavailable: visitsState.unavailable,
      countMode: 'unique_visitors',
    },
    200,
    created,
    sessionKey
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'profile-visit',
    max: 120,
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

  if (supabase) {
    const previousVisit = await hasVisitorSeenProfile(profileState.path, sessionKey);
    if ('error' in previousVisit && previousVisit.error) {
      return buildResponse({ error: previousVisit.error }, 500, created, sessionKey);
    }

    if (previousVisit.visited) {
      const visitsState = await getVisitsCount(profileState.path);
      return buildResponse(
        {
          profileId,
          visitsCount: visitsState.visitsCount,
          unavailable: visitsState.unavailable,
          alreadyCounted: true,
          countMode: 'unique_visitors',
        },
        200,
        created,
        sessionKey
      );
    }

    const referrer = (request.headers.get('referer') || '').slice(0, 240);
    const userAgent = (request.headers.get('user-agent') || '').slice(0, 240);
    const payloadWithContext = {
      session_id: sessionKey,
      event_type: 'funnel',
      event_name: PROFILE_VISIT_EVENT,
      event_context: {
        profileId,
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
      return buildResponse({ error: error.message || 'No se pudo registrar la visita.' }, 500, created, sessionKey);
    }
  }

  const visitsState = await getVisitsCount(profileState.path);
  return buildResponse(
    {
      profileId,
      visitsCount: visitsState.visitsCount,
      unavailable: visitsState.unavailable,
      alreadyCounted: false,
      countMode: 'unique_visitors',
    },
    200,
    created,
    sessionKey
  );
}
