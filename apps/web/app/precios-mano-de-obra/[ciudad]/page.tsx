import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../../components/PublicTopNav';
import { ciudades, ciudadSlugs, type CiudadKey } from '../../../lib/seo/urbanfix-data';
import { formatDateAr, getCatalogRubrosOverview } from '../../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const dynamicParams = false;
export const revalidate = 300;

export function generateStaticParams() {
  return ciudadSlugs.map((ciudad) => ({ ciudad }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}): Promise<Metadata> {
  const { ciudad } = await params;
  const city = ciudades[ciudad as CiudadKey];
  if (!city) return { title: 'Ciudad no encontrada | UrbanFix' };

  return {
    title: `Precios de mano de obra en ${city.name} | UrbanFix`,
    description: `Consulta referencias de mano de obra en ${city.name}, cruza rubros, ciudad, cobertura y salida a tecnicos disponibles con UrbanFix.`,
    alternates: { canonical: `/precios-mano-de-obra/${ciudad}` },
    openGraph: {
      title: `Precios de mano de obra en ${city.name} | UrbanFix`,
      description: `Rubros, referencias tecnicas y cobertura publica para mano de obra en ${city.name}.`,
      url: `https://www.urbanfix.com.ar/precios-mano-de-obra/${ciudad}`,
      type: 'website',
    },
  };
}

const getLatestUpdate = (dates: Array<string | null>) => {
  const timestamps = dates
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
};

export default async function PreciosManoDeObraCiudadPage({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}) {
  const { ciudad } = await params;
  const cityKey = ciudad as CiudadKey;
  const city = ciudades[cityKey];
  if (!city) return notFound();

  const rubrosOverview = await getCatalogRubrosOverview();
  const featuredRubros = [...rubrosOverview].sort((a, b) => b.itemCount - a.itemCount).slice(0, 8);
  const latestUpdate = getLatestUpdate(rubrosOverview.map((item) => item.lastUpdatedAt));

  const searchQueries = [
    `precio mano de obra en ${city.name}`,
    `precios de mano de obra ${city.name}`,
    `mano de obra construccion ${city.name}`,
    `presupuesto mano de obra ${city.name}`,
  ];

  const faqItems = [
    {
      question: `UrbanFix publica un precio unico de mano de obra para ${city.name}?`,
      answer: `No. UrbanFix organiza referencias por rubro, ciudad, unidad y especificacion tecnica. ${city.name} funciona como contexto geografico para comparar mejor y no como una tarifa fija universal.`,
    },
    {
      question: `Como conviene usar ${city.name} para presupuestar mejor?`,
      answer: `Conviene cruzar la ciudad con el rubro, la unidad de trabajo y la observacion tecnica del item. Esa combinacion explica mejor la diferencia de precios que una lista plana sin contexto.`,
    },
    {
      question: `Puedo ver tecnicos disponibles en ${city.name} desde esta pagina?`,
      answer: `Si. Esta entrada conecta la busqueda geografica con la vidriera publica y con las rutas de rubros para revisar cobertura y perfiles visibles.`,
    },
  ];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: 'https://www.urbanfix.com.ar/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Precios de mano de obra',
        item: 'https://www.urbanfix.com.ar/precios-mano-de-obra',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city.name,
        item: `https://www.urbanfix.com.ar/precios-mano-de-obra/${ciudad}`,
      },
    ],
  };

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Precios de mano de obra en ${city.name}`,
    description: `Referencias de mano de obra, rubros y cobertura publica para ${city.name}.`,
    url: `https://www.urbanfix.com.ar/precios-mano-de-obra/${ciudad}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: featuredRubros.slice(0, 6).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${item.label} en ${city.name}`,
        url: `https://www.urbanfix.com.ar/rubros/${item.slug}/${ciudad}`,
      })),
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <PublicTopNav sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 sm:p-8 lg:p-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{city.region}</p>
            <h1 className="mt-3 max-w-5xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Precios de mano de obra en {city.name}: rubros, referencias y salida a cobertura real.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/80 sm:text-base">
              Esta pagina responde busquedas geograficas como <strong>{searchQueries[0]}</strong> y{' '}
              <strong>{searchQueries[1]}</strong>. UrbanFix toma {city.name} como contexto para ordenar rubros,
              variantes tecnicas, ciudad y visibilidad publica, sin caer en una tarifa plana unica para todo.
            </p>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/68">{city.coverageFocus}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/precios-mano-de-obra"
                className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
              >
                Volver a mano de obra
              </Link>
              <Link
                href={`/vidriera/${ciudad}`}
                className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver tecnicos en {city.name}
              </Link>
              <Link
                href={`/ciudades/${ciudad}`}
                className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Abrir pagina de {city.name}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Rubros activos</p>
                <p className="mt-2 text-2xl font-semibold text-white">{rubrosOverview.length}</p>
                <p className="mt-2 text-sm text-white/70">Rutas indexables cruzadas con {city.name}.</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Busqueda principal</p>
                <p className="mt-2 text-2xl font-semibold text-white">{city.zoneQuery}</p>
                <p className="mt-2 text-sm text-white/70">Referencia territorial para la vidriera publica.</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Actualizacion</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatDateAr(latestUpdate)}</p>
                <p className="mt-2 text-sm text-white/70">Ultima lectura disponible del catalogo publico.</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Enfoque</p>
                <p className="mt-2 text-base font-semibold text-white">{city.highlights[0]}</p>
                <p className="mt-2 text-sm text-white/70">Entrada territorial alineada con demanda real.</p>
              </article>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Consultas que esta pagina cubre</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Intenciones de busqueda por ciudad</h2>
              <div className="mt-5 space-y-3">
                {searchQueries.map((query, index) => (
                  <div key={query} className="rounded-2xl border border-white/12 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white">
                      {index + 1}. {query}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      UrbanFix la conecta con rubros, especificaciones tecnicas, unidad de trabajo y cobertura publica.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubros destacados en {city.name}</p>
                <Link href="/rubros" className="text-xs font-semibold text-[#ffbf7a] transition hover:text-[#ffd5a8]">
                  Ver catalogo completo
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {featuredRubros.map((rubro) => (
                  <Link
                    key={rubro.slug}
                    href={`/rubros/${rubro.slug}/${ciudad}`}
                    className="rounded-2xl border border-white/12 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{rubro.label}</p>
                        <p className="mt-1 text-xs text-white/65">{rubro.itemCount} referencias activas en la base publica.</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/80">
                        {formatDateAr(rubro.lastUpdatedAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffbf7a]">
                      Abrir rubro en {city.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.04] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Preguntas frecuentes</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Como leer precios de mano de obra en {city.name}</h2>
            <div className="mt-5 space-y-3">
              {faqItems.map((item) => (
                <article key={item.question} className="rounded-2xl border border-white/12 bg-black/20 p-4">
                  <h3 className="text-base font-semibold text-white">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/72">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Link
              href={`/vidriera/${ciudad}`}
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Mapa publico</p>
              <p className="mt-3 text-xl font-semibold text-white">Tecnicos disponibles en {city.name}</p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Lleva la busqueda geografica al mapa y cruza la consulta SEO con perfiles visibles.
              </p>
            </Link>

            <Link
              href={`/ciudades/${ciudad}`}
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Ciudad</p>
              <p className="mt-3 text-xl font-semibold text-white">Abrir vista territorial</p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Usa la pagina de {city.name} para profundizar cobertura, rubros y lectura comercial.
              </p>
            </Link>

            <Link
              href="/tecnicos"
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Operacion</p>
              <p className="mt-3 text-xl font-semibold text-white">Ir a plataforma tecnica</p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Cuando la consulta pase de SEO a operacion, entra directo al panel tecnico.
              </p>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
