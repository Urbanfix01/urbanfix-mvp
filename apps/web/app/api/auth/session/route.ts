import { NextResponse } from 'next/server';

import { AUTH_ACCESS_TOKEN_COOKIE } from '../../../../lib/auth/post-auth';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({} as { accessToken?: string | null }));
  const accessToken = String(payload?.accessToken || '').trim();
  const response = NextResponse.json({ ok: true });

  if (accessToken) {
    response.cookies.set(AUTH_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  }

  response.cookies.delete(AUTH_ACCESS_TOKEN_COOKIE);
  return response;
}