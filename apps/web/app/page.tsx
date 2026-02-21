import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Plus_Jakarta_Sans, Syne } from 'next/font/google';
import HomeWindowNavCards from '../components/HomeWindowNavCards';

const displayFont = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'UrbanFix Argentina | Gestion de presupuestos para tecnicos',
  description:
    'UrbanFix ayuda a tecnicos de Argentina a cotizar rapido, ordenar clientes y seguir cada presupuesto desde computo hasta cobro.',
  keywords: [
    'presupuestos construccion',
    'gestion para tecnicos',
    'urbanfix argentina',
    'cotizador mano de obra',
    'presupuestos de obra',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'UrbanFix Argentina | Gestion de presupuestos para tecnicos',
    description:
      'Presupuestos, seguimiento por estado y visualizador para clientes en un solo lugar.',
    url: 'https://www.urbanfix.com.ar',
    siteName: 'UrbanFix',
    locale: 'es_AR',
    type: 'website',
    images: ['/playstore/feature-graphic.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UrbanFix Argentina | Gestion de presupuestos para tecnicos',
    description: 'Cotiza rapido, comparte por link y controla todo el flujo de cada obra.',
    images: ['/playstore/feature-graphic.png'],
  },
};

const highlights = [
  {
    title: 'Presupuestos claros',
    description: 'Items, materiales, impuestos y descuento en un formato facil de aprobar.',
  },
  {
    title: 'Seguimiento por estados',
    description: 'Mira en segundos que esta en computo, presentado, aprobado o cobrado.',
  },
  {
    title: 'Cliente con link directo',
    description: 'Tu cliente abre el detalle desde el celular sin cuentas ni pasos extra.',
  },
];

const headerSecondaryViews = [
  { label: 'Guia precios', viewId: 'view-guias', windowId: 'ventana-guias' },
  { label: 'Ciudades', viewId: 'view-ciudades', windowId: 'ventana-ciudades' },
  { label: 'Rubros', viewId: 'view-rubros', windowId: 'ventana-rubros' },
] as const;

const homepageViewInputs = [
  'view-tech',
  'view-biz',
  'view-personas',
  'view-guias',
  'view-ciudades',
  'view-rubros',
  'view-android',
] as const;

type HomeViewId = (typeof homepageViewInputs)[number];

const trustChips = [
  'Producto en uso real en Argentina',
  'Capturas reales del sistema',
  'Soporte humano',
  'Politicas publicas y claras',
];

const inPageWindows: Array<{
  id: string;
  viewId: HomeViewId;
  title: string;
  description: string;
  bullets: string[];
  image: string;
}> = [
  {
    id: 'ventana-tecnicos',
    viewId: 'view-tech',
    title: 'Ventana Tecnicos',
    description: 'Operacion diaria para crear, enviar y seguir presupuestos con trazabilidad.',
    bullets: ['Panel y actividad del dia', 'Presupuestador operativo', 'Seguimiento por estados'],
    image: '/illustrations/window-tecnicos.svg',
  },
  {
    id: 'ventana-negocio',
    viewId: 'view-biz',
    title: 'Ventana Negocio',
    description: 'Control de pipeline comercial y estandar operativo para equipos y lideres.',
    bullets: ['Estandarizacion de propuestas', 'Visibilidad por responsable', 'Escala sin perder control'],
    image: '/illustrations/window-negocio.svg',
  },
  {
    id: 'ventana-personas',
    viewId: 'view-personas',
    title: 'Ventana Clientes',
    description: 'Personas que necesitan una reparacion y quieren comparar, aprobar y coordinar sin friccion.',
    bullets: ['Pedido en 30 segundos', 'Comparacion clara de alcance y precio', 'Confirmacion por link o WhatsApp'],
    image: '/illustrations/window-institucional.svg',
  },
  {
    id: 'ventana-guias',
    viewId: 'view-guias',
    title: 'Ventana Guias y Precios',
    description: 'Acceso simple a referencias de precios y buenas practicas comerciales.',
    bullets: ['Guias por categoria', 'Contexto para cotizar', 'Base de consulta rapida'],
    image: '/illustrations/window-guias.svg',
  },
  {
    id: 'ventana-ciudades',
    viewId: 'view-ciudades',
    title: 'Ventana Ciudades',
    description: 'Cobertura geografica y lectura por zona para orientar la operacion.',
    bullets: ['Foco regional', 'Demanda por zonas', 'Expansion planificada'],
    image: '/illustrations/window-ciudades.svg',
  },
  {
    id: 'ventana-rubros',
    viewId: 'view-rubros',
    title: 'Ventana Rubros',
    description: 'Especialidades y segmentos para comunicar servicios con mas precision.',
    bullets: ['Rubros priorizados', 'Lenguaje por especialidad', 'Oferta mas clara al cliente'],
    image: '/illustrations/window-rubros.svg',
  },
];

