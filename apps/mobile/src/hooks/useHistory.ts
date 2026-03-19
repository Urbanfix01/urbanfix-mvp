import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type HistoryQuoteRow = {
  id: string;
  client_name?: string | null;
  total_amount?: number | null;
  status?: string | null;
  created_at: string;
  completed_at?: string | null;
  paid_at?: string | null;
  archived_at?: string | null;
};

export type HistoryItem = HistoryQuoteRow & {
  history_date: string;
  history_type: 'archived' | 'completed';
};

export type HistorySection = {
  title: string;
  totalAmount: number;
  data: HistoryItem[];
};

const buildHistorySections = (quotes: HistoryQuoteRow[]) => {
  const historyItems = quotes
    .filter((quote) => quote.archived_at || String(quote.status || '').toLowerCase() === 'completed')
    .map((quote) => ({
      ...quote,
      history_date: String(quote.archived_at || quote.completed_at || quote.paid_at || quote.created_at),
      history_type: (quote.archived_at ? 'archived' : 'completed') as 'archived' | 'completed',
    }))
    .sort((a, b) => new Date(b.history_date).getTime() - new Date(a.history_date).getTime());

  const grouped = historyItems.reduce<Record<string, HistorySection>>((acc, job) => {
    const date = new Date(job.history_date);
    const monthYear = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const title = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

    if (!acc[title]) {
      acc[title] = { title, data: [], totalAmount: 0 };
    }

    acc[title].data.push(job);
    acc[title].totalAmount += job.total_amount || 0;
    return acc;
  }, {});

  return Object.values(grouped);
};

export const useHistory = () => {
  return useQuery<HistorySection[]>({
    queryKey: ['job_history'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const attempts = [
        {
          select: 'id, client_name, total_amount, status, created_at, completed_at, paid_at, archived_at',
          map: (items: any[]) => items as HistoryQuoteRow[],
        },
        {
          select: 'id, client_name, total_amount, status, created_at, completed_at, paid_at',
          map: (items: any[]) => items.map((item) => ({ ...item, archived_at: null })) as HistoryQuoteRow[],
        },
      ] as const;

      let lastError: unknown = null;
      for (const attempt of attempts) {
        const { data, error } = await supabase
          .from('quotes')
          .select(attempt.select)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error) {
          return buildHistorySections(attempt.map(data || []));
        }
        lastError = error;
      }

      throw lastError;
    },
  });
};
