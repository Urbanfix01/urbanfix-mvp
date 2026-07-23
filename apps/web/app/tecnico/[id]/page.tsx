import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Sora, Space_Grotesk } from 'next/font/google';
import { MapPinned, Star } from 'lucide-react';
import PublicTopNav from '../../../components/PublicTopNav';
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  WhatsAppBrandIcon,
} from '../../../components/profile/SocialContactIcons';
import ProfileLikeButton from '../../../components/profile/ProfileLikeButton';
import ProfileReviewComments from '../../../components/profile/ProfileReviewComments';
import ProfileShareActions from '../../../components/profile/ProfileShareActions';
import ProfileVisitCounter from '../../../components/profile/ProfileVisitCounter';
import { getServiceRoleClient } from '../../../lib/supabase/server';
import { buildTechnicianPath, extractProfileId, isUuid } from '../../../lib/seo/technician-profile';
import {
  PUBLIC_PROFILE_SELECT_FALLBACK,
  PUBLIC_PROFILE_SELECT_RICH,
  isMissingPublicProfileFieldError,
} from '../../../lib/public-profile-select';
import { isPublicProfileVisible } from '../../../lib/public-profile-validity';
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

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanfix.com.ar').replace(/\/+$/, '');

type PublicTechnicianProfile = {
  id: string;
  access_granted: boolean | null;
  profile_published: boolean | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  country?: string | null;
  city: string | null;
  coverage_area: string | null;
  service_city?: string | null;
  service_province?: string | null;
  service_district?: string | null;
  working_hours?: string | null;
  specialties: string | null;
  avatar_url?: string | null;
  company_logo_url?: string | null;
  banner_url?: string | null;
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

type PublicProfileReview = {
  id: string;
  source: 'verified' | 'profile';
  clientName: string;
  rating: number;
  comment: string;
  location: string;
  submittedAt: string;
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

const fetchPublicProfile = async (profileId: string) => {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null as PublicTechnicianProfile | null, error: 'Missing server config' };
  }

  let response = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT_RICH)
    .eq('id', profileId)
    .eq('access_granted', true)
    .or('profile_published.is.null,profile_published.eq.true')
    .maybeSingle();

  if (response.error && isMissingPublicProfileFieldError(String(response.error.message || ''))) {
    response = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_SELECT_FALLBACK)
      .eq('id', profileId)
      .eq('access_granted', true)
      .or('profile_published.is.null,profile_published.eq.true')
      .maybeSingle();
  }

  return {
    data: (response.data || null) as PublicTechnicianProfile | null,
    error: response.error?.message || '',
  };
};

const fetchTechnicianQuoteCount = async (profileId: string) => {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId);

  if (error) {
    console.error('Error loading public quote count:', error);
    return 0;
  }

  return Math.max(0, Number(count || 0));
};

const normalizeQuoteWorkStatus = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'accepted' || normalized === 'aprobado' || normalized === 'aprobada' || normalized === 'aprobados')
    return 'approved';
  if (normalized === 'programado' || normalized === 'programada' || normalized === 'agendado' || normalized === 'agendada')
    return 'scheduled';
  if (
    normalized === 'en_curso' ||
    normalized === 'en curso' ||
    normalized === 'en-proceso' ||
    normalized === 'en_proceso' ||
    normalized === 'en proceso'
  ) {
    return 'in_progress';
  }
  if (
    normalized === 'finalizado' ||
    normalized === 'finalizados' ||
    normalized === 'completado' ||
    normalized === 'completados'
  ) {
    return 'completed';
  }
  if (
    normalized === 'cobrado' ||
    normalized === 'cobrados' ||
    normalized === 'pagado' ||
    normalized === 'pagados' ||
    normalized === 'charged'
  ) {
    return 'paid';
  }
  return normalized;
};

const isAcceptedQuoteWorkStatus = (status?: string | null) => {
  const normalized = normalizeQuoteWorkStatus(status);
  return (
    normalized === 'approved' ||
    normalized === 'scheduled' ||
    normalized === 'in_progress' ||
    normalized === 'completed' ||
    normalized === 'paid'
  );
};

const fetchTechnicianAcceptedQuoteCount = async (profileId: string) => {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { data, error } = await supabase.from('quotes').select('id, status').eq('user_id', profileId);

  if (error) {
    console.error('Error loading accepted quote count:', error);
    return 0;
  }

  return (data || []).filter((quote) => isAcceptedQuoteWorkStatus(quote.status)).length;
};

const isMissingReviewsSource = (message: string) => {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('quote_feedback_reviews') ||
    lower.includes('profile_public_reviews') ||
    lower.includes('does not exist') ||
    lower.includes('schema cache')
  );
};

