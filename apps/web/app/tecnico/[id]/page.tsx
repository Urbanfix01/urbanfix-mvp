import Link from 'next/link';
import { Manrope } from 'next/font/google';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  coverage_area: string | null;
  specialties: string | null;
  certifications: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  profile_published: boolean | null;
  profile_published_at: string | null;
};

const CERT_FILES_TAG_START = '<!-- UFX_CERT_FILES ';
const CERT_FILES_TAG_END = ' -->';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeSocialUrl = (value: string) => {
  const raw = value.trim();
  if (!raw) return '';
  const prefixed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(prefixed).toString();
  } catch {
    return '';
  }
};

const buildFacebookTimelineEmbedUrl = (value: string) => {
  const url = normalizeSocialUrl(value);
  if (!url) return '';
  return `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
    url
  )}&tabs=timeline&width=500&height=460&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
};

const buildInstagramEmbedUrl = (value: string) => {
  const normalized = normalizeSocialUrl(value);
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

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const stripCertificationFilesTag = (value: string | null | undefined) => {
  const text = String(value || '');
  const startIndex = text.lastIndexOf(CERT_FILES_TAG_START);
  if (startIndex === -1) return text.trim();
  const endIndex = text.indexOf(CERT_FILES_TAG_END, startIndex + CERT_FILES_TAG_START.length);
  if (endIndex === -1) return text.trim();
  return text.slice(0, startIndex).trim();
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

export default async function PublicTechnicianProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const profileId = String(resolvedParams.id || '').trim();
  if (!isUuid(profileId)) {
    notFound();
  }

  const supabase = getPublicSupabaseClient();
  if (!supabase) {
    return (
      <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-12 text-slate-100`}>
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <p className="text-lg font-semibold">Perfil no disponible</p>
          <p className="mt-2 text-sm text-slate-300">Falta configurar Supabase en el entorno de despliegue.</p>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,full_name,business_name,phone,city,coverage_area,specialties,certifications,company_logo_url,avatar_url,facebook_url,instagram_url,profile_published,profile_published_at'
    )
    .eq('id', profileId)
    .maybeSingle<ProfileRow>();

  if (error || !data || !data.profile_published) {
    notFound();
  }

  const facebookUrl = normalizeSocialUrl(data.facebook_url || '');
  const instagramUrl = normalizeSocialUrl(data.instagram_url || '');
  const facebookEmbedUrl = buildFacebookTimelineEmbedUrl(facebookUrl);
  const instagramEmbedUrl = buildInstagramEmbedUrl(instagramUrl);
  const specialties = parseDelimitedValues(data.specialties);
  const certifications = stripCertificationFilesTag(data.certifications);

  return (
    <main className={`${manrope.className} min-h-screen bg-slate-950 px-4 py-10 text-slate-100`}>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/30">
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-black p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                  {data.avatar_url ? (
                    <img src={data.avatar_url} alt="Foto del tecnico" className="h-full w-full object-cover" />
                  ) : data.company_logo_url ? (
                    <img src={data.company_logo_url} alt="Logo" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-300">
                      {(data.business_name || data.full_name || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Perfil tecnico</p>
                  <h1 className="mt-1 text-2xl font-semibold text-white">{data.business_name || 'Tecnico UrbanFix'}</h1>
                  <p className="mt-1 text-sm text-slate-300">{data.full_name || 'Profesional independiente'}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                    {data.city && <span className="rounded-full bg-slate-800 px-3 py-1">{data.city}</span>}
                    {data.coverage_area && <span className="rounded-full bg-slate-800 px-3 py-1">{data.coverage_area}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.phone && (
                  <a
                    href={`https://wa.me/${data.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
                  >
                    Contactar por WhatsApp
                  </a>
                )}
                <Link
                  href="/vidriera"
                  className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white"
                >
                  Ver vidriera
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Especialidades</p>
                {specialties.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-300">Sin rubros cargados.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {specialties.map((item) => (
                      <span key={item} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Certificaciones</p>
                {certifications ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{certifications}</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">Sin detalle de certificaciones.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {(facebookUrl || instagramUrl) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Redes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {facebookUrl && (
                      <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        Facebook
                      </a>
                    )}
                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Posteos</p>
                <div className="mt-3 space-y-3">
                  {facebookEmbedUrl ? (
                    <iframe
                      title="Posteos Facebook"
                      src={facebookEmbedUrl}
                      className="h-[320px] w-full rounded-xl border-0"
                      loading="lazy"
                      allow="encrypted-media"
                    />
                  ) : (
                    <p className="text-xs text-slate-300">Sin feed de Facebook publicado.</p>
                  )}
                  {instagramEmbedUrl ? (
                    <iframe
                      title="Posteo Instagram"
                      src={instagramEmbedUrl}
                      className="h-[320px] w-full rounded-xl border-0"
                      loading="lazy"
                      allow="encrypted-media"
                    />
                  ) : (
                    <p className="text-xs text-slate-300">
                      Sin post de Instagram embebido. Recomendado: pegar un link de post o reel.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
