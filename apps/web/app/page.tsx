import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma para tecnicos, empresas y clientes',
  description:
    'UrbanFix conecta solicitudes, tecnicos y presupuestos con geolocalizacion inteligente, vidriera profesional y gestion operativa en tiempo real.',
};

const strengths = [
  {
    id: '01',
    title: 'Presupuestos profesionales en segundos',
    description:
      'Cotizaciones claras con items, materiales y mano de obra, listas para compartir por link directo.',
  },
  {
    id: '02',
    title: 'Geolocalizacion inteligente de 20 km',
    description:
      'Solicitudes por cercania para reducir traslados y mejorar tiempos de respuesta del tecnico.',
  },
  {
    id: '03',
    title: 'Sistema de reputacion y perfiles',
    description:
      'Calificaciones reales, referencias y trabajos realizados para elegir con confianza.',
  },
  {
    id: '04',
    title: 'Operacion escalable y auditable',
    description:
      'Panel operativo con trazabilidad de cada trabajo, estado y seguimiento comercial.',
  },
  {
    id: '05',
    title: 'Estandarizacion de precios',
    description:
      'Base de valores para mantener rentabilidad y criterios unificados en todo el equipo.',
  },
  {
    id: '06',
    title: 'Experiencia sin friccion para cliente',
    description:
      'Solicitud en segundos, recepcion de ofertas y aprobacion del presupuesto desde el celular.',
  },
];

const budgetFlow = [
  {
    id: '01',
    title: 'Genera el presupuesto',
    description: 'Carga materiales y mano de obra desde catalogo maestro en pocos segundos.',
  },
  {
    id: '02',
    title: 'Compartilo al cliente',
    description: 'Envia por WhatsApp o link web con una vista clara y profesional.',
  },
  {
    id: '03',
    title: 'Revision detallada',
    description: 'El cliente revisa montos, items y contexto de trabajo antes de decidir.',
  },
  {
    id: '04',
    title: 'Aceptacion y cierre',
    description: 'Confirma con un clic y el estado operativo se actualiza automaticamente.',
  },
];

const updates = [
  {
    title: 'Sistema de solicitudes',
    description: 'Alta de necesidad en menos de 30 segundos y distribucion inteligente a tecnicos.',
  },
  {
    title: 'Geolocalizacion de tecnicos',
    description: 'Conexion por radio de cobertura para asignar trabajo con precision.',
  },
  {
    title: 'Vidriera de tecnicos',
    description: 'Exposicion publica por reputacion, experiencia y trabajos validados.',
  },
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />
      <main className="fx-page min-h-screen bg-[radial-gradient(circle_at_10%_10%,#2b0a3f_0%,#16062a_38%,#07142a_100%)] text-white">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
          <header className="rounded-3xl border border-white/15 bg-black/15 p-4 backdrop-blur md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src="/icon.png" alt="UrbanFix" className="h-10 w-10 rounded-xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">UrbanFix</p>
                  <p className="text-sm font-medium text-white/90">Ecosistema tecnico y operativo</p>
                </div>
              </div>
              <nav className="flex flex-wrap items-center gap-2">
                <a
                  href="/tecnicos"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#ff9718] hover:text-[#ff9718]"
                >
                  Ingreso tecnico
                </a>
                <a
                  href="/cliente"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-[#ff9718] hover:text-[#ff9718]"
                >
                  Ingreso cliente
                </a>
                <a
                  href="https://play.google.com/apps/testing/com.urbanfix.app"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full bg-[#ff9718] px-4 py-2 text-xs font-semibold text-[#1a0a2a] transition hover:bg-[#ffab42]"
                >
                  Descargar Android beta
                </a>
              </nav>
            </div>
          </header>

          <section className="mt-6 grid gap-6 rounded-3xl border border-white/15 bg-black/15 p-5 backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
            <div className="space-y-5">
              <p className="inline-flex rounded-full border border-[#ff9718]/40 bg-[#ff9718]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb14a]">
                UrbanFix app
              </p>
              <h1 className="text-4xl font-extrabold leading-[0.92] text-white sm:text-5xl lg:text-6xl">
                URBAN<span className="text-[#ff9718]">FIX</span>
                <br />
                APP
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-white/78 sm:text-base">
                Conecta demanda real con tecnicos verificados, geolocalizacion por zona y presupuestos profesionales
                que se comparten y aprueban en segundos.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/urbanfix"
                  className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#1a0a2a] transition hover:bg-[#ffe3bf]"
                >
                  Ver ecosistema UrbanFix
                </a>
                <a
                  href="/vidriera"
                  className="rounded-full border border-white/25 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#ff9718] hover:text-[#ff9718]"
                >
                  Ver vidriera de tecnicos
                </a>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/30">
              <img
                src="/branddeck/page-01.png"
                alt="Presentacion de UrbanFix App"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/15 bg-black/20">
              <img
                src="/branddeck/page-02.png"
                alt="Resumen de propuesta UrbanFix"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="rounded-3xl border border-white/15 bg-black/20 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb14a]">Fortalezas clave</p>
              <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Tecnologia pensada para tecnicos, empresas y clientes
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {strengths.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
                    <p className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff9718] text-xs font-bold text-[#1a0a2a]">
                      {item.id}
                    </p>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/75">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/15 bg-black/20 p-6">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb14a]">Menu display</p>
                <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Crear y enviar presupuesto</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/80">
                  Flujo operativo para cotizar con precision, compartir al instante y cerrar trabajos sin friccion.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {budgetFlow.map((step) => (
                    <article key={step.id} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
                      <p className="text-[11px] font-bold text-[#ffb14a]">PASO {step.id}</p>
                      <h3 className="mt-1 text-sm font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-white/75">{step.description}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/30">
                <img
                  src="/branddeck/page-05.png"
                  alt="Flujo de crear y enviar presupuesto"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/30">
              <img
                src="/branddeck/page-06.png"
                alt="Ultimas actualizaciones de UrbanFix"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="rounded-3xl border border-white/15 bg-black/20 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb14a]">Actualizaciones</p>
              <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Sistema operativo en evolucion constante</h2>
              <div className="mt-5 space-y-3">
                {updates.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/75">{item.description}</p>
                  </article>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/tecnicos"
                  className="rounded-full bg-[#ff9718] px-5 py-2 text-xs font-semibold text-[#1a0a2a] transition hover:bg-[#ffab42]"
                >
                  Entrar al panel tecnico
                </a>
                <a
                  href="/cliente"
                  className="rounded-full border border-white/25 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#ff9718] hover:text-[#ff9718]"
                >
                  Crear solicitud como cliente
                </a>
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-white/15 bg-black/20">
            <div className="grid gap-5 p-6 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb14a]">Proxima etapa</p>
                <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Listos para lanzamiento publico</h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/78">
                  UrbanFix integra operacion, geolocalizacion y reputacion profesional en una sola experiencia.
                  Optimizas tu tiempo, cuidas tu rentabilidad y ganas visibilidad frente a nuevos clientes.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="/privacidad"
                    className="rounded-full border border-white/25 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#ff9718] hover:text-[#ff9718]"
                  >
                    Politica de privacidad
                  </a>
                  <a
                    href="/terminos"
                    className="rounded-full border border-white/25 px-5 py-2 text-xs font-semibold text-white transition hover:border-[#ff9718] hover:text-[#ff9718]"
                  >
                    Terminos
                  </a>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/30">
                <img src="/branddeck/page-08.png" alt="Cierre de presentacion UrbanFix" className="h-full w-full object-cover" loading="lazy" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
