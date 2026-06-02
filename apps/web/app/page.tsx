import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { ArrowDown, ArrowRight, Building2, ClipboardList, FileCheck2, MapPinned, Sparkles, UserRound, Wrench } from 'lucide-react';
import AuthHashHandler from '../components/AuthHashHandler';
import FloatingWhatsappChannelButton from '../components/home/FloatingWhatsappChannelButton';
import HomeHeroTransition from '../components/home/HomeHeroTransition';
import HomeScrollShowcase from '../components/home/HomeScrollShowcase';
import PublicTopNav from '../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';
const CREATE_REQUEST_HREF = '/cliente?mode=register&quick=1&intent=create-request';

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description:
    'UrbanFix conecta panel técnico, presupuestos compartibles, rubros, portal cliente, vidriera pública y mapa de técnicos en una sola plataforma.',
};

const heroPillars = [
  {
    title: 'Presupuestos compartibles',
    description: 'Link público, presentación clara y salida lista para WhatsApp o cliente.',
    icon: FileCheck2,
  },
  {
    title: 'Rubros y mano de obra',
    description: 'Base técnica para cotizar con variantes, referencias y estructura más consistente.',
    icon: ClipboardList,
  },
  {
    title: 'Vidriera pública y mapa',
    description: 'Perfiles visibles, cobertura por zona y descubrimiento comercial sin login.',
    icon: MapPinned,
  },
];

const accessCards = [
  {
    title: 'Cliente',
    eyebrow: 'Pedir un trabajo',
    description: 'Publica una solicitud, deja el contexto y sigue las respuestas desde tu portal.',
    href: '/cliente',
    icon: UserRound,
  },
  {
    title: 'Técnico',
    eyebrow: 'Operar cotizaciones',
    description: 'Cotiza, responde clientes, revisa tu mapa y ordena el estado de tu caja.',
    href: '/tecnicos?perfil=tecnico&mode=login',
    icon: Wrench,
  },
  {
    title: 'Empresa',
    eyebrow: 'Gestionar operación',
    description: 'Coordina responsables, presupuestos y seguimiento comercial desde un acceso propio.',
    href: '/tecnicos?perfil=empresa&mode=login',
    icon: Building2,
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
                <div className="animate-bounce">
                  <ArrowDown className="h-6 w-6 text-white/75" />
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
                    UrbanFix organiza presupuestos, técnicos y clientes en una sola operación.
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">
                    Una entrada clara para cada perfil: el cliente pide, el técnico cotiza y la empresa ordena su operación.
                    La home deja visible el flujo real de la plataforma sin mezclar accesos.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={CREATE_REQUEST_HREF}
                      className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#fff1de]"
                    >
                      Crear solicitud
                    </Link>
                    <Link
                      href="/tecnicos"
                      className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
                    >
                      Entrar a la plataforma
                    </Link>
                    <Link
                      href="/vidriera"
                      className="rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-5 py-2.5 text-sm font-semibold text-[#ffd6a6] transition hover:border-[#ffb45e] hover:bg-[#ff8f1f]/16 hover:text-white"
                    >
                      Ver técnicos disponibles
                    </Link>
                  </div>

                  <div className="mt-8 grid gap-3 lg:grid-cols-3">
                    {accessCards.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className="group rounded-[26px] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] p-4 shadow-[0_22px_60px_-42px_rgba(0,0,0,0.9)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-[#ff8f1f]/55 hover:bg-white/[0.13]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff8f1f] text-[#2a0338] shadow-[0_14px_26px_rgba(255,143,31,0.22)]">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffd6a6]">
                                {item.eyebrow}
                              </p>
                              <p className="mt-1 text-base font-semibold text-white">{item.title}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-white/45 transition group-hover:text-[#ffb35e]" />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-white/70">{item.description}</p>
                        </Link>
                      );
                    })}
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
      </main>
      <FloatingWhatsappChannelButton href={WHATSAPP_CHANNEL_URL} />
    </div>
  );
}
