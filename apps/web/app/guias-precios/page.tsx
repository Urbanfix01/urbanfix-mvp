import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { guias, guiaSlugs } from '../../lib/seo/urbanfix-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Guias de presupuestos y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Guias para gestionar presupuestos, clientes y materiales de obra con MANO DE OBRA clara en construccion.',
  alternates: { canonical: '/guias-precios' },
};

export default function GuiasPreciosPage() {
  const guides = guiaSlugs.map((slug) => ({
    slug,
    title: guias[slug].title,
    description: guias[slug].description,
  }));

  return (
    <div className={sora.className}>
      <div className="min-h-screen bg-[#F5F4F0] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#F5B942]/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#94A3B8]/25 blur-3xl" />

          <main className="relative mx-auto w-full max-w-5xl px-6 py-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Guias y precios</p>
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Guias</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                Guias de presupuestos, precios y MANO DE OBRA
              </h1>
              <p className="mt-4 text-sm text-slate-600">
                Recursos para ordenar presupuestos, clientes y materiales de obra. Guias pensadas para construccion y
                mantenimiento en Argentina.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/rubros"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Ver rubros de construccion
                </a>
                <a
                  href="/ciudades"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Ver ciudades
                </a>
              </div>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-2">
              {guides.map((guide) => (
                <a
                  key={guide.slug}
                  href={`/guias-precios/${guide.slug}`}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-slate-900">{guide.title}</p>
                  <p className="mt-2 text-xs text-slate-500">{guide.description}</p>
                </a>
              ))}
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Estas guias no reemplazan asesoramiento profesional. Sirven para organizar presupuestos y comunicar MANO
              DE OBRA de forma clara.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
