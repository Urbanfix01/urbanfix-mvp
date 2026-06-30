import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../components/PublicTopNav';
import { requireRegisteredUser } from '../../../lib/auth/require-registered-user';
import { getServerCountryPreference } from '../../../lib/country-preference-server';
import { getLaborCountrySettings } from '../../../lib/labor-country-config';
import { laborPriceIndex } from '../../../lib/labor-price-index';
import { ciudades, ciudadSlugs } from '../../../lib/seo/urbanfix-data';
import { getRubroTwemojiByName } from '../../../lib/seo/rubro-icons';
import { formatCountryLaborPrice, getCatalogRubroPriceReferences } from '../../../lib/seo/rubro-prices';
import {
  getCatalogRubroBySlug,
  resolveCatalogRubroSlug,
  rubroCatalogRouteSlugs,
} from '../../../lib/seo/rubro-catalog';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rubro: string }>;
}): Promise<Metadata> {
  const { rubro: incomingSlug } = await params;
  const slug = resolveCatalogRubroSlug(incomingSlug);
  const rubro = slug ? getCatalogRubroBySlug(slug) : null;
  if (!rubro) {
    return {
      title: 'Rubro no encontrado | UrbanFix',
    };
  }
  return {
    title: `MANO DE OBRA en ${rubro.label} | UrbanFix Argentina`,
    description: `Gestion de presupuestos, clientes y materiales de obra para ${rubro.label.toLowerCase()} en Argentina con datos reales.`,
    alternates: { canonical: `/rubros/${slug}` },
  };
}

export default async function RubroPage({ params }: { params: Promise<{ rubro: string }> }) {
  const { rubro: incomingSlug } = await params;
  const slug = resolveCatalogRubroSlug(incomingSlug);
  if (!slug) return notFound();
  if (slug !== incomingSlug) {
    permanentRedirect(`/rubros/${slug}`);
  }

  await requireRegisteredUser(`/rubros/${slug}`);

  const rubro = getCatalogRubroBySlug(slug);
  if (!rubro) return notFound();

  const selectedCountry = await getServerCountryPreference();
  const laborCountry = getLaborCountrySettings(selectedCountry);
  const priceData = await getCatalogRubroPriceReferences(slug, undefined, selectedCountry);
  const twemojiCode = getRubroTwemojiByName(rubro.label);

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/rubros" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubro UrbanFix</p>
            <div className="mt-3 flex items-start gap-4">
              <img
                src={`/twemoji/${twemojiCode}.svg`}
                alt={`Icono ${rubro.label}`}
                className="h-12 w-12 shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  {rubro.label} - precios de mano de obra y presupuesto
                </h1>
                <p className="mt-4 text-sm text-white/80">
                  {laborCountry.laborPricingAvailable
                    ? `Rubro real de base de datos UrbanFix con valores activos para ${laborCountry.country}.`
                    : `${laborCountry.pendingLabel} ${laborCountry.operationalLabel}.`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/rubros"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Volver a rubros
              </a>
              <a
                href="/precios-mano-de-obra"
                className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Ver guia de precios
              </a>
              <a
                href="/tecnicos"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Acceso tecnico
              </a>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Precios vigentes de mano de obra</p>
              <span className="rounded-full border border-white/25 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffbf7a]">
                {laborCountry.laborPricingAvailable ? laborPriceIndex.activeLabel : laborCountry.operationalLabel}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-white/15 text-[11px] uppercase tracking-[0.1em] text-white/60">
                    <th className="pb-3 pr-4">Item</th>
                    <th className="pb-3 pr-4">Unidad</th>
                    <th className="pb-3 pr-4">
                      {laborCountry.laborPricingAvailable ? `Precio vigente ${laborCountry.currencyCode}` : 'Precio'}
                    </th>
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
                      <td className="py-3 pr-4 text-sm font-semibold text-white">
                        {formatCountryLaborPrice(item.reference, selectedCountry)}
                      </td>
                      <td className="py-3 text-xs text-white/70">{item.source}</td>
                    </tr>
                  ))}
                  {priceData.items.length === 0 && (
                    <tr>
                      <td className="py-4 text-sm text-white/70" colSpan={4}>
                        {laborCountry.laborPricingAvailable
                          ? 'No hay precios cargados para este rubro.'
                          : `Todavia no hay precios cargados para ${rubro.label} en ${laborCountry.country}.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-white/65">
              {laborCountry.laborPricingAvailable
                ? 'Valores de mano de obra vigentes en UrbanFix, calculados desde la base importada y el ajuste activo.'
                : 'La estructura queda preparada para activar valores propios cuando exista una base por pais.'}
            </p>
          </section>

          {laborCountry.laborPricingAvailable && (
            <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Precios por ciudad</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ciudadSlugs.map((ciudadSlug) => (
                  <a
                    key={ciudadSlug}
                    href={`/rubros/${slug}/${ciudadSlug}`}
                    className="rounded-2xl border border-white/15 bg-white/[0.02] p-4 transition hover:border-white/30 hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">{ciudades[ciudadSlug].name}</p>
                    <p className="mt-1 text-xs text-white/65">{ciudades[ciudadSlug].region}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#ffbf7a]">
                      Ver precios en esta ciudad
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6 text-sm text-white/75">
            {laborCountry.laborPricingAvailable
              ? `Gestiona precios, materiales de obra y presupuestos por rubro. UrbanFix centraliza la mano de obra y la comunicacion con clientes para trabajos de ${rubro.label.toLowerCase()} en ${laborCountry.country}.`
              : `Este rubro queda pendiente para ${laborCountry.country}. Cuando se cargue su base local, el selector de pais mostrara nombres y valores propios.`}
          </section>
        </div>
      </main>
    </div>
  );
}
