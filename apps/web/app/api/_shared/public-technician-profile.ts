import { createClient } from '@supabase/supabase-js';
import {
  ARGENTINA_TIMEZONE,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  toFiniteNumber,
} from '../_shared/marketplace';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const CLOSED_QUOTE_STATUSES = new Set([
  'completed',
  'completado',
  'finalizado',
  'finalizados',
  'paid',
  'pagado',
  'pagados',
  'cobrado',
  'cobrados',
  'charged',
]);

type QuoteSnapshotRow = {
  id?: unknown;
  client_name?: unknown;
  client_address?: unknown;
  address?: unknown;
  location_address?: unknown;
  status?: unknown;
  created_at?: unknown;
  completed_at?: unknown;
  paid_at?: unknown;
  archived_at?: unknown;
};

type PublicFeedbackRow = {
  id?: unknown;
  rating?: unknown;
  comment?: unknown;
  client_name_snapshot?: unknown;
};

const toText = (value: unknown) => String(value || '').trim();

const toTextArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => toText(item)).filter(Boolean) : [];

const toCount = (value: unknown) => Math.max(0, Number(toFiniteNumber(value) || 0));

const normalizeStatus = (value: unknown) => toText(value).toLowerCase();

const ARGENTINA_PROVINCES = new Set([
  'buenos aires',
  'catamarca',
  'chaco',
  'chubut',
  'cordoba',
  'corrientes',
  'entre rios',
  'formosa',
  'jujuy',
  'la pampa',
  'la rioja',
  'mendoza',
  'misiones',
  'neuquen',
  'rio negro',
  'salta',
  'san juan',
  'san luis',
  'santa cruz',
  'santa fe',
  'santiago del estero',
  'tierra del fuego',
  'tucuman',
]);

const normalizeLocationToken = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const resolveTechName = (row: Record<string, unknown>) =>
  toText(row.business_name) || toText(row.full_name) || 'Tecnico UrbanFix';

const resolveTechAddress = (row: Record<string, unknown>) =>
  toText(row.company_address) || toText(row.address) || toText(row.coverage_area) || toText(row.city);

const resolveWorkDate = (row: QuoteSnapshotRow) =>
  toText(row.archived_at) || toText(row.completed_at) || toText(row.paid_at) || toText(row.created_at);

const resolveLocalityFromAddress = (value: string) => {
  const segments = value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) return '';

  const filtered = segments.filter((segment) => {
    const normalized = normalizeLocationToken(segment);
    if (!normalized) return false;
    if (normalized === 'argentina') return false;
    if (/^[a-z]?\d{3,8}[a-z]?$/i.test(normalized.replace(/\s+/g, ''))) return false;
    if (
      normalized.startsWith('partido de ') ||
      normalized.startsWith('provincia de ') ||
      normalized.startsWith('departamento de ') ||
      normalized.startsWith('county of ') ||
      normalized.startsWith('county ')
    ) {
      return false;
    }
    if (ARGENTINA_PROVINCES.has(normalized) && segments.length > 1) return false;
    return true;
  });

  const preferredSegments = filtered.filter((segment) => {
    const normalized = normalizeLocationToken(segment);
    if (/^\d+[a-z\-\/\s]*$/i.test(normalized)) return false;
    if (normalized.length <= 2) return false;
    return true;
  });

  const pool = preferredSegments.length > 0 ? preferredSegments : filtered;
  return pool[pool.length - 1] || segments[segments.length - 1] || '';
};

const resolveWorkLocation = (row: QuoteSnapshotRow) =>
  resolveLocalityFromAddress(toText(row.location_address) || toText(row.client_address) || toText(row.address) || '');

const isClosedWork = (row: QuoteSnapshotRow) =>
  Boolean(toText(row.archived_at)) ||
  Boolean(toText(row.completed_at)) ||
  Boolean(toText(row.paid_at)) ||
  CLOSED_QUOTE_STATUSES.has(normalizeStatus(row.status));

