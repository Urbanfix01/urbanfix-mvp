'use client';

import Image from 'next/image';

type HomeWindowCard = {
  id: string;
  viewId: string;
  title: string;
  description: string;
  bullets: string[];
  image: string;
};

type HomeWindowNavCardsProps = {
  windows: HomeWindowCard[];
  focusTargetId?: string;
};

export default function HomeWindowNavCards({ windows, focusTargetId = 'vista-principal' }: HomeWindowNavCardsProps) {
  const activateWindow = (viewId: string) => {
    const radio = document.getElementById(viewId) as HTMLInputElement | null;
    if (radio) {
      radio.checked = true;
    }

    const focusTarget = document.getElementById(focusTargetId);
    if (focusTarget) {
      focusTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {windows.map((windowItem) => (
        <article key={windowItem.id} id={windowItem.id}>
          <button
            type="button"
            onClick={() => activateWindow(windowItem.viewId)}
            className="window-panel-target block w-full overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm"
            aria-label={`Abrir ${windowItem.title} con vista completa`}
          >
            <div className="relative">
              <Image
                src={windowItem.image}
                alt={windowItem.title}
                width={960}
                height={540}
                className="h-36 w-full object-cover"
                loading="lazy"
              />
              <span className="absolute left-3 top-3 rounded-full bg-[#0F172A]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                Ventana
              </span>

              {windowItem.id === 'ventana-personas' ? (
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/35 bg-[#0F172A]/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-90 backdrop-blur-sm">
                    Android - Proximamente
                  </span>
                  <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white opacity-90 backdrop-blur-sm">
                    iOS - Proximamente
                  </span>
                </div>
              ) : null}
            </div>

            <div className="p-5">
              <h3 className="text-xl font-semibold text-slate-900">{windowItem.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{windowItem.description}</p>
              <ul className="mt-3 space-y-1.5">
                {windowItem.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[11px] font-medium text-slate-700">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#0D3FA8]" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0D3FA8]">
                Click para abrir vista completa
              </p>
            </div>
          </button>
        </article>
      ))}
    </div>
  );
}
