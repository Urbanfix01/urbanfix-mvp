import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Link from 'next/link';

import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Eliminar cuenta | UrbanFix',
  description:
    'Consulta el procedimiento vigente para solicitar la eliminacion de tu cuenta o datos asociados en UrbanFix.',
  alternates: { canonical: '/eliminar-cuenta' },
};

const deleteSteps = [
  'El email con el que te registraste en UrbanFix.',
  'Tu nombre, marca o nombre del negocio.',
  'Si deseas eliminar toda la cuenta o solo ciertos datos.',
];

export default function DeleteAccountPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/politicas" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Cuenta</p>

            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Solicitud de eliminacion de cuenta</h1>
                <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                  Esta pagina resume el proceso vigente para pedir la eliminacion de tu cuenta o de datos
                  asociados a UrbanFix. La solicitud se gestiona por correo y puede requerir validaciones
                  basicas para proteger la seguridad de la cuenta.
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
                <p className="mt-2 text-lg font-semibold text-white">04/02/2026</p>
                <p className="mt-2 text-sm text-white/70">Fecha de referencia publicada para este procedimiento.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Canal</p>
                <a
                  href="mailto:info@urbanfixar.com"
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-white/80"
                >
                  info@urbanfixar.com
                </a>
                <p className="mt-2 text-sm text-white/70">Correo oficial para iniciar la solicitud.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Tiempo estimado</p>
                <p className="mt-2 text-lg font-semibold text-white">Hasta 30 dias</p>
                <p className="mt-2 text-sm text-white/70">El plazo puede incluir validaciones y obligaciones legales.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Procedimiento</p>

              <div className="mt-5 space-y-8">
                <section className="border-b border-white/10 pb-6">
                  <h2 className="text-xl font-semibold text-white">Como solicitar la eliminacion</h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-white/80">
                    <p>
                      Envia un correo a <strong className="text-white">info@urbanfixar.com</strong> con el asunto{' '}
                      <strong className="text-white">&quot;Eliminar cuenta UrbanFix&quot;</strong>.
                    </p>
                    <p>
                      Para que el pedido pueda procesarse con mayor rapidez, incluye los datos listados abajo en el
                      mismo mensaje.
                    </p>
                  </div>
                </section>

                <section className="border-b border-white/10 pb-6">
                  <h2 className="text-xl font-semibold text-white">Datos que debes incluir</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                    {deleteSteps.map((step) => (
                      <li key={step} className="flex gap-3">
                        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                          •
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-white">Conservacion parcial de datos</h2>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-white/80">
                    <p>
                      Procesaremos la solicitud en un plazo de hasta <strong className="text-white">30 dias</strong>.
                    </p>
                    <p>
                      Algunos datos pueden mantenerse por razones legales, contables, antifraude o de seguridad, aun
                      cuando la cuenta haya sido cerrada o desactivada.
                    </p>
                  </div>
                </section>
              </div>
            </article>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Resumen rapido</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  <p>El pedido se realiza por email y puede abarcar la cuenta completa o solo ciertos datos.</p>
                  <p>Si necesitas revisar el tratamiento de informacion personal, consulta tambien la politica de privacidad.</p>
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
                    href="/terminos"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Terminos y condiciones
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
