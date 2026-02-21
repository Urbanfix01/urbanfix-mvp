import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
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
    image: '/illustrations/dashboard.svg',
    badge: 'Control',
  },
  {
    title: 'Presupuestos profesionales',
    description: 'Items por mano de obra y materiales, totales claros y estructura lista para enviar.',
    image: '/illustrations/quotes.svg',
    badge: 'Cotizacion',
  },
  {
    title: 'Visualizador para clientes',
    description: 'Tu cliente abre el presupuesto por link, revisa el detalle y confirma.',
    image: '/illustrations/viewer.svg',
    badge: 'Cliente',
  },
  {
    title: 'Agenda',
    description: 'Organiza trabajos aprobados y fechas comprometidas sin planillas paralelas.',
    image: '/illustrations/agenda.svg',
    badge: 'Planificacion',
  },
  {
    title: 'Notificaciones',
    description: 'Mantente al dia con eventos importantes: respuestas, cambios y tareas pendientes.',
    image: '/illustrations/notifications.svg',
    badge: 'Alertas',
  },
  {
    title: 'Perfil y marca',
    description: 'Logo, datos y presentacion profesional en cada propuesta que envias.',
    image: '/illustrations/branding.svg',
    badge: 'Marca',
  },
];

const kpiCards = [
  {
    value: '3x',
    label: 'Mas velocidad para armar presupuestos',
  },
  {
    value: '1 link',
    label: 'Para que el cliente vea y confirme',
  },
  {
    value: '100%',
    label: 'Del flujo en un solo lugar',
  },
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
    <div className={sora.className}>
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

          <main className="relative mx-auto w-full max-w-6xl px-6 py-10 md:py-12">
            <header className="rounded-[28px] border border-slate-200/80 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F172A] shadow-lg shadow-slate-300/70">
                    <Image src="/icon-48.png" alt="UrbanFix logo" width={28} height={28} priority />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">UrbanFix</p>
                    <p className="text-sm font-semibold text-slate-700">Gestion de presupuestos de obra</p>
                  </div>
                </div>

                <nav className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/tecnicos"
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                  >
                    Acceso tecnico
                  </Link>
                  <Link
                    href="/urbanfix"
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                  >
                    Sobre UrbanFix
                  </Link>
                  <a
                    href="https://play.google.com/apps/testing/com.urbanfix.app"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Android beta
                  </a>
                </nav>
              </div>
            </header>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Plataforma para tecnicos de Argentina
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                  Presupuestos de obra sin caos, desde el primer contacto hasta el cobro.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  UrbanFix une presupuesto, cliente y seguimiento en un flujo claro. Cotiza mas rapido, comparte por
                  link y controla cada estado sin depender de planillas dispersas.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/tecnicos"
                    className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Empezar como tecnico
                  </Link>
                  <Link
                    href="/precios-mano-de-obra"
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
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
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Resultado</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Operacion mas predecible</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Menos friccion para cotizar y mas claridad para el cliente. Eso acelera aprobaciones y ordena tu
                    agenda.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {kpiCards.map((metric) => (
                      <div
                        key={metric.value + metric.label}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-lg font-semibold text-slate-900">{metric.value}</p>
                        <p className="text-xs text-slate-600">{metric.label}</p>
                      </div>
                    ))}
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

            <section id="proceso" className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Como funciona</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Flujo simple para no perder tiempo</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {processSteps.map((step) => (
                  <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="modulos" className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
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
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative bg-slate-50">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        width={960}
                        height={540}
                        loading="lazy"
                        className="h-40 w-full object-cover"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        {feature.badge}
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
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
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

              <div className="rounded-[28px] border border-slate-200 bg-[#0F172A] p-8 text-white shadow-sm">
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
