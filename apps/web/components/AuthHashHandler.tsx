'use client';

import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getAuthAccessProfileIntent,
  getAuthUserProfileFromMetadata,
  POST_AUTH_REDIRECT_KEY,
  sanitizeNextPath,
} from '../lib/auth/post-auth';
import { hasSupabaseConfig, supabase } from '../lib/supabase/supabase';

const getOAuthTokensFromHash = () => {
  if (typeof window === 'undefined') return null;
  if (!window.location.hash) return null;
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type = params.get('type') || undefined;
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, type };
};

const getAuthCodeFromSearch = () => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const type = params.get('type') || undefined;
  if (!code) return null;
  return { code, type };
};

const stripAuthParams = () => {
  if (typeof window === 'undefined') return '/';
  const url = new URL(window.location.href);
  ['code', 'type', 'error', 'error_code', 'error_description', 'state', 'provider'].forEach((key) =>
    url.searchParams.delete(key)
  );
  url.hash = '';
  return `${url.pathname}${url.search}`;
};

const resolvePostAuthRedirect = (cleanedPath: string, isRecovery: boolean) => {
  if (typeof window === 'undefined') return '/tecnicos';
  if (isRecovery) return '/tecnicos?recovery=1';
  let storedRedirect: string | null = null;
  try {
    storedRedirect = sanitizeNextPath(window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY));
  } catch {
    storedRedirect = null;
  }
  if (storedRedirect) {
    try {
      window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    } catch {
      // Ignore storage errors in embedded browsers.
    }
    return storedRedirect;
  }
  const safeCleanedPath = sanitizeNextPath(cleanedPath);
  if (safeCleanedPath && safeCleanedPath !== '/') return safeCleanedPath;
  return '/tecnicos';
};

const applyIntendedAccessProfile = async (session: Session | null) => {
  if (!session?.user) return;
  const intendedProfile = getAuthAccessProfileIntent();
  if (intendedProfile !== 'tecnico' && intendedProfile !== 'empresa') return;
  const currentProfile = getAuthUserProfileFromMetadata(session.user.user_metadata);
  if (currentProfile === 'tecnico' || currentProfile === 'empresa') return;

  const { error } = await supabase.auth.updateUser({
    data: {
      ...session.user.user_metadata,
      user_type: intendedProfile,
      profile: intendedProfile,
    },
  });
  if (error) {
    console.error('Error guardando el perfil de acceso OAuth:', error);
  }
};

export default function AuthHashHandler() {
  useEffect(() => {
    const tokens = getOAuthTokensFromHash();
    const code = getAuthCodeFromSearch();
    if (!tokens && !code) return;
    if (!hasSupabaseConfig) {
      console.error('No se pudo completar OAuth: falta configurar Supabase.');
      return;
    }

    const cleanedPath = stripAuthParams();
    const isRecovery =
      tokens?.type === 'recovery' ||
      code?.type === 'recovery' ||
      new URLSearchParams(window.location.search).get('recovery') === '1';
    const redirectPath = resolvePostAuthRedirect(cleanedPath, isRecovery);

    if (tokens) {
      supabase.auth
        .setSession(tokens)
        .then(async ({ data, error }) => {
          if (error) {
            console.error('Error guardando sesion OAuth:', error);
            return;
          }
          await applyIntendedAccessProfile(data.session);
          window.history.replaceState({}, document.title, redirectPath);
          window.location.replace(redirectPath);
        })
        .catch((error) => {
          console.error('Error guardando sesion OAuth:', error);
        });
      return;
    }

    if (code) {
      supabase.auth
        .exchangeCodeForSession(window.location.href)
        .then(async ({ data, error }) => {
          if (error) {
            console.error('Error intercambiando code:', error);
            return;
          }
          await applyIntendedAccessProfile(data.session);
          window.history.replaceState({}, document.title, redirectPath);
          window.location.replace(redirectPath);
        })
        .catch((error) => {
          console.error('Error intercambiando code:', error);
        });
    }
  }, []);

  return null;
}
