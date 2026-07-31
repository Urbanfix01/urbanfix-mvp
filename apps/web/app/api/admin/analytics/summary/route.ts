import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

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

const DEFAULT_ANALYTICS_EXCLUDED_EMAILS = ['info@urbanfix.com', 'eliascastillo237@gmail.com'];
const ANALYTICS_EXCLUDED_EMAILS_ENV = process.env.ADMIN_ANALYTICS_EXCLUDED_EMAILS || '';
const getAnalyticsExcludedEmails = () =>
  new Set(
    [...DEFAULT_ANALYTICS_EXCLUDED_EMAILS, ...ANALYTICS_EXCLUDED_EMAILS_ENV.split(',')]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  );

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const technicalRoleEvents = new Set([
  'technical_registration_started',
  'technical_registration_completed',
  'technical_profile_onboarding_started',
  'technical_profile_identity_completed',
  'technical_profile_contact_completed',
  'technical_profile_specialty_completed',
  'technical_profile_location_completed',
  'technical_profile_completed',
  'technical_profile_published',
  'home_register_start',
  'home_register_start_from_empresas',
]);
const clientRoleEvents = new Set([
  'client_registration_started',
  'client_registration_completed',
  'client_request_published',
]);

const analyticsSectionDefinitions = [
  {
    key: 'home',
    label: 'Inicio',
    matches: (path: string) => path === '/',
  },
  {
    key: 'technicians',
    label: 'Panel técnico',
    matches: (path: string) => path === '/tecnicos' || path.startsWith('/tecnicos/'),
  },
  {
    key: 'clients',
    label: 'Portal cliente',
    matches: (path: string) => path === '/cliente' || path.startsWith('/cliente/'),
  },
  {
    key: 'marketplace',
    label: 'Mapa y perfiles',
    matches: (path: string) =>
      path === '/vidriera' || path.startsWith('/vidriera/') || path.startsWith('/tecnico/'),
  },
  {
    key: 'community',
    label: 'Comunidad',
    matches: (path: string) => path === '/comunidad' || path.startsWith('/comunidad/'),
  },
  {
    key: 'quotes',
    label: 'Presupuestos',
    matches: (path: string) => path.includes('presupuesto'),
  },
  {
    key: 'news',
    label: 'Novedades',
    matches: (path: string) => path.startsWith('/newsletter') || path.startsWith('/novedades'),
  },
];

const getAnalyticsSection = (pathValue: unknown) => {
  const rawPath = String(pathValue || '').trim();
  if (!rawPath) return null;
  const normalizedPath = rawPath.split('?')[0].replace(/\/+$/, '') || '/';
  if (
    normalizedPath.startsWith('/admin') ||
    normalizedPath.startsWith('/api') ||
    normalizedPath.startsWith('/auth')
  ) {
    return null;
  }

  const definition = analyticsSectionDefinitions.find((item) => item.matches(normalizedPath));
  return definition
    ? { key: definition.key, label: definition.label }
    : { key: 'other', label: 'Otras páginas' };
};

const funnelEventLabels: Record<string, string> = {
  technical_registration_started: 'Inicios de registro técnico',
  client_registration_started: 'Inicios de registro de clientes',
  technical_registration_completed: 'Registros técnicos',
  client_registration_completed: 'Registros de clientes',
  technical_profile_onboarding_started: 'Inicios de datos clave',
  technical_profile_identity_completed: 'Identidad técnica completada',
  technical_profile_contact_completed: 'Contacto técnico completado',
  technical_profile_specialty_completed: 'Rubro técnico completado',
  technical_profile_location_completed: 'Ubicación técnica completada',
  technical_profile_completed: 'Perfiles técnicos completados',
  technical_profile_published: 'Perfiles visibles en el mapa',
  client_request_published: 'Solicitudes publicadas',
  quote_created: 'Presupuestos creados',
  quote_sent: 'Presupuestos enviados',
  technician_whatsapp_contact: 'Contactos por WhatsApp',
  quote_approved: 'Presupuestos aprobados',
  home_audience_tecnicos: 'Interés en trabajar como técnico',
  home_audience_empresas: 'Interés de empresas',
  home_audience_clientes: 'Interés en contratar',
  home_open_guia_precios: 'Aperturas de valores de mano de obra',
  home_register_start: 'Inicios de registro técnico',
  home_register_start_from_empresas: 'Inicios de registro de empresa',
  home_download_android_click: 'Intentos de descarga Android',
};

