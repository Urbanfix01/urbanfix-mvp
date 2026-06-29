import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { getServiceRoleClient } from '@/lib/supabase/server';

const supabase = getServiceRoleClient();

const allowedEventTypes = new Set(['page_view', 'page_duration', 'heartbeat', 'funnel']);

const sanitizeEventName = (value: unknown) => {
  const raw = (value || '').toString().trim();
  if (!raw) return '';
  return raw.slice(0, 80);
};

const sanitizeEventContext = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).slice(0, 12);
  const context: Record<string, string | number | boolean> = {};
  for (const [key, raw] of entries) {
    const nextKey = key.toString().trim().slice(0, 60);
    if (!nextKey) continue;

    if (typeof raw === 'string') {
      context[nextKey] = raw.slice(0, 180);
      continue;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      context[nextKey] = raw;
      continue;
    }
    if (typeof raw === 'boolean') {
      context[nextKey] = raw;
      continue;
    }
  }
  return context;
};

const sanitizeGeoText = (value: string | null) => {
  const raw = (value || '').toString().trim();
  if (!raw || raw.toLowerCase() === 'unknown') return '';
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' ')).trim().slice(0, 120);
  } catch {
    return raw.slice(0, 120);
  }
};

const sanitizeGeoNumber = (value: string | null) => {
  const parsed = Number((value || '').toString().trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const getGeoContext = (request: NextRequest) => {
  const country = sanitizeGeoText(request.headers.get('x-vercel-ip-country'));
  const region = sanitizeGeoText(request.headers.get('x-vercel-ip-country-region'));
  const city = sanitizeGeoText(request.headers.get('x-vercel-ip-city'));
  const timezone = sanitizeGeoText(request.headers.get('x-vercel-ip-timezone'));
  const latitude = sanitizeGeoNumber(request.headers.get('x-vercel-ip-latitude'));
  const longitude = sanitizeGeoNumber(request.headers.get('x-vercel-ip-longitude'));
  const context: Record<string, string | number> = {};

  if (country) context.country = country;
  if (region) context.region = region;
  if (city) context.city = city;
  if (timezone) context.timezone = timezone;
  if (latitude !== null) context.latitude = latitude;
  if (longitude !== null) context.longitude = longitude;

  return context;
};

const getAuthUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

export async function POST(request: NextRequest) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'analytics-track',
    max: 120,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status, headers: rateLimit.headers });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 8 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const body = bodyResult.body;

  const eventType = (body?.event_type || '').toString();
  const path = (body?.path || '').toString().slice(0, 180);
  const sessionId = (body?.session_id || '').toString().slice(0, 120);
  const durationMs = Number(body?.duration_ms || 0);
  const eventName = sanitizeEventName(body?.event_name);
  const eventContext = sanitizeEventContext(body?.event_context);
  const referrer = (body?.referrer || '').toString().slice(0, 240);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 240);
  const geoContext = getGeoContext(request);
  const analyticsContext = {
    ...(eventType === 'funnel' ? eventContext : {}),
    ...(Object.keys(geoContext).length ? { geo: geoContext } : {}),
  };

  if (!eventType || !path || !sessionId) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  if (!allowedEventTypes.has(eventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }

  if (eventType === 'page_duration' && (!Number.isFinite(durationMs) || durationMs <= 0)) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }

  if (eventType === 'funnel' && !eventName) {
    return NextResponse.json({ error: 'Missing event_name for funnel event' }, { status: 400 });
  }

  const user = await getAuthUser(request);

  const payloadWithFunnelColumns = {
    user_id: user?.id || null,
    session_id: sessionId,
    event_type: eventType,
    event_name: eventType === 'funnel' ? eventName : null,
    event_context: analyticsContext,
    path,
    duration_ms: eventType === 'page_duration' ? Math.min(24 * 60 * 60 * 1000, durationMs) : null,
    referrer,
    user_agent: userAgent,
  };

  let { error } = await supabase.from('analytics_events').insert(payloadWithFunnelColumns);

  // Backward compatibility while remote schema catches up with event_name/event_context columns.
  if (
    error &&
    /event_name|event_context|column.*does not exist|schema cache/i.test(error.message || '')
  ) {
    const { error: legacyError } = await supabase.from('analytics_events').insert({
      user_id: user?.id || null,
      session_id: sessionId,
      event_type: eventType,
      path,
      duration_ms: eventType === 'page_duration' ? Math.min(24 * 60 * 60 * 1000, durationMs) : null,
      referrer,
      user_agent: userAgent,
    });
    error = legacyError;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (user?.id && (eventType === 'page_view' || eventType === 'heartbeat')) {
    const now = new Date().toISOString();
    await supabase
      .from('profiles')
      .update({ last_seen_at: now, last_seen_path: path })
      .eq('id', user.id);
  }

  return NextResponse.json({ ok: true });
}
