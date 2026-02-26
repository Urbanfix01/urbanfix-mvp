import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_MATCH_RADIUS_KM,
  geocodeFirstResult,
  haversineKm,
  isNowWithinWorkingHours,
  parseUrgencyWeight,
  toFiniteNumber,
  parseWorkingHoursConfig,
} from '../../_shared/marketplace';

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

const toText = (value: unknown) => String(value || '').trim();

const normalizeUrgency = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized === 'alta' || normalized === 'media' || normalized === 'baja') return normalized;
  return 'media';
};

const normalizeMode = (value: string) => (value.toLowerCase() === 'direct' ? 'direct' : 'marketplace');

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('client_requests')
    .select('*')
    .eq('client_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message?.includes('client_requests') || error.message?.includes('relation')
            ? 'Falta la migracion de client_requests en Supabase.'
            : error.message || 'No se pudieron cargar las solicitudes.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const title = toText(body.title);
  const category = toText(body.category);
  const address = toText(body.address);
  const city = toText(body.city);
  const description = toText(body.description);
  const preferredWindow = toText(body.preferredWindow);
  const urgency = normalizeUrgency(toText(body.urgency));
  const mode = normalizeMode(toText(body.mode));
  const radiusKmRaw = Number(body.radiusKm || DEFAULT_MATCH_RADIUS_KM);
  const radiusKm = Number.isFinite(radiusKmRaw) ? Math.min(100, Math.max(1, Math.round(radiusKmRaw))) : DEFAULT_MATCH_RADIUS_KM;

  const targetTechnicianId = toText(body.targetTechnicianId) || null;
  const targetTechnicianName = toText(body.targetTechnicianName) || null;
  const targetTechnicianPhone = toText(body.targetTechnicianPhone) || null;

  if (!title || !category || !address || !description) {
    return NextResponse.json(
      { error: 'Completa titulo, categoria, direccion y descripcion para publicar la solicitud.' },
      { status: 400 }
    );
  }

  let locationLat = toFiniteNumber(body.locationLat);
  let locationLng = toFiniteNumber(body.locationLng);
  if (locationLat === null || locationLng === null) {
    const geocodeQuery = [address, city].filter(Boolean).join(', ');
    const geocode = await geocodeFirstResult(geocodeQuery);
    if (geocode) {
      locationLat = geocode.lat;
      locationLng = geocode.lng;
    }
  }

  const insertPayload: Record<string, unknown> = {
    client_id: user.id,
    title,
    category,
    address,
    city: city || null,
    description,
    urgency,
    preferred_window: preferredWindow || null,
    mode,
    status: mode === 'direct' ? 'direct_sent' : 'published',
    radius_km: radiusKm,
    location_lat: locationLat,
    location_lng: locationLng,
    target_technician_id: mode === 'direct' ? targetTechnicianId : null,
    target_technician_name: mode === 'direct' ? targetTechnicianName : null,
    target_technician_phone: mode === 'direct' ? targetTechnicianPhone : null,
  };

  if (mode === 'direct') {
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    insertPayload.direct_expires_at = expiresAt;
  }

  const { data: requestRow, error: requestError } = await supabase
    .from('client_requests')
    .insert(insertPayload)
    .select('*')
    .single();

  if (requestError || !requestRow) {
    return NextResponse.json(
      {
        error:
          requestError?.message?.includes('client_requests') || requestError?.message?.includes('relation')
            ? 'Falta la migracion de client_requests en Supabase.'
            : requestError?.message || 'No se pudo crear la solicitud.',
      },
      { status: 500 }
    );
  }

  await supabase.from('client_request_events').insert({
    request_id: requestRow.id,
    actor_id: user.id,
    label: mode === 'direct' ? 'Solicitud directa enviada' : 'Solicitud publicada',
  });

  const requestLat = toFiniteNumber((requestRow as any).location_lat);
  const requestLng = toFiniteNumber((requestRow as any).location_lng);
  const hasRequestGeo = requestLat !== null && requestLng !== null;
  if (!hasRequestGeo || mode === 'direct') {
    return NextResponse.json({ request: requestRow, matches: [] }, { status: 201 });
  }
  const requestLatValue = requestLat as number;
  const requestLngValue = requestLng as number;

  const { data: technicians, error: techError } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, phone, specialties, city, public_rating, working_hours, service_lat, service_lng, access_granted')
    .eq('access_granted', true)
    .limit(600);

  if (techError || !technicians) {
    return NextResponse.json({ request: requestRow, matches: [], warning: techError?.message || 'Sin tecnicos disponibles.' }, { status: 201 });
  }

  const now = new Date();

  const ranked = technicians
    .map((tech: any) => {
      const lat = toFiniteNumber(tech.service_lat);
      const lng = toFiniteNumber(tech.service_lng);
      if (lat === null || lng === null) return null;
      const distanceKm = haversineKm(requestLatValue, requestLngValue, lat, lng);
      if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) return null;

      const rating = Number(tech.public_rating || 0);
      const hoursConfig = parseWorkingHoursConfig(tech.working_hours || '');
      const availableNow = isNowWithinWorkingHours(hoursConfig, now);
      const score = Math.round(100 - distanceKm * 3 + rating * 10 + parseUrgencyWeight(urgency) + (availableNow ? 5 : 0));

      return {
        technician: tech,
        distanceKm,
        score,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score || a.distanceKm - b.distanceKm)
    .slice(0, 5);

  const matchesPayload = ranked.map((entry: any) => ({
    request_id: requestRow.id,
    technician_id: entry.technician.id,
    technician_name: entry.technician.business_name || entry.technician.full_name || 'Tecnico UrbanFix',
    technician_phone: entry.technician.phone || null,
    technician_specialty: entry.technician.specialties || null,
    technician_city: entry.technician.city || null,
    technician_rating: Number.isFinite(Number(entry.technician.public_rating))
      ? Number(entry.technician.public_rating)
      : null,
    score: entry.score,
    quote_status: 'pending',
  }));

  if (matchesPayload.length) {
    await supabase.from('client_request_matches').upsert(matchesPayload, {
      onConflict: 'request_id,technician_id',
    });

    await supabase
      .from('client_requests')
      .update({ status: 'matched' })
      .eq('id', requestRow.id)
      .eq('status', 'published');
  }

  return NextResponse.json(
    {
      request: {
        ...requestRow,
        status: matchesPayload.length && requestRow.status === 'published' ? 'matched' : requestRow.status,
      },
      matches: matchesPayload,
    },
    { status: 201 }
  );
}
