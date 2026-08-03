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

const ANALYTICS_PAGE_SIZE = 1000;
const MAX_ANALYTICS_ROWS = 50000;

type AnalyticsRangeQuery = {
  select: string;
  start: Date;
  end: Date;
  eventType?: string;
  eventTypes?: string[];
  path?: string;
  userId?: string;
};

const fetchAnalyticsRange = async ({
  select,
  start,
  end,
  eventType,
  eventTypes,
  path,
  userId,
}: AnalyticsRangeQuery) => {
  const rows: any[] = [];

  for (let from = 0; from < MAX_ANALYTICS_ROWS; from += ANALYTICS_PAGE_SIZE) {
    const to = Math.min(from + ANALYTICS_PAGE_SIZE - 1, MAX_ANALYTICS_ROWS - 1);
    let query: any = supabase!
      .from('analytics_events')
      .select(select)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (eventTypes?.length) query = query.in('event_type', eventTypes);
    else if (eventType) query = query.eq('event_type', eventType);
    if (path) query = query.eq('path', path);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) return { data: [] as any[], error, truncated: false };

    const batch = data || [];
    rows.push(...batch);
    if (batch.length < ANALYTICS_PAGE_SIZE) {
      return { data: rows, error: null, truncated: false };
    }
  }

  return { data: rows, error: null, truncated: true };
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

type TechnicalAuthAccountRange = {
  total: number;
  technicians: number;
  companies: number;
  providers: Record<string, number>;
};

const createEmptyTechnicalAuthAccountRange = (): TechnicalAuthAccountRange => ({
  total: 0,
  technicians: 0,
  companies: 0,
  providers: {},
});

const getAuthAccountProfile = (authUser: any) =>
  String(authUser?.user_metadata?.user_type || authUser?.user_metadata?.profile || '')
    .trim()
    .toLowerCase();

const getAuthAccountProvider = (authUser: any) =>
  String(authUser?.app_metadata?.provider || authUser?.identities?.[0]?.provider || 'other')
    .trim()
    .toLowerCase() || 'other';

const summarizeTechnicalAuthAccounts = (
  authUsers: any[],
  start: Date,
  end: Date,
  excludedUserIds: Set<string>,
  excludedEmails: Set<string>
) => {
  const summary = createEmptyTechnicalAuthAccountRange();
  authUsers.forEach((authUser) => {
    const authUserId = String(authUser?.id || '').trim();
    const email = String(authUser?.email || '').trim().toLowerCase();
    const createdAt = new Date(authUser?.created_at || '').getTime();
    const profile = getAuthAccountProfile(authUser);
    if (
      !authUserId ||
      excludedUserIds.has(authUserId) ||
      (email && excludedEmails.has(email)) ||
      !Number.isFinite(createdAt) ||
      createdAt < start.getTime() ||
      createdAt > end.getTime() ||
      (profile !== 'tecnico' && profile !== 'empresa')
    ) {
      return;
    }

    summary.total += 1;
    if (profile === 'empresa') summary.companies += 1;
    else summary.technicians += 1;
    const provider = getAuthAccountProvider(authUser);
    summary.providers[provider] = (summary.providers[provider] || 0) + 1;
  });
  return summary;
};

const listAllAuthUsers = async () => {
  const authUsers: any[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase!.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users || [];
    authUsers.push(...batch);
    if (batch.length < 1000) break;
  }
  return authUsers;
};

