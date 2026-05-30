import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig, supabaseConfigError } from './config';

const { url: supabaseUrl, anonKey: supabaseAnonKey, hasConfig } = getPublicSupabaseConfig();
export const hasSupabaseConfig = hasConfig;
export { supabaseConfigError };

const disabledLocalUrl = 'http://127.0.0.1:54321';
const disabledAnonKey = 'missing-supabase-anon-key';

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : disabledLocalUrl,
  hasSupabaseConfig ? supabaseAnonKey : disabledAnonKey
);
