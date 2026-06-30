'use client';

import { useEffect, useState } from 'react';

import AccessIntroVideoModal from './AccessIntroVideoModal';

type AccessIntroVideoGateProps = {
  enabled?: boolean;
};

export default function AccessIntroVideoGate({ enabled = true }: AccessIntroVideoGateProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const timer = window.setTimeout(() => setOpen(true), 250);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const handleSelectAccess = (href: string) => {
    setOpen(false);
    window.location.href = href;
  };

  return (
    <AccessIntroVideoModal
      open={open}
      onClose={() => setOpen(false)}
      onSelectAccess={handleSelectAccess}
    />
  );
}
