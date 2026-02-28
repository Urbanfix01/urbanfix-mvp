import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';
import PublicTopNav from '../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description: 'UrbanFix centraliza solicitudes, geolocalizacion y presupuestos para tecnicos y clientes.',
};

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen bg-[#21002f] text-white">
        <PublicTopNav />

        <section className="w-full">
          <picture>
            <source media="(max-width: 768px)" srcSet="/hero/home-cover-mobile.png" />
            <img
              src="/hero/home-cover.png"
              alt="UrbanFix app"
              className="block h-auto w-full"
              loading="eager"
            />
          </picture>
        </section>
      </main>
    </div>
  );
}
