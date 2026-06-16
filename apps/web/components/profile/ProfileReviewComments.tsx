'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Star } from 'lucide-react';

type PublicReview = {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  submittedAt?: string;
};

type CommentsApiPayload = {
  reviewsCount?: number;
  rating?: number | null;
  reviews?: PublicReview[];
  ownReview?: PublicReview | null;
  unavailable?: boolean;
  error?: string;
};

type ProfileReviewCommentsProps = {
  profileId: string;
  initialCount?: number;
  className?: string;
};

const clampRating = (value: number) => Math.max(1, Math.min(5, Math.round(Number(value || 5))));

export default function ProfileReviewComments({
  profileId,
  initialCount = 0,
  className = '',
}: ProfileReviewCommentsProps) {
  const [open, setOpen] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(Math.max(0, Number(initialCount || 0)));
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [clientName, setClientName] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [hasOwnReview, setHasOwnReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const canSubmit = useMemo(
    () => !submitting && !unavailable && comment.trim().length >= 4,
    [comment, submitting, unavailable]
  );

  useEffect(() => {
    if (!profileId) return;
    let mounted = true;
    const loadComments = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/tecnicos/${profileId}/comments`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = (await response.json()) as CommentsApiPayload;
        if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar las reseñas.');
        if (!mounted) return;
        setReviewsCount(Math.max(0, Number(payload?.reviewsCount || 0)));
        setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
        setUnavailable(Boolean(payload?.unavailable));
        if (payload?.ownReview) {
          setHasOwnReview(true);
          setClientName(String(payload.ownReview.clientName || '').trim());
          setComment(String(payload.ownReview.comment || '').trim());
          setRating(clampRating(Number(payload.ownReview.rating || 5)));
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'No se pudieron cargar las reseñas.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadComments();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  const submitReview = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice('');
    setError('');
    try {
      const response = await fetch(`/api/tecnicos/${profileId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          comment,
          rating,
        }),
      });
      const payload = (await response.json()) as CommentsApiPayload;
      if (!response.ok) throw new Error(payload?.error || 'No se pudo publicar la reseña.');
      setReviewsCount(Math.max(0, Number(payload?.reviewsCount || 0)));
      setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
      setUnavailable(Boolean(payload?.unavailable));
      setHasOwnReview(true);
      setNotice(hasOwnReview ? 'Reseña actualizada.' : 'Reseña publicada.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo publicar la reseña.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profileId) return null;

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="Comentarios y reseñas"
        aria-label="Abrir comentarios y reseñas"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/88 transition hover:scale-105 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
      >
        <MessageCircle className="h-7 w-7 stroke-[2.15]" />
      </button>
      <span className="min-w-4 text-center text-xs font-black text-white/82">
        {reviewsCount}
      </span>

      {open ? (
        <div className="absolute bottom-12 right-0 z-30 w-[min(390px,calc(100vw-2rem))] rounded-[28px] border border-white/18 bg-white p-4 text-left text-slate-950 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.85)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comentarios</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Reseñas del perfil</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="rounded-full p-1 text-amber-400 transition hover:scale-105"
                  aria-label={`${value} estrellas`}
                >
                  <Star className={`h-5 w-5 ${value <= rating ? 'fill-current' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              maxLength={700}
              disabled={unavailable || submitting}
              placeholder="Escribí tu comentario"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                maxLength={90}
                disabled={unavailable || submitting}
                placeholder="Nombre opcional"
                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={submitReview}
                disabled={!canSubmit}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? 'Guardando' : hasOwnReview ? 'Actualizar' : 'Publicar'}
              </button>
            </div>
            {notice ? <p className="text-xs font-bold text-emerald-700">{notice}</p> : null}
            {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
            {unavailable ? (
              <p className="text-xs font-bold text-slate-500">Las reseñas directas se habilitan al aplicar la actualización.</p>
            ) : null}
          </div>

          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">Cargando reseñas...</p>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-950">{review.clientName || 'Cliente UrbanFix'}</p>
                    <span className="shrink-0 text-xs font-black text-amber-600">{review.rating}/5</span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{review.comment}</p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                Aún no hay comentarios publicados.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
