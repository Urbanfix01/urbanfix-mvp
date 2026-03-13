'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Manrope } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

type FeedbackPayload = {
  requestId: string;
  quote: {
    id: string;
    clientName: string | null;
    address: string | null;
    status: string | null;
    statusLabel: string;
    createdAt: string | null;
    totalAmount: number | null;
  };
  technician: {
    id: string;
    displayName: string;
    fullName: string | null;
    businessName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    companyLogoUrl: string | null;
    publicRating: number | null;
    publicReviewsCount: number;
  };
  review: {
    id: string;
    clientName: string | null;
    rating: number;
    comment: string;
    isPublic: boolean;
    submittedAt: string | null;
    updatedAt: string | null;
  } | null;
  feedbackAllowed: boolean;
  disabledReason: string | null;
  clientNameSuggestion: string;
};

const StarIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-6 w-6"
    aria-hidden="true"
  >
    <path d="M12 3.6l2.58 5.23 5.77.84-4.18 4.08.99 5.75L12 16.78 6.84 19.5l.99-5.75-4.18-4.08 5.77-.84L12 3.6z" />
  </svg>
);

const formatDate = (value?: string | null) => {
  if (!value) return 'Fecha no disponible';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (value?: number | null) => {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString('es-AR')}`;
};

export default function QuoteFeedbackPage() {
  const params = useParams();
  const token = String(params?.token || '').trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [payload, setPayload] = useState<FeedbackPayload | null>(null);
  const [clientName, setClientName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Link invalido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`/api/public/quote-feedback/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String(data?.error || 'No pudimos abrir este link.'));
        }
        if (cancelled) return;
        setPayload(data as FeedbackPayload);
        setClientName(String(data?.review?.clientName || data?.clientNameSuggestion || '').trim());
        setRating(Number(data?.review?.rating || 0));
        setComment(String(data?.review?.comment || ''));
        setIsPublic(Boolean(data?.review ? data.review.isPublic : true));
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'No pudimos abrir este link.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const reviewModeLabel = payload?.review ? 'Editar calificacion' : 'Calificar trabajo';
  const canSubmit = payload?.feedbackAllowed && rating >= 1 && !saving;

  const headline = useMemo(() => {
    if (!payload) return 'Calificacion de trabajo';
    return payload.technician.businessName || payload.technician.displayName || 'Calificacion de trabajo';
  }, [payload]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payload?.feedbackAllowed) return;
    if (rating < 1 || rating > 5) {
      setError('Selecciona una cantidad de estrellas antes de enviar.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setNotice('');
      const response = await fetch(`/api/public/quote-feedback/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          rating,
          comment,
          isPublic,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.error || 'No pudimos guardar tu calificacion.'));
      }

      setPayload((current) =>
        current
          ? {
              ...current,
              review: data.review,
              technician: {
                ...current.technician,
                publicReviewsCount: isPublic
                  ? Math.max(current.technician.publicReviewsCount, 1)
                  : current.technician.publicReviewsCount,
              },
            }
          : current
      );
      setNotice('Tu calificacion quedo guardada. Si vuelves a entrar con este mismo link, podras editarla.');
    } catch (err: any) {
      setError(err?.message || 'No pudimos guardar tu calificacion.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`${manrope.className} min-h-screen bg-slate-100 px-4 py-10`}>
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Cargando formulario de calificacion...</p>
        </div>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className={`${manrope.className} min-h-screen bg-slate-100 px-4 py-10`}>
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-500">Link no disponible</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">No pudimos abrir esta calificacion</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!payload) return null;

  const logoUrl = payload.technician.companyLogoUrl || payload.technician.avatarUrl;

  return (
    <div className={`${manrope.className} min-h-screen bg-slate-100 px-4 py-6 sm:py-10`}>
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white sm:px-8 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">UrbanFix</p>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{headline}</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                  Este link le permite al cliente dejar una calificacion verificada sobre el trabajo realizado.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    Referencia #{payload.quote.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    Estado {payload.quote.statusLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    Emitido {formatDate(payload.quote.createdAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={payload.technician.displayName}
                    className="h-16 w-auto rounded-2xl bg-white/95 object-contain p-2"
                  />
                ) : null}
                <p className="mt-4 text-lg font-bold">{payload.technician.displayName}</p>
                {payload.technician.fullName && (
                  <p className="mt-1 text-sm text-slate-300">{payload.technician.fullName}</p>
                )}
                <p className="mt-3 text-sm text-slate-300">
                  {payload.technician.publicRating
                    ? `${payload.technician.publicRating.toFixed(1)} / 5`
                    : 'Sin promedio publico todavia'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trabajo</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cliente</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {payload.quote.clientName || 'Cliente UrbanFix'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Monto final</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatCurrency(payload.quote.totalAmount)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ubicacion</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {payload.quote.address || 'Ubicacion resguardada'}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href={`/p/${payload.quote.id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Ver presupuesto
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {reviewModeLabel}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Deja tu opinion sobre el trabajo</h2>
                  </div>
                  {payload.review && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Ya registrada
                    </span>
                  )}
                </div>

                {!payload.feedbackAllowed && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                    {payload.disabledReason}
                  </div>
                )}

                <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estrellas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          disabled={!payload.feedbackAllowed || saving}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            rating >= value
                              ? 'border-amber-300 bg-amber-50 text-amber-600'
                              : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
                          } ${!payload.feedbackAllowed || saving ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <StarIcon active={rating >= value} />
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="clientName">
                      Tu nombre
                    </label>
                    <input
                      id="clientName"
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      disabled={!payload.feedbackAllowed || saving}
                      placeholder="Como quieres firmar esta resena"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="comment">
                      Comentario
                    </label>
                    <textarea
                      id="comment"
                      rows={5}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      disabled={!payload.feedbackAllowed || saving}
                      placeholder="Cuenta como fue el trabajo, la puntualidad, la calidad y el trato."
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(event) => setIsPublic(event.target.checked)}
                      disabled={!payload.feedbackAllowed || saving}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      Quiero que esta resena pueda usarse de forma publica en el perfil del tecnico.
                    </span>
                  </label>

                  {error && <p className="text-sm text-rose-600">{error}</p>}
                  {notice && <p className="text-sm text-emerald-600">{notice}</p>}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`inline-flex rounded-full px-6 py-3 text-sm font-semibold transition ${
                      canSubmit
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    }`}
                  >
                    {saving ? 'Guardando...' : payload.review ? 'Actualizar calificacion' : 'Enviar calificacion'}
                  </button>
                </form>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Resumen rapido</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{payload.quote.statusLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trabajo</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      #{payload.quote.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fecha</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(payload.quote.createdAt)}</p>
                  </div>
                </div>
              </div>

              {payload.review && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Calificacion actual
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-amber-500">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <StarIcon key={value} active={payload.review ? payload.review.rating >= value : false} />
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {payload.review.clientName || 'Cliente UrbanFix'}
                  </p>
                  {payload.review.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{payload.review.comment}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Ultima actualizacion {formatDate(payload.review.updatedAt || payload.review.submittedAt)}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
