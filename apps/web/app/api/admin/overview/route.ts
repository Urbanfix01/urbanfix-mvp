import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import {
  COUNTRY_SELECTION_OPTIONS,
  getCountryFlagCode,
  normalizeCountryPreference,
} from '@/lib/country-preference';

const parseAmount = (value: any) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanGeoText = (value: any) => String(value || '').trim();

const DEFAULT_ANALYTICS_EXCLUDED_EMAILS = ['info@urbanfix.com', 'eliascastillo237@gmail.com'];
const ANALYTICS_EXCLUDED_EMAILS_ENV = process.env.ADMIN_ANALYTICS_EXCLUDED_EMAILS || '';

const normalizeAnalyticsEmail = (value: any) => cleanGeoText(value).toLowerCase();

const getAnalyticsExcludedEmails = () =>
  new Set(
    [...DEFAULT_ANALYTICS_EXCLUDED_EMAILS, ...ANALYTICS_EXCLUDED_EMAILS_ENV.split(',')]
      .map(normalizeAnalyticsEmail)
      .filter(Boolean)
  );

const addExcludedAnalyticsUserId = (
  target: Set<string>,
  userId: any,
  email: any,
  excludedEmails: Set<string>
) => {
  const id = cleanGeoText(userId);
  const normalizedEmail = normalizeAnalyticsEmail(email);
  if (id && normalizedEmail && excludedEmails.has(normalizedEmail)) {
    target.add(id);
  }
};

const normalizeGeoTextKey = (value: any) =>
  cleanGeoText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const COUNTRY_NAME_BY_CODE = new Map<string, string>(
  COUNTRY_SELECTION_OPTIONS.flatMap((country): [string, string][] => {
    const code = getCountryFlagCode(country);
    return code ? [[code, country]] : [];
  })
);

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  usa: 'Estados Unidos',
  us: 'Estados Unidos',
  'u s': 'Estados Unidos',
  'u.s.': 'Estados Unidos',
  'united states': 'Estados Unidos',
  'united states of america': 'Estados Unidos',
  america: 'Estados Unidos',
  argentina: 'Argentina',
  ar: 'Argentina',
  china: 'China',
  cn: 'China',
  spain: 'Espana',
  espana: 'Espana',
  es: 'Espana',
};

const REGION_NAMES_BY_COUNTRY: Record<string, Record<string, string>> = {
  argentina: {
    A: 'Salta',
    B: 'Buenos Aires',
    C: 'Ciudad Autonoma de Buenos Aires',
    K: 'Catamarca',
    H: 'Chaco',
    U: 'Chubut',
    X: 'Cordoba',
    W: 'Corrientes',
    E: 'Entre Rios',
    P: 'Formosa',
    Y: 'Jujuy',
    L: 'La Pampa',
    F: 'La Rioja',
    M: 'Mendoza',
    N: 'Misiones',
    Q: 'Neuquen',
    R: 'Rio Negro',
    J: 'San Juan',
    D: 'San Luis',
    Z: 'Santa Cruz',
    S: 'Santa Fe',
    G: 'Santiago del Estero',
    V: 'Tierra del Fuego',
    T: 'Tucuman',
  },
  china: {
    BJ: 'Beijing',
  },
  espana: {
    CT: 'Cataluna',
  },
};

const normalizeAnalyticsCountry = (value: any) => {
  const raw = cleanGeoText(value);
  if (!raw) return { label: '', key: '' };

  const upper = raw.toUpperCase();
  const codeLabel = /^[A-Z]{2}$/.test(upper) ? COUNTRY_NAME_BY_CODE.get(upper) : '';
  const aliasLabel = COUNTRY_NAME_ALIASES[normalizeGeoTextKey(raw)];
  const normalizedLabel = codeLabel || aliasLabel || normalizeCountryPreference(raw) || raw;
  const key = normalizeGeoTextKey(normalizedLabel);

  return { label: normalizedLabel, key };
};

const normalizeAnalyticsRegion = (value: any, countryKey: string) => {
  const raw = cleanGeoText(value);
  if (!raw) return '';
  const regionMap = REGION_NAMES_BY_COUNTRY[countryKey];
  if (!regionMap) return raw;
  return regionMap[raw.toUpperCase()] || raw;
};

type GeoBucket = { label: string; views: number; sessions: Set<string> };
type GeoReachBucket = GeoBucket & { users: Set<string> };
type GeoZoneBucket = GeoBucket & {
  users: Set<string>;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
};
type AnalyticsMonthlyReachBucket = {
  monthKey: string;
  label: string;
  accountUsers: Set<string>;
  knownUsers: Set<string>;
  sessions: Set<string>;
  views: number;
  countries: Map<string, GeoReachBucket>;
  cities: Map<string, GeoReachBucket>;
  zones: Map<string, GeoZoneBucket>;
};
type AnalyticsAccountBucket = {
  userId: string;
  sessions: Set<string>;
  deviceSessions: Map<AnalyticsDeviceType, Set<string>>;
  views: number;
  lastSeenAt: string | null;
  lastPath: string;
};
type AnalyticsDeviceType = 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
type GeoCoordinate = { latitude: number; longitude: number };

