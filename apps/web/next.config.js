/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Next.js 15+: moved out of `experimental`
  serverExternalPackages: ['@react-pdf/renderer'],

  // Monorepo: ensure output tracing includes the workspace root.
  outputFileTracingRoot: path.join(__dirname, '../..'),

  // Image config (Supabase)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
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
