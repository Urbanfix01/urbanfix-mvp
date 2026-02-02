import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const getAuthUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const eventType = (body?.event_type || '').toString();
  const path = (body?.path || '').toString().slice(0, 180);
  const sessionId = (body?.session_id || '').toString().slice(0, 120);
  const durationMs = Number(body?.duration_ms || 0);
  const referrer = (body?.referrer || '').toString().slice(0, 240);
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 240);

  if (!eventType || !path || !sessionId) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  if (!['page_view', 'page_duration', 'heartbeat'].includes(eventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }

  if (eventType === 'page_duration' && (!Number.isFinite(durationMs) || durationMs <= 0)) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }

  const user = await getAuthUser(request);

  const { error } = await supabase.from('analytics_events').insert({
    user_id: user?.id || null,
    session_id: sessionId,
    event_type: eventType,
    path,
    duration_ms: eventType === 'page_duration' ? Math.min(24 * 60 * 60 * 1000, durationMs) : null,
    referrer,
    user_agent: userAgent,
  });

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
