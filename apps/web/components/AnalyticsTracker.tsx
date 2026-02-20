'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase/supabase';

const ANALYTICS_ENDPOINT = '/api/analytics/track';
const HEARTBEAT_MS = 60000;

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

  const sendFunnelEvent = (eventName: string, eventContext?: Record<string, unknown>) => {
    const nextPath =
      typeof window !== 'undefined' ? window.location.pathname || pathname || '/' : pathname || '/';
    sendEvent({
      event_type: 'funnel',
      event_name: eventName,
      event_context: eventContext || {},
      path: nextPath,
    });
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
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const tracked = target.closest<HTMLElement>('[data-analytics-event]');
      if (!tracked) return;

      const eventName = (tracked.dataset.analyticsEvent || '').trim();
      if (!eventName) return;

      const eventContext: Record<string, string> = {};
      const label = (tracked.dataset.analyticsLabel || '').trim();
      const location = (tracked.dataset.analyticsLocation || '').trim();
      const targetValue = (tracked.dataset.analyticsTarget || '').trim();
      if (label) eventContext.label = label.slice(0, 180);
      if (location) eventContext.location = location.slice(0, 180);
      if (targetValue) eventContext.target = targetValue.slice(0, 180);

      sendFunnelEvent(eventName.slice(0, 80), eventContext);
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [pathname]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushDuration();
      } else if (document.visibilityState === 'visible') {
        startTimeRef.current = Date.now();
        const path = lastPathRef.current || pathname || '/';
        sendEvent({ event_type: 'heartbeat', path });
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

  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState !== 'visible') return;
      const path = lastPathRef.current || pathname || '/';
      sendEvent({ event_type: 'heartbeat', path });
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    return () => {
      window.clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
