import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Panel Tecnico | UrbanFix',
  description: 'Gestiona tus solicitudes, cotizaciones y disponibilidad en UrbanFix.',
  alternates: {
    canonical: '/tecnicos',
  },
};

export default function TechnicianPanelPage() {
  redirect('/tecnicos');
}