const technicalRoleEvents = new Set([
  'technical_registration_started',
  'technical_registration_method_selected',
  'technical_registration_submitted',
  'technical_registration_validation_failed',
  'technical_registration_confirmation_required',
  'technical_registration_existing_account',
  'technical_registration_failed',
  'technical_registration_completed',
  'technical_profile_onboarding_started',
  'technical_profile_identity_completed',
  'technical_profile_contact_completed',
  'technical_profile_specialty_completed',
  'technical_profile_location_completed',
  'technical_profile_completed',
  'technical_profile_published',
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
  technical_registration_method_selected: 'Métodos de registro elegidos',
  technical_registration_submitted: 'Registros técnicos enviados',
  technical_registration_validation_failed: 'Validaciones de registro fallidas',
  technical_registration_confirmation_required: 'Altas pendientes de confirmación',
  technical_registration_existing_account: 'Cuentas existentes detectadas',
  technical_registration_failed: 'Errores de alta técnica',
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
  labor_prices_viewed: 'Consultas de valores de mano de obra',
  labor_price_item_selected: 'Valores de mano de obra seleccionados',
  labor_price_items_added_to_quote: 'Valores agregados al presupuesto',
  community_post_published: 'Publicaciones en comunidad',
  community_comment_published: 'Comentarios en comunidad',
  community_post_liked: 'Me gusta en comunidad',
  community_post_started: 'Inicios de publicacion en comunidad',
  community_comment_started: 'Inicios de comentario en comunidad',
  community_post_like_requested: 'Intentos de Me gusta en comunidad',
  community_auth_requested: 'Ingresos solicitados desde comunidad',
  community_profile_opened: 'Perfiles abiertos desde comunidad',
  home_audience_tecnicos: 'Interés en trabajar como técnico',
  home_audience_empresas: 'Interés de empresas',
  home_audience_clientes: 'Interés en contratar',
  home_open_guia_precios: 'Aperturas de valores de mano de obra',
  home_download_android_click: 'Intentos de descarga Android',
  marketplace_search_performed: 'Búsquedas filtradas en el mapa',
  marketplace_technician_selected: 'Técnicos seleccionados en el mapa',
  marketplace_profile_opened: 'Perfiles abiertos desde la vidriera',
  marketplace_location_requested: 'Solicitudes de ubicación en el mapa',
  marketplace_location_resolved: 'Resultados de ubicación en el mapa',
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
  'community_post_published',
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
    key: 'labor_prices',
    label: 'Valores de mano de obra',
    events: [
      'labor_prices_viewed',
      'labor_price_item_selected',
      'labor_price_items_added_to_quote',
    ],
  },
  {
    key: 'contacts',
    label: 'Contacto con técnicos',
    events: ['technician_whatsapp_contact'],
  },
  {
    key: 'marketplace',
    label: 'Mapa y perfiles',
    events: [
      'marketplace_search_performed',
      'marketplace_technician_selected',
      'marketplace_profile_opened',
      'marketplace_location_requested',
      'marketplace_location_resolved',
    ],
  },
  {
    key: 'community',
    label: 'Comunidad',
    events: [
      'community_post_started',
      'community_post_published',
      'community_comment_started',
      'community_comment_published',
      'community_post_like_requested',
      'community_post_liked',
      'community_auth_requested',
      'community_profile_opened',
    ],
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

type SectionConversionStageDefinition = {
  key: string;
  label: string;
  eventNames?: string[];
  pathMatcher?: (path: string) => boolean;
  requiresUser?: boolean;
};

type SectionConversionDefinition = {
  key: string;
  label: string;
  description: string;
  recommendation: string;
  stages: SectionConversionStageDefinition[];
};

const parseAnalyticsPath = (rawPath: string) => {
  const [pathname, rawSearch = ''] = String(rawPath || '').split('?');
  return {
    pathname: pathname || '/',
    searchParams: new URLSearchParams(rawSearch),
  };
};

const sectionConversionDefinitions: SectionConversionDefinition[] = [
  {
    key: 'prices_to_quote',
    label: 'Valores MO a presupuesto',
    description: 'Personas que consultan valores de mano de obra y luego crean un presupuesto.',
    recommendation:
      'Reforzar el acceso al presupuestador desde cada valor y conservar los ítems elegidos.',
    stages: [
      {
        key: 'labor_prices_visited',
        label: 'Visita valores MO',
        eventNames: ['labor_prices_viewed'],
        requiresUser: true,
      },
      {
        key: 'labor_price_item_selected',
        label: 'Selecciona un valor',
        eventNames: ['labor_price_item_selected'],
      },
      {
        key: 'labor_price_items_added',
        label: 'Lo agrega al presupuesto',
        eventNames: ['labor_price_items_added_to_quote'],
      },
      {
        key: 'quote_created_after_prices',
        label: 'Crea presupuesto',
        eventNames: ['quote_created'],
      },
    ],
  },
  {
    key: 'marketplace_to_contact',
    label: 'Mapa a contacto',
    description: 'Personas que exploran el mapa, abren un perfil y contactan a un técnico.',
    recommendation:
      'Mejorar filtros, cercanía y disponibilidad para que el contacto sea el paso natural.',
    stages: [
      {
        key: 'marketplace_visited',
        label: 'Visita mapa',
        pathMatcher: (rawPath) => {
          const pathname = parseAnalyticsPath(rawPath).pathname;
          return (
            pathname === '/vidriera' ||
            pathname.startsWith('/vidriera/') ||
            /^\/tecnicos\/[^/]+\/[^/]+\/?$/.test(pathname)
          );
        },
      },
      {
        key: 'technical_profile_visited',
        label: 'Abre perfil',
        eventNames: ['marketplace_profile_opened'],
        pathMatcher: (rawPath) => parseAnalyticsPath(rawPath).pathname.startsWith('/tecnico/'),
      },
      {
        key: 'technician_contacted',
        label: 'Contacta',
        eventNames: ['technician_whatsapp_contact'],
      },
    ],
  },
  {
    key: 'community_to_participation',
    label: 'Comunidad a participación',
    description: 'Personas que visitan el muro y realizan una acción dentro de la comunidad.',
    recommendation:
      'Mostrar contenido relevante desde el inicio y simplificar publicar, comentar o dar Me gusta.',
    stages: [
      {
        key: 'community_visited',
        label: 'Visita comunidad',
        pathMatcher: (rawPath) => parseAnalyticsPath(rawPath).pathname === '/comunidad',
      },
      {
        key: 'community_participated',
        label: 'Participa',
        eventNames: [
          'community_post_published',
          'community_comment_published',
          'community_post_liked',
        ],
      },
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

  const analyticsFilters = { path, userId };
  const [currentPageResult, previousPageResult] = await Promise.all([
    fetchAnalyticsRange({
      select: 'id, event_type, path, duration_ms, created_at, session_id, user_id',
      start: startDate,
      end: endDate,
      eventTypes: ['page_view', 'page_duration'],
      ...analyticsFilters,
    }),
    fetchAnalyticsRange({
      select: 'id, event_type, path, duration_ms, created_at, session_id, user_id',
      start: prevStart,
      end: prevEnd,
      eventTypes: ['page_view', 'page_duration'],
      ...analyticsFilters,
    }),
  ]);
  const { data: events, error } = currentPageResult;
  const { data: prevEvents, error: prevError } = previousPageResult;

  if (error || prevError) {
    return NextResponse.json({ error: error?.message || prevError?.message }, { status: 500 });
  }

  let funnelEvents: any[] = [];
  let prevFunnelEvents: any[] = [];
  let currentFunnelTruncated = false;
  let previousFunnelTruncated = false;
  const [currentFunnelResult, previousFunnelResult] = await Promise.all([
    fetchAnalyticsRange({
      select: 'id, event_name, event_context, created_at, session_id, user_id, path',
      start: startDate,
      end: endDate,
      eventType: 'funnel',
      ...analyticsFilters,
    }),
    fetchAnalyticsRange({
      select: 'id, event_name, event_context, created_at, session_id, user_id, path',
      start: prevStart,
      end: prevEnd,
      eventType: 'funnel',
      ...analyticsFilters,
    }),
  ]);
  const { data: funnelData, error: funnelError } = currentFunnelResult;
  const { data: prevFunnelData, error: prevFunnelError } = previousFunnelResult;

  if (funnelError || prevFunnelError) {
    const funnelMessage = funnelError?.message || prevFunnelError?.message || '';
    const isSchemaLag =
      /event_name|event_context|column.*does not exist|schema cache/i.test(funnelMessage);
    if (!isSchemaLag) {
      return NextResponse.json({ error: funnelMessage }, { status: 500 });
    }

    const [fallbackCurrent, fallbackPrevious] = await Promise.all([
      fetchAnalyticsRange({
        select: 'id, event_name, created_at, session_id, user_id, path',
        start: startDate,
        end: endDate,
        eventType: 'funnel',
        ...analyticsFilters,
      }),
      fetchAnalyticsRange({
        select: 'id, event_name, created_at, session_id, user_id, path',
        start: prevStart,
        end: prevEnd,
        eventType: 'funnel',
        ...analyticsFilters,
      }),
    ]);
    if (!fallbackCurrent.error && !fallbackPrevious.error) {
      funnelEvents = fallbackCurrent.data || [];
      prevFunnelEvents = fallbackPrevious.data || [];
      currentFunnelTruncated = fallbackCurrent.truncated;
      previousFunnelTruncated = fallbackPrevious.truncated;
    }
  } else {
    funnelEvents = funnelData || [];
    prevFunnelEvents = prevFunnelData || [];
    currentFunnelTruncated = currentFunnelResult.truncated;
    previousFunnelTruncated = previousFunnelResult.truncated;
  }

  const dataCoverage = {
    current: {
      pageRows: events.length,
      funnelRows: funnelEvents.length,
      truncated: currentPageResult.truncated || currentFunnelTruncated,
    },
    previous: {
      pageRows: prevEvents.length,
      funnelRows: prevFunnelEvents.length,
      truncated: previousPageResult.truncated || previousFunnelTruncated,
    },
    maxRowsPerQuery: MAX_ANALYTICS_ROWS,
  };

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

  let authUsersSnapshot: any[] = [];
  let authUsersSnapshotError: string | null = null;
  try {
    authUsersSnapshot = await listAllAuthUsers();
    authUsersSnapshot.forEach((authUser) => {
      const authUserId = String(authUser?.id || '').trim();
      const authEmail = String(authUser?.email || '').trim().toLowerCase();
      if (authUserId && authEmail && excludedEmails.has(authEmail)) {
        excludedRetentionUserIds.add(authUserId);
      }
    });
  } catch (authError: any) {
    authUsersSnapshotError = String(
      authError?.message || 'No se pudo consultar Supabase Auth.'
    ).slice(0, 180);
  }

  const authRoleByUserId = new Map<string, 'technical' | 'client'>();
  authUsersSnapshot.forEach((authUser) => {
    const authUserId = String(authUser?.id || '').trim();
    const authProfile = getAuthAccountProfile(authUser);
    if (!authUserId) return;
    if (authProfile === 'tecnico' || authProfile === 'empresa') {
      authRoleByUserId.set(authUserId, 'technical');
    } else if (authProfile === 'cliente') {
      authRoleByUserId.set(authUserId, 'client');
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
    const authRole = authRoleByUserId.get(retentionUserId);
    if (authRole) return authRole;
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
  const summarizeReturnReasons = (
    rows: any[],
    activityDays: Map<string, Set<string>>
  ) => {
    type ReturnReasonStats = {
      key: string;
      role: string;
      target: string;
      views: number;
      selections: number;
      reachedAccounts: Set<string>;
      selectedAccounts: Set<string>;
      returnedAccounts: Set<string>;
    };
    const viewedAccounts = new Set<string>();
    const selectedAccounts = new Set<string>();
    const returnedAccounts = new Set<string>();
    const reasons = new Map<string, ReturnReasonStats>();
    let views = 0;
    let selections = 0;

    rows.forEach((event) => {
      const eventName = String(event?.event_name || '').trim();
      const isView = eventName === 'account_return_reason_viewed';
      const isSelection = eventName === 'account_return_reason_selected';
      if (!isView && !isSelection) return;

      const eventUserId = String(event?.user_id || '').trim();
      if (!eventUserId || excludedRetentionUserIds.has(eventUserId)) return;
      const context =
        event?.event_context &&
        typeof event.event_context === 'object' &&
        !Array.isArray(event.event_context)
          ? event.event_context
          : {};
      const reason = String(context.reason || 'unknown').trim().slice(0, 80) || 'unknown';
      const contextRole = String(context.role || '').trim().toLowerCase();
      const resolvedRole =
        contextRole === 'technical' || contextRole === 'client'
          ? contextRole
          : resolveRetentionRole(eventUserId);
      const target = String(context.target || 'unknown').trim().slice(0, 80) || 'unknown';
      const reasonKey = `${resolvedRole}:${reason}:${target}`;
      const stats = reasons.get(reasonKey) || {
        key: reason,
        role: resolvedRole,
        target,
        views: 0,
        selections: 0,
        reachedAccounts: new Set<string>(),
        selectedAccounts: new Set<string>(),
        returnedAccounts: new Set<string>(),
      };

      if (isView) {
        views += 1;
        stats.views += 1;
        viewedAccounts.add(eventUserId);
        stats.reachedAccounts.add(eventUserId);
      } else {
        selections += 1;
        stats.selections += 1;
        selectedAccounts.add(eventUserId);
        stats.selectedAccounts.add(eventUserId);
        const selectionDay = formatDate(new Date(event.created_at));
        const returnedLater = Array.from(activityDays.get(eventUserId) || []).some(
          (activityDay) => activityDay > selectionDay
        );
        if (returnedLater) {
          returnedAccounts.add(eventUserId);
          stats.returnedAccounts.add(eventUserId);
        }
      }
      reasons.set(reasonKey, stats);
    });

    return {
      views,
      selections,
      reachedAccounts: viewedAccounts.size,
      selectedAccounts: selectedAccounts.size,
      selectionRate:
        viewedAccounts.size > 0
          ? Math.min(100, (selectedAccounts.size / viewedAccounts.size) * 100)
          : 0,
      returnedAfterSelectionAccounts: returnedAccounts.size,
      returnAfterSelectionRate:
        selectedAccounts.size > 0
          ? Math.min(100, (returnedAccounts.size / selectedAccounts.size) * 100)
          : 0,
      reasons: Array.from(reasons.values())
        .map((stats) => ({
          key: stats.key,
          role: stats.role,
          target: stats.target,
          views: stats.views,
          selections: stats.selections,
          reachedAccounts: stats.reachedAccounts.size,
          selectedAccounts: stats.selectedAccounts.size,
          returnedAfterSelectionAccounts: stats.returnedAccounts.size,
        }))
        .sort(
          (left, right) =>
            right.selectedAccounts - left.selectedAccounts ||
            right.reachedAccounts - left.reachedAccounts ||
            left.key.localeCompare(right.key, 'es')
        ),
    };
  };

  const currentReturnReasons = summarizeReturnReasons(funnelEvents || [], activityDaysByUser);
  const previousReturnReasons = summarizeReturnReasons(
    prevFunnelEvents || [],
    prevActivityDaysByUser
  );

  const retention = {
    ...currentRetention,
    prevActiveAccounts: previousRetention.activeAccounts,
    prevReturningAccounts: previousRetention.returningAccounts,
    prevSingleDayAccounts: previousRetention.singleDayAccounts,
    prevReturnRate: previousRetention.returnRate,
    measurementReady:
      rangeDays >= 2 && currentRetention.activeAccounts > 0 && !dataCoverage.current.truncated,
    dataComplete: !dataCoverage.current.truncated,
    returnReasons: currentReturnReasons,
    prevReturnReasons: previousReturnReasons,
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

  const getTechnicalRegistrationJourneyKey = (event: any) => {
    const context =
      event?.event_context &&
      typeof event.event_context === 'object' &&
      !Array.isArray(event.event_context)
        ? event.event_context
        : {};
    const attemptId = String(context.attempt_id || '').trim().slice(0, 120);
    if (attemptId) return `attempt:${attemptId}`;
    const sessionId = String(event?.session_id || '').trim().slice(0, 120);
    return sessionId ? `session:${sessionId}` : '';
  };

  const summarizeTechnicalRegistrationAttempts = (rows: any[]) => {
    const excludedJourneyKeys = new Set<string>();
    rows.forEach((event) => {
      const eventUserId = String(event?.user_id || '').trim();
      if (!eventUserId || !excludedRetentionUserIds.has(eventUserId)) return;
      const journeyKey = getTechnicalRegistrationJourneyKey(event);
      if (journeyKey) excludedJourneyKeys.add(journeyKey);
    });

    const starts = new Map<string, number>();
    const completions = new Map<string, number>();
    rows.forEach((event) => {
      const eventName = String(event?.event_name || '').trim();
      if (
        eventName !== 'technical_registration_started' &&
        eventName !== 'technical_registration_completed'
      )
        return;
      const journeyKey = getTechnicalRegistrationJourneyKey(event);
      const createdAt = new Date(event?.created_at || '').getTime();
      if (!journeyKey || excludedJourneyKeys.has(journeyKey) || !Number.isFinite(createdAt)) return;

      if (eventName === 'technical_registration_started') {
        const previous = starts.get(journeyKey);
        if (previous === undefined || createdAt < previous) starts.set(journeyKey, createdAt);
        return;
      }
      const previous = completions.get(journeyKey);
      if (previous === undefined || createdAt < previous) completions.set(journeyKey, createdAt);
    });

    const completedKeys = new Set<string>();
    starts.forEach((startedAt, journeyKey) => {
      const completedAt = completions.get(journeyKey);
      if (completedAt !== undefined && completedAt >= startedAt) completedKeys.add(journeyKey);
    });
    return { startedKeys: new Set(starts.keys()), completedKeys };
  };

  const currentTechnicalRegistrationAttempts = summarizeTechnicalRegistrationAttempts(
    funnelEvents || []
  );

  const previousTechnicalRegistrationAttempts = summarizeTechnicalRegistrationAttempts(
    prevFunnelEvents || []
  );

  const funnelCounts = new Map<string, { count: number; sessions: Set<string> }>();
  const prevFunnelCounts = new Map<string, { count: number; sessions: Set<string> }>();

  (funnelEvents || []).forEach((event: any) => {
    const eventUserId = String(event.user_id || '').trim();
    if (eventUserId && excludedRetentionUserIds.has(eventUserId)) return;
    const key = (event.event_name || 'unknown').toString().slice(0, 80);
    if (!key) return;
    const current = funnelCounts.get(key) || { count: 0, sessions: new Set<string>() };
    current.count += 1;
    if (event.session_id) current.sessions.add(event.session_id);
    funnelCounts.set(key, current);
  });

  (prevFunnelEvents || []).forEach((event: any) => {
    const eventUserId = String(event.user_id || '').trim();
    if (eventUserId && excludedRetentionUserIds.has(eventUserId)) return;
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

  const summarizeTechnicalRegistrationJourney = (
    definition: (typeof funnelJourneyDefinitions)[number]
  ) => {
    const started = currentTechnicalRegistrationAttempts.startedKeys.size;
    const completed = currentTechnicalRegistrationAttempts.completedKeys.size;
    const prevStarted = previousTechnicalRegistrationAttempts.startedKeys.size;
    const prevCompleted = previousTechnicalRegistrationAttempts.completedKeys.size;
    const completionRate = started > 0 ? Math.min(100, (completed / started) * 100) : 0;
    const prevCompletionRate =
      prevStarted > 0 ? Math.min(100, (prevCompleted / prevStarted) * 100) : 0;
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      recommendation:
        'Comparar intentos atribuidos con las cuentas reales de Supabase Auth y revisar el motivo de cada fallo.',
      stages: [
        {
          key: 'technical_registration_started',
          label: 'Inicio',
          count: started,
          prevCount: prevStarted,
          rate: started > 0 ? 100 : 0,
          dropOffRate: 0,
        },
        {
          key: 'technical_registration_completed',
          label: 'Cuenta creada',
          count: completed,
          prevCount: prevCompleted,
          rate: completionRate,
          dropOffRate: Math.max(0, 100 - completionRate),
        },
      ],
      completionRate,
      prevCompletionRate,
      dropOffRate: Math.max(0, 100 - completionRate),
      hasData: started > 0,
      weakestStageKey: completed < started ? 'technical_registration_completed' : null,
      weakestStageLabel: completed < started ? 'Cuenta creada' : null,
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
      journey.key === 'technical_registration'
        ? summarizeTechnicalRegistrationJourney(journey)
        : summarizeJourney(journey, funnelCounts, prevFunnelCounts)
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

  type SessionTimeMap = Map<string, number>;

  const isExcludedAnalyticsRow = (row: any) => {
    const rowUserId = String(row?.user_id || '').trim();
    return Boolean(rowUserId && excludedRetentionUserIds.has(rowUserId));
  };

  const collectStageSessionTimes = (
    pageRows: any[],
    funnelRows: any[],
    stage: SectionConversionStageDefinition
  ) => {
    const sessionTimes: SessionTimeMap = new Map();
    const registerTime = (row: any) => {
      if (isExcludedAnalyticsRow(row)) return;
      if (stage.requiresUser && !String(row?.user_id || '').trim()) return;
      const sessionId = String(row?.session_id || '').trim();
      const createdAt = new Date(row?.created_at || '').getTime();
      if (!sessionId || !Number.isFinite(createdAt)) return;
      const previousTime = sessionTimes.get(sessionId);
      if (previousTime === undefined || createdAt < previousTime) {
        sessionTimes.set(sessionId, createdAt);
      }
    };

    if (stage.pathMatcher) {
      pageRows.forEach((row) => {
        if (row?.event_type !== 'page_view') return;
        if (stage.pathMatcher?.(String(row?.path || ''))) registerTime(row);
      });
    }

    if (stage.eventNames?.length) {
      const eventNames = new Set(stage.eventNames);
      funnelRows.forEach((row) => {
        if (eventNames.has(String(row?.event_name || ''))) registerTime(row);
      });
    }

    return sessionTimes;
  };

  const advanceSessionTimes = (previous: SessionTimeMap, candidates: SessionTimeMap) => {
    const advanced: SessionTimeMap = new Map();
    previous.forEach((previousTime, sessionId) => {
      const candidateTime = candidates.get(sessionId);
      if (candidateTime !== undefined && candidateTime >= previousTime) {
        advanced.set(sessionId, candidateTime);
      }
    });
    return advanced;
  };

  const summarizeSectionConversion = (
    definition: SectionConversionDefinition,
    pageRows: any[],
    funnelRows: any[],
    previousPageRows: any[],
    previousFunnelRows: any[]
  ) => {
    let currentProgress: SessionTimeMap | null = null;
    let previousProgress: SessionTimeMap | null = null;
    let priorStageCount = 0;

    const stages = definition.stages.map((stage, index) => {
      const currentCandidates = collectStageSessionTimes(pageRows, funnelRows, stage);
      const previousCandidates = collectStageSessionTimes(
        previousPageRows,
        previousFunnelRows,
        stage
      );
      currentProgress =
        index === 0 || currentProgress === null
          ? currentCandidates
          : advanceSessionTimes(currentProgress, currentCandidates);
      previousProgress =
        index === 0 || previousProgress === null
          ? previousCandidates
          : advanceSessionTimes(previousProgress, previousCandidates);

      const count = currentProgress.size;
      const prevCount = previousProgress.size;
      const previousStageCount = index === 0 ? count : priorStageCount;
      const rate =
        index === 0
          ? count > 0
            ? 100
            : 0
          : previousStageCount > 0
            ? Math.min(100, (count / previousStageCount) * 100)
            : 0;
      priorStageCount = count;

      return {
        key: stage.key,
        label: stage.label,
        count,
        prevCount,
        rate,
        dropOffRate: index === 0 ? 0 : Math.max(0, 100 - rate),
      };
    });

    const firstStage = stages[0];
    const lastStage = stages[stages.length - 1];
    const completionRate =
      firstStage?.count > 0
        ? Math.min(100, ((lastStage?.count || 0) / firstStage.count) * 100)
        : 0;
    const prevCompletionRate =
      firstStage?.prevCount > 0
        ? Math.min(100, ((lastStage?.prevCount || 0) / firstStage.prevCount) * 100)
        : 0;
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
      hasData: Boolean(firstStage?.count),
      weakestStageKey: weakestStage?.key || null,
      weakestStageLabel: weakestStage?.label || null,
    };
  };

  const sectionConversionJourneys = sectionConversionDefinitions.map((definition) =>
    summarizeSectionConversion(
      definition,
      events || [],
      funnelEvents || [],
      prevEvents || [],
      prevFunnelEvents || []
    )
  );
  const prioritySectionConversion =
    sectionConversionJourneys
      .filter((journey) => journey.hasData)
      .sort(
        (a, b) =>
          b.dropOffRate - a.dropOffRate ||
          (b.stages[0]?.count || 0) - (a.stages[0]?.count || 0)
      )[0] || null;
  const sectionConversions = {
    measurement: 'Misma sesión y orden real',
    priorityKey: prioritySectionConversion?.key || null,
    journeys: sectionConversionJourneys,
  };

  const normalizeDemandKey = (value: unknown) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .slice(0, 180);
  const readDemandText = (value: unknown) => String(value || '').trim().slice(0, 180);
  const readDemandNumber = (value: unknown) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const summarizeMarketplaceDemand = (sourceEvents: any[]) => {
    const searches = new Set<string>();
    const noResultSearches = new Set<string>();
    const specialtyGaps = new Map<
      string,
      { key: string; label: string; searches: Set<string>; zones: Set<string> }
    >();
    const zoneGaps = new Map<
      string,
      { key: string; label: string; searches: Set<string>; specialties: Set<string> }
    >();

    sourceEvents.forEach((event, index) => {
      if (event?.event_name !== 'marketplace_search_performed') return;
      const eventUserId = String(event.user_id || '').trim();
      if (eventUserId && excludedRetentionUserIds.has(eventUserId)) return;

      const context =
        event?.event_context &&
        typeof event.event_context === 'object' &&
        !Array.isArray(event.event_context)
          ? (event.event_context as Record<string, unknown>)
          : {};
      const zone = readDemandText(context.zone);
      const guild = readDemandText(context.guild);
      const specialty = readDemandText(context.specialty);
      const specialtyLabel = specialty || guild;
      const resultCount = readDemandNumber(context.result_count);
      const zoneResultCount = readDemandNumber(context.zone_result_count);
      const sessionId = String(
        event.session_id || `event-${event.created_at || index}`
      ).trim();
      const searchKey = [
        sessionId,
        normalizeDemandKey(zone),
        normalizeDemandKey(guild),
        normalizeDemandKey(specialty),
      ].join('|');

      searches.add(searchKey);

      const hasNoResults =
        resultCount !== null ? resultCount <= 0 : context.has_results === false;
      if (hasNoResults) {
        noResultSearches.add(searchKey);
        const specialtyKey = normalizeDemandKey(specialtyLabel);
        if (specialtyKey) {
          const current = specialtyGaps.get(specialtyKey) || {
            key: specialtyKey,
            label: specialtyLabel,
            searches: new Set<string>(),
            zones: new Set<string>(),
          };
          current.searches.add(searchKey);
          if (zone) current.zones.add(zone);
          specialtyGaps.set(specialtyKey, current);
        }
      }

      const zoneKey = normalizeDemandKey(zone);
      if (zoneKey && zoneResultCount !== null && zoneResultCount <= 0) {
        const current = zoneGaps.get(zoneKey) || {
          key: zoneKey,
          label: zone,
          searches: new Set<string>(),
          specialties: new Set<string>(),
        };
        current.searches.add(searchKey);
        if (specialtyLabel) current.specialties.add(specialtyLabel);
        zoneGaps.set(zoneKey, current);
      }
    });

    return {
      totalSearches: searches.size,
      noResultSearches: noResultSearches.size,
      specialtyGaps,
      zoneGaps,
    };
  };

  const currentMarketplaceDemand = summarizeMarketplaceDemand(funnelEvents || []);
  const previousMarketplaceDemand = summarizeMarketplaceDemand(prevFunnelEvents || []);
  const marketplaceDemand = {
    measurement: 'Combinaciones únicas de filtros por sesión',
    totalSearches: currentMarketplaceDemand.totalSearches,
    prevTotalSearches: previousMarketplaceDemand.totalSearches,
    noResultSearches: currentMarketplaceDemand.noResultSearches,
    prevNoResultSearches: previousMarketplaceDemand.noResultSearches,
    noResultRate:
      currentMarketplaceDemand.totalSearches > 0
        ? Math.min(
            100,
            (currentMarketplaceDemand.noResultSearches /
              currentMarketplaceDemand.totalSearches) *
              100
          )
        : 0,
    prevNoResultRate:
      previousMarketplaceDemand.totalSearches > 0
        ? Math.min(
            100,
            (previousMarketplaceDemand.noResultSearches /
              previousMarketplaceDemand.totalSearches) *
              100
          )
        : 0,
    specialtyGaps: Array.from(currentMarketplaceDemand.specialtyGaps.values())
      .map((item) => ({
        key: item.key,
        label: item.label,
        searches: item.searches.size,
        prevSearches:
          previousMarketplaceDemand.specialtyGaps.get(item.key)?.searches.size || 0,
        zones: Array.from(item.zones).slice(0, 4),
      }))
      .sort((a, b) => b.searches - a.searches || a.label.localeCompare(b.label, 'es'))
      .slice(0, 8),
    zoneGaps: Array.from(currentMarketplaceDemand.zoneGaps.values())
      .map((item) => ({
        key: item.key,
        label: item.label,
        searches: item.searches.size,
        prevSearches: previousMarketplaceDemand.zoneGaps.get(item.key)?.searches.size || 0,
        specialties: Array.from(item.specialties).slice(0, 4),
      }))
      .sort((a, b) => b.searches - a.searches || a.label.localeCompare(b.label, 'es'))
      .slice(0, 8),
  };

  let technicalAuthAccounts: {
    status: 'ready' | 'error';
    current: TechnicalAuthAccountRange;
    previous: TechnicalAuthAccountRange;
    providers: { key: string; label: string; count: number; prevCount: number }[];
    attributedCompletions: number;
    prevAttributedCompletions: number;
    instrumentationCoverage: number;
    prevInstrumentationCoverage: number;
    error: string | null;
  } = {
    status: 'error',
    current: createEmptyTechnicalAuthAccountRange(),
    previous: createEmptyTechnicalAuthAccountRange(),
    providers: [],
    attributedCompletions: currentTechnicalRegistrationAttempts.completedKeys.size,
    prevAttributedCompletions: previousTechnicalRegistrationAttempts.completedKeys.size,
    instrumentationCoverage: 0,
    prevInstrumentationCoverage: 0,
    error: 'No se pudo consultar Supabase Auth.',
  };

  try {
    if (authUsersSnapshotError) throw new Error(authUsersSnapshotError);
    const current = summarizeTechnicalAuthAccounts(
      authUsersSnapshot,
      startDate,
      endDate,
      excludedRetentionUserIds,
      excludedEmails
    );
    const previous = summarizeTechnicalAuthAccounts(
      authUsersSnapshot,
      prevStart,
      prevEnd,
      excludedRetentionUserIds,
      excludedEmails
    );
    const providerKeys = Array.from(
      new Set([...Object.keys(current.providers), ...Object.keys(previous.providers)])
    );
    const providerLabels: Record<string, string> = {
      email: 'Correo',
      google: 'Google',
      apple: 'Apple',
      phone: 'Teléfono',
      other: 'Otro',
    };
    const attributedCompletions = currentTechnicalRegistrationAttempts.completedKeys.size;
    const prevAttributedCompletions = previousTechnicalRegistrationAttempts.completedKeys.size;
    technicalAuthAccounts = {
      status: 'ready',
      current,
      previous,
      providers: providerKeys
        .map((provider) => ({
          key: provider,
          label: providerLabels[provider] || provider,
          count: current.providers[provider] || 0,
          prevCount: previous.providers[provider] || 0,
        }))
        .sort((a, b) => b.count - a.count || b.prevCount - a.prevCount || a.label.localeCompare(b.label, 'es')),
      attributedCompletions,
      prevAttributedCompletions,
      instrumentationCoverage:
        current.total > 0 ? Math.min(100, (attributedCompletions / current.total) * 100) : 0,
      prevInstrumentationCoverage:
        previous.total > 0
          ? Math.min(100, (prevAttributedCompletions / previous.total) * 100)
          : 0,
      error: null,
    };
  } catch (authError: any) {
    technicalAuthAccounts = {
      ...technicalAuthAccounts,
      error: String(authError?.message || 'No se pudo consultar Supabase Auth.').slice(0, 180),
    };
  }

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

  const technicalRegistrationStarted = currentTechnicalRegistrationAttempts.startedKeys.size;
  const technicalRegistrationCompleted = currentTechnicalRegistrationAttempts.completedKeys.size;
  const prevTechnicalRegistrationStarted = previousTechnicalRegistrationAttempts.startedKeys.size;
  const prevTechnicalRegistrationCompleted = previousTechnicalRegistrationAttempts.completedKeys.size;
  const technicalRegistrationRate =
    technicalRegistrationStarted > 0
      ? Math.min(100, (technicalRegistrationCompleted / technicalRegistrationStarted) * 100)
      : 0;
  const prevTechnicalRegistrationRate =
    prevTechnicalRegistrationStarted > 0
      ? Math.min(100, (prevTechnicalRegistrationCompleted / prevTechnicalRegistrationStarted) * 100)
      : 0;
  const clientRegistrationRole = buildRegistrationRole(
    'client',
    'Clientes',
    ['client_registration_started'],
    ['client_registration_completed']
  );
  const registrationRoles = [
    {
      key: 'technical' as const,
      label: 'Técnicos y empresas',
      started: technicalRegistrationStarted,
      completed: technicalRegistrationCompleted,
      prevStarted: prevTechnicalRegistrationStarted,
      prevCompleted: prevTechnicalRegistrationCompleted,
      completionRate: technicalRegistrationRate,
      prevCompletionRate: prevTechnicalRegistrationRate,
      dropOffRate:
        technicalRegistrationStarted > 0 ? Math.max(0, 100 - technicalRegistrationRate) : 0,
    },
    clientRegistrationRole,
  ];
  const registrationStarted = technicalRegistrationStarted + clientRegistrationRole.started;
  const registrationCompleted = technicalRegistrationCompleted + clientRegistrationRole.completed;
  const prevRegistrationStarted =
    prevTechnicalRegistrationStarted + clientRegistrationRole.prevStarted;
  const prevRegistrationCompleted =
    prevTechnicalRegistrationCompleted + clientRegistrationRole.prevCompleted;
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
    technicalAuthAccounts,
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
    dataCoverage,
    series,
    topScreens,
    topRoutes,
    topUsers,
    funnel,
    sectionConversions,
    marketplaceDemand,
    registrationConversion,
    retention,
    sectionRetention,
    totals,
    prevTotals,
  });
}
