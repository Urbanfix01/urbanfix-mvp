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
const startOfDay = (value: Date) => {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
};
const endOfDay = (value: Date) => {
  const copy = new Date(value);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const getProfileLabel = (profile: any, fallback?: string) =>
  profile?.business_name || profile?.full_name || profile?.email || fallback || 'Sin perfil';

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
  const rawDays = Number(params.get('days') || 30);
  const days = Math.min(90, Math.max(1, Number.isFinite(rawDays) ? rawDays : 30));
  const path = (params.get('path') || '').trim();
  const userId = (params.get('userId') || '').trim();
  const startParam = (params.get('start') || '').trim();
  const endParam = (params.get('end') || '').trim();

  const now = new Date();
  let startDate = startParam ? new Date(startParam) : new Date(now);
  let endDate = endParam ? new Date(endParam) : new Date(now);
  if (!startParam) {
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }
  if (startDate > endDate) {
    const swap = startDate;
    startDate = endDate;
    endDate = swap;
  }
  startDate = startOfDay(startDate);
  endDate = endOfDay(endDate);

  const rangeDays =
    Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
  const prevEnd = endOfDay(new Date(startDate.getTime() - 86400000));
  const prevStart = startOfDay(new Date(prevEnd.getTime() - (rangeDays - 1) * 86400000));

  const applyFilters = (query: any) => {
    let next = query;
    if (path) next = next.eq('path', path);
    if (userId) next = next.eq('user_id', userId);
    return next;
  };

  let query = supabase
    .from('analytics_events')
    .select('event_type, path, duration_ms, created_at, session_id, user_id')
    .in('event_type', ['page_view', 'page_duration'])
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);

  let prevQuery = supabase
    .from('analytics_events')
    .select('event_type, duration_ms, created_at, session_id, user_id')
    .in('event_type', ['page_view', 'page_duration'])
    .gte('created_at', prevStart.toISOString())
    .lte('created_at', prevEnd.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);

  let funnelQuery = supabase
    .from('analytics_events')
    .select('event_name, created_at, session_id, user_id, path')
    .eq('event_type', 'funnel')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);

  let prevFunnelQuery = supabase
    .from('analytics_events')
    .select('event_name, created_at, session_id, user_id, path')
    .eq('event_type', 'funnel')
    .gte('created_at', prevStart.toISOString())
    .lte('created_at', prevEnd.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000);

  query = applyFilters(query);
  prevQuery = applyFilters(prevQuery);
  funnelQuery = applyFilters(funnelQuery);
  prevFunnelQuery = applyFilters(prevFunnelQuery);

  const [{ data: events, error }, { data: prevEvents, error: prevError }] = await Promise.all([
    query,
    prevQuery,
  ]);

  if (error || prevError) {
    return NextResponse.json({ error: error?.message || prevError?.message }, { status: 500 });
  }

  let funnelEvents: any[] = [];
  let prevFunnelEvents: any[] = [];
  const [{ data: funnelData, error: funnelError }, { data: prevFunnelData, error: prevFunnelError }] =
    await Promise.all([funnelQuery, prevFunnelQuery]);

  if (funnelError || prevFunnelError) {
    const funnelMessage = funnelError?.message || prevFunnelError?.message || '';
    const isSchemaLag =
      /event_name|event_context|column.*does not exist|schema cache/i.test(funnelMessage);
    if (!isSchemaLag) {
      return NextResponse.json({ error: funnelMessage }, { status: 500 });
    }
  } else {
    funnelEvents = funnelData || [];
    prevFunnelEvents = prevFunnelData || [];
  }

  const seriesMap = new Map<string, { views: number; durationMs: number }>();
  const routeMap = new Map<string, { views: number; durationMs: number; durationCount: number }>();
  const userMap = new Map<
    string,
    { views: number; durationMs: number; durationCount: number; sessions: Set<string>; lastSeen?: string }
  >();
  const sessions = new Set<string>();
  const users = new Set<string>();
  let totalViews = 0;
  let totalDurationMs = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    seriesMap.set(formatDate(cursor), { views: 0, durationMs: 0 });
  }

  (events || []).forEach((event: any) => {
    const dateKey = formatDate(new Date(event.created_at));
    const series = seriesMap.get(dateKey) || { views: 0, durationMs: 0 };
    if (event.event_type === 'page_view') {
      series.views += 1;
      totalViews += 1;
      if (event.session_id) sessions.add(event.session_id);
      if (event.user_id) users.add(event.user_id);
      if (event.path) {
        const current = routeMap.get(event.path) || {
          views: 0,
          durationMs: 0,
          durationCount: 0,
        };
        current.views += 1;
        routeMap.set(event.path, current);
      }
      if (event.user_id) {
        const current = userMap.get(event.user_id) || {
          views: 0,
          durationMs: 0,
          durationCount: 0,
          sessions: new Set<string>(),
        };
        current.views += 1;
        if (event.session_id) current.sessions.add(event.session_id);
        if (!current.lastSeen || new Date(event.created_at) > new Date(current.lastSeen)) {
          current.lastSeen = event.created_at;
        }
        userMap.set(event.user_id, current);
      }
    }
    if (event.event_type === 'page_duration') {
      const duration = Number(event.duration_ms || 0);
      if (Number.isFinite(duration) && duration > 0) {
        series.durationMs += duration;
        totalDurationMs += duration;
        if (event.path) {
          const current = routeMap.get(event.path) || {
            views: 0,
            durationMs: 0,
            durationCount: 0,
          };
          current.durationMs += duration;
          current.durationCount += 1;
          routeMap.set(event.path, current);
        }
        if (event.user_id) {
          const current = userMap.get(event.user_id) || {
            views: 0,
            durationMs: 0,
            durationCount: 0,
            sessions: new Set<string>(),
          };
          current.durationMs += duration;
          current.durationCount += 1;
          userMap.set(event.user_id, current);
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

  const topScreens = Array.from(routeMap.entries())
    .map(([pathName, stats]) => ({
      path: pathName,
      total_minutes: stats.durationMs / 1000 / 60,
      avg_seconds: stats.durationCount ? stats.durationMs / 1000 / stats.durationCount : 0,
      views: stats.views,
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes)
    .slice(0, 5);

  const topRoutes = Array.from(routeMap.entries())
    .map(([pathName, stats]) => ({
      path: pathName,
      views: stats.views,
      total_minutes: stats.durationMs / 1000 / 60,
      avg_seconds: stats.durationCount ? stats.durationMs / 1000 / stats.durationCount : 0,
    }))
    .sort((a, b) => b.views - a.views || b.total_minutes - a.total_minutes)
    .slice(0, 8);

  const userStats = Array.from(userMap.entries()).map(([id, stats]) => ({
    user_id: id,
    views: stats.views,
    sessions: stats.sessions.size,
    total_minutes: stats.durationMs / 1000 / 60,
    avg_seconds: stats.durationCount ? stats.durationMs / 1000 / stats.durationCount : 0,
    last_seen: stats.lastSeen || null,
  }));
  const topUserIds = userStats
    .slice()
    .sort((a, b) => b.total_minutes - a.total_minutes || b.views - a.views)
    .slice(0, 50)
    .map((item) => item.user_id);

  let profilesById: Record<string, any> = {};
  if (topUserIds.length) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, email')
      .in('id', topUserIds);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    profilesById = (profileRows || []).reduce((acc: Record<string, any>, row: any) => {
      acc[row.id] = row;
      return acc;
    }, {});
  }

  const topUsers = userStats
    .map((item) => ({
      ...item,
      label: getProfileLabel(profilesById[item.user_id], item.user_id),
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes || b.views - a.views)
    .slice(0, 8);

  let prevViews = 0;
  let prevDurationMs = 0;
  const prevSessions = new Set<string>();
  const prevUsers = new Set<string>();

  (prevEvents || []).forEach((event: any) => {
    if (event.event_type === 'page_view') {
      prevViews += 1;
      if (event.session_id) prevSessions.add(event.session_id);
      if (event.user_id) prevUsers.add(event.user_id);
    }
    if (event.event_type === 'page_duration') {
      const duration = Number(event.duration_ms || 0);
      if (Number.isFinite(duration) && duration > 0) {
        prevDurationMs += duration;
      }
    }
  });

  const funnelCounts = new Map<string, { count: number; sessions: Set<string> }>();
  const prevFunnelCounts = new Map<string, { count: number; sessions: Set<string> }>();

  (funnelEvents || []).forEach((event: any) => {
    const key = (event.event_name || 'unknown').toString().slice(0, 80);
    if (!key) return;
    const current = funnelCounts.get(key) || { count: 0, sessions: new Set<string>() };
    current.count += 1;
    if (event.session_id) current.sessions.add(event.session_id);
    funnelCounts.set(key, current);
  });

  (prevFunnelEvents || []).forEach((event: any) => {
    const key = (event.event_name || 'unknown').toString().slice(0, 80);
    if (!key) return;
    const current = prevFunnelCounts.get(key) || { count: 0, sessions: new Set<string>() };
    current.count += 1;
    if (event.session_id) current.sessions.add(event.session_id);
    prevFunnelCounts.set(key, current);
  });

  const funnelSteps = [
    { key: 'home_audience_tecnicos', label: 'Audiencia: Tecnicos' },
    { key: 'home_audience_empresas', label: 'Audiencia: Empresas' },
    { key: 'home_audience_clientes', label: 'Audiencia: Clientes' },
    { key: 'home_open_guia_precios', label: 'Apertura de guia de precios' },
    { key: 'home_register_start', label: 'Registro tecnico desde home' },
    { key: 'home_register_start_from_empresas', label: 'Registro tecnico desde empresas' },
    { key: 'home_download_android_click', label: 'Click descarga Android' },
  ];

  const funnel = {
    totalEvents: Array.from(funnelCounts.values()).reduce((sum, item) => sum + item.count, 0),
    prevTotalEvents: Array.from(prevFunnelCounts.values()).reduce((sum, item) => sum + item.count, 0),
    steps: funnelSteps.map((step) => ({
      key: step.key,
      label: step.label,
      count: funnelCounts.get(step.key)?.count || 0,
      prevCount: prevFunnelCounts.get(step.key)?.count || 0,
      sessions: funnelCounts.get(step.key)?.sessions.size || 0,
    })),
    topEvents: Array.from(funnelCounts.entries())
      .map(([event_name, stats]) => ({
        event_name,
        count: stats.count,
        sessions: stats.sessions.size,
        prevCount: prevFunnelCounts.get(event_name)?.count || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };

  const totals = {
    views: totalViews,
    minutes: totalDurationMs / 1000 / 60,
    uniqueSessions: sessions.size,
    uniqueUsers: users.size,
  };

  const prevTotals = {
    views: prevViews,
    minutes: prevDurationMs / 1000 / 60,
    uniqueSessions: prevSessions.size,
    uniqueUsers: prevUsers.size,
  };

  return NextResponse.json({
    range: { start: startDate.toISOString(), end: endDate.toISOString(), days: rangeDays },
    previousRange: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
    series,
    topScreens,
    topRoutes,
    topUsers,
    funnel,
    totals,
    prevTotals,
  });
}
