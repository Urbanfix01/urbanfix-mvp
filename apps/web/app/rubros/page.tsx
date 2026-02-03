import type { Metadata } from 'next';
import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { rubros, rubroSlugs } from '../../lib/seo/urbanfix-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Rubros de construccion y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Gestion de presupuestos, gestion de clientes y materiales de obra por rubro de construccion en Argentina.',
  alternates: { canonical: '/rubros' },
};

export const metadata: Metadata = {
  title: 'Rubros de construccion y mano de obra | UrbanFix Argentina',
  description:
    'Gestiona presupuestos, clientes y materiales de obra por rubro de construccion. Mano de obra para electricidad, plomeria, pintura y mas.',
  alternates: { canonical: '/rubros' },
};

export default function RubrosPage() {
  const rubrosList = rubroSlugs.map((slug) => ({
    slug,
    title: rubros[slug].title,
    description: rubros[slug].description,
  }));

  return (
    <div className={sora.className}>
      <div className="min-h-screen bg-[#F5F4F0] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#F5B942]/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#94A3B8]/25 blur-3xl" />

          <main className="relative mx-auto w-full max-w-6xl px-6 py-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Rubros de construccion</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Volver al inicio
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Acceso tecnico
                </a>
              </div>
            </header>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Rubros y mano de obra
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Gestion de presupuestos y MANO DE OBRA por rubro de construccion
              </h1>
              <p className="mt-4 text-sm text-slate-600">
                UrbanFix organiza presupuestos, clientes y materiales de obra por rubro. Elegi el tipo de trabajo y
                manten tus precios de mano de obra siempre actualizados.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/precios-mano-de-obra"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Ver guia de precios
                </a>
                <a
                  href="/ciudades"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Ver ciudades
                </a>
                <a
                  href="/guias-precios"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Ver guias y precios
                </a>
                <a
                  href="/urbanfix"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Conocer UrbanFix
                </a>
              </div>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rubrosList.map((rubro) => (
                <a
                  key={rubro.slug}
                  href={`/rubros/${rubro.slug}`}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-slate-900">{rubro.title}</p>
                  <p className="mt-2 text-xs text-slate-500">{rubro.description}</p>
                </a>
              ))}
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Cada rubro incluye gestion de presupuestos, gestion de clientes y gestion de materiales de obra con una
              experiencia clara para equipos y clientes.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
