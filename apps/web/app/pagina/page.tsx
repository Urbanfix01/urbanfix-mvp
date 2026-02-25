import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const sections = [
  {
    title: 'Hero',
    description: 'Un titulo claro, un subtitulo breve y un boton principal.',
  },
  {
    title: 'Servicios / Beneficios',
    description: '3 a 6 tarjetas con lo que ofreces y para quien es.',
  },
  {
    title: 'Contacto',
    description: 'Un formulario o tus canales (WhatsApp, email, redes).',
  },
];

export default function PaginaWebPage() {
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
                  <p className="text-sm font-semibold text-slate-700">Pagina nueva</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Inicio
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Acceso tecnico
                </a>
              </div>
            </header>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Plantilla</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
                  Tu nueva pagina web ya esta creada.
                </h1>
                <p className="mt-4 text-sm text-slate-600">
                  Esta ruta vive en <span className="font-semibold">/pagina</span>. Cambia los textos y secciones para
                  adaptarla a tu negocio o a la pantalla que necesites.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/urbanfix"
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Ver ejemplo
                  </a>
                  <a
                    href="/privacidad"
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Politica
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  Siguiente paso
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">
                    Checklist
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>Define el objetivo (ventas, contacto, informacion).</li>
                  <li>Escribe un titulo con tu propuesta de valor.</li>
                  <li>Agrega una llamada a la accion (WhatsApp / Email).</li>
                  <li>Publica en Vercel o tu hosting.</li>
                </ul>
              </div>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {sections.map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dime que necesitas</p>
              <p className="mt-2 text-sm text-slate-600">
                Si me dices el tipo de pagina (landing, contacto, blog, panel, etc.) y el contenido, te la dejo armada
                con el diseño completo.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

