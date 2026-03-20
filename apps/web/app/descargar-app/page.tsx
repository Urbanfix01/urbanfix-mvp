import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { ArrowUpRight, Download, MonitorSmartphone, ShieldCheck, Smartphone } from 'lucide-react';
import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const ACCESS_ANDROID_URL = 'https://play.google.com/apps/testing/com.urbanfix.app';

export const metadata: Metadata = {
  title: 'Descargar App | UrbanFix',
  description:
    'Descarga la app de UrbanFix, entra al acceso Android disponible y revisa el estado de iOS y la plataforma web.',
  alternates: {
    canonical: '/descargar-app',
  },
};

const steps = [
  'Abre el acceso Android y acepta participar en la prueba.',
  'Instala UrbanFix desde Google Play con la cuenta habilitada.',
  'Si prefieres operar desde escritorio, entra a la plataforma web.',
];

export default function DownloadAppPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/descargar-app" sticky />

        <section className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(255,143,31,0.2),transparent_32%),radial-gradient(circle_at_top_right,rgba(123,97,255,0.18),transparent_34%)]" />

          <div className="mx-auto w-full max-w-7xl">
            <div className="rounded-[36px] border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_32px_90px_-52px_rgba(0,0,0,0.95)] sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full border border-[#ff8f1f]/35 bg-[#ff8f1f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
                    <Download className="h-3.5 w-3.5" />
                    Acceso a la app UrbanFix
                  </p>
                  <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
                    Descarga la app y entra a la operacion desde el primer minuto.
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
                    UrbanFix ya tiene acceso Android disponible para prueba y una experiencia web completa para operar
                    mientras iOS termina su proceso de revision. Aqui concentramos el acceso movil y la alternativa web
                    en una sola vista.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={ACCESS_ANDROID_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-semibold text-[#2a0338] transition hover:bg-[#ffad56]"
                    >
                      Descargar Android
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <Link
                      href="/tecnicos"
                      className="rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/92 transition hover:border-white hover:text-white"
                    >
                      Ir a plataforma web
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <article className="rounded-[24px] border border-white/12 bg-black/25 p-4 backdrop-blur-md">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                        <Smartphone className="h-4.5 w-4.5 text-[#ffb35e]" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">Android disponible</p>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        Acceso de prueba activo desde Google Play para instalar la app hoy.
                      </p>
                    </article>
                    <article className="rounded-[24px] border border-white/12 bg-black/25 p-4 backdrop-blur-md">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                        <ShieldCheck className="h-4.5 w-4.5 text-[#ffb35e]" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">iOS en revision</p>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        El build iOS esta en proceso de validacion. Mientras tanto, la operacion sigue disponible en
                        web.
                      </p>
                    </article>
                    <article className="rounded-[24px] border border-white/12 bg-black/25 p-4 backdrop-blur-md">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06]">
                        <MonitorSmartphone className="h-4.5 w-4.5 text-[#ffb35e]" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">Alternativa inmediata</p>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        La plataforma web permite cotizar, operar y gestionar perfiles sin esperar la descarga movil.
                      </p>
                    </article>
                  </div>
                </div>

                <aside className="rounded-[28px] border border-[#ff8f1f]/22 bg-[linear-gradient(135deg,rgba(255,143,31,0.12),rgba(32,5,53,0.88))] p-5 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.95)] sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ffd6a6]">
                    Como empezar
                  </p>
                  <ol className="mt-4 space-y-3">
                    {steps.map((step, index) => (
                      <li key={step} className="rounded-[22px] border border-white/12 bg-black/20 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd6a6]">
                          Paso {index + 1}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/80">{step}</p>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-5 rounded-[22px] border border-white/12 bg-white/[0.04] p-4">
                    <p className="text-sm font-semibold text-white">Necesitas ayuda para habilitar el acceso?</p>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      Si tu cuenta todavia no ve la prueba o prefieres una activacion guiada, te lo resolvemos por
                      contacto.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href="/contacto"
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#fff0dc]"
                      >
                        Pedir ayuda
                      </Link>
                      <Link
                        href="/urbanfix"
                        className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                      >
                        Ver servicios
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
