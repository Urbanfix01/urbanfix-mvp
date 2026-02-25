import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { ciudades, ciudadSlugs } from '../../lib/seo/urbanfix-data';
import HomepageVisualShell from '../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Ciudades y MANO DE OBRA en construccion | UrbanFix Argentina',
  description:
    'Gestion de presupuestos, clientes y materiales de obra por ciudad. Recursos de MANO DE OBRA para construccion en Argentina.',
  alternates: { canonical: '/ciudades' },
};

export default function CiudadesPage() {
  const cities = ciudadSlugs.map((slug) => ({
    slug,
    name: ciudades[slug].name,
    region: ciudades[slug].region,
    description: ciudades[slug].description,
  }));

  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="tecnicos" activeSection="ciudades">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Argentina</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Gestion de presupuestos y MANO DE OBRA por ciudad
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Encuentra recursos por ciudad para gestion de presupuestos, clientes y materiales de obra. UrbanFix ayuda
            a tecnicos a ordenar tarifas y rubros en cada zona.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/rubros"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Ver rubros de construccion
            </a>
            <a
              href="/guias-precios"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver guias y precios
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <a
              key={city.slug}
              href={`/ciudades/${city.slug}`}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-slate-900">{city.name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">{city.region}</p>
              <p className="mt-3 text-xs text-slate-500">{city.description}</p>
            </a>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Cada ciudad incluye gestion de presupuestos, gestion de clientes y MANO DE OBRA con materiales de obra
          organizados por rubro.
        </section>
      </HomepageVisualShell>
    </div>
  );
}
