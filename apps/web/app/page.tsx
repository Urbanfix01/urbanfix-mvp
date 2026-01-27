import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const highlights = [
  {
    title: 'Presupuestos claros',
    description: 'Comparte presupuestos en minutos y manten todo ordenado para tu cliente.',
  },
  {
    title: 'Seguimiento por estados',
    description: 'Controla cada presupuesto desde computo hasta cobrado con una vista simple.',
  },
  {
    title: 'Adjuntos y respaldo',
    description: 'Agrega fotos y deja todo documentado en el mismo lugar.',
  },
];

const quickSteps = [
  'Recibi el link de tu tecnico.',
  'Abri el presupuesto desde tu celular.',
  'Revisa items, totales y confirma.',
];

export default function HomePage() {
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
                  <p className="text-sm font-semibold text-slate-700">Plataforma de presupuestos</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/tecnicos"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Acceso tecnico
                </a>
                <a
                  href="/urbanfix"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Que es UrbanFix
                </a>
              </div>
            </header>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Gestion clara</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                  Gestion clara para tecnicos en movimiento.
                </h1>
                <p className="mt-4 text-sm text-slate-600">
                  UrbanFix conecta tecnicos y clientes con presupuestos rapidos, estados claros y un detalle
                  profesional listo para compartir.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/privacidad"
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Politica de privacidad
                  </a>
                  <a
                    href="/terminos"
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Terminos del servicio
                  </a>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {highlights.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-xs text-slate-500">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Acceso rapido</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Clientes</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Si recibiste un presupuesto, abrilo desde el link que te envio tu tecnico.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-slate-500">
                    {quickSteps.map((step, index) => (
                      <li key={step} className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">App movil</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">UrbanFix en tu bolsillo</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    La app esta en camino para que puedas gestionar presupuestos desde cualquier lugar.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                      Android beta
                    </span>
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-[10px] font-semibold text-slate-500">
                      iOS proximamente
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
