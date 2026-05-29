import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const isPlaceholderUrl = (value?: string) => Boolean(value?.includes('placeholder.supabase.co'));
const isPlaceholderKey = (value?: string) => value === 'placeholder-anon-key';

export const hasSupabaseConfig = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !isPlaceholderUrl(supabaseUrl) &&
    !isPlaceholderKey(supabaseAnonKey)
);

export const supabaseConfigError =
  'Falta configurar Supabase para este entorno. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.';

const disabledLocalUrl = 'http://127.0.0.1:54321';
const disabledAnonKey = 'missing-supabase-anon-key';

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl! : disabledLocalUrl,
  hasSupabaseConfig ? supabaseAnonKey! : disabledAnonKey
);
