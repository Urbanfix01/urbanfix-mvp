import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import {
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  geocodeFirstResult,
  haversineKm,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  toFiniteNumber,
} from '@/app/api/_shared/marketplace';

const normalizeRadius = (value: unknown) => {
  const parsed = Number(value || DEFAULT_MATCH_RADIUS_KM);
  if (!Number.isFinite(parsed)) return DEFAULT_MATCH_RADIUS_KM;
  return Math.min(100, Math.max(1, Math.round(parsed)));
};

const toText = (value: unknown) => String(value || '').trim();
const toFiniteCoordinate = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const radiusKm = normalizeRadius(request.nextUrl.searchParams.get('radiusKm'));
  const requestLat = toFiniteCoordinate(request.nextUrl.searchParams.get('locationLat'));
  const requestLng = toFiniteCoordinate(request.nextUrl.searchParams.get('locationLng'));
  const requestAddress = toText(request.nextUrl.searchParams.get('address'));
  const requestCity = toText(request.nextUrl.searchParams.get('city'));

  const { data: clientProfile, error: clientProfileError } = await supabase
    .from('profiles')
    .select('id, city, address, company_address')
    .eq('id', user.id)
    .maybeSingle();

  if (clientProfileError) {
    return NextResponse.json({ error: clientProfileError.message || 'No se pudo cargar tu perfil cliente.' }, { status: 500 });
  }

  const profileCity = toText(clientProfile?.city);
  const profileAddress = toText(clientProfile?.address || clientProfile?.company_address);
  const requestedGeocodeQuery = [requestAddress, requestCity].filter(Boolean).join(', ');
  const profileGeocodeQuery = [profileAddress, profileCity].filter(Boolean).join(', ');

  const hasExactRequestCenter = requestLat !== null && requestLng !== null;
  let latestRequestCenter: { lat: number; lng: number; displayName: string } | null = null;

  if (!hasExactRequestCenter && !requestedGeocodeQuery) {
    const { data: latestRequest } = await supabase
      .from('client_requests')
      .select('title, city, province, location_lat, location_lng, created_at')
      .eq('client_id', user.id)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const latestLat = toFiniteNumber((latestRequest as any)?.location_lat);
    const latestLng = toFiniteNumber((latestRequest as any)?.location_lng);
    if (latestLat !== null && latestLng !== null) {
      const latestLabel = [
        toText((latestRequest as any)?.title),
        toText((latestRequest as any)?.city),
        toText((latestRequest as any)?.province),
      ]
        .filter(Boolean)
        .join(' · ');
      latestRequestCenter = {
        lat: latestLat,
        lng: latestLng,
        displayName: latestLabel || 'Última solicitud publicada',
      };
    }
  }

  const geocodeQuery = requestedGeocodeQuery || (!latestRequestCenter ? profileGeocodeQuery : '');

  if (!hasExactRequestCenter && !geocodeQuery && !latestRequestCenter) {
    return NextResponse.json({
      technicians: [],
      center_label: '',
      warning: 'Publica una solicitud con dirección o completa una zona para ver técnicos cercanos.',
      stats: {
        loaded: 0,
        visible: 0,
        skipped_by_missing_geo: 0,
        skipped_by_radius: 0,
      },
    });
  }

  const centerGeo = hasExactRequestCenter
    ? {
        lat: requestLat!,
        lng: requestLng!,
        displayName: requestedGeocodeQuery || 'Ubicación actual de la solicitud',
      }
    : latestRequestCenter || (await geocodeFirstResult(geocodeQuery));
  if (!centerGeo) {
    return NextResponse.json({
      technicians: [],
      center_label: geocodeQuery,
      warning: 'No pudimos geolocalizar tu zona base. Revisá dirección/ciudad e intentá de nuevo.',
      stats: {
        loaded: 0,
        visible: 0,
        skipped_by_missing_geo: 0,
        skipped_by_radius: 0,
      },
    });
  }

  const { data: techniciansRows, error: techniciansError } = await supabase
    .from('profiles')
    .select(
      'id, full_name, business_name, phone, specialties, city, service_city, service_district, service_province, working_hours, public_rating, service_lat, service_lng, access_granted'
    )
    .eq('access_granted', true)
    .neq('id', user.id)
    .limit(700);

  if (techniciansError) {
    return NextResponse.json({ error: techniciansError.message || 'No se pudieron cargar técnicos.' }, { status: 500 });
  }

  let skippedByMissingGeo = 0;
  let skippedByRadius = 0;
  const now = new Date();

  const technicians = (techniciansRows || [])
    .map((row: any) => {
      const techLat = toFiniteNumber(row.service_lat);
      const techLng = toFiniteNumber(row.service_lng);
      if (techLat === null || techLng === null) {
        skippedByMissingGeo += 1;
        return null;
      }

      const distanceKm = haversineKm(centerGeo.lat, centerGeo.lng, techLat, techLng);
      if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) {
        skippedByRadius += 1;
        return null;
      }

      const workingHoursConfig = parseWorkingHoursConfig(String(row.working_hours || ''));
      const name = toText(row.business_name) || toText(row.full_name) || 'Técnico UrbanFix';
      const city = toText(row.service_city) || toText(row.city);
      const zoneLabel = [toText(row.service_district), toText(row.service_province)].filter(Boolean).join(', ');

      return {
        id: String(row.id || ''),
        name,
        phone: toText(row.phone),
        specialty: toText(row.specialties) || 'General',
        city,
        zone_label: zoneLabel || null,
        rating: Number.isFinite(Number(row.public_rating)) ? Number(row.public_rating) : null,
        distance_km: Number(distanceKm.toFixed(1)),
        map_lat: Number(techLat.toFixed(6)),
        map_lng: Number(techLng.toFixed(6)),
        available_now: isNowWithinWorkingHours(workingHoursConfig, now),
        working_hours_label: formatWorkingHoursLabel(workingHoursConfig),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
      const ratingA = Number(a.rating || 0);
      const ratingB = Number(b.rating || 0);
      if (ratingB !== ratingA) return ratingB - ratingA;
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });

  let warning = '';
  if (!technicians.length) {
    if ((techniciansRows || []).length === 0) {
      warning = 'Todavía no hay técnicos disponibles para mostrar en esta zona.';
    } else if (skippedByRadius > 0) {
      warning = `No hay técnicos dentro de ${radiusKm} km. Ampliá el radio para ver más opciones.`;
    } else if (skippedByMissingGeo > 0) {
      warning = 'Hay técnicos sin geolocalización completa. Pediles completar su zona de trabajo.';
    }
  }

  return NextResponse.json({
    technicians: technicians.slice(0, 120),
    center_label: centerGeo.displayName || geocodeQuery,
    center: {
      lat: Number(centerGeo.lat.toFixed(6)),
      lng: Number(centerGeo.lng.toFixed(6)),
    },
    radius_km: radiusKm,
    warning,
    stats: {
      loaded: (techniciansRows || []).length,
      visible: technicians.length,
      skipped_by_missing_geo: skippedByMissingGeo,
      skipped_by_radius: skippedByRadius,
    },
  });
}
