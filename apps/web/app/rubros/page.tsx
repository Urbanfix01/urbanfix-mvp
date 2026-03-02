import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';
import { rubros, rubroSlugs, type RubroKey } from '../../lib/seo/urbanfix-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Rubros y MANO DE OBRA | UrbanFix Argentina',
  description:
    'Gestion de presupuestos, gestion de clientes y materiales de obra por rubro. MANO DE OBRA para electricidad, plomeria, pintura y mas.',
  alternates: { canonical: '/rubros' },
};

const rubroTwemoji: Record<RubroKey, string> = {
  electricidad: '26a1',
  plomeria: '1f527',
  pintura: '1f3a8',
  albanileria: '1f9f1',
  gasista: '1f525',
  impermeabilizacion: '1f4a7',
  techos: '1f3e0',
  carpinteria: '1fa9a',
  herreria: '1f529',
  'aire-acondicionado': '2744',
  refrigeracion: '1f9ca',
  cerrajeria: '1f510',
  'durlock-yeseria': '1f9f1',
  'pisos-revestimientos': '1f9e9',
  'vidrieria-aberturas': '1fa9f',
  soldadura: '2699',
  'portones-automaticos': '1f6aa',
  'alarmas-camaras': '1f4f9',
  'redes-datos': '1f310',
  calefaccion: '2668',
  'energia-solar': '2600',
  'jardineria-poda': '1f33f',
  'limpieza-post-obra': '1f9f9',
  'control-plagas': '1f41c',
  'mantenimiento-piletas': '1f3ca',
  'mantenimiento-consorcios': '1f3e2',
  'mantenimiento-comercial': '1f3ec',
  demolicion: '1f9e8',
  excavaciones: '26cf',
  'movimiento-suelo': '1f69c',
  'hormigon-armado': '1f3d7',
  'estructuras-metalicas': '1f3ed',
  'banos-cocinas': '1f6bf',
  'reformas-integrales': '1f6e0',
};

export default function RubrosPage() {
  const rubrosList = rubroSlugs.map((slug) => ({
    slug,
    title: rubros[slug].title,
    description: rubros[slug].description,
    twemojiCode: rubroTwemoji[slug],
  }));

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
            {rubrosList.map((rubro) => (
              <a
                key={rubro.slug}
                href={`/rubros/${rubro.slug}`}
                className="group flex items-start gap-4 rounded-3xl border border-white/15 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.05]"
              >
                <img
                  src={`/twemoji/${rubro.twemojiCode}.svg`}
                  alt={`Icono ${rubro.title}`}
                  loading="lazy"
                  decoding="async"
                  className="mt-0.5 h-12 w-12 shrink-0 transition-transform duration-200 group-hover:scale-105"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{rubro.title}</p>
                  <p className="mt-2 text-xs text-white/70">{rubro.description}</p>
                </div>
              </a>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
