import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';
import { getRubroTwemojiByName } from '../../lib/seo/rubro-icons';
import { formatDateAr, getCatalogRubrosOverview } from '../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Rubros y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Rubros reales de base para gestionar presupuestos, clientes y mano de obra con datos activos de UrbanFix.',
  alternates: { canonical: '/rubros' },
};

export const revalidate = 300;

export default async function RubrosPage() {
  const rubrosList = await getCatalogRubrosOverview();

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/rubros" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubros UrbanFix</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Gestion de presupuestos y mano de obra por rubro
            </h1>
            <p className="mt-4 text-sm text-white/80">
              Elegi el rubro y accede a una estructura de trabajo clara para presupuestar, ordenar clientes y mantener
              referencias de precios siempre disponibles.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/precios-mano-de-obra"
                className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Ver guia de precios
              </a>
              <a
                href="/ciudades"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver ciudades
              </a>
              <a
                href="/guias-precios"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver guias y precios
              </a>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rubrosList.map((rubro) => {
              const twemojiCode = getRubroTwemojiByName(rubro.label);
              return (
                <a
                  key={rubro.slug}
                  href={`/rubros/${rubro.slug}`}
                  className="group flex min-h-[138px] items-start gap-4 rounded-3xl border border-white/15 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.05]"
                >
                  <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_14px_28px_rgba(10,5,20,0.22)]">
                    <img
                      src={`/twemoji/${twemojiCode}.svg`}
                      alt={`Icono ${rubro.label}`}
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-[0.01em] text-white">{rubro.label}</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      {rubro.itemCount} precios activos en base de datos. Ultima actualizacion:{' '}
                      {formatDateAr(rubro.lastUpdatedAt)}.
                    </p>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffbf7a]">
                      Click para ver precios
                    </p>
                  </div>
                </a>
              );
            })}

            {rubrosList.length === 0 && (
              <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 text-sm text-white/70 sm:col-span-2 lg:col-span-3">
                No hay rubros activos cargados en la base de datos.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
