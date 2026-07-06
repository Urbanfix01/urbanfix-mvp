import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || Constants.manifest2?.extra || {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const normalizeConfigValue = (value?: string) => String(value || '').trim().replace(/^"|"$/g, '');

const supabaseUrl = normalizeConfigValue(process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl);
const supabaseAnonKey = normalizeConfigValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl! : 'http://127.0.0.1:54321',
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