const splitReviewChunks = (value: string) =>
  value
    .split(/\r?\n|[|•]/)
    .map((item) => item.trim())
    .flatMap((item) => item.split(/\s{2,}|;\s*/))
    .map((item) => item.trim())
    .filter(Boolean);

const buildPublicReviews = (row: Record<string, unknown>) => {
  const raw = toText((row as any).client_recommendations);
  if (!raw) return [];

  const chunks = splitReviewChunks(raw);
  const safeChunks = chunks.length > 0 ? chunks : [raw];

  return safeChunks.slice(0, 6).map((chunk, index) => {
    const match = chunk.match(/^([^:\-]{2,32})\s*[:\-]\s*(.+)$/);
    if (match) {
      return {
        id: `review-${index + 1}`,
        author: match[1].trim(),
        text: match[2].trim(),
      };
    }

    return {
      id: `review-${index + 1}`,
      author: 'Cliente UrbanFix',
      text: chunk,
    };
  });
};

const loadVerifiedReviews = async (technicianId: string) => {
  if (!supabase) {
    return {
      totalCount: 0,
      averageRating: null as number | null,
      items: [] as Array<Record<string, unknown>>,
    };
  }

  const { data, error } = await supabase
    .from('client_request_feedback')
    .select('id, rating, comment, client_name_snapshot')
    .eq('technician_id', technicianId)
    .eq('is_public', true)
    .order('updated_at', { ascending: false });

  if (error) {
    return {
      totalCount: 0,
      averageRating: null as number | null,
      items: [] as Array<Record<string, unknown>>,
    };
  }

  const rows = (data || []) as PublicFeedbackRow[];
  const ratings = rows
    .map((row) => toFiniteNumber(row.rating))
    .filter((value): value is number => value !== null)
    .map((value) => Math.min(5, Math.max(1, value)));

  const averageRating =
    ratings.length > 0
      ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2))
      : null;

  return {
    totalCount: rows.length,
    averageRating,
    items: rows.slice(0, 6).map((row, index) => ({
      id: toText(row.id) || `review-${index + 1}`,
      author: toText(row.client_name_snapshot) || 'Cliente UrbanFix',
      text: toText(row.comment),
    })),
  };
};

const loadRecentWorks = async (technicianId: string) => {
  if (!supabase) {
    return { totalCount: 0, items: [] as Array<Record<string, unknown>> };
  }

  const attempts = [
    'id, client_name, client_address, address, location_address, status, created_at, completed_at, paid_at, archived_at',
    'id, client_name, client_address, address, location_address, status, created_at, completed_at, paid_at',
  ] as const;

  for (const select of attempts) {
    const { data, error } = await supabase
      .from('quotes')
      .select(select)
      .eq('user_id', technicianId)
      .order('created_at', { ascending: false });

    if (error) continue;

    const rows = ((data || []) as QuoteSnapshotRow[]).filter(isClosedWork);
    const items = rows
      .sort((a, b) => new Date(resolveWorkDate(b)).getTime() - new Date(resolveWorkDate(a)).getTime())
      .slice(0, 6)
      .map((row, index) => ({
        id: toText(row.id) || `work-${index + 1}`,
        title: toText(row.client_name) || `Trabajo ${index + 1}`,
        client_name: toText(row.client_name) || null,
        location_label: resolveWorkLocation(row) || null,
        status: normalizeStatus(row.status) || null,
        happened_at: resolveWorkDate(row) || null,
      }));

    return { totalCount: rows.length, items };
  }

  return { totalCount: 0, items: [] as Array<Record<string, unknown>> };
};

