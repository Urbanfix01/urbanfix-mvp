'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type FloatingWhatsappChannelButtonProps = {
  href: string;
};

export default function FloatingWhatsappChannelButton({ href }: FloatingWhatsappChannelButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Sumate al canal de WhatsApp de UrbanFix"
      className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full border border-white/12 bg-[#1b0a29]/92 px-2.5 py-2.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[#241138] sm:bottom-6 sm:left-6 sm:gap-2.5 sm:px-3 sm:py-2.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
        <svg viewBox="0 0 32 32" aria-hidden="true" className="h-[18px] w-[18px] fill-white">
          <path d="M19.11 17.32c-.27-.13-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.14-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.13-1.12-.41-2.14-1.31-.79-.71-1.33-1.58-1.49-1.85-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.61-1.48-.83-2.02-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27 0 1.33.97 2.62 1.11 2.8.13.18 1.91 2.92 4.62 4.09.64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.6-.65 1.82-1.28.22-.63.22-1.17.16-1.28-.07-.11-.24-.18-.51-.31Z" />
          <path d="M16.02 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.25.59 4.45 1.7 6.39L3.2 28.8l6.56-1.68c1.86 1.01 3.95 1.54 6.07 1.54h.01c7.07 0 12.8-5.74 12.8-12.81 0-3.42-1.33-6.63-3.75-9.05A12.71 12.71 0 0 0 16.02 3.2Zm-.18 23.26h-.01a10.62 10.62 0 0 1-5.41-1.48l-.39-.23-3.89.99 1.04-3.79-.25-.39a10.58 10.58 0 0 1-1.62-5.63c0-5.86 4.77-10.62 10.64-10.62 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.1 7.52c0 5.87-4.77 10.63-10.63 10.63Z" />
        </svg>
      </span>
      <span className="hidden min-[440px]:block">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
          Canal WhatsApp
        </span>
        <span className="mt-0.5 block text-[13px] font-semibold text-white">Sumate a las novedades</span>
      </span>
    </a>,
    document.body
  );
}
