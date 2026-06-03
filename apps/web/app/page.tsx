import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import { ArrowDown } from 'lucide-react';
import AuthHashHandler from '../components/AuthHashHandler';
import FloatingWhatsappChannelButton from '../components/home/FloatingWhatsappChannelButton';
import HomeScrollShowcase from '../components/home/HomeScrollShowcase';
import PublicTopNav from '../components/PublicTopNav';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';

export const metadata: Metadata = {
  title: 'UrbanFix | Plataforma operativa',
  description:
    'UrbanFix conecta clientes, técnicos y empresas para pedir trabajos, cotizar y hacer seguimiento en una sola plataforma.',
};

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />

      <main className="min-h-screen overflow-x-hidden bg-[#21002f] text-white">
        <PublicTopNav activeHref="/" />

        <section className="relative w-full border-b border-white/10">
          <picture>
            <source media="(max-width: 768px)" srcSet="/hero/home-cover-mobile.png" />
            <img
              src="/hero/home-cover.png"
              alt="UrbanFix app"
              className="block h-auto w-full max-w-full"
              loading="eager"
            />
          </picture>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#21002f] via-[#21002f]/70 to-transparent sm:h-44" />
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center sm:bottom-6">
            <div className="animate-bounce">
              <ArrowDown className="h-6 w-6 text-white/75" />
            </div>
          </div>
        </section>

        <HomeScrollShowcase />
      </main>
      <FloatingWhatsappChannelButton href={WHATSAPP_CHANNEL_URL} />
    </div>
  );
}
