import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Link from 'next/link';

import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Soporte | UrbanFix',
  description:
    'Centro de ayuda y soporte de UrbanFix para consultas tecnicas, comerciales y operativas relacionadas con la plataforma.',
  alternates: { canonical: '/soporte' },
};

const supportChannels = [
  {
    title: 'Email soporte',
    value: 'info@urbanfixar.com',
    href: 'mailto:info@urbanfixar.com',
    note: 'Para incidencias, consultas operativas o seguimiento de casos.',
  },
  {
    title: 'WhatsApp soporte',
    value: '11 7008-4556',
    href: 'https://wa.me/5491170084556',
    note: 'Canal rapido para resolver bloqueos o coordinar asistencia.',
  },
];

export default function SoportePage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/soporte" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Soporte</p>

            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Centro de ayuda y soporte</h1>
                <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                  Si tienes un problema tecnico, operativo o comercial con UrbanFix, aqui estan los canales
                  para contactarnos y destrabar el caso con contexto claro.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/contacto"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Contacto comercial
                </Link>
                <Link
                  href="/politicas"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Politicas
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Tipo de ayuda</p>
                <p className="mt-2 text-lg font-semibold text-white">Tecnica y operativa</p>
                <p className="mt-2 text-sm text-white/70">Ideal para bloqueos, dudas de uso o errores de plataforma.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Canales</p>
                <p className="mt-2 text-lg font-semibold text-white">Email y WhatsApp</p>
                <p className="mt-2 text-sm text-white/70">Escalado formal por correo o soporte rapido por mensaje.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Consejo</p>
                <p className="mt-2 text-lg font-semibold text-white">Envia contexto</p>
                <p className="mt-2 text-sm text-white/70">Incluye capturas, ruta afectada y descripcion breve del problema.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Canales</p>

              <div className="mt-5 grid gap-4">
                {supportChannels.map((channel) => (
                  <a
                    key={channel.title}
                    href={channel.href}
                    target={channel.href.startsWith('http') ? '_blank' : undefined}
                    rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="rounded-3xl border border-white/15 bg-white/[0.04] p-5 transition hover:border-white/30 hover:bg-white/[0.06]"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{channel.title}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{channel.value}</p>
                    <p className="mt-2 text-sm leading-7 text-white/75">{channel.note}</p>
                  </a>
                ))}
              </div>
            </article>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Antes de escribir</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  <p>Indica la ruta o pantalla afectada.</p>
                  <p>Resume el problema con el resultado esperado y el resultado actual.</p>
                  <p>Si puedes, agrega captura, link o referencia del presupuesto, solicitud o usuario afectado.</p>
                </div>
              </section>

              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Enlaces utiles</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    href="/contacto"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Contacto
                  </Link>
                  <Link
                    href="/tecnicos"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Ir a plataforma
                  </Link>
                  <Link
                    href="/politicas"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Politicas y legales
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
