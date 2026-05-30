// client-web/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import {
  getPublicSupabaseConfig,
  getServiceSupabaseConfig,
  supabaseConfigError,
  supabaseServerConfigError,
} from './config';

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
} as const;

export const createAnonClient = () => {
  const { url, anonKey, hasConfig } = getPublicSupabaseConfig();
  if (!hasConfig) {
    throw new Error(supabaseConfigError);
  }

  return createClient(url, anonKey, serverAuthOptions);
};

export const createServiceRoleClient = () => {
  const { url, serviceRoleKey, hasConfig } = getServiceSupabaseConfig();
  if (!hasConfig) {
    throw new Error(supabaseServerConfigError);
  }

  return createClient(url, serviceRoleKey, serverAuthOptions);
};

export const getServiceRoleClient = () => {
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
};
