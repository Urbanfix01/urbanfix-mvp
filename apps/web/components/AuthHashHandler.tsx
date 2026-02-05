'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase/supabase';

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

export default function AuthHashHandler() {
  useEffect(() => {
    const tokens = getOAuthTokensFromHash();
    const code = getAuthCodeFromSearch();
    if (!tokens && !code) return;

    const basePath = window.location.pathname || '/';
    const cleanedPath = stripAuthParams();
    const isRecovery =
      tokens?.type === 'recovery' ||
      code?.type === 'recovery' ||
      new URLSearchParams(window.location.search).get('recovery') === '1' ||
      (basePath === '/' && !!code && !code.type);
    const redirectPath = isRecovery ? '/tecnicos?recovery=1' : cleanedPath;

    if (tokens) {
      supabase.auth
        .setSession(tokens)
        .then(({ error }) => {
          if (error) {
            console.error('Error guardando sesion OAuth:', error);
            return;
          }
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
        .then(({ error }) => {
          if (error) {
            console.error('Error intercambiando code:', error);
            return;
          }
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
