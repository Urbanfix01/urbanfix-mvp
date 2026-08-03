import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import PublicTechniciansMap, { type PublicTechnicianMapPoint } from '../../../components/public/PublicTechniciansMap';
import ProfileLikeButton from '../../../components/profile/ProfileLikeButton';
import PublicTopNav from '../../../components/PublicTopNav';
import VidrieraSearchAnalytics from '../../../components/vidriera/VidrieraSearchAnalytics';
import { createAnonClient, getServiceRoleClient } from '../../../lib/supabase/server';
import {
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  resolveWorkingHoursTimeZone,
} from '../../api/_shared/marketplace';
import {
  getArgentinaZoneSearchOptions,
  matchesArgentinaZoneQuery,
  resolveArgentinaZoneCoords,
  toFiniteCoordinate,
} from '../../../lib/geo/argentina-zone-presets';
import { buildTechnicianPath } from '../../../lib/seo/technician-profile';
import { fetchPublicReviewStatsByProfileIds } from '../../../lib/public-profile-reviews';
import {
  PUBLISHED_TECHNICIANS_SELECT_FALLBACK,
  PUBLISHED_TECHNICIANS_SELECT_RICH,
  isMissingPublicProfileFieldError,
} from '../../../lib/public-profile-select';
import { isPublicDirectoryProfileVisible } from '../../../lib/public-profile-validity';
import {
  getGremioBySlug,
  profileMatchesGremioQuery,
  profileMatchesSpecialtyQuery,
} from '../../../lib/seo/gremios-data';
import { TECH_SPECIALTY_OPTIONS } from '../../../lib/technician-specialties';
import { ciudades, ciudadSlugs, type CiudadKey } from '../../../lib/seo/urbanfix-data';

type VidrieraZonaSearchParams = {
  gremio?: string | string[] | undefined;
  especialidad?: string | string[] | undefined;
  disponibilidad?: string | string[] | undefined;
};

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const dynamicParams = false;
export const revalidate = 300;

export function generateStaticParams() {
  return ciudadSlugs.map((zona) => ({ zona }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zona: string }>;
}): Promise<Metadata> {
  const { zona } = await params;
  const city = ciudades[zona as CiudadKey];
  if (!city) return { title: 'Zona no encontrada | UrbanFix' };

  return {
    title: `Tecnicos disponibles en ${city.name} | UrbanFix`,
    description: `Explora tecnicos publicados, mapa de cobertura y perfiles visibles en ${city.name} dentro de UrbanFix.`,
    alternates: { canonical: `/vidriera/${zona}` },
    openGraph: {
      title: `Tecnicos disponibles en ${city.name} | UrbanFix`,
      description: `Mapa publico, cobertura y perfiles de tecnicos publicados en ${city.name}.`,
      url: `https://www.urbanfix.com.ar/vidriera/${zona}`,
      type: 'website',
    },
  };
}

type PublishedProfileRow = {
  id: string;
  access_granted: boolean | null;
  profile_published: boolean | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  country?: string | null;
  address: string | null;
  company_address?: string | null;
  city: string | null;
  coverage_area: string | null;
  service_city?: string | null;
  service_province?: string | null;
  service_district?: string | null;
  working_hours?: string | null;
  service_lat: number | null;
  service_lng: number | null;
  service_radius_km?: number | null;
  specialties: string | null;
  company_logo_url?: string | null;
  avatar_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  references_summary?: string | null;
  public_likes_count?: number | null;
  public_rating?: number | null;
  public_reviews_count?: number | null;
  completed_jobs_total?: number | null;
  comments_count?: number | null;
  created_at?: string | null;
};

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const getProfileAvailability = (profile: PublishedProfileRow) => {
  const configured = Boolean(String(profile.working_hours || '').trim());
  const config = parseWorkingHoursConfig(profile.working_hours || '');
  const timeZone = resolveWorkingHoursTimeZone(profile.country, 'Argentina');
  const openNow = configured ? isNowWithinWorkingHours(config, new Date(), timeZone) : false;
  return {
    configured,
    openNow,
    status: configured ? (openNow ? ('open' as const) : ('closed' as const)) : ('unspecified' as const),
    label: configured ? (openNow ? 'Disponible ahora' : 'Fuera de horario') : 'A coordinar',
    hoursLabel: configured ? formatWorkingHoursLabel(config) : 'Horario a coordinar',
  };
};

const getPublicSupabaseClient = () => {
  try {
    return createAnonClient();
  } catch {
    return null;
  }
};

