import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma de gestion tecnica',
  description: 'UrbanFix conecta clientes y tecnicos con una gestion simple de solicitudes, presupuesto y seguimiento.',
};

const metrics = [
  { value: '20 km', label: 'Radio de cobertura' },
  { value: '< 30 s', label: 'Alta de solicitud' },
  { value: '1 link', label: 'Envio de presupuesto' },
];

const modules = [
  {
    title: 'Operativo',
    description: 'Solicitudes por zona, filtros y mapa en tiempo real.',
    href: '/tecnicos',
  },
  {
    title: 'Presupuestos',
    description: 'Cotiza y comparte al cliente en formato profesional.',
    href: '/tecnicos',
  },
  {
    title: 'Perfil publico',
    description: 'Vidriera del tecnico con reputacion y trabajos.',
    href: '/vidriera',
  },
];

const quickActions = [
  { label: 'Ingresar como tecnico', href: '/tecnicos' },
  { label: 'Ingresar como cliente', href: '/cliente' },
  { label: 'Panel admin', href: '/admin' },
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen bg-[linear-gradient(145deg,#f8fafc_0%,#eef2f7_45%,#f6f8fb_100%)] text-slate-900">
        <header className="sticky top-0 z-30 pt-4">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
              <a href="/" className="flex items-center gap-3">
                <img src="/icon.png" alt="UrbanFix" className="h-9 w-9 rounded-xl" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-bold text-slate-900">Inicio</p>
                </div>
              </a>

              <nav className="hidden items-center gap-6 md:flex">
                <a href="/urbanfix" className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
                  Plataforma
                </a>
                <a href="/tecnicos" className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
                  Tecnicos
                </a>
                <a href="/cliente" className="text-sm font-medium text-slate-500 transition hover:text-slate-900">
                  Cliente
                </a>
              </nav>

              <div className="flex items-center gap-2">
                <a
                  href="/cliente"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                >
                  Cliente
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Tecnico
                </a>
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-6xl px-5 pb-8 pt-10 sm:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                Formato minimal
              </p>

              <h1 className="mt-5 text-4xl font-extrabold leading-[0.96] text-slate-900 sm:text-5xl">
                Gestion tecnica
                <br />
                clara y directa
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Accede rapido a solicitudes, presupuestos y perfil profesional sin ruido visual ni bloques extensos de informacion.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {quickActions.map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    {action.label}
                  </a>
                ))}
              </div>

              <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
                {metrics.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xl font-extrabold text-slate-900">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.label}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <img
                src="/playstore/feature-graphic.png"
                alt="Vista general UrbanFix"
                className="h-full w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Modulos principales</h2>
              <a
                href="/tecnicos"
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Abrir panel
              </a>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {modules.map((module) => (
                <article key={module.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-900">{module.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{module.description}</p>
                  <a href={module.href} className="mt-4 inline-flex text-xs font-semibold text-amber-700 hover:text-amber-800">
                    Ir al modulo
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
