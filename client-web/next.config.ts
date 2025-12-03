import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Configuración para que @react-pdf no rompa el build (Webpack)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  // 2. Permitir imágenes externas (Supabase) en componentes Next.js
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Comodín para aceptar cualquier URL de imagen
      },
    ],
  },
};

export default nextConfig;