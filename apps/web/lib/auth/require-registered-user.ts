import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createAnonClient } from '../supabase/server';
import {
  AUTH_ACCESS_TOKEN_COOKIE,
  buildAuthRedirectPath,
  getAuthUserProfileFromMetadata,
  isPriceAccessPath,
  sanitizeNextPath,
} from './post-auth';

export async function requireRegisteredUser(nextPath: string) {
  const safeNextPath = sanitizeNextPath(nextPath) || '/';
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect(buildAuthRedirectPath(safeNextPath));
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    redirect(buildAuthRedirectPath(safeNextPath));
  }

  if (isPriceAccessPath(safeNextPath)) {
    const accountProfile = getAuthUserProfileFromMetadata(data.user.user_metadata);
    redirect(accountProfile === 'cliente' ? '/cliente?view=precios' : '/tecnicos?tab=precios');
  }

  return data.user;
}