const processStepsTech = [
  {
    title: '1. Armado',
    description: 'Carga cliente, direccion, tareas y materiales en un solo flujo operativo.',
  },
  {
    title: '2. Envio',
    description: 'Comparte el presupuesto por link o WhatsApp con formato profesional.',
  },
  {
    title: '3. Confirmacion',
    description: 'El cliente revisa y confirma desde el visualizador web.',
  },
  {
    title: '4. Seguimiento',
    description: 'Pasa a agenda, notificaciones e historial para cerrar la obra sin perder datos.',
  },
];

const processStepsBiz = [
  {
    title: '1. Estandarizacion',
    description: 'Define criterio comercial comun para todo el equipo y evita propuestas dispares.',
  },
  {
    title: '2. Distribucion',
    description: 'Asigna responsables y canaliza las propuestas con visibilidad por area.',
  },
  {
    title: '3. Control',
    description: 'Supervisa avance, aprobacion y conversion con lectura clara del pipeline.',
  },
  {
    title: '4. Escala',
    description: 'Replica el flujo en mas zonas o equipos sin perder trazabilidad de punta a punta.',
  },
];

const processStepsClients = [
  {
    title: '1. Pedido rapido',
    description: 'Describe la reparacion, agrega direccion y define necesidad en pocos segundos.',
  },
  {
    title: '2. Cotizacion clara',
    description: 'Recibe propuesta con alcance, materiales y total en formato facil de entender.',
  },
  {
    title: '3. Confirmacion simple',
    description: 'Aprueba por link o WhatsApp sin crear cuenta ni perder tiempo.',
  },
  {
    title: '4. Seguimiento',
    description: 'Consulta estado de la obra y proximos pasos desde un mismo hilo.',
  },
];

const featureShowcase = [
  {
    title: 'Panel de control',
    description: 'Resumen de actividad, estados y accesos rapidos para arrancar el dia con foco.',
    image: '/illustrations/PANEL DE CONTROL.jpeg',
    imagePosition: 'center center',
    badge: 'Control',
  },
  {
    title: 'Presupuestos profesionales',
    description: 'Items por mano de obra y materiales, totales claros y estructura lista para enviar.',
    image: '/illustrations/PRESUPUESTADOR.jpeg',
    imagePosition: 'center center',
    badge: 'Cotizacion',
  },
  {
    title: 'Visualizador para clientes',
    description: 'Tu cliente abre el presupuesto por link, revisa el detalle y confirma.',
    image: '/illustrations/LINK DEL PRESUPUESTO.jpeg',
    imagePosition: 'center center',
    badge: 'Cliente',
  },
  {
    title: 'Agenda',
    description: 'Organiza trabajos aprobados y fechas comprometidas sin planillas paralelas.',
    image: '/illustrations/AGENDA.jpeg',
    imagePosition: 'center center',
    badge: 'Planificacion',
  },
  {
    title: 'Notificaciones',
    description: 'Mantente al dia con eventos importantes: respuestas, cambios y tareas pendientes.',
    image: '/illustrations/PRESUPUESTO PDF.jpeg',
    imagePosition: 'center center',
    badge: 'Alertas',
  },
  {
    title: 'Perfil y marca',
    description: 'Logo, datos y presentacion profesional en cada propuesta que envias.',
    image: '/illustrations/PERFIL TECNICO.jpeg',
    imagePosition: 'center center',
    badge: 'Marca',
  },
];

const kpiCards = [
  {
    value: '3x',
    label: 'Mas velocidad para armar presupuestos',
    detail: 'Plantillas y flujo guiado para cotizar sin rehacer trabajo.',
  },
  {
    value: '1 link',
    label: 'Para que el cliente vea y confirme',
    detail: 'Un solo enlace con detalle completo y aprobacion sin friccion.',
  },
  {
    value: '100%',
    label: 'Del flujo en un solo lugar',
    detail: 'Cliente, cotizacion y seguimiento conectados de punta a punta.',
  },
];