export const getPublicTechnicianProfile = async (
  technicianId: string,
  options?: {
    requirePublished?: boolean;
  }
) => {
  if (!supabase) {
    return { error: 'Missing server config', status: 500, technician: null } as const;
  }

  const safeTechnicianId = toText(technicianId);
  if (!safeTechnicianId) {
    return { error: 'Tecnico invalido.', status: 400, technician: null } as const;
  }

  let row: Record<string, unknown> | null = null;

  const primary = await supabase
    .from('profiles')
    .select('*')
    .eq('id', safeTechnicianId)
    .eq('access_granted', true)
    .maybeSingle();

  if (primary.error && String(primary.error.message || '').toLowerCase().includes('access_granted')) {
    const fallback = await supabase.from('profiles').select('*').eq('id', safeTechnicianId).maybeSingle();
    if (fallback.error) {
      return {
        error: fallback.error.message || 'No se pudo cargar el perfil tecnico.',
        status: 500,
        technician: null,
      } as const;
    }
    row = (fallback.data || null) as Record<string, unknown> | null;
  } else if (primary.error) {
    return {
      error: primary.error.message || 'No se pudo cargar el perfil tecnico.',
      status: 500,
      technician: null,
    } as const;
  } else {
    row = (primary.data || null) as Record<string, unknown> | null;
  }

  if (!row) {
    return { error: 'Tecnico no encontrado.', status: 404, technician: null } as const;
  }

  if (options?.requirePublished && !(row as any).profile_published) {
    return { error: 'Perfil no publicado.', status: 404, technician: null } as const;
  }

  const serviceLat = toFiniteNumber((row as any).service_lat);
  const serviceLng = toFiniteNumber((row as any).service_lng);
  const profileLat = toFiniteNumber((row as any).location_lat);
  const profileLng = toFiniteNumber((row as any).location_lng);
  const lat = serviceLat ?? profileLat;
  const lng = serviceLng ?? profileLng;
  const workingHours = parseWorkingHoursConfig(toText((row as any).working_hours));
  const availableNow = isNowWithinWorkingHours(workingHours, new Date(), ARGENTINA_TIMEZONE);
  const workSnapshot = await loadRecentWorks(safeTechnicianId);
  const verifiedReviews = await loadVerifiedReviews(safeTechnicianId);
  const manualReviews = buildPublicReviews(row);
  const reviews = verifiedReviews.items.length > 0 ? verifiedReviews.items : manualReviews;
  const rating = verifiedReviews.averageRating ?? toFiniteNumber((row as any).public_rating);
  const completedJobsTotal = Math.max(toCount((row as any).completed_jobs_total), workSnapshot.totalCount);
  const publicReviewsCount = Math.max(
    toCount((row as any).public_reviews_count),
    verifiedReviews.totalCount,
    reviews.length
  );

  return {
    error: null,
    status: 200,
    technician: {
      id: toText((row as any).id),
      name: resolveTechName(row),
      business_name: toText((row as any).business_name) || null,
      full_name: toText((row as any).full_name) || null,
      phone: toText((row as any).phone) || null,
      city: toText((row as any).city),
      specialty: toText((row as any).specialties) || 'Servicios generales',
      rating,
      available_now: availableNow,
      address: resolveTechAddress(row),
      coverage_area: toText((row as any).coverage_area) || null,
      company_logo_url: toText((row as any).company_logo_url) || null,
      avatar_url: toText((row as any).avatar_url) || null,
      working_hours_label: formatWorkingHoursLabel(workingHours),
      public_reviews_count: publicReviewsCount,
      completed_jobs_total: completedJobsTotal,
      profile_published: Boolean((row as any).profile_published),
      public_likes_count: toCount((row as any).public_likes_count),
      references_summary: toText((row as any).references_summary) || null,
      client_recommendations: toText((row as any).client_recommendations) || null,
      achievement_badges: toTextArray((row as any).achievement_badges),
      instagram_profile_url: toText((row as any).instagram_profile_url) || null,
      facebook_profile_url: toText((row as any).facebook_profile_url) || null,
      instagram_post_url: toText((row as any).instagram_post_url) || null,
      facebook_post_url: toText((row as any).facebook_post_url) || null,
      work_photo_urls: toTextArray((row as any).work_photo_urls),
      recent_works: workSnapshot.items,
      reviews,
      lat: lat === null ? null : Number(lat.toFixed(6)),
      lng: lng === null ? null : Number(lng.toFixed(6)),
      geo_source:
        serviceLat !== null && serviceLng !== null ? 'service' : profileLat !== null && profileLng !== null ? 'profile' : null,
    },
  } as const;
};
