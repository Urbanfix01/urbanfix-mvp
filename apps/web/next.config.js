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
};

module.exports = nextConfig;
