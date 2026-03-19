export const ANALYTICS_ENDPOINT = '/api/analytics/track';

export const getOrCreateAnalyticsSessionId = () => {
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
