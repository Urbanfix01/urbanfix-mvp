import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import {
  ciudades,
  ciudadSlugs,
  rubros,
  rubroSlugs,
  type RubroKey,
} from '../../../lib/seo/urbanfix-data';
import { formatArs, getRubroPriceReferences } from '../../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const dynamicParams = false;

export function generateStaticParams() {
  return rubroSlugs.map((slug) => ({ rubro: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rubro: string }>;
}): Promise<Metadata> {
  const { rubro: slug } = await params;
  const rubro = rubros[slug as RubroKey];
  if (!rubro) {
    return {
      title: 'Rubro no encontrado | UrbanFix',
    };
  }
  return {
    title: `MANO DE OBRA en ${rubro.title} | UrbanFix Argentina`,
    description: `Gestion de presupuestos, gestion de clientes y materiales de obra para ${rubro.title.toLowerCase()} en Argentina.`,
    alternates: { canonical: `/rubros/${slug}` },
  };
}

export default async function RubroPage({ params }: { params: Promise<{ rubro: string }> }) {
  const { rubro: slug } = await params;
  const rubroKey = slug as RubroKey;
  const rubro = rubros[rubroKey];
  if (!rubro) return notFound();

  const priceReferences = getRubroPriceReferences(rubroKey);

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
                  <p className="text-sm font-semibold text-slate-700">{rubro.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/rubros"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Volver a rubros
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rubro</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {rubro.title} - precios de mano de obra y presupuesto
              </h1>
              <p className="mt-4 text-sm text-slate-600">{rubro.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/precios-mano-de-obra"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Ver guia de precios
                </a>
                <a
                  href="/urbanfix"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Conocer UrbanFix
                </a>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Precios orientativos</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-[0.1em] text-slate-500">
                      <th className="pb-3 pr-4">Item</th>
                      <th className="pb-3 pr-4">Unidad</th>
                      <th className="pb-3 pr-4">Referencia ARS</th>
                      <th className="pb-3">Rango sugerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceReferences.map((item) => (
                      <tr key={item.label} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 text-sm font-medium text-slate-900">{item.label}</td>
                        <td className="py-3 pr-4 text-xs uppercase text-slate-500">{item.unit}</td>
                        <td className="py-3 pr-4 text-sm font-semibold text-slate-900">{formatArs(item.reference)}</td>
                        <td className="py-3 text-xs text-slate-600">
                          {formatArs(item.min)} a {formatArs(item.max)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Valores orientativos para arrancar cotizaciones. Puedes ajustarlos segun zona, tipo de obra y urgencia.
              </p>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Precios por ciudad</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ciudadSlugs.map((ciudadSlug) => (
                  <a
                    key={ciudadSlug}
                    href={`/rubros/${slug}/${ciudadSlug}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <p className="text-sm font-semibold text-slate-900">{ciudades[ciudadSlug].name}</p>
                    <p className="mt-1 text-xs text-slate-500">{ciudades[ciudadSlug].region}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-700">Ver precios en esta ciudad</p>
                  </a>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Gestiona precios, materiales de obra y presupuestos por rubro. UrbanFix centraliza la mano de obra y la
              comunicacion con clientes para trabajos de {rubro.title.toLowerCase()} en Argentina.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
