export const ANALYTICS_ENDPOINT = '/api/analytics/track';
export const ANALYTICS_FUNNEL_EVENT = 'urbanfix:analytics-funnel';

export type AnalyticsFunnelEventDetail = {
  eventName: string;
  eventContext?: Record<string, unknown>;
};

type AnalyticsBrowserWindow = Window & {
  __urbanfixAnalyticsFunnelReady?: boolean;
  __urbanfixAnalyticsFunnelQueue?: AnalyticsFunnelEventDetail[];
};

const SESSION_ID_KEY = 'ux_session_id';
const SESSION_LAST_ACTIVITY_KEY = 'ux_session_last_activity';
const SESSION_CREATED_AT_KEY = 'ux_session_created_at';
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_QUEUED_FUNNEL_EVENTS = 50;

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

export const trackFunnelEvent = (
  eventName: string,
  eventContext?: Record<string, unknown>
) => {
  if (typeof window === 'undefined') return;

  const normalizedEventName = String(eventName || '').trim().slice(0, 80);
  if (!normalizedEventName) return;

  const detail: AnalyticsFunnelEventDetail = {
    eventName: normalizedEventName,
    eventContext: eventContext || {},
  };
  const analyticsWindow = window as AnalyticsBrowserWindow;

  if (!analyticsWindow.__urbanfixAnalyticsFunnelReady) {
    const queuedEvents = analyticsWindow.__urbanfixAnalyticsFunnelQueue || [];
    analyticsWindow.__urbanfixAnalyticsFunnelQueue = [...queuedEvents, detail].slice(
      -MAX_QUEUED_FUNNEL_EVENTS
    );
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AnalyticsFunnelEventDetail>(ANALYTICS_FUNNEL_EVENT, {
      detail,
    })
  );
};

export const setAnalyticsFunnelReady = (ready: boolean) => {
  if (typeof window === 'undefined') return;
  (window as AnalyticsBrowserWindow).__urbanfixAnalyticsFunnelReady = ready;
};

export const drainQueuedAnalyticsFunnelEvents = () => {
  if (typeof window === 'undefined') return [] as AnalyticsFunnelEventDetail[];

  const analyticsWindow = window as AnalyticsBrowserWindow;
  const queuedEvents = analyticsWindow.__urbanfixAnalyticsFunnelQueue || [];
  analyticsWindow.__urbanfixAnalyticsFunnelQueue = [];
  return queuedEvents;
};
