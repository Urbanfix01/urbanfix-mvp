import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../components/PublicTopNav';
import { buildTechnicianPath, extractProfileId, isUuid } from '../../../lib/seo/technician-profile';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanfixar.com').replace(/\/+$/, '');

type PublicTechnicianProfile = {
  id: string;
  access_granted: boolean | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  coverage_area: string | null;
  specialties: string | null;
  avatar_url: string | null;
  company_logo_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  public_rating: number | null;
  public_reviews_count: number | null;
  completed_jobs_total: number | null;
  references_summary: string | null;
  client_recommendations: string | null;
  achievement_badges: string[] | null;
  public_likes_count: number | null;
};

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseBadgeArray = (value: string[] | null | undefined) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

const splitTextLines = (value: string | null | undefined) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

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

const normalizeSocialUrl = (value: string | null | undefined) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const prefixed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(prefixed).toString();
  } catch {
    return raw;
  }
};

const toSafeSocialUrl = (value: string | null | undefined) => {
  const normalized = normalizeSocialUrl(value);
  if (!normalized) return '';
  try {
    return new URL(normalized).toString();
  } catch {
    return '';
  }
};

const buildFacebookTimelineEmbedUrl = (value: string | null | undefined) => {
  const url = toSafeSocialUrl(value);
  if (!url) return '';
  return `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
    url
  )}&tabs=timeline&width=500&height=460&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
};

const buildInstagramEmbedUrl = (value: string | null | undefined) => {
  const normalized = toSafeSocialUrl(value);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('instagram.com')) return '';
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/') return '';
    if (/\/(p|reel|tv)\//i.test(cleanPath)) {
      return `https://www.instagram.com${cleanPath}/embed`;
    }
    const handle = cleanPath.split('/').filter(Boolean)[0];
    if (!handle) return '';
    return `https://www.instagram.com/${handle}/embed`;
  } catch {
    return '';
  }
};

