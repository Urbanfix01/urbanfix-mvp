'use client';

import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';

import { trackFunnelEvent } from '../lib/analytics';
import {
  consumeTechnicalRegistrationAttempt,
  getTechnicalRegistrationAttempt,
  getTechnicalRegistrationEventContext,
  isUserCreatedDuringTechnicalRegistrationAttempt,
  wasTechnicalRegistrationAttemptConsumed,
} from '../lib/auth/technical-registration';
import { hasSupabaseConfig, supabase } from '../lib/supabase/supabase';

const syncServerSession = async (session: Session | null) => {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ accessToken: session?.access_token ?? null }),
  });
};

const hasPendingAuthCallback = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) return true;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hash.has('access_token') && hash.has('refresh_token');
};

const finalizeTechnicalRegistration = async (session: Session | null) => {
  if (!session?.user || hasPendingAuthCallback()) return;
  const attempt = getTechnicalRegistrationAttempt();
  if (!attempt || attempt.method !== 'google') return;
  if (wasTechnicalRegistrationAttemptConsumed(attempt.attemptId)) return;

  const currentProfile = String(
    session.user.user_metadata?.user_type || session.user.user_metadata?.profile || ''
  ).toLowerCase();
  if (currentProfile !== 'tecnico' && currentProfile !== 'empresa') {
    await supabase.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        user_type: attempt.accessProfile,
        profile: attempt.accessProfile,
      },
    });
  }

  const isNewAccount = isUserCreatedDuringTechnicalRegistrationAttempt(
    session.user.created_at,
    attempt
  );
  trackFunnelEvent(
    isNewAccount
      ? 'technical_registration_completed'
      : 'technical_registration_existing_account',
    getTechnicalRegistrationEventContext(attempt, {
      provider: 'google',
      session_started: true,
      result: isNewAccount ? 'account_created' : 'existing_account',
    })
  );
  consumeTechnicalRegistrationAttempt(attempt.attemptId);
};

export default function AuthSessionBridge() {
  const lastTokenRef = useRef<string | null | undefined>(undefined);
  const registrationFinalizingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const publish = async (session: Session | null) => {
      const nextToken = session?.access_token ?? null;
      if (lastTokenRef.current === nextToken) return;
      lastTokenRef.current = nextToken;

      try {
        await syncServerSession(session);
        if (!registrationFinalizingRef.current) {
          registrationFinalizingRef.current = true;
          try {
            await finalizeTechnicalRegistration(session);
          } finally {
            registrationFinalizingRef.current = false;
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error sincronizando sesion web:', error);
        }
      }
    };

    if (!hasSupabaseConfig) {
      void publish(null);
      return;
    }

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
