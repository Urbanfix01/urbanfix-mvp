'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';

type ProfileShareActionsProps = {
  profileId: string;
  shareUrl: string;
  title: string;
  initialCount?: number;
  className?: string;
};

type SharesApiPayload = {
  sharesCount?: number;
  unavailable?: boolean;
  alreadyCounted?: boolean;
  error?: string;
};

const copyToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export default function ProfileShareActions({
  profileId,
  shareUrl,
  title,
  initialCount = 0,
  className = '',
}: ProfileShareActionsProps) {
  const [sharesCount, setSharesCount] = useState(Math.max(0, Number(initialCount || 0)));
  const [unavailable, setUnavailable] = useState(false);

  const resolvedShareUrl = useMemo(() => String(shareUrl || '').trim(), [shareUrl]);
  const shareText = useMemo(
    () => `Mira este perfil de UrbanFix: ${title}\n${resolvedShareUrl}`,
    [resolvedShareUrl, title]
  );

  useEffect(() => {
    if (!profileId) return;
    let mounted = true;
    const loadCount = async () => {
      try {
        const response = await fetch(`/api/tecnicos/${profileId}/shares`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = (await response.json()) as SharesApiPayload;
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el contador.');
        if (!mounted) return;
        setSharesCount(Math.max(0, Number(payload?.sharesCount || 0)));
        setUnavailable(Boolean(payload?.unavailable));
      } catch {
        if (!mounted) return;
        setUnavailable(true);
      }
    };
    loadCount();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  const registerShare = async (channel: 'whatsapp' | 'facebook' | 'copy' | 'native') => {
    if (!profileId) return;
    try {
      const response = await fetch(`/api/tecnicos/${profileId}/shares`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel }),
      });
      const payload = (await response.json()) as SharesApiPayload;
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar el compartido.');
      setSharesCount(Math.max(0, Number(payload?.sharesCount || 0)));
      setUnavailable(Boolean(payload?.unavailable));
    } catch {
      setUnavailable(true);
    }
  };

  const handleShare = async () => {
    if (!resolvedShareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url: resolvedShareUrl });
        await registerShare('native');
        return;
      }
      await copyToClipboard(shareText);
      await registerShare('copy');
    } catch {
      // Keep sharing silent when the browser blocks native share and clipboard.
    }
  };

  if (!profileId || !resolvedShareUrl) return null;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleShare}
        title="Compartir perfil"
        aria-label="Compartir perfil"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/88 transition hover:scale-105 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
      >
        <Send className="h-7 w-7 stroke-[2.15]" />
      </button>
      <span
        className="min-w-4 text-center text-xs font-black text-white/82"
        title="Visitantes que compartieron este perfil"
      >
        {unavailable ? '-' : sharesCount}
      </span>
    </div>
  );
}