const ANALYTICS_DEVICE_LABELS: Record<AnalyticsDeviceType, string> = {
  mobile: 'Teléfono',
  tablet: 'Tablet',
  desktop: 'Computadora',
  bot: 'Bot',
  unknown: 'Sin identificar',
};

const getAnalyticsDeviceType = (userAgent?: any): AnalyticsDeviceType => {
  const ua = cleanGeoText(userAgent).toLowerCase();
  if (!ua) return 'unknown';
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(ua)) return 'bot';
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return 'mobile';
  return 'desktop';
};

const cleanGeoNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const GEO_COORDINATE_FALLBACKS: Record<string, GeoCoordinate> = {
  argentina: { latitude: -34.6037, longitude: -58.3816 },
  angola: { latitude: -8.839, longitude: 13.2894 },
  china: { latitude: 39.9042, longitude: 116.4074 },
  cuba: { latitude: 21.5218, longitude: -77.7812 },
  espana: { latitude: 40.4168, longitude: -3.7038 },
  'estados unidos': { latitude: 39.8283, longitude: -98.5795 },
  libia: { latitude: 26.3351, longitude: 17.2283 },
  nicaragua: { latitude: 12.8654, longitude: -85.2072 },
  uruguay: { latitude: -34.9011, longitude: -56.1645 },
  'beijing, beijing, china': { latitude: 39.9042, longitude: 116.4074 },
  'beijing, china': { latitude: 39.9042, longitude: 116.4074 },
  'cafayate, salta, argentina': { latitude: -26.0731, longitude: -65.9761 },
  'cafayate, argentina': { latitude: -26.0731, longitude: -65.9761 },
  'havana, 03, cuba': { latitude: 23.1136, longitude: -82.3666 },
  'havana, cuba': { latitude: 23.1136, longitude: -82.3666 },
  'la habana, cuba': { latitude: 23.1136, longitude: -82.3666 },
  'managua, nicaragua': { latitude: 12.114, longitude: -86.2362 },
  'mendoza, mendoza, argentina': { latitude: -32.8895, longitude: -68.8458 },
  'mendoza, argentina': { latitude: -32.8895, longitude: -68.8458 },
  'ramos mejia, buenos aires, argentina': { latitude: -34.6472, longitude: -58.5634 },
  'ramos mejia, argentina': { latitude: -34.6472, longitude: -58.5634 },
  'san jose, ca, estados unidos': { latitude: 37.3382, longitude: -121.8863 },
  'san jose, estados unidos': { latitude: 37.3382, longitude: -121.8863 },
  'san salvador de jujuy, jujuy, argentina': { latitude: -24.1858, longitude: -65.2995 },
  'san salvador de jujuy, argentina': { latitude: -24.1858, longitude: -65.2995 },
};

const getGeoCoordinateFallback = ({
  country,
  region,
  city,
}: {
  country: string;
  region: string;
  city: string;
}) => {
  const candidates = [
    [city, region, country].filter(Boolean).join(', '),
    [city, country].filter(Boolean).join(', '),
    city,
    country,
  ]
    .map((item) => normalizeGeoTextKey(item))
    .filter(Boolean);

  for (const key of candidates) {
    const fallback = GEO_COORDINATE_FALLBACKS[key];
    if (fallback) return fallback;
  }

  return null;
};

const addGeoBucket = (
  map: Map<string, GeoBucket>,
  key: string,
  label: string,
  sessionId?: string | null
) => {
  if (!key || !label) return;
  const current = map.get(key) || { label, views: 0, sessions: new Set<string>() };
  current.views += 1;
  if (sessionId) current.sessions.add(sessionId);
  map.set(key, current);
};

const addGeoReachBucket = (
  map: Map<string, GeoReachBucket>,
  key: string,
  label: string,
  userId?: string | null,
  sessionId?: string | null
) => {
  if (!key || !label) return;
  const current = map.get(key) || { label, views: 0, sessions: new Set<string>(), users: new Set<string>() };
  current.views += 1;
  if (sessionId) current.sessions.add(sessionId);
  if (userId) current.users.add(userId);
  map.set(key, current);
};

const addGeoZone = (
  map: Map<string, GeoZoneBucket>,
  key: string,
  zone: {
    label: string;
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    userId?: string | null;
    sessionId?: string | null;
  }
) => {
  if (!key || !zone.label) return;
  const current =
    map.get(key) ||
    {
      label: zone.label,
      country: zone.country,
      region: zone.region,
      city: zone.city,
      latitude: zone.latitude,
      longitude: zone.longitude,
      views: 0,
      sessions: new Set<string>(),
      users: new Set<string>(),
    };
  current.views += 1;
  if (zone.sessionId) current.sessions.add(zone.sessionId);
  if (zone.userId) current.users.add(zone.userId);
  map.set(key, current);
};

