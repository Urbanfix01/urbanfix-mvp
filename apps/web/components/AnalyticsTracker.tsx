'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase/supabase';

const ANALYTICS_ENDPOINT = '/api/analytics/track';

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server';
  const existing = window.localStorage.getItem('ux_session_id');
  if (existing) return existing;
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem('ux_session_id', generated);
  return generated;
};

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(getSessionId());

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token || null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAccessToken(nextSession?.access_token || null);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const sendEvent = (payload: any) => {
    if (typeof window === 'undefined') return;
    const body = {
      session_id: sessionIdRef.current,
      referrer: document.referrer || '',
      ...payload,
    };
    try {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
        },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // noop
    }
  };

  const flushDuration = () => {
    const start = startTimeRef.current;
    const path = lastPathRef.current;
    if (!start || !path) return;
    const durationMs = Math.max(0, Date.now() - start);
    if (durationMs < 1000) return;
    sendEvent({ event_type: 'page_duration', path, duration_ms: durationMs });
  };

  useEffect(() => {
    const now = Date.now();
    if (lastPathRef.current) {
      flushDuration();
    }
    lastPathRef.current = pathname || '/';
    startTimeRef.current = now;
    sendEvent({ event_type: 'page_view', path: pathname || '/' });
  }, [pathname]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushDuration();
      } else if (document.visibilityState === 'visible') {
        startTimeRef.current = Date.now();
      }
    };
    const handleBeforeUnload = () => {
      flushDuration();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return null;
}
