'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { hasSupabaseConfig, supabase } from '../../lib/supabase/supabase';

type ProfileLikeButtonProps = {
  profileId: string;
  initialCount?: number;
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
};

type LikeApiPayload = {
  likesCount?: number;
  liked?: boolean;
  error?: string;
  unavailable?: boolean;
};

const buildAuthHeaders = async () => {
  const headers: HeadersInit = {};
  if (!hasSupabaseConfig) return headers;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || '';
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore session read errors and continue as anonymous.
  }
  return headers;
};

export default function ProfileLikeButton({
  profileId,
  initialCount = 0,
  className = '',
  compact = false,
  iconOnly = false,
}: ProfileLikeButtonProps) {
  const [likesCount, setLikesCount] = useState<number>(Math.max(0, Number(initialCount || 0)));
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError('');
      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(`/api/tecnicos/${profileId}/likes`, {
          method: 'GET',
          headers,
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = (await response.json()) as LikeApiPayload;
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar likes.');
        if (!mounted) return;
        setLikesCount(Math.max(0, Number(payload?.likesCount || 0)));
        setLiked(Boolean(payload?.liked));
        setUnavailable(Boolean(payload?.unavailable));
      } catch (err: any) {
        if (!mounted) return;
        setUnavailable(false);
        setError('Los likes no estan disponibles ahora.');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  const handleToggleLike = async () => {
    if (loading || unavailable) return;
    setLoading(true);
    setError('');
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(await buildAuthHeaders()),
      } as HeadersInit;
      const response = await fetch(`/api/tecnicos/${profileId}/likes`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const payload = (await response.json()) as LikeApiPayload;
      if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar el like.');
      setLikesCount(Math.max(0, Number(payload?.likesCount || 0)));
      setLiked(Boolean(payload?.liked));
      setUnavailable(Boolean(payload?.unavailable));
    } catch (err: any) {
      setUnavailable(false);
      setError('No se pudo actualizar el like en este momento.');
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={loading || unavailable}
          title={unavailable ? 'Me gusta no disponible' : liked ? 'Quitar Me gusta' : 'Me gusta'}
          aria-label={unavailable ? 'Me gusta no disponible' : liked ? 'Quitar Me gusta' : 'Me gusta'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/88 transition hover:scale-105 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Heart className={`h-7 w-7 stroke-[2.15] ${liked ? 'fill-rose-500 text-rose-400' : ''}`} />
        </button>
        <span className="min-w-4 text-center text-xs font-black text-white/82">
          {unavailable ? '-' : likesCount}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleToggleLike}
        disabled={loading || unavailable}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          unavailable
            ? 'border-slate-200 bg-slate-100 text-slate-400'
            : liked
            ? 'border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:text-rose-800'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
        <span>{unavailable ? 'Pronto' : liked ? 'Te gusta' : 'Me gusta'}</span>
        <span className={compact ? '' : 'rounded-full bg-black/5 px-2 py-0.5'}>{likesCount}</span>
      </button>
      {unavailable ? (
        <p className="mt-1 text-[11px] font-semibold text-slate-500">Los likes se habilitaran pronto.</p>
      ) : error ? (
        <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