const serializeGeoBuckets = (map: Map<string, GeoBucket>) =>
  Array.from(map.values())
    .map((item) => ({
      label: item.label,
      views: item.views,
      uniqueSessions: item.sessions.size,
    }))
    .sort((a, b) => b.uniqueSessions - a.uniqueSessions || b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, 8);

const serializeGeoReachBuckets = (map: Map<string, GeoReachBucket>) =>
  Array.from(map.values())
    .map((item) => ({
      label: item.label,
      views: item.views,
      uniqueSessions: item.sessions.size,
      uniqueAccounts: item.users.size,
    }))
    .sort((a, b) => b.uniqueAccounts - a.uniqueAccounts || b.uniqueSessions - a.uniqueSessions || b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, 24);

const serializeGeoZones = (map: Map<string, GeoZoneBucket>) =>
  Array.from(map.values())
    .map((item) => ({
      label: item.label,
      country: item.country,
      region: item.region,
      city: item.city,
      latitude: item.latitude,
      longitude: item.longitude,
      views: item.views,
      uniqueSessions: item.sessions.size,
      uniqueAccounts: item.users.size,
    }))
    .sort((a, b) => b.uniqueAccounts - a.uniqueAccounts || b.uniqueSessions - a.uniqueSessions || b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, 12);

const ANALYTICS_REACH_MONTHS = 12;

