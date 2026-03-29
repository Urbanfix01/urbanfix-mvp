export const POST_AUTH_REDIRECT_KEY = 'urbanfix_post_auth_redirect';
export const AUTH_ACCESS_TOKEN_COOKIE = 'urbanfix_access_token';

export const sanitizeNextPath = (value: string | null | undefined) => {
  const normalized = String(value || '').trim();
  if (!normalized.startsWith('/')) return null;
  if (normalized.startsWith('//')) return null;
  return normalized;
};

export const buildAuthRedirectPath = (nextPath: string) => {
  const safeNextPath = sanitizeNextPath(nextPath) || '/';
  return `/tecnicos?mode=register&next=${encodeURIComponent(safeNextPath)}`;
};