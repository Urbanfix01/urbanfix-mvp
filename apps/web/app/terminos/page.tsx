import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Link from 'next/link';

import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Terminos y condiciones | UrbanFix',
  description:
    'Consulta los terminos y condiciones vigentes para el uso de UrbanFix, su plataforma y sus servicios asociados.',
  alternates: { canonical: '/terminos' },
};

const termsSections = [
  {
    title: 'Uso de la plataforma',
    body: [
      'Al usar UrbanFix aceptas estos terminos y condiciones. La plataforma permite crear, compartir y gestionar solicitudes, presupuestos y flujos de trabajo entre clientes y tecnicos.',
      'El acceso a ciertas funciones puede depender del perfil del usuario, del estado operativo del servicio y de las configuraciones vigentes de la cuenta.',
    ],
  },
  {
    title: 'Responsabilidad sobre el contenido',
    body: [
      'Cada usuario es responsable por la informacion que carga en la plataforma, incluyendo precios, descripciones, datos de contacto, imagenes y condiciones comerciales de los presupuestos.',
      'UrbanFix no garantiza la exactitud, actualidad o integridad de la informacion generada por terceros dentro del servicio.',
    ],
  },
  {
    title: 'Disponibilidad y cambios',
    body: [
      'Podemos ajustar funciones, flujos, integraciones o alcances del servicio para mejorar la operacion, la seguridad o la experiencia general de uso.',
      'UrbanFix puede actualizar estos terminos cuando resulte necesario. El uso continuado de la plataforma despues de dichos cambios implica aceptacion de la version vigente.',
    ],
  },
  {
    title: 'Consultas y reclamos',
    body: [
      'Para consultas legales, operativas o reclamos vinculados al servicio, puedes escribir a info@urbanfixar.com.',
      'Si necesitas revisar temas de privacidad o gestion de cuenta, tambien puedes consultar las paginas de Politica de privacidad y Eliminacion de cuenta.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/politicas" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Terminos</p>

            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Terminos y condiciones</h1>
                <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                  Esta es la version vigente de los terminos del servicio de UrbanFix. Resume las reglas
                  generales de uso de la plataforma, la responsabilidad sobre el contenido cargado y los
                  canales disponibles para soporte o reclamos.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/politicas"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Volver a politicas
                </Link>
                <Link
                  href="/privacidad"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Privacidad
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Actualizacion</p>
                <p className="mt-2 text-lg font-semibold text-white">26/12/2025</p>
                <p className="mt-2 text-sm text-white/70">Fecha de referencia publicada para estos terminos.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Contacto</p>
                <a
                  href="mailto:info@urbanfixar.com"
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-white/80"
                >
                  info@urbanfixar.com
                </a>
                <p className="mt-2 text-sm text-white/70">Canal principal para consultas legales y operativas.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Relacionadas</p>
                <Link
                  href="/privacidad"
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-white/80"
                >
                  Politica de privacidad
                </Link>
                <p className="mt-2 text-sm text-white/70">Complementa estos terminos con el tratamiento de datos.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Detalle</p>

              <div className="mt-5 space-y-8">
                {termsSections.map((section) => (
                  <section key={section.title} className="border-b border-white/10 pb-6 last:border-b-0 last:pb-0">
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-white/80">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Puntos clave</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  <p>Los presupuestos, precios y contenidos cargados por usuarios siguen siendo responsabilidad de quien los publica.</p>
                  <p>UrbanFix puede actualizar funciones y condiciones para mejorar seguridad, operacion y experiencia de uso.</p>
                </div>
              </section>

              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Enlaces utiles</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    href="/politicas"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Centro de politicas
                  </Link>
                  <Link
                    href="/privacidad"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Politica de privacidad
                  </Link>
                  <Link
                    href="/eliminar-cuenta"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Eliminacion de cuenta
                  </Link>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
