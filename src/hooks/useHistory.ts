import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useHistory = () => {
  return useQuery({
    queryKey: ['job_history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // 1. Traemos solo los trabajos "Cerrados" o "Aceptados"
      // (Si tienes trabajos viejos sin estado, podrías quitar el filtro .in() para probar)
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['accepted', 'locked']) 
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Lógica de Agrupación por Mes
      const grouped = data.reduce((acc: any, job) => {
        const date = new Date(job.created_at);
        // Clave ej: "Noviembre 2025"
        const monthYear = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const title = monthYear.charAt(0).toUpperCase() + monthYear.slice(1); 

        if (!acc[title]) {
          acc[title] = { title, data: [], totalAmount: 0 };
        }

        acc[title].data.push(job);
        acc[title].totalAmount += (job.total_amount || 0);
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });
};