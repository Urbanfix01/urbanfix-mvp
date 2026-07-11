import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || Constants.manifest2?.extra || {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const normalizeConfigValue = (value?: string) => String(value || '').trim().replace(/^"|"$/g, '');

const supabaseUrl = normalizeConfigValue(
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || extra.supabaseUrl
);
const supabaseAnonKey = normalizeConfigValue(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey
);

const isValidSupabaseUrl = (value?: string) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value || '');

export const hasSupabaseConfig = Boolean(isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey);

export const assertSupabaseConfig = () => {
  if (hasSupabaseConfig) return;

  throw new Error(
    'La app no tiene configurada la conexion segura. Revisa EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY antes de publicar.'
  );
};

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl! : 'https://missing-supabase-config.invalid',
  hasSupabaseConfig ? supabaseAnonKey! : 'missing-supabase-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);
