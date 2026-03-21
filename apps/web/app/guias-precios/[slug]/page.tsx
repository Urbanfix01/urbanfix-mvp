import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import { guias, guiaSlugs, type GuiaKey } from '../../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const guideSupportContent: Partial<
  Record<
    GuiaKey,
    {
      relatedLinks: Array<{ href: string; label: string; note: string }>;
      faq: Array<{ question: string; answer: string }>;
    }
  >
> = {
  'guia-presupuestos-construccion': {
    relatedLinks: [
      { href: '/precios-mano-de-obra', label: 'Precios de mano de obra', note: 'Landing principal para consultas amplias.' },
      { href: '/rubros', label: 'Rubros con referencias', note: 'Cruce rapido de presupuesto por especialidad.' },
      { href: '/ciudades', label: 'Ciudades y provincias', note: 'Contexto geografico para comparar cobertura.' },
    ],
    faq: [
      {
        question: 'Que no deberia faltar en un presupuesto de construccion?',
        answer:
          'Datos del cliente, alcance, mano de obra, materiales, tiempos, condiciones y aclaraciones sobre exclusiones o adicionales.',
      },
      {
        question: 'UrbanFix reemplaza la validacion profesional de una obra?',
        answer:
          'No. Sirve para ordenar referencias y comunicar mejor, pero la validacion tecnica final sigue dependiendo del profesional responsable.',
      },
    ],
  },
  'guia-mano-de-obra': {
    relatedLinks: [
      { href: '/precios-mano-de-obra', label: 'Landing de mano de obra', note: 'Entrada general para consultas SEO y referencias.' },
      { href: '/rubros/electricidad', label: 'Ver electricidad', note: 'Ejemplo de variantes por unidad y observacion tecnica.' },
      { href: '/rubros/refrigeracion', label: 'Ver refrigeracion', note: 'Rangos FG y diferencias de instalacion.' },
    ],
    faq: [
      {
        question: 'La mano de obra se compara mejor por hora o por item?',
        answer:
          'Depende del rubro. En muchos casos conviene por item, m2, m3, boca o metro; la hora sirve mas como referencia de respaldo.',
      },
      {
        question: 'Por que dos items con el mismo nombre pueden tener distinto valor?',
        answer:
          'Porque cambia la unidad, la zona, la complejidad o la especificacion tecnica. El nombre por si solo no alcanza para comparar.',
      },
    ],
  },
  'guia-materiales-obra': {
    relatedLinks: [
      { href: '/guias-precios/guia-presupuestos-construccion', label: 'Guia de presupuestos', note: 'Complemento para separar materiales y mano de obra.' },
      { href: '/precios-mano-de-obra', label: 'Ver precios de mano de obra', note: 'Cruza materiales con referencias laborales.' },
      { href: '/urbanfix', label: 'Ver que ofrece UrbanFix', note: 'Contexto general de la plataforma.' },
    ],
    faq: [
      {
        question: 'Conviene mostrar todos los materiales al cliente?',
        answer:
          'No siempre. A veces conviene resumir por bloque o etapa, segun el nivel de detalle que necesite el cliente para aprobar.',
      },
      {
        question: 'Cada cuanto deberia revisar precios de materiales?',
        answer:
          'Con frecuencia corta. En rubros sensibles o inestables, revisar semanalmente evita desfasajes grandes en el presupuesto final.',
      },
    ],
  },
  'precio-mano-de-obra-electricidad': {
    relatedLinks: [
      { href: '/rubros/electricidad', label: 'Ver rubro electricidad', note: 'Bocas, metros y variantes tecnicas publicas.' },
      { href: '/precios-mano-de-obra', label: 'Volver a mano de obra', note: 'Entrada principal para comparacion por rubro.' },
      { href: '/ciudades/buenos-aires', label: 'Cruzar con Buenos Aires', note: 'Referencia territorial para una provincia de alta demanda.' },
    ],
    faq: [
      {
        question: 'Que conviene mirar primero en un precio de electricidad?',
        answer:
          'La unidad de referencia y la observacion tecnica. Sin esos dos datos, comparar precios de electricidad suele llevar a errores.',
      },
      {
        question: 'Un precio por boca incluye siempre amurado y cierre?',
        answer:
          'No. Justamente ese tipo de detalle suele ir en la observacion tecnica y explica parte de la diferencia de valor.',
      },
    ],
  },
  'precio-mano-de-obra-refrigeracion': {
    relatedLinks: [
      { href: '/rubros/refrigeracion', label: 'Ver rubro refrigeracion', note: 'Instalaciones, FG, desmontajes y variantes.' },
      { href: '/vidriera', label: 'Ver tecnicos disponibles', note: 'Cruza la consulta SEO con perfiles visibles.' },
      { href: '/precios-mano-de-obra', label: 'Volver a mano de obra', note: 'Mas consultas relacionadas y guias.' },
    ],
    faq: [
      {
        question: 'El rango FG deberia verse junto al precio?',
        answer:
          'Si. En refrigeracion es uno de los datos tecnicos que mas explica por que una instalacion estandar cambia de valor.',
      },
      {
        question: 'Instalacion, preinstalacion y mantenimiento se comparan juntos?',
        answer:
          'No. Son trabajos distintos y conviene separarlos para evitar mezclar referencias incompatibles.',
      },
    ],
  },
  'precio-mano-de-obra-sanitarios': {
    relatedLinks: [
      { href: '/rubros/sanitarios', label: 'Ver rubro sanitarios', note: 'Agua, cloaca, pluvial y ventilacion con base publica.' },
      { href: '/ciudades', label: 'Explorar por ciudad', note: 'Cruza el rubro con provincias y cobertura.' },
      { href: '/precios-mano-de-obra', label: 'Volver a mano de obra', note: 'Mas referencias generales y FAQs.' },
    ],
    faq: [
      {
        question: 'El diametro cambia el precio sanitario aunque el item se llame parecido?',
        answer:
          'Si. Diametro, tipo de red y acceso suelen alterar fuerte la referencia, aunque el nombre comercial parezca el mismo.',
      },
      {
        question: 'Conviene presupuestar sanitarios por metro o por punto?',
        answer:
          'Depende del tramo y del tipo de trabajo. Por eso la unidad debe quedar visible antes de comparar valores.',
      },
    ],
  },
  'precio-mano-de-obra-pintura': {
    relatedLinks: [
      { href: '/rubros/pinturas', label: 'Ver rubro pinturas', note: 'Referencias por trabajo y variantes tecnicas.' },
      { href: '/ciudades/caba', label: 'Cruzar con CABA', note: 'Consulta urbana para comparar demanda y cobertura.' },
      { href: '/precios-mano-de-obra', label: 'Volver a mano de obra', note: 'Mas consultas relacionadas y FAQs.' },
    ],
    faq: [
      {
        question: 'El m2 alcanza para comparar pintura?',
        answer:
          'No siempre. La preparacion de superficie, cantidad de manos y terminacion suelen definir buena parte del precio real.',
      },
      {
        question: 'Se deberia separar preparacion y aplicacion final?',
        answer:
          'Si. Cuando lo separas, el cliente entiende mejor el alcance y el precio deja de parecer arbitrario.',
      },
    ],
  },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return guiaSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guia = guias[slug as GuiaKey];
  if (!guia) return { title: 'Guia no encontrada | UrbanFix' };
  return {
    title: `${guia.title} | UrbanFix Argentina`,
    description: guia.description,
    alternates: { canonical: `/guias-precios/${slug}` },
  };
}

