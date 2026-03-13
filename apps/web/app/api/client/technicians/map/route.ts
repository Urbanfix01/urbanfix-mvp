import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import { ARGENTINA_TIMEZONE, isNowWithinWorkingHours, parseWorkingHoursConfig, toFiniteNumber } from '../../../_shared/marketplace';

const ARGENTINA_CENTER = {
  lat: -38.416097,
  lng: -63.616672,
  label: 'Argentina',
};

const MAX_TECHNICIANS = 1200;

const toText = (value: unknown) => String(value || '').trim();

const resolveTechName = (row: Record<string, unknown>) =>
  toText(row.business_name) || toText(row.full_name) || 'Tecnico UrbanFix';

const resolveTechSpecialty = (row: Record<string, unknown>) =>
  toText(row.specialties) || 'Servicios generales';

const resolveTechAddress = (row: Record<string, unknown>) =>
  toText(row.company_address) || toText(row.address) || toText(row.coverage_area) || toText(row.city);

type TechnicianRow = Record<string, unknown>;

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let technicianRows: TechnicianRow[] = [];

  const primaryRows = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .eq('access_granted', true)
    .limit(MAX_TECHNICIANS);

  if (primaryRows.error && String(primaryRows.error.message || '').toLowerCase().includes('access_granted')) {
    const fallbackRows = await supabase.from('profiles').select('*').neq('id', user.id).limit(MAX_TECHNICIANS);
    if (fallbackRows.error) {
      return NextResponse.json(
        { error: fallbackRows.error.message || 'No se pudieron cargar tecnicos publicados.' },
        { status: 500 }
      );
    }
    technicianRows = (fallbackRows.data || []) as TechnicianRow[];
  } else if (primaryRows.error) {
    return NextResponse.json(
      { error: primaryRows.error.message || 'No se pudieron cargar tecnicos publicados.' },
      { status: 500 }
    );
  } else {
    technicianRows = (primaryRows.data || []) as TechnicianRow[];
  }

  const now = new Date();
  const normalized = technicianRows
    .map((row) => {
      const serviceLat = toFiniteNumber((row as any).service_lat);
      const serviceLng = toFiniteNumber((row as any).service_lng);
      const profileLat = toFiniteNumber((row as any).location_lat);
      const profileLng = toFiniteNumber((row as any).location_lng);
      const lat = serviceLat ?? profileLat;
      const lng = serviceLng ?? profileLng;
      if (lat === null || lng === null) return null;

      const workingHours = parseWorkingHoursConfig(toText((row as any).working_hours));
      const availableNow = isNowWithinWorkingHours(workingHours, now, ARGENTINA_TIMEZONE);
      const rating = toFiniteNumber((row as any).public_rating);

      return {
        id: toText((row as any).id),
        name: resolveTechName(row),
        phone: toText((row as any).phone) || null,
        city: toText((row as any).city),
        specialty: resolveTechSpecialty(row),
        rating,
        available_now: availableNow,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        address: resolveTechAddress(row),
        geo_source: serviceLat !== null && serviceLng !== null ? 'service' : 'profile',
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
    lat: number;
    lng: number;
    address: string;
    geo_source: 'service' | 'profile';
  }>;

  normalized.sort((a, b) => {
    if (a.available_now !== b.available_now) return a.available_now ? -1 : 1;
    const aRating = Number(a.rating || 0);
    const bRating = Number(b.rating || 0);
    if (aRating !== bRating) return bRating - aRating;
    return a.name.localeCompare(b.name, 'es');
  });

  const visibleCityCount = new Set(normalized.map((item) => item.city).filter(Boolean)).size;
  const availableCount = normalized.filter((item) => item.available_now).length;
  const missingGeoCount = Math.max(0, technicianRows.length - normalized.length);

  return NextResponse.json({
    center: {
      lat: ARGENTINA_CENTER.lat,
      lng: ARGENTINA_CENTER.lng,
      label: ARGENTINA_CENTER.label,
      source: 'country',
    },
    technicians: normalized,
    warning: missingGeoCount
      ? `${missingGeoCount} tecnicos publicados aun no tienen geolocalizacion cargada y no se muestran en el mapa.`
      : null,
    stats: {
      loaded_profiles: technicianRows.length,
      visible: normalized.length,
      available_now: availableCount,
      cities: visibleCityCount,
      missing_geo: missingGeoCount,
    },
  });
}