const fetchPublishedProfiles = async (supabase: NonNullable<ReturnType<typeof getPublicSupabaseClient>>) => {
  let response = await supabase
    .from('profiles')
    .select(PUBLISHED_TECHNICIANS_SELECT_RICH)
    .eq('access_granted', true)
    .eq('profile_published', true)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(240);

  if (response.error && isMissingPublicProfileFieldError(String(response.error.message || ''))) {
    response = await supabase
      .from('profiles')
      .select(PUBLISHED_TECHNICIANS_SELECT_FALLBACK)
      .eq('access_granted', true)
      .eq('profile_published', true)
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(240);
  }

  return {
    data: (Array.isArray(response.data) ? response.data : []) as unknown as PublishedProfileRow[],
    error: response.error,
  };
};

export default async function VidrieraZonaPage({
  params,
  searchParams,
}: {
  params: Promise<{ zona: string }>;
  searchParams?: Promise<VidrieraZonaSearchParams>;
}) {
  const { zona } = await params;
  const city = ciudades[zona as CiudadKey];
  if (!city) return notFound();

  const resolvedSearchParams = (await searchParams) || {};
  const gremioQueryRaw = Array.isArray(resolvedSearchParams?.gremio)
    ? resolvedSearchParams.gremio[0] || ''
    : resolvedSearchParams?.gremio || '';
  const specialtyQueryRaw = Array.isArray(resolvedSearchParams?.especialidad)
    ? resolvedSearchParams.especialidad[0] || ''
    : resolvedSearchParams?.especialidad || '';
  const availabilityQueryRaw = Array.isArray(resolvedSearchParams?.disponibilidad)
    ? resolvedSearchParams.disponibilidad[0] || ''
    : resolvedSearchParams?.disponibilidad || '';
  const gremioQuery = String(gremioQueryRaw || '').trim();
  const specialtyQuery = String(specialtyQueryRaw || '').trim();
  const availabilityQuery = String(availabilityQueryRaw || '').trim().toLowerCase() === 'ahora' ? 'ahora' : '';
  const activeGremio = gremioQuery ? getGremioBySlug(gremioQuery) : null;

  const supabase = getPublicSupabaseClient();
  const zoneQuery = city.zoneQuery;

  if (!supabase) {
    return (
      <div className={sora.className}>
        <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
          <PublicTopNav activeHref="/vidriera" sticky showNavigationLinks />
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 text-center sm:p-8">
              <h1 className="text-2xl font-semibold text-white">Vidriera no disponible</h1>
              <p className="mt-2 text-sm text-white/80">Falta configurar variables de Supabase en el deploy.</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const { data: profiles, error } = await fetchPublishedProfiles(supabase);
  const safeProfiles = profiles.filter(isPublicDirectoryProfileVisible);
  const zoneFilteredProfiles = safeProfiles.filter((profile) =>
    matchesArgentinaZoneQuery(zoneQuery, profile.city, profile.coverage_area, profile.address, profile.company_address)
  );
  const specialtyFilteredProfiles = zoneFilteredProfiles.filter((profile) => {
    if (activeGremio && !profileMatchesGremioQuery(profile.specialties, activeGremio)) return false;
    if (specialtyQuery && !profileMatchesSpecialtyQuery(profile.specialties, specialtyQuery)) return false;
    return true;
  });
  const filteredProfiles = availabilityQuery === 'ahora'
    ? specialtyFilteredProfiles.filter((profile) => getProfileAvailability(profile).openNow)
    : specialtyFilteredProfiles;
  const reviewStatsByProfile = await fetchPublicReviewStatsByProfileIds(
    getServiceRoleClient() || supabase,
    filteredProfiles.map((profile) => profile.id)
  );
  const workingHoursConfiguredCount = filteredProfiles.filter(
    (profile) => getProfileAvailability(profile).configured
  ).length;
  const zonaOptions = getArgentinaZoneSearchOptions();
  const rubroOptions = TECH_SPECIALTY_OPTIONS.slice().sort((a, b) => a.localeCompare(b, 'es')).map((specialty) => ({
    label: specialty,
    value: specialty,
  }));
  const mapPoints = filteredProfiles
    .map((profile) => {
      const exactLat = toFiniteCoordinate(profile.service_lat);
      const exactLng = toFiniteCoordinate(profile.service_lng);
      const fallbackCoords =
        exactLat === null || exactLng === null
          ? resolveArgentinaZoneCoords(profile.city, profile.coverage_area, profile.address, profile.company_address)
          : null;
      const lat = exactLat ?? fallbackCoords?.lat ?? null;
      const lng = exactLng ?? fallbackCoords?.lng ?? null;
      if (lat === null || lng === null) return null;

      const displayName = profile.business_name || profile.full_name || 'Tecnico UrbanFix';
      const specialties = parseDelimitedValues(profile.specialties).slice(0, 6);
      const hasExactLocation = exactLat !== null && exactLng !== null;
      const availability = getProfileAvailability(profile);
      const socialLabels = [
        profile.facebook_url ? 'Facebook' : '',
        profile.instagram_url ? 'Instagram' : '',
      ].filter(Boolean);
      const reviewStats = reviewStatsByProfile.get(profile.id);

      const mapPoint: PublicTechnicianMapPoint = {
        id: profile.id,
        name: displayName,
        ownerName: String(profile.full_name || '').trim(),
        profileHref: buildTechnicianPath(profile.id, displayName),
        city: String(profile.city || fallbackCoords?.label || '').trim(),
        coverageArea: String(profile.coverage_area || '').trim(),
        profileSummary: String(profile.references_summary || '').trim(),
        socialLabels,
        specialties,
        lat,
        lng,
        radiusKm: Math.max(1, Math.round(Number(profile.service_radius_km || DEFAULT_MATCH_RADIUS_KM))),
        precision: hasExactLocation ? 'exact' : 'approx',
        openNow: availability.openNow,
        availabilityStatus: availability.status,
        workingHoursLabel: availability.hoursLabel,
        likesCount: Math.max(0, Number(profile.public_likes_count || 0)),
        rating: reviewStats?.rating ?? (Number.isFinite(Number(profile.public_rating)) ? Number(profile.public_rating) : null),
        reviewsCount: Math.max(0, Number(reviewStats?.reviewsCount || profile.public_reviews_count || 0)),
        commentsCount: Math.max(0, Number(reviewStats?.commentsCount || 0)),
        completedJobsTotal: Math.max(0, Number(profile.completed_jobs_total || 0)),
        avatarUrl: String(profile.avatar_url || '').trim(),
        companyLogoUrl: String(profile.company_logo_url || '').trim(),
      };

      return mapPoint;
    })
    .filter((point): point is PublicTechnicianMapPoint => point !== null);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://www.urbanfix.com.ar/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Vidriera de tecnicos',
        item: 'https://www.urbanfix.com.ar/vidriera',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city.name,
        item: `https://www.urbanfix.com.ar/vidriera/${zona}`,
      },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Tecnicos disponibles en ${city.name}`,
    description: `Mapa publico y perfiles publicados de tecnicos en ${city.name}.`,
    url: `https://www.urbanfix.com.ar/vidriera/${zona}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: filteredProfiles.slice(0, 12).map((profile, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: String(profile.business_name || profile.full_name || 'Tecnico UrbanFix'),
        url: `https://www.urbanfix.com.ar${buildTechnicianPath(
          profile.id,
          String(profile.business_name || profile.full_name || 'Tecnico UrbanFix')
        )}`,
      })),
    },
  };
  const explorerQuickLinks = [
    { label: 'Volver a toda la vidriera', href: '/vidriera' },
    { label: `Ver ${city.name}`, href: `/ciudades/${zona}` },
    { label: `Precios en ${city.name}`, href: `/precios-mano-de-obra/${zona}` },
  ];

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
        <PublicTopNav activeHref="/vidriera" sticky showNavigationLinks />
        <VidrieraSearchAnalytics
          zone={city.name}
          guild={activeGremio?.title || ''}
          specialty={specialtyQuery}
          availability={availabilityQuery}
          resultCount={filteredProfiles.length}
          zoneResultCount={zoneFilteredProfiles.length}
        />

        <div className="px-3 pb-4 pt-3 sm:px-4 lg:px-6">
          {error && (
            <div className="mx-auto mb-4 w-full max-w-[1500px] rounded-2xl border border-rose-300/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              No pudimos cargar la vidriera en este momento.
            </div>
          )}

          {mapPoints.length > 0 && (
            <PublicTechniciansMap
              points={mapPoints}
              eyebrow={city.region}
              title={`Tecnicos disponibles en ${city.name}`}
              description={`Mapa full screen y listado flotante para explorar tecnicos publicados en ${city.name}. Esta entrada combina descubrimiento rapido, acceso directo al perfil y una ruta estable para Google.`}
              searchConfig={{
                actionHref: '/vidriera',
                clearHref: `/vidriera/${zona}`,
                query: city.name,
                options: zonaOptions,
                rubroFieldName: 'especialidad',
                rubroValue: specialtyQuery,
                rubroOptions,
                rubroPlaceholder: 'Todos los rubros',
                availabilityValue: availabilityQuery,
                hiddenFields: [
                  ...(activeGremio ? [{ name: 'gremio', value: activeGremio.slug }] : []),
                ],
                resultLabel: `Mostrando ${filteredProfiles.length} tecnico(s) visibles en ${city.name}.`,
                listAnchorId: 'vidriera-listado',
                listLabel: 'Ver listado',
                placeholder: 'Ingresa otra ciudad, provincia o barrio',
                quickLinks: explorerQuickLinks,
              }}
            />
          )}
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          {(activeGremio || specialtyQuery || availabilityQuery) && (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Filtro activo</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Vidriera segmentada en {city.name}</h2>
                </div>
                <Link
                  href={`/vidriera/${zona}`}
                  className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Limpiar segmentacion
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeGremio ? (
                  <span className="rounded-full border border-[#ff8f1f] bg-[#ff8f1f] px-3 py-2 text-xs font-semibold text-[#2a0338]">
                    {activeGremio.title}
                  </span>
                ) : null}
                {specialtyQuery ? (
                  <span className="rounded-full border border-[#ffbf73] bg-[#ffbf73] px-3 py-2 text-xs font-semibold text-[#2a0338]">
                    {specialtyQuery}
                  </span>
                ) : null}
                {availabilityQuery ? (
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-100">
                    Disponible ahora
                  </span>
                ) : null}
              </div>
            </section>
          )}

          {filteredProfiles.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-semibold text-white">
                {activeGremio || specialtyQuery || availabilityQuery
                  ? `No encontramos tecnicos visibles para esta segmentacion en ${city.name}.`
                  : `Aun no encontramos tecnicos visibles para ${city.name}.`}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {activeGremio || specialtyQuery || availabilityQuery
                  ? 'Prueba otra especialidad, otro gremio o limpia la disponibilidad para ver toda la zona.'
                  : 'La zona ya quedo lista como ruta indexable. Cuando haya perfiles publicados, esta pagina los mostrara.'}
              </p>
            </section>
          ) : (
            <section id="vidriera-listado" className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Listado completo</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">Tecnicos visibles en {city.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/72">
                    Debajo queda el listado tradicional para comparar perfiles uno abajo del otro sin salir de la zona actual.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                    Tecnicos visibles: {filteredProfiles.length}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                    Con ubicacion en mapa: {mapPoints.length}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                    Con horario: {workingHoursConfiguredCount}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((profile) => {
                const displayName = profile.business_name || profile.full_name || 'Tecnico UrbanFix';
                const specialties = parseDelimitedValues(profile.specialties).slice(0, 5);
                const likesCount = Math.max(0, Number(profile.public_likes_count || 0));
                const profileHref = buildTechnicianPath(profile.id, displayName);
                const profileCode = profile.id.slice(0, 8).toUpperCase();
                const hasExactLocation = Number.isFinite(Number(profile.service_lat)) && Number.isFinite(Number(profile.service_lng));
                const availability = getProfileAvailability(profile);

                return (
                  <article
                    key={profile.id}
                    className="group rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.09] to-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_20px_45px_-30px_rgba(0,0,0,0.85)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06]">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Foto tecnico" className="h-full w-full object-cover" />
                        ) : profile.company_logo_url ? (
                          <img src={profile.company_logo_url} alt="Logo tecnico" className="h-full w-full object-contain p-1.5" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white/80">
                            {displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">{displayName}</p>
                        <p className="truncate text-xs text-white/70">{profile.full_name || 'Profesional'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          {profile.city && (
                            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/90">
                              {profile.city}
                            </span>
                          )}
                          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/80">
                            Perfil: {profileCode}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 ${
                              availability.status === 'open'
                                ? 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100'
                                : availability.status === 'closed'
                                  ? 'border-violet-300/35 bg-violet-400/12 text-violet-100'
                                  : 'border-white/15 bg-white/[0.06] text-white/80'
                            }`}
                          >
                            {availability.label}
                          </span>
                          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/90">
                            {hasExactLocation ? 'Ubicacion verificada' : 'Zona estimada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {profile.coverage_area && (
                      <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80">
                        Cobertura: {profile.coverage_area}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-semibold text-white/62">{availability.hoursLabel}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {specialties.length > 0 ? (
                        specialties.map((item) => (
                          <span
                            key={`${profile.id}-${item}`}
                            className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/80"
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60">
                          Sin rubros cargados
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={profileHref}
                        data-analytics-event="marketplace_profile_opened"
                        data-analytics-location="marketplace_list"
                        data-analytics-target={profile.id}
                        className="rounded-full bg-[#ff8f1f] px-3 py-1.5 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                      >
                        Ir al perfil
                      </Link>
                      <ProfileLikeButton profileId={profile.id} initialCount={likesCount} compact />
                    </div>
                  </article>
                );
              })}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