const isBroadReviewLocationPart = (value: string) => {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return (
    normalized === 'argentina' ||
    normalized === 'buenos aires' ||
    normalized === 'provincia de buenos aires' ||
    normalized === 'ciudad autonoma de buenos aires' ||
    normalized === 'caba'
  );
};

const resolveReviewLocationLabel = (address?: string | null, fallback?: string | null) => {
  const fallbackLabel = String(fallback || '').trim();
  const parts = String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const localParts = (parts.length > 1 ? parts.slice(1) : parts).filter((part) => !/\d/.test(part) && !isBroadReviewLocationPart(part));
  return localParts[0] || fallbackLabel;
};

const normalizePublicReview = (row: any, source: 'verified' | 'profile', fallbackLocation = ''): PublicProfileReview => ({
  id: `${source}:${String(row?.id || crypto.randomUUID())}`,
  source,
  clientName: String(row?.client_name || row?.visitor_name || '').trim() || 'Cliente UrbanFix',
  rating: Math.max(1, Math.min(5, Math.round(Number(row?.rating || 5)))),
  comment: String(row?.comment || '').trim(),
  location: String(row?.location_label || fallbackLocation || '').trim(),
  submittedAt: String(row?.submitted_at || row?.updated_at || ''),
});

const fetchTechnicianPublicReviews = async (profileId: string, fallbackLocation = '') => {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      reviews: [] as PublicProfileReview[],
      rating: null as number | null,
      reviewsCount: 0,
      hasAggregate: false,
    };
  }

  const verifiedResult = await supabase
    .from('quote_feedback_reviews')
    .select('id, quote_id, client_name, rating, comment, submitted_at, updated_at')
    .eq('technician_id', profileId)
    .eq('is_public', true)
    .order('submitted_at', { ascending: false })
    .limit(50);

  const profileResult = await supabase
    .from('profile_public_reviews')
    .select('id, visitor_name, rating, comment, submitted_at, updated_at')
    .eq('technician_id', profileId)
    .eq('is_public', true)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (verifiedResult.error && !isMissingReviewsSource(verifiedResult.error.message || '')) {
    console.error('Error loading verified profile reviews:', verifiedResult.error);
  }
  if (profileResult.error && !isMissingReviewsSource(profileResult.error.message || '')) {
    console.error('Error loading direct profile reviews:', profileResult.error);
  }

  const verifiedRows = verifiedResult.error ? [] : verifiedResult.data || [];
  const profileRows = profileResult.error ? [] : profileResult.data || [];
  const quoteIds = verifiedRows.map((row) => String(row?.quote_id || '').trim()).filter(Boolean);
  const quoteLocationMap = new Map<string, string>();

  if (quoteIds.length > 0) {
    const quotesResult = await supabase
      .from('quotes')
      .select('id, client_address, location_address')
      .in('id', quoteIds);

    if (quotesResult.error) {
      console.error('Error loading review quote locations:', quotesResult.error);
    } else {
      (quotesResult.data || []).forEach((quote) => {
        quoteLocationMap.set(
          String(quote.id),
          resolveReviewLocationLabel(quote.location_address || quote.client_address, fallbackLocation)
        );
      });
    }
  }

  const allReviews = [
    ...verifiedRows.map((row) => normalizePublicReview(row, 'verified', quoteLocationMap.get(String(row?.quote_id || '')) || fallbackLocation)),
    ...profileRows.map((row) => normalizePublicReview(row, 'profile', fallbackLocation)),
  ].filter((review) => Number.isFinite(review.rating) && review.rating >= 1);

  const reviewsCount = allReviews.length;
  const rating =
    reviewsCount > 0
      ? Number((allReviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount).toFixed(1))
      : null;
  const visibleReviews = allReviews
    .filter((review) => review.comment)
    .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
    .slice(0, 6);

  return {
    reviews: visibleReviews,
    rating,
    reviewsCount,
    hasAggregate: reviewsCount > 0,
  };
};

const getPublicProfileById = async (profileId: string) => {
  if (!isUuid(profileId)) {
    return { data: null as PublicTechnicianProfile | null, error: 'Invalid profile id' };
  }
  return fetchPublicProfile(profileId);
};

