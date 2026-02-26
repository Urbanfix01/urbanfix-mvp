import type { Metadata } from 'next';
import ClientRequestsHub from './ClientRequestsHub';

export const metadata: Metadata = {
  title: 'Portal cliente | UrbanFix',
  description: 'Publica solicitudes y recibe tecnicos cercanos en UrbanFix.',
  alternates: {
    canonical: '/cliente',
  },
};

export default function ClientePage() {
  return <ClientRequestsHub />;
}
