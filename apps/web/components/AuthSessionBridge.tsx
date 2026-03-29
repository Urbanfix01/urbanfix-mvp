'use client';

import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase/supabase';

const syncServerSession = async (session: Session | null) => {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ accessToken: session?.access_token ?? null }),
  });
};

export default function AuthSessionBridge() {
  const lastTokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const publish = async (session: Session | null) => {
      const nextToken = session?.access_token ?? null;
      if (lastTokenRef.current === nextToken) return;
      lastTokenRef.current = nextToken;

      try {
        await syncServerSession(session);
      } catch (error) {
        if (!cancelled) {
          console.error('Error sincronizando sesion web:', error);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        void publish(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void publish(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}