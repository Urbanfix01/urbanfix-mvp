import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { ClipboardList, FileCheck2, MapPinned, Sparkles } from 'lucide-react';
import AuthHashHandler from '../components/AuthHashHandler';
import HomeScrollShowcase from '../components/home/HomeScrollShowcase';
import PublicTopNav from '../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

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
        <PublicTopNav />

        <section className="relative w-full overflow-hidden border-b border-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,4,25,0.2)_0%,rgba(33,0,47,0.25)_38%,rgba(33,0,47,0.95)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.24),transparent_28%),radial-gradient(circle_at_top_right,rgba(123,97,255,0.2),transparent_34%)]" />
          <picture>
            <source media="(max-width: 768px)" srcSet="/hero/home-cover-mobile.png" />
            <img
              src="/hero/home-cover.png"
              alt="UrbanFix app"
              className="block h-auto w-full max-w-full"
              loading="eager"
            />
          </picture>

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8 lg:pb-12">
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
                  disponibles. La home ahora explica el producto desde el primer scroll, no solo desde una imagen.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/urbanfix"
                    className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
                  >
                    Ver todo lo que ofrece
                  </Link>
                  <Link
                    href="/tecnicos"
                    className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/92 transition hover:border-white hover:text-white"
                  >
                    Entrar a la plataforma
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
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

        <HomeScrollShowcase />
      </main>
    </div>
  );
}
