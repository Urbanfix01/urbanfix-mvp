import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { guias, guiaSlugs } from '../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../components/HomepageVisualShell';

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
      <HomepageVisualShell audience="tecnicos" activeSection="guias" width="narrow">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
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

        <section className="grid gap-4 md:grid-cols-2">
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

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Estas guias no reemplazan asesoramiento profesional. Sirven para organizar presupuestos y comunicar MANO
              DE OBRA de forma clara.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
