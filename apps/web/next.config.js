/** @type {import('next').NextConfig} */
const nextConfig = {
  // En Next.js 14, esta configuración va dentro de 'experimental'
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },

  // Configuración de imágenes (Supabase)
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
