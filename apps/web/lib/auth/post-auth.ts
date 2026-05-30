export const POST_AUTH_REDIRECT_KEY = 'urbanfix_post_auth_redirect';
export const AUTH_ACCESS_TOKEN_COOKIE = 'urbanfix_access_token';
export const PRICE_ACCESS_INTENT = 'prices';

const PRICE_ACCESS_PATH_PREFIXES = ['/precios-mano-de-obra', '/rubros'];
const POST_AUTH_ALLOWED_PATH_PREFIXES = ['/tecnicos', '/tecnico-panel', '/cliente', '/admin', ...PRICE_ACCESS_PATH_PREFIXES];

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
