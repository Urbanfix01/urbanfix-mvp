import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { createClient } from '@supabase/supabase-js';
import PublicTechniciansMap, { type PublicTechnicianMapPoint } from '../../components/public/PublicTechniciansMap';
import ProfileLikeButton from '../../components/profile/ProfileLikeButton';
import PublicTopNav from '../../components/PublicTopNav';
import {
  getArgentinaZoneSearchOptions,
  matchesArgentinaZoneQuery,
  resolveArgentinaZoneCoords,
  toFiniteCoordinate,
} from '../../lib/geo/argentina-zone-presets';
import { buildTechnicianPath } from '../../lib/seo/technician-profile';
import {
  DEFAULT_MATCH_RADIUS_KM,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
} from '../api/_shared/marketplace';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Vidriera de Tecnicos | UrbanFix',
  description: 'Explora tecnicos publicados, rubros y cobertura para solicitar tu trabajo.',
  alternates: {
    canonical: '/vidriera',
  },
};

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

type VidrieraSearchParams = {
  zona?: string | string[] | undefined;
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

const buildProfileZoneText = (profile: PublishedProfileRow) =>
  [profile.city, profile.coverage_area, profile.address, profile.company_address].filter(Boolean).join(' ');

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

export const dynamic = 'force-dynamic';

export default async function VidrieraPage({ searchParams }: VidrieraPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const zonaQueryRaw = Array.isArray(resolvedSearchParams.zona)
    ? resolvedSearchParams.zona[0] || ''
    : resolvedSearchParams.zona || '';
  const zonaQuery = String(zonaQueryRaw || '').trim();
  const zonaQueryNormalized = normalizeSearchText(zonaQuery);

  const supabase = getPublicSupabaseClient();

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
  const filteredProfiles = zonaQueryNormalized
    ? safeProfiles.filter((profile) =>
        matchesArgentinaZoneQuery(
          zonaQuery,
          profile.city,
          profile.coverage_area,
          profile.address,
          profile.company_address
        )
      )
    : safeProfiles;
  const migrationMissing =
    String(error?.message || '')
      .toLowerCase()
      .includes('profile_published') ||
    String(error?.message || '')
      .toLowerCase()
      .includes('facebook_url') ||
    String(error?.message || '')
      .toLowerCase()
      .includes('instagram_url');
  const whatsappEnabledCount = safeProfiles.filter((profile) => Boolean(buildWhatsappLink(profile.phone))).length;
  const totalLikes = safeProfiles.reduce((acc, profile) => acc + Math.max(0, Number(profile.public_likes_count || 0)), 0);
  const zonaOptions = Array.from(
    new Set([
      ...safeProfiles
        .map((profile) => String(profile.city || profile.coverage_area || '').trim())
        .filter(Boolean),
      ...getArgentinaZoneSearchOptions(),
    ])
  ).sort((a, b) => a.localeCompare(b, 'es'));
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

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/vidriera" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Tecnicos disponibles</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Vidriera de tecnicos disponibles</h1>
            <p className="mt-4 max-w-3xl text-sm text-white/80">
              Solo mostramos tecnicos que confirmaron aparecer en vidriera y que cargaron direccion o zona de trabajo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                Tecnicos confirmados: {safeProfiles.length}
              </span>
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                Total de likes: {totalLikes}
              </span>
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/90">
                Con WhatsApp: {whatsappEnabledCount}
              </span>
              <Link
                href="/cliente"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ir a cliente
              </Link>
            </div>

            <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                name="zona"
                defaultValue={zonaQuery}
                list="vidriera-zonas"
                placeholder="Buscar por zona o ciudad (ej: Palermo, Cordoba, Zona Norte)"
                className="w-full rounded-2xl border border-white/25 bg-black/25 px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-[#ff8f1f] sm:max-w-xl"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                >
                  Buscar zona
                </button>
                {zonaQuery && (
                  <Link
                    href="/vidriera"
                    className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                  >
                    Limpiar
                  </Link>
                )}
              </div>
              <datalist id="vidriera-zonas">
                {zonaOptions.map((zone) => (
                  <option key={`zona-${zone}`} value={zone} />
                ))}
              </datalist>
            </form>

            <p className="mt-3 text-xs text-white/65">
              {zonaQuery
                ? `Mostrando ${filteredProfiles.length} tecnico(s) para la zona "${zonaQuery}".`
                : `Mostrando ${filteredProfiles.length} tecnico(s) en toda la vidriera.`}
            </p>
          </section>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-300/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {migrationMissing
                ? 'Falta migracion de perfil publico/redes en perfiles (profile_published, facebook_url, instagram_url).'
                : 'No pudimos cargar la vidriera en este momento.'}
            </div>
          )}

          {mapPoints.length > 0 && <PublicTechniciansMap points={mapPoints} />}

          {filteredProfiles.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
              <p className="text-lg font-semibold text-white">
                {zonaQuery ? 'No encontramos tecnicos para esa zona.' : 'Aun no hay tecnicos disponibles.'}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {zonaQuery
                  ? 'Prueba otra ciudad o zona, o limpia el buscador para ver toda la vidriera.'
                  : 'Para aparecer, deben confirmar publicacion y cargar direccion o zona de trabajo.'}
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
