import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Link from 'next/link';

import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Contacto | UrbanFix',
  description:
    'Canales oficiales de contacto de UrbanFix para consultas comerciales, implementación y conversaciones sobre la plataforma.',
  alternates: { canonical: '/contacto' },
};

const contactChannels = [
  {
    title: 'Email comercial',
    value: 'info@urbanfixar.com',
    href: 'mailto:info@urbanfixar.com',
    note: 'Consultas generales, demos y conversaciones comerciales.',
  },
  {
    title: 'Teléfono',
    value: '11 7008-4556',
    href: 'tel:1170084556',
    note: 'Canal directo para contacto inicial y seguimiento.',
  },
  {
    title: 'WhatsApp',
    value: '+54 9 11 7008-4556',
    href: 'https://wa.me/5491170084556',
    note: 'Ideal para coordinar rápido por mensaje.',
  },
];

export default function ContactoPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/contacto" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Contacto</p>

            <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Hablemos</h1>
                <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
                  Si quieres implementar UrbanFix en tu equipo, explorar una demo o resolver una consulta
                  comercial, estos son los canales oficiales para contactarnos.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/urbanfix"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Ver servicios
                </Link>
                <Link
                  href="/soporte"
                  className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
                >
                  Centro de soporte
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Web</p>
                <a
                  href="https://www.urbanfix.com.ar"
                  className="mt-2 block text-lg font-semibold text-white transition hover:text-white/80"
                >
                  urbanfix.com.ar
                </a>
                <p className="mt-2 text-sm text-white/70">Sitio principal y acceso a la experiencia pública.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Disponibilidad</p>
                <p className="mt-2 text-lg font-semibold text-white">Comercial y onboarding</p>
                <p className="mt-2 text-sm text-white/70">Ideal para demos, pruebas piloto y primeras conversaciones.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Respuesta</p>
                <p className="mt-2 text-lg font-semibold text-white">Email o WhatsApp</p>
                <p className="mt-2 text-sm text-white/70">Escoge el canal según prefieras formalidad o velocidad.</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <article className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Canales</p>

              <div className="mt-5 grid gap-4">
                {contactChannels.map((channel) => (
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
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Cuando escribirnos</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                  <p>Si quieres implementar UrbanFix en una operación técnica o comercial.</p>
                  <p>Si necesitas una demo, una presentación o una conversación sobre el producto.</p>
                  <p>Si tienes dudas sobre planes, alcance o uso institucional de la plataforma.</p>
                </div>
              </section>

              <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Enlaces utiles</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    href="/urbanfix"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Qué es UrbanFix
                  </Link>
                  <Link
                    href="/soporte"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Centro de soporte
                  </Link>
                  <Link
                    href="/politicas"
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    Políticas y legales
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
