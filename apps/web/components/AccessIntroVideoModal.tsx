'use client';

import { Building2, UserRound, Wrench, X } from 'lucide-react';

type AccessIntroVideoModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectAccess: (href: string) => void;
};

const accessOptions = [
  {
    label: 'Tecnico',
    href: '/tecnicos?perfil=tecnico&mode=login',
    icon: Wrench,
  },
  {
    label: 'Empresa',
    href: '/tecnicos?perfil=empresa&mode=login',
    icon: Building2,
  },
  {
    label: 'Cliente',
    href: '/cliente?mode=login',
    icon: UserRound,
  },
];

export default function AccessIntroVideoModal({ open, onClose, onSelectAccess }: AccessIntroVideoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#120018]/82 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-intro-title"
        className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/14 bg-[#17001f] text-white shadow-2xl lg:grid-cols-[0.8fr_1.2fr]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar video de accesos"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white transition hover:bg-white hover:text-[#2a0338]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-5 sm:p-7 lg:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffbf7a]">Accesos UrbanFix</p>
          <h2 id="access-intro-title" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Tecnico, empresa y cliente
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/72">
            Mira el video y entra con el perfil correcto para no mezclar cuentas.
          </p>

          <div className="mt-6 grid gap-3">
            {accessOptions.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSelectAccess(item.href)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/14 bg-white/[0.08] px-4 py-3 text-left text-sm font-bold text-white transition hover:border-[#ff8f1f] hover:bg-[#ff8f1f] hover:text-[#2a0338]"
                >
                  <span className="inline-flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <span aria-hidden="true">{'->'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-black">
          <video
            src="/videos/accesos-urbanfix.mp4"
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="aspect-video h-full min-h-[260px] w-full bg-black object-contain"
          >
            Tu navegador no puede reproducir este video.
          </video>
        </div>
      </div>
    </div>
  );
}