export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guiaKey = slug as GuiaKey;
  const guia = guias[guiaKey];
  if (!guia) return notFound();
  const supportContent = guideSupportContent[guiaKey];
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
        name: 'Guias de precios',
        item: 'https://www.urbanfix.com.ar/guias-precios',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guia.title,
        item: `https://www.urbanfix.com.ar/guias-precios/${slug}`,
      },
    ],
  };
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guia.title,
    description: guia.description,
    mainEntityOfPage: `https://www.urbanfix.com.ar/guias-precios/${slug}`,
    author: {
      '@type': 'Organization',
      name: 'UrbanFix',
    },
    publisher: {
      '@type': 'Organization',
      name: 'UrbanFix',
    },
  };
  const faqJsonLd = supportContent?.faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: supportContent.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="tecnicos" activeSection="guias" width="narrow">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        {faqJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        ) : null}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Guia practica</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{guia.title}</h1>
          <p className="mt-4 text-sm text-slate-600">{guia.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/guias-precios"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Volver a guias
            </a>
            <a
              href="/precios-mano-de-obra"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Ver guia de precios
            </a>
            <a
              href="/rubros"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver rubros
            </a>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            Esta guia esta pensada para capturar busquedas especificas y repartirlas hacia rubros, ciudades y referencias
            de mano de obra con una estructura mas clara para Google y para el usuario final.
          </p>
        </section>

        <section className="space-y-6">
          {guia.sections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{section.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {supportContent?.relatedLinks?.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Siguiente paso</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Enlaces relacionados para profundizar</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {supportContent.relatedLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{item.note}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {supportContent?.faq?.length ? (
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Preguntas frecuentes</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Dudas tipicas sobre esta consulta</h2>
            <div className="mt-5 space-y-3">
              {supportContent.faq.map((item) => (
                <article key={item.question} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Usa esta guia para organizar presupuestos, clientes y MANO DE OBRA. Ajusta los detalles segun tu rubro y
          zona.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
