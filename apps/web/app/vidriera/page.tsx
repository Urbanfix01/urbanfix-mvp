import type { Metadata } from 'next';
import Link from 'next/link';
import { Manrope } from 'next/font/google';
import { createClient } from '@supabase/supabase-js';

const manrope = Manrope({
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
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  coverage_area: string | null;
  specialties: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  profile_published: boolean | null;
  profile_published_at: string | null;
};

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

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

export default async function VidrieraPage() {
  const supabase = getPublicSupabaseClient();

  if (!supabase) {
    return (
      <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-12 text-slate-100`}>
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <h1 className="text-2xl font-semibold text-white">Vidriera no disponible</h1>
          <p className="mt-2 text-sm text-slate-300">Falta configurar variables de Supabase en el deploy.</p>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,full_name,business_name,phone,city,coverage_area,specialties,company_logo_url,avatar_url,facebook_url,instagram_url,profile_published,profile_published_at'
    )
    .eq('profile_published', true)
    .order('profile_published_at', { ascending: false })
    .limit(240);

  const profiles = (data || []) as PublishedProfileRow[];
  const safeProfiles = profiles.filter((row) => row.profile_published);
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

  return (
    <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-10 text-slate-100`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
              <h1 className="mt-1 text-3xl font-semibold text-white">Vidriera de tecnicos publicados</h1>
              <p className="mt-2 text-sm text-slate-300">
                Aqui puedes ver perfiles publicos como exposicion y entrar al detalle de cada tecnico.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                {safeProfiles.length} tecnicos publicados
              </span>
              <Link
                href="/cliente"
                className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                Ir a cliente
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {migrationMissing
              ? 'Falta migracion de perfil publico/redes en Supabase (profile_published, facebook_url, instagram_url).'
              : 'No pudimos cargar la vidriera en este momento.'}
          </div>
        )}

        {safeProfiles.length === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/75 p-8 text-center">
            <p className="text-lg font-semibold text-white">Aun no hay tecnicos publicados.</p>
            <p className="mt-2 text-sm text-slate-300">Cuando publiquen su perfil apareceran aqui automaticamente.</p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {safeProfiles.map((profile) => {
              const displayName = profile.business_name || profile.full_name || 'Tecnico UrbanFix';
              const specialties = parseDelimitedValues(profile.specialties).slice(0, 5);
              const socialCount = [profile.facebook_url, profile.instagram_url].filter(Boolean).length;
              const publishedLabel = profile.profile_published_at
                ? new Date(profile.profile_published_at).toLocaleDateString('es-AR')
                : '';
              const whatsappLink = profile.phone ? `https://wa.me/${profile.phone.replace(/\D/g, '')}` : '';
              return (
                <article
                  key={profile.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Foto tecnico" className="h-full w-full object-cover" />
                      ) : profile.company_logo_url ? (
                        <img src={profile.company_logo_url} alt="Logo tecnico" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-300">
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">{displayName}</p>
                      <p className="truncate text-xs text-slate-300">{profile.full_name || 'Profesional'}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        {profile.city && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200">{profile.city}</span>}
                        {socialCount > 0 && (
                          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200">
                            Redes: {socialCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {profile.coverage_area && (
                    <p className="mt-3 rounded-xl bg-slate-800/80 px-3 py-2 text-xs text-slate-200">{profile.coverage_area}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {specialties.length > 0 ? (
                      specialties.map((item) => (
                        <span
                          key={`${profile.id}-${item}`}
                          className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
                        Sin rubros cargados
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tecnico/${profile.id}`}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-200"
                    >
                      Ver perfil
                    </Link>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
                      >
                        WhatsApp
                      </a>
                    )}
                    {publishedLabel && (
                      <span className="rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                        Publicado: {publishedLabel}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
