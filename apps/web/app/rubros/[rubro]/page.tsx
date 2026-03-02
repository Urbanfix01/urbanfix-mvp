import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../components/PublicTopNav';
import {
  ciudades,
  ciudadSlugs,
  rubros,
  rubroSlugs,
  type RubroKey,
} from '../../../lib/seo/urbanfix-data';
import { rubroTwemoji } from '../../../lib/seo/rubro-icons';
import { formatArs, formatDateAr, getRubroPriceReferences } from '../../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
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

  const priceData = await getRubroPriceReferences(rubroKey);
  const twemojiCode = rubroTwemoji[rubroKey];

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
                alt={`Icono ${rubro.title}`}
                className="h-12 w-12 shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                  {rubro.title} - precios de mano de obra y presupuesto
                </h1>
                <p className="mt-4 text-sm text-white/80">{rubro.description}</p>
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Precios reales de base</p>
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
                      <td className="py-3 pr-4 text-sm font-medium text-white">{item.label}</td>
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
              Valores tomados de la base de datos activa de UrbanFix para mano de obra.
            </p>
          </section>

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

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.03] p-6 text-sm text-white/75">
            Gestiona precios, materiales de obra y presupuestos por rubro. UrbanFix centraliza la mano de obra y la
            comunicacion con clientes para trabajos de {rubro.title.toLowerCase()} en Argentina.
          </section>
        </div>
      </main>
    </div>
  );
}
