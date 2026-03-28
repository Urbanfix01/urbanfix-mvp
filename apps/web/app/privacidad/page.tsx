import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Link from 'next/link';

import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Política de privacidad | UrbanFix',
  description:
    'Conoce cómo UrbanFix recopila, usa y protege tu información personal en la versión vigente de su plataforma.',
  alternates: { canonical: '/privacidad' },
};

const privacySections = [
  {
    title: 'Información que recopilamos',
    body: [
      'Podemos solicitar nombre, correo electrónico, teléfono, dirección del servicio y los datos necesarios para crear solicitudes, presupuestos y seguimientos dentro de UrbanFix.',
      'También podemos registrar información operativa derivada del uso de la plataforma, como estado de solicitudes, interacciones con presupuestos y datos básicos de soporte.',
    ],
  },
  {
    title: 'Cómo usamos tus datos',
    body: [
      'Usamos la información para operar la plataforma, conectar clientes con técnicos, generar presupuestos, resolver soporte y mejorar la experiencia del servicio.',
      'No vendemos tu información personal ni la compartimos con terceros no autorizados fuera de los proveedores necesarios para el funcionamiento del producto.',
    ],
  },
  {
    title: 'Proveedores y almacenamiento',
    body: [
      'UrbanFix utiliza proveedores externos como Google y Supabase para autenticación, almacenamiento y servicios asociados al funcionamiento de la plataforma.',
      'Tus datos se usan con fines operativos y de seguridad, respetando las configuraciones vigentes de acceso y protección de la aplicación.',
    ],
  },
  {
    title: 'Actualización, acceso y eliminación',
    body: [
      'Puedes solicitar acceso, actualización o eliminación de tus datos personales escribiendo a info@urbanfixar.com.',
      'Si necesitas cerrar tu cuenta, también puedes seguir las instrucciones publicadas en la página de eliminación de cuenta de UrbanFix.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/politicas" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Privacidad</p>

            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Política de privacidad</h1>
                <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                  Esta es la versión vigente de la política de privacidad de UrbanFix. Aquí explicamos
                  qué datos podemos recopilar, cómo los usamos y qué canales tienes disponibles para
                  actualizar o eliminar tu información.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/politicas"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Volver a políticas
                </Link>
                <Link
                  href="/terminos"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Términos
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Actualización</p>
                <p className="mt-2 text-lg font-semibold text-white">24/07/2024</p>
                <p className="mt-2 text-sm text-white/70">Fecha de referencia publicada para esta política.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Contacto</p>
                <a
                  href="mailto:info@urbanfixar.com"
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-white/80"
                >
                  info@urbanfixar.com
                </a>
                <p className="mt-2 text-sm text-white/70">Canal para consultas, acceso o pedidos sobre tus datos.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Cuenta</p>
                <Link
                  href="/eliminar-cuenta"
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-white/80"
                >
                  Eliminar cuenta
                </Link>
                <p className="mt-2 text-sm text-white/70">
                  Instrucciones vigentes para solicitar cierre o eliminación de datos.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Detalle</p>

              <div className="mt-5 space-y-8">
                {privacySections.map((section) => (
                  <section key={section.title} className="border-b border-white/10 pb-6 last:border-b-0 last:pb-0">
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-white/80">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Tus derechos</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  <p>Puedes pedir corrección, actualización o eliminación de tus datos cuando corresponda.</p>
                  <p>
                    Si quieres gestionar tu cuenta o ejercer un pedido sobre información personal, escribe a{' '}
                    <a href="mailto:info@urbanfixar.com" className="font-semibold text-white underline">
                      info@urbanfixar.com
                    </a>
                    .
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Enlaces útiles</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    href="/politicas"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Centro de políticas
                  </Link>
                  <Link
                    href="/terminos"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Términos y condiciones
                  </Link>
                  <Link
                    href="/eliminar-cuenta"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Solicitar eliminación de cuenta
                  </Link>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
