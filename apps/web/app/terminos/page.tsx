import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function TermsPage() {
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
                  <p className="text-sm font-semibold text-slate-700">Terminos y condiciones</p>
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

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Terminos</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Terminos del servicio</h1>
              <p className="mt-2 text-xs text-slate-500">Ultima actualizacion: 26/12/2025</p>

              <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                <p>
                  Al usar UrbanFix aceptas estos terminos. El servicio permite crear y compartir presupuestos de
                  trabajos y gestionar solicitudes con clientes.
                </p>
                <p>
                  El contenido generado (presupuestos, precios, descripciones) es responsabilidad del usuario.
                  UrbanFix no garantiza la exactitud de la informacion ingresada por terceros.
                </p>
                <p>
                  Podemos actualizar estos terminos para mejorar el servicio. Si continuas usando la plataforma luego
                  de cambios, se entiende que aceptas la version vigente.
                </p>
                <p>Para consultas o reclamos podes escribir a INFO@URBANFIXAR.COM.</p>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contacto</p>
              <p className="mt-2 font-semibold text-slate-900">INFO@URBANFIXAR.COM</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
