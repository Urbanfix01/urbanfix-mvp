import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description:
    'UrbanFix centraliza solicitudes, geolocalizacion y presupuestos en una sola plataforma para tecnicos y clientes.',
};

const navLinks = [
  { label: 'Servicios', href: '/urbanfix' },
  { label: 'Segmentos', href: '/rubros' },
  { label: 'Impacto', href: '/vidriera' },
];

const stats = [
  { label: 'Solicitudes por zona', value: '20 km' },
  { label: 'Alta de pedido', value: '< 30 s' },
  { label: 'Envio de presupuesto', value: '1 link' },
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen bg-[#0a1730] text-white">
        <div className="relative min-h-screen overflow-hidden">
          <img
            src="/playstore/feature-graphic.png"
            alt="UrbanFix plataforma"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
            loading="eager"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,21,45,0.92)_0%,rgba(8,21,45,0.74)_36%,rgba(8,21,45,0.48)_62%,rgba(8,21,45,0.68)_100%)]" />

          <header className="relative z-20 border-b border-white/20 bg-[#132a4f]/90">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
              <a href="/" className="flex items-center gap-3">
                <img src="/icon.png" alt="UrbanFix" className="h-9 w-9 rounded-lg" />
                <span className="text-xl font-extrabold tracking-tight">
                  URBAN<span className="text-[#ff8f1f]">FIX</span>
                </span>
              </a>

              <div className="flex items-center gap-3 sm:gap-6">
                <nav className="hidden items-center gap-6 md:flex">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-sm font-semibold text-white/85 transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                <a
                  href="/tecnicos"
                  className="rounded-full border border-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-[#132a4f]"
                >
                  Ir a plataforma
                </a>
              </div>
            </div>
          </header>

          <section className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-5 pb-14 pt-14 sm:px-8 lg:min-h-[calc(100vh-70px)] lg:py-16">
            <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-[#132a4f]/72 p-7 backdrop-blur-[2px] sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffbe75]">Plataforma UrbanFix</p>

              <h1 className="mt-4 text-4xl font-extrabold leading-[0.95] sm:text-6xl">
                Conoce la gestion del futuro hoy.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85">
                Centralizamos solicitudes, geolocalizacion de tecnicos y presupuestos en una experiencia simple,
                profesional y lista para escalar.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="/cliente"
                  className="rounded-full bg-[#ff6b1f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff7f39]"
                >
                  Solicitar servicio
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[#132a4f]"
                >
                  Ingreso tecnico
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <article key={stat.label} className="rounded-2xl border border-white/20 bg-[#0f2243]/55 px-4 py-3">
                    <p className="text-lg font-extrabold text-white">{stat.value}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.09em] text-white/70">{stat.label}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
