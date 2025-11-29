// client-web/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

export const createAnonClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Faltan las variables de entorno de Supabase.');
  }

  return createClient(url, key);
};