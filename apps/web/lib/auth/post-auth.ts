export const POST_AUTH_REDIRECT_KEY = 'urbanfix_post_auth_redirect';
export const AUTH_ACCESS_TOKEN_COOKIE = 'urbanfix_access_token';
export const PRICE_ACCESS_INTENT = 'prices';

const PRICE_ACCESS_PATH_PREFIXES = ['/precios-mano-de-obra', '/rubros'];

export const sanitizeNextPath = (value: string | null | undefined) => {
  const normalized = String(value || '').trim();
  if (!normalized.startsWith('/')) return null;
  if (normalized.startsWith('//')) return null;
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