import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';
import FloatingWhatsappChannelButton from '../components/home/FloatingWhatsappChannelButton';
import HomeAnimatedHero from '../components/home/HomeAnimatedHero';
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

        <HomeAnimatedHero />
      </main>
      <FloatingWhatsappChannelButton href={WHATSAPP_CHANNEL_URL} />
    </div>
  );
}
