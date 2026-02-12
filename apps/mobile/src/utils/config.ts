const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

export const PUBLIC_WEB_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_PUBLIC_WEB_URL || 'https://www.urbanfix.com.ar'
);

export const getPublicQuoteUrl = (quoteId: string) => `${PUBLIC_WEB_URL}/p/${quoteId}`;

export const getWebApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_WEB_URL}${normalizedPath}`;
};

