import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description: 'UrbanFix centraliza solicitudes, geolocalizacion y presupuestos para tecnicos y clientes.',
};

const navLinks = [
  { label: 'Servicios', href: '/urbanfix' },
  { label: 'Segmentos', href: '/rubros' },
  { label: 'Impacto', href: '/vidriera' },
];

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen bg-[#21002f] text-white">
        <header className="border-b border-white/10 bg-[#2a0338]/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
            <a href="/" className="flex items-center gap-3">
              <img src="/icon.png" alt="UrbanFix" className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-extrabold tracking-tight">
                URBAN<span className="text-[#ff8f1f]">FIX</span>
              </span>
            </a>

            <div className="flex items-center gap-3 sm:gap-6">
              <nav className="hidden items-center gap-6 md:flex">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm font-semibold text-white/85 transition hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <a
                href="/tecnicos"
                className="rounded-full border border-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white hover:text-[#2a0338]"
              >
                Ir a plataforma
              </a>
            </div>
          </div>
        </header>

        <section className="h-[calc(100vh-73px)] w-full">
          <img
            src="/hero/home-cover.png"
            alt="UrbanFix app"
            className="h-full w-full object-cover"
            loading="eager"
          />
        </section>
      </main>
    </div>
  );
}
