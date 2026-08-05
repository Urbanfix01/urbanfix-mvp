import type { Metadata } from 'next';
import { Sora } from 'next/font/google';
import AuthHashHandler from '../components/AuthHashHandler';
import FloatingWhatsappChannelButton from '../components/home/FloatingWhatsappChannelButton';
import UrbanFixBase44Landing from '../components/home/UrbanFixBase44Landing';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';

export const metadata: Metadata = {
  title: 'UrbanFix | Oficios y hogares conectados',
  description:
    'UrbanFix conecta vecinos con técnicos de oficio para pedir trabajos, comparar propuestas y organizar cada servicio.',
};

export default function HomePage() {
  return (
    <div className={sora.className}>
      <AuthHashHandler />
      <UrbanFixBase44Landing />
      <FloatingWhatsappChannelButton href={WHATSAPP_CHANNEL_URL} />
    </div>
  );
}
