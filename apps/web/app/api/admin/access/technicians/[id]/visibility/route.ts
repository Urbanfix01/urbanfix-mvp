import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { toFiniteNumber } from '@/app/api/_shared/marketplace';
import { resolveArgentinaZoneCoords } from '@/lib/geo/argentina-zone-presets';
import { buildTechnicianPath } from '@/lib/seo/technician-profile';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_SELECT_RICH = [
  'id',
  'email',
  'access_granted',
  'profile_published',
  'profile_published_at',
  'full_name',
  'business_name',
  'phone',
  'address',
  'company_address',
  'city',
  'coverage_area',
  'working_hours',
  'specialties',
  'service_lat',
  'service_lng',
  'service_radius_km',
  'public_rating',
  'public_reviews_count',
  'completed_jobs_total',
  'created_at',
  'updated_at',
].join(',');

const PROFILE_SELECT_FALLBACK = [
  'id',
  'email',
  'access_granted',
  'profile_published',
  'full_name',
  'business_name',
  'phone',
  'address',
  'company_address',
  'city',
  'coverage_area',
  'specialties',
  'service_lat',
  'service_lng',
  'created_at',
  'updated_at',
].join(',');

const isMissingProfileFieldError = (message: string) => {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('column') ||
    normalized.includes('schema cache') ||
    normalized.includes('profile_published_at') ||
    normalized.includes('service_radius_km') ||
    normalized.includes('company_address') ||
    normalized.includes('working_hours') ||
    normalized.includes('public_reviews_count') ||
    normalized.includes('completed_jobs_total') ||
    normalized.includes('public_rating')
  );
};

const toText = (value: unknown) => String(value || '').trim();

const isProfilePublished = (value: boolean | null | undefined) => value !== false;

const hasMeaningfulCoverageArea = (value: string | null | undefined) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes('tu ciudad base');
};

const hasWorkZoneConfigured = (profile: Record<string, unknown>) =>
  Boolean(
    toText(profile.city) ||
      toText(profile.address) ||
      toText(profile.company_address) ||
      hasMeaningfulCoverageArea(toText(profile.coverage_area))
  );

const getProfileLabel = (profile: Record<string, unknown> | null) =>
  toText(profile?.business_name) || toText(profile?.full_name) || toText(profile?.email) || 'Sin perfil';

