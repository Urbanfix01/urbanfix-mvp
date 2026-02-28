import { Sora } from 'next/font/google';
import PublicTopNav from '../../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export default function ContactoPage() {
  return (
    <div className={sora.className}>
      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/contacto" sticky />

        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Contacto</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Hablemos</h1>
            <p className="mt-4 text-sm text-white/80">
              Si queres implementar UrbanFix en tu equipo o tenes una consulta comercial, contactanos por estos
              canales.
            </p>
            <div className="mt-6 space-y-3 text-sm text-white/90">
              <p>
                Email comercial: <a href="mailto:info@urbanfixar.com" className="underline">info@urbanfixar.com</a>
              </p>
              <p>
                Sitio web: <a href="https://www.urbanfix.com.ar" className="underline">www.urbanfix.com.ar</a>
              </p>
              <p>
                WhatsApp: <a href="https://wa.me/5491170064556" className="underline">+54 9 11 7006-4556</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
