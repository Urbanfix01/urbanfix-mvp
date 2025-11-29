/**
 * src/api/items.ts
 * Capa de comunicación con Supabase para el Catálogo.
 */
import { supabase } from '../lib/supabase';
import { MasterItem } from '../types/database';

export const fetchMasterItems = async (): Promise<MasterItem[]> => {
  // 1. Petición a Supabase
  const { data, error } = await supabase
    .from('master_items')
    .select('*')
    .order('name', { ascending: true }); // Orden alfabético por defecto

  // 2. Manejo de Errores (Critical Path)
  if (error) {
    console.error('Error fetching master_items:', error.message);
    throw new Error('No se pudo cargar el catálogo oficial. Verifique su conexión.');
  }

  // 3. Retorno tipado
  return data as MasterItem[];
};