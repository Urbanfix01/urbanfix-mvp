import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../components/PublicTopNav';
import ProfileLikeButton from '../../../components/profile/ProfileLikeButton';
import { buildTechnicianPath, extractProfileId, isUuid } from '../../../lib/seo/technician-profile';
import {
  ARGENTINA_TIMEZONE,
  formatWorkingHoursLabel,
  isNowWithinWorkingHours,
  parseWorkingHoursConfig,
} from '../../api/_shared/marketplace';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanfix.com.ar').replace(/\/+$/, '');

type PublicTechnicianProfile = {
  id: string;
  access_granted: boolean | null;
  profile_published: boolean | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  coverage_area: string | null;
  working_hours?: string | null;
  specialties: string | null;
  avatar_url?: string | null;
  company_logo_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  public_rating?: number | null;
  public_reviews_count?: number | null;
  completed_jobs_total?: number | null;
  references_summary?: string | null;
  client_recommendations?: string | null;
  achievement_badges?: string[] | null;
  public_likes_count?: number | null;
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

const formatArgentinaTimeLabel = (now = new Date()) =>
  new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ARGENTINA_TIMEZONE,
  }).format(now);

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
      'id,access_granted,profile_published,full_name,business_name,phone,city,coverage_area,specialties,created_at'
    )
    .eq('id', profileId)
    .eq('access_granted', true)
    .eq('profile_published', true)
    .maybeSingle();

  return {
    data: (data || null) as PublicTechnicianProfile | null,
    error: error?.message || '',
  };
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
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
  if (!profile || !profile.access_granted || !profile.profile_published) {
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
      'id,access_granted,profile_published,full_name,business_name,phone,city,coverage_area,specialties,created_at'
    )
    .eq('id', profileId)
    .eq('access_granted', true)
    .eq('profile_published', true)
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
  if (!profile || !profile.access_granted || !profile.profile_published) {
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
  const hasRating = Number.isFinite(rating) && rating > 0;
  const hasReviews = Number.isFinite(reviewsCount) && reviewsCount > 0;
  const hasCompletedJobs = Number.isFinite(completedJobsRaw) && completedJobsRaw > 0;
  const completedJobsLabel = hasCompletedJobs ? completedJobsRaw.toString() : 'No informado';
  const hasWorkingHoursConfigured = Boolean(String(profile.working_hours || '').trim());
  const workingHoursConfig = parseWorkingHoursConfig(profile.working_hours || '');
  const workingHoursLabel = hasWorkingHoursConfigured ? formatWorkingHoursLabel(workingHoursConfig) : 'Horario a coordinar';
  const isWithinWorkingHours = hasWorkingHoursConfigured ? isNowWithinWorkingHours(workingHoursConfig) : false;
  const availabilityLabel = hasWorkingHoursConfigured
    ? isWithinWorkingHours
      ? 'Disponible ahora'
      : 'Fuera de horario'
    : 'A coordinar';
  const argentinaTimeLabel = formatArgentinaTimeLabel();
  const whatsappLink = buildWhatsappLink(profile.phone);
  const presentationText =
    String(profile.references_summary || '').trim() ||
    'Perfil publico de UrbanFix. Este profesional aun no cargo una presentacion detallada.';
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
  const canonicalUrl = buildTechnicianUrl(profile.id, displayName);
  const socialLinks = [
    { label: 'Facebook', href: profile.facebook_url },
    { label: 'Instagram', href: profile.instagram_url },
  ].filter((entry) => Boolean(entry.href));
  const facebookFeedEmbedUrl = buildFacebookTimelineEmbedUrl(profile.facebook_url);
  const instagramPostEmbedUrl = buildInstagramEmbedUrl(profile.instagram_url);
  const sameAs = socialLinks.map((entry) => String(entry.href || '').trim()).filter(Boolean);
  const ratingLabel = hasRating ? rating.toFixed(1) : 'Sin calificar';
  const availabilityToneClass = hasWorkingHoursConfigured
    ? isWithinWorkingHours
      ? 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-300/25'
      : 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-300/25'
    : 'bg-white/10 text-white/75 ring-1 ring-white/10';
  const heroPills = [
    profile.city ? `Zona base: ${profile.city}` : '',
    profile.coverage_area ? `Cobertura activa` : '',
    specialties.length > 0 ? `${specialties.length} rubros cargados` : '',
  ].filter(Boolean);
  const metricCards = [
    {
      label: 'Reputacion',
      value: ratingLabel,
      detail: hasRating ? 'Puntaje promedio visible al publico' : 'Aun sin calificacion publica registrada',
      accent: 'from-[#ffb45c]/18 to-[#ff8f1f]/6',
    },
    {
      label: 'Resenas',
      value: reviewsCount.toString(),
      detail: hasReviews ? 'Opiniones visibles de clientes' : 'Aun no hay resenas publicas',
      accent: 'from-white/[0.10] to-white/[0.03]',
    },
    {
      label: 'Trabajos',
      value: completedJobsLabel,
      detail: hasCompletedJobs ? 'Trabajos completados informados en el perfil' : 'Este perfil todavia no informa trabajos completados',
      accent: 'from-[#8b5cf6]/16 to-[#3b1b62]/10',
    },
    {
      label: 'Me gusta',
      value: likesCount.toString(),
      detail: likesCount > 0 ? 'Interacciones publicas registradas' : 'Aun no hay me gusta registrados',
      accent: 'from-[#f97316]/16 to-[#431407]/10',
    },
  ];
  const profileSignals = [
    {
      label: 'Zona de trabajo',
      value: profile.coverage_area || profile.city || 'Sin zona detallada',
      note: profile.city ? `Ciudad base: ${profile.city}` : 'Conviene completar zona y ciudad para mejorar alcance.',
    },
    {
      label: 'Disponibilidad',
      value: availabilityLabel,
      note: `${workingHoursLabel}. Hora local Argentina: ${argentinaTimeLabel}`,
    },
    {
      label: 'Canales publicos',
      value: socialLinks.length > 0 ? `${socialLinks.length} canal(es) activos` : 'Sin canales sociales publicados',
      note: whatsappLink ? 'Tiene WhatsApp visible para contacto rapido.' : 'No hay un canal directo publicado por el momento.',
    },
  ];
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

              <div className="relative -mt-16 grid gap-5 px-5 pb-6 sm:-mt-20 sm:px-8 sm:pb-8 lg:grid-cols-[minmax(0,1.18fr)_320px]">
                <div className="ufx-tech-card ufx-tech-card--soft space-y-5 p-5 sm:p-6">
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
                    <div className="min-w-0 flex-1 space-y-3 pb-1">
                      <div className="space-y-1">
                        <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{displayName}</h1>
                        {profile.full_name && profile.full_name !== displayName && (
                          <p className="text-sm text-white/80">{profile.full_name}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 font-semibold text-white/90">
                          Codigo publico: {profileCode}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${availabilityToneClass}`}>
                          {availabilityLabel}
                        </span>
                        {heroPills.map((pill) => (
                          <span
                            key={pill}
                            className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-white/78"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="max-w-3xl text-base leading-relaxed text-white/88 sm:text-[1.05rem]">{heroSummary}</p>
                    <p className="max-w-3xl text-sm leading-7 text-white/66">
                      Perfil publico de UrbanFix con datos de contacto, zona de trabajo y especialidades declaradas por el profesional.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {specialties.length > 0 ? (
                      specialties.slice(0, 8).map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/85"
                        >
                          {specialty}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/65">
                        Especialidades no informadas
                      </span>
                    )}
                  </div>
                </div>

                <aside className="ufx-tech-card ufx-tech-card--accent flex flex-col gap-4 p-5 sm:p-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffd6a6]">Contacto rapido</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Listo para coordinar</h2>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Canal directo para consultar disponibilidad, pedir presupuesto o iniciar una visita.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex w-full items-center justify-center rounded-full bg-[#ff8f1f] px-4 py-3 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                      >
                        Contactar por WhatsApp
                      </a>
                    ) : null}
                    <Link
                      href="/vidriera"
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/30 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Volver a la vidriera
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-white/12 bg-black/20 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">URL publica</p>
                    <p className="mt-3 break-all text-sm leading-6 text-white/84">{canonicalUrl}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-3xl border border-white/12 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Likes</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{likesCount}</p>
                      <div className="mt-3">
                        <ProfileLikeButton profileId={profile.id} initialCount={likesCount} compact />
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/12 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Canales activos</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {socialLinks.length > 0 ? (
                          socialLinks.map((entry) => (
                            <a
                              key={entry.label}
                              href={String(entry.href || '')}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/88 transition hover:border-white hover:text-white"
                            >
                              {entry.label}
                            </a>
                          ))
                        ) : (
                          <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/65">
                            Sin canales sociales publicados
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((item) => (
                <article
                  key={item.label}
                  className={`ufx-tech-card p-4 bg-gradient-to-br ${item.accent}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">{item.detail}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <article className="ufx-tech-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Carta de presentacion</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Presentacion del perfil</h2>
                  </div>
                  <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs font-semibold text-white/75">
                    Perfil publico UrbanFix
                  </span>
                </div>
                <p className="mt-4 text-sm leading-8 text-white/84">{presentationText}</p>

                {recommendations.length > 0 && (
                  <div className="mt-5 grid gap-3">
                    {recommendations.map((item, index) => (
                      <article
                        key={`${index}-${item}`}
                        className="rounded-3xl border border-white/10 bg-black/20 p-4"
                      >
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[#ffd6a6]">Referencia {index + 1}</p>
                        <p className="mt-3 text-sm leading-7 text-white/82">{item}</p>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <div className="grid gap-4">
                <article className="ufx-tech-card p-5 sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Rubros y especialidades</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Especialidades declaradas</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {specialties.length > 0 ? (
                      specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/85"
                        >
                          {specialty}
                        </span>
                      ))
                    ) : (
                      <span
                        className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/65"
                      >
                        Especialidades no informadas
                      </span>
                    )}
                  </div>
                </article>

                {badges.length > 0 && (
                  <article className="ufx-tech-card ufx-tech-card--soft p-5 sm:p-6">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Insignias</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Senales de confianza</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-[#ff8f1f]/55 bg-[#ff8f1f]/12 px-3 py-1.5 text-xs font-medium text-[#ffd6a6]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </article>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profileSignals.map((item) => (
                <article key={item.label} className="ufx-tech-card p-5 sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">{item.label}</p>
                  <p className="mt-3 text-lg font-semibold leading-7 text-white">{item.value}</p>
                  <p className="mt-3 text-sm leading-6 text-white/70">{item.note}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className="ufx-tech-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Actividad publica</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Facebook</h2>
                  </div>
                  <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs font-semibold text-white/75">
                    {facebookFeedEmbedUrl ? 'Feed activo' : 'No configurado'}
                  </span>
                </div>
                {facebookFeedEmbedUrl ? (
                  <iframe
                    title="Publicaciones Facebook del tecnico"
                    src={facebookFeedEmbedUrl}
                    className="mt-4 h-[360px] w-full rounded-[24px] border-0 bg-white"
                    loading="lazy"
                    allow="encrypted-media"
                  />
                ) : (
                  <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/70">
                    Este perfil todavia no publico una pagina de Facebook para mostrar actividad.
                  </div>
                )}
              </article>

              <article className="ufx-tech-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Actividad publica</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Instagram</h2>
                  </div>
                  <span className="rounded-full border border-white/12 bg-black/20 px-3 py-1 text-xs font-semibold text-white/75">
                    {instagramPostEmbedUrl ? 'Post activo' : 'No configurado'}
                  </span>
                </div>
                {instagramPostEmbedUrl ? (
                  <iframe
                    title="Publicaciones Instagram del tecnico"
                    src={instagramPostEmbedUrl}
                    className="mt-4 h-[360px] w-full rounded-[24px] border-0 bg-white"
                    loading="lazy"
                    allow="encrypted-media"
                  />
                ) : (
                  <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/70">
                    Este perfil todavia no publico un enlace de Instagram para mostrar actividad reciente.
                  </div>
                )}
              </article>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
