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
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
};

export default function AuthHashHandler() {
  useEffect(() => {
    const tokens = getOAuthTokensFromHash();
    if (!tokens) return;

    supabase.auth
      .setSession(tokens)
      .then(({ error }) => {
        if (error) {
          console.error('Error guardando sesion OAuth:', error);
          return;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.replace('/tecnicos');
      })
      .catch((error) => {
        console.error('Error guardando sesion OAuth:', error);
      });
  }, []);

  return null;
}
