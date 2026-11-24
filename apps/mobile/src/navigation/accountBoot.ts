import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { MobileAudience } from '../utils/audience';

export const STARTUP_TIMEOUT_MS = 12000;
const abortError = () => Object.assign(new Error('La carga se interrumpió.'), { name: 'AbortError' });

// Bound startup operations and discard late results, including storage promises
// that do not support cancellation themselves.
export function withStartupDeadline<T>(operation: (signal: AbortSignal) => PromiseLike<T>, { signal, timeout = STARTUP_TIMEOUT_MS }: { signal?: AbortSignal; timeout?: number } = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    const finish = (success: boolean, result: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (success) resolve(result as T); else reject(result);
    };
    const cancel = () => { finish(false, abortError()); controller.abort(); };
    const timer = setTimeout(() => { finish(false, new Error('No pudimos terminar de cargar tu cuenta. Revisá la conexión y volvé a intentar.')); controller.abort(); }, timeout);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    Promise.resolve().then(() => { if (controller.signal.aborted) throw abortError(); return operation(controller.signal); }).then(value => finish(true, value), error => finish(false, error));
  });
}

export type SessionBoot = { status: 'loading' | 'ready' | 'error'; session: Session | null; event?: string };

export function observeSession(auth: Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'>, onState: (state: SessionBoot) => void, onSignIn: (owner: string) => void, timeout = STARTUP_TIMEOUT_MS) {
  let active = true, events = 0;
  const controller = new AbortController();
  onState({ status: 'loading', session: null });
  const initialEvents = events;
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (!active) return;
    events++;
    // Keep the auth callback synchronous; never await another auth operation here.
    if (event === 'SIGNED_IN' && session?.user.id) onSignIn(session.user.id);
    onState({ status: 'ready', session, event });
  });
  void withStartupDeadline(() => auth.getSession(), { signal: controller.signal, timeout }).then(({ data, error }) => {
    if (!active || events !== initialEvents) return;
    if (error) throw error;
    onState({ status: 'ready', session: data.session });
  }).catch(() => {
    if (active && events === initialEvents) onState({ status: 'error', session: null });
  });
  return () => { active = false; controller.abort(); subscription.unsubscribe(); };
}

export type ShellProfile = { phone?: unknown; city?: unknown; business_name?: unknown; access_granted?: boolean | null };
export type AccountShell = { owner: string; audience: MobileAudience; needsProfileCompletion: boolean };
export const hasRequiredValue = (value: unknown) => String(value || '').trim().length > 0;
const audienceValue = (value: unknown): MobileAudience | null => {
  const text = String(value || '').trim().toLowerCase();
  return text === 'tecnico' || text === 'cliente' ? text : null;
};

// Audience selects a workspace, never grants access. API/RLS still enforce the
// authenticated owner independently of this editable display preference.
export function resolveAccountShell(session: Session, storedAudience: MobileAudience | null, profile: ShellProfile | null): AccountShell {
  const metadata = session.user.user_metadata || {};
  const audience = storedAudience || audienceValue(metadata.app_audience)
    || (profile ? profile.access_granted || hasRequiredValue(profile.business_name) ? 'tecnico' : 'cliente' : 'tecnico');
  const field = (name: 'phone' | 'city' | 'business_name') => hasRequiredValue(profile?.[name]) ? profile?.[name] : metadata[name];
  return { owner: session.user.id, audience, needsProfileCompletion: !(hasRequiredValue(field('phone')) && hasRequiredValue(field(audience === 'cliente' ? 'city' : 'business_name'))) };
}
