'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, SendHorizontal, Star, X } from 'lucide-react';

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
  const [hasMounted, setHasMounted] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const canSubmit = useMemo(
    () => !submitting && !unavailable && comment.trim().length >= 4,
    [comment, submitting, unavailable]
  );
  const commentLength = comment.trim().length;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

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
        if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los comentarios.');
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
        setError(err?.message || 'No se pudieron cargar los comentarios.');
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
      if (!response.ok) throw new Error(payload?.error || 'No se pudo publicar el comentario.');
      setReviewsCount(Math.max(0, Number(payload?.reviewsCount || 0)));
      setReviews(Array.isArray(payload?.reviews) ? payload.reviews : []);
      setUnavailable(Boolean(payload?.unavailable));
      setHasOwnReview(true);
      setNotice(hasOwnReview ? 'Comentario actualizado.' : 'Comentario publicado.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo publicar el comentario.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profileId) return null;

  const commentsDialog =
    open && hasMounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#13001f]/62 p-3 text-left backdrop-blur-[2px] sm:items-center sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Comentarios del perfil"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Cerrar comentarios"
              onClick={() => setOpen(false)}
            />
            <section className="relative max-h-[92dvh] w-full max-w-[560px] overflow-hidden rounded-[30px] border border-slate-200 bg-white text-slate-950 shadow-[0_34px_120px_-42px_rgba(0,0,0,0.9)]">
              <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff8f1f]/12 text-[#ff8f1f]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Comentarios</p>
                    <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">Contanos como fue</h3>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                      Tu experiencia ayuda a otros clientes a elegir mejor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="max-h-[calc(92dvh-88px)] overflow-y-auto px-4 py-4 sm:px-5">
                <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tu calificacion</p>
                      <p className="mt-1 text-sm font-bold text-slate-600">{rating}/5 estrellas</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-slate-200">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className="rounded-full p-1 text-amber-400 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                          aria-label={`${value} estrellas`}
                        >
                          <Star className={`h-6 w-6 ${value <= rating ? 'fill-current' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={4}
                      maxLength={700}
                      disabled={unavailable || submitting}
                      placeholder="Escribi tu comentario"
                      className="w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
                      <span>Minimo 4 caracteres</span>
                      <span>{commentLength}/700</span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      maxLength={90}
                      disabled={unavailable || submitting}
                      placeholder="Tu nombre (opcional)"
                      className="min-w-0 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={submitReview}
                      disabled={!canSubmit}
                      className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#03081a] px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      {submitting ? 'Guardando' : hasOwnReview ? 'Actualizar' : 'Publicar'}
                    </button>
                  </div>

                  {notice ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{notice}</p> : null}
                  {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p> : null}
                  {unavailable ? (
                    <p className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500">
                      La publicacion de comentarios directos todavia no esta activada.
                    </p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Publicados</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      {reviewsCount} comentario{reviewsCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {loading ? (
                      <p className="rounded-[20px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">Cargando comentarios...</p>
                    ) : reviews.length > 0 ? (
                      reviews.map((review) => (
                        <article key={review.id} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-black text-slate-950">{review.clientName || 'Cliente UrbanFix'}</p>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {review.rating}/5
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-5 text-slate-600">{review.comment}</p>
                        </article>
                      ))
                    ) : (
                      <p className="rounded-[20px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                        Todavia no hay comentarios publicados.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="Comentarios"
        aria-label="Abrir comentarios"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/88 transition hover:scale-105 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
      >
        <MessageCircle className="h-7 w-7 stroke-[2.15]" />
      </button>
      <span className="min-w-4 text-center text-xs font-black text-white/82">{reviewsCount}</span>
      {commentsDialog}
    </div>
  );
}
