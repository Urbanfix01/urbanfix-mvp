import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import { guias, guiaSlugs, type GuiaKey } from '../../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const dynamicParams = false;

export function generateStaticParams() {
  return guiaSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guia = guias[slug as GuiaKey];
  if (!guia) return { title: 'Guia no encontrada | UrbanFix' };
  return {
    title: `${guia.title} | UrbanFix Argentina`,
    description: guia.description,
    alternates: { canonical: `/guias-precios/${slug}` },
  };
}

export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guia = guias[slug as GuiaKey];
  if (!guia) return notFound();

  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="tecnicos" activeSection="guias" width="narrow">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Guia practica</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{guia.title}</h1>
          <p className="mt-4 text-sm text-slate-600">{guia.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/guias-precios"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Volver a guias
            </a>
            <a
              href="/precios-mano-de-obra"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Ver guia de precios
            </a>
            <a
              href="/rubros"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver rubros
            </a>
          </div>
        </section>

        <section className="space-y-6">
          {guia.sections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{section.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Usa esta guia para organizar presupuestos, clientes y MANO DE OBRA. Ajusta los detalles segun tu rubro y
          zona.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
