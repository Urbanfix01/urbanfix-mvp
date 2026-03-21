import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import { createClient } from '@supabase/supabase-js';
import PublicTechniciansMap, { type PublicTechnicianMapPoint } from '../../../components/public/PublicTechniciansMap';
import ProfileLikeButton from '../../../components/profile/ProfileLikeButton';
import PublicTopNav from '../../../components/PublicTopNav';
import {
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
} from '../../api/_shared/marketplace';
import {
  matchesArgentinaZoneQuery,
  resolveArgentinaZoneCoords,
  toFiniteCoordinate,
} from '../../../lib/geo/argentina-zone-presets';
import { buildTechnicianPath } from '../../../lib/seo/technician-profile';
import { ciudades, ciudadSlugs, type CiudadKey } from '../../../lib/seo/urbanfix-data';

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
  address: string | null;
  company_address: string | null;
  city: string | null;
  coverage_area: string | null;
  working_hours: string | null;
  service_lat: number | null;
  service_lng: number | null;
  service_radius_km: number | null;
  specialties: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  public_likes_count: number | null;
  public_rating: number | null;
  public_reviews_count: number | null;
  completed_jobs_total: number | null;
};

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const hasMeaningfulCoverageArea = (value: string | null | undefined) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes('tu ciudad base');
};

const hasWorkZoneConfigured = (profile: PublishedProfileRow) =>
  Boolean(
    String(profile.city || '').trim() ||
      String(profile.address || '').trim() ||
      String(profile.company_address || '').trim() ||
      hasMeaningfulCoverageArea(profile.coverage_area)
  );

const buildWhatsappLink = (phone: string | null | undefined) => {
  const raw = String(phone || '').replace(/\D/g, '');
  if (!raw) return '';
  let normalized = raw;
  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (!normalized.startsWith('54')) {
    if (normalized.startsWith('0')) normalized = normalized.slice(1);
    if (normalized.length === 11 && normalized.slice(2, 4) === '15') {
      normalized = `${normalized.slice(0, 2)}${normalized.slice(4)}`;
    }
    normalized = `54${normalized}`;
  }
  return `https://wa.me/${normalized}`;
};

