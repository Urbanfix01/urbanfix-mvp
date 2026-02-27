import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title:
    'UrbanFix Argentina | Gestion de presupuestos, clientes y mano de obra en construccion',
  description:
    'UrbanFix ayuda a tecnicos en Argentina con gestion de presupuestos, gestion de clientes, gestion de materiales de obra y mano de obra en construccion. Comparte presupuestos claros y controla cada estado desde la web.',
};

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

const featureShowcase = [
  {
    title: 'Panel de control',
    description: 'Resumen de presupuestos, estados y actividad para empezar el dia con claridad.',
    image: '/illustrations/dashboard.svg',
  },
  {
    title: 'Presupuestos profesionales',
    description: 'Crea, edita y comparte presupuestos con items, materiales, impuestos y adjuntos.',
    image: '/illustrations/quotes.svg',
  },
  {
    title: 'Visualizador para clientes',
    description: 'Link listo para abrir desde el celular, revisar el detalle y confirmar el presupuesto.',
    image: '/illustrations/viewer.svg',
  },
  {
    title: 'Agenda simple',
    description: 'Mira todos los trabajos aprobados y asigna una fecha en segundos.',
    image: '/illustrations/agenda.svg',
  },
  {
    title: 'Notificaciones',
    description: 'Alertas y seguimiento para no perder aprobaciones, mensajes o cambios importantes.',
    image: '/illustrations/notifications.svg',
  },
  {
    title: 'Perfil y marca',
    description: 'Carga logo, banner, foto y datos del negocio para una imagen mas profesional.',
    image: '/illustrations/branding.svg',
  },
];

const moreTools = [
  {
    title: 'Precios y mano de obra',
    description: 'Base de precios para agilizar cotizaciones y mantener consistencia.',
  },
  {
    title: 'Historial',
    description: 'Registros y resumen anual/mensual para volver a cotizar y controlar ingresos.',
  },
  {
    title: 'Suscripcion',
    description: 'Planes y facturacion para crecer sin friccion.',
  },
  {
    title: 'Soporte',
    description: 'Canal directo para resolver dudas y mejorar el producto.',
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
        <AuthHashHandler />
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
                  <p className="text-sm font-semibold text-slate-700">
                    Gestion de presupuestos y mano de obra
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/cliente"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Acceso cliente
                </a>
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
                  Gestion de presupuestos, clientes y MANO DE OBRA para construccion en Argentina.
                </h1>
                <p className="mt-4 text-sm text-slate-600">
                  UrbanFix conecta tecnicos y clientes con gestion de presupuestos, gestion de clientes, gestion de
                  materiales de obra, precios y MANO DE OBRA. Estados claros y un detalle profesional listo para
                  compartir.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/cliente"
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    Entrar como cliente
                  </a>
                  <a
                    href="/tecnicos"
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Entrar como tecnico
                  </a>
                  <a
                    href="https://play.google.com/apps/testing/com.urbanfix.app"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    Descargar app Android (beta)
                  </a>
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

                <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <img
                    src="/illustrations/dashboard.svg"
                    alt="Vista previa de panel de control"
                    loading="lazy"
                    className="h-[220px] w-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Acceso rapido</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Clientes</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Si recibiste un presupuesto, abrilo desde el link que te envio tu tecnico.
                  </p>
                  <div className="mt-4">
                    <a
                      href="/cliente"
                      className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Entrar como cliente
                    </a>
                  </div>
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
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src="/illustrations/viewer.svg"
                      alt="Vista previa de visualizador para clientes"
                      loading="lazy"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Imagen profesional</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Tu marca en cada presupuesto</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Completa tu perfil con logo, banner y datos de contacto para transmitir confianza y ordenar la
                    informacion del cliente.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                      Logo + banner
                    </span>
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-[10px] font-semibold text-slate-500">
                      Datos de contacto
                    </span>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src="/illustrations/branding.svg"
                      alt="Vista previa de perfil y marca"
                      loading="lazy"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Funcionalidades</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Todo lo que podes hacer en UrbanFix para construccion
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                Desde el primer contacto hasta el cobro: presupuestos, seguimiento, agenda, comunicacion y una imagen
                profesional para tu negocio.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featureShowcase.map((feature) => (
                  <div
                    key={feature.title}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="bg-slate-50">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        loading="lazy"
                        className="h-40 w-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                      <p className="mt-2 text-xs text-slate-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {moreTools.map((tool) => (
                  <div key={tool.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">{tool.title}</p>
                    <p className="mt-2 text-xs text-slate-500">{tool.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Argentina</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Gestion de presupuestos, clientes, materiales de obra y MANO DE OBRA
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                Organiza tus tarifas por rubro, actualiza materiales de obra y presenta presupuestos claros para
                construccion y mantenimiento. UrbanFix centraliza la informacion para que puedas cotizar rapido y con
                confianza.
              </p>
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
                  Ver rubros de construccion
                </a>
                <a
                  href="/ciudades"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Ver ciudades
                </a>
                <a
                  href="/guias-precios"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Ver guias y precios
                </a>
                <a
                  href="/tecnicos"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Empezar como tecnico
                </a>
                <a
                  href="/cliente"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Empezar como cliente
                </a>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
