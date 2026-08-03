import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import PublicTechniciansMap, { type PublicTechnicianMapPoint } from '../../components/public/PublicTechniciansMap';
import ProfileLikeButton from '../../components/profile/ProfileLikeButton';
import PublicTopNav from '../../components/PublicTopNav';
import VidrieraSearchAnalytics from '../../components/vidriera/VidrieraSearchAnalytics';
import { createAnonClient, getServiceRoleClient } from '../../lib/supabase/server';
import {
  getArgentinaZoneSearchOptions,
  matchesArgentinaZoneQuery,
  resolveArgentinaZoneCoords,
  toFiniteCoordinate,
} from '../../lib/geo/argentina-zone-presets';
import { getServerCountryPreference } from '../../lib/country-preference-server';
import { buildTechnicianPath } from '../../lib/seo/technician-profile';
import { fetchPublicReviewStatsByProfileIds } from '../../lib/public-profile-reviews';
import {
  PUBLISHED_TECHNICIANS_SELECT_FALLBACK,
  PUBLISHED_TECHNICIANS_SELECT_RICH,
  isMissingPublicProfileFieldError,
} from '../../lib/public-profile-select';
import { isPublicDirectoryProfileVisible } from '../../lib/public-profile-validity';
import {
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
  resolveWorkingHoursTimeZone,
} from '../api/_shared/marketplace';
import {
  getGremioBySlug,
  profileMatchesGremioQuery,
  profileMatchesSpecialtyQuery,
} from '../../lib/seo/gremios-data';
import { TECH_SPECIALTY_OPTIONS } from '../../lib/technician-specialties';
import { ciudades } from '../../lib/seo/urbanfix-data';
import {
  technicianSeoLaunchCountries,
  technicianSeoTrades,
} from '../../lib/seo/technician-market-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Vidriera de Técnicos | UrbanFix',
  description: 'Explora técnicos publicados, rubros y cobertura para solicitar tu trabajo.',
  alternates: {
    canonical: '/vidriera',
  },
};

const featuredVidrieraZones = ['buenos-aires', 'caba', 'cordoba', 'mendoza', 'rosario', 'salta'].map((slug) => ({
  slug,
  ...(ciudades as Record<string, (typeof ciudades)[keyof typeof ciudades]>)[slug],
}));

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

type VidrieraSearchParams = {
  pais?: string | string[] | undefined;
  zona?: string | string[] | undefined;
  gremio?: string | string[] | undefined;
  especialidad?: string | string[] | undefined;
  disponibilidad?: string | string[] | undefined;
  mercado?: string | string[] | undefined;
  ruta_mercado?: string | string[] | undefined;
};

type VidrieraPageProps = {
  searchParams?: Promise<VidrieraSearchParams>;
};

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeSearchText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const buildProfileZoneText = (profile: PublishedProfileRow) =>
  [
    profile.service_city || profile.city,
    profile.service_district,
    profile.service_province,
    profile.coverage_area,
    profile.address,
    profile.company_address,
    profile.country,
  ]
    .filter(Boolean)
    .join(' ');

const getProfileAvailability = (profile: PublishedProfileRow, fallbackCountry = '') => {
  const configured = Boolean(String(profile.working_hours || '').trim());
  const config = parseWorkingHoursConfig(profile.working_hours || '');
  const timeZone = resolveWorkingHoursTimeZone(profile.country, fallbackCountry);
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
    .or('profile_published.is.null,profile_published.eq.true')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(240);

  let usedFallback = false;
  if (response.error && isMissingPublicProfileFieldError(String(response.error.message || ''))) {
    usedFallback = true;
    response = await supabase
      .from('profiles')
      .select(PUBLISHED_TECHNICIANS_SELECT_FALLBACK)
      .eq('access_granted', true)
      .or('profile_published.is.null,profile_published.eq.true')
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(240);
  }

  return {
    data: (Array.isArray(response.data) ? response.data : []) as unknown as PublishedProfileRow[],
    error: response.error,
    usedFallback,
  };
};

export const dynamic = 'force-dynamic';

