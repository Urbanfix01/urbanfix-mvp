import type { Metadata } from 'next';
import { Sora } from 'next/font/google';

import CommunityShell from '../../components/community/CommunityShell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Comunidad UrbanFix',
  description:
    'Feed publico de Comunidad UrbanFix para que tecnicos y empresas publiquen posteos, novedades y publicidades.',
  alternates: { canonical: '/comunidad' },
};

export default function ComunidadPage() {
  return (
    <div className={sora.className}>
      <CommunityShell />
    </div>
  );
}
