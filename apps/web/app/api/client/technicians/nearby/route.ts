import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import {
  DEFAULT_MATCH_RADIUS_KM,
  geocodeFirstResult,
  haversineKm,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  toFiniteNumber,
} from '../../../_shared/marketplace';

const BA_DEFAULT_CENTER = {
  lat: -34.6037,
  lng: -58.3816,
  label: 'CABA, Buenos Aires',
};

const normalizeRadius = (value: unknown) => {
  const parsed = Number(value || DEFAULT_MATCH_RADIUS_KM);
  if (!Number.isFinite(parsed)) return DEFAULT_MATCH_RADIUS_KM;
  return Math.min(100, Math.max(5, Math.round(parsed)));
};

const toText = (value: unknown) => String(value || '').trim();

const resolveTechName = (row: Record<string, unknown>) =>
  toText(row.business_name) || toText(row.full_name) || 'Tecnico UrbanFix';

const resolveTechSpecialty = (row: Record<string, unknown>) =>
  toText(row.specialties) || 'Servicios generales';

const resolveTechAddress = (row: Record<string, unknown>) =>
  toText(row.company_address) || toText(row.address) || toText(row.coverage_area) || toText(row.city);

const isMissingColumnError = (message: string) =>
  message.includes('does not exist') || message.includes('column') || message.includes('relation');

type TechnicianRow = Record<string, unknown>;

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const radiusKm = normalizeRadius(request.nextUrl.searchParams.get('radiusKm'));

  let warning = '';
  let centerLat: number | null = null;
  let centerLng: number | null = null;
  let centerLabel = '';
  let centerSource: 'request_geo' | 'request_address' | 'profile' | 'fallback' = 'fallback';
  let geocodedSource = 0;

  const { data: latestRequest, error: latestRequestError } = await supabase
    .from('client_requests')
    .select('id, address, city, location_lat, location_lng, updated_at')
    .eq('client_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRequestError && !isMissingColumnError(String(latestRequestError.message || '').toLowerCase())) {
    return NextResponse.json(
      { error: latestRequestError.message || 'No se pudo cargar tu ultima solicitud.' },
      { status: 500 }
    );
  }

  if (latestRequest) {
    const latestLat = toFiniteNumber(latestRequest.location_lat);
    const latestLng = toFiniteNumber(latestRequest.location_lng);
    if (latestLat !== null && latestLng !== null) {
      centerLat = latestLat;
      centerLng = latestLng;
      centerLabel = [toText(latestRequest.address), toText(latestRequest.city)].filter(Boolean).join(', ');
      centerSource = 'request_geo';
    } else {
      const query = [toText(latestRequest.address), toText(latestRequest.city), 'Argentina']
        .filter(Boolean)
        .join(', ');
      const geocode = await geocodeFirstResult(query);
      if (geocode) {
        centerLat = geocode.lat;
        centerLng = geocode.lng;
        centerLabel = geocode.displayName || query;
        centerSource = 'request_address';
        geocodedSource += 1;
        if (latestRequest.id) {
          await supabase
            .from('client_requests')
            .update({ location_lat: geocode.lat, location_lng: geocode.lng })
            .eq('id', latestRequest.id);
        }
      }
    }
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'No se pudo cargar tu perfil.' }, { status: 500 });
  }

  if (centerLat === null || centerLng === null) {
    const profileAddress = toText(profileRow?.address) || toText(profileRow?.company_address);
    const profileCity = toText(profileRow?.city);
    const profileQuery = [profileAddress, profileCity, 'Argentina'].filter(Boolean).join(', ');
    if (profileQuery) {
      const geocode = await geocodeFirstResult(profileQuery);
      if (geocode) {
        centerLat = geocode.lat;
        centerLng = geocode.lng;
        centerLabel = geocode.displayName || profileQuery;
        centerSource = 'profile';
        geocodedSource += 1;
      }
    }
  }

  if (centerLat === null || centerLng === null) {
    centerLat = BA_DEFAULT_CENTER.lat;
    centerLng = BA_DEFAULT_CENTER.lng;
    centerLabel = BA_DEFAULT_CENTER.label;
    centerSource = 'fallback';
    warning =
      'No encontramos una direccion de obra para centrar el mapa. Publica una solicitud con direccion exacta.';
  }

  let technicianRows: TechnicianRow[] = [];

  const primaryRows = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .eq('access_granted', true)
    .limit(1200);

  if (primaryRows.error && String(primaryRows.error.message || '').toLowerCase().includes('access_granted')) {
    const fallbackRows = await supabase.from('profiles').select('*').neq('id', user.id).limit(1200);
    if (fallbackRows.error) {
      return NextResponse.json(
        { error: fallbackRows.error.message || 'No se pudieron cargar tecnicos.' },
        { status: 500 }
      );
    }
    technicianRows = (fallbackRows.data || []) as TechnicianRow[];
  } else if (primaryRows.error) {
    return NextResponse.json(
      { error: primaryRows.error.message || 'No se pudieron cargar tecnicos.' },
      { status: 500 }
    );
  } else {
    technicianRows = (primaryRows.data || []) as TechnicianRow[];
  }

  const now = new Date();
  const centerLatValue = centerLat as number;
  const centerLngValue = centerLng as number;

  const normalized = technicianRows
    .map((row) => {
      const serviceLat = toFiniteNumber((row as any).service_lat);
      const serviceLng = toFiniteNumber((row as any).service_lng);
      const profileLat = toFiniteNumber((row as any).location_lat);
      const profileLng = toFiniteNumber((row as any).location_lng);
      const lat = serviceLat ?? profileLat;
      const lng = serviceLng ?? profileLng;
      if (lat === null || lng === null) return null;

      const distanceKm = haversineKm(centerLatValue, centerLngValue, lat, lng);
      if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) return null;

      const workingHours = parseWorkingHoursConfig(toText((row as any).working_hours));
      const availableNow = isNowWithinWorkingHours(workingHours, now);
      const rating = toFiniteNumber((row as any).public_rating);

      return {
        id: toText((row as any).id),
        name: resolveTechName(row),
        phone: toText((row as any).phone) || null,
        city: toText((row as any).city),
        specialty: resolveTechSpecialty(row),
        rating,
        available_now: availableNow,
        distance_km: Number(distanceKm.toFixed(1)),
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        address: resolveTechAddress(row),
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    phone: string | null;
    city: string;
    specialty: string;
    rating: number | null;
    available_now: boolean;
    distance_km: number;
    lat: number;
    lng: number;
    address: string;
  }>;

  normalized.sort((a, b) => {
    if (a.available_now !== b.available_now) return a.available_now ? -1 : 1;
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    const aRating = Number(a.rating || 0);
    const bRating = Number(b.rating || 0);
    if (aRating !== bRating) return bRating - aRating;
    return a.name.localeCompare(b.name, 'es');
  });

  if (!warning && normalized.length === 0) {
    warning = `No hay tecnicos con geolocalizacion dentro de ${radiusKm} km para la zona seleccionada.`;
  }

  return NextResponse.json({
    center: {
      lat: Number(centerLatValue.toFixed(6)),
      lng: Number(centerLngValue.toFixed(6)),
      label: centerLabel || BA_DEFAULT_CENTER.label,
      source: centerSource,
      radius_km: radiusKm,
    },
    technicians: normalized.slice(0, 80),
    warning: warning || null,
    stats: {
      loaded_profiles: technicianRows.length,
      visible: normalized.length,
      geocoded_source: geocodedSource,
    },
  });
}
