import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import {
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  toFiniteNumber,
} from '@/app/api/_shared/marketplace';
import { resolveArgentinaZoneCoords } from '@/lib/geo/argentina-zone-presets';

const ARGENTINA_CENTER = {
  lat: -38.416097,
  lng: -63.616672,
  label: 'Argentina',
  source: 'country' as const,
};

const toText = (value: unknown) => String(value || '').trim();

const isProfilePublishedMissing = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes('profile_published') || normalized.includes('column');
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const selectFields =
    'id, full_name, business_name, phone, specialties, city, coverage_area, address, company_address, working_hours, public_rating, service_lat, service_lng, service_radius_km, access_granted, profile_published';

  let profilesRes = await supabase
    .from('profiles')
    .select(selectFields)
    .eq('access_granted', true)
    .eq('profile_published', true)
    .neq('id', user.id)
    .limit(500);

  if (profilesRes.error && isProfilePublishedMissing(String(profilesRes.error.message || ''))) {
    const fallbackRes = await supabase
      .from('profiles')
      .select(
        'id, full_name, business_name, phone, specialties, city, coverage_area, address, company_address, working_hours, public_rating, service_lat, service_lng, service_radius_km, access_granted'
      )
      .eq('access_granted', true)
      .neq('id', user.id)
      .limit(500);

    profilesRes = {
      data: fallbackRes.data,
      error: fallbackRes.error,
      count: fallbackRes.count ?? null,
      status: fallbackRes.status,
      statusText: fallbackRes.statusText,
    } as typeof profilesRes;
  }

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message || 'No se pudo cargar el mapa tecnico.' }, { status: 500 });
  }

  const now = new Date();
  let missingGeo = 0;
  let availableNow = 0;

  const technicians = (profilesRes.data || [])
    .map((row: any) => {
      const exactLat = toFiniteNumber(row.service_lat);
      const exactLng = toFiniteNumber(row.service_lng);
      const fallbackGeo =
        exactLat === null || exactLng === null
          ? resolveArgentinaZoneCoords(row.city, row.coverage_area, row.address, row.company_address)
          : null;
      const lat = exactLat ?? fallbackGeo?.lat ?? null;
      const lng = exactLng ?? fallbackGeo?.lng ?? null;

      if (lat === null || lng === null) {
        missingGeo += 1;
        return null;
      }

      const workingHours = parseWorkingHoursConfig(toText(row.working_hours));
      const openNow = isNowWithinWorkingHours(workingHours, now);
      if (openNow) availableNow += 1;

      return {
        id: toText(row.id),
        name: toText(row.business_name) || toText(row.full_name) || 'Tecnico UrbanFix',
        phone: toText(row.phone) || null,
        city: toText(row.city) || fallbackGeo?.label || 'Argentina',
        specialty: toText(row.specialties) || 'Servicios generales',
        rating: Number.isFinite(Number(row.public_rating)) ? Number(row.public_rating) : null,
        available_now: openNow,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        address: toText(row.company_address) || toText(row.address) || toText(row.coverage_area) || 'Cobertura nacional',
        geo_source: exactLat !== null && exactLng !== null ? 'service' : 'profile',
        working_hours_label: formatWorkingHoursLabel(workingHours),
        radius_km: Math.max(1, Math.round(Number(row.service_radius_km || DEFAULT_MATCH_RADIUS_KM))),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      if (Number(b.available_now) !== Number(a.available_now)) return Number(b.available_now) - Number(a.available_now);
      const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return a.name.localeCompare(b.name, 'es');
    });

  const cityCount = new Set(technicians.map((technician) => technician.city).filter(Boolean)).size;
  const warning = technicians.length
    ? ''
    : missingGeo > 0
      ? 'Hay tecnicos sin geolocalizacion completa. Pideles completar su zona de trabajo.'
      : 'Aun no hay tecnicos publicados con geolocalizacion para mostrar en el mapa nacional.';

  return NextResponse.json({
    center: ARGENTINA_CENTER,
    technicians,
    warning,
    stats: {
      loaded_profiles: (profilesRes.data || []).length,
      visible: technicians.length,
      available_now: availableNow,
      cities: cityCount,
      missing_geo: missingGeo,
    },
  });
}
