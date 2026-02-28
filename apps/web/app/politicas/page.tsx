import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function PoliticasPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/politicas" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Politicas</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Privacidad y terminos</h1>
            <p className="mt-4 text-sm text-white/80">
              Consulta las politicas vigentes de UrbanFix para uso de la plataforma y tratamiento de datos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/privacidad"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Politica de privacidad
              </a>
              <a
                href="/terminos"
                className="rounded-full border border-white/35 px-4 py-2 text-xs font-semibold text-white/90 transition hover:border-white hover:text-white"
              >
                Terminos y condiciones
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
