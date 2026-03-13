import React from 'react';
import { useRoute } from '@react-navigation/native';

import PublicTechnicianProfileView from '../../components/organisms/PublicTechnicianProfileView';

export default function ClientTechnicianProfileScreen() {
  const route = useRoute<any>();
  const technicianId = String(route.params?.technicianId || '').trim();

  return (
    <PublicTechnicianProfileView
      technicianId={technicianId}
      headerTitle="Perfil tecnico"
      headerSubtitle="Cliente UrbanFix"
      heroEyebrow="Tecnico publicado"
      loadingMessage="Cargando perfil del tecnico..."
      emptyMessage="No encontramos el perfil solicitado."
    />
  );
}
