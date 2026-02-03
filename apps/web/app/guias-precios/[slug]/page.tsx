import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sora } from 'next/font/google';
import { guias, guiaSlugs, type GuiaKey } from '../../../lib/seo/urbanfix-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

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
  const guia = guias[slug as GuiaKey];
  if (!guia) return notFound();

  return (
    <div className={sora.className}>
      <div className="min-h-screen bg-[#F5F4F0] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#F5B942]/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#94A3B8]/25 blur-3xl" />

          <main className="relative mx-auto w-full max-w-4xl px-6 py-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Guia</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/guias-precios"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Volver a guias
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
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Guia practica</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{guia.title}</h1>
              <p className="mt-4 text-sm text-slate-600">{guia.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
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
            </section>

            <section className="mt-8 space-y-6">
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

            <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Usa esta guia para organizar presupuestos, clientes y MANO DE OBRA. Ajusta los detalles segun tu rubro y
              zona.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
