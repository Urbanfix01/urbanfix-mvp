export const ANALYTICS_ENDPOINT = '/api/analytics/track';

const createAnalyticsSessionId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Some embedded browsers expose crypto partially.
  }

  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateAnalyticsSessionId = () => {
  if (typeof window === 'undefined') return 'server';

  try {
    const storage = window.localStorage;
    const existing = storage.getItem('ux_session_id');
    if (existing) return existing;

    const generated = createAnalyticsSessionId();
    storage.setItem('ux_session_id', generated);
    return generated;
  } catch {
    // Instagram/private webviews can block storage access; tracking must not crash the app.
  }

  return createAnalyticsSessionId();
};