const getAnalyticsMonthKey = (value: any) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, '0')}`;
};

const getAnalyticsMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map((value) => Number(value));
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
};

const createAnalyticsMonthlyReachBucket = (monthKey: string): AnalyticsMonthlyReachBucket => ({
  monthKey,
  label: getAnalyticsMonthLabel(monthKey),
  accountUsers: new Set<string>(),
  knownUsers: new Set<string>(),
  sessions: new Set<string>(),
  views: 0,
  countries: new Map<string, GeoReachBucket>(),
  cities: new Map<string, GeoReachBucket>(),
  zones: new Map<string, GeoZoneBucket>(),
});

const serializeMonthlyReachBuckets = (map: Map<string, AnalyticsMonthlyReachBucket>) =>
  Array.from(map.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((item) => ({
      monthKey: item.monthKey,
      label: item.label,
      accountUsers: item.accountUsers.size,
      knownAccountUsers: item.knownUsers.size,
      unknownAccountUsers: Math.max(0, item.accountUsers.size - item.knownUsers.size),
      sessions: item.sessions.size,
      views: item.views,
      countriesReached: serializeGeoReachBuckets(item.countries),
      cities: serializeGeoReachBuckets(item.cities),
      zones: serializeGeoZones(item.zones),
    }));

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const revenueSince = new Date(now);
    revenueSince.setMonth(revenueSince.getMonth() - 12);
    const analyticsSince1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const analyticsSince7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const analyticsSince30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const analyticsSinceMonthly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (ANALYTICS_REACH_MONTHS - 1), 1));
    const paidQuoteStatuses = ['paid'];
    const activeSubStatuses = ['authorized', 'active', 'approved'];
    const blockedPaymentStatuses = new Set(['rejected', 'cancelled', 'canceled', 'refunded']);

    const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 12 });
    if (usersRes.error) {
      throw usersRes.error;
    }

    const [
      totalUsersRes,
      accessGrantedRes,
      totalQuotesRes,
      activeSubsRes,
      activeSubsDataRes,
      supportLast7Res,
      paidQuotesRes,
      paymentRowsRes,
      recentMessagesRes,
      recentSubsRes,
      recentPaymentsRes,
      analyticsViewsRes,
      analyticsViewsLast1Res,
      analyticsDurationsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('access_granted', true),
      supabase.from('quotes').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', activeSubStatuses),
      supabase
        .from('subscriptions')
        .select('status, plan:billing_plans(period_months, price_ars)')
        .in('status', activeSubStatuses),
      supabase
        .from('beta_support_messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('quotes')
        .select('id, total_amount, status, user_id')
        .in('status', paidQuoteStatuses),
      supabase
        .from('subscription_payments')
        .select('amount, status, created_at, user_id')
        .gte('created_at', revenueSince.toISOString()),
      supabase
        .from('beta_support_messages')
        .select('id, user_id, sender_id, body, created_at, image_urls')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('subscriptions')
        .select('id, user_id, status, current_period_end, created_at, plan:billing_plans(name, period_months, price_ars, is_partner)')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('subscription_payments')
        .select('id, user_id, status, amount, paid_at, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('analytics_events')
        .select('session_id')
        .eq('event_type', 'page_view')
        .gte('created_at', analyticsSince7.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('analytics_events')
        .select('session_id')
        .eq('event_type', 'page_view')
        .gte('created_at', analyticsSince1.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('analytics_events')
        .select('path, duration_ms')
        .eq('event_type', 'page_duration')
        .gte('created_at', analyticsSince30.toISOString())
        .order('created_at', { ascending: false })
        .limit(20000),
    ]);

    if (
      totalUsersRes.error ||
      accessGrantedRes.error ||
      totalQuotesRes.error ||
      activeSubsRes.error ||
      activeSubsDataRes.error ||
      supportLast7Res.error ||
      paymentRowsRes.error ||
      recentMessagesRes.error ||
      recentSubsRes.error ||
      recentPaymentsRes.error ||
      analyticsViewsRes.error ||
      analyticsViewsLast1Res.error ||
      analyticsDurationsRes.error
    ) {
      throw (
        totalUsersRes.error ||
        accessGrantedRes.error ||
        totalQuotesRes.error ||
        activeSubsRes.error ||
        activeSubsDataRes.error ||
        supportLast7Res.error ||
        paymentRowsRes.error ||
        recentMessagesRes.error ||
        recentSubsRes.error ||
        recentPaymentsRes.error ||
        analyticsViewsRes.error ||
        analyticsViewsLast1Res.error ||
        analyticsDurationsRes.error
      );
    }

    let paidQuotesData = paidQuotesRes.data || [];
    if (paidQuotesRes.error) {
      const message = String(paidQuotesRes.error.message || '').toLowerCase();
      if (message.includes('invalid input value for enum')) {
        const fallback = await supabase.from('quotes').select('id, total_amount, status, user_id');
        if (fallback.error) throw fallback.error;
        paidQuotesData = fallback.data || [];
      } else {
        throw paidQuotesRes.error;
      }
    }

    const paidStatusSet = new Set([
      'paid',
      'charged',
      'cobrado',
      'cobrados',
      'pagado',
      'pagados',
    ]);
    const paidQuotes = paidQuotesData.filter((quote) =>
      paidStatusSet.has(String(quote.status || '').toLowerCase())
    );
    const paidQuotesTotal = paidQuotes.reduce((sum, quote) => sum + parseAmount(quote.total_amount), 0);
    const paidQuotesCount = paidQuotes.length;

    const paymentRows = paymentRowsRes.data || [];
    const revenueTotal = paymentRows.reduce((sum, row) => {
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) {
        return sum;
      }
      return sum + parseAmount(row.amount);
    }, 0);

    const visitsLast7 = (analyticsViewsRes.data || []).length;
    const uniqueSessionsLast7 = new Set(
      (analyticsViewsRes.data || []).map((item: any) => item.session_id).filter(Boolean)
    ).size;
    const visitsLast24 = (analyticsViewsLast1Res.data || []).length;
    const uniqueSessionsLast24 = new Set(
      (analyticsViewsLast1Res.data || []).map((item: any) => item.session_id).filter(Boolean)
    ).size;

    const durationRows = analyticsDurationsRes.data || [];
    const screenMap = new Map<string, { totalMs: number; count: number }>();
    durationRows.forEach((row: any) => {
      const path = (row.path || '').toString();
      const duration = Number(row.duration_ms || 0);
      if (!path || !Number.isFinite(duration) || duration <= 0) return;
      const current = screenMap.get(path) || { totalMs: 0, count: 0 };
      current.totalMs += duration;
      current.count += 1;
      screenMap.set(path, current);
    });
    const topScreens = Array.from(screenMap.entries())
      .map(([path, stats]) => ({
        path,
        total_minutes: stats.totalMs / 1000 / 60,
        avg_seconds: stats.count ? stats.totalMs / 1000 / stats.count : 0,
        views: stats.count,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 5);

    let analyticsGeo = {
      rangeDays: 30,
      rangeMonths: ANALYTICS_REACH_MONTHS,
      totalSessions: 0,
      accountSessions: 0,
      guestSessions: 0,
      knownSessions: 0,
      unknownSessions: 0,
      accountUsersCount: 0,
      knownAccountUsers: 0,
      unknownAccountUsers: 0,
      accountUsers: [] as {
        userId: string;
        label: string;
        email: string;
        sessions: number;
        views: number;
        lastSeenAt: string | null;
        lastSignInAt: string | null;
        lastPath: string;
        deviceType: AnalyticsDeviceType;
        deviceLabel: string;
        deviceSessions: number;
        devices: { type: AnalyticsDeviceType; label: string; sessions: number }[];
      }[],
      countries: [] as { label: string; views: number; uniqueSessions: number }[],
      cities: [] as { label: string; views: number; uniqueSessions: number }[],
      countriesReached: [] as { label: string; views: number; uniqueSessions: number; uniqueAccounts: number }[],
      monthlyReach: [] as {
        monthKey: string;
        label: string;
        accountUsers: number;
        knownAccountUsers: number;
        unknownAccountUsers: number;
        sessions: number;
        views: number;
        countriesReached: { label: string; views: number; uniqueSessions: number; uniqueAccounts: number }[];
        cities: { label: string; views: number; uniqueSessions: number; uniqueAccounts: number }[];
        zones: {
          label: string;
          country: string;
          region: string;
          city: string;
          latitude: number;
          longitude: number;
          views: number;
          uniqueSessions: number;
          uniqueAccounts: number;
        }[];
      }[],
      zones: [] as {
        label: string;
        country: string;
        region: string;
        city: string;
        latitude: number;
        longitude: number;
        views: number;
        uniqueSessions: number;
        uniqueAccounts: number;
      }[],
    };
    const analyticsAccountMap = new Map<string, AnalyticsAccountBucket>();
    const analyticsExcludedEmails = getAnalyticsExcludedEmails();
    const analyticsExcludedUserIds = new Set<string>();
    const analyticsAuthUsersById: Record<string, any> = {};

    if (analyticsExcludedEmails.size > 0) {
      const excludedEmailList = Array.from(analyticsExcludedEmails);
      const { data: excludedProfiles, error: excludedProfilesError } = await supabase
        .from('profiles')
        .select('id,email')
        .in('email', excludedEmailList);
      if (excludedProfilesError) throw excludedProfilesError;
      (excludedProfiles || []).forEach((profile: any) => {
        addExcludedAnalyticsUserId(analyticsExcludedUserIds, profile.id, profile.email, analyticsExcludedEmails);
      });

      for (let page = 1; page <= 10; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        const authUsers = data?.users || [];
        authUsers.forEach((user: any) => {
          addExcludedAnalyticsUserId(analyticsExcludedUserIds, user.id, user.email, analyticsExcludedEmails);
        });
        if (authUsers.length < 200) break;
      }
    }

    const analyticsGeoRes = await supabase
      .from('analytics_events')
      .select('session_id,user_id,path,created_at,event_context,user_agent')
      .eq('event_type', 'page_view')
      .gte('created_at', analyticsSinceMonthly.toISOString())
      .order('created_at', { ascending: false })
      .limit(20000);

    if (analyticsGeoRes.error) {
      const message = String(analyticsGeoRes.error.message || '');
      if (!/event_context|column.*does not exist|schema cache/i.test(message)) {
        throw analyticsGeoRes.error;
      }
    } else {
      const analyticsRows = analyticsGeoRes.data || [];
      const analyticsEventUserIds = new Set<string>();
      analyticsRows.forEach((row: any) => {
        const userId = cleanGeoText(row?.user_id);
        if (userId) analyticsEventUserIds.add(userId);
      });

      if (analyticsExcludedEmails.size > 0 && analyticsEventUserIds.size > 0) {
        const analyticsEventUserIdList = Array.from(analyticsEventUserIds);
        const { data: analyticsProfileRows, error: analyticsProfileError } = await supabase
          .from('profiles')
          .select('id,email')
          .in('id', analyticsEventUserIdList);
        if (analyticsProfileError) throw analyticsProfileError;
        (analyticsProfileRows || []).forEach((profile: any) => {
          addExcludedAnalyticsUserId(analyticsExcludedUserIds, profile.id, profile.email, analyticsExcludedEmails);
        });

        for (let index = 0; index < analyticsEventUserIdList.length; index += 25) {
          const userIdBatch = analyticsEventUserIdList.slice(index, index + 25);
          await Promise.all(
            userIdBatch.map(async (userId) => {
              const { data, error } = await supabase!.auth.admin.getUserById(userId);
              if (!error && data?.user) {
                analyticsAuthUsersById[userId] = data.user;
                addExcludedAnalyticsUserId(analyticsExcludedUserIds, userId, data.user.email, analyticsExcludedEmails);
              }
            })
          );
        }
      }

      const countryMap = new Map<string, GeoBucket>();
      const cityMap = new Map<string, GeoBucket>();
      const countryReachMap = new Map<string, GeoReachBucket>();
      const cityReachMap = new Map<string, GeoReachBucket>();
      const zoneMap = new Map<string, GeoZoneBucket>();
      const monthlyReachMap = new Map<string, AnalyticsMonthlyReachBucket>();
      const allSessions = new Set<string>();
      const accountSessions = new Set<string>();
      const knownSessions = new Set<string>();
      const accountUsersReached = new Set<string>();
      const accountUsersWithGeo = new Set<string>();

      for (let offset = ANALYTICS_REACH_MONTHS - 1; offset >= 0; offset -= 1) {
        const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
        const monthKey = getAnalyticsMonthKey(monthDate.toISOString());
        monthlyReachMap.set(monthKey, createAnalyticsMonthlyReachBucket(monthKey));
      }

      const getMonthlyReachBucket = (createdAt: any) => {
        const monthKey = getAnalyticsMonthKey(createdAt);
        if (!monthKey) return null;
        const current = monthlyReachMap.get(monthKey) || createAnalyticsMonthlyReachBucket(monthKey);
        monthlyReachMap.set(monthKey, current);
        return current;
      };

      analyticsRows.forEach((row: any) => {
        const sessionId = cleanGeoText(row?.session_id);
        const userId = cleanGeoText(row?.user_id);
        const isAccountSession = Boolean(userId);
        if (isAccountSession && analyticsExcludedUserIds.has(userId)) return;
        if (sessionId) allSessions.add(sessionId);
        if (sessionId && isAccountSession) accountSessions.add(sessionId);

        const monthlyBucket = isAccountSession ? getMonthlyReachBucket(row?.created_at) : null;
        if (isAccountSession) {
          accountUsersReached.add(userId);
          if (monthlyBucket) {
            monthlyBucket.accountUsers.add(userId);
            monthlyBucket.views += 1;
            if (sessionId) monthlyBucket.sessions.add(sessionId);
          }

          const current =
            analyticsAccountMap.get(userId) ||
            {
              userId,
              sessions: new Set<string>(),
              deviceSessions: new Map<AnalyticsDeviceType, Set<string>>(),
              views: 0,
              lastSeenAt: null,
              lastPath: '',
            };
          const deviceType = getAnalyticsDeviceType(row?.user_agent);
          const deviceSessionKey = sessionId || `${userId}:${cleanGeoText(row?.created_at) || current.views + 1}`;
          const currentDeviceSessions = current.deviceSessions.get(deviceType) || new Set<string>();
          currentDeviceSessions.add(deviceSessionKey);
          current.deviceSessions.set(deviceType, currentDeviceSessions);
          current.views += 1;
          if (sessionId) current.sessions.add(sessionId);
          if (!current.lastSeenAt) {
            current.lastSeenAt = cleanGeoText(row?.created_at) || null;
            current.lastPath = cleanGeoText(row?.path);
          }
          analyticsAccountMap.set(userId, current);
        }

        if (!isAccountSession) return;

        const geo = row?.event_context?.geo || {};
        const countryInfo = normalizeAnalyticsCountry(geo.country);
        const country = countryInfo.label;
        const countryKey = countryInfo.key;
        const region = normalizeAnalyticsRegion(geo.region, countryKey);
        const city = cleanGeoText(geo.city);
        const latitude = cleanGeoNumber(geo.latitude);
        const longitude = cleanGeoNumber(geo.longitude);
        const hasRawCoordinate = latitude !== null && longitude !== null;
        const fallbackCoordinate = !hasRawCoordinate ? getGeoCoordinateFallback({ country, region, city }) : null;
        const zoneLatitude = hasRawCoordinate ? latitude : fallbackCoordinate?.latitude ?? null;
        const zoneLongitude = hasRawCoordinate ? longitude : fallbackCoordinate?.longitude ?? null;
        const hasGeo = Boolean(country || region || city);

        if (hasGeo) {
          if (sessionId) knownSessions.add(sessionId);
          accountUsersWithGeo.add(userId);
          monthlyBucket?.knownUsers.add(userId);
        }
        if (country) {
          const normalizedCountryKey = countryKey || normalizeGeoTextKey(country);
          addGeoBucket(countryMap, normalizedCountryKey, country, sessionId);
          addGeoReachBucket(countryReachMap, normalizedCountryKey, country, userId, sessionId);
          if (monthlyBucket) addGeoReachBucket(monthlyBucket.countries, normalizedCountryKey, country, userId, sessionId);
        }
        if (city) {
          const cityLabel = [city, region, country].filter(Boolean).join(', ');
          const cityKey = normalizeGeoTextKey(cityLabel);
          addGeoBucket(cityMap, cityKey, cityLabel, sessionId);
          addGeoReachBucket(cityReachMap, cityKey, cityLabel, userId, sessionId);
          if (monthlyBucket) addGeoReachBucket(monthlyBucket.cities, cityKey, cityLabel, userId, sessionId);
        }
        if (zoneLatitude !== null && zoneLongitude !== null) {
          const zoneLabel = [city, region, country].filter(Boolean).join(', ') || `${zoneLatitude.toFixed(2)}, ${zoneLongitude.toFixed(2)}`;
          const zoneKey = `${normalizeGeoTextKey(zoneLabel)}|${zoneLatitude.toFixed(2)}|${zoneLongitude.toFixed(2)}`;
          const zonePayload = {
            label: zoneLabel,
            country,
            region,
            city,
            latitude: zoneLatitude,
            longitude: zoneLongitude,
            userId,
            sessionId,
          };
          addGeoZone(zoneMap, zoneKey, zonePayload);
          if (monthlyBucket) addGeoZone(monthlyBucket.zones, zoneKey, zonePayload);
        }
      });

      analyticsGeo = {
        rangeDays: 30,
        rangeMonths: ANALYTICS_REACH_MONTHS,
        totalSessions: allSessions.size,
        accountSessions: accountSessions.size,
        guestSessions: Math.max(0, allSessions.size - accountSessions.size),
        knownSessions: knownSessions.size,
        unknownSessions: Math.max(0, accountSessions.size - knownSessions.size),
        accountUsersCount: accountUsersReached.size,
        knownAccountUsers: accountUsersWithGeo.size,
        unknownAccountUsers: Math.max(0, accountUsersReached.size - accountUsersWithGeo.size),
        accountUsers: [],
        countries: serializeGeoBuckets(countryMap),
        cities: serializeGeoBuckets(cityMap),
        countriesReached: serializeGeoReachBuckets(countryReachMap),
        monthlyReach: serializeMonthlyReachBuckets(monthlyReachMap),
        zones: serializeGeoZones(zoneMap),
      };
    }
    const activeSubsRows = activeSubsDataRes.data || [];
    const mrr = activeSubsRows.reduce((sum, row: any) => {
      const price = parseAmount(row?.plan?.price_ars);
      const periodMonths = Number(row?.plan?.period_months || 1);
      if (!price || !periodMonths) return sum;
      return sum + price / periodMonths;
    }, 0);
    const arr = mrr * 12;

    const revenueUserIds = new Set<string>();
    paidQuotes.forEach((quote: any) => {
      if (quote?.user_id) revenueUserIds.add(quote.user_id);
    });
    paymentRows.forEach((row: any) => {
      if (!row?.user_id) return;
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) return;
      revenueUserIds.add(row.user_id);
    });

    const listsRaw = {
      supportMessages: recentMessagesRes.data || [],
      recentSubscriptions: recentSubsRes.data || [],
      recentPayments: recentPaymentsRes.data || [],
      recentUsers: usersRes.data?.users || [],
    };

    const userIds = new Set<string>();
    listsRaw.supportMessages.forEach((item) => {
      if (item.user_id) userIds.add(item.user_id);
      if (item.sender_id) userIds.add(item.sender_id);
    });
    listsRaw.recentSubscriptions.forEach((item) => {
      if (item.user_id) userIds.add(item.user_id);
    });
    listsRaw.recentPayments.forEach((item) => {
      if (item.user_id) userIds.add(item.user_id);
    });
    listsRaw.recentUsers.forEach((user) => {
      if (user?.id) userIds.add(user.id);
    });
    revenueUserIds.forEach((id) => userIds.add(id));
    analyticsAccountMap.forEach((item) => userIds.add(item.userId));

    let profiles: Record<string, any> = {};
    if (userIds.size) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, email, access_granted, city, coverage_area, address')
        .in('id', Array.from(userIds));
      if (profileError) throw profileError;
      profiles = (profileRows || []).reduce((acc: Record<string, any>, row) => {
        acc[row.id] = row;
        return acc;
      }, {});
    }

    const sortedAnalyticsAccounts = Array.from(analyticsAccountMap.values())
      .sort(
        (a, b) =>
          b.sessions.size - a.sessions.size ||
          b.views - a.views ||
          new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
      )
      .slice(0, 10);

    const authUsersById: Record<string, any> = { ...analyticsAuthUsersById };
    await Promise.all(
      sortedAnalyticsAccounts.map(async (item) => {
        if (authUsersById[item.userId]) return;
        const { data, error } = await supabase!.auth.admin.getUserById(item.userId);
        if (!error && data?.user) {
          authUsersById[item.userId] = data.user;
        }
      })
    );

    analyticsGeo.accountUsers = sortedAnalyticsAccounts.map((item) => {
      const profile = profiles[item.userId] || {};
      const authUser = authUsersById[item.userId] || null;
      const label =
        [profile.business_name, profile.full_name].find((value) => cleanGeoText(value)) ||
        cleanGeoText(profile.email) ||
        cleanGeoText(authUser?.email) ||
        item.userId;
      const devices = Array.from(item.deviceSessions.entries())
        .map(([type, sessions]) => ({
          type,
          label: ANALYTICS_DEVICE_LABELS[type],
          sessions: sessions.size,
        }))
        .filter((device) => device.sessions > 0)
        .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label));
      const primaryDevice =
        devices[0] ||
        ({
          type: 'unknown' as AnalyticsDeviceType,
          label: ANALYTICS_DEVICE_LABELS.unknown,
          sessions: 0,
        });

      return {
        userId: item.userId,
        label,
        email: cleanGeoText(profile.email) || cleanGeoText(authUser?.email),
        sessions: item.sessions.size,
        views: item.views,
        lastSeenAt: item.lastSeenAt,
        lastSignInAt: cleanGeoText(authUser?.last_sign_in_at) || null,
        lastPath: item.lastPath,
        deviceType: primaryDevice.type,
        deviceLabel: primaryDevice.label,
        deviceSessions: primaryDevice.sessions,
        devices,
      };
    });

    let subscriptionsByUser: Record<string, any> = {};
    if (userIds.size) {
      const { data: subsRows, error: subsError } = await supabase
        .from('subscriptions')
        .select('user_id, status, current_period_end, plan:billing_plans(name, period_months, price_ars, is_partner)')
        .in('user_id', Array.from(userIds));
      if (subsError) throw subsError;
      subscriptionsByUser = (subsRows || []).reduce((acc: Record<string, any>, row) => {
        if (row.user_id && !acc[row.user_id]) {
          acc[row.user_id] = row;
        }
        return acc;
      }, {});
    }

    const getZoneLabel = (profile?: any | null) => {
      const city = (profile?.city || '').toString().trim();
      const coverage = (profile?.coverage_area || '').toString().trim();
      const address = (profile?.address || '').toString().trim();
      const combined = [city, coverage, address].filter(Boolean).join(', ');
      if (combined) return combined;
      return 'Sin zona';
    };

    const { data: profileZoneRows, error: profileZoneError } = await supabase
      .from('profiles')
      .select('id, city, coverage_area, address')
      .range(0, 9999);
    if (profileZoneError) throw profileZoneError;

    const registeredUsersByZoneMap = new Map<string, Set<string>>();
    (profileZoneRows || []).forEach((profile: any) => {
      const zone = getZoneLabel(profile);
      if (!registeredUsersByZoneMap.has(zone)) {
        registeredUsersByZoneMap.set(zone, new Set());
      }
      if (profile?.id) {
        registeredUsersByZoneMap.get(zone)?.add(profile.id);
      }
    });

    const registeredUsersByZone = Array.from(registeredUsersByZoneMap.entries())
      .map(([zone, users]) => ({
        zone,
        users_count: users.size,
      }))
      .sort((a, b) => b.users_count - a.users_count || a.zone.localeCompare(b.zone))
      .slice(0, 80);

    const incomeByZoneMap = new Map<
      string,
      {
        zone: string;
        quotes_amount: number;
        subscriptions_amount: number;
        quotes_count: number;
        payments_count: number;
        users: Set<string>;
      }
    >();

    const ensureZone = (zone: string) => {
      if (!incomeByZoneMap.has(zone)) {
        incomeByZoneMap.set(zone, {
          zone,
          quotes_amount: 0,
          subscriptions_amount: 0,
          quotes_count: 0,
          payments_count: 0,
          users: new Set(),
        });
      }
      return incomeByZoneMap.get(zone)!;
    };

    paidQuotes.forEach((quote: any) => {
      const zone = getZoneLabel(profiles[quote.user_id]);
      const entry = ensureZone(zone);
      entry.quotes_amount += parseAmount(quote.total_amount);
      entry.quotes_count += 1;
      if (quote?.user_id) entry.users.add(quote.user_id);
    });

    paymentRows.forEach((row: any) => {
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) return;
      const zone = getZoneLabel(profiles[row.user_id]);
      const entry = ensureZone(zone);
      entry.subscriptions_amount += parseAmount(row.amount);
      entry.payments_count += 1;
      if (row?.user_id) entry.users.add(row.user_id);
    });

    const incomeByZone = Array.from(incomeByZoneMap.values())
      .map((item) => ({
        zone: item.zone,
        total_amount: item.quotes_amount + item.subscriptions_amount,
        quotes_amount: item.quotes_amount,
        subscriptions_amount: item.subscriptions_amount,
        quotes_count: item.quotes_count,
        payments_count: item.payments_count,
        users_count: item.users.size,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 12);

    const pendingAccess = listsRaw.recentUsers
      .filter((user: any) => profiles[user.id]?.access_granted !== true)
      .slice(0, 12)
      .map((user: any) => ({
        id: user.id,
        email: user.email || profiles[user.id]?.email || null,
        full_name: profiles[user.id]?.full_name || null,
        business_name: profiles[user.id]?.business_name || null,
        access_granted: profiles[user.id]?.access_granted ?? null,
        profile: profiles[user.id] || null,
      }));

    return NextResponse.json({
      kpis: {
        totalUsers: totalUsersRes.count || 0,
        accessGranted: accessGrantedRes.count || 0,
        pendingAccess: (totalUsersRes.count || 0) - (accessGrantedRes.count || 0),
        totalQuotes: totalQuotesRes.count || 0,
        paidQuotesCount,
        paidQuotesTotal,
        activeSubscribers: activeSubsRes.count || 0,
        supportMessagesLast7: supportLast7Res.count || 0,
        revenueTotal,
        mrr,
        arr,
        visitsLast7,
        uniqueSessionsLast7,
        visitsLast24,
        uniqueSessionsLast24,
        revenueSince: revenueSince.toISOString(),
      },
      lists: {
        supportMessages: listsRaw.supportMessages.map((item) => ({
          ...item,
          profile: profiles[item.user_id] || null,
          sender: profiles[item.sender_id] || null,
        })),
        recentSubscriptions: listsRaw.recentSubscriptions.map((item) => ({
          ...item,
          profile: profiles[item.user_id] || null,
        })),
        recentPayments: listsRaw.recentPayments.map((item) => ({
          ...item,
          profile: profiles[item.user_id] || null,
        })),
        pendingAccess,
        recentUsers: listsRaw.recentUsers.map((user) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          profile: profiles[user.id] || null,
          subscription: subscriptionsByUser[user.id] || null,
        })),
        registeredUsersByZone,
        incomeByZone,
        topScreens,
        analyticsGeo,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Admin query failed' }, { status: 500 });
  }
}
