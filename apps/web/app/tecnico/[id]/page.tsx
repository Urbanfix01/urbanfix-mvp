import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Sora } from 'next/font/google';
import ProfileLikeButton from '../../../components/profile/ProfileLikeButton';
import PublicTopNav from '../../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

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
  return {
    title: `Perfil tecnico | UrbanFix`,
    description: `Perfil publico del tecnico ${resolved?.id || ''} en UrbanFix.`,
  };
}

export default async function TechnicianPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const profileId = String(resolved?.id || '').trim();
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
  const profileCode = profile.id.slice(0, 8).toUpperCase();
  const profileHref = `/tecnico/${profile.id}`;
  const socialLinks = [
    { label: 'Facebook', href: profile.facebook_url },
    { label: 'Instagram', href: profile.instagram_url },
  ].filter((entry) => Boolean(entry.href));

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/vidriera" sticky />

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,143,31,0.14),transparent_45%),radial-gradient(circle_at_88%_22%,rgba(87,36,128,0.38),transparent_48%)]" />
          <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#ff8f1f]/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-10 h-96 w-96 rounded-full bg-[#55207e]/35 blur-3xl" />

          <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
            <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_28px_90px_-60px_rgba(0,0,0,0.9)] sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Perfil tecnico UrbanFix</p>
                  <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{displayName}</h1>
                  <p className="text-sm text-white/75">{profile.full_name || 'Profesional verificado en UrbanFix'}</p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-white/90">
                      Perfil unico: {profileCode}
                    </span>
                    {profile.city && (
                      <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-white/90">
                        Zona: {profile.city}
                      </span>
                    )}
                    <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-white/90">
                      Rubros: {specialties.length}
                    </span>
                  </div>

                  <p className="max-w-3xl text-sm leading-relaxed text-white/85">{presentationText}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={profileHref}
                      className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                    >
                      Link publico del perfil
                    </Link>
                    <Link
                      href="/vidriera"
                      className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Volver a vidriera
                    </Link>
                  </div>
                </div>

                <aside className="rounded-3xl border border-white/15 bg-black/20 p-5 sm:p-6">
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-3xl border border-white/20 bg-white/[0.08]">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Foto tecnico" className="h-full w-full object-cover" />
                    ) : profile.company_logo_url ? (
                      <img src={profile.company_logo_url} alt="Logo tecnico" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/80">
                        {displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-center">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Carta de presentacion</p>
                    <p className="text-sm font-semibold text-white">Disponible para contacto directo</p>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <ProfileLikeButton profileId={profile.id} initialCount={likesCount} className="mx-auto" />
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full border border-white/35 px-4 py-2 text-center text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                      >
                        Contactar por WhatsApp
                      </a>
                    ) : (
                      <p className="rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2 text-center text-[11px] text-white/70">
                        Este tecnico aun no cargo telefono de contacto.
                      </p>
                    )}
                  </div>
                </aside>
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
