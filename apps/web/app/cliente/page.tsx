import type { Metadata } from 'next';
import ClientRequestsHub from './ClientRequestsHub';

export const metadata: Metadata = {
  title: 'UrbanFix Clientes | Solicitudes de trabajo',
  description: 'Publica una solicitud, recibe tecnicos cercanos y coordina tu trabajo.',
  alternates: {
    canonical: '/cliente',
  },
};

export default function ClientePage() {
  return <ClientRequestsHub />;
}