const funnelStepDefinitions = [
  'technical_registration_started',
  'client_registration_started',
  'technical_registration_completed',
  'client_registration_completed',
  'technical_profile_completed',
  'technical_profile_published',
  'client_request_published',
  'quote_created',
  'quote_sent',
  'technician_whatsapp_contact',
  'quote_approved',
].map((key) => ({ key, label: funnelEventLabels[key] }));

const funnelGroupDefinitions = [
  {
    key: 'registrations',
    label: 'Registros y perfiles',
    events: [
      'technical_registration_started',
      'client_registration_started',
      'technical_registration_completed',
      'client_registration_completed',
      'technical_profile_onboarding_started',
      'technical_profile_identity_completed',
      'technical_profile_contact_completed',
      'technical_profile_specialty_completed',
      'technical_profile_location_completed',
      'technical_profile_completed',
      'technical_profile_published',
    ],
  },
  {
    key: 'demand',
    label: 'Demanda de trabajos',
    events: ['client_request_published'],
  },
  {
    key: 'quotes',
    label: 'Presupuestador',
    events: ['quote_created', 'quote_sent', 'quote_approved'],
  },
  {
    key: 'contacts',
    label: 'Contacto con técnicos',
    events: ['technician_whatsapp_contact'],
  },
];

const funnelJourneyDefinitions = [
  {
    key: 'technical_registration',
    label: 'Registro técnico',
    description: 'Desde que una persona abre el alta técnica hasta que crea su cuenta.',
    recommendation: 'Simplificar el formulario y revisar los puntos de abandono del alta técnica.',
    stages: [
      { key: 'technical_registration_started', label: 'Inicio' },
      { key: 'technical_registration_completed', label: 'Cuenta creada' },
    ],
  },
  {
    key: 'client_registration',
    label: 'Registro de clientes',
    description: 'Desde que una persona abre el alta de cliente hasta que crea su cuenta.',
    recommendation: 'Reducir fricción y reforzar el beneficio de crear una cuenta de cliente.',
    stages: [
      { key: 'client_registration_started', label: 'Inicio' },
      { key: 'client_registration_completed', label: 'Cuenta creada' },
    ],
  },
  {
    key: 'technical_profile_onboarding',
    label: 'Datos clave del técnico',
    description: 'Desde que abre su perfil hasta guardar identidad, contacto, rubro y ubicación.',
    recommendation: 'Simplificar el primer paso con mayor caída y revisar su texto, validación y ayuda.',
    stages: [
      { key: 'technical_profile_onboarding_started', label: 'Inicio' },
      { key: 'technical_profile_identity_completed', label: 'Identidad' },
      { key: 'technical_profile_contact_completed', label: 'Contacto' },
      { key: 'technical_profile_specialty_completed', label: 'Rubro' },
      { key: 'technical_profile_location_completed', label: 'Ubicación' },
      { key: 'technical_profile_completed', label: 'Guardado' },
    ],
  },
  {
    key: 'technical_activation',
    label: 'Activación técnica',
    description: 'Desde el registro hasta quedar visible para clientes.',
    recommendation: 'Revisar el paso de publicación y la autorización para aparecer en el mapa.',
    stages: [
      { key: 'technical_registration_completed', label: 'Registro' },
      { key: 'technical_profile_completed', label: 'Perfil completo' },
      { key: 'technical_profile_published', label: 'Perfil visible' },
    ],
  },
  {
    key: 'client_demand',
    label: 'Demanda de clientes',
    description: 'Desde el alta del cliente hasta publicar una necesidad real.',
    recommendation: 'Simplificar la creación del pedido y reforzar el llamado a publicar.',
    stages: [
      { key: 'client_registration_completed', label: 'Registro' },
      { key: 'client_request_published', label: 'Solicitud publicada' },
    ],
  },
  {
    key: 'quote_cycle',
    label: 'Ciclo del presupuesto',
    description: 'Desde la creación del presupuesto hasta su aprobación.',
    recommendation: 'Revisar el envío y el seguimiento posterior del presupuesto.',
    stages: [
      { key: 'quote_created', label: 'Creado' },
      { key: 'quote_sent', label: 'Enviado' },
      { key: 'quote_approved', label: 'Aprobado' },
    ],
  },
];

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
    .select('event_type, path, duration_ms, created_at, session_id, user_id')
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
  const activityDaysByUser = new Map<string, Set<string>>();
  const sectionActivityDays = new Map<
    string,
    { label: string; activityDaysByUser: Map<string, Set<string>> }
  >();
  const prevSectionActivityDays = new Map<
    string,
    { label: string; activityDaysByUser: Map<string, Set<string>> }
  >();
  let totalViews = 0;
  let totalDurationMs = 0;

  const recordSectionActivity = (
    sectionMap: Map<string, { label: string; activityDaysByUser: Map<string, Set<string>> }>,
    pathValue: unknown,
    eventUserId: unknown,
    dateKey: string
  ) => {
    const normalizedUserId = String(eventUserId || '').trim();
    const section = getAnalyticsSection(pathValue);
    if (!normalizedUserId || !section) return;

    const sectionStats = sectionMap.get(section.key) || {
      label: section.label,
      activityDaysByUser: new Map<string, Set<string>>(),
    };
    const daysActive = sectionStats.activityDaysByUser.get(normalizedUserId) || new Set<string>();
    daysActive.add(dateKey);
    sectionStats.activityDaysByUser.set(normalizedUserId, daysActive);
    sectionMap.set(section.key, sectionStats);
  };

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
      if (event.user_id) {
        users.add(event.user_id);
        const activityDays = activityDaysByUser.get(event.user_id) || new Set<string>();
        activityDays.add(dateKey);
        activityDaysByUser.set(event.user_id, activityDays);
        recordSectionActivity(sectionActivityDays, event.path, event.user_id, dateKey);
      }
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
  const prevActivityDaysByUser = new Map<string, Set<string>>();

  (prevEvents || []).forEach((event: any) => {
    if (event.event_type === 'page_view') {
      prevViews += 1;
      if (event.session_id) prevSessions.add(event.session_id);
      if (event.user_id) {
        prevUsers.add(event.user_id);
        const dateKey = formatDate(new Date(event.created_at));
        const activityDays = prevActivityDaysByUser.get(event.user_id) || new Set<string>();
        activityDays.add(dateKey);
        prevActivityDaysByUser.set(event.user_id, activityDays);
        recordSectionActivity(prevSectionActivityDays, event.path, event.user_id, dateKey);
      }
    }
    if (event.event_type === 'page_duration') {
      const duration = Number(event.duration_ms || 0);
      if (Number.isFinite(duration) && duration > 0) {
        prevDurationMs += duration;
      }
    }
  });

  const retentionUserIds = Array.from(
    new Set([...activityDaysByUser.keys(), ...prevActivityDaysByUser.keys()])
  );
  const retentionProfilesById: Record<string, any> = {};
  for (const userIds of chunk(retentionUserIds, 200)) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, email, access_granted, profile_published, specialties, service_city, company_address'
      )
      .in('id', userIds);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    (profileRows || []).forEach((row: any) => {
      retentionProfilesById[row.id] = row;
    });
  }

  const { data: adminRows, error: adminRowsError } = await supabase
    .from('beta_admins')
    .select('user_id');
  if (adminRowsError) {
    return NextResponse.json({ error: adminRowsError.message }, { status: 500 });
  }

  const excludedEmails = getAnalyticsExcludedEmails();
  const excludedRetentionUserIds = new Set(
    (adminRows || []).map((row: any) => String(row.user_id || '').trim()).filter(Boolean)
  );
  retentionUserIds.forEach((retentionUserId) => {
    const email = String(retentionProfilesById[retentionUserId]?.email || '')
      .trim()
      .toLowerCase();
    if (email && excludedEmails.has(email)) {
      excludedRetentionUserIds.add(retentionUserId);
    }
  });

  const roleByUserId = new Map<string, 'technical' | 'client'>();
  [...(funnelEvents || []), ...(prevFunnelEvents || [])].forEach((event: any) => {
    const eventUserId = String(event.user_id || '').trim();
    const eventName = String(event.event_name || '').trim();
    if (!eventUserId || !eventName) return;
    if (technicalRoleEvents.has(eventName)) {
      roleByUserId.set(eventUserId, 'technical');
    } else if (clientRoleEvents.has(eventName) && !roleByUserId.has(eventUserId)) {
      roleByUserId.set(eventUserId, 'client');
    }
  });

  const resolveRetentionRole = (retentionUserId: string) => {
    const eventRole = roleByUserId.get(retentionUserId);
    if (eventRole) return eventRole;
    const profile = retentionProfilesById[retentionUserId];
    const hasTechnicalProfile =
      profile?.access_granted === true ||
      profile?.profile_published === true ||
      Boolean(profile?.specialties?.length || String(profile?.specialties || '').trim()) ||
      Boolean(String(profile?.service_city || '').trim()) ||
      Boolean(String(profile?.company_address || '').trim());
    if (hasTechnicalProfile) return 'technical' as const;
    if (profile) return 'client' as const;
    return 'unknown' as const;
  };

  const summarizeRetention = (
    activityDays: Map<string, Set<string>>,
    role?: 'technical' | 'client' | 'unknown'
  ) => {
    const eligibleAccounts = Array.from(activityDays.entries()).filter(
      ([retentionUserId]) =>
        !excludedRetentionUserIds.has(retentionUserId) &&
        (!role || resolveRetentionRole(retentionUserId) === role)
    );
    const returningAccounts = eligibleAccounts.filter(([, daysActive]) => daysActive.size >= 2).length;
    return {
      activeAccounts: eligibleAccounts.length,
      returningAccounts,
      singleDayAccounts: Math.max(0, eligibleAccounts.length - returningAccounts),
      returnRate:
        eligibleAccounts.length > 0
          ? Math.min(100, (returningAccounts / eligibleAccounts.length) * 100)
          : 0,
    };
  };

  const currentRetention = summarizeRetention(activityDaysByUser);
  const previousRetention = summarizeRetention(prevActivityDaysByUser);
  const retentionRoleDefinitions = [
    { key: 'technical' as const, label: 'Técnicos' },
    { key: 'client' as const, label: 'Clientes' },
    { key: 'unknown' as const, label: 'Sin tipo identificado' },
  ];
  const retention = {
    ...currentRetention,
    prevActiveAccounts: previousRetention.activeAccounts,
    prevReturningAccounts: previousRetention.returningAccounts,
    prevSingleDayAccounts: previousRetention.singleDayAccounts,
    prevReturnRate: previousRetention.returnRate,
    measurementReady: rangeDays >= 2 && currentRetention.activeAccounts > 0,
    roles: retentionRoleDefinitions.map((definition) => {
      const current = summarizeRetention(activityDaysByUser, definition.key);
      const previous = summarizeRetention(prevActivityDaysByUser, definition.key);
      return {
        key: definition.key,
        label: definition.label,
        ...current,
        prevActiveAccounts: previous.activeAccounts,
        prevReturningAccounts: previous.returningAccounts,
        prevReturnRate: previous.returnRate,
      };
    }),
  };

  const sectionKeys = Array.from(
    new Set([...sectionActivityDays.keys(), ...prevSectionActivityDays.keys()])
  );
  const summarizeSectionRetention = (
    sectionMap: Map<string, { label: string; activityDaysByUser: Map<string, Set<string>> }>,
    sectionKey: string
  ) => {
    const sectionStats = sectionMap.get(sectionKey);
    const eligibleAccounts = Array.from(sectionStats?.activityDaysByUser.entries() || []).filter(
      ([sectionUserId]) => !excludedRetentionUserIds.has(sectionUserId)
    );
    const returningAccounts = eligibleAccounts.filter(([, daysActive]) => daysActive.size >= 2).length;
    return {
      label: sectionStats?.label || 'Otras páginas',
      activeAccounts: eligibleAccounts.length,
      returningAccounts,
      singleDayAccounts: Math.max(0, eligibleAccounts.length - returningAccounts),
      returnRate:
        eligibleAccounts.length > 0
          ? Math.min(100, (returningAccounts / eligibleAccounts.length) * 100)
          : 0,
    };
  };

  const sectionRetentionRows = sectionKeys
    .map((sectionKey) => {
      const current = summarizeSectionRetention(sectionActivityDays, sectionKey);
      const previous = summarizeSectionRetention(prevSectionActivityDays, sectionKey);
      return {
        key: sectionKey,
        label: current.label !== 'Otras páginas' ? current.label : previous.label,
        activeAccounts: current.activeAccounts,
        returningAccounts: current.returningAccounts,
        singleDayAccounts: current.singleDayAccounts,
        returnRate: current.returnRate,
        prevActiveAccounts: previous.activeAccounts,
        prevReturningAccounts: previous.returningAccounts,
        prevReturnRate: previous.returnRate,
      };
    })
    .filter((section) => section.activeAccounts > 0 || section.prevActiveAccounts > 0)
    .sort(
      (a, b) =>
        b.activeAccounts - a.activeAccounts ||
        b.returningAccounts - a.returningAccounts ||
        a.label.localeCompare(b.label, 'es')
    )
    .slice(0, 8);

  const prioritySection =
    sectionRetentionRows
      .filter((section) => section.activeAccounts >= 2 && section.singleDayAccounts > 0)
      .sort(
        (a, b) =>
          b.singleDayAccounts - a.singleDayAccounts ||
          a.returnRate - b.returnRate ||
          b.activeAccounts - a.activeAccounts
      )[0] || null;

  const sectionRetention = {
    measurementReady:
      rangeDays >= 2 && sectionRetentionRows.some((section) => section.activeAccounts > 0),
    prioritySectionKey: prioritySection?.key || null,
    sections: sectionRetentionRows,
  };

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

  const summarizeFunnelGroup = (
    definition: (typeof funnelGroupDefinitions)[number],
    counts: Map<string, { count: number; sessions: Set<string> }>
  ) => {
    const groupSessions = new Set<string>();
    const count = definition.events.reduce((sum, eventName) => {
      const stats = counts.get(eventName);
      stats?.sessions.forEach((sessionId) => groupSessions.add(sessionId));
      return sum + (stats?.count || 0);
    }, 0);
    return { count, sessions: groupSessions.size };
  };

  const summarizeJourney = (
    definition: (typeof funnelJourneyDefinitions)[number],
    counts: Map<string, { count: number; sessions: Set<string> }>,
    previousCounts: Map<string, { count: number; sessions: Set<string> }>
  ) => {
    const stages = definition.stages.map((stage, index) => {
      const count = counts.get(stage.key)?.sessions.size || 0;
      const prevCount = previousCounts.get(stage.key)?.sessions.size || 0;
      const previousStageCount =
        index === 0 ? count : counts.get(definition.stages[index - 1].key)?.sessions.size || 0;
      const stageRate =
        index === 0
          ? count > 0
            ? 100
            : 0
          : previousStageCount > 0
            ? Math.min(100, (count / previousStageCount) * 100)
            : 0;

      return {
        key: stage.key,
        label: stage.label,
        count,
        prevCount,
        rate: stageRate,
        dropOffRate: index === 0 ? 0 : Math.max(0, 100 - stageRate),
      };
    });

    const firstCount = stages[0]?.count || 0;
    const lastCount = stages[stages.length - 1]?.count || 0;
    const prevFirstCount = stages[0]?.prevCount || 0;
    const prevLastCount = stages[stages.length - 1]?.prevCount || 0;
    const completionRate = firstCount > 0 ? Math.min(100, (lastCount / firstCount) * 100) : 0;
    const prevCompletionRate =
      prevFirstCount > 0 ? Math.min(100, (prevLastCount / prevFirstCount) * 100) : 0;
    const weakestStage = stages
      .slice(1)
      .sort((a, b) => b.dropOffRate - a.dropOffRate)[0];

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      recommendation: definition.recommendation,
      stages,
      completionRate,
      prevCompletionRate,
      dropOffRate: Math.max(0, 100 - completionRate),
      hasData: firstCount > 0,
      weakestStageKey: weakestStage?.key || null,
      weakestStageLabel: weakestStage?.label || null,
    };
  };

  const funnel = {
    totalEvents: Array.from(funnelCounts.values()).reduce((sum, item) => sum + item.count, 0),
    prevTotalEvents: Array.from(prevFunnelCounts.values()).reduce((sum, item) => sum + item.count, 0),
    groups: funnelGroupDefinitions.map((group) => {
      const current = summarizeFunnelGroup(group, funnelCounts);
      const previous = summarizeFunnelGroup(group, prevFunnelCounts);
      return {
        key: group.key,
        label: group.label,
        count: current.count,
        prevCount: previous.count,
        sessions: current.sessions,
      };
    }),
    steps: funnelStepDefinitions.map((step) => ({
      key: step.key,
      label: step.label,
      count: funnelCounts.get(step.key)?.count || 0,
      prevCount: prevFunnelCounts.get(step.key)?.count || 0,
      sessions: funnelCounts.get(step.key)?.sessions.size || 0,
    })),
    journeys: funnelJourneyDefinitions.map((journey) =>
      summarizeJourney(journey, funnelCounts, prevFunnelCounts)
    ),
    topEvents: Array.from(funnelCounts.entries())
      .map(([event_name, stats]) => ({
        event_name,
        label: funnelEventLabels[event_name] || event_name,
        count: stats.count,
        sessions: stats.sessions.size,
        prevCount: prevFunnelCounts.get(event_name)?.count || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };

  const collectSessions = (
    counts: Map<string, { count: number; sessions: Set<string> }>,
    eventNames: string[]
  ) => {
    const result = new Set<string>();
    eventNames.forEach((eventName) => {
      counts.get(eventName)?.sessions.forEach((sessionId) => result.add(sessionId));
    });
    return result;
  };

  const buildRegistrationRole = (
    key: 'technical' | 'client',
    label: string,
    startEvents: string[],
    completedEvents: string[]
  ) => {
    const started = collectSessions(funnelCounts, startEvents).size;
    const completed = collectSessions(funnelCounts, completedEvents).size;
    const prevStarted = collectSessions(prevFunnelCounts, startEvents).size;
    const prevCompleted = collectSessions(prevFunnelCounts, completedEvents).size;
    const completionRate = started > 0 ? Math.min(100, (completed / started) * 100) : 0;
    const prevCompletionRate =
      prevStarted > 0 ? Math.min(100, (prevCompleted / prevStarted) * 100) : 0;

    return {
      key,
      label,
      started,
      completed,
      prevStarted,
      prevCompleted,
      completionRate,
      prevCompletionRate,
      dropOffRate: started > 0 ? Math.max(0, 100 - completionRate) : 0,
    };
  };

  const registrationRoles = [
    buildRegistrationRole(
      'technical',
      'Técnicos',
      ['technical_registration_started', 'home_register_start', 'home_register_start_from_empresas'],
      ['technical_registration_completed']
    ),
    buildRegistrationRole(
      'client',
      'Clientes',
      ['client_registration_started'],
      ['client_registration_completed']
    ),
  ];
  const registrationStartedSessions = collectSessions(funnelCounts, [
    'technical_registration_started',
    'home_register_start',
    'home_register_start_from_empresas',
    'client_registration_started',
  ]);
  const prevRegistrationStartedSessions = collectSessions(prevFunnelCounts, [
    'technical_registration_started',
    'home_register_start',
    'home_register_start_from_empresas',
    'client_registration_started',
  ]);
  const registrationCompletedSessions = collectSessions(funnelCounts, [
    'technical_registration_completed',
    'client_registration_completed',
  ]);
  const prevRegistrationCompletedSessions = collectSessions(prevFunnelCounts, [
    'technical_registration_completed',
    'client_registration_completed',
  ]);
  const registrationStarted = registrationStartedSessions.size;
  const registrationCompleted = registrationCompletedSessions.size;
  const prevRegistrationStarted = prevRegistrationStartedSessions.size;
  const prevRegistrationCompleted = prevRegistrationCompletedSessions.size;
  const registrationConversion = {
    visitorSessions: sessions.size,
    prevVisitorSessions: prevSessions.size,
    started: registrationStarted,
    prevStarted: prevRegistrationStarted,
    completed: registrationCompleted,
    prevCompleted: prevRegistrationCompleted,
    visitToStartRate: sessions.size > 0 ? Math.min(100, (registrationStarted / sessions.size) * 100) : 0,
    prevVisitToStartRate:
      prevSessions.size > 0 ? Math.min(100, (prevRegistrationStarted / prevSessions.size) * 100) : 0,
    startToCompleteRate:
      registrationStarted > 0 ? Math.min(100, (registrationCompleted / registrationStarted) * 100) : 0,
    prevStartToCompleteRate:
      prevRegistrationStarted > 0
        ? Math.min(100, (prevRegistrationCompleted / prevRegistrationStarted) * 100)
        : 0,
    visitToCompleteRate:
      sessions.size > 0 ? Math.min(100, (registrationCompleted / sessions.size) * 100) : 0,
    prevVisitToCompleteRate:
      prevSessions.size > 0 ? Math.min(100, (prevRegistrationCompleted / prevSessions.size) * 100) : 0,
    measurementReady: registrationStarted > 0,
    roles: registrationRoles,
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
    registrationConversion,
    retention,
    sectionRetention,
    totals,
    prevTotals,
  });
}