export default async function VidrieraPage({ searchParams }: VidrieraPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const marketHeadingRaw = Array.isArray(resolvedSearchParams.mercado)
    ? resolvedSearchParams.mercado[0] || ''
    : resolvedSearchParams.mercado || '';
  const marketPathRaw = Array.isArray(resolvedSearchParams.ruta_mercado)
    ? resolvedSearchParams.ruta_mercado[0] || ''
    : resolvedSearchParams.ruta_mercado || '';
  const marketHeading = String(marketHeadingRaw || '').trim();
  const marketPath = String(marketPathRaw || '').trim();
  const storedCountry = await getServerCountryPreference();
  const countryQueryRaw = Array.isArray(resolvedSearchParams.pais)
    ? resolvedSearchParams.pais[0] || ''
    : resolvedSearchParams.pais || '';
  const zonaQueryRaw = Array.isArray(resolvedSearchParams.zona)
    ? resolvedSearchParams.zona[0] || ''
    : resolvedSearchParams.zona || '';
  const gremioQueryRaw = Array.isArray(resolvedSearchParams.gremio)
    ? resolvedSearchParams.gremio[0] || ''
    : resolvedSearchParams.gremio || '';
  const specialtyQueryRaw = Array.isArray(resolvedSearchParams.especialidad)
    ? resolvedSearchParams.especialidad[0] || ''
    : resolvedSearchParams.especialidad || '';
  const availabilityQueryRaw = Array.isArray(resolvedSearchParams.disponibilidad)
    ? resolvedSearchParams.disponibilidad[0] || ''
    : resolvedSearchParams.disponibilidad || '';
  const zonaQuery = String(zonaQueryRaw || '').trim();
  const countryQuery = String(countryQueryRaw || '').trim();
  const gremioQuery = String(gremioQueryRaw || '').trim();
  const specialtyQuery = String(specialtyQueryRaw || '').trim();
  const availabilityQuery = String(availabilityQueryRaw || '').trim().toLowerCase() === 'ahora' ? 'ahora' : '';
  const zonaQueryNormalized = normalizeSearchText(zonaQuery);
  const countryQueryNormalized = normalizeSearchText(countryQuery);
  const selectedCountry = countryQuery || storedCountry;
  const activeGremio = gremioQuery ? getGremioBySlug(gremioQuery) : null;
  const featuredGremios = [
    'electricidad',
    'instalaciones-sanitarias',
    'climatizacion',
    'pintura',
    'techistas',
    'aberturas-y-vidrieria',
  ]
    .map((slug) => getGremioBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const supabase = getPublicSupabaseClient();

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

  const { data: profiles, error, usedFallback } = await fetchPublishedProfiles(supabase);
  const safeProfiles = profiles.filter(isPublicDirectoryProfileVisible);
  const countryFilteredProfiles = countryQueryNormalized
    ? safeProfiles.filter((profile) => {
        const profileCountry = normalizeSearchText(profile.country);
        if (profileCountry) return profileCountry === countryQueryNormalized;
        return countryQueryNormalized === 'argentina';
      })
    : safeProfiles;
  const zoneFilteredProfiles = zonaQueryNormalized
    ? countryFilteredProfiles.filter(
        (profile) =>
          matchesArgentinaZoneQuery(
            zonaQuery,
            profile.city,
            profile.service_city,
            profile.service_district,
            profile.service_province,
            profile.coverage_area,
            profile.address,
            profile.company_address
          ) || normalizeSearchText(buildProfileZoneText(profile)).includes(zonaQueryNormalized)
      )
    : countryFilteredProfiles;
  const specialtyFilteredProfiles = zoneFilteredProfiles.filter((profile) => {
    if (activeGremio && !profileMatchesGremioQuery(profile.specialties, activeGremio)) return false;
    if (specialtyQuery && !profileMatchesSpecialtyQuery(profile.specialties, specialtyQuery)) return false;
    return true;
  });
  const filteredProfiles = availabilityQuery === 'ahora'
    ? specialtyFilteredProfiles.filter((profile) => getProfileAvailability(profile, selectedCountry).openNow)
    : specialtyFilteredProfiles;
  const reviewStatsByProfile = await fetchPublicReviewStatsByProfileIds(
    getServiceRoleClient() || supabase,
    filteredProfiles.map((profile) => profile.id)
  );
  const migrationMissing = usedFallback && !error;
  const workingHoursConfiguredCount = filteredProfiles.filter(
    (profile) => getProfileAvailability(profile, selectedCountry).configured
  ).length;
  const zonaOptions = Array.from(
    new Set([
      ...countryFilteredProfiles
        .map((profile) => String(profile.service_city || profile.city || profile.coverage_area || profile.country || '').trim())
        .filter(Boolean),
      ...(!countryQuery || countryQueryNormalized === 'argentina' ? getArgentinaZoneSearchOptions() : []),
    ])
  ).sort((a, b) => a.localeCompare(b, 'es'));
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
          ? resolveArgentinaZoneCoords(
              profile.service_city,
              profile.service_district,
              profile.service_province,
              profile.city,
              profile.coverage_area,
              profile.address,
              profile.company_address,
              profile.country
            )
          : null;
      const lat = exactLat ?? fallbackCoords?.lat ?? null;
      const lng = exactLng ?? fallbackCoords?.lng ?? null;
      if (lat === null || lng === null) return null;

      const displayName = profile.business_name || profile.full_name || 'Técnico UrbanFix';
      const specialties = parseDelimitedValues(profile.specialties).slice(0, 6);
      const hasExactLocation = exactLat !== null && exactLng !== null;
      const availability = getProfileAvailability(profile, selectedCountry);
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
        city: String(profile.service_city || profile.city || fallbackCoords?.label || profile.country || '').trim(),
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
  const explorerQuickLinks = featuredVidrieraZones.map((zone) => ({
    label: zone.name,
    href: `/vidriera/${zone.slug}`,
  }));

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/vidriera" sticky showNavigationLinks />
        <VidrieraSearchAnalytics
          zone={zonaQuery}
          guild={activeGremio?.title || ''}
          specialty={specialtyQuery}
          availability={availabilityQuery}
          resultCount={filteredProfiles.length}
          zoneResultCount={zoneFilteredProfiles.length}
        />

        {marketHeading && (
          <header className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffbf7a]">Directorio UrbanFix</p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{marketHeading}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72">
              Compara perfiles publicados, zonas de cobertura y formas de contacto disponibles.
            </p>
          </header>
        )}

        <div className="px-3 pb-4 pt-3 sm:px-4 lg:px-6">
          {error && (
            <div className="mx-auto mb-4 w-full max-w-[1500px] rounded-2xl border border-rose-300/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {migrationMissing
                ? 'Falta migración de perfil público/redes en perfiles (profile_published, facebook_url, instagram_url).'
                : 'No pudimos cargar la vidriera en este momento.'}
            </div>
          )}

          {mapPoints.length > 0 && (
            <PublicTechniciansMap
              points={mapPoints}
              selectedCountry={selectedCountry}
              eyebrow="Técnicos disponibles"
              title="Explora tecnicos por zona"
              description="Busca una ciudad o barrio, selecciona un punto y compara reputacion, rubros y contacto directo."
              searchConfig={{
                actionHref: marketPath || '/vidriera',
                clearHref: marketPath || '/vidriera',
                query: zonaQuery,
                options: zonaOptions,
                rubroFieldName: 'especialidad',
                rubroValue: specialtyQuery,
                rubroOptions,
                rubroPlaceholder: 'Todos los rubros',
                availabilityValue: availabilityQuery,
                hiddenFields: [
                  ...(countryQuery ? [{ name: 'pais', value: countryQuery }] : []),
                  ...(activeGremio ? [{ name: 'gremio', value: activeGremio.slug }] : []),
                ],
                resultLabel:
                  zonaQuery || activeGremio || specialtyQuery || availabilityQuery
                    ? `Mostrando ${filteredProfiles.length} tecnico(s) para la busqueda actual.`
                    : `Mostrando ${filteredProfiles.length} tecnico(s) en toda la vidriera.`,
                listAnchorId: 'vidriera-listado',
                listLabel: 'Ver listado',
                placeholder: 'Ingresa ciudades, provincias o barrios',
                quickLinks: explorerQuickLinks,
              }}
            />
          )}
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          {!zonaQuery && (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Zonas indexables</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Entradas directas por zona</h2>
                </div>
                <Link
                  href="/ciudades"
                  className="text-xs font-semibold text-[#ffbf7a] transition hover:text-[#ffd5a8]"
                >
                  Ver todas las jurisdicciones
                </Link>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {featuredVidrieraZones.map((zone) => (
                  <Link
                    key={zone.slug}
                    href={`/vidriera/${zone.slug}`}
                    className="rounded-2xl border border-white/12 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                  >
                    <p className="text-base font-semibold text-white">Tecnicos en {zone.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#ffbf7a]">{zone.region}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Página estable para cobertura, perfiles publicados y mapa de técnicos en {zone.name}.
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!countryQuery && (
            <section className="mt-8 border-y border-white/12 py-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Explorar por pais y oficio</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Tecnicos por mercado</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {technicianSeoLaunchCountries.flatMap((country) =>
                  technicianSeoTrades.slice(0, 4).map((trade) => (
                    <Link
                      key={`${country.slug}-${trade.slug}`}
                      href={`/tecnicos/${trade.slug}/${country.slug}`}
                      className="border-b border-white/25 px-1 py-1 text-sm text-white/78 transition hover:border-[#ff8f1f] hover:text-white"
                    >
                      {trade.label} en {country.name}
                    </Link>
                  ))
                )}
              </div>
            </section>
          )}

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Filtro real por gremio</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Segmenta tecnicos por especialidad o rubro</h2>
                <p className="mt-2 max-w-3xl text-sm text-white/72">
                  Puedes combinar zona con gremio y, si quieres afinar mas, con una especialidad puntual dentro del mismo gremio.
                </p>
              </div>
              {(activeGremio || specialtyQuery || availabilityQuery) && (
                <Link
                  href={
                    marketPath
                      ? marketPath
                      : zonaQuery
                        ? `/vidriera?zona=${encodeURIComponent(zonaQuery)}`
                        : '/vidriera'
                  }
                  className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Limpiar segmentación
                </Link>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {featuredGremios.map((gremio) => (
                <Link
                  key={gremio.slug}
                  href={
                    zonaQuery
                      ? `/vidriera?zona=${encodeURIComponent(zonaQuery)}&gremio=${gremio.slug}${countryQuery ? `&pais=${encodeURIComponent(countryQuery)}` : ''}`
                      : `/vidriera/gremio/${gremio.slug}`
                  }
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    activeGremio?.slug === gremio.slug
                      ? 'border-[#ff8f1f] bg-[#ff8f1f] text-[#2a0338]'
                      : 'border-white/20 bg-white/[0.04] text-white/85 hover:border-white/35 hover:text-white'
                  }`}
                >
                  {gremio.title}
                </Link>
              ))}
            </div>

            {activeGremio ? (
              <div className="mt-5 rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Filtro activo: {activeGremio.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Usa una especialidad puntual para achicar aun mas el listado visible.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeGremio.specialties.map((item) => (
                    <Link
                      key={item}
                      href={
                        marketPath
                          ? `${marketPath}?especialidad=${encodeURIComponent(item)}`
                          : zonaQuery
                            ? `/vidriera?zona=${encodeURIComponent(zonaQuery)}&gremio=${activeGremio.slug}&especialidad=${encodeURIComponent(item)}${countryQuery ? `&pais=${encodeURIComponent(countryQuery)}` : ''}`
                            : `/vidriera/gremio/${activeGremio.slug}?especialidad=${encodeURIComponent(item)}`
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        specialtyQuery === item
                          ? 'border-[#ffbf73] bg-[#ffbf73] text-[#2a0338]'
                          : 'border-white/20 bg-white/[0.04] text-white/82 hover:border-white/35 hover:text-white'
                      }`}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {filteredProfiles.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-semibold text-white">
                {zonaQuery || activeGremio || specialtyQuery || availabilityQuery
                  ? 'No encontramos tecnicos para la combinacion de filtros actual.'
                  : 'Aun no hay tecnicos disponibles.'}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {zonaQuery || activeGremio || specialtyQuery || availabilityQuery
                  ? 'Prueba otra ciudad, otro gremio o limpia la disponibilidad para ver toda la vidriera.'
                  : 'Para aparecer, deben confirmar publicación y cargar dirección o zona de trabajo.'}
              </p>
            </section>
          ) : (
            <section id="vidriera-listado" className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Listado completo</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">Técnicos visibles en vidriera</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/72">
                    Si prefieres comparar uno debajo del otro, aquí tienes el listado expandido con likes, rubros y acceso al perfil.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                    Tecnicos visibles: {filteredProfiles.length}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                    Con ubicación en mapa: {mapPoints.length}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                    Con horario: {workingHoursConfiguredCount}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((profile) => {
                const displayName = profile.business_name || profile.full_name || 'Técnico UrbanFix';
                const specialties = parseDelimitedValues(profile.specialties).slice(0, 5);
                const likesCount = Math.max(0, Number(profile.public_likes_count || 0));
                const profileHref = buildTechnicianPath(profile.id, displayName);
                const profileCode = profile.id.slice(0, 8).toUpperCase();
                const hasExactLocation = Number.isFinite(Number(profile.service_lat)) && Number.isFinite(Number(profile.service_lng));
                const availability = getProfileAvailability(profile, selectedCountry);

                return (
                  <article
                    key={profile.id}
                    className="group rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.09] to-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_20px_45px_-30px_rgba(0,0,0,0.85)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/[0.06]">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Foto técnica" className="h-full w-full object-cover" />
                        ) : profile.company_logo_url ? (
                          <img src={profile.company_logo_url} alt="Logo técnico" className="h-full w-full object-contain p-1.5" />
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
                            {hasExactLocation ? 'Ubicación verificada' : 'Zona estimada'}
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

          {/* MAPA INTERACTIVO */}
          {mapPoints.length > 0 && (
            <section className="mt-12">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Visualización geográfica</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-[2rem]">Mapa de Cobertura</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/72">
                    Observa la ubicación de nuestros técnicos y sus zonas de cobertura en el mapa interactivo.
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/[0.03] overflow-hidden" style={{ height: '600px' }}>
                <PublicTechniciansMap
                  points={mapPoints}
                  selectedCountry={selectedCountry}
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
