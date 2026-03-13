import { NextRequest, NextResponse } from 'next/server';

const CLIENT_API_PREFIX = '/api/client/';

const buildCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get('origin') || '*';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(CLIENT_API_PREFIX)) {
    return NextResponse.next();
  }

  const corsHeaders = buildCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ['/api/client/:path*'],
};