const pushReason = (target: string[], condition: boolean, reason: string) => {
  if (condition) target.push(reason);
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolvedParams = await params;
  const technicianId = String(resolvedParams?.id || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(technicianId)) {
    return NextResponse.json({ error: 'Invalid technician id' }, { status: 400 });
  }

  let profileResponse = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_RICH)
    .eq('id', technicianId)
    .maybeSingle();

  let usedFallback = false;
  if (profileResponse.error && isMissingProfileFieldError(profileResponse.error.message || '')) {
    usedFallback = true;
    profileResponse = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FALLBACK)
      .eq('id', technicianId)
      .maybeSingle();
  }

  if (profileResponse.error) {
    return NextResponse.json({ error: profileResponse.error.message || 'No se pudo cargar el perfil.' }, { status: 500 });
  }

  const profile = (profileResponse.data || null) as Record<string, unknown> | null;
  if (!profile) {
    return NextResponse.json(
      {
        ok: true,
        technicianId,
        profileFound: false,
        visibility: {
          publicProfilePage: { visible: false, reasons: ['No existe fila en profiles para este técnico.'] },
          vidriera: { visible: false, reasons: ['No existe fila en profiles para este técnico.'] },
          clientMap: { visible: false, reasons: ['No existe fila en profiles para este técnico.'] },
          operativo: { visible: false, reasons: ['No existe fila en profiles para este técnico.'] },
        },
      },
      { status: 200 }
    );
  }

  const accessGranted = profile.access_granted === true;
  const profilePublishedRaw = profile.profile_published as boolean | null | undefined;
  const profilePublishedEffective = isProfilePublished(profilePublishedRaw);
  const exactLat = toFiniteNumber(profile.service_lat);
  const exactLng = toFiniteNumber(profile.service_lng);
  const hasExactGeo = exactLat !== null && exactLng !== null;
  const fallbackGeo =
    hasExactGeo
      ? null
      : resolveArgentinaZoneCoords(
          toText(profile.city),
          toText(profile.coverage_area),
          toText(profile.address),
          toText(profile.company_address)
        );
  const hasFallbackGeo = Boolean(fallbackGeo);
  const workZoneConfigured = hasWorkZoneConfigured(profile);
  const displayName = getProfileLabel(profile);
  const publicPath = buildTechnicianPath(technicianId, displayName);
  const publicProfileReasons: string[] = [];
  const vidrieraReasons: string[] = [];
  const clientMapReasons: string[] = [];
  const operativoReasons: string[] = [];

  pushReason(publicProfileReasons, !accessGranted, 'access_granted está en false o null.');
  pushReason(publicProfileReasons, profilePublishedRaw === false, 'profile_published está en false.');

  pushReason(vidrieraReasons, !accessGranted, 'access_granted está en false o null.');
  pushReason(vidrieraReasons, profilePublishedRaw === false, 'profile_published está en false.');
  pushReason(vidrieraReasons, !workZoneConfigured, 'Falta zona visible: ciudad, dirección o coverage_area útil.');

  pushReason(clientMapReasons, !accessGranted, 'access_granted está en false o null.');
  pushReason(clientMapReasons, profilePublishedRaw === false, 'profile_published está en false.');
  pushReason(clientMapReasons, !hasExactGeo && !hasFallbackGeo, 'No hay coordenadas exactas ni zona resoluble para mapa público.');

  pushReason(operativoReasons, !accessGranted, 'access_granted está en false o null.');
  pushReason(
    operativoReasons,
    !hasExactGeo && !toText(profile.company_address) && !toText(profile.address),
    'Falta dirección base para geocodificar la base operativa.'
  );
  pushReason(
    operativoReasons,
    !hasExactGeo && !toText(profile.city),
    'Falta ciudad base para completar el contexto operativo.'
  );

  return NextResponse.json({
    ok: true,
    technicianId,
    profileFound: true,
    usedFallback,
    profile: {
      id: technicianId,
      label: displayName,
      email: toText(profile.email) || null,
      accessGranted,
      profilePublished: profilePublishedRaw ?? null,
      profilePublishedEffective,
      profilePublishedAt: toText(profile.profile_published_at) || null,
      phone: toText(profile.phone) || null,
      city: toText(profile.city) || null,
      address: toText(profile.address) || null,
      companyAddress: toText(profile.company_address) || null,
      coverageArea: toText(profile.coverage_area) || null,
      specialties: toText(profile.specialties) || null,
      serviceRadiusKm: toFiniteNumber(profile.service_radius_km),
      publicRating: toFiniteNumber(profile.public_rating),
      publicReviewsCount: Math.max(0, Number(profile.public_reviews_count || 0)),
      completedJobsTotal: Math.max(0, Number(profile.completed_jobs_total || 0)),
      createdAt: toText(profile.created_at) || null,
      updatedAt: toText(profile.updated_at) || null,
    },
    geo: {
      exact: hasExactGeo
        ? {
            lat: Number(exactLat!.toFixed(6)),
            lng: Number(exactLng!.toFixed(6)),
          }
        : null,
      fallback: fallbackGeo,
      workZoneConfigured,
      hasExactGeo,
      hasFallbackGeo,
    },
    links: {
      publicPath,
    },
    visibility: {
      publicProfilePage: {
        visible: publicProfileReasons.length === 0,
        reasons: publicProfileReasons,
      },
      vidriera: {
        visible: vidrieraReasons.length === 0,
        reasons: vidrieraReasons,
      },
      clientMap: {
        visible: clientMapReasons.length === 0,
        reasons: clientMapReasons,
      },
      operativo: {
        visible: operativoReasons.length === 0,
        reasons: operativoReasons,
      },
    },
  });
}