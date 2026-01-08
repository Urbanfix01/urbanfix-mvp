import { supabase } from '../lib/supabase';
import { ServiceBlueprint } from '../types/database';

export const fetchBlueprints = async (): Promise<ServiceBlueprint[]> => {
  
  // JOIN COMPLEX: Traemos el Blueprint -> Sus Componentes -> Los Datos del Item (Precio/Nombre)
  const { data, error } = await supabase
    .from('service_blueprints')
    .select(`
      id,
      name,
      description,
      blueprint_components (
        item_id,
        quantity,
        is_removable,
        master_items (
          id,
          name,
          type,
          suggested_price
        )
      )
    `);

  if (error) {
    console.error('Error fetching blueprints:', error.message);
    throw new Error('No se pudieron cargar los modelos de trabajo');
  }

  return data as unknown as ServiceBlueprint[];
};