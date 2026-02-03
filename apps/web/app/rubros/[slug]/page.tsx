import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const rubros = {
  electricidad: {
    title: 'Electricidad',
    description:
      'Gestiona presupuestos, clientes y materiales de obra para trabajos electricos con MANO DE OBRA clara.',
    services: ['Instalaciones electricas', 'Tableros y protecciones', 'Reparaciones y mantenimiento'],
  },
  plomeria: {
    title: 'Plomeria',
    description:
      'Organiza presupuestos y materiales de obra para servicios de plomeria con control de MANO DE OBRA.',
    services: ['Instalaciones sanitarias', 'Reparaciones de perdidas', 'Mantenimiento de redes'],
  },
  pintura: {
    title: 'Pintura',
    description:
      'Gestiona presupuestos por ambiente y tipo de terminacion con MANO DE OBRA y materiales de obra.',
    services: ['Interior y exterior', 'Preparacion de superficies', 'Terminaciones y retoques'],
  },
  albanileria: {
    title: 'Albanileria',
    description:
      'Presupuestos de construccion y reformas con control de MANO DE OBRA y materiales por rubro.',
    services: ['Muros y revoques', 'Ampliaciones y reformas', 'Terminaciones generales'],
  },
  gasista: {
    title: 'Gasista',
    description:
      'Gestion de presupuestos y clientes para instalaciones y mantenimiento con MANO DE OBRA segura.',
    services: ['Instalaciones de gas', 'Reparaciones y pruebas', 'Mantenimiento preventivo'],
  },
  impermeabilizacion: {
    title: 'Impermeabilizacion',
    description:
      'Controla presupuestos y materiales de obra para cubiertas y filtraciones con MANO DE OBRA clara.',
    services: ['Cubiertas y terrazas', 'Sellados y membranas', 'Reparacion de filtraciones'],
  },
  techos: {
    title: 'Techos',
    description:
      'Gestiona presupuestos de techos con control de MANO DE OBRA, materiales y etapas de obra.',
    services: ['Estructuras y reparaciones', 'Aislaciones y mantenimiento', 'Inspecciones y refuerzos'],
  },
  carpinteria: {
    title: 'Carpinteria',
    description:
      'Presupuestos y materiales de obra para carpinteria con MANO DE OBRA detallada.',
    services: ['Muebles y placares', 'Aberturas y ajustes', 'Terminaciones finas'],
  },
  herreria: {
    title: 'Herreria',
    description:
      'Gestion de presupuestos para estructuras metalicas con control de MANO DE OBRA y materiales.',
    services: ['Rejas y portones', 'Estructuras metalicas', 'Mantenimiento y refuerzos'],
  },
};

type RubroKey = keyof typeof rubros;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(rubros).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rubro = rubros[slug as RubroKey];
  if (!rubro) {
    return {
      title: 'Rubro no encontrado | UrbanFix',
    };
  }
  return {
    title: `MANO DE OBRA en ${rubro.title} | UrbanFix Argentina`,
    description: `Gestion de presupuestos, gestion de clientes y materiales de obra para ${rubro.title.toLowerCase()} en Argentina.`,
    alternates: { canonical: `/rubros/${slug}` },
  };
}

export default async function RubroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rubro = rubros[slug as RubroKey];
  if (!rubro) return notFound();

  return (
    <div className={sora.className}>
      <div className="min-h-screen bg-[#F5F4F0] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#F5B942]/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#94A3B8]/25 blur-3xl" />

          <main className="relative mx-auto w-full max-w-5xl px-6 py-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">{rubro.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/rubros"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Volver a rubros
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Acceso tecnico
                </a>
              </div>
            </header>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Rubro de construccion
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                {rubro.title} · MANO DE OBRA y presupuestos
              </h1>
              <p className="mt-4 text-sm text-slate-600">{rubro.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/precios-mano-de-obra"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Ver guia de precios
                </a>
                <a
                  href="/urbanfix"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Conocer UrbanFix
                </a>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Servicios frecuentes</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {rubro.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Gestiona precios, materiales de obra y presupuestos por rubro. UrbanFix centraliza la MANO DE OBRA y la
              comunicacion con clientes para trabajos de {rubro.title.toLowerCase()} en Argentina.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
