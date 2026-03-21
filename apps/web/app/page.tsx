import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { ClipboardList, FileCheck2, MapPinned, Sparkles } from 'lucide-react';
import AuthHashHandler from '../components/AuthHashHandler';
import HomeHeroTransition from '../components/home/HomeHeroTransition';
import HomeScrollShowcase from '../components/home/HomeScrollShowcase';
import PublicTopNav from '../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description:
    'UrbanFix conecta panel tecnico, presupuestos compartibles, rubros, portal cliente, vidriera publica y mapa de tecnicos en una sola plataforma.',
};

const heroPillars = [
  {
    title: 'Presupuestos compartibles',
    description: 'Link publico, presentacion clara y salida lista para WhatsApp o cliente.',
    icon: FileCheck2,
  },
  {
    title: 'Rubros y mano de obra',
    description: 'Base tecnica para cotizar con variantes, referencias y estructura mas consistente.',
    icon: ClipboardList,
  },
  {
    title: 'Vidriera publica y mapa',
    description: 'Perfiles visibles, cobertura por zona y descubrimiento comercial sin login.',
    icon: MapPinned,
  },
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/" />

        <HomeHeroTransition
          hero={
            <section className="relative w-full border-b border-white/10">
              <picture>
                <source media="(max-width: 768px)" srcSet="/hero/home-cover-mobile.png" />
                <img
                  src="/hero/home-cover.png"
                  alt="UrbanFix app"
                  className="block h-auto w-full max-w-full"
                  loading="eager"
                />
              </picture>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#21002f] via-[#21002f]/70 to-transparent sm:h-44" />
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center sm:bottom-6">
                <div className="rounded-full border border-white/20 bg-black/25 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75 backdrop-blur-md">
                  Baja y descubre la plataforma
                </div>
              </div>
            </section>
          }
        >
          <section className="relative overflow-hidden py-8 sm:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(123,97,255,0.16),transparent_34%)]" />
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-[34px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.9)] sm:p-8 lg:p-10">
                <div className="max-w-4xl">
                  <p className="inline-flex items-center gap-2 rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
                    <Sparkles className="h-3.5 w-3.5" />
                    UrbanFix en una sola capa operativa
                  </p>
                  <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
                    Presupuestar, operar, mostrar cobertura y crecer con una estructura mucho mas clara.
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">
                    UrbanFix une panel tecnico, base de rubros, portal cliente, presencia publica y mapa de tecnicos
                    disponibles. La portada ordena los accesos principales para entender rapido el producto, descargar
                    la app y entrar a la plataforma correcta segun cada perfil.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/urbanfix"
                      className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
                    >
                      Ver todo lo que ofrece
                    </Link>
                    <Link
                      href="/descargar-app"
                      className="rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-5 py-2.5 text-sm font-semibold text-[#ffd6a6] transition hover:border-[#ffb45e] hover:bg-[#ff8f1f]/16 hover:text-white"
                    >
                      Descargar app
                    </Link>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 lg:grid-cols-3">
                  {heroPillars.map((pillar) => {
                    const Icon = pillar.icon;

                    return (
                      <article
                        key={pillar.title}
                        className="rounded-[26px] border border-white/12 bg-black/25 p-4 backdrop-blur-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                            <Icon className="h-4.5 w-4.5 text-[#ffb35e]" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">{pillar.title}</p>
                            <p className="mt-2 text-sm leading-6 text-white/76">{pillar.description}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

              </div>
            </div>
          </section>
        </HomeHeroTransition>

        <HomeScrollShowcase />

        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Sumate al canal de WhatsApp de UrbanFix"
          className="fixed bottom-4 right-4 z-30 flex items-center gap-3 rounded-full border border-white/12 bg-[#1b0a29]/92 px-3 py-3 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[#241138] sm:bottom-6 sm:right-6 sm:px-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
            <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5 fill-white">
              <path d="M19.11 17.32c-.27-.13-1.6-.79-1.85-.88-.25-.09-.43-.13-.61.14-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.13-1.12-.41-2.14-1.31-.79-.71-1.33-1.58-1.49-1.85-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.61-1.48-.83-2.02-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27 0 1.33.97 2.62 1.11 2.8.13.18 1.91 2.92 4.62 4.09.64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.6-.65 1.82-1.28.22-.63.22-1.17.16-1.28-.07-.11-.24-.18-.51-.31Z" />
              <path d="M16.02 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.25.59 4.45 1.7 6.39L3.2 28.8l6.56-1.68c1.86 1.01 3.95 1.54 6.07 1.54h.01c7.07 0 12.8-5.74 12.8-12.81 0-3.42-1.33-6.63-3.75-9.05A12.71 12.71 0 0 0 16.02 3.2Zm-.18 23.26h-.01a10.62 10.62 0 0 1-5.41-1.48l-.39-.23-3.89.99 1.04-3.79-.25-.39a10.58 10.58 0 0 1-1.62-5.63c0-5.86 4.77-10.62 10.64-10.62 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.1 7.52c0 5.87-4.77 10.63-10.63 10.63Z" />
            </svg>
          </span>
          <span className="hidden min-[440px]:block">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Canal WhatsApp
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-white">Sumate a las novedades</span>
          </span>
        </a>
      </main>
    </div>
  );
}
