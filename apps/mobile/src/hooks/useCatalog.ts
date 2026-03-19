import { useQuery } from '@tanstack/react-query';
import { fetchMasterItems } from '../api/items';
import { MasterItem } from '../types/database';

export const useMasterItems = () => {
  return useQuery<MasterItem[], Error>({
    queryKey: ['master_items'], // Clave única para la caché
    queryFn: fetchMasterItems,
    
    // ESTRATEGIA "PARANOID ASYNC" (Offline First)
    staleTime: 1000 * 60 * 60 * 24, // 24 Horas. Los datos se consideran "frescos" un día entero.
    gcTime: 1000 * 60 * 60 * 48,   // Garbage Collection: Mantiene datos en memoria 48hs.
    retry: 2,                      // Reintenta 2 veces si falla la red inicial.
  });
};