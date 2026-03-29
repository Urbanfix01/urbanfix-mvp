import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';
import { requireRegisteredUser } from '../../lib/auth/require-registered-user';
import { rubroCatalog } from '../../lib/seo/rubro-catalog';
import { ciudades, guias } from '../../lib/seo/urbanfix-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const featuredRubros = [
  'electricidad',
  'refrigeracion',
  'sanitarios',
  'pinturas',
  'mamposteria-y-tabiqueria',
  'gas',
  'contrapisos',
  'vidrieria',
]
  .map((slug) => rubroCatalog.find((item) => item.slug === slug))
  .filter(Boolean);

const featuredCities = ['buenos-aires', 'caba', 'cordoba', 'mendoza', 'rosario', 'salta'].map(
  (slug) => ({
    slug,
    ...(ciudades as Record<string, (typeof ciudades)[keyof typeof ciudades]>)[slug],
  })
);

const guideLinks = [
  { slug: 'guia-mano-de-obra', title: guias['guia-mano-de-obra'].title },
  { slug: 'precio-mano-de-obra-electricidad', title: guias['precio-mano-de-obra-electricidad'].title },
  { slug: 'precio-mano-de-obra-refrigeracion', title: guias['precio-mano-de-obra-refrigeracion'].title },
  { slug: 'precio-mano-de-obra-sanitarios', title: guias['precio-mano-de-obra-sanitarios'].title },
  { slug: 'precio-mano-de-obra-pintura', title: guias['precio-mano-de-obra-pintura'].title },
  { slug: 'guia-presupuestos-construccion', title: guias['guia-presupuestos-construccion'].title },
  { slug: 'guia-materiales-obra', title: guias['guia-materiales-obra'].title },
];

const searchIntentLinks = [
  {
    label: 'Precio mano de obra electricidad',
    href: '/rubros/electricidad',
    note: 'Instalaciones, tableros, bocas, metros y variantes tecnicas.',
  },
  {
    label: 'Precios de mano de obra refrigeracion',
    href: '/rubros/refrigeracion',
    note: 'Instalacion de aire, rangos FG y referencias por tipo de trabajo.',
  },
  {
    label: 'Precio mano de obra sanitarios',
    href: '/rubros/sanitarios',
    note: 'Sanitarios, agua, incendio, cloaca, pluvial y ventilacion.',
  },
  {
    label: 'Precio mano de obra pinturas',
    href: '/rubros/pinturas',
    note: 'Pintura interior, exterior, metros cuadrados y terminaciones.',
  },
  {
    label: 'Precios de mano de obra por ciudad',
    href: '/ciudades',
    note: 'Cruce de rubros con provincias, ciudades y cobertura publica.',
  },
  {
    label: 'Guia de mano de obra en construccion',
    href: '/guias-precios/guia-mano-de-obra',
    note: 'Buenas practicas para ordenar tarifas, alcances y adicionales.',
  },
];

const pricingFactors = [
  'Unidad de trabajo: m2, m3, metro, boca, hora, jornada o unidad.',
  'Especificacion tecnica: diametro, potencia, capacidad, rango, espesor o medida.',
  'Zona: ciudad, provincia y cobertura operativa donde se ejecuta el trabajo.',
  'Complejidad: acceso, altura, preparacion previa, terminacion y adicionales.',
];

const faqItems = [
  {
    question: 'UrbanFix publica un precio unico de mano de obra para toda Argentina?',
    answer:
      'No. UrbanFix organiza referencias por rubro, ciudad, unidad de trabajo y especificacion tecnica. El objetivo es ayudarte a comparar y presupuestar mejor, no mostrar una tarifa universal fija.',
  },
  {
    question: 'Puedo ver precios de mano de obra por especialidad?',
    answer:
      'Si. La base publica enlaza rubros como electricidad, refrigeracion, sanitarios, gas, pinturas, contrapisos y otros. Cada rubro muestra items, unidad, referencia y observaciones tecnicas cuando existen.',
  },
  {
    question: 'Por que dos trabajos con el mismo nombre pueden valer distinto?',
    answer:
      'Porque cambian la unidad de referencia, el rango tecnico, la medida o la complejidad real del trabajo. Por eso UrbanFix muestra variantes tecnicas y no solo un nombre generico.',
  },
];

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Precios de mano de obra en Argentina',
  description:
    'Pagina de UrbanFix para consultar rubros, referencias de mano de obra, ciudades y guias de presupuesto en Argentina.',
  url: 'https://www.urbanfix.com.ar/precios-mano-de-obra',
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: searchIntentLinks.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      url: `https://www.urbanfix.com.ar${item.href}`,
    })),
  },
};

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
  ],
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

