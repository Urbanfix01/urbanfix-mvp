import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../../components/PublicTopNav';
import { requireRegisteredUser } from '../../../../lib/auth/require-registered-user';
import {
  ciudades,
  ciudadSlugs,
  type CiudadKey,
} from '../../../../lib/seo/urbanfix-data';
import { getRubroTwemojiByName } from '../../../../lib/seo/rubro-icons';
import { formatArs, formatDateAr, getCatalogRubroPriceReferences } from '../../../../lib/seo/rubro-prices';
import {
  getCatalogRubroBySlug,
  resolveCatalogRubroSlug,
  rubroCatalogRouteSlugs,
} from '../../../../lib/seo/rubro-catalog';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rubro: string; ciudad: string }>;
}): Promise<Metadata> {
  const { rubro: incomingRubro, ciudad } = await params;
  const rubro = resolveCatalogRubroSlug(incomingRubro);
  const rubroData = rubro ? getCatalogRubroBySlug(rubro) : null;
  const ciudadData = ciudades[ciudad as CiudadKey];
  if (!rubroData || !ciudadData) {
    return { title: 'Rubro no encontrado | UrbanFix' };
  }
  return {
    title: `MANO DE OBRA de ${rubroData.label} en ${ciudadData.name} | UrbanFix`,
    description: `Gestion de presupuestos, clientes y materiales de obra para ${rubroData.label.toLowerCase()} en ${ciudadData.name}.`,
    alternates: { canonical: `/rubros/${rubro}/${ciudad}` },
  };
}

export default async function RubroCiudadPage({
  params,
}: {
  params: Promise<{ rubro: string; ciudad: string }>;
}) {
  const { rubro: incomingRubro, ciudad } = await params;
  const rubro = resolveCatalogRubroSlug(incomingRubro);
  if (!rubro) return notFound();
  if (rubro !== incomingRubro) {
    permanentRedirect(`/rubros/${rubro}/${ciudad}`);
  }

  await requireRegisteredUser(`/rubros/${rubro}/${ciudad}`);

  const ciudadKey = ciudad as CiudadKey;
  const rubroData = getCatalogRubroBySlug(rubro);
  const ciudadData = ciudades[ciudadKey];
  if (!rubroData || !ciudadData) return notFound();

  const priceData = await getCatalogRubroPriceReferences(rubro, ciudadKey);
  const twemojiCode = getRubroTwemojiByName(rubroData.label);

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
                alt={`Icono ${rubroData.label}`}
                className="h-12 w-12 shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  Precios de {rubroData.label} en {ciudadData.name}
                </h1>
                <p className="mt-4 text-sm text-white/80">
                  Rubro real de base de datos UrbanFix. Organiza presupuestos, clientes y materiales de obra para{' '}
                  {rubroData.label.toLowerCase()} en {ciudadData.name}.
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
                Precios reales de base en {ciudadData.name}
              </p>
              <span className="rounded-full border border-white/25 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffbf7a]">
                Actualizado: {formatDateAr(priceData.lastUpdatedAt)}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-white/15 text-[11px] uppercase tracking-[0.1em] text-white/60">
                    <th className="pb-3 pr-4">Item</th>
                    <th className="pb-3 pr-4">Unidad</th>
                    <th className="pb-3 pr-4">Precio ARS</th>
                    <th className="pb-3">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.items.map((item) => (
                    <tr key={item.id} className="border-b border-white/10 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        {item.technicalNotes && (
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-white/70">
                            <span className="font-semibold text-[#ffbf7a]">Especificacion tecnica:</span>{' '}
                            {item.technicalNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs uppercase text-white/65">{item.unit}</td>
                      <td className="py-3 pr-4 text-sm font-semibold text-white">{formatArs(item.reference)}</td>
                      <td className="py-3 text-xs text-white/70">{item.source}</td>
                    </tr>
                  ))}
                  {priceData.items.length === 0 && (
                    <tr>
                      <td className="py-4 text-sm text-white/70" colSpan={4}>
                        No hay precios cargados para este rubro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-white/65">
              Esta vista usa los valores reales disponibles en la base de datos para este rubro.
            </p>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Cobertura</p>
            <p className="mt-4 text-sm text-white/75">
              Esta vista reutiliza los precios activos del rubro en la base UrbanFix para referencia en{' '}
              {ciudadData.name}. Puedes ajustar valores finales segun urgencia, tipo de trabajo y distancia.
            </p>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6 text-sm text-white/75">
            Gestiona presupuestos, clientes y materiales de obra con mano de obra clara para{' '}
            {rubroData.label.toLowerCase()} en {ciudadData.name}.
          </section>
        </div>
      </main>
    </div>
  );
}
