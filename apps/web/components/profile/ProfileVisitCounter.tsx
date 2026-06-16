'use client';

import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

type ProfileVisitCounterProps = {
  profileId: string;
  initialCount?: number;
  className?: string;
  recordVisit?: boolean;
};

type VisitsApiPayload = {
  visitsCount?: number;
  unavailable?: boolean;
  alreadyCounted?: boolean;
  error?: string;
};

const formatVisitCount = (value: number) => {
  const safeValue = Math.max(0, Number(value || 0));
  if (safeValue === 1) return '1 visitante vio este perfil';
  return `${safeValue} visitantes vieron este perfil`;
};

export default function ProfileVisitCounter({
  profileId,
  initialCount = 0,
  className = '',
  recordVisit = true,
}: ProfileVisitCounterProps) {
  const [visitsCount, setVisitsCount] = useState(Math.max(0, Number(initialCount || 0)));
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let mounted = true;
    const registerVisit = async () => {
      try {
        const response = await fetch(`/api/tecnicos/${profileId}/visits`, {
          method: recordVisit ? 'POST' : 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = (await response.json()) as VisitsApiPayload;
        if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar la visita.');
        if (!mounted) return;
        setVisitsCount(Math.max(0, Number(payload?.visitsCount || 0)));
        setUnavailable(Boolean(payload?.unavailable));
      } catch {
        if (!mounted) return;
        setUnavailable(true);
      }
    };
    registerVisit();
    return () => {
      mounted = false;
    };
  }, [profileId, recordVisit]);

  if (!profileId) return null;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/72 ${className}`}>
      <Eye className="h-3.5 w-3.5 text-white/58" />
      <span>{unavailable ? 'Visitas pronto' : formatVisitCount(visitsCount)}</span>
    </div>
  );
}
