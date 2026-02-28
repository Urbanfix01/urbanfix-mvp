import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function SoportePage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/soporte" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Soporte UrbanFix</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Centro de ayuda y soporte</h1>
            <p className="mt-4 text-sm text-white/80">
              Si tenes un problema tecnico o comercial, escribinos y te ayudamos a resolverlo.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href="mailto:info@urbanfixar.com"
                className="rounded-xl border border-white/25 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
              >
                Email: info@urbanfixar.com
              </a>
              <a
                href="https://wa.me/5491170064556"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/25 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
              >
                WhatsApp soporte
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
