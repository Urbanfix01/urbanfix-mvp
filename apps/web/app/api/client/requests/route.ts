import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import { getClientWorkspaceSnapshot, insertClientEvent } from '@/app/api/client/_shared/data';
import {
  DEFAULT_MATCH_RADIUS_KM,
  geocodeFirstResult,
  haversineKm,
  isNowWithinWorkingHours,
  parseUrgencyWeight,
  parseWorkingHoursConfig,
  toFiniteNumber,
} from '../../_shared/marketplace';

const toText = (value: unknown) => String(value || '').trim();

const normalizeUrgency = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized === 'alta' || normalized === 'media' || normalized === 'baja') return normalized;
  return 'media';
};

const normalizeMode = (value: string) => (value.toLowerCase() === 'direct' ? 'direct' : 'marketplace');

const normalizeRadius = (value: unknown) => {
  const parsed = Number(value || DEFAULT_MATCH_RADIUS_KM);
  if (!Number.isFinite(parsed)) return DEFAULT_MATCH_RADIUS_KM;
  return Math.min(100, Math.max(1, Math.round(parsed)));
};

const createSnapshotResponse = async (userId: string) => {
  if (!supabase) return { requests: [], knownTechnicians: [] };
  try {
    return await getClientWorkspaceSnapshot(supabase, userId);
  } catch {
    return { requests: [], knownTechnicians: [] };
  }
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await getClientWorkspaceSnapshot(supabase, user.id);
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message?.includes('client_requests') || error?.message?.includes('relation')
            ? 'Falta la migracion de client_requests en Supabase.'
            : error?.message || 'No se pudieron cargar las solicitudes.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: clientProfile, error: clientProfileError } = await supabase
    .from('profiles')
    .select('full_name, phone, city')
    .eq('id', user.id)
    .maybeSingle();

  if (clientProfileError) {
    return NextResponse.json(
      {
        error:
          clientProfileError.message?.includes('profiles') || clientProfileError.message?.includes('relation')
            ? 'Falta la migracion de profiles en Supabase.'
            : clientProfileError.message || 'No se pudo validar el perfil de cliente.',
      },
      { status: 500 }
    );
  }

  const missingProfileFields: string[] = [];
  if (!toText(clientProfile?.full_name)) missingProfileFields.push('Nombre');
  if (!toText(clientProfile?.phone)) missingProfileFields.push('Telefono');
  if (!toText(clientProfile?.city)) missingProfileFields.push('Ciudad');

  if (missingProfileFields.length > 0) {
    return NextResponse.json(
      {
        error: `Completa tu perfil de cliente antes de publicar. Faltan: ${missingProfileFields.join(', ')}.`,
      },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const title = toText(body.title);
  const category = toText(body.category);
  const address = toText(body.address);
  const city = toText(body.city);
  const resolvedCity = city || toText(clientProfile?.city);
  const description = toText(body.description);
  const preferredWindow = toText(body.preferredWindow);
  const urgency = normalizeUrgency(toText(body.urgency));
  const mode = normalizeMode(toText(body.mode));
  const radiusKm = normalizeRadius(body.radiusKm);

  const targetTechnicianId = toText(body.targetTechnicianId) || null;
  const targetTechnicianName = toText(body.targetTechnicianName) || null;
  const targetTechnicianPhone = toText(body.targetTechnicianPhone) || null;

  if (!title || !category || !address || !description) {
    return NextResponse.json(
      { error: 'Completa titulo, categoria, direccion y descripcion para publicar la solicitud.' },
      { status: 400 }
    );
  }

  if (mode === 'direct' && !targetTechnicianId) {
    return NextResponse.json({ error: 'Selecciona un tecnico conocido para solicitud directa.' }, { status: 400 });
  }

  let locationLat = toFiniteNumber(body.locationLat);
  let locationLng = toFiniteNumber(body.locationLng);
  if (locationLat === null || locationLng === null) {
    const geocodeQuery = [address, resolvedCity].filter(Boolean).join(', ');
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
    city: resolvedCity || null,
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

  const requestLat = toFiniteNumber((requestRow as any).location_lat);
  const requestLng = toFiniteNumber((requestRow as any).location_lng);
  const hasRequestGeo = requestLat !== null && requestLng !== null;

  let warning = '';
  let matchesPayload: Record<string, unknown>[] = [];
  const requestLatValue = requestLat as number;
  const requestLngValue = requestLng as number;

  if (mode === 'marketplace' && hasRequestGeo) {
    const { data: technicians, error: techError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, business_name, phone, specialties, city, public_rating, working_hours, service_lat, service_lng, access_granted'
      )
      .eq('access_granted', true)
      .limit(600);

    if (techError || !technicians) {
      warning = techError?.message || 'No se pudo calcular cercania con tecnicos en esta publicacion.';
    } else {
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
            score,
            distanceKm,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score || a.distanceKm - b.distanceKm)
        .slice(0, 5);

      matchesPayload = ranked.map((entry: any) => ({
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
    }
  }

  if (mode === 'marketplace' && !hasRequestGeo) {
    warning = 'Solicitud publicada, pero sin geolocalizacion precisa. Completa ciudad/direccion para sincronizar mapa.';
  }

  const requestStatus =
    matchesPayload.length && String(requestRow.status || '') === 'published' ? 'matched' : requestRow.status;

  try {
    await insertClientEvent(
      supabase,
      String(requestRow.id),
      user.id,
      mode === 'direct'
        ? 'Solicitud directa enviada'
        : hasRequestGeo
        ? 'Solicitud publicada y sincronizada con mapa tecnico'
        : 'Solicitud publicada (pendiente de geolocalizacion)'
    );
  } catch {
    // Non-blocking: la solicitud ya fue creada y matcheada.
  }

  const snapshot = await createSnapshotResponse(user.id);

  return NextResponse.json(
    {
      ...snapshot,
      request: {
        ...requestRow,
        status: requestStatus,
      },
      matches: matchesPayload,
      warning: warning || null,
    },
    { status: 201 }
  );
}
