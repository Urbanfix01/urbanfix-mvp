import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'UrbanFix Argentina | Presupuestos profesionales para tecnicos',
  description:
    'UrbanFix profesionaliza tu gestion comercial: cotiza rapido, envia propuestas claras y sigue cada obra desde el primer contacto hasta el cobro.',
  keywords: [
    'presupuestos de obra argentina',
    'gestion para tecnicos',
    'urbanfix argentina',
    'cotizador mano de obra',
    'software para servicios de obra',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'UrbanFix Argentina | Presupuestos profesionales para tecnicos',
    description:
      'Cotizacion, seguimiento y presentacion comercial profesional en una sola plataforma.',
    url: 'https://www.urbanfix.com.ar',
    siteName: 'UrbanFix',
    locale: 'es_AR',
    type: 'website',
    images: ['/playstore/feature-graphic.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UrbanFix Argentina | Presupuestos profesionales para tecnicos',
    description: 'Cotiza mejor, comparte por link y mejora la conversion comercial.',
    images: ['/playstore/feature-graphic.png'],
  },
};

const navLinks = [
  { href: '#resultados', label: 'Resultados' },
  { href: '#galeria', label: 'Galeria' },
  { href: '#proceso', label: 'Proceso' },
  { href: '#modulos', label: 'Modulos' },
  { href: '#faq', label: 'FAQ' },
];

const highlights = [
  {
    title: 'Presentacion profesional',
    description: 'Cada propuesta sale prolija, con alcance y totales faciles de entender.',
  },
  {
    title: 'Seguimiento visible',
    description: 'Mira en segundos que esta en computo, presentado, aprobado o cobrado.',
  },
  {
    title: 'Cliente por link directo',
    description: 'Tu cliente abre el detalle en celular o PC sin cuentas ni pasos extra.',
  },
];

const serviceSegments = [
  {
    title: 'Electricidad y mantenimiento',
    description: 'Cotiza instalaciones, urgencias y mantenimientos con mejor control por item.',
    image: '/illustrations/dashboard.svg',
  },
  {
    title: 'Plomeria y gas',
    description: 'Muestra materiales y mano de obra con claridad para reducir idas y vueltas.',
    image: '/illustrations/quotes.svg',
  },
  {
    title: 'Reformas y obras chicas',
    description: 'Ordena tareas por etapas para sostener seguimiento comercial hasta el cierre.',
    image: '/illustrations/agenda.svg',
  },
];

const processSteps = [
  {
    title: '1. Carga guiada',
    description: 'Carga cliente, direccion, tareas y materiales en un flujo rapido.',
  },
  {
    title: '2. Presupuesto prolijo',
    description: 'Genera una propuesta profesional con totales claros y alcances definidos.',
  },
  {
    title: '3. Envio inmediato',
    description: 'Comparte por link o WhatsApp para que el cliente lo vea al instante.',
  },
  {
    title: '4. Seguimiento real',
    description: 'Controla estados y agenda para cerrar la obra sin perder contexto.',
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
    tone: 'from-slate-50 to-slate-100',
  },
  {
    value: '1 link',
    label: 'Para que el cliente vea y confirme',
    tone: 'from-amber-50 to-amber-100',
  },
  {
    value: '100%',
    label: 'Del flujo en un solo lugar',
    tone: 'from-sky-50 to-sky-100',
  },
];

const comparisonRows = [
  {
    before: 'Cotizaciones repartidas en chats, notas y archivos sueltos',
    after: 'Presupuestos centralizados y listos para enviar en minutos',
    image: '/illustrations/quotes.svg',
  },
  {
    before: 'Sin seguimiento despues del envio',
    after: 'Estados visibles para saber que requiere accion hoy',
    image: '/illustrations/notifications.svg',
  },
  {
    before: 'Imagen comercial improvisada frente al cliente',
    after: 'Presentacion profesional y consistente en cada propuesta',
    image: '/illustrations/branding.svg',
  },
];

const testimonials = [
  {
    quote:
      'Antes perdiamos horas por presupuesto. Con UrbanFix enviamos mas rapido y el cliente entiende mejor el alcance.',
    author: 'Equipo tecnico de mantenimiento',
    image: '/illustrations/viewer.svg',
  },
  {
    quote:
      'El seguimiento por estados nos dio control real. Ya no se enfria una oportunidad por falta de orden.',
    author: 'Servicio de reformas domiciliarias',
    image: '/illustrations/dashboard.svg',
  },
  {
    quote:
      'Subio la calidad de presentacion y eso mejoro como nos perciben desde el primer contacto.',
    author: 'Tecnicos multi rubro',
    image: '/illustrations/branding.svg',
  },
];

