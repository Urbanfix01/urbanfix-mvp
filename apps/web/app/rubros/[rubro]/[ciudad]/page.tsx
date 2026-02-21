import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import {
  rubros,
  rubroSlugs,
  type RubroKey,
  ciudades,
  ciudadSlugs,
  type CiudadKey,
} from '../../../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const dynamicParams = false;

export function generateStaticParams() {
  return rubroSlugs.flatMap((rubro) => ciudadSlugs.map((ciudad) => ({ rubro, ciudad })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rubro: string; ciudad: string }>;
}): Promise<Metadata> {
  const { rubro, ciudad } = await params;
  const rubroData = rubros[rubro as RubroKey];
  const ciudadData = ciudades[ciudad as CiudadKey];
  if (!rubroData || !ciudadData) {
    return { title: 'Rubro no encontrado | UrbanFix' };
  }
  return {
    title: `MANO DE OBRA de ${rubroData.title} en ${ciudadData.name} | UrbanFix`,
    description: `Gestion de presupuestos, clientes y materiales de obra para ${rubroData.title.toLowerCase()} en ${ciudadData.name}.`,
    alternates: { canonical: `/rubros/${rubro}/${ciudad}` },
  };
}

export default async function RubroCiudadPage({
  params,
}: {
  params: Promise<{ rubro: string; ciudad: string }>;
}) {
  const { rubro, ciudad } = await params;
  const rubroData = rubros[rubro as RubroKey];
  const ciudadData = ciudades[ciudad as CiudadKey];
  if (!rubroData || !ciudadData) return notFound();

  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="tecnicos" activeSection="rubros" width="narrow">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{ciudadData.region}</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            MANO DE OBRA de {rubroData.title} en {ciudadData.name}
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            {rubroData.description} UrbanFix ayuda a ordenar presupuestos, clientes y materiales de obra para{' '}
            {rubroData.title.toLowerCase()} en {ciudadData.name}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/rubros/${rubro}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Volver al rubro
            </a>
            <a
              href={`/ciudades/${ciudad}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver ciudad
            </a>
            <a
              href="/precios-mano-de-obra"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Ver guia de precios
            </a>
            <a
              href="/guias-precios"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver guias y precios
            </a>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Servicios frecuentes</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {rubroData.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Gestiona presupuestos, clientes y materiales de obra con MANO DE OBRA clara para {rubroData.title.toLowerCase()} en{' '}
          {ciudadData.name}.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
