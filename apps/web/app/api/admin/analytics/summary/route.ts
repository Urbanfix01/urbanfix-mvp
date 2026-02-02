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

const ensureAdmin = async (userId: string) => {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('beta_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
};

const formatDate = (value: Date) => value.toISOString().split('T')[0];

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const days = Math.min(90, Math.max(1, Number(params.get('days') || 30)));
  const path = (params.get('path') || '').trim();
  const userId = (params.get('userId') || '').trim();

  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from('analytics_events')
    .select('event_type, path, duration_ms, created_at, session_id, user_id')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);

  if (path) {
    query = query.eq('path', path);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = data || [];
  const seriesMap = new Map<string, { views: number; durationMs: number }>();
  const screenMap = new Map<string, { totalMs: number; count: number; views: number }>();
  const sessions = new Set<string>();
  const users = new Set<string>();

  const startDate = new Date(since);
  const endDate = new Date();
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = formatDate(d);
    seriesMap.set(key, { views: 0, durationMs: 0 });
  }

  events.forEach((event: any) => {
    const dateKey = formatDate(new Date(event.created_at));
    const series = seriesMap.get(dateKey) || { views: 0, durationMs: 0 };
    if (event.event_type === 'page_view') {
      series.views += 1;
      if (event.session_id) sessions.add(event.session_id);
      if (event.user_id) users.add(event.user_id);
      if (event.path) {
        const screen = screenMap.get(event.path) || { totalMs: 0, count: 0, views: 0 };
        screen.views += 1;
        screenMap.set(event.path, screen);
      }
    }
    if (event.event_type === 'page_duration') {
      const duration = Number(event.duration_ms || 0);
      if (Number.isFinite(duration) && duration > 0) {
        series.durationMs += duration;
        if (event.path) {
          const screen = screenMap.get(event.path) || { totalMs: 0, count: 0, views: 0 };
          screen.totalMs += duration;
          screen.count += 1;
          screenMap.set(event.path, screen);
        }
      }
    }
    seriesMap.set(dateKey, series);
  });

  const series = Array.from(seriesMap.entries()).map(([date, stats]) => ({
    date,
    views: stats.views,
    minutes: stats.durationMs / 1000 / 60,
  }));

  const topScreens = Array.from(screenMap.entries())
    .map(([pathName, stats]) => ({
      path: pathName,
      total_minutes: stats.totalMs / 1000 / 60,
      avg_seconds: stats.count ? stats.totalMs / 1000 / stats.count : 0,
      views: stats.views,
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes)
    .slice(0, 5);

  const totals = {
    views: series.reduce((sum, item) => sum + item.views, 0),
    minutes: series.reduce((sum, item) => sum + item.minutes, 0),
    uniqueSessions: sessions.size,
    uniqueUsers: users.size,
  };

  return NextResponse.json({ series, topScreens, totals });
}
