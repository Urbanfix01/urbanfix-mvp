import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function UrbanFixPage() {
  return (
    <div className={sora.className}>
      <div className="min-h-screen bg-[#F5F4F0] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#F5B942]/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#94A3B8]/25 blur-3xl" />

          <main className="relative mx-auto w-full max-w-6xl px-6 py-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Gestion de presupuestos en obra</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/privacidad"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Politica de privacidad
                </a>
                <a
                  href="/"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Volver al inicio
                </a>
              </div>
            </header>

            <section className="mt-8 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Quienes somos</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Que es UrbanFix</h1>
                <p className="mt-4 text-sm text-slate-600">
                  UrbanFix es una plataforma que ayuda a tecnicos, instaladores y equipos de mantenimiento a crear,
                  enviar y gestionar presupuestos en minutos, con una experiencia clara para el cliente final.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                    Android beta
                  </span>
                  <span className="rounded-full border border-slate-300 px-3 py-1 text-[10px] font-semibold text-slate-500">
                    iOS proximamente
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  Resumen
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">
                    Beneficios
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>Presupuestos profesionales listos para compartir.</li>
                  <li>Actualizacion de precios y materiales en segundos.</li>
                  <li>Confirmacion rapida desde el celular del cliente.</li>
                  <li>Historial completo para volver a cotizar.</li>
                </ul>
              </div>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Para tecnicos</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>Presupuestos profesionales listos para enviar.</li>
                  <li>Seguimiento del estado: presentado, aprobado o pendiente.</li>
                  <li>Items y materiales organizados por categoria.</li>
                  <li>Historial para volver a cotizar sin empezar de cero.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Para clientes</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>Presupuesto claro, con detalle de items y totales.</li>
                  <li>Confirmacion rapida desde el celular.</li>
                  <li>Acceso a la informacion de la obra y del tecnico.</li>
                  <li>Documentacion y respaldo del acuerdo.</li>
                </ul>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              UrbanFix reduce el tiempo de armado de presupuestos y mejora la confianza del cliente. Si queres conocer
              mas, escribinos a INFO@URBANFIXAR.COM.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
