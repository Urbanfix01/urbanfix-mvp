import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import { rubros, rubroSlugs, type RubroKey } from '../../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../../components/HomepageVisualShell';

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
  const rubro = rubros[slug as RubroKey];
  if (!rubro) return notFound();

  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="tecnicos" activeSection="rubros" width="narrow">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Rubro de construccion</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{rubro.title} · MANO DE OBRA y presupuestos</h1>
          <p className="mt-4 text-sm text-slate-600">{rubro.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/rubros"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Volver a rubros
            </a>
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Servicios frecuentes</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {rubro.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Gestiona precios, materiales de obra y presupuestos por rubro. UrbanFix centraliza la MANO DE OBRA y la
          comunicacion con clientes para trabajos de {rubro.title.toLowerCase()} en Argentina.
        </section>
      </HomepageVisualShell>
    </div>
  );
}

