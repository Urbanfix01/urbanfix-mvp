import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicTechnicianProfile } from '@/app/api/_shared/public-technician-profile';

type PageProps = {
  params: Promise<{ id: string }>;
};

type PublicWorkItem = {
  id: string;
  title: string | null;
  location_label: string | null;
  status: string | null;
  happened_at: string | null;
};

type PublicReviewItem = {
  id: string;
  author: string;
  text: string;
};

const isValidUrl = (value: string | null | undefined) => {
  const safeValue = String(value || '').trim();
  return safeValue.startsWith('http://') || safeValue.startsWith('https://');
};

const formatDate = (value: string | null | undefined) => {
  const safe = String(value || '').trim();
  if (!safe) return 'Fecha no informada';
  const date = new Date(safe);
  if (Number.isNaN(date.getTime())) return 'Fecha no informada';
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCount = (value: number, singular: string, plural: string) => {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return `${safeValue} ${safeValue === 1 ? singular : plural}`;
};

const getStatusLabelEs = (status?: string | null) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'FINALIZADO';
  if (['completed', 'completado', 'finalizado', 'finalizados'].includes(normalized)) return 'FINALIZADO';
  if (['paid', 'pagado', 'pagados', 'cobrado', 'cobrados', 'charged'].includes(normalized)) return 'COBRADO';
  if (['approved', 'accepted', 'aprobado'].includes(normalized)) return 'APROBADO';
  return normalized.replace(/_/g, ' ').toUpperCase();
};

const getInstagramEmbedUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
    return `https://www.instagram.com${path}embed/captioned/`;
  } catch {
    return null;
  }
};

const getFacebookEmbedUrl = (value: string) =>
  `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(value)}&show_text=true&width=500`;

const getSocialDisplayUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    const raw = `${parsed.hostname.replace(/^www\./i, '')}${parsed.pathname.replace(/\/+$/, '')}`;
    return raw.length > 56 ? `${raw.slice(0, 53)}...` : raw;
  } catch {
    return value;
  }
};

const getSocialHandle = (value: string, platform: 'instagram' | 'facebook') => {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    const primary = segments[0] || '';
    if (!primary || primary.toLowerCase() === 'profile.php') {
      return getSocialDisplayUrl(value);
    }
    if (platform === 'instagram') {
      return `@${primary.replace(/^@/, '')}`;
    }
    return primary.startsWith('@') ? primary : `@${primary}`;
  } catch {
    return getSocialDisplayUrl(value);
  }
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const result = await getPublicTechnicianProfile(resolved.id, { requirePublished: true });
  const technician = result.technician;

  if (!technician) {
    return { title: 'Tecnico | UrbanFix' };
  }

  const title = technician.business_name || technician.name || 'Tecnico UrbanFix';
  const description =
    technician.references_summary ||
    `${technician.specialty || 'Servicios generales'} en ${technician.city || 'Argentina'} con cobertura ${technician.coverage_area || technician.city || 'no informada'}.`;

  return {
    title: `${title} | UrbanFix`,
    description,
  };
}

