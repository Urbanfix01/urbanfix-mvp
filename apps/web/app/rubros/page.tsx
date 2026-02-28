import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';
import { rubros, rubroSlugs } from '../../lib/seo/urbanfix-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Rubros de construccion y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Gestion de presupuestos, gestion de clientes y materiales de obra por rubro de construccion. MANO DE OBRA para electricidad, plomeria, pintura y mas.',
  alternates: { canonical: '/rubros' },
};

export default function RubrosPage() {
  const rubrosList = rubroSlugs.map((slug) => ({
    slug,
    title: rubros[slug].title,
    description: rubros[slug].description,
  }));

  return (
    <div className={sora.className}>
      <main className="min-h-screen bg-[#21002f] text-white">
        <PublicTopNav activeHref="/rubros" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubros UrbanFix</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Gestion de presupuestos y mano de obra por rubro de construccion
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
            {rubrosList.map((rubro) => (
              <a
                key={rubro.slug}
                href={`/rubros/${rubro.slug}`}
                className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.05]"
              >
                <p className="text-sm font-semibold text-white">{rubro.title}</p>
                <p className="mt-2 text-xs text-white/70">{rubro.description}</p>
              </a>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
