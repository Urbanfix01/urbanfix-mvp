import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Politica de Privacidad | UrbanFix',
  description: 'Conoce cÃ³mo UrbanFix recopila, usa y protege tu informaciÃ³n personal. Tu privacidad es nuestra prioridad.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  return (
    <div className={sora.className}>
      <div className="min-h-screen bg-[#F5F4F0] text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#F5B942]/30 blur-3xl" />
          <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#94A3B8]/25 blur-3xl" />

          <main className="relative mx-auto w-full max-w-4xl px-6 py-12">
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                  <Image src="/icon.png" alt="UrbanFix logo" width={32} height={32} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Politica de privacidad</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/urbanfix"
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Que es UrbanFix
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Volver al inicio
                </Link>
              </div>
            </header>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Politica</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Politica de privacidad</h1>
              <p className="mt-2 text-xs text-slate-500">Ultima actualizacion: 24/07/2024</p>

              <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                <p>
                  En UrbanFix respetamos tu privacidad. Esta politica describe como recopilamos y usamos la
                  informacion cuando utilizas nuestros servicios.
                </p>
                <p>
                  Datos que podemos solicitar: nombre, correo electronico, telefono, direccion del servicio y
                  detalles necesarios para generar presupuestos. No vendemos ni compartimos tu informacion con
                  terceros no autorizados.
                </p>
                <p>
                  Usamos proveedores externos como Google y Supabase para autenticacion y almacenamiento seguro.
                  Tus datos solo se utilizan para operar el servicio y mejorar la experiencia.
                </p>
                <p>
                  Puedes solicitar la actualizacion o eliminacion de tus datos escribiendo a{' '}
                  <a href="mailto:info@urbanfix.com.ar" className="font-semibold text-slate-700 underline">
                    info@urbanfix.com.ar
                  </a>{' '}
                  o siguiendo las instrucciones en{' '}
                  <Link href="/eliminar-cuenta" className="font-semibold text-slate-700 underline">
                    urbanfix.com.ar/eliminar-cuenta
                  </Link>
                  .
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contacto</p>
              <a href="mailto:info@urbanfix.com.ar" className="mt-2 block font-semibold text-slate-900 hover:underline">
                info@urbanfix.com.ar
              </a>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

