import { NextRequest, NextResponse } from 'next/server';

import { readLimitedJsonBody } from '../../../../lib/api/read-json-body';
import { AUTH_ACCESS_TOKEN_COOKIE } from '../../../../lib/auth/post-auth';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

const isSameOriginRequest = (request: NextRequest) => {
  const expectedOrigins = new Set([request.nextUrl.origin]);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(/:$/, '');
  if (host && forwardedProto) {
    expectedOrigins.add(`${forwardedProto}://${host}`);
  }

  const origin = request.headers.get('origin');
  if (origin) return expectedOrigins.has(origin);

  const referer = request.headers.get('referer');
  if (!referer) return true;

  try {
    return expectedOrigins.has(new URL(referer).origin);
  } catch {
    return false;
  }
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const bodyResult = await readLimitedJsonBody<{ accessToken?: string | null }>(request, {
    maxBytes: 8 * 1024,
    invalidMessage: 'Body invalido.',
  });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const accessToken = String(bodyResult.body?.accessToken || '').trim();
  const response = NextResponse.json({ ok: true });

  if (accessToken) {
    if (accessToken.length < 20) {
      return NextResponse.json({ error: 'Sesion invalida.' }, { status: 400 });
    }

    response.cookies.set(AUTH_ACCESS_TOKEN_COOKIE, accessToken, {
      ...cookieOptions,
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  }

  response.cookies.set(AUTH_ACCESS_TOKEN_COOKIE, '', {
    ...cookieOptions,
    maxAge: 0,
  });
  return response;
}