const getPublicSupabaseClient = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export default async function VidrieraZonaPage({ params }: { params: Promise<{ zona: string }> }) {
  const { zona } = await params;
  const city = ciudades[zona as CiudadKey];
  if (!city) return notFound();

  const supabase = getPublicSupabaseClient();
  const zoneQuery = city.zoneQuery;

  if (!supabase) {
    return (
      <div className={sora.className}>
        <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
          <PublicTopNav activeHref="/vidriera" sticky />
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

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,access_granted,profile_published,full_name,business_name,phone,address,company_address,city,coverage_area,working_hours,service_lat,service_lng,service_radius_km,specialties,company_logo_url,avatar_url,facebook_url,instagram_url,public_likes_count,public_rating,public_reviews_count,completed_jobs_total'
    )
    .eq('access_granted', true)
    .eq('profile_published', true)
    .order('public_likes_count', { ascending: false, nullsFirst: false })
    .limit(240);

  const profiles = (data || []) as PublishedProfileRow[];
  const safeProfiles = profiles.filter((row) => row.access_granted && row.profile_published && hasWorkZoneConfigured(row));
  const filteredProfiles = safeProfiles.filter((profile) =>
    matchesArgentinaZoneQuery(zoneQuery, profile.city, profile.coverage_area, profile.address, profile.company_address)
  );
  const totalLikes = filteredProfiles.reduce((acc, profile) => acc + Math.max(0, Number(profile.public_likes_count || 0)), 0);
  const whatsappEnabledCount = filteredProfiles.filter((profile) => Boolean(buildWhatsappLink(profile.phone))).length;
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
      const workingHours = parseWorkingHoursConfig(profile.working_hours || '');

      return {
        id: profile.id,
        name: displayName,
        profileHref: buildTechnicianPath(profile.id, displayName),
        whatsappHref: buildWhatsappLink(profile.phone),
        city: String(profile.city || fallbackCoords?.label || '').trim(),
        coverageArea: String(profile.coverage_area || '').trim(),
        specialties,
        lat,
        lng,
        radiusKm: Math.max(1, Math.round(Number(profile.service_radius_km || DEFAULT_MATCH_RADIUS_KM))),
        precision: exactLat !== null && exactLng !== null ? 'exact' : 'approx',
        openNow: isNowWithinWorkingHours(workingHours),
        workingHoursLabel: formatWorkingHoursLabel(workingHours),
        likesCount: Math.max(0, Number(profile.public_likes_count || 0)),
        rating: Number.isFinite(Number(profile.public_rating)) ? Number(profile.public_rating) : null,
        reviewsCount: Math.max(0, Number(profile.public_reviews_count || 0)),
        completedJobsTotal: Math.max(0, Number(profile.completed_jobs_total || 0)),
        avatarUrl: String(profile.avatar_url || '').trim(),
        companyLogoUrl: String(profile.company_logo_url || '').trim(),
      } satisfies PublicTechnicianMapPoint;
    })
    .filter((point): point is PublicTechnicianMapPoint => Boolean(point));

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

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
        <PublicTopNav activeHref="/vidriera" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{city.region}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Tecnicos disponibles en {city.name}</h1>
            <p className="mt-4 max-w-3xl text-sm text-white/80">
              Pagina estable para Google y para usuarios que buscan tecnicos publicados en {city.name}. Cruza mapa,
              perfiles publicos y cobertura operativa desde la vidriera de UrbanFix.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                Tecnicos visibles: {filteredProfiles.length}
              </span>
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                Total de likes: {totalLikes}
              </span>
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                Con WhatsApp: {whatsappEnabledCount}
              </span>
              <Link
                href="/vidriera"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Volver a vidriera
              </Link>
              <Link
                href={`/ciudades/${zona}`}
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver pagina de {city.name}
              </Link>
            </div>
          </section>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-300/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              No pudimos cargar la vidriera en este momento.
            </div>
          )}

          {mapPoints.length > 0 && <PublicTechniciansMap points={mapPoints} preferUserLocation={false} />}

          {filteredProfiles.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-semibold text-white">Aun no encontramos tecnicos visibles para {city.name}.</p>
              <p className="mt-2 text-sm text-white/70">
                La zona ya quedo lista como ruta indexable. Cuando haya perfiles publicados, esta pagina los mostrara.
              </p>
            </section>
          ) : (
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProfiles.map((profile) => {
                const displayName = profile.business_name || profile.full_name || 'Tecnico UrbanFix';
                const specialties = parseDelimitedValues(profile.specialties).slice(0, 5);
                const socialCount = [profile.facebook_url, profile.instagram_url].filter(Boolean).length;
                const likesCount = Math.max(0, Number(profile.public_likes_count || 0));
                const whatsappLink = buildWhatsappLink(profile.phone);
                const profileHref = buildTechnicianPath(profile.id, displayName);
                const profileCode = profile.id.slice(0, 8).toUpperCase();

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
                          {socialCount > 0 && (
                            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-white/90">
                              Redes: {socialCount}
                            </span>
                          )}
                          <span className="rounded-full border border-[#ff8f1f]/60 bg-[#ff8f1f]/15 px-2.5 py-1 text-[#ffd6a6]">
                            Likes: {likesCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {profile.coverage_area && (
                      <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80">
                        Cobertura: {profile.coverage_area}
                      </p>
                    )}

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
                        className="rounded-full bg-[#ff8f1f] px-3 py-1.5 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                      >
                        Ir al perfil
                      </Link>
                      <ProfileLikeButton profileId={profile.id} initialCount={likesCount} compact />
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-full border border-white/35 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
