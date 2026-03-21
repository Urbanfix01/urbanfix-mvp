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
  return ciudadSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = ciudades[slug as CiudadKey];
  if (!city) {
    return { title: 'Ciudad no encontrada | UrbanFix' };
  }

  return {
    title: `${city.name} | Rubros, tecnicos y referencias UrbanFix`,
    description: `${city.description} Explora rubros, tecnicos disponibles y referencias activas de mano de obra en ${city.name}.`,
    alternates: { canonical: `/ciudades/${slug}` },
  };
}

const getLatestUpdate = (dates: Array<string | null>) => {
  const timestamps = dates
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
};

export default async function CiudadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = ciudades[slug as CiudadKey];
  if (!city) return notFound();

  const rubrosOverview = await getCatalogRubrosOverview();
  const latestUpdate = getLatestUpdate(rubrosOverview.map((item) => item.lastUpdatedAt));
  const featuredRubros = [...rubrosOverview].sort((a, b) => b.itemCount - a.itemCount).slice(0, 6);

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/ciudades" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{city.region}</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold text-white sm:text-4xl">
              {city.name}: rubros, referencias de precios y entrada publica a cobertura
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">{city.description}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">{city.coverageFocus}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/ciudades"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Volver a ciudades
              </Link>
              <Link
                href={`/vidriera?zona=${encodeURIComponent(city.zoneQuery)}`}
                className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Ver tecnicos en {city.name}
              </Link>
              <Link
                href="/guias-precios"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver guias y precios
              </Link>
              <Link
                href={`/precios-mano-de-obra/${slug}`}
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver mano de obra en {city.name}
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Rubros</p>
                <p className="mt-2 text-2xl font-semibold text-white">{rubrosOverview.length}</p>
                <p className="mt-1 text-xs text-white/65">Rutas listas para consultar desde esta ciudad.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Actualizacion</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatDateAr(latestUpdate)}</p>
                <p className="mt-1 text-xs text-white/65">Ultima lectura disponible para referencias activas.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Busqueda</p>
                <p className="mt-2 text-2xl font-semibold text-white">{city.zoneQuery}</p>
                <p className="mt-1 text-xs text-white/65">Termino directo para cruzar la vidriera publica.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Enfoque</p>
                <p className="mt-2 text-base font-semibold leading-6 text-white">{city.highlights[0]}</p>
                <p className="mt-1 text-xs text-white/65">Jurisdiccion preparada para lectura comercial y operativa.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Como aprovechar {city.name}</p>
              <div className="mt-4 space-y-3">
                {city.highlights.map((item, index) => (
                  <div key={`${city.name}-${item}`} className="rounded-2xl border border-white/12 bg-black/15 p-4">
                    <p className="text-sm font-semibold text-white">
                      {index + 1}. {item}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Usa esta jurisdiccion como capa de entrada para ordenar navegacion publica, lectura de rubros y salida a
                      perfiles tecnicos.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubros destacados</p>
                <Link
                  href="/rubros"
                  className="text-xs font-semibold text-[#ffbf7a] transition hover:text-[#ffd5a8]"
                >
                  Ver catalogo completo
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {featuredRubros.map((rubro) => (
                  <Link
                    key={rubro.slug}
                    href={`/rubros/${rubro.slug}/${slug}`}
                    className="rounded-2xl border border-white/12 bg-black/15 p-4 transition hover:border-white/25 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{rubro.label}</p>
                        <p className="mt-1 text-xs text-white/65">
                          {rubro.itemCount} referencias activas en la base publica.
                        </p>
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

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Link
              href={`/vidriera?zona=${encodeURIComponent(city.zoneQuery)}`}
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Vidriera</p>
              <p className="mt-3 text-xl font-semibold text-white">Tecnicos disponibles en {city.name}</p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Salta al mapa publico con la busqueda preparada para esta ciudad y revisa cobertura real.
              </p>
            </Link>

            <Link
              href="/precios-mano-de-obra"
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Guia</p>
              <p className="mt-3 text-xl font-semibold text-white">Referencia para cotizar</p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Usa la guia de precios como capa de contexto antes de bajar a cada rubro especifico.
              </p>
            </Link>

            <Link
              href="/tecnicos"
              className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Operacion</p>
              <p className="mt-3 text-xl font-semibold text-white">Ir a plataforma tecnica</p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                Cuando quieras pasar de lectura publica a operacion real, entra al panel tecnico desde aqui.
              </p>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
