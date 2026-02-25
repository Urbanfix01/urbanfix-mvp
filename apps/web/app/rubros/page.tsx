import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { rubros, rubroSlugs } from '../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Rubros de construccion y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Gestion de presupuestos, gestion de clientes y materiales de obra por rubro de construccion. MANO DE OBRA para electricidad, plomeria, pintura y mas.',
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
      <HomepageVisualShell audience="tecnicos" activeSection="rubros">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rubros y mano de obra</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Gestion de presupuestos y MANO DE OBRA por rubro de construccion
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            UrbanFix organiza presupuestos, clientes y materiales de obra por rubro. Elegi el tipo de trabajo y manten
            tus precios de mano de obra siempre actualizados.
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

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Cada rubro incluye gestion de presupuestos, gestion de clientes y gestion de materiales de obra con una
          experiencia clara para equipos y clientes.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
