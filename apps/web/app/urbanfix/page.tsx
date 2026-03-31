import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import {
  BarChart3,
  ClipboardList,
  FileCheck2,
  MapPinned,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';

import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Servicios UrbanFix',
  description:
    'Conoce todo lo que ofrece UrbanFix: panel técnico, presupuestos por link, base de rubros, portal cliente, vidriera pública, mapa de técnicos y control administrativo.',
  alternates: { canonical: '/urbanfix' },
};

const heroMetrics = [
  {
    label: 'Operación técnica',
    value: 'Presupuestos, rubros y seguimiento',
  },
  {
    label: 'Experiencia cliente',
    value: 'Link público, decisión y feedback',
  },
  {
    label: 'Crecimiento comercial',
    value: 'Perfil público, rubros SEO y mapa',
  },
];

const modules = [
  {
    title: 'Panel técnico',
    description:
      'UrbanFix centraliza la operación del técnico o del equipo en un mismo flujo, desde el ingreso hasta el presupuesto final.',
    bullets: [
      'Carga cliente, dirección, rubro, mano de obra y materiales en una sola pantalla.',
      'Ordena items con observaciones técnicas, cantidades, precios y reglas comerciales.',
      'Mantiene el trabajo operativo sin depender de planillas sueltas o mensajes dispersos.',
    ],
    icon: Wrench,
  },
  {
    title: 'Presupuestos compartibles',
    description:
      'Cada propuesta puede salir como experiencia digital lista para enviar, revisar y responder.',
    bullets: [
      'Comparte el presupuesto por link público o por WhatsApp.',
      'Genera una presentación más clara para el cliente y un PDF descargable.',
      'Permite sostener una estructura prolija aun cuando el trabajo tenga muchos items.',
    ],
    icon: FileCheck2,
  },
  {
    title: 'Base de rubros y mano de obra',
    description:
      'La plataforma trabaja con una base viva de rubros, variantes técnicas, precios y referencias para presupuestar con criterio.',
    bullets: [
      'Gestiona catálogo de mano de obra con observaciones técnicas, medidas, rangos o potencia.',
      'Diferencia variantes reales de un mismo trabajo cuando cambia capacidad, diámetro o condición.',
      'Conecta la base técnica con precios visibles y páginas públicas por rubro.',
    ],
    icon: ClipboardList,
  },
  {
    title: 'Portal cliente',
    description:
      'UrbanFix no se queda solo del lado interno: también abre una experiencia clara para quien pide el trabajo.',
    bullets: [
      'El cliente puede ingresar, publicar solicitudes y revisar propuestas.',
      'La decisión de aprobar o rechazar queda dentro del mismo flujo operativo.',
      'Reduce ruido en la comunicación y deja un recorrido más legible para ambas partes.',
    ],
    icon: Users,
  },
  {
    title: 'Vidriera pública y mapa',
    description:
      'La plataforma también funciona como frente comercial para mostrar técnicos disponibles y cobertura.',
    bullets: [
      'Perfiles públicos con likes, rubros, zona y datos de contacto.',
      'Mapa interactivo de técnicos disponibles con punto exacto o zona estimada.',
      'Acceso libre para navegar la oferta sin login y descubrir cobertura real.',
    ],
    icon: MapPinned,
  },
  {
    title: 'Control administrativo',
    description:
      'UrbanFix agrega una capa de lectura y seguimiento para la operación completa.',
    bullets: [
      'Panel admin con indicadores, monitoreo general y lectura de actividad.',
      'Roadmap, feedback y soporte dentro del mismo ecosistema.',
      'Una base más ordenada para decidir mejoras y sostener despliegues sin perder trazabilidad.',
    ],
    icon: BarChart3,
  },
];

