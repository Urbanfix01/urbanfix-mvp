import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Manrope } from 'next/font/google';
import ProfileLikeButton from '../../../components/profile/ProfileLikeButton';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

type PublicTechnicianProfile = {
  id: string;
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
  profile_published: boolean | null;
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
      <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-12 text-slate-100`}>
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <h1 className="text-2xl font-semibold text-white">Perfil no disponible</h1>
          <p className="mt-2 text-sm text-slate-300">Falta configurar variables de Supabase en el deploy.</p>
          <Link
            href="/vidriera"
            className="mt-5 inline-flex rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
          >
            Volver a vidriera
          </Link>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,full_name,business_name,phone,city,coverage_area,specialties,avatar_url,company_logo_url,facebook_url,instagram_url,public_rating,public_reviews_count,completed_jobs_total,references_summary,client_recommendations,achievement_badges,public_likes_count,profile_published'
    )
    .eq('id', profileId)
    .eq('profile_published', true)
    .maybeSingle();

  if (error) {
    return (
      <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-12 text-slate-100`}>
        <div className="mx-auto max-w-2xl rounded-3xl border border-rose-800 bg-rose-950/30 p-6 text-center">
          <h1 className="text-2xl font-semibold text-white">No pudimos abrir el perfil</h1>
          <p className="mt-2 text-sm text-rose-200">{error.message || 'Error inesperado.'}</p>
          <Link
            href="/vidriera"
            className="mt-5 inline-flex rounded-full border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-400 hover:text-white"
          >
            Volver a vidriera
          </Link>
        </div>
      </main>
    );
  }

  const profile = (data || null) as PublicTechnicianProfile | null;
  if (!profile || !profile.profile_published) {
    notFound();
  }

  const displayName = profile.business_name || profile.full_name || 'Tecnico UrbanFix';
  const specialties = parseDelimitedValues(profile.specialties).slice(0, 12);
  const recommendations = splitTextLines(profile.client_recommendations).slice(0, 5);
  const badges = parseBadgeArray(profile.achievement_badges).slice(0, 8);
  const likesCount = Math.max(0, Number(profile.public_likes_count || 0));
  const rating = Number(profile.public_rating || 0);
  const reviewsCount = Math.max(0, Number(profile.public_reviews_count || 0));
  const completedJobs = Math.max(0, Number(profile.completed_jobs_total || 0));
  const whatsappLink = profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : '';

  return (
    <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-10 text-slate-100`}>
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Foto tecnico" className="h-full w-full object-cover" />
                ) : profile.company_logo_url ? (
                  <img src={profile.company_logo_url} alt="Logo tecnico" className="h-full w-full object-contain p-2" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-300">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{displayName}</p>
                <p className="mt-1 text-sm text-slate-300">{profile.full_name || 'Profesional UrbanFix'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {profile.city && <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">{profile.city}</span>}
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">Likes: {likesCount}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ProfileLikeButton profileId={profile.id} initialCount={likesCount} />
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"
                >
                  Contactar por WhatsApp
                </a>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Reputacion</p>
            <p className="mt-2 text-2xl font-semibold text-white">{rating > 0 ? rating.toFixed(1) : '-'}</p>
            <p className="mt-1 text-xs text-slate-300">Puntaje promedio</p>
          </article>
          <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Resenas</p>
            <p className="mt-2 text-2xl font-semibold text-white">{reviewsCount}</p>
            <p className="mt-1 text-xs text-slate-300">Opiniones de clientes</p>
          </article>
          <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Trabajos</p>
            <p className="mt-2 text-2xl font-semibold text-white">{completedJobs}</p>
            <p className="mt-1 text-xs text-slate-300">Trabajos finalizados</p>
          </article>
        </section>

        {profile.coverage_area && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cobertura</p>
            <p className="mt-2 text-sm text-slate-200">{profile.coverage_area}</p>
          </section>
        )}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rubros</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {specialties.length > 0 ? (
              specialties.map((specialty) => (
                <span key={specialty} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200">
                  {specialty}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                Sin rubros cargados
              </span>
            )}
          </div>
        </section>

        {(profile.references_summary || recommendations.length > 0 || badges.length > 0) && (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Referencias</p>
              <p className="mt-2 text-sm text-slate-200">
                {profile.references_summary || 'Este tecnico aun no cargo referencias.'}
              </p>
              {recommendations.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {recommendations.map((item, index) => (
                    <li key={`${index}-${item}`} className="rounded-xl bg-slate-800/70 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Insignias</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {badges.length > 0 ? (
                  badges.map((badge) => (
                    <span key={badge} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    Sin insignias cargadas
                  </span>
                )}
              </div>
            </article>
          </section>
        )}

        <section className="flex flex-wrap gap-2">
          {profile.facebook_url && (
            <a
              href={profile.facebook_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
            >
              Facebook
            </a>
          )}
          {profile.instagram_url && (
            <a
              href={profile.instagram_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
            >
              Instagram
            </a>
          )}
          <Link
            href="/vidriera"
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
          >
            Volver a vidriera
          </Link>
        </section>
      </div>
    </main>
  );
}
