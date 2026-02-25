import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import HomepageVisualShell from '../../components/HomepageVisualShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Que es UrbanFix | Plataforma para tecnicos',
  description:
    'Conoce que es UrbanFix, para quien esta pensado y como mejora la gestion de presupuestos y clientes.',
  alternates: {
    canonical: '/urbanfix',
  },
};

const forTechnicians = [
  'Presupuestos con estructura profesional, listos para enviar en minutos.',
  'Seguimiento por estado para saber que responder y que cobrar.',
  'Historial reutilizable para no cotizar de cero cada trabajo.',
  'Perfil comercial con logo, datos y presencia mas solida.',
];

const forClients = [
  'Visualizador claro desde celular con items y totales visibles.',
  'Confirmacion simple del presupuesto sin instalar apps extra.',
  'Datos del tecnico y condiciones mas transparentes.',
  'Mejor experiencia de comunicacion durante la obra.',
];

const principles = [
  {
    title: 'Claridad',
    description: 'Cada presupuesto debe entenderse facil para evitar idas y vueltas.',
  },
  {
    title: 'Velocidad',
    description: 'Menos tiempo administrativo, mas tiempo productivo en obra.',
  },
  {
    title: 'Confianza',
    description: 'Imagen profesional y trazabilidad comercial de punta a punta.',
  },
];

export default function UrbanFixPage() {
  return (
    <div className={sora.className}>
      <HomepageVisualShell audience="empresas" activeSection="personas">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <article className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Que es UrbanFix
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                  Una plataforma para profesionalizar como cotizas y como cobras.
                </h1>
                <p className="mt-5 text-sm leading-relaxed text-slate-600">
                  UrbanFix nacio para resolver un problema concreto: presupuestos dispersos, seguimiento desordenado y
                  poca visibilidad para el cliente. Con UrbanFix, todo el flujo comercial vive en un mismo sistema.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/tecnicos"
                    className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Empezar ahora
                  </Link>
                  <a
                    href="mailto:info@urbanfixar.com"
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                  >
                    Hablar con soporte
                  </a>
                </div>
              </article>

              <aside className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Principios</p>
                  <div className="mt-4 space-y-3">
                    {principles.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1.5 text-xs text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <Image
                    src="/illustrations/dashboard.svg"
                    alt="Panel principal de UrbanFix"
                    width={960}
                    height={540}
                    className="h-64 w-full object-cover"
                    priority
                  />
                </div>
              </aside>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Para tecnicos</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {forTechnicians.map((item) => (
                    <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Para clientes</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {forClients.map((item) => (
                    <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-[#0F172A] p-8 text-white shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Vision</p>
              <h2 className="mt-2 text-2xl font-semibold">Que cada tecnico tenga una operacion comercial ordenada.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                UrbanFix no busca agregar complejidad: busca reemplazar friccion por un flujo claro. Mas velocidad para
                cotizar, mejor experiencia para el cliente y mas control para el tecnico.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/tecnicos"
                  className="rounded-full bg-[#F5B942] px-5 py-2.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-300"
                >
                  Acceder al panel
                </Link>
                <Link
                  href="/privacidad"
                  className="rounded-full border border-slate-500 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white"
                >
                  Politica de privacidad
                </Link>
                <Link
                  href="/terminos"
                  className="rounded-full border border-slate-500 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white"
                >
                  Terminos
                </Link>
              </div>
        </section>
      </HomepageVisualShell>
    </div>
  );
}
