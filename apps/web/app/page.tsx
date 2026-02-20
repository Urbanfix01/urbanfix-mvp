import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Plus_Jakarta_Sans, Syne } from 'next/font/google';

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

const headerUtilityLinks = [
  {
    label: 'Contactanos',
    href: 'mailto:info@urbanfixar.com',
  },
  {
    label: 'Sucursales digitales',
    href: '/urbanfix',
  },
  {
    label: 'Turnos online',
    href: '/tecnicos',
  },
];

const headerAudienceLinks = [
  {
    label: 'Para tecnicos',
    href: '/tecnicos',
    active: true,
  },
  {
    label: 'Para negocio',
    href: '/urbanfix',
    active: false,
  },
];

const headerMainLinks = [
  { label: 'Personas', href: '/urbanfix' },
  { label: 'Guia precios', href: '/guias-precios' },
  { label: 'Ciudades', href: '/ciudades' },
  { label: 'Rubros', href: '/rubros' },
];

const trustChips = [
  'Producto en uso real en Argentina',
  'Capturas reales del sistema',
  'Soporte humano',
  'Politicas publicas y claras',
];

const processSteps = [
  {
    title: '1. Armado',
    description: 'Carga cliente, direccion, tareas y materiales en un solo flujo.',
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
            <header className="overflow-hidden rounded-[32px] border border-slate-200/90 bg-white/95 shadow-[0_20px_65px_-42px_rgba(15,23,42,0.7)] backdrop-blur">
              <div className="border-b border-slate-200/60 bg-[#0B1E44] px-6 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-200">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {headerUtilityLinks.map((item, index) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {index > 0 ? <span className="h-3 w-px bg-slate-500/60" aria-hidden="true" /> : null}
                        <Link href={item.href} className="transition hover:text-white">
                          {item.label}
                        </Link>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/tecnicos"
                    className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-100 transition hover:bg-cyan-200/15 hover:text-white"
                  >
                    Panel tecnico
                  </Link>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-5">
                  <div className="flex items-center gap-3.5">
                    <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#08142E] via-[#0F172A] to-[#1B2B54] shadow-[0_20px_40px_-22px_rgba(15,23,42,0.95)] ring-1 ring-slate-300/40">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent"
                      />
                      <Image src="/icon-48.png" alt="UrbanFix logo" width={30} height={30} priority />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#647A9F]">UrbanFix Argentina</p>
                      <p className={`${displayFont.className} mt-0.5 text-[23px] font-semibold leading-none text-[#18213A] sm:text-[34px]`}>
                        Gestion de <span className="text-[#0D3FA8]">presupuestos</span> de obra
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-slate-500">Operacion comercial clara para tecnicos y cuadrillas.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                      {headerAudienceLinks.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            item.active
                              ? 'bg-[#0D3FA8] text-white shadow-sm shadow-blue-200/80'
                              : 'text-slate-700 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="hidden items-center gap-2 xl:flex">
                      {headerMainLinks.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="rounded-full px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <a
                      href="https://play.google.com/apps/testing/com.urbanfix.app"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-full bg-[#0F172A] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Android beta
                    </a>
                  </div>
                </div>
              </div>
            </header>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                    href="/tecnicos"
                    className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Empezar como tecnico
                  </Link>
                  <Link
                    href="/precios-mano-de-obra"
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-500 hover:text-slate-900"
                  >
                    Ver guia de precios
                  </Link>
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

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <Image
                    src="/playstore/feature-graphic.png"
                    alt="Vista general de UrbanFix para tecnicos"
                    width={1200}
                    height={630}
                    priority
                    className="h-64 w-full object-cover"
                  />
                </div>
              </div>
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

            <section
              id="proceso"
              className="mt-8 rounded-[30px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-8 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Como funciona</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Flujo simple para no perder tiempo</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {processSteps.map((step) => (
                  <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
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
