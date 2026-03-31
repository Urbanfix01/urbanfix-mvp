import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';

import PublicTopNav from '../../components/PublicTopNav';
import { gremiosCatalog } from '../../lib/seo/gremios-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Gremios de Construccion | UrbanFix Argentina',
  description:
    'Indice y glosario simple de gremios del mundo de la construccion para ubicar rapido especialidades y tipos de trabajo.',
  alternates: { canonical: '/gremios' },
};

const totalEspecialidades = gremiosCatalog.reduce((acc, gremio) => acc + gremio.specialties.length, 0);

export default function GremiosPage() {
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
                Ventana de Gremios
              </p>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="max-w-3xl">
                  <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                    Indice y glosario simple de gremios para obra, instalaciones y mantenimiento.
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                    Esta ventana ordena en una sola lista los gremios mas comunes del mundo de la construccion para que
                    puedas ubicar rapido especialidades, alcances y tipos de trabajo.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href="#indice-gremios"
                      className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                    >
                      Ver indice
                    </Link>
                    <Link
                      href="#glosario-gremios"
                      className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Ir al glosario
                    </Link>
                    <Link
                      href="/rubros"
                      className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Ver rubros UrbanFix
                    </Link>
                  </div>
                </div>

                <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,143,31,0.16),rgba(255,143,31,0.06))] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#ffd6a6]">Lectura rapida</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-[24px] border border-white/12 bg-black/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Gremios listados</p>
                      <p className="mt-2 text-3xl font-black text-white">{gremiosCatalog.length}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/12 bg-black/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Especialidades</p>
                      <p className="mt-2 text-3xl font-black text-white">{totalEspecialidades}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/12 bg-black/20 px-4 py-4 sm:col-span-2 lg:col-span-1">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Uso recomendado</p>
                      <p className="mt-2 text-sm leading-7 text-white/80">
                        Sirve como guia inicial para orientar pedidos, presupuestos y derivaciones entre gremios.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section
              id="indice-gremios"
              className="mt-6 rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Indice</p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Lista general de gremios</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {gremiosCatalog.map((gremio, index) => (
                  <Link
                    key={gremio.slug}
                    href={`/gremios/${gremio.slug}`}
                    className="rounded-[24px] border border-white/12 bg-black/20 px-4 py-4 transition hover:-translate-y-1 hover:border-white/28"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffd28f]">{String(index + 1).padStart(2, '0')}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{gremio.title}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/55">
                      Abrir ficha individual
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section id="glosario-gremios" className="mt-6">
              <div className="max-w-3xl rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Glosario</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Especialidades agrupadas en modo lista simple
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/76">
                  Cada bloque resume el gremio, enumera sus trabajos mas frecuentes y ahora abre una ficha propia con
                  mas detalle.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {gremiosCatalog.map((gremio) => (
                  <article
                    key={gremio.slug}
                    id={gremio.slug}
                    className="rounded-[30px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffd28f]">Gremio</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">{gremio.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/74">{gremio.summary}</p>
                    <ul className="mt-5 space-y-3">
                      {gremio.specialties.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-[#ff8f1f]" aria-hidden="true" />
                          <span className="text-sm leading-6 text-white/84">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/gremios/${gremio.slug}`}
                        className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                      >
                        Ver detalle del gremio
                      </Link>
                      <a
                        href={`#${gremio.slug}`}
                        className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white/85 transition hover:border-white hover:text-white"
                      >
                        Mantener en esta lista
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}