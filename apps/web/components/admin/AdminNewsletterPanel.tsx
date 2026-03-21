'use client';

import { useEffect, useMemo, useState } from 'react';

type NewsletterAudience =
  | 'opted_in_all'
  | 'opted_in_tecnicos'
  | 'opted_in_clientes'
  | 'base_all'
  | 'base_tecnicos'
  | 'base_clientes';

type NewsletterCampaign = {
  id: string;
  subject: string;
  audience: NewsletterAudience;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  warning_text?: string | null;
  sent_at?: string | null;
  created_at: string;
  created_by_label?: string | null;
};

type NewsletterData = {
  capabilities: {
    resendConfigured: boolean;
    newsletterColumnsReady: boolean;
    campaignTablesReady: boolean;
    fromEmail?: string | null;
  };
  audienceCounts: Record<NewsletterAudience, number>;
  audienceLabels: Record<NewsletterAudience, string>;
  recentCampaigns: NewsletterCampaign[];
};

type Props = {
  accessToken: string;
  active: boolean;
};

type QuickLinkDraft = {
  label: string;
  url: string;
};

const audienceOptions: NewsletterAudience[] = [
  'opted_in_all',
  'opted_in_tecnicos',
  'opted_in_clientes',
  'base_all',
  'base_tecnicos',
  'base_clientes',
];

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminNewsletterPanel({ accessToken, active }: Props) {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState<'test' | 'send' | null>(null);
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [introText, setIntroText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageAlt, setHeroImageAlt] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [audience, setAudience] = useState<NewsletterAudience>('opted_in_all');
  const [quickLinks, setQuickLinks] = useState<QuickLinkDraft[]>([
    { label: '', url: '' },
    { label: '', url: '' },
    { label: '', url: '' },
  ]);

  const loadNewsletter = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/newsletter', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar el modulo de newsletter.');
      }
      setData(payload);
    } catch (nextError: any) {
      setError(nextError?.message || 'No se pudo cargar el modulo de newsletter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active || !accessToken) return;
    loadNewsletter();
  }, [active, accessToken]);

  const audienceCount = useMemo(() => {
    if (!data) return 0;
    return data.audienceCounts[audience] || 0;
  }, [audience, data]);

  const audienceHelper = useMemo(() => {
    if (!data) return '';
    if (audience.startsWith('opted_in_') && !data.capabilities.newsletterColumnsReady) {
      return 'Falta aplicar la migracion de consentimiento en profiles para usar segmentos suscriptos.';
    }
    if (audience.startsWith('base_')) {
      return 'Este segmento usa la base actual de usuarios con email valido, aunque todavia no exista opt-in registrado.';
    }
    return 'Este segmento solo toma usuarios con consentimiento de newsletter activo.';
  }, [audience, data]);

  const handleSubmit = async (mode: 'test' | 'send') => {
    if (!accessToken) return;

    setSubmitting(mode);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          audience,
          subject,
          previewText,
          introText,
          bodyText,
          heroImageUrl,
          heroImageAlt,
          quickLinks,
          ctaLabel,
          ctaUrl,
          testEmail,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo enviar el newsletter.');
      }
      setMessage(
        payload?.warnings?.length
          ? `${payload?.message || 'Listo.'} ${payload.warnings.join(' ')}`
          : payload?.message || 'Listo.'
      );
      if (mode === 'send') {
        await loadNewsletter();
      }
    } catch (nextError: any) {
      setError(nextError?.message || 'No se pudo enviar el newsletter.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.1)] backdrop-blur-[2px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Newsletter</p>
          <h3 className="text-lg font-semibold text-slate-900">Campanas por email</h3>
          <p className="text-sm text-slate-500">
            Prepara una novedad, enviala de prueba y luego publicala para toda la base o para segmentos concretos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadNewsletter}
            className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Actualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Cargando newsletter...
        </div>
      )}

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}

      {data && (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Suscriptos</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.audienceCounts.opted_in_all || 0}</p>
              <p className="mt-1 text-xs text-slate-500">Usuarios con consentimiento activo</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Base total</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{data.audienceCounts.base_all || 0}</p>
              <p className="mt-1 text-xs text-slate-500">Usuarios con email valido</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Proveedor</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {data.capabilities.resendConfigured ? 'Resend listo' : 'Proveedor pendiente'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.capabilities.fromEmail || 'Configura NEWSLETTER_FROM_EMAIL'}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Historial</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {data.capabilities.campaignTablesReady ? 'Persistente' : 'Sin migracion aplicada'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.capabilities.newsletterColumnsReady ? 'Opt-in disponible' : 'Consentimiento pendiente'}
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Asunto</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Ej: Novedades de UrbanFix de marzo"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Preview</span>
                  <input
                    value={previewText}
                    onChange={(event) => setPreviewText(event.target.value)}
                    placeholder="Texto corto que aparece antes de abrir el mail"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Intro</span>
                <input
                  value={introText}
                  onChange={(event) => setIntroText(event.target.value)}
                  placeholder="Linea inicial opcional para abrir la campana"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cuerpo</span>
                <textarea
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  rows={10}
                  placeholder="Escribe el newsletter. Deja una linea en blanco entre parrafos."
                  className="mt-2 min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Imagen principal URL</span>
                  <input
                    value={heroImageUrl}
                    onChange={(event) => setHeroImageUrl(event.target.value)}
                    placeholder="https://www.urbanfix.com.ar/..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Imagen alt</span>
                  <input
                    value={heroImageAlt}
                    onChange={(event) => setHeroImageAlt(event.target.value)}
                    placeholder="Ej: Mapa publico y rubros de UrbanFix"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">CTA label</span>
                  <input
                    value={ctaLabel}
                    onChange={(event) => setCtaLabel(event.target.value)}
                    placeholder="Ej: Abrir plataforma"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">CTA URL</span>
                  <input
                    value={ctaUrl}
                    onChange={(event) => setCtaUrl(event.target.value)}
                    placeholder="https://www.urbanfix.com.ar/..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Enlaces directos</p>
                <p className="mt-1 text-xs text-slate-500">
                  Puedes agregar hasta tres links para llevar directo a ventanas o novedades concretas.
                </p>
                <div className="mt-4 space-y-4">
                  {quickLinks.map((link, index) => (
                    <div key={`quick-link-${index}`} className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Link {index + 1} label
                        </span>
                        <input
                          value={link.label}
                          onChange={(event) =>
                            setQuickLinks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, label: event.target.value } : item
                              )
                            )
                          }
                          placeholder="Ej: Ver mapa de tecnicos"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Link {index + 1} URL
                        </span>
                        <input
                          value={link.url}
                          onChange={(event) =>
                            setQuickLinks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, url: event.target.value } : item
                              )
                            )
                          }
                          placeholder="https://www.urbanfix.com.ar/vidriera"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Segmento</span>
                <select
                  value={audience}
                  onChange={(event) => setAudience(event.target.value as NewsletterAudience)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                >
                  {audienceOptions.map((option) => (
                    <option key={option} value={option}>
                      {data.audienceLabels[option]} ({data.audienceCounts[option] || 0})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Resumen de segmento</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{audienceCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{audienceHelper}</p>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Email de prueba</span>
                <input
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  placeholder="tu-email@dominio.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmit('test')}
                  disabled={submitting !== null}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting === 'test' ? 'Enviando prueba...' : 'Enviar prueba'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('send')}
                  disabled={submitting !== null}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting === 'send' ? 'Enviando campana...' : 'Enviar newsletter'}
                </button>
              </div>

              {!data.capabilities.resendConfigured && (
                <p className="mt-4 text-xs text-amber-700">
                  Para enviar campanas reales debes configurar `RESEND_API_KEY` y `NEWSLETTER_FROM_EMAIL`.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Historial</p>
                <h4 className="text-base font-semibold text-slate-900">Campanas recientes</h4>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {data.recentCampaigns.length === 0 && (
                <p className="text-sm text-slate-500">
                  {data.capabilities.campaignTablesReady
                    ? 'Todavia no hay campanas registradas.'
                    : 'Aplica la migracion de newsletter para guardar historial de campanas.'}
                </p>
              )}
              {data.recentCampaigns.map((campaign) => (
                <article key={campaign.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{campaign.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {data.audienceLabels[campaign.audience] || campaign.audience} - {campaign.created_by_label || 'Admin'} -{' '}
                        {formatDateTime(campaign.sent_at || campaign.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                      {campaign.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      Total: {campaign.total_recipients}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      Enviados: {campaign.sent_count}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                      Fallidos: {campaign.failed_count}
                    </span>
                  </div>
                  {campaign.warning_text && <p className="mt-3 text-xs text-amber-700">{campaign.warning_text}</p>}
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
