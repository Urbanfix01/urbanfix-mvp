import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';

import PublicTopNav from '../../../components/PublicTopNav';
import { ciudades } from '../../../lib/seo/urbanfix-data';
import { guias } from '../../../lib/seo/urbanfix-data';
import { getCatalogRubroBySlug } from '../../../lib/seo/rubro-catalog';
import { getGremioBySlug, gremioSlugs } from '../../../lib/seo/gremios-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const revalidate = 300;

const createRequestHref = '/cliente?mode=register&quick=1&intent=create-request';
const featuredZoneSlugs = ['caba', 'buenos-aires', 'cordoba'];

export function generateStaticParams() {
  return gremioSlugs.map((gremio) => ({ gremio }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gremio: string }>;
}): Promise<Metadata> {
  const { gremio: slug } = await params;
  const gremio = getGremioBySlug(slug);

  if (!gremio) {
    return {
      title: 'Gremio no encontrado | UrbanFix',
    };
  }

  return {
    title: `${gremio.title} | UrbanFix Argentina`,
    description: `${gremio.summary} ${gremio.specialties.join(', ')}.`,
    alternates: { canonical: `/gremios/${gremio.slug}` },
  };
}

export default async function GremioDetailPage({ params }: { params: Promise<{ gremio: string }> }) {
  const { gremio: slug } = await params;
  const gremio = getGremioBySlug(slug);

  if (!gremio) return notFound();

  const relatedGremios = gremio.relatedSlugs
    .map((relatedSlug) => getGremioBySlug(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const linkedRubros = gremio.rubroSlugs
    .map((rubroSlug) => getCatalogRubroBySlug(rubroSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const linkedGuides = gremio.guideSlugs.map((guideSlug) => ({
    slug: guideSlug,
    guide: guias[guideSlug],
  }));
  const featuredZones = featuredZoneSlugs.map((zoneSlug) => ({
    slug: zoneSlug,
    ...(ciudades as Record<string, (typeof ciudades)[keyof typeof ciudades]>)[zoneSlug],
  }));

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/gremios" sticky />

        <div className="relative isolate">
          <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(123,97,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_78%)]" />
          <div className="absolute left-[-120px] top-24 -z-10 h-72 w-72 rounded-full bg-[#ff8f1f]/10 blur-3xl" />
          <div className="absolute right-[-120px] top-16 -z-10 h-80 w-80 rounded-full bg-[#7b61ff]/10 blur-3xl" />

          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-[36px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.9)] sm:p-8 lg:p-10">
              <p className="inline-flex rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
                Ficha de gremio
              </p>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="max-w-3xl">
                  <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">{gremio.title}</h1>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-white/80">{gremio.summary}</p>
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-white/72">{gremio.overview}</p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href="/gremios"
                      className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Volver a gremios
                    </Link>
                    <Link
                      href="/rubros"
                      className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                    >
                      Ver rubros UrbanFix
                    </Link>
                    <Link
                      href="/tecnicos"
                      className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Entrar a la plataforma
                    </Link>
                  </div>
                </div>

                <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,143,31,0.16),rgba(255,143,31,0.06))] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#ffd6a6]">Resumen rapido</p>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[24px] border border-white/12 bg-black/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Especialidades</p>
                      <p className="mt-2 text-3xl font-black text-white">{gremio.specialties.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/12 bg-black/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Aplicaciones tipicas</p>
                      <p className="mt-2 text-sm leading-7 text-white/80">
                        {gremio.useCases[0]}, {gremio.useCases[1].toLowerCase()} y {gremio.useCases[2].toLowerCase()}.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
              <article className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Especialidades incluidas</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Alcances habituales dentro de {gremio.title.toLowerCase()}
                </h2>
                <div className="mt-6 grid gap-3">
                  {gremio.specialties.map((specialty) => (
                    <div
                      key={specialty}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm leading-6 text-white/82">{specialty}</span>
                        <Link
                          href={`/vidriera/gremio/${gremio.slug}?especialidad=${encodeURIComponent(specialty)}`}
                          className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/85 transition hover:border-white/35 hover:text-white"
                        >
                          Ver tecnicos
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Cuando suele intervenir</p>
                <div className="mt-5 grid gap-3">
                  {gremio.useCases.map((useCase, index) => (
                    <div
                      key={useCase}
                      className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff8f1f] text-sm font-bold text-[#2a0338]">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <p className="text-sm leading-7 text-white/82">{useCase}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className="mt-6 rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Descripcion ampliada</p>
              <div className="mt-4 max-w-4xl space-y-4 text-sm leading-7 text-white/78 sm:text-base">
                <p>
                  {gremio.title} suele aparecer en etapas donde el proyecto necesita una resolucion tecnica concreta y
                  un alcance definido. En muchos casos trabaja coordinado con otros gremios para que la obra avance sin
                  superposiciones ni retrabajos.
                </p>
                <p>
                  Dentro de esta categoria aparecen tareas como {gremio.specialties
                    .slice(0, Math.min(3, gremio.specialties.length))
                    .join(', ')
                    .toLowerCase()}. Por eso conviene tratarlo como un bloque tecnico propio al momento de pedir un
                  presupuesto o armar el cronograma.
                </p>
                <p>
                  Si el objetivo es ordenar mejor pedidos, cotizaciones o derivaciones, esta ficha funciona como una
                  referencia rapida para entender que incluye el gremio y con que especialidades suele vincularse.
                </p>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Rubros UrbanFix vinculados</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                      Referencias reales para profundizar este gremio
                    </h2>
                  </div>
                  <Link
                    href="/rubros"
                    className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                  >
                    Ver todos los rubros
                  </Link>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/76">
                  Estos accesos llevan a rubros reales de UrbanFix con estructura de precios, referencias y variantes
                  tecnicas. Si no tienes sesion iniciada, el sistema te pedira acceso antes de entrar.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {linkedRubros.map((rubro) => (
                    <Link
                      key={rubro.slug}
                      href={`/rubros/${rubro.slug}`}
                      className="rounded-[24px] border border-white/12 bg-black/20 p-5 transition hover:-translate-y-1 hover:border-white/28"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#ffd28f]">Rubro real</p>
                      <p className="mt-2 text-lg font-semibold text-white">{rubro.label}</p>
                      <p className="mt-3 text-sm leading-7 text-white/72">
                        Abrir ficha tecnica y referencias cargadas para este frente de trabajo dentro de UrbanFix.
                      </p>
                    </Link>
                  ))}
                </div>
              </article>

              <aside className="rounded-[32px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,143,31,0.1),rgba(123,97,255,0.08))] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffd6a6]">Tecnicos y cobertura</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                      Accesos reales para pasar de contenido a accion
                    </h2>
                  </div>
                  <Link
                    href={`/vidriera/gremio/${gremio.slug}`}
                    className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Explorar vidriera
                  </Link>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/80">
                  La vidriera publica hoy organiza tecnicos por zona y cobertura. Desde aqui puedes ir al mapa publico,
                  revisar ciudades activas o crear una solicitud real dentro de UrbanFix.
                </p>

                <div className="mt-6 grid gap-3">
                  <Link
                    href={`/vidriera/gremio/${gremio.slug}`}
                    className="rounded-[24px] border border-white/12 bg-black/20 p-4 transition hover:border-white/28"
                  >
                    <p className="text-sm font-semibold text-white">Vidriera publica de tecnicos</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Ver mapa, perfiles publicados y cobertura disponible en UrbanFix.
                    </p>
                  </Link>
                  <Link
                    href="/ciudades"
                    className="rounded-[24px] border border-white/12 bg-black/20 p-4 transition hover:border-white/28"
                  >
                    <p className="text-sm font-semibold text-white">Cobertura por ciudad</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Revisar jurisdicciones, zonas indexables y caminos de entrada por territorio.
                    </p>
                  </Link>
                  <Link
                    href={createRequestHref}
                    className="rounded-[24px] border border-white/12 bg-black/20 p-4 transition hover:border-white/28"
                  >
                    <p className="text-sm font-semibold text-white">Crear solicitud</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Publicar un pedido real para que el flujo pase del gremio a una necesidad concreta.
                    </p>
                  </Link>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {featuredZones.map((zone) => (
                    <Link
                      key={zone.slug}
                      href={`/vidriera/${zone.slug}/${gremio.slug}`}
                      className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 transition hover:border-white/28"
                    >
                      <p className="text-sm font-semibold text-white">{zone.name}</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">{zone.region}</p>
                    </Link>
                  ))}
                </div>
              </aside>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Guias SEO relacionadas</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                      Contenido para entender mejor este gremio
                    </h2>
                  </div>
                  <Link
                    href="/guias-precios"
                    className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                  >
                    Ver todas las guias
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {linkedGuides.map(({ slug, guide }) => (
                    <Link
                      key={slug}
                      href={`/guias-precios/${slug}`}
                      className="rounded-[24px] border border-white/12 bg-black/20 p-5 transition hover:-translate-y-1 hover:border-white/28"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#ffd28f]">Guia</p>
                      <p className="mt-2 text-lg font-semibold text-white">{guide.title}</p>
                      <p className="mt-3 text-sm leading-7 text-white/72">{guide.description}</p>
                    </Link>
                  ))}
                </div>
              </article>

              <aside className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Paginas de precios</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                      Entradas de mano de obra para seguir bajando el tema
                    </h2>
                  </div>
                  <Link
                    href="/precios-mano-de-obra"
                    className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Ver mano de obra
                  </Link>
                </div>

                <div className="mt-6 grid gap-3">
                  <Link
                    href="/precios-mano-de-obra"
                    className="rounded-[24px] border border-white/12 bg-black/20 p-4 transition hover:border-white/28"
                  >
                    <p className="text-sm font-semibold text-white">Landing general de mano de obra</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Entrada amplia para precios, rubros, guias y consultas SEO de mano de obra en Argentina.
                    </p>
                  </Link>
                  {featuredZones.map((zone) => (
                    <Link
                      key={`price-${zone.slug}`}
                      href={`/precios-mano-de-obra/${zone.slug}`}
                      className="rounded-[24px] border border-white/12 bg-black/20 p-4 transition hover:border-white/28"
                    >
                      <p className="text-sm font-semibold text-white">Precios en {zone.name}</p>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        Cruza este gremio con referencias geograficas y salida a cobertura en {zone.name}.
                      </p>
                    </Link>
                  ))}
                </div>
              </aside>
            </section>

            <section className="mt-6 rounded-[32px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,143,31,0.1),rgba(123,97,255,0.08))] p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffd6a6]">Relacionados</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Otros gremios que suelen cruzarse</h2>
                </div>
                <Link
                  href="/gremios"
                  className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Ver indice completo
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedGremios.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/gremios/${related.slug}`}
                    className="rounded-[24px] border border-white/12 bg-black/20 p-5 transition hover:-translate-y-1 hover:border-white/28"
                  >
                    <p className="text-lg font-semibold text-white">{related.title}</p>
                    <p className="mt-3 text-sm leading-7 text-white/76">{related.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}