const businessHighlights = [
  {
    title: 'Estandar operativo',
    description: 'Criterio unificado de cotizacion para todo el equipo y menos desvio comercial.',
  },
  {
    title: 'Trazabilidad completa',
    description: 'Cada propuesta queda registrada con estado, historial y responsable.',
  },
  {
    title: 'Escala comercial',
    description: 'Mas volumen de presupuestos sin perder control ni calidad de entrega.',
  },
];

const clientHighlights = [
  {
    title: 'Pedido en segundos',
    description: 'Solicita una reparacion desde celular con datos clave y sin formularios largos.',
  },
  {
    title: 'Comparacion transparente',
    description: 'Visualiza tareas, materiales y montos para decidir con confianza.',
  },
  {
    title: 'Confirmacion inmediata',
    description: 'Aprueba por link y coordina avance sin llamadas interminables.',
  },
];

const businessKpiCards = [
  {
    value: '1 tablero',
    label: 'Para ver operaciones y pipeline comercial',
    detail: 'Visibilidad central de avance, aprobacion y seguimiento por responsable.',
  },
  {
    value: '0 caos',
    label: 'En handoffs entre equipo y cliente',
    detail: 'Misma informacion para ventas, ejecucion y cliente final en tiempo real.',
  },
  {
    value: 'ROI',
    label: 'Con foco en eficiencia del proceso',
    detail: 'Menos retrabajo administrativo y mas tiempo en tareas de valor.',
  },
];

const clientKpiCards = [
  {
    value: '<30s',
    label: 'Para iniciar una solicitud',
    detail: 'Carga minima de datos para activar una cotizacion real.',
  },
  {
    value: '1 link',
    label: 'Para revisar y confirmar',
    detail: 'El cliente visualiza detalle completo y responde sin fricciones.',
  },
  {
    value: '100%',
    label: 'Del proceso en una vista',
    detail: 'Pedido, propuesta y seguimiento unificados en el mismo flujo.',
  },
];

const tradeBadges = [
  'Electricidad',
  'Plomeria',
  'Pintura',
  'Albanileria',
  'Herreria',
  'Mantenimiento',
  'Techos',
  'Gas',
];

const businessBadges = ['Contratistas', 'Cuadrillas', 'Estudios tecnicos', 'Constructoras', 'Mantenimiento'];

const clientBadges = ['Hogar', 'Comercio', 'Urgencias', 'Mantenimiento', 'Refacciones'];

const impactPanels = [
  {
    title: 'Entrada ordenada',
    description: 'Cliente, direccion y alcance en un punto de inicio limpio.',
  },
  {
    title: 'Cotizacion clara',
    description: 'Items y totales legibles para que el cliente decida mas rapido.',
  },
  {
    title: 'Seguimiento accionable',
    description: 'Estado real de cada presupuesto para priorizar el dia.',
  },
];

const trustSignals = [
  {
    title: 'Transparencia comercial',
    description: 'Propuesta de valor clara, sin letra chica y con foco en resultados operativos.',
  },
  {
    title: 'Operacion centralizada',
    description: 'Cliente, cotizacion, adjuntos y seguimiento viven en el mismo flujo.',
  },
  {
    title: 'Soporte y mejora continua',
    description: 'El equipo acompana implementacion y toma feedback para iterar rapido.',
  },
  {
    title: 'Base legal visible',
    description: 'Privacidad y terminos accesibles para trabajar con respaldo formal.',
  },
];

const commitmentItems = [
  'Sin permanencia obligatoria para empezar.',
  'Proceso trazable desde primer contacto hasta cierre.',
  'Acceso web y app con experiencia consistente.',
  'Feedback de producto incorporado en roadmap activo.',
];

const faq = [
  {
    question: 'UrbanFix sirve para una sola especialidad o varias?',
    answer:
      'Puedes usar UrbanFix para electricidad, plomeria, pintura, mantenimiento y rubros mixtos. El objetivo es ordenar tu proceso comercial.',
  },
  {
    question: 'El cliente necesita instalar algo para ver el presupuesto?',
    answer:
      'No. El cliente recibe un link web y puede revisar el detalle desde el navegador del celular.',
  },
  {
    question: 'Puedo empezar desde web y despues seguir en la app?',
    answer:
      'Si. Puedes gestionar desde web y complementar con la app para trabajar en campo.',
  },
  {
    question: 'Hay soporte para dudas iniciales?',
    answer:
      'Si. Desde soporte te ayudamos a configurar precios, perfil y flujo de trabajo en los primeros dias.',
  },
];

