import { useQuery } from '@tanstack/react-query';
import { fetchBlueprints } from '../api/blueprints';
import { ServiceBlueprint } from '../types/database';

export const useBlueprints = () => {
  return useQuery<ServiceBlueprint[], Error>({
    queryKey: ['service_blueprints'],
    queryFn: fetchBlueprints,
    // 🔥 FIX: Apagamos la caché para que siempre traiga los datos nuevos
    staleTime: 0, 
    gcTime: 0,
    refetchOnMount: true
  });
};