import type { Metadata } from 'next';
import { Sora } from 'next/font/google';

import PublicTopNav from '../../../components/PublicTopNav';
import {
  AUGUST_2026_NEWSLETTER_INTRO,
  AUGUST_2026_NEWSLETTER_PARAGRAPHS,
  AUGUST_2026_NEWSLETTER_PREVIEW,
  AUGUST_2026_NEWSLETTER_TITLE,
} from '../../../lib/newsletter-august-2026';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Informe Agosto 2026 | UrbanFix',
  description: AUGUST_2026_NEWSLETTER_PREVIEW,
};

const reportHighlights = [
  { label: 'Comunidad', value: 'Muro UrbanFix activo' },
  { label: 'Mapa', value: 'Busqueda por zona y rubro' },
  { label: 'Tecnicos', value: 'Perfiles y registro mas claros' },
  { label: 'Valores', value: 'Mano de obra Julio / Agosto' },
];

const reportLinks = [
  { label: 'Ver comunidad', href: '/comunidad' },
  { label: 'Encontrar tecnicos', href: '/vidriera' },
  { label: 'Valores actualizados', href: '/tecnicos?tab=precios' },
];

export default function August2026ReportPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen bg-[#21002f] text-white">
        <PublicTopNav activeHref="/" showNavigationLinks sticky />

        <section className="px-5 py-12 sm:px-8 sm:py-16">
          <article className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#2a0338] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
            <div className="bg-gradient-to-br from-[#5a155c] via-[#3a0649] to-[#21002f] p-7 sm:p-10">
              <div className="flex items-center gap-3">
                <img src="/icon-48.png" alt="UrbanFix" className="h-11 w-11 rounded-xl" />
                <span className="ufx-brand-word text-[1.35rem] font-extrabold leading-none">
                  <span className="ufx-brand-word-main">URBAN</span>
                  <span className="ufx-brand-word-accent">FIX</span>
                </span>
              </div>

              <p className="mt-8 text-[0.72rem] font-extrabold uppercase tracking-[0.24em] text-[#ffbf7a]">
                Informe publico
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
                {AUGUST_2026_NEWSLETTER_TITLE}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/75 sm:text-lg">
                {AUGUST_2026_NEWSLETTER_INTRO}
              </p>
            </div>

            <div className="p-7 sm:p-10">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {reportHighlights.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-[#ffbf7a]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-9 space-y-5 text-base leading-8 text-white/75 sm:text-lg">
                {AUGUST_2026_NEWSLETTER_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {reportLinks.map((link, index) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-extrabold uppercase tracking-normal transition ${
                      index === 0
                        ? 'bg-[#ff8f1f] text-[#21002f] shadow-[0_18px_42px_rgba(255,143,31,0.24)] hover:bg-[#ffbf7a]'
                        : 'border border-white/20 text-white hover:border-[#ff8f1f]/70 hover:text-[#ffbf7a]'
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
