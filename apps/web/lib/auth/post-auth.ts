export const POST_AUTH_REDIRECT_KEY = 'urbanfix_post_auth_redirect';
export const AUTH_ACCESS_TOKEN_COOKIE = 'urbanfix_access_token';
export const PRICE_ACCESS_INTENT = 'prices';
export const AUTH_ACCESS_PROFILE_INTENT_KEY = 'urbanfix_auth_access_profile_intent';

export type AuthAccessProfile = 'tecnico' | 'empresa' | 'cliente';

const PRICE_ACCESS_PATH_PREFIXES = ['/precios-mano-de-obra', '/rubros'];
const POST_AUTH_ALLOWED_PATH_PREFIXES = ['/tecnicos', '/tecnico-panel', '/cliente', '/admin', ...PRICE_ACCESS_PATH_PREFIXES];
const AUTH_ACCESS_PROFILE_INTENT_TTL_MS = 30 * 60 * 1000;

const decodePathForValidation = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getPathOnly = (value: string) => value.split(/[?#]/)[0] || '/';

const hasAllowedPostAuthPrefix = (pathOnly: string) => {
  if (pathOnly === '/') return true;
  return POST_AUTH_ALLOWED_PATH_PREFIXES.some((prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`));
};

export const sanitizeNextPath = (value: string | null | undefined) => {
  const normalized = String(value || '').trim();
  if (!normalized.startsWith('/')) return null;
  if (normalized.startsWith('//')) return null;
  if (/[\u0000-\u001F\u007F\\]/.test(normalized)) return null;

  const decoded = decodePathForValidation(normalized);
  if (!decoded.startsWith('/')) return null;
  if (decoded.startsWith('//')) return null;
  if (/[\u0000-\u001F\u007F\\]/.test(decoded)) return null;

  const pathOnly = getPathOnly(decoded);
  if (pathOnly.split('/').some((segment) => segment === '..')) return null;
  if (!hasAllowedPostAuthPrefix(pathOnly)) return null;

  return normalized;
};

export const isPriceAccessPath = (value: string | null | undefined) => {
  const safePath = sanitizeNextPath(value);
  if (!safePath) return false;
  return PRICE_ACCESS_PATH_PREFIXES.some((prefix) => safePath === prefix || safePath.startsWith(`${prefix}/`));
};

export const buildAuthRedirectPath = (nextPath: string) => {
  const safeNextPath = sanitizeNextPath(nextPath) || '/';
  const params = new URLSearchParams({
    mode: 'login',
    perfil: 'tecnico',
    next: safeNextPath,
  });

  if (isPriceAccessPath(safeNextPath)) {
    params.set('intent', PRICE_ACCESS_INTENT);
  }

  return `/tecnicos?${params.toString()}`;
};

export const isAuthAccessProfile = (value: string | null | undefined): value is AuthAccessProfile =>
  value === 'tecnico' || value === 'empresa' || value === 'cliente';

export const getAuthUserProfileFromMetadata = (metadata: unknown): AuthAccessProfile | null => {
  const record = (metadata || {}) as Record<string, unknown>;
  const userType = String(record.user_type || '').toLowerCase();
  if (isAuthAccessProfile(userType)) return userType;

  const profile = String(record.profile || '').toLowerCase();
  if (isAuthAccessProfile(profile)) return profile;

  return null;
};

export const syncAuthAccessTokenCookie = async (accessToken: string | null | undefined) => {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: accessToken || null }),
    });
  } catch {
    // Client-side Supabase auth remains the source of truth if the cookie sync fails.
  }
};

const getBrowserStorageValue = (storage: Storage | null, key: string) => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const setBrowserStorageValue = (storage: Storage | null, key: string, value: string) => {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can fail in private mode; auth will still continue through redirectTo.
  }
};

const removeBrowserStorageValue = (storage: Storage | null, key: string) => {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
};

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const setAuthAccessProfileIntent = (profile: AuthAccessProfile) => {
  if (typeof window === 'undefined') return;
  const value = JSON.stringify({ profile, createdAt: Date.now() });
  setBrowserStorageValue(getSessionStorage(), AUTH_ACCESS_PROFILE_INTENT_KEY, value);
  setBrowserStorageValue(getLocalStorage(), AUTH_ACCESS_PROFILE_INTENT_KEY, value);
};

export const clearAuthAccessProfileIntent = () => {
  if (typeof window === 'undefined') return;
  removeBrowserStorageValue(getSessionStorage(), AUTH_ACCESS_PROFILE_INTENT_KEY);
  removeBrowserStorageValue(getLocalStorage(), AUTH_ACCESS_PROFILE_INTENT_KEY);
};

export const getAuthAccessProfileIntent = (): AuthAccessProfile | null => {
  if (typeof window === 'undefined') return null;
  const raw =
    getBrowserStorageValue(getSessionStorage(), AUTH_ACCESS_PROFILE_INTENT_KEY) ||
    getBrowserStorageValue(getLocalStorage(), AUTH_ACCESS_PROFILE_INTENT_KEY);
  if (!raw) return null;

  try {
    if (isAuthAccessProfile(raw)) return raw;
    const parsed = JSON.parse(raw) as { profile?: string; createdAt?: number };
    if (!isAuthAccessProfile(parsed.profile)) {
      clearAuthAccessProfileIntent();
      return null;
    }
    if (typeof parsed.createdAt === 'number' && Date.now() - parsed.createdAt > AUTH_ACCESS_PROFILE_INTENT_TTL_MS) {
      clearAuthAccessProfileIntent();
      return null;
    }
    return parsed.profile;
  } catch {
    clearAuthAccessProfileIntent();
    return null;
  }
};
