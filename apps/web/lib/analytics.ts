export const ANALYTICS_ENDPOINT = '/api/analytics/track';

const SESSION_ID_KEY = 'ux_session_id';
const SESSION_LAST_ACTIVITY_KEY = 'ux_session_last_activity';
const SESSION_CREATED_AT_KEY = 'ux_session_created_at';
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

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

const toSafeTimestamp = (value: string | null) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const persistAnalyticsSession = (storage: Storage, sessionId: string, timestamp: number) => {
  storage.setItem(SESSION_ID_KEY, sessionId);
  storage.setItem(SESSION_LAST_ACTIVITY_KEY, String(timestamp));
  storage.setItem(SESSION_CREATED_AT_KEY, String(timestamp));
};

const touchAnalyticsSession = (storage: Storage, timestamp: number) => {
  storage.setItem(SESSION_LAST_ACTIVITY_KEY, String(timestamp));
};

export const startNewAnalyticsSessionId = () => {
  if (typeof window === 'undefined') return 'server';

  const generated = createAnalyticsSessionId();
  try {
    persistAnalyticsSession(window.localStorage, generated, Date.now());
  } catch {
    // Instagram/private webviews can block storage access; tracking must not crash the app.
  }
  return generated;
};

export const getOrCreateAnalyticsSessionId = () => {
  if (typeof window === 'undefined') return 'server';

  try {
    const storage = window.localStorage;
    const now = Date.now();
    const existing = storage.getItem(SESSION_ID_KEY);
    const lastActivity = toSafeTimestamp(storage.getItem(SESSION_LAST_ACTIVITY_KEY));
    const createdAt = toSafeTimestamp(storage.getItem(SESSION_CREATED_AT_KEY));
    const isActive = lastActivity > 0 && now - lastActivity <= SESSION_IDLE_TIMEOUT_MS;
    const isFresh = createdAt > 0 && now - createdAt <= SESSION_MAX_AGE_MS;

    if (existing && isActive && isFresh) {
      touchAnalyticsSession(storage, now);
      return existing;
    }

    const generated = createAnalyticsSessionId();
    persistAnalyticsSession(storage, generated, now);
    return generated;
  } catch {
    // Instagram/private webviews can block storage access; tracking must not crash the app.
  }

  return createAnalyticsSessionId();
};