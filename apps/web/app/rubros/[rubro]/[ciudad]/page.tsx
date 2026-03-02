import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../../components/PublicTopNav';
import {
  ciudades,
  ciudadSlugs,
  rubros,
  rubroSlugs,
  type CiudadKey,
  type RubroKey,
} from '../../../../lib/seo/urbanfix-data';
import { rubroTwemoji } from '../../../../lib/seo/rubro-icons';
import {
  formatArs,
  getCityMultiplierLabel,
  getRubroPriceReferences,
} from '../../../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
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
  const rubroKey = rubro as RubroKey;
  const ciudadKey = ciudad as CiudadKey;
  const rubroData = rubros[rubroKey];
  const ciudadData = ciudades[ciudadKey];
  if (!rubroData || !ciudadData) return notFound();

  const priceReferences = getRubroPriceReferences(rubroKey, ciudadKey);
  const twemojiCode = rubroTwemoji[rubroKey];

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/rubros" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{ciudadData.region}</p>
            <div className="mt-3 flex items-start gap-4">
              <img
                src={`/twemoji/${twemojiCode}.svg`}
                alt={`Icono ${rubroData.title}`}
                className="h-12 w-12 shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  Precios de {rubroData.title} en {ciudadData.name}
                </h1>
                <p className="mt-4 text-sm text-white/80">
                  {rubroData.description} UrbanFix ayuda a ordenar presupuestos, clientes y materiales de obra para{' '}
                  {rubroData.title.toLowerCase()} en {ciudadData.name}.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`/rubros/${rubro}`}
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Volver al rubro
              </a>
              <a
                href={`/ciudades/${ciudad}`}
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver ciudad
              </a>
              <a
                href="/precios-mano-de-obra"
                className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Ver guia de precios
              </a>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                Precios orientativos en {ciudadData.name}
              </p>
              <span className="rounded-full border border-white/25 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffbf7a]">
                {getCityMultiplierLabel(ciudadKey)}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-white/15 text-[11px] uppercase tracking-[0.1em] text-white/60">
                    <th className="pb-3 pr-4">Item</th>
                    <th className="pb-3 pr-4">Unidad</th>
                    <th className="pb-3 pr-4">Referencia ARS</th>
                    <th className="pb-3">Rango sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {priceReferences.map((item) => (
                    <tr key={item.label} className="border-b border-white/10 last:border-0">
                      <td className="py-3 pr-4 text-sm font-medium text-white">{item.label}</td>
                      <td className="py-3 pr-4 text-xs uppercase text-white/65">{item.unit}</td>
                      <td className="py-3 pr-4 text-sm font-semibold text-white">{formatArs(item.reference)}</td>
                      <td className="py-3 text-xs text-white/70">
                        {formatArs(item.min)} a {formatArs(item.max)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-white/65">
              Valores orientativos para arrancar. Ajusta segun urgencia, accesos, horario y condiciones del trabajo.
            </p>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Servicios frecuentes</p>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              {rubroData.services.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6 text-sm text-white/75">
            Gestiona presupuestos, clientes y materiales de obra con mano de obra clara para{' '}
            {rubroData.title.toLowerCase()} en {ciudadData.name}.
          </section>
        </div>
      </main>
    </div>
  );
}
