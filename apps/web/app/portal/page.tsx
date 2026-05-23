import type { Metadata } from 'next';

import PortalAccessHub from '../../components/PortalAccessHub';

export const metadata: Metadata = {
  title: 'Acceso a Cuentas | UrbanFix',
  description: 'Elige si entras como cliente o tecnico y sigue al panel correcto.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalPage() {
  return <PortalAccessHub />;
}