const visualGallery = [
  {
    title: 'Vista integral de plataforma',
    image: '/playstore/feature-graphic.png',
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'Tablero comercial',
    image: '/illustrations/dashboard.svg',
    className: '',
  },
  {
    title: 'Presupuestos claros',
    image: '/illustrations/quotes.svg',
    className: '',
  },
  {
    title: 'Seguimiento y alertas',
    image: '/illustrations/notifications.svg',
    className: '',
  },
  {
    title: 'Agenda operativa',
    image: '/illustrations/agenda.svg',
    className: '',
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
    'Plataforma para crear, enviar y gestionar presupuestos de obra con seguimiento comercial por estados.',
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

      <div className="min-h-screen bg-[#F5F3EC] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(245,185,66,0.3),transparent_46%),radial-gradient(circle_at_92%_18%,rgba(56,189,248,0.18),transparent_44%)]" />
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#0F172A]/10 blur-3xl" />
          <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-[#F59E0B]/20 blur-3xl" />

          <main className="relative mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 md:py-10">
            <header className="rounded-[30px] border border-slate-200/80 bg-white/95 px-5 py-4 shadow-sm backdrop-blur sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0F172A] shadow-lg shadow-slate-300/70">
                    <Image src="/icon-48.png" alt="UrbanFix logo" width={26} height={26} priority />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">UrbanFix</p>
                    <p className="text-sm font-semibold text-slate-700">Gestion comercial para tecnicos</p>
                  </div>
                </div>

                <nav className="hidden items-center gap-2 lg:flex">
                  {navLinks.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-transparent px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="flex flex-wrap items-center gap-2">
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
                </div>
              </div>
            </header>

            <section id="resultados" className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <p className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Plataforma para tecnicos de Argentina
                </p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                  Profesionaliza tus presupuestos y gana mas cierres sin sumar caos operativo.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  UrbanFix ordena tu proceso comercial de punta a punta: cotizas mas rapido, compartes mejor y haces
                  seguimiento real de cada oportunidad hasta el cobro.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/tecnicos"
                    className="rounded-full bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Empezar ahora
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
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-[#0F172A] px-6 py-5 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Tablero comercial
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Operacion diaria mas predecible</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-200">
                      Menos improvisacion, mas visibilidad para priorizar que enviar, negociar y cobrar.
                    </p>
                  </div>
                  <div className="space-y-3 p-5">
                    {kpiCards.map((metric) => (
                      <div
                        key={metric.value + metric.label}
                        className={`rounded-2xl border border-slate-200 bg-gradient-to-r ${metric.tone} px-4 py-3`}
                      >
                        <p className="text-lg font-semibold text-slate-900">{metric.value}</p>
                        <p className="text-xs text-slate-600">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
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

            <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Para quien</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Equipos tecnicos que quieren vender mejor sin sumar carga administrativa
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {serviceSegments.map((segment) => (
                  <article
                    key={segment.title}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50"
                  >
                    <Image
                      src={segment.image}
                      alt={segment.title}
                      width={960}
                      height={540}
                      loading="lazy"
                      className="h-36 w-full border-b border-slate-200 bg-slate-100 object-cover"
                    />
                    <div className="p-5">
                      <p className="text-base font-semibold text-slate-900">{segment.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{segment.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="galeria" className="mt-8 rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Galeria</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Imagenes de producto para comunicar valor en segundos
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                Una vista visual clara mejora la confianza desde la primera visita y acelera la decision de probar la
                plataforma.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {visualGallery.map((item) => (
                  <figure
                    key={item.title}
                    className={`group overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 ${item.className}`}
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={1200}
                      height={700}
                      loading="lazy"
                      className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-full"
                    />
                    <figcaption className="border-t border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                      {item.title}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            <section id="proceso" className="mt-8 rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Proceso</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Un flujo claro para operar con orden todos los dias
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {processSteps.map((step) => (
                  <div key={step.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="modulos" className="mt-8 rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Modulos</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Todo el ciclo comercial y operativo en una sola plataforma
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                UrbanFix integra cotizacion, seguimiento y agenda para evitar traspasos manuales entre herramientas.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featureShowcase.map((feature) => (
                  <article
                    key={feature.title}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

            <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Antes vs ahora</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Lo que cambia cuando dejas de improvisar la gestion comercial
                </h2>
                <div className="mt-5 space-y-3">
                  {comparisonRows.map((row) => (
                    <article key={row.before} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={row.image}
                          alt={row.after}
                          width={64}
                          height={64}
                          loading="lazy"
                          className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-rose-700">Antes: {row.before}</p>
                          <p className="mt-2 text-xs font-semibold text-emerald-700">Con UrbanFix: {row.after}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div id="testimonios" className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Prueba social</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Equipos tecnicos que mejoraron cierres y orden operativo
                </h2>
                <div className="mt-5 space-y-3">
                  {testimonials.map((item) => (
                    <blockquote key={item.quote} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <Image
                          src={item.image}
                          alt={item.author}
                          width={80}
                          height={80}
                          loading="lazy"
                          className="h-12 w-12 rounded-full border border-slate-200 bg-white p-1"
                        />
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700">"{item.quote}"</p>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {item.author}
                      </p>
                    </blockquote>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div id="faq" className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">FAQ</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Preguntas frecuentes</h2>
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

              <div className="rounded-[30px] border border-slate-200 bg-[#0F172A] p-7 text-white shadow-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">Siguiente paso</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
                  Lleva tu operacion a un estandar mas profesional desde hoy
                </h2>
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
                  <p className="text-xs text-slate-300">Recursos adicionales</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/urbanfix"
                      className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-300"
                    >
                      Sobre UrbanFix
                    </Link>
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
                <p>UrbanFix (c) 2026. Gestion comercial clara para tecnicos de Argentina.</p>
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