const toAbsoluteUrl = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return `${SITE_ORIGIN}/icon-48.png`;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${SITE_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

const toOptionalAbsoluteUrl = (value: string | null | undefined) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${SITE_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

const buildTechnicianUrl = (profileId: string, displayName: string) =>
  `${SITE_ORIGIN}${buildTechnicianPath(profileId, displayName)}`;

const getPublicProfileById = async (profileId: string) => {
  if (!isUuid(profileId)) {
    return { data: null as PublicTechnicianProfile | null, error: 'Invalid profile id' };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null as PublicTechnicianProfile | null, error: 'Missing server config' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,access_granted,full_name,business_name,phone,city,coverage_area,specialties,avatar_url,company_logo_url,facebook_url,instagram_url,public_rating,public_reviews_count,completed_jobs_total,references_summary,client_recommendations,achievement_badges,public_likes_count'
    )
    .eq('id', profileId)
    .eq('access_granted', true)
    .maybeSingle();

  return {
    data: (data || null) as PublicTechnicianProfile | null,
    error: error?.message || '',
  };
};

const getSupabase = () => {
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolved = await params;
  const requestedSegment = String(resolved?.id || '').trim();
  const profileId = extractProfileId(requestedSegment);

  if (!profileId || !isUuid(profileId)) {
    return {
      title: 'Perfil tecnico | UrbanFix',
      description: 'Perfil tecnico publico en UrbanFix.',
      robots: { index: false, follow: true },
    };
  }

  const { data: profile } = await getPublicProfileById(profileId);
  if (!profile || !profile.access_granted) {
    return {
      title: 'Perfil tecnico | UrbanFix',
      description: 'Perfil tecnico publico en UrbanFix.',
      robots: { index: false, follow: true },
    };
  }

  const displayName = String(profile.business_name || profile.full_name || 'Tecnico UrbanFix').trim();
  const city = String(profile.city || '').trim();
  const specialties = parseDelimitedValues(profile.specialties).slice(0, 3);
  const titleParts = [displayName, city ? `Tecnico en ${city}` : '', 'UrbanFix'].filter(Boolean);
  const descriptionParts = [
    `${displayName}${city ? ` (${city})` : ''}.`,
    specialties.length > 0 ? `Rubros: ${specialties.join(', ')}.` : '',
    'Perfil profesional publico en UrbanFix.',
  ].filter(Boolean);
  const canonicalUrl = buildTechnicianUrl(profile.id, displayName);
  const imageUrl = toAbsoluteUrl(profile.avatar_url || profile.company_logo_url || '/icon-48.png');

  return {
    title: titleParts.join(' | '),
    description: descriptionParts.join(' '),
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'profile',
      title: titleParts.join(' | '),
      description: descriptionParts.join(' '),
      url: canonicalUrl,
      images: [{ url: imageUrl }],
      locale: 'es_AR',
      siteName: 'UrbanFix',
    },
    twitter: {
      card: 'summary_large_image',
      title: titleParts.join(' | '),
      description: descriptionParts.join(' '),
      images: [imageUrl],
    },
  };
}

export default async function TechnicianPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const requestedSegment = String(resolved?.id || '').trim();
  const profileId = extractProfileId(requestedSegment);
  if (!profileId || !isUuid(profileId)) {
    notFound();
  }
  const supabase = getSupabase();

  if (!supabase) {
    return (
      <div className={sora.className}>
        <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
          <PublicTopNav activeHref="/vidriera" sticky />
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
              <h1 className="text-2xl font-semibold text-white">Perfil no disponible</h1>
              <p className="mt-2 text-sm text-white/80">Falta configurar variables de Supabase en el deploy.</p>
              <Link
                href="/vidriera"
                className="mt-5 inline-flex rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Volver a vidriera
              </Link>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,access_granted,full_name,business_name,phone,city,coverage_area,specialties,avatar_url,company_logo_url,facebook_url,instagram_url,public_rating,public_reviews_count,completed_jobs_total,references_summary,client_recommendations,achievement_badges,public_likes_count'
    )
    .eq('id', profileId)
    .eq('access_granted', true)
    .maybeSingle();

  if (error) {
    return (
      <div className={sora.className}>
        <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
          <PublicTopNav activeHref="/vidriera" sticky />
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-rose-300/35 bg-rose-500/10 p-8 text-center">
              <h1 className="text-2xl font-semibold text-white">No pudimos abrir el perfil</h1>
              <p className="mt-2 text-sm text-rose-100">{error.message || 'Error inesperado.'}</p>
              <Link
                href="/vidriera"
                className="mt-5 inline-flex rounded-full border border-rose-300/45 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-200 hover:text-white"
              >
                Volver a vidriera
              </Link>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const profile = (data || null) as PublicTechnicianProfile | null;
  if (!profile || !profile.access_granted) {
    notFound();
  }

  const displayName = profile.business_name || profile.full_name || 'Tecnico UrbanFix';
  const displayInitial = displayName.slice(0, 1).toUpperCase();
  const specialties = parseDelimitedValues(profile.specialties).slice(0, 12);
  const recommendations = splitTextLines(profile.client_recommendations).slice(0, 5);
  const badges = parseBadgeArray(profile.achievement_badges).slice(0, 8);
  const likesCount = Math.max(0, Number(profile.public_likes_count || 0));
  const rating = Number(profile.public_rating || 0);
  const reviewsCount = Math.max(0, Number(profile.public_reviews_count || 0));
  const completedJobsRaw = Number(profile.completed_jobs_total);
  const completedJobs = Number.isFinite(completedJobsRaw) && completedJobsRaw > 0 ? completedJobsRaw : 3;
  const whatsappLink = buildWhatsappLink(profile.phone);
  const presentationText =
    String(profile.references_summary || '').trim() ||
    'Profesional activo en UrbanFix. Disponible para coordinar visitas, presupuestos y ejecucion de trabajos por rubro.';
  const heroSummary =
    presentationText.length > 150 ? `${presentationText.slice(0, 147).trimEnd()}...` : presentationText;
  const profileCode = profile.id.slice(0, 8).toUpperCase();
  const canonicalPath = buildTechnicianPath(profile.id, displayName);
  const canonicalSegment = canonicalPath.split('/').pop() || '';
  if (requestedSegment.toLowerCase() !== canonicalSegment.toLowerCase()) {
    permanentRedirect(canonicalPath);
  }
  const avatarImageUrl = toOptionalAbsoluteUrl(profile.avatar_url || profile.company_logo_url);
  const companyBannerUrl = toOptionalAbsoluteUrl(profile.company_logo_url || profile.avatar_url);
  const profileHref = canonicalPath;
  const canonicalUrl = buildTechnicianUrl(profile.id, displayName);
  const socialLinks = [
    { label: 'Facebook', href: profile.facebook_url },
    { label: 'Instagram', href: profile.instagram_url },
  ].filter((entry) => Boolean(entry.href));
  const facebookFeedEmbedUrl = buildFacebookTimelineEmbedUrl(profile.facebook_url);
  const instagramPostEmbedUrl = buildInstagramEmbedUrl(profile.instagram_url);
  const sameAs = socialLinks.map((entry) => String(entry.href || '').trim()).filter(Boolean);
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    url: canonicalUrl,
    jobTitle: 'Tecnico',
    address: profile.city
      ? {
          '@type': 'PostalAddress',
          addressLocality: profile.city,
          addressCountry: 'AR',
        }
      : undefined,
    areaServed: profile.coverage_area || profile.city || 'Argentina',
    telephone: profile.phone || undefined,
    knowsAbout: specialties.length > 0 ? specialties : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    description: presentationText,
  };

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <PublicTopNav activeHref="/vidriera" sticky />

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,143,31,0.14),transparent_45%),radial-gradient(circle_at_88%_22%,rgba(87,36,128,0.38),transparent_48%)]" />
          <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#ff8f1f]/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-10 h-96 w-96 rounded-full bg-[#55207e]/35 blur-3xl" />

          <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[32px] border border-white/15 bg-white/[0.04] shadow-[0_35px_110px_-70px_rgba(0,0,0,1)]">
              <div className="relative h-44 sm:h-56 lg:h-64">
                {companyBannerUrl ? (
                  <>
                    <img src={companyBannerUrl} alt={`Banner de ${displayName}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,0,47,0.9)_0%,rgba(33,0,47,0.72)_40%,rgba(33,0,47,0.88)_100%)]" />
                  </>
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,rgba(255,143,31,0.35),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.28),transparent_40%),linear-gradient(120deg,#240033_0%,#2a0541_45%,#1d012a_100%)]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,0,47,0.04)_0%,rgba(33,0,47,0.82)_100%)]" />
                <span className="absolute left-5 top-5 rounded-full border border-white/25 bg-black/25 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-white/90">
                  Perfil verificado: {profileCode}
                </span>
              </div>

              <div className="relative -mt-16 px-5 pb-6 sm:-mt-20 sm:px-8 sm:pb-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4 sm:gap-5">
                    <div className="h-28 w-28 overflow-hidden rounded-3xl border border-white/35 bg-[#2a0640] shadow-[0_20px_60px_-28px_rgba(0,0,0,0.95)] ring-4 ring-[#ff8f1f]/35 sm:h-36 sm:w-36">
                      {avatarImageUrl ? (
                        <img src={avatarImageUrl} alt={`Foto de ${displayName}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/90">
                          {displayInitial}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 pb-1">
                      <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{displayName}</h1>
                      {profile.full_name && profile.full_name !== displayName && (
                        <p className="text-sm text-white/80">{profile.full_name}</p>
                      )}
                    </div>
                  </div>

                  {profile.city && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-white/90">
                        Zona: {profile.city}
                      </span>
                    </div>
                  )}
                </div>

                <p className="max-w-3xl text-sm leading-relaxed text-white/85">{heroSummary}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={profileHref}
                    className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Link del perfil
                  </Link>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Reputacion</p>
                <p className="mt-2 text-2xl font-semibold text-white">{rating > 0 ? rating.toFixed(1) : '-'}</p>
                <p className="mt-1 text-xs text-white/70">Puntaje promedio</p>
              </article>
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Resenas</p>
                <p className="mt-2 text-2xl font-semibold text-white">{reviewsCount}</p>
                <p className="mt-1 text-xs text-white/70">Opiniones de clientes</p>
              </article>
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Trabajos</p>
                <p className="mt-2 text-2xl font-semibold text-white">{completedJobs}</p>
                <p className="mt-1 text-xs text-white/70">Trabajos finalizados</p>
              </article>
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Me gusta</p>
                <p className="mt-2 text-2xl font-semibold text-white">{likesCount}</p>
                <p className="mt-1 text-xs text-white/70">Interacciones publicas</p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Carta de presentacion</p>
                <p className="mt-3 text-sm leading-relaxed text-white/85">{presentationText}</p>

                {recommendations.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {recommendations.map((item, index) => (
                      <li
                        key={`${index}-${item}`}
                        className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Rubros y especialidades</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialties.length > 0 ? (
                    specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/85"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/65">
                      Sin rubros cargados
                    </span>
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Zona de trabajo</p>
                <p className="mt-3 text-sm text-white/85">{profile.coverage_area || 'Sin cobertura detallada.'}</p>
                {profile.city && <p className="mt-2 text-xs text-white/70">Ciudad base: {profile.city}</p>}
              </article>

              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Redes y contacto</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialLinks.length > 0 ? (
                    socialLinks.map((entry) => (
                      <a
                        key={entry.label}
                        href={String(entry.href || '')}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                      >
                        {entry.label}
                      </a>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/65">
                      Sin redes cargadas
                    </span>
                  )}
                  <Link
                    href={profileHref}
                    className="rounded-full border border-[#ff8f1f]/65 bg-[#ff8f1f]/10 px-4 py-2 text-xs font-semibold text-[#ffd6a6] transition hover:border-[#ff8f1f] hover:text-[#ffe2bf]"
                  >
                    URL unica del perfil
                  </Link>
                </div>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Ultimas publicaciones Facebook</p>
                {facebookFeedEmbedUrl ? (
                  <iframe
                    title="Publicaciones Facebook del tecnico"
                    src={facebookFeedEmbedUrl}
                    className="mt-4 h-[360px] w-full rounded-2xl border-0 bg-white"
                    loading="lazy"
                    allow="encrypted-media"
                  />
                ) : (
                  <p className="mt-4 text-sm text-white/70">
                    Este tecnico aun no configuro su pagina de Facebook para mostrar posteos.
                  </p>
                )}
              </article>

              <article className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Ultimas publicaciones Instagram</p>
                {instagramPostEmbedUrl ? (
                  <iframe
                    title="Publicaciones Instagram del tecnico"
                    src={instagramPostEmbedUrl}
                    className="mt-4 h-[360px] w-full rounded-2xl border-0 bg-white"
                    loading="lazy"
                    allow="encrypted-media"
                  />
                ) : (
                  <p className="mt-4 text-sm text-white/70">
                    Este tecnico aun no cargo un link de Instagram (idealmente post o reel) para mostrar.
                  </p>
                )}
              </article>
            </section>

            {badges.length > 0 && (
              <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Insignias</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-[#ff8f1f]/55 bg-[#ff8f1f]/12 px-3 py-1 text-xs text-[#ffd6a6]"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
