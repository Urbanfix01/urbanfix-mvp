import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { ArrowUpRight, ClipboardList, FileCheck2, MapPinned, MessageCircle, Sparkles } from 'lucide-react';
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

const demoEntries = [
  {
    title: 'Demo publica en vivo',
    description: 'Explora el mapa y la vidriera de tecnicos publicados sin login.',
    href: '/vidriera',
    cta: 'Abrir demo',
    icon: MapPinned,
  },
  {
    title: 'Rubros reales de base',
    description: 'Revisa precios, variantes tecnicas y estructura real del catalogo UrbanFix.',
    href: '/rubros',
    cta: 'Ver rubros',
    icon: ClipboardList,
  },
  {
    title: 'Demo guiada',
    description: 'Si quieres ver el flujo completo, te llevamos por la plataforma en una presentacion.',
    href: '/contacto',
    cta: 'Solicitar demo',
    icon: MessageCircle,
  },
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav />

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
        </section>

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
                  disponibles. Ahora la home tambien ofrece una demo real para ver el producto sin instalar nada y
                  entender rapido por donde entra cada flujo.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/vidriera"
                    className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
                  >
                    Ver demo en vivo
                  </Link>
                  <Link
                    href="/urbanfix"
                    className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/92 transition hover:border-white hover:text-white"
                  >
                    Ver todo lo que ofrece
                  </Link>
                  <Link
                    href="/contacto"
                    className="rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-5 py-2.5 text-sm font-semibold text-[#ffd6a6] transition hover:border-[#ffb45e] hover:bg-[#ff8f1f]/16 hover:text-white"
                  >
                    Solicitar demo guiada
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

              <div className="mt-6 rounded-[28px] border border-[#ff8f1f]/22 bg-[linear-gradient(135deg,rgba(255,143,31,0.12),rgba(32,5,53,0.88))] p-5 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
                      Demo activa en homepage
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                      Prueba UrbanFix desde la web y entiende el producto antes de entrar.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/76">
                      Puedes abrir la demo publica, recorrer los rubros reales o pedir una demo guiada para ver el
                      flujo completo de tecnico, cliente y operacion.
                    </p>
                  </div>
                  <Link
                    href="/vidriera"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#fff0dc]"
                  >
                    Abrir demo ahora
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {demoEntries.map((entry) => {
                    const Icon = entry.icon;

                    return (
                      <Link
                        key={entry.title}
                        href={entry.href}
                        className="group rounded-[24px] border border-white/14 bg-black/25 p-4 transition duration-300 hover:-translate-y-1 hover:border-[#ffb35e]/60 hover:bg-black/35"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                            <Icon className="h-4.5 w-4.5 text-[#ffb35e]" />
                          </div>
                          <ArrowUpRight className="h-4.5 w-4.5 text-white/45 transition group-hover:text-white" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-white">{entry.title}</p>
                        <p className="mt-2 text-sm leading-6 text-white/74">{entry.description}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd08c]">
                          {entry.cta}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <HomeScrollShowcase />
      </main>
    </div>
  );
}
