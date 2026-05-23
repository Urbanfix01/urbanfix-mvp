import type { Metadata } from 'next';
import TechnicianDashboard from '../../components/TechnicianDashboard';

export const metadata: Metadata = {
  title: 'Panel Técnico | UrbanFix',
  description: 'Gestiona tus solicitudes, cotizaciones y disponibilidad en UrbanFix.',
  alternates: {
    canonical: '/tecnico-panel',
  },
};

export default function TechnicianPanelPage() {
  return <TechnicianDashboard />;
}
