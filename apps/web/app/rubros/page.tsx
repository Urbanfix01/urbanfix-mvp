import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';
import { requireRegisteredUser } from '../../lib/auth/require-registered-user';
import { laborPriceIndex } from '../../lib/labor-price-index';
import { getRubroTwemojiByName } from '../../lib/seo/rubro-icons';
import { getCatalogRubrosOverview } from '../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Rubros y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Rubros reales de base para gestionar presupuestos, clientes y mano de obra con datos activos de UrbanFix.',
  alternates: { canonical: '/rubros' },
};

export const revalidate = 300;

export default async function RubrosPage() {
  await requireRegisteredUser('/rubros');
  const rubrosList = await getCatalogRubrosOverview();

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/rubros" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] px-5 py-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffbf7a]">
                  Indice de aumento INDEC
                </p>
                <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  Mano de obra actualizada por {laborPriceIndex.sourceLabel}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:justify-end">
                <div className="rounded-2xl border border-white/12 bg-black/20 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Variacion mensual</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    +{laborPriceIndex.monthlyPercent.toLocaleString('es-AR')}%
                  </p>
                </div>
                <div className="rounded-2xl border border-[#ff8f1f]/40 bg-[#ff8f1f]/12 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Ajuste aplicado</p>
                  <p className="mt-1 text-xl font-semibold text-[#ffbf7a]">
                    +{laborPriceIndex.accumulatedPercent.toLocaleString('es-AR')}%
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                <p>
                  Periodo: <span className="font-semibold text-white">{laborPriceIndex.periodLabel}</span>
                </p>
                <p>
                  Actualizado: <span className="font-semibold text-white">{laborPriceIndex.publishedAtLabel}</span>
                </p>
                <a
                  href={laborPriceIndex.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs font-semibold text-[#ffbf7a] transition hover:text-white"
                >
                  Fuente INDEC
                </a>
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03]">
            {rubrosList.length > 0 && (
              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 border-b border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45 sm:grid-cols-[minmax(0,1fr)_130px_120px]">
                <span>Rubro</span>
                <span className="hidden text-right sm:block">Valores activos</span>
                <span className="text-right">Accion</span>
              </div>
            )}

            <div className="divide-y divide-white/10">
              {rubrosList.map((rubro) => {
                const twemojiCode = getRubroTwemojiByName(rubro.label);
                return (
                  <a
                    key={rubro.slug}
                    href={`/rubros/${rubro.slug}`}
                    className="group grid gap-3 px-5 py-4 transition hover:bg-white/[0.05] sm:grid-cols-[minmax(0,1fr)_130px_120px] sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_10px_22px_rgba(10,5,20,0.18)]">
                        <img
                          src={`/twemoji/${twemojiCode}.svg`}
                          alt={`Icono ${rubro.label}`}
                          loading="lazy"
                          decoding="async"
                          className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-105"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold tracking-[0.01em] text-white">
                          {rubro.label}
                        </p>
                        <p className="mt-1 text-xs text-white/55 sm:hidden">
                          {rubro.itemCount} valores activos
                        </p>
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold text-white">{rubro.itemCount}</p>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">valores</p>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex rounded-full border border-[#ff8f1f]/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffbf7a] transition group-hover:bg-[#ff8f1f] group-hover:text-[#2a0338]">
                        Ver precios
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>

            {rubrosList.length === 0 && (
              <div className="p-6 text-sm text-white/70">
                No hay rubros activos cargados en la base de datos.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
