import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

const VERCEL_ANALYTICS_URL = 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate';
const PRODUCTION_FILTER = "environment eq 'production'";
const PUBLIC_TRAFFIC_FILTER = [
  "not startswith(requestPath, '/admin')",
  "not startswith(requestPath, '/api')",
  "not startswith(requestPath, '/auth')",
].join(' and ');

type VercelAnalyticsRow = Record<string, unknown> & {
  pageviews?: number;
  visitors?: number;
};

const formatDate = (value: Date) => value.toISOString().split('T')[0];

const parseDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const escapeFilterValue = (value: string) => value.replace(/'/g, "''");

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'https://www.urbanfix.com.ar');
    return parsed.pathname || '/';
  } catch {
    const withoutQuery = trimmed.split('?')[0].split('#')[0];
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }
};

const joinFilters = (...filters: Array<string | null | undefined>) =>
  filters.filter(Boolean).map((filter) => `(${filter})`).join(' and ');

const asRows = (payload: unknown): VercelAnalyticsRow[] => {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? (data as VercelAnalyticsRow[]) : [];
};

const sumMetrics = (rows: VercelAnalyticsRow[]) =>
  rows.reduce<{ pageviews: number; visitors: number }>(
    (total, row) => ({
      pageviews: total.pageviews + Number(row.pageviews || 0),
      visitors: total.visitors + Number(row.visitors || 0),
    }),
    { pageviews: 0, visitors: 0 }
  );

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  if (!(await ensureAdmin(user.id))) {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const accessToken = process.env.VERCEL_ANALYTICS_ACCESS_TOKEN || '';
  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID || '';
  const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID || '';
  const teamSlug = process.env.VERCEL_ANALYTICS_TEAM_SLUG || '';
  const missing = [
    !accessToken ? 'VERCEL_ANALYTICS_ACCESS_TOKEN' : '',
    !projectId ? 'VERCEL_ANALYTICS_PROJECT_ID' : '',
  ].filter(Boolean);

  if (missing.length > 0) {
    return NextResponse.json({
      configured: false,
      status: 'not_configured',
      missing,
      message: 'Falta conectar la API de Web Analytics de Vercel.',
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedDays = Number(searchParams.get('days') || 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const requestedEnd = parseDate(searchParams.get('end'));
  const end = requestedEnd || new Date();
  const requestedStart = parseDate(searchParams.get('start'));
  const start = requestedStart || new Date(end);
  if (!requestedStart) start.setUTCDate(start.getUTCDate() - (days - 1));
  if (start.getTime() > end.getTime()) {
    return NextResponse.json({ error: 'El inicio del periodo no puede ser posterior al final.' }, { status: 400 });
  }

  const since = formatDate(start);
  const until = formatDate(end);
  const selectedPath = normalizePath(searchParams.get('path') || '');
  const pathFilter = selectedPath
    ? `requestPath eq '${escapeFilterValue(selectedPath)}'`
    : '';
  const allFilter = joinFilters(PRODUCTION_FILTER, pathFilter);
  const publicFilter = joinFilters(PRODUCTION_FILTER, PUBLIC_TRAFFIC_FILTER, pathFilter);

  const queryAggregate = async (by: string, filter = '', limit?: number) => {
    const url = new URL(VERCEL_ANALYTICS_URL);
    url.searchParams.set('projectId', projectId);
    url.searchParams.append('by', by);
    url.searchParams.set('since', since);
    url.searchParams.set('until', until);
    if (teamId) url.searchParams.set('teamId', teamId);
    if (!teamId && teamSlug) url.searchParams.set('slug', teamSlug);
    if (filter) url.searchParams.set('filter', filter);
    if (limit) url.searchParams.set('limit', String(limit));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (payload as { error?: { message?: string } | string })?.error instanceof Object
          ? (payload as { error?: { message?: string } }).error?.message
          : String((payload as { error?: string })?.error || 'No se pudo consultar Vercel.');
      throw new Error(message || 'No se pudo consultar Vercel.');
    }
    return asRows(payload);
  };

  try {
    const [allDaily, publicDaily, topPages, countries, devices] = await Promise.all([
      queryAggregate('day', allFilter),
      queryAggregate('day', publicFilter),
      queryAggregate('requestPath', publicFilter, 12),
      queryAggregate('country', publicFilter, 12),
      queryAggregate('deviceType', publicFilter, 8),
    ]);

    return NextResponse.json({
      configured: true,
      status: 'ready',
      range: { start: since, end: until, days },
      selectedPath: selectedPath || null,
      totals: {
        all: sumMetrics(allDaily),
        public: sumMetrics(publicDaily),
      },
      series: publicDaily.map((row) => ({
        date: String(row.day || row.timestamp || ''),
        pageviews: Number(row.pageviews || 0),
        visitors: Number(row.visitors || 0),
      })),
      topPages: topPages.map((row) => ({
        path: String(row.requestPath || '/'),
        pageviews: Number(row.pageviews || 0),
        visitors: Number(row.visitors || 0),
      })),
      countries: countries.map((row) => ({
        code: String(row.country || 'Sin pais'),
        pageviews: Number(row.pageviews || 0),
        visitors: Number(row.visitors || 0),
      })),
      devices: devices.map((row) => ({
        type: String(row.deviceType || 'Desconocido'),
        pageviews: Number(row.pageviews || 0),
        visitors: Number(row.visitors || 0),
      })),
      excludedPaths: ['/admin', '/api', '/auth'],
      notes: {
        productionOnly: true,
        anonymous: true,
        visitorWindow: 'daily',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo consultar Vercel.';
    return NextResponse.json(
      {
        configured: true,
        status: 'error',
        error: message,
      },
      { status: 502 }
    );
  }
}
