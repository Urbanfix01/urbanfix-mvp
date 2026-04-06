import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';

import PublicTopNav from '../../components/PublicTopNav';
import { gremiosCatalog } from '../../lib/seo/gremios-data';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Gremios de Construccion | UrbanFix Argentina',
  description:
    'Lista simple de gremios del mundo de la construccion para ubicar rapido cada especialidad.',
  alternates: { canonical: '/gremios' },
};

export default function GremiosPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen bg-[#f8f5f0] text-slate-900">
        <PublicTopNav activeHref="/gremios" sticky />

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Gremios</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Lista de gremios</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Solo dejamos el listado simple para entrar directo a cada gremio.
            </p>

            <div className="mt-8 divide-y divide-slate-200">
              {gremiosCatalog.map((gremio, index) => (
                <Link
                  key={gremio.slug}
                  href={`/gremios/${gremio.slug}`}
                  className="flex items-center justify-between gap-4 py-4 text-sm transition hover:text-[#d66d00]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="w-8 shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate text-base font-medium text-slate-900">{gremio.title}</span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Ver
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}