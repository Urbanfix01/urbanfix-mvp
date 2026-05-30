/** @type {import('next').NextConfig} */
const path = require('path');

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),

  // Next.js 15+: moved out of `experimental`
  serverExternalPackages: ['@react-pdf/renderer'],

  // Keep tracing scoped to the web app even if the repo root has extra lockfiles.
  outputFileTracingRoot: path.join(__dirname),

  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'urbanfix.com.ar' }],
        destination: 'https://www.urbanfix.com.ar/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'urbanfixar.com' }],
        destination: 'https://www.urbanfix.com.ar/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.urbanfixar.com' }],
        destination: 'https://www.urbanfix.com.ar/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