const audiences = [
  {
    eyebrow: 'Para tecnicos',
    title: 'Ordena cotizacion, operacion y presentacion',
    description:
      'Ideal para quienes necesitan dejar atrás el presupuesto improvisado y pasar a una estructura más profesional.',
    points: [
      'Presupuestar con una base técnica más clara.',
      'Enviar propuestas mejor presentadas.',
      'Tener un perfil público para captar trabajo.',
    ],
  },
  {
    eyebrow: 'Para empresas y equipos',
    title: 'Coordina mas de un actor en el mismo sistema',
    description:
      'UrbanFix sirve para operar una estructura con técnicos, clientes, administración y seguimiento centralizado.',
    points: [
      'Unifica criterios de rubros y mano de obra.',
      'Mejora la trazabilidad de pedidos y respuestas.',
      'Conecta operación, visibilidad pública y control.',
    ],
  },
  {
    eyebrow: 'Para clientes',
    title: 'Entiende mejor que se ofrece y como responder',
    description:
      'La plataforma busca hacer más legible la propuesta técnica para quien recibe el trabajo.',
    points: [
      'Revisar solicitudes y presupuestos en una interfaz simple.',
      'Tomar decisión con menos fricción.',
      'Dejar feedback y cerrar mejor la experiencia.',
    ],
  },
];

const flow = [
  {
    step: '01',
    title: 'Ingreso y carga',
    description: 'Técnico, empresa o cliente ingresan al flujo correcto y cargan el pedido o la propuesta.',
  },
  {
    step: '02',
    title: 'Estructura tecnica',
    description: 'Se arma el presupuesto con rubros, mano de obra, materiales, cantidades y notas técnicas.',
  },
  {
    step: '03',
    title: 'Envio y respuesta',
    description: 'El presupuesto sale por link o WhatsApp, el cliente revisa y responde dentro del circuito.',
  },
  {
    step: '04',
    title: 'Visibilidad y continuidad',
    description: 'El sistema suma perfil público, rubros indexables, mapa, soporte y lectura administrativa.',
  },
];

const routeCards = [
  {
    title: 'Acceso tecnico',
    href: '/tecnicos',
    description: 'Entrada operativa para presupuestar, organizar items y trabajar dentro de la plataforma.',
  },
  {
    title: 'Portal cliente',
    href: '/cliente',
    description: 'Ingreso para publicar pedidos y revisar propuestas desde la experiencia cliente.',
  },
  {
    title: 'Ventana de gremios',
    href: '/gremios',
    description: 'Indice simple con gremios de construccion, instalaciones, mantenimiento y apoyo operativo.',
  },
  {
    title: 'Técnicos disponibles',
    href: '/vidriera',
    description: 'Frente público con perfiles visibles, cobertura y mapa interactivo de disponibilidad.',
  },
  {
    title: 'Rubros y precios',
    href: '/rubros',
    description: 'Páginas públicas con base real de rubros, mano de obra y referencias activas.',
  },
];

