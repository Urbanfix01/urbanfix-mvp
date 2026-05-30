import { NextRequest } from 'next/server';

type RateLimitOptions = {
  keyPrefix: string;
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  status: number;
  error?: string;
  headers: Record<string, string>;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const STORE_KEY = '__urbanfix_rate_limit_store__';

const getStore = (): Map<string, RateLimitBucket> => {
  const globalScope = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, RateLimitBucket>;
  };
  if (!globalScope[STORE_KEY]) {
    globalScope[STORE_KEY] = new Map();
  }
  return globalScope[STORE_KEY];
};

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedIp = forwardedFor?.split(',')[0]?.trim();
  return (
    forwardedIp ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
};

const cleanupStore = (store: Map<string, RateLimitBucket>, now: number) => {
  if (store.size < 5000) return;
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
};

export const enforceRateLimit = (request: NextRequest, options: RateLimitOptions): RateLimitResult => {
  const now = Date.now();
  const store = getStore();
  cleanupStore(store, now);

  const clientIp = getClientIp(request);
  const key = `${options.keyPrefix}:${clientIp}`;
  const current = store.get(key);
  const resetAt = current && current.resetAt > now ? current.resetAt : now + options.windowMs;
  const count = current && current.resetAt > now ? current.count + 1 : 1;
  const remaining = Math.max(0, options.max - count);

  store.set(key, { count, resetAt });

  const headers = {
    'X-RateLimit-Limit': String(options.max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
  };

  if (count > options.max) {
    return {
      ok: false,
      status: 429,
      error: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
      headers: {
        ...headers,
        'Retry-After': String(Math.max(1, Math.ceil((resetAt - now) / 1000))),
      },
    };
  }

  return {
    ok: true,
    status: 200,
    headers,
  };
};
