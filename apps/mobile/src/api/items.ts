import { supabase } from '../lib/supabase';
import { MasterItem } from '../types/database';
import { loadDesignPrices } from '../design/designServices';

export const fetchMasterItems = async (): Promise<MasterItem[]> => {
  const owner = (await supabase.auth.getSession()).data.session?.user.id;
  if (!owner) throw new Error('Iniciá sesión para consultar el catálogo.');
  // The controlled service enforces access and country; never fall back to a raw table.
  const [materials, labor] = await Promise.all([
    loadDesignPrices({ owner, countryCode: 'AR' }, 'material'),
    loadDesignPrices({ owner, countryCode: 'AR' }, 'labor'),
  ]);
  if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('La sesión cambió durante la consulta.');
  return [...materials, ...labor].sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'es')) as MasterItem[];
};