export default async function PublicTechnicianPage({ params }: PageProps) {
  const resolved = await params;
  const result = await getPublicTechnicianProfile(resolved.id, { requirePublished: true });

  if (!result.technician) {
    notFound();
  }

  const technician = result.technician;
  const companyName = technician.business_name || technician.name || 'Tecnico UrbanFix';
  const personName =
    technician.full_name && technician.full_name.trim() !== companyName.trim() ? technician.full_name.trim() : '';
  const locality = technician.city || 'Argentina';
  const coverage = technician.coverage_area || technician.city || 'Cobertura no informada';
  const whatsappDigits = String(technician.phone || '').replace(/\D/g, '');
  const instagramProfileUrl = isValidUrl(technician.instagram_profile_url) ? technician.instagram_profile_url : null;
  const facebookProfileUrl = isValidUrl(technician.facebook_profile_url) ? technician.facebook_profile_url : null;
  const instagramPostUrl = isValidUrl(technician.instagram_post_url) ? technician.instagram_post_url : null;
  const facebookPostUrl = isValidUrl(technician.facebook_post_url) ? technician.facebook_post_url : null;
  const recentWorks = (Array.isArray(technician.recent_works) ? technician.recent_works : []) as PublicWorkItem[];
  const reviews = (Array.isArray(technician.reviews) ? technician.reviews : []) as PublicReviewItem[];
  const workPhotoUrls = (Array.isArray(technician.work_photo_urls) ? technician.work_photo_urls : []) as string[];
  const achievementBadges = (Array.isArray(technician.achievement_badges)
    ? technician.achievement_badges
    : []) as string[];
  const socialProfiles = [
    instagramProfileUrl
      ? {
          key: 'instagram',
          label: 'Instagram',
          ctaLabel: 'Ver perfil',
          url: instagramProfileUrl,
          handle: getSocialHandle(instagramProfileUrl, 'instagram'),
          copy: getSocialDisplayUrl(instagramProfileUrl),
          accentClass: 'text-pink-700 border-pink-300 bg-pink-50',
          buttonClass: 'bg-pink-600 hover:bg-pink-700',
          icon: 'IG',
          description: 'Cuenta comercial para validar marca, estilo de trabajo y contenido reciente.',
        }
      : null,
    facebookProfileUrl
      ? {
          key: 'facebook',
          label: 'Facebook',
          ctaLabel: 'Ver pagina',
          url: facebookProfileUrl,
          handle: getSocialHandle(facebookProfileUrl, 'facebook'),
          copy: getSocialDisplayUrl(facebookProfileUrl),
          accentClass: 'text-blue-700 border-blue-300 bg-blue-50',
          buttonClass: 'bg-blue-600 hover:bg-blue-700',
          icon: 'FB',
          description: 'Canal comercial para recomendaciones, consultas y seguimiento de obras.',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    ctaLabel: string;
    url: string;
    handle: string;
    copy: string;
    accentClass: string;
    buttonClass: string;
    icon: string;
    description: string;
  }>;
  const socialActions = [
    instagramProfileUrl || instagramPostUrl
      ? {
          key: 'instagram',
          label: 'Instagram',
          url: instagramProfileUrl || instagramPostUrl!,
          className: 'border-pink-300 text-pink-700',
        }
      : null,
    facebookProfileUrl || facebookPostUrl
      ? {
          key: 'facebook',
          label: 'Facebook',
          url: facebookProfileUrl || facebookPostUrl!,
          className: 'border-blue-300 text-blue-700',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    url: string;
    className: string;
  }>;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden bg-slate-950 px-6 py-6 text-white sm:px-8">
            <div className="absolute -left-10 bottom-[-80px] h-56 w-56 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="absolute -right-10 top-[-70px] h-56 w-56 rounded-full bg-orange-400/25 blur-2xl" />
            <div className="relative flex flex-col gap-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">
                Perfil comercial UrbanFix
              </div>

              {isValidUrl(technician.company_logo_url) ? (
                <div className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-6">
                  <img src={technician.company_logo_url!} alt={companyName} className="h-24 w-full object-contain" />
                </div>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
                  {isValidUrl(technician.avatar_url) || isValidUrl(technician.company_logo_url) ? (
                    <img
                      src={technician.avatar_url || technician.company_logo_url || ''}
                      alt={companyName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-amber-400 text-2xl font-bold text-white">
                      {companyName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{companyName}</h1>
                  {personName ? <p className="mt-1 text-sm text-slate-200">{personName}</p> : null}
                  <p className="mt-2 text-sm text-slate-300">
                    {technician.specialty || 'Servicios generales'} | {locality}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${technician.available_now ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {technician.available_now ? 'Disponible ahora' : 'Fuera de horario'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{locality}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{coverage}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {whatsappDigits.length >= 8 ? (
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  WhatsApp
                </a>
              ) : null}
              {socialActions.map((action) => (
                <a
                  key={action.key}
                  href={action.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full border bg-white px-5 py-3 text-sm font-semibold ${action.className}`}
                >
                  {action.label}
                </a>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">{technician.rating ? `${Number(technician.rating).toFixed(1)} pts` : 'Sin rating'}</div>
                <div className="mt-1 text-xs text-slate-500">Calificacion</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">{formatCount(technician.public_reviews_count, 'resena', 'resenas')}</div>
                <div className="mt-1 text-xs text-slate-500">Resenas</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">{formatCount(technician.completed_jobs_total, 'trabajo', 'trabajos')}</div>
                <div className="mt-1 text-xs text-slate-500">Obras</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">{formatCount(technician.public_likes_count, 'like', 'likes')}</div>
                <div className="mt-1 text-xs text-slate-500">Perfil guardado</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">Presentacion comercial</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {technician.references_summary ||
                  `${technician.specialty || 'Servicios generales'} | Base en ${locality} | Cobertura ${coverage}. Perfil visible para clientes de UrbanFix.`}
              </p>
              {technician.client_recommendations ? (
                <div className="mt-4 rounded-3xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-900">
                  {technician.client_recommendations}
                </div>
              ) : null}
              {achievementBadges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {achievementBadges.map((badge) => (
                    <span key={badge} className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">Ultimos trabajos</h2>
              <div className="mt-4 space-y-3">
                {recentWorks.length > 0 ? (
                  recentWorks.map((work) => (
                    <div key={work.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{work.title || 'Trabajo UrbanFix'}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatDate(work.happened_at)}</div>
                        </div>
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                          {getStatusLabelEs(work.status || 'completed')}
                        </span>
                      </div>
                      {work.location_label ? (
                        <div className="mt-3 text-sm font-medium text-slate-700">{work.location_label}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    Todavia no hay trabajos visibles en este perfil.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">Resenas de clientes</h2>
              <div className="mt-4 space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">{review.author}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{review.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    Todavia no hay resenas detalladas para mostrar.
                  </div>
                )}
              </div>
            </article>
          </div>

          <div className="space-y-5">
            {workPhotoUrls.length > 0 ? (
              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold tracking-tight">Galeria de trabajos</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {workPhotoUrls.map((photoUrl, index) => (
                    <div key={`${photoUrl}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                      <img src={photoUrl} alt={`${companyName} trabajo ${index + 1}`} className="h-44 w-full object-cover" />
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {socialProfiles.length > 0 ? (
              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold tracking-tight">Perfiles sociales</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Cuentas comerciales para validar marca, actividad y presencia digital del tecnico.
                </p>
                <div className="mt-4 space-y-4">
                  {socialProfiles.map((profile) => (
                    <div key={profile.key} className={`rounded-3xl border p-5 ${profile.accentClass}`}>
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border bg-white text-sm font-extrabold ${profile.accentClass}`}>
                          {profile.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{profile.label}</div>
                          <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{profile.handle}</div>
                          <div className="mt-1 text-xs text-slate-500">{profile.copy}</div>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-600">{profile.description}</p>
                      <a
                        href={profile.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-4 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white ${profile.buttonClass}`}
                      >
                        {profile.ctaLabel}
                      </a>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {(instagramPostUrl || facebookPostUrl) && (
              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold tracking-tight">Publicaciones destacadas</h2>
                <div className="mt-4 space-y-4">
                  {instagramPostUrl ? (
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                      <iframe
                        title="instagram-post"
                        src={getInstagramEmbedUrl(instagramPostUrl) || undefined}
                        className="h-[460px] w-full bg-white"
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency
                        allow="encrypted-media; clipboard-write"
                      />
                    </div>
                  ) : null}
                  {facebookPostUrl ? (
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                      <iframe
                        title="facebook-post"
                        src={getFacebookEmbedUrl(facebookPostUrl)}
                        className="h-[520px] w-full bg-white"
                        frameBorder="0"
                        scrolling="no"
                        allowTransparency
                        allow="encrypted-media; clipboard-write"
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            )}

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">Informacion clave</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Especialidad</div>
                  <div className="mt-2 font-medium text-slate-900">{technician.specialty || 'Servicios generales'}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Localidad</div>
                  <div className="mt-2 font-medium text-slate-900">{locality}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cobertura</div>
                  <div className="mt-2 font-medium text-slate-900">{coverage}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Horario</div>
                  <div className="mt-2 font-medium text-slate-900">{technician.working_hours_label || 'Horario no informado'}</div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
