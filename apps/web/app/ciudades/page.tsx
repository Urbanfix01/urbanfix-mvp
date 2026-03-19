import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';
import { ciudades, ciudadSlugs } from '../../lib/seo/urbanfix-data';
import { formatDateAr, getCatalogRubrosOverview } from '../../lib/seo/rubro-prices';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Ciudades con cobertura UrbanFix | Rubros y precios por zona',
  description:
    'Explora ciudades activas de UrbanFix, cruza rubros, referencias de mano de obra y tecnicos disponibles por zona.',
  alternates: { canonical: '/ciudades' },
};

export const revalidate = 300;

const getLatestUpdate = (dates: Array<string | null>) => {
  const timestamps = dates
    .map((value) => (value ? new Date(value).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
};

export default async function CiudadesPage() {
  const rubrosOverview = await getCatalogRubrosOverview();
  const totalRubros = rubrosOverview.length;
  const totalReferences = rubrosOverview.reduce((acc, item) => acc + item.itemCount, 0);
  const latestUpdate = getLatestUpdate(rubrosOverview.map((item) => item.lastUpdatedAt));
  const featuredRubros = [...rubrosOverview].sort((a, b) => b.itemCount - a.itemCount).slice(0, 6);
  const cities = ciudadSlugs.map((slug) => ({
    slug,
    ...ciudades[slug],
  }));

  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/ciudades" sticky />

        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Cobertura por ciudad</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold text-white sm:text-4xl">
              Ciudades activas para navegar rubros, referencias tecnicas y presencia operativa
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">
              Esta pestaña ordena la capa publica de UrbanFix por ciudad. Desde aqui puedes entrar a rubros con
              precios base, cruzar tecnicos disponibles en la vidriera y usar una misma estructura para ventas,
              presupuesto y expansion comercial.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/rubros"
                className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
              >
                Ver rubros activos
              </Link>
              <Link
                href="/vidriera"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver mapa de tecnicos
              </Link>
              <Link
                href="/guias-precios"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Ver guias y precios
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Ciudades</p>
                <p className="mt-2 text-2xl font-semibold text-white">{cities.length}</p>
                <p className="mt-1 text-xs text-white/65">Entradas publicas activas para cobertura y navegacion.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Rubros base</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totalRubros}</p>
                <p className="mt-1 text-xs text-white/65">Rubros listos para entrar por ciudad o por categoria.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Referencias</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totalReferences}</p>
                <p className="mt-1 text-xs text-white/65">Filas activas de mano de obra visibles desde la base.</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Actualizacion</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatDateAr(latestUpdate)}</p>
                <p className="mt-1 text-xs text-white/65">Ultima lectura de datos disponible para la capa publica.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {cities.map((city) => (
              <article
                key={city.slug}
                className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">{city.region}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{city.name}</h2>
                  </div>
                  <span className="rounded-full border border-[#ff8f1f]/45 bg-[#ff8f1f]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffd29d]">
                    Capa publica activa
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-white/80">{city.description}</p>
                <p className="mt-3 text-sm leading-6 text-white/65">{city.coverageFocus}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {city.highlights.map((item) => (
                    <span
                      key={`${city.slug}-${item}`}
                      className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-white/80"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/ciudades/${city.slug}`}
                    className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Explorar ciudad
                  </Link>
                  <Link
                    href={`/vidriera?zona=${encodeURIComponent(city.zoneQuery)}`}
                    className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                  >
                    Ver tecnicos en zona
                  </Link>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Como usar esta vista</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                  <p className="text-sm font-semibold text-white">1. Entra por ciudad</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Usa la ciudad como puerta de entrada para ordenar cobertura, foco comercial y rutas de consulta.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                  <p className="text-sm font-semibold text-white">2. Baja a rubros</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Desde cada ciudad saltas a rubros con referencias de mano de obra y observacion tecnica visible.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-black/15 p-4">
                  <p className="text-sm font-semibold text-white">3. Cruza la vidriera</p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Completa la lectura publica con el mapa de tecnicos disponibles y el acceso a perfiles publicados.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Rubros mas activos</p>
                <Link
                  href="/rubros"
                  className="text-xs font-semibold text-[#ffbf7a] transition hover:text-[#ffd5a8]"
                >
                  Ver todos
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {featuredRubros.map((rubro) => (
                  <Link
                    key={rubro.slug}
                    href={`/rubros/${rubro.slug}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-black/15 px-4 py-3 transition hover:border-white/25 hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{rubro.label}</p>
                      <p className="mt-1 text-xs text-white/65">Ultima actualizacion: {formatDateAr(rubro.lastUpdatedAt)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/85">
                      {rubro.itemCount} refs
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
