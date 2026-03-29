import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { AUTH_ACCESS_TOKEN_COOKIE, buildAuthRedirectPath, sanitizeNextPath } from './post-auth';

const createSupabaseAuthClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Faltan las variables de entorno de Supabase.');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function requireRegisteredUser(nextPath: string) {
  const safeNextPath = sanitizeNextPath(nextPath) || '/';
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect(buildAuthRedirectPath(safeNextPath));
  }

  const supabase = createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    redirect(buildAuthRedirectPath(safeNextPath));
  }

  return data.user;
}