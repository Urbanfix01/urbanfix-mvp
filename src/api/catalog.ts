import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

// Definimos el tipo de retorno explícito
export type MasterItem = Database['public']['Tables']['master_items']['Row'];

export const getMasterItems = async (): Promise<MasterItem[]> => {
  const { data, error } = await supabase
    .from('master_items')
    .select('*')
    .order('name', { ascending: true }); // Orden alfabético por defecto

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};