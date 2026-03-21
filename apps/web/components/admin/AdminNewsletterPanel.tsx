'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildNewsletterPreviewBodyText,
  buildNewsletterPreviewHtml,
  normalizeNewsletterPreviewUrl,
} from '@/lib/newsletter-preview';
import {
  buildNewsletterWhatsappCopy,
  normalizeNewsletterWhatsappUrl,
} from '@/lib/newsletter-whatsapp';

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
  recipients?: Array<{
    email: string;
    status: 'pending' | 'sent' | 'failed' | 'skipped';
    error_text?: string | null;
    sent_at?: string | null;
  }>;
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
  const [submitting, setSubmitting] = useState<'test' | 'send' | 'retry_failed' | null>(null);
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

  const copyText = async (value: string, successMessage: string, errorMessage = 'No se pudo copiar la lista al portapapeles.') => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setMessage(successMessage);
      setError('');
    } catch {
      setError(errorMessage);
    }
  };

  const copyRecipientEmails = async (emails: string[], label: string) => {
    await copyText(emails.join('\n'), `${label} copiados (${emails.length}).`);
  };

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

  const previewFrameHtml = useMemo(() => {
    const normalizedQuickLinks = quickLinks
      .map((link) => ({
        label: link.label.trim(),
        url: normalizeNewsletterPreviewUrl(link.url),
      }))
      .filter((link) => link.label && link.url);

    return buildNewsletterPreviewHtml({
      title: subject.trim() || 'UrbanFix | Vista previa de campaña',
      previewText: previewText.trim() || 'Vista previa del newsletter de UrbanFix.',
      intro: introText.trim(),
      paragraphs: buildNewsletterPreviewBodyText(bodyText),
      heroImageUrl: heroImageUrl.trim(),
      heroImageAlt: heroImageAlt.trim(),
      quickLinks: normalizedQuickLinks,
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      unsubscribeUrl: 'https://www.urbanfix.com.ar/newsletter/baja?preview=1',
    });
  }, [bodyText, ctaLabel, ctaUrl, heroImageAlt, heroImageUrl, introText, previewText, quickLinks, subject]);

  const whatsappCopy = useMemo(() => {
    return buildNewsletterWhatsappCopy({
      subject,
      introText,
      bodyText,
      ctaLabel,
      ctaUrl,
      quickLinks,
    });
  }, [bodyText, ctaLabel, ctaUrl, introText, quickLinks, subject]);

  const normalizedWhatsappImageUrl = useMemo(() => normalizeNewsletterWhatsappUrl(heroImageUrl), [heroImageUrl]);

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

  const handleRetryFailed = async (campaignId: string) => {
    if (!accessToken) return;

    setSubmitting('retry_failed');
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
          mode: 'retry_failed',
          campaignId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo reenviar a los fallidos.');
      }
      setMessage(
        payload?.warnings?.length
          ? `${payload?.message || 'Listo.'} ${payload.warnings.join(' ')}`
          : payload?.message || 'Listo.'
      );
      await loadNewsletter();
    } catch (nextError: any) {
      setError(nextError?.message || 'No se pudo reenviar a los fallidos.');
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Vista previa</p>
                <h4 className="text-base font-semibold text-slate-900">Previsualizacion de la campaña</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Asi se vera el newsletter antes de enviarlo. Se actualiza en vivo con el borrador actual.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <p>
                  <span className="font-semibold text-slate-700">Asunto:</span>{' '}
                  {subject.trim() || 'UrbanFix | Vista previa de campaña'}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-slate-700">Preview:</span>{' '}
                  {previewText.trim() || 'Vista previa del newsletter de UrbanFix.'}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950/95 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <div className="flex items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-medium text-slate-300">UrbanFix newsletter preview</span>
              </div>
              <iframe
                title="Vista previa del newsletter"
                srcDoc={previewFrameHtml}
                className="h-[760px] w-full bg-white"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">WhatsApp</p>
                <h4 className="text-base font-semibold text-slate-900">Version para canal de novedades</h4>
                <p className="mt-1 text-sm text-slate-500">
                  Texto corto listo para copiar y publicar en tu canal de WhatsApp con los links principales.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyText(whatsappCopy, 'Texto de WhatsApp copiado.')}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Copiar texto
                </button>
                {normalizedWhatsappImageUrl && (
                  <button
                    type="button"
                    onClick={() => copyText(normalizedWhatsappImageUrl, 'URL de imagen copiada.')}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Copiar imagen
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Texto listo para canal</span>
                <textarea
                  readOnly
                  value={whatsappCopy}
                  rows={12}
                  className="mt-2 min-h-[240px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Publicacion sugerida</p>
                <div className="mt-3 rounded-[24px] border border-emerald-200 bg-[#e9fff5] px-4 py-4 text-sm text-slate-800 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Canal UrbanFix</p>
                  <div className="mt-3 whitespace-pre-wrap leading-6 text-slate-800">
                    {whatsappCopy || 'Completa asunto, cuerpo o links para generar la version de WhatsApp.'}
                  </div>
                </div>
                {normalizedWhatsappImageUrl && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Imagen sugerida</p>
                    <p className="mt-2 break-all text-sm text-slate-600">{normalizedWhatsappImageUrl}</p>
                  </div>
                )}
              </div>
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
                  {(() => {
                    const recipients = campaign.recipients || [];
                    const sentRecipients = recipients.filter((recipient) => recipient.status === 'sent');
                    const failedRecipients = recipients.filter((recipient) => recipient.status === 'failed');
                    const pendingRecipients = recipients.filter((recipient) => recipient.status === 'pending');
                    const failedErrors = Array.from(
                      new Set(failedRecipients.map((recipient) => String(recipient.error_text || '').trim()).filter(Boolean))
                    );

                    return (
                      <>
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
                  {(failedRecipients.length > 0 || pendingRecipients.length > 0 || sentRecipients.length > 0) && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {failedRecipients.length > 0 && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                              Fallidos ({failedRecipients.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleRetryFailed(campaign.id)}
                                disabled={submitting !== null}
                                className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {submitting === 'retry_failed' ? 'Reenviando...' : 'Reenviar fallidos'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  copyRecipientEmails(
                                    failedRecipients.map((recipient) => recipient.email),
                                    `Fallidos de ${campaign.subject}`
                                  )
                                }
                                className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
                              >
                                Copiar fallidos
                              </button>
                            </div>
                          </div>
                          {failedErrors.length > 0 && (
                            <p className="mt-2 text-xs leading-5 text-rose-700">{failedErrors.join(' | ')}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {failedRecipients.map((recipient) => (
                              <span
                                key={`${campaign.id}-failed-${recipient.email}`}
                                className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] text-rose-700"
                              >
                                {recipient.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {pendingRecipients.length > 0 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                              Pendientes ({pendingRecipients.length})
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                copyRecipientEmails(
                                  pendingRecipients.map((recipient) => recipient.email),
                                  `Pendientes de ${campaign.subject}`
                                )
                              }
                              className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:border-amber-300 hover:text-amber-800"
                            >
                              Copiar pendientes
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {pendingRecipients.map((recipient) => (
                              <span
                                key={`${campaign.id}-pending-${recipient.email}`}
                                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] text-amber-700"
                              >
                                {recipient.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {sentRecipients.length > 0 && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 lg:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                              Enviados ({sentRecipients.length})
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                copyRecipientEmails(
                                  sentRecipients.map((recipient) => recipient.email),
                                  `Enviados de ${campaign.subject}`
                                )
                              }
                              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
                            >
                              Copiar enviados
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {sentRecipients.map((recipient) => (
                              <span
                                key={`${campaign.id}-sent-${recipient.email}`}
                                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] text-emerald-700"
                              >
                                {recipient.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
