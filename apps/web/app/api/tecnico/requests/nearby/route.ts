import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ARGENTINA_TIMEZONE,
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  geocodeFirstResult,
  haversineKm,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  toFiniteNumber,
} from '../../../_shared/marketplace';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const getAuthUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const urgencyPriority = (urgency: string | null | undefined) => {
  const value = String(urgency || '').toLowerCase();
  if (value === 'alta') return 0;
  if (value === 'media') return 1;
  return 2;
};

const normalizeRadius = (value: unknown) => {
  const parsed = Number(value || DEFAULT_MATCH_RADIUS_KM);
  if (!Number.isFinite(parsed)) return DEFAULT_MATCH_RADIUS_KM;
  return Math.min(100, Math.max(1, Math.round(parsed)));
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, city, company_address, address, service_lat, service_lng, service_radius_km, working_hours, full_name, business_name'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'No se pudo cargar tu perfil tecnico.' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Perfil tecnico no encontrado.' }, { status: 404 });
  }

  let technicianLat = toFiniteNumber(profile.service_lat);
  let technicianLng = toFiniteNumber(profile.service_lng);
  const profileGeoMissing = technicianLat === null || technicianLng === null;
  if (profileGeoMissing) {
    const geocodeQuery = [profile.company_address || profile.address || '', profile.city || ''].filter(Boolean).join(', ');
    const geocode = await geocodeFirstResult(geocodeQuery);
    if (geocode) {
      technicianLat = geocode.lat;
      technicianLng = geocode.lng;
      await supabase
        .from('profiles')
        .update({
          service_lat: geocode.lat,
          service_lng: geocode.lng,
          coverage_area: profile.city
            ? `Radio de ${DEFAULT_MATCH_RADIUS_KM} km desde ${profile.city}`
            : `Radio de ${DEFAULT_MATCH_RADIUS_KM} km desde tu ciudad base`,
        })
        .eq('id', profile.id);
    }
  }

  if (technicianLat === null || technicianLng === null) {
    const workingHours = parseWorkingHoursConfig(profile.working_hours || '');
    return NextResponse.json({
      requests: [],
      technician: {
        radius_km: normalizeRadius(profile.service_radius_km),
        within_working_hours: isNowWithinWorkingHours(workingHours),
        working_hours_label: formatWorkingHoursLabel(workingHours),
      },
      warning: 'Completa direccion base y ciudad para activar el matching por radio.',
    });
  }

  const radiusKm = normalizeRadius(profile.service_radius_km || DEFAULT_MATCH_RADIUS_KM);
  const { data: requestsData, error: requestsError } = await supabase
    .from('client_requests')
    .select(
      'id, title, category, address, city, description, urgency, preferred_window, status, mode, target_technician_id, created_at, location_lat, location_lng, radius_km'
    )
    .in('status', ['published', 'matched', 'direct_sent'])
    .order('created_at', { ascending: false })
    .limit(180);

  if (requestsError) {
    return NextResponse.json(
      {
        error:
          requestsError.message?.includes('client_requests') || requestsError.message?.includes('relation')
            ? 'Falta la migracion de client_requests en Supabase.'
            : requestsError.message || 'No se pudieron cargar solicitudes.',
      },
      { status: 500 }
    );
  }

  const normalizedRows: any[] = [];
  const now = new Date();
  const profileHours = parseWorkingHoursConfig(profile.working_hours || '');
  const withinWorkingHours = isNowWithinWorkingHours(profileHours, now, ARGENTINA_TIMEZONE);

  for (const row of requestsData || []) {
    if (row.mode === 'direct' && row.target_technician_id && row.target_technician_id !== user.id) {
      continue;
    }

    let requestLat = toFiniteNumber(row.location_lat);
    let requestLng = toFiniteNumber(row.location_lng);
    if (requestLat === null || requestLng === null) {
      const geocodeQuery = [row.address || '', row.city || ''].filter(Boolean).join(', ');
      const geocode = await geocodeFirstResult(geocodeQuery);
      if (geocode) {
        requestLat = geocode.lat;
        requestLng = geocode.lng;
        await supabase
          .from('client_requests')
          .update({
            location_lat: geocode.lat,
            location_lng: geocode.lng,
          })
          .eq('id', row.id);
      }
    }
    if (requestLat === null || requestLng === null) {
      continue;
    }

    const requestRadiusKm = normalizeRadius(row.radius_km || radiusKm);
    const maxDistance = Math.min(radiusKm, requestRadiusKm);
    const distanceKm = haversineKm(technicianLat, technicianLng, requestLat, requestLng);
    if (!Number.isFinite(distanceKm) || distanceKm > maxDistance) {
      continue;
    }

    normalizedRows.push({
      id: row.id,
      title: row.title || 'Solicitud sin titulo',
      category: row.category || 'General',
      city: row.city || '',
      address: row.address || '',
      description: row.description || '',
      urgency: row.urgency || 'media',
      preferred_window: row.preferred_window || null,
      status: row.status,
      mode: row.mode || 'marketplace',
      created_at: row.created_at,
      distance_km: Number(distanceKm.toFixed(1)),
      match_radius_km: maxDistance,
      location_lat: Number(requestLat.toFixed(6)),
      location_lng: Number(requestLng.toFixed(6)),
    });
  }

  normalizedRows.sort((a, b) => {
    const urgencyDiff = urgencyPriority(a.urgency) - urgencyPriority(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return NextResponse.json({
    requests: normalizedRows.slice(0, 80),
    technician: {
      radius_km: radiusKm,
      within_working_hours: withinWorkingHours,
      working_hours_label: formatWorkingHoursLabel(profileHours),
      service_lat: Number(technicianLat.toFixed(6)),
      service_lng: Number(technicianLng.toFixed(6)),
    },
  });
}