const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'UrbanFix',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android',
  inLanguage: 'es-AR',
  description:
    'Plataforma para crear, enviar y gestionar presupuestos de obra con seguimiento por estados.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'ARS',
  },
  url: 'https://www.urbanfix.com.ar',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'UrbanFix',
  url: 'https://www.urbanfix.com.ar',
  email: 'info@urbanfixar.com',
};

export default function HomePage() {
  return (
    <div className={bodyFont.className}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      <div className="min-h-screen bg-[#F3F1EA] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(245,185,66,0.24),transparent_45%),radial-gradient(circle_at_92%_20%,rgba(56,189,248,0.16),transparent_42%)]" />
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#0F172A]/8 blur-3xl" />
          <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

          <main className="fx-page relative mx-auto w-full max-w-7xl px-6 py-10 md:py-12">
            {homepageViewInputs.map((viewId, index) => (
              <input
                key={viewId}
                id={viewId}
                name="homepage-view"
                type="radio"
                defaultChecked={index === 0}
                className="sr-only"
              />
            ))}

            <header className="sticky top-3 z-50 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.72)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#071127] via-[#0F172A] to-[#1D366F] shadow-[0_16px_30px_-20px_rgba(10,18,38,0.9)] ring-1 ring-slate-300/45 sm:h-16 sm:w-16">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1 -z-10 rounded-[24px] bg-[radial-gradient(circle_at_30%_0%,rgba(59,130,246,0.35),transparent_62%)] blur-sm"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent"
                    />
                    <Image
                      src="/logo-ufx-main.png"
                      alt="UrbanFix logo"
                      fill
                      priority
                      sizes="(max-width: 640px) 56px, 64px"
                      className="object-cover object-center scale-[2.15]"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className={`${displayFont.className} hidden text-[12px] font-semibold uppercase tracking-[0.34em] text-[#647A9F] sm:block`}>
                      UrbanFix
                    </p>
                    <p className={`${displayFont.className} truncate text-[18px] font-semibold leading-none text-[#18213A] sm:text-[30px]`}>
                      Gestion de <span className="text-[#0D3FA8]">presupuestos</span> de obra
                    </p>
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center justify-end">
                  <div className="audience-toggle relative flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                    <span className="audience-toggle-pill absolute bottom-1 left-1 top-1 w-[calc(33.333%-4px)] rounded-full bg-[#0D3FA8] shadow-sm shadow-blue-200/80 transition-transform duration-300 ease-out" />
                    <label
                      htmlFor="view-tech"
                      data-analytics-event="home_audience_tecnicos"
                      data-analytics-label="tecnicos"
                      data-analytics-location="home_header_switch"
                      data-analytics-target="view-tech"
                      className="header-view-option audience-toggle-option audience-toggle-option--tech relative z-10 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                    >
                      Tecnicos
                    </label>
                    <label
                      htmlFor="view-biz"
                      data-analytics-event="home_audience_empresas"
                      data-analytics-label="empresas"
                      data-analytics-location="home_header_switch"
                      data-analytics-target="view-biz"
                      className="header-view-option audience-toggle-option audience-toggle-option--biz relative z-10 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                    >
                      Empresas
                    </label>
                    <label
                      htmlFor="view-personas"
                      data-analytics-event="home_audience_clientes"
                      data-analytics-label="clientes"
                      data-analytics-location="home_header_switch"
                      data-analytics-target="view-personas"
                      className="header-view-option audience-toggle-option audience-toggle-option--clients relative z-10 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold transition"
                    >
                      Clientes
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200/80 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {headerSecondaryViews.map((item) => (
                    <label
                      key={item.label}
                      htmlFor={item.viewId}
                      data-analytics-event="home_secondary_view_switch"
                      data-analytics-label={item.label}
                      data-analytics-location="home_header_secondary"
                      data-analytics-target={item.viewId}
                      className={`header-view-option header-view-option--${item.viewId.replace('view-', '')} cursor-pointer rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900`}
                    >
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </header>

            <div id="vista-principal" className="view-zone mt-8">
              <section className="view-pane view-pane--tech grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                  <p className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Plataforma para tecnicos de Argentina
                  </p>
                  <h1 className={`${displayFont.className} mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl`}>
                    Presupuestos de obra <span className="text-amber-500">sin caos</span>, desde el primer contacto
                    hasta el cobro.
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                    UrbanFix une presupuesto, cliente y seguimiento en un flujo claro. Cotiza mas rapido, comparte por
                    link y controla cada estado sin depender de planillas dispersas.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/tecnicos?quick=1&mode=register"
                      data-analytics-event="home_register_start"
                      data-analytics-label="crear_cuenta_2s"
                      data-analytics-location="home_view_tecnicos"
                      data-analytics-target="/tecnicos?quick=1&mode=register"
                      className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                      Crear cuenta en 2 segundos
                    </Link>
                    <label
                      htmlFor="view-guias"
                      data-analytics-event="home_open_guia_precios"
                      data-analytics-label="ver_guia_precios"
                      data-analytics-location="home_view_tecnicos"
                      data-analytics-target="view-guias"
                      className="cursor-pointer rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-500 hover:text-slate-900"
                    >
                      Ver guia de precios
                    </label>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {highlights.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {tradeBadges.map((trade) => (
                      <span
                        key={trade}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {trade}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {trustChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-[30px] border border-slate-900/60 bg-[#071533] p-6 text-white shadow-[0_24px_80px_-38px_rgba(10,18,38,0.95)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(245,185,66,0.32),transparent_45%),radial-gradient(circle_at_88%_10%,rgba(14,165,233,0.22),transparent_38%)]" />
                    <div className="pointer-events-none absolute -right-12 top-16 h-36 w-36 rounded-full border border-cyan-300/20" />
                    <div className="relative">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Resultado operativo</p>
                      <h2 className={`${displayFont.className} mt-2 text-[30px] font-semibold leading-[1.05] text-white`}>
                        Operacion mas predecible
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200">
                        Menos friccion para cotizar, mas claridad para el cliente y seguimiento ordenado de punta a punta.
                      </p>
                      <div className="mt-5 grid gap-3">
                        {kpiCards.map((metric) => (
                          <div
                            key={metric.value + metric.label}
                            className="rounded-2xl border border-cyan-200/20 bg-slate-950/45 px-4 py-3.5 backdrop-blur-sm"
                          >
                            <p className={`${displayFont.className} text-[31px] leading-none text-amber-300`}>{metric.value}</p>
                            <p className="mt-1 text-[13px] font-semibold text-slate-100">{metric.label}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{metric.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <Image
                      src="/playstore/feature-graphic.png"
                      alt="Vista general de UrbanFix para tecnicos"
                      width={1200}
                      height={630}
                      priority
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="h-64 w-full object-cover"
                    />
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
                      <a
                        href="https://play.google.com/apps/testing/com.urbanfix.app"
                        data-analytics-event="home_download_android_click"
                        data-analytics-label="android_beta"
                        data-analytics-location="home_view_tecnicos"
                        data-analytics-target="playstore_testing"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full bg-[#0F172A]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-[#0F172A]"
                      >
                        Descargar Android
                      </a>
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
                      >
                        iOS Proximamente
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="view-pane view-pane--biz grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                  <p className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-800">
                    Propuesta para empresas y equipos
                  </p>
                  <h2 className={`${displayFont.className} mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl`}>
                    Estandariza tu <span className="text-[#0D3FA8]">operacion comercial</span> y escala sin perder control.
                  </h2>
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                    UrbanFix te da una base comun para ventas, ejecucion y seguimiento. Menos dispersion de informacion,
                    mas velocidad de respuesta y mejor experiencia para cada cliente.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <label
                      htmlFor="view-personas"
                      data-analytics-event="home_open_clientes_from_empresas"
                      data-analytics-label="ver_propuesta_clientes"
                      data-analytics-location="home_view_empresas"
                      data-analytics-target="view-personas"
                      className="cursor-pointer rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                      Ver propuesta clientes
                    </label>
                    <Link
                      href="/tecnicos?quick=1&mode=register"
                      data-analytics-event="home_register_start_from_empresas"
                      data-analytics-label="alta_tecnica_inmediata"
                      data-analytics-location="home_view_empresas"
                      data-analytics-target="/tecnicos?quick=1&mode=register"
                      className="rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-500 hover:text-slate-900"
                    >
                      Alta tecnica inmediata
                    </Link>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {businessHighlights.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {businessBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {trustChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-[30px] border border-slate-900/60 bg-[#071533] p-6 text-white shadow-[0_24px_80px_-38px_rgba(10,18,38,0.95)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(14,165,233,0.3),transparent_45%),radial-gradient(circle_at_88%_10%,rgba(59,130,246,0.24),transparent_38%)]" />
                    <div className="pointer-events-none absolute -right-12 top-16 h-36 w-36 rounded-full border border-cyan-300/20" />
                    <div className="relative">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Resultado de negocio</p>
                      <h2 className={`${displayFont.className} mt-2 text-[30px] font-semibold leading-[1.05] text-white`}>
                        Operacion escalable y auditable
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200">
                        Una propuesta consistente para lideres de equipo: mejor control del flujo y menos dependencia de procesos manuales.
                      </p>
                      <div className="mt-5 grid gap-3">
                        {businessKpiCards.map((metric) => (
                          <div
                            key={metric.value + metric.label}
                            className="rounded-2xl border border-cyan-200/20 bg-slate-950/45 px-4 py-3.5 backdrop-blur-sm"
                          >
                            <p className={`${displayFont.className} text-[31px] leading-none text-cyan-200`}>{metric.value}</p>
                            <p className="mt-1 text-[13px] font-semibold text-slate-100">{metric.label}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{metric.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <Image
                      src="/illustrations/PANEL DE CONTROL.jpeg"
                      alt="Operacion centralizada para negocio en UrbanFix"
                      width={1200}
                      height={630}
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="h-64 w-full object-cover"
                    />
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
                      <a
                        href="https://play.google.com/apps/testing/com.urbanfix.app"
                        data-analytics-event="home_download_android_click"
                        data-analytics-label="android_beta"
                        data-analytics-location="home_view_empresas"
                        data-analytics-target="playstore_testing"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full bg-[#0F172A]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-[#0F172A]"
                      >
                        Descargar Android
                      </a>
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
                      >
                        iOS Proximamente
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="view-pane view-pane--personas grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                  <p className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
                    Para clientes que necesitan una reparacion
                  </p>
                  <h2 className={`${displayFont.className} mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl`}>
                    Cotiza y confirma <span className="text-emerald-600">sin vueltas</span>, desde tu celular.
                  </h2>
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                    UrbanFix te permite pedir una reparacion, revisar el detalle y aprobar de forma simple. Todo en
                    una vista clara para decidir rapido y seguir el avance.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <label
                      htmlFor="view-tech"
                      data-analytics-event="home_open_tecnicos_from_clientes"
                      data-analytics-label="ver_tecnicos"
                      data-analytics-location="home_view_clientes"
                      data-analytics-target="view-tech"
                      className="cursor-pointer rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                      Ver tecnicos
                    </label>
                    <label
                      htmlFor="view-guias"
                      data-analytics-event="home_open_guia_from_clientes"
                      data-analytics-label="ver_guia_precios"
                      data-analytics-location="home_view_clientes"
                      data-analytics-target="view-guias"
                      className="cursor-pointer rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-500 hover:text-slate-900"
                    >
                      Ver guia de precios
                    </label>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {clientHighlights.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {clientBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {trustChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-[30px] border border-slate-900/60 bg-[#071533] p-6 text-white shadow-[0_24px_80px_-38px_rgba(10,18,38,0.95)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(16,185,129,0.32),transparent_45%),radial-gradient(circle_at_88%_10%,rgba(56,189,248,0.18),transparent_38%)]" />
                    <div className="pointer-events-none absolute -right-12 top-16 h-36 w-36 rounded-full border border-emerald-200/20" />
                    <div className="relative">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Resultado para clientes</p>
                      <h2 className={`${displayFont.className} mt-2 text-[30px] font-semibold leading-[1.05] text-white`}>
                        Reparaciones con decision mas simple
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200">
                        Menos incertidumbre al pedir una obra: recibes detalle claro, costo visible y confirmacion en
                        un solo paso.
                      </p>
                      <div className="mt-5 grid gap-3">
                        {clientKpiCards.map((metric) => (
                          <div
                            key={metric.value + metric.label}
                            className="rounded-2xl border border-emerald-200/20 bg-slate-950/45 px-4 py-3.5 backdrop-blur-sm"
                          >
                            <p className={`${displayFont.className} text-[31px] leading-none text-emerald-300`}>{metric.value}</p>
                            <p className="mt-1 text-[13px] font-semibold text-slate-100">{metric.label}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{metric.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <Image
                      src="/illustrations/LINK DEL PRESUPUESTO.jpeg"
                      alt="Vista del presupuesto para clientes en UrbanFix"
                      width={1200}
                      height={630}
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="h-64 w-full object-cover"
                    />
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
                      <a
                        href="https://play.google.com/apps/testing/com.urbanfix.app"
                        data-analytics-event="home_download_android_click"
                        data-analytics-label="android_beta"
                        data-analytics-location="home_view_clientes"
                        data-analytics-target="playstore_testing"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded-full bg-[#0F172A]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-[#0F172A]"
                      >
                        Descargar Android
                      </a>
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
                      >
                        iOS Proximamente
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {headerSecondaryViews.map((item) => {
                const windowItem = inPageWindows.find((windowPanel) => windowPanel.id === item.windowId);
                if (!windowItem) {
                  return null;
                }

                const viewSuffix = item.viewId.replace('view-', '');

                return (
                  <section
                    key={item.viewId}
                    className={`view-pane view-pane--${viewSuffix} grid gap-6 lg:grid-cols-[1.05fr_0.95fr]`}
                  >
                    <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                      <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                        {item.label}
                      </p>
                      <h2 className={`${displayFont.className} mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl`}>
                        {windowItem.title}
                      </h2>
                      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">{windowItem.description}</p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          href="/tecnicos?quick=1&mode=register"
                          className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                        >
                          Probar registro tecnico
                        </Link>
                        <label
                          htmlFor="view-biz"
                          className="cursor-pointer rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-500 hover:text-slate-900"
                        >
                          Ver vista negocio
                        </label>
                      </div>

                      <ul className="mt-6 space-y-2.5">
                        {windowItem.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#0D3FA8]" aria-hidden="true" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <Image
                          src={windowItem.image}
                          alt={windowItem.title}
                          width={1200}
                          height={630}
                          sizes="(max-width: 1024px) 100vw, 42vw"
                          className="h-64 w-full object-cover"
                        />
                      </article>
                      <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Transicion integrada</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          Este panel cambia en la misma home sin redirigirte a otra pagina.
                        </p>
                      </article>
                    </div>
                  </section>
                );
              })}

              <section className="view-pane view-pane--android grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[34px] border border-slate-200 bg-white p-8 shadow-sm lg:p-10">
                  <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                    Android beta
                  </p>
                  <h2 className={`${displayFont.className} mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl`}>
                    Activa la app sin salir de esta experiencia
                  </h2>
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                    El header se mantiene estable y este bloque se actualiza con la opcion seleccionada. Si quieres,
                    abres el build de Android para prueba o sigues por web con registro rapido.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href="https://play.google.com/apps/testing/com.urbanfix.app"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                      Abrir Android beta
                    </a>
                    <Link
                      href="/tecnicos?quick=1&mode=register"
                      className="rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-500 hover:text-slate-900"
                    >
                      Registro en 2 segundos
                    </Link>
                  </div>
                </div>

                <div className="space-y-4">
                  <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <Image
                      src="/playstore/feature-graphic.png"
                      alt="UrbanFix disponible para Android"
                      width={1200}
                      height={630}
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="h-64 w-full object-cover"
                    />
                  </article>
                  <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Flujo continuo</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      Sin saltos de layout: cambias entre audiencias y vistas desde la misma barra superior.
                    </p>
                  </article>
                </div>
              </section>
            </div>

            <section
              id="proceso"
              className="flow-zone mt-8 rounded-[30px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-8 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Como funciona</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Flujo simple para no perder tiempo</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                El flujo se adapta automaticamente segun la audiencia seleccionada: tecnicos, empresas o clientes.
              </p>

              <div className="process-flow-pane process-flow-pane--tech mt-5">
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                  Flujo para tecnicos
                </span>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {processStepsTech.map((step) => (
                    <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="process-flow-pane process-flow-pane--biz mt-5">
                <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-800">
                  Flujo para empresas
                </span>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {processStepsBiz.map((step) => (
                    <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="process-flow-pane process-flow-pane--clients mt-5">
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                  Flujo para clientes
                </span>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {processStepsClients.map((step) => (
                    <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="ventanas" className="mt-8 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Navegacion integrada</p>
              <h2 className={`${displayFont.className} mt-2 text-2xl font-semibold text-slate-900`}>
                Explora todas las ventanas sin salir de esta pagina
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                Cada acceso del header actualiza la vista superior con transicion suave y sin recargar la pagina.
                Este bloque resume todas las ventanas disponibles.
              </p>

              <HomeWindowNavCards windows={inPageWindows} focusTargetId="vista-principal" />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Confianza de producto</p>
                <h2 className={`${displayFont.className} mt-2 text-2xl font-semibold text-slate-900`}>
                  Base solida para vender y ejecutar con menos riesgo
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                  La plataforma esta pensada para operar de forma consistente: mismo criterio comercial, mismo flujo
                  operativo y misma informacion para todo el equipo.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {trustSignals.map((signal) => (
                    <article key={signal.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{signal.description}</p>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="rounded-[30px] border border-slate-200 bg-gradient-to-b from-[#0F172A] to-[#1E293B] p-8 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Compromiso UrbanFix</p>
                <h3 className={`${displayFont.className} mt-2 text-2xl font-semibold leading-tight`}>
                  Implementacion clara y controlada
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  El objetivo no es solo cotizar mas rapido, sino sostener una operacion confiable en el tiempo.
                </p>

                <ul className="mt-5 space-y-2.5">
                  {commitmentItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-200">
                      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    href="/privacidad"
                    className="rounded-full border border-slate-500 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-300"
                  >
                    Politica de privacidad
                  </Link>
                  <Link
                    href="/terminos"
                    className="rounded-full border border-slate-500 px-3 py-1 text-[11px] font-semibold text-slate-100 transition hover:border-slate-300"
                  >
                    Terminos de uso
                  </Link>
                </div>
              </aside>
            </section>

            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {impactPanels.map((panel) => (
                <article
                  key={panel.title}
                  className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Impacto</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{panel.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{panel.description}</p>
                </article>
              ))}
            </section>

            <section id="modulos" className="mt-8 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Modulos</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Todo el sistema en una sola vista</h2>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                UrbanFix combina cotizacion, seguimiento comercial y gestion operativa. No necesitas mover datos entre
                herramientas desconectadas.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featureShowcase.map((feature) => (
                  <article
                    key={feature.title}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative bg-slate-50">
                      <Image
                        src={feature.image}
                        alt={`${feature.title} - captura real de UrbanFix`}
                        width={960}
                        height={540}
                        loading="lazy"
                        className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        style={{ objectPosition: feature.imagePosition }}
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        {feature.badge}
                      </span>
                      <span className="absolute bottom-3 right-3 rounded-full bg-[#0F172A]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Captura real
                      </span>
                    </div>
                    <div className="p-5">
                      <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{feature.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">FAQ</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Preguntas frecuentes</h2>
                <div className="mt-5 space-y-3">
                  {faq.map((item) => (
                    <details key={item.question} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                        {item.question}
                      </summary>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-[#0F172A] p-8 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Siguiente paso</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">Empieza a cotizar con un flujo mas ordenado</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Si ya trabajas con WhatsApp, Excel o notas sueltas, UrbanFix te ayuda a centralizar todo sin
                  complicar tu operacion.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/tecnicos"
                    className="rounded-full bg-[#F5B942] px-5 py-2.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-300"
                  >
                    Ir a panel tecnico
                  </Link>
                  <Link
                    href="/guias-precios"
                    className="rounded-full border border-slate-500 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white"
                  >
                    Ver guias y precios
                  </Link>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-300">Tambien disponible:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/privacidad"
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300"
                    >
                      Privacidad
                    </Link>
                    <Link
                      href="/terminos"
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300"
                    >
                      Terminos
                    </Link>
                    <Link
                      href="/ciudades"
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300"
                    >
                      Ciudades
                    </Link>
                    <Link
                      href="/rubros"
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300"
                    >
                      Rubros
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <footer className="mt-8 rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-xs text-slate-500 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>UrbanFix (c) 2026. Gestion clara para tecnicos de Argentina.</p>
                <a className="font-semibold text-slate-700 hover:text-slate-900" href="mailto:info@urbanfixar.com">
                  info@urbanfixar.com
                </a>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