const getSupabase = () => {
  return getServiceRoleClient();
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolved = await params;
  const requestedSegment = String(resolved?.id || '').trim();
  const profileId = extractProfileId(requestedSegment);

  if (!profileId || !isUuid(profileId)) {
    return {
      title: 'Perfil técnico | UrbanFix',
      description: 'Perfil técnico público en UrbanFix.',
      robots: { index: false, follow: true },
    };
  }

  const { data: profile } = await getPublicProfileById(profileId);
  if (!profile || !isPublicProfileVisible(profile)) {
    return {
      title: 'Perfil técnico | UrbanFix',
      description: 'Perfil técnico público en UrbanFix.',
      robots: { index: false, follow: true },
    };
  }

  const displayName = String(profile.business_name || profile.full_name || 'Tecnico UrbanFix').trim();
  const city = String(profile.service_city || profile.city || profile.service_province || profile.country || '').trim();
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

  const { data, error } = await fetchPublicProfile(profileId);

  if (error) {
    return (
      <div className={sora.className}>
        <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
          <PublicTopNav activeHref="/vidriera" sticky />
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-rose-300/35 bg-rose-500/10 p-8 text-center">
              <h1 className="text-2xl font-semibold text-white">No pudimos abrir el perfil</h1>
              <p className="mt-2 text-sm text-rose-100">{error || 'Error inesperado.'}</p>
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
  if (!profile || !isPublicProfileVisible(profile)) {
    notFound();
  }

  const displayName = profile.business_name || profile.full_name || 'Técnico UrbanFix';
  const displayInitial = displayName.slice(0, 1).toUpperCase();
  const specialties = parseDelimitedValues(profile.specialties).slice(0, 12);
  const badges = parseBadgeArray(profile.achievement_badges).slice(0, 8);
  const likesCount = Math.max(0, Number(profile.public_likes_count || 0));
  const publicReviewState = await fetchTechnicianPublicReviews(profile.id, profile.city || profile.coverage_area || '');
  const storedRating = Number(profile.public_rating || 0);
  const rating = publicReviewState.hasAggregate ? Number(publicReviewState.rating || 0) : storedRating;
  const reviewsCount = publicReviewState.hasAggregate
    ? publicReviewState.reviewsCount
    : Math.max(0, Number(profile.public_reviews_count || 0));
  const publicReviews = publicReviewState.reviews;
  const completedJobsRaw = Number(profile.completed_jobs_total);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const hasCompletedJobs = Number.isFinite(completedJobsRaw) && completedJobsRaw > 0;
  const quoteCount = await fetchTechnicianQuoteCount(profile.id);
  const acceptedQuoteCount = await fetchTechnicianAcceptedQuoteCount(profile.id);
  const completedJobsCount = Math.max(hasCompletedJobs ? Math.floor(completedJobsRaw) : 0, acceptedQuoteCount);
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
  const coverageHeroLabel = profile.service_city || profile.city || profile.coverage_area || profile.country || '';
  const availabilityToneClass = hasWorkingHoursConfigured
    ? isWithinWorkingHours
      ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
      : 'border-amber-300/35 bg-amber-400/15 text-amber-100'
    : 'border-white/15 bg-white/[0.06] text-white/72';
  const presentationText = String(profile.references_summary || '').trim();
  const heroSummary =
    presentationText.length > 150 ? `${presentationText.slice(0, 147).trimEnd()}...` : presentationText;
  const visibleSpecialties = specialties.slice(0, 8);
  const hiddenSpecialtiesCount = Math.max(0, specialties.length - visibleSpecialties.length);
  const canonicalPath = buildTechnicianPath(profile.id, displayName);
  const canonicalSegment = canonicalPath.split('/').pop() || '';
  if (requestedSegment.toLowerCase() !== canonicalSegment.toLowerCase()) {
    permanentRedirect(canonicalPath);
  }
  const avatarImageUrl = toOptionalAbsoluteUrl(profile.avatar_url || profile.company_logo_url);
  const companyBannerUrl = toOptionalAbsoluteUrl(profile.banner_url || profile.company_logo_url || profile.avatar_url);
  const canonicalUrl = buildTechnicianUrl(profile.id, displayName);
  const socialLinks = [
    { label: 'Facebook', href: toSafeSocialUrl(profile.facebook_url), icon: 'facebook' },
    { label: 'Instagram', href: toSafeSocialUrl(profile.instagram_url), icon: 'instagram' },
  ].filter((entry) => Boolean(entry.href));
  const facebookFeedEmbedUrl = buildFacebookTimelineEmbedUrl(profile.facebook_url);
  const instagramPostEmbedUrl = buildInstagramEmbedUrl(profile.instagram_url);
  const sameAs = socialLinks.map((entry) => String(entry.href || '').trim()).filter(Boolean);
  const metricCards = [
    {
      label: 'Reputaci\u00f3n',
      value: hasRating ? rating.toFixed(1) : '0.0',
      suffix: '/5',
    },
    {
      label: 'Rese\u00f1as',
      value: reviewsCount.toString(),
    },
    {
      label: 'Trabajos',
      value: completedJobsCount.toString(),
    },
    {
      label: 'Presupuestos',
      value: quoteCount.toString(),
    },
    {
      label: 'Me gusta',
      value: likesCount.toString(),
    },
  ];
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    url: canonicalUrl,
    jobTitle: 'Técnico',
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
    description: presentationText || `${displayName} en UrbanFix.`,
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
            <section className="overflow-hidden rounded-[32px] border border-white/15 bg-[#2d073f] shadow-[0_35px_110px_-70px_rgba(0,0,0,1)]">
              <div className="relative h-44 sm:h-56 lg:h-64">
                {companyBannerUrl ? (
                  <>
                    <img src={companyBannerUrl} alt={`Banner de ${displayName}`} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,0,47,0.2)_0%,rgba(33,0,47,0.04)_44%,rgba(33,0,47,0.22)_100%)]" />
                  </>
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,rgba(255,143,31,0.35),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.28),transparent_40%),linear-gradient(120deg,#240033_0%,#2a0541_45%,#1d012a_100%)]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,0,47,0)_0%,rgba(33,0,47,0.1)_50%,rgba(33,0,47,0.72)_100%)]" />
              </div>

              <div className="relative min-h-[340px] space-y-5 border-t border-white/10 bg-[linear-gradient(180deg,rgba(66,16,86,0.96)_0%,rgba(45,6,62,0.99)_100%)] px-4 pb-20 pt-20 sm:min-h-[350px] sm:px-8 sm:pb-20 sm:pt-8">
                  <ProfileVisitCounter
                    profileId={profile.id}
                    className="!absolute !right-4 !top-4 !z-10 max-w-[calc(100%-2rem)] bg-black/[0.24] sm:!right-6 sm:!top-6"
                  />
                  <div className="!absolute !bottom-4 !right-4 !z-10 flex max-w-[calc(100%-2rem)] items-center gap-2.5 sm:!bottom-6 sm:!right-6">
                    <ProfileLikeButton profileId={profile.id} initialCount={likesCount} iconOnly />
                    <ProfileReviewComments profileId={profile.id} initialCount={reviewsCount} />
                    <ProfileShareActions profileId={profile.id} shareUrl={canonicalUrl} title={displayName} />
                  </div>
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-5 sm:pr-64 sm:text-left lg:pr-72">
                    <div className="h-28 w-28 overflow-hidden rounded-3xl border border-white/35 bg-[#2a0640] shadow-[0_20px_60px_-28px_rgba(0,0,0,0.95)] ring-4 ring-[#ff8f1f]/35 sm:h-36 sm:w-36">
                      {avatarImageUrl ? (
                        <img src={avatarImageUrl} alt={`Foto de ${displayName}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/90">
                          {displayInitial}
                        </div>
                      )}
                    </div>
                    <div className="w-full min-w-0 flex-1 space-y-3 pb-1">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                          <h1 className="max-w-full text-2xl font-semibold leading-tight text-white sm:text-4xl">{displayName}</h1>
                          {coverageHeroLabel && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/72">
                              <MapPinned className="h-3.5 w-3.5 text-[#ff8f1f]" />
                              {coverageHeroLabel}
                            </span>
                          )}
                        </div>
                        {profile.full_name && profile.full_name !== displayName && (
                          <p className="text-sm text-white/80">{profile.full_name}</p>
                        )}
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:justify-start">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${availabilityToneClass}`}>
                            {availabilityLabel}
                          </span>
                          <span className="w-full text-xs leading-5 text-white/62 sm:w-auto">
                            {workingHoursLabel} · {argentinaTimeLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 sm:justify-start">
                          {whatsappLink ? (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label="Contactar por WhatsApp"
                              title="WhatsApp"
                              className="inline-flex h-10 w-full max-w-[230px] items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 text-xs font-black text-[#052513] shadow-[0_18px_36px_-26px_rgba(37,211,102,0.9)] transition hover:-translate-y-0.5 hover:bg-[#31e477] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70 sm:w-auto sm:max-w-none"
                            >
                              <WhatsAppBrandIcon className="h-6 w-6" />
                              Consultar disponibilidad
                            </a>
                          ) : null}
                          {socialLinks.map((entry) => (
                            <a
                              key={entry.label}
                              href={String(entry.href)}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`Abrir ${entry.label}`}
                              title={entry.label}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-105 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
                            >
                              {entry.icon === 'facebook' ? (
                                <FacebookBrandIcon className="h-8 w-8" />
                              ) : (
                                <InstagramBrandIcon className="h-8 w-8" />
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {heroSummary ? (
                    <div className="rounded-3xl border border-white/12 bg-black/18 p-4 sm:p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Bio</p>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">{heroSummary}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    {specialties.length > 0 ? (
                      <>
                        {visibleSpecialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/85"
                          >
                            {specialty}
                          </span>
                        ))}
                        {hiddenSpecialtiesCount > 0 ? (
                          <span className="rounded-full border border-[#ff8f1f]/25 bg-[#ff8f1f]/10 px-3 py-1 text-xs font-black text-[#ffd6a6]">
                            +{hiddenSpecialtiesCount} rubros
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/65">
                        Especialidades no informadas
                      </span>
                    )}
                  </div>

                  {publicReviews.length > 0 && (
                    <div className="grid gap-3 pt-1 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                      <div className="rounded-[24px] border border-[#ff8f1f]/25 bg-[#ff8f1f]/10 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd6a6]">Reseñas</p>
                        <div className="mt-2 flex items-end gap-2">
                          <span className="text-4xl font-black text-white">{hasRating ? rating.toFixed(1) : '0.0'}</span>
                          <span className="pb-1 text-sm font-bold text-white/50">/5</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-white/66">{reviewsCount} comentarios de clientes</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {publicReviews.slice(0, 2).map((review) => (
                          <article key={`hero-${review.id}`} className="rounded-[24px] border border-white/12 bg-black/18 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-black text-white">{review.clientName}</p>
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#ffd37a]">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                {review.rating}
                              </span>
                            </div>
                            {review.location ? (
                              <p className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-white/52">
                                <MapPinned className="h-3.5 w-3.5 shrink-0 text-[#ff8f1f]" />
                                <span className="truncate">{review.location}</span>
                              </p>
                            ) : null}
                            <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-white/72">{review.comment}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </section>

            <section>
              <article className="ufx-tech-card overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,143,31,0.08)_48%,rgba(255,255,255,0.03))]">
                <div className="grid lg:grid-cols-[minmax(180px,0.38fr)_minmax(0,1.62fr)]">
                  <div className="border-b border-white/10 p-4 sm:p-6 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Perfil</p>
                    <h2 className={`${spaceGrotesk.className} mt-2 text-2xl font-bold text-white sm:text-3xl`}>Confianza</h2>
                    <p className="mt-2 text-sm leading-6 text-white/55">Se&ntilde;ales simples para decidir si contactar.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 sm:divide-x sm:divide-white/10">
                    {metricCards.map((item) => (
                      <div key={item.label} className="border-b border-white/10 p-4 last:border-b-0 sm:border-b-0 sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">
                          {item.label}
                        </p>
                        <p className={`${spaceGrotesk.className} mt-2 flex items-baseline gap-1 text-3xl font-bold text-white sm:mt-3 sm:text-5xl`}>
                          <span>{item.value}</span>
                          {'suffix' in item && item.suffix ? (
                            <span className="text-sm font-bold text-white/45">{item.suffix}</span>
                          ) : null}
                        </p>
                        {item.label === 'Reputaci\u00f3n' ? (
                          <div className="mt-3 flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, index) => (
                              <Star
                                key={index}
                                className={`h-4 w-4 ${
                                  index < Math.round(rating)
                                    ? 'fill-[#ffbf4d] text-[#ffbf4d]'
                                    : 'fill-white/10 text-white/20'
                                }`}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>

            {publicReviews.length > 0 && (
              <section>
                <article className="ufx-tech-card ufx-tech-card--soft p-5 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Comentarios</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Rese&ntilde;as de clientes</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/12 px-3 py-1.5 text-sm font-black text-white">
                      <Star className="h-4 w-4 fill-[#ffbf4d] text-[#ffbf4d]" />
                      <span>{hasRating ? rating.toFixed(1) : '0.0'}</span>
                      <span className="text-xs font-semibold text-white/55">/5</span>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {publicReviews.map((review) => (
                      <article
                        key={review.id}
                        className="rounded-[24px] border border-white/12 bg-black/18 p-4 shadow-[0_18px_50px_-42px_rgba(0,0,0,0.9)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{review.clientName}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                                {review.source === 'verified' ? 'Trabajo verificado' : 'Perfil publico'}
                              </span>
                              {review.location ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/52">
                                  <MapPinned className="h-3.5 w-3.5 text-[#ff8f1f]" />
                                  {review.location}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-[#ffd37a]">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {review.rating}
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-white/78">{review.comment}</p>
                      </article>
                    ))}
                  </div>
                </article>
              </section>
            )}

            {badges.length > 0 && (
              <section className="grid gap-4">
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
              </section>
            )}

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