export default function UrbanFixPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/urbanfix" sticky />

        <div className="relative isolate">
          <div className="absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(122,79,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_78%)]" />
          <div className="absolute left-[-140px] top-28 -z-10 h-72 w-72 rounded-full bg-[#ff8f1f]/12 blur-3xl" />
          <div className="absolute right-[-120px] top-16 -z-10 h-80 w-80 rounded-full bg-[#7b61ff]/12 blur-3xl" />

          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <section className="rounded-[36px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.9)] sm:p-8 lg:p-10">
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/20">
                <img
                  src="/urbanfix/services-page-01.png"
                  alt="Vista de la plataforma UrbanFix"
                  className="block h-auto w-full max-w-full"
                  loading="eager"
                />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="max-w-3xl">
                  <p className="inline-flex items-center gap-2 rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Plataforma UrbanFix
                  </p>
                  <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                    Todo lo que ofrece UrbanFix para presupuestar, operar y crecer con una estructura más clara.
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
                    UrbanFix combina panel técnico, base de rubros, experiencia cliente, presencia pública y control
                    administrativo en un mismo sistema. No es solo una pantalla de cotización: es una capa operativa y
                    comercial para ordenar cómo se trabaja y cómo se muestra el servicio.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href="/tecnicos"
                      className="rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                    >
                      Entrar a la plataforma
                    </Link>
                    <Link
                      href="/vidriera"
                      className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Ver tecnicos disponibles
                    </Link>
                    <Link
                      href="/contacto"
                      className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                    >
                      Hablar con UrbanFix
                    </Link>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,143,31,0.16),rgba(255,143,31,0.06))] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#ffd6a6]">En una sola plataforma</p>
                  <p className="mt-2 text-sm leading-7 text-white/82">
                    Técnicos, empresas, clientes, perfiles públicos, mapas, rubros, presupuesto compartible y soporte
                    operativo conviven dentro del mismo ecosistema.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-3">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[28px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-sm"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{metric.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <article className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Qué resuelve UrbanFix</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Una estructura para trabajar mejor y para mostrar mejor lo que haces.
                </h2>
                <div className="mt-5 space-y-4 text-sm leading-7 text-white/78 sm:text-base">
                  <p>
                    UrbanFix ordena el trabajo técnico desde adentro, pero también mejora cómo ese trabajo se presenta
                    hacia afuera. La plataforma conecta operación, presupuesto, visibilidad y lectura administrativa.
                  </p>
                  <p>
                    Eso permite pasar de una lógica fragmentada a un sistema más consistente: base técnica de rubros,
                    presupuestos por link, respuesta del cliente, feedback, perfil público, rubros indexables y mapa de
                    técnicos disponibles.
                  </p>
                </div>
              </article>

              <aside className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Capas del producto</p>
                <div className="mt-5 grid gap-3">
                  {[
                    'Operación técnica con presupuesto estructurado.',
                    'Experiencia cliente para revisar y responder.',
                    'Vidriera pública con perfiles y cobertura.',
                    'Mapa interactivo de técnicos disponibles.',
                    'Páginas de rubros y precios públicos.',
                    'Lectura administrativa, soporte y roadmap.',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#ffb35e]" />
                      <p className="text-sm leading-6 text-white/82">{item}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </section>

            <section className="mt-6 rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <div className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Módulos principales</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Todo lo que hoy puede hacer UrbanFix dentro y fuera de la operación.
                </h2>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {modules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <article
                      key={module.title}
                      className="rounded-[28px] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                          <Icon className="h-5 w-5 text-[#ffb35e]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold text-white">{module.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-white/76">{module.description}</p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3">
                        {module.bullets.map((bullet) => (
                          <div
                            key={bullet}
                            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/82"
                          >
                            {bullet}
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              {audiences.map((audience) => (
                <article
                  key={audience.eyebrow}
                  className="rounded-[30px] border border-white/15 bg-white/[0.03] p-6"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">{audience.eyebrow}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{audience.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-white/76">{audience.description}</p>

                  <div className="mt-5 space-y-3">
                    {audience.points.map((point) => (
                      <div key={point} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-sm leading-6 text-white/84">{point}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
              <article className="rounded-[32px] border border-white/15 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Cómo fluye</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Un recorrido más continuo entre operación, cliente y presencia pública.
                </h2>
                <div className="mt-6 space-y-4">
                  {flow.map((item) => (
                    <div key={item.step} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff8f1f] text-sm font-bold text-[#2a0338]">
                          {item.step}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">{item.title}</p>
                          <p className="mt-2 text-sm leading-7 text-white/76">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="rounded-[32px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,143,31,0.1),rgba(123,97,255,0.08))] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#ffd6a6]">Experiencias ya online</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  UrbanFix no es una promesa abstracta. Ya vive en varias capas públicas y operativas.
                </h2>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {routeCards.map((card) => (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="rounded-[24px] border border-white/12 bg-black/20 p-5 transition hover:border-white/28 hover:bg-black/25"
                    >
                      <p className="text-lg font-semibold text-white">{card.title}</p>
                      <p className="mt-3 text-sm leading-7 text-white/76">{card.description}</p>
                    </Link>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-white/12 bg-white/[0.04] p-5">
                  <p className="text-sm leading-7 text-white/82">
                    El valor de UrbanFix aparece cuando todas estas capas trabajan juntas: base técnica, presupuesto,
                    cliente, perfil público, mapa, rubros, administración y soporte dentro del mismo sistema.
                  </p>
                </div>
              </aside>
            </section>

            <section className="mt-6 rounded-[32px] border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Siguiente paso</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                    Si quieres usar UrbanFix para operar mejor o presentarte mejor, este es el punto de entrada.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-white/78">
                    Puedes entrar a la plataforma, revisar la experiencia pública o hablar con UrbanFix para ver cómo
                    encaja en tu operación técnica, comercial o de servicio.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Link
                    href="/tecnicos"
                    className="inline-flex items-center gap-2 rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Entrar ahora
                    <MessageSquareMore className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
                  >
                    Contacto comercial
                    <MessageSquareMore className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