export const metadata: Metadata = {
  title: 'Precios de mano de obra en Argentina | Rubros y referencias | UrbanFix',
  description:
    'Consulta referencias de mano de obra por rubro, ciudad y tipo de trabajo. UrbanFix organiza precios orientativos, variantes tecnicas y presupuesto por especialidad en Argentina.',
  alternates: { canonical: '/precios-mano-de-obra' },
  openGraph: {
    title: 'Precios de mano de obra en Argentina | UrbanFix',
    description:
      'Rubros, ciudades, guias y referencias para presupuestar mano de obra con una estructura mas clara.',
    url: 'https://www.urbanfix.com.ar/precios-mano-de-obra',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function PreciosManoDeObraPage() {
  await requireRegisteredUser('/precios-mano-de-obra');
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <PublicTopNav sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 sm:p-8 lg:p-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Busqueda clave UrbanFix</p>
            <h1 className="mt-3 max-w-5xl text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Precios de mano de obra en Argentina, por rubro, ciudad y referencia tecnica.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/80 sm:text-base">
              Esta pagina concentra la intencion de busqueda de quienes buscan precios de mano de obra, valores por
              rubro, referencias para presupuestar y comparacion por ciudad. UrbanFix no muestra una tarifa universal
              fija: organiza precios por especialidad, unidad de trabajo, zona y especificacion tecnica para que el
              presupuesto sea mas claro.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/rubros"
                className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
              >
                Ver rubros con precios
              </Link>
              <Link
                href="/ciudades"
                className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Explorar por ciudad
              </Link>
              <Link
                href="/guias-precios/guia-mano-de-obra"
                className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver guia de mano de obra
              </Link>
              <Link
                href="/tecnicos"
                className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ir a la plataforma
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Rubros activos</p>
                <p className="mt-2 text-2xl font-semibold text-white">{rubroCatalog.length}</p>
                <p className="mt-2 text-sm text-white/70">Consultas por especialidad, tecnica y tipo de trabajo.</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Jurisdicciones</p>
                <p className="mt-2 text-2xl font-semibold text-white">{Object.keys(ciudades).length}</p>
                <p className="mt-2 text-sm text-white/70">Provincias y ciudades para cruzar cobertura y demanda.</p>
              </article>
              <article className="rounded-2xl border border-white/12 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Entradas SEO</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {searchIntentLinks.length + featuredRubros.length + featuredCities.length}
                </p>
                <p className="mt-2 text-sm text-white/70">Consultas frecuentes, rubros destacados y caminos internos.</p>
              </article>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.04] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Busquedas frecuentes</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Consultas que esta pagina resuelve mejor</h2>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {searchIntentLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl border border-white/12 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <p className="text-base font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{item.note}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubros mas buscados</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Entradas directas a precios por especialidad</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {featuredRubros.map((rubro) => (
                  <Link
                    key={rubro!.slug}
                    href={`/rubros/${rubro!.slug}`}
                    className="rounded-2xl border border-white/12 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                  >
                    <p className="text-base font-semibold text-white">{rubro!.label}</p>
                    <p className="mt-2 text-sm text-white/72">
                      Ver precios de mano de obra, variantes tecnicas y referencias de base para {rubro!.label.toLowerCase()}.
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Factores que cambian el precio</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Por que la mano de obra no vale siempre lo mismo</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-white/76">
                {pricingFactors.map((item) => (
                  <li key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.04] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Buscar por provincia o ciudad</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Contexto geografico para precios y cobertura</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {featuredCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/precios-mano-de-obra/${city.slug}`}
                  className="rounded-2xl border border-white/12 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <p className="text-base font-semibold text-white">{city.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#ffbf7a]">{city.region}</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Precios de mano de obra, rubros y cobertura publica para {city.name}.
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.04] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Guias relacionadas</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Contenido de apoyo para presupuestar mejor</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {guideLinks.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guias-precios/${guide.slug}`}
                  className="rounded-2xl border border-white/12 bg-black/20 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <p className="text-base font-semibold text-white">{guide.title}</p>
                  <p className="mt-2 text-sm text-white/72">Abrir guia y cruzarla con rubros, ciudades y referencias.</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-white/[0.04] p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Preguntas frecuentes</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Dudas tipicas sobre precios de mano de obra</h2>
            <div className="mt-5 space-y-3">
              {faqItems.map((item) => (
                <article key={item.question} className="rounded-2xl border border-white/12 bg-black/20 p-4">
                  <h3 className="text-base font-semibold text-white">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/72">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-[#ff8f1f]/10 p-6 text-sm leading-7 text-white/82">
            Si buscas aparecer mejor en Google para consultas como <strong>precios de mano de obra</strong>,{' '}
            <strong>precio mano de obra electricidad</strong> o <strong>precios de refrigeracion en Argentina</strong>,
            esta pagina ahora concentra la entrada principal y la reparte hacia rubros, ciudades y guias con enlaces
            internos descriptivos.
          </section>
        </div>
      </main>
    </div>
  );
}
