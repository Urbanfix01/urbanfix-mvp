import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. SOLUCIÓN AL ERROR ESM (Vital para Next.js 15/16 + React-PDF)
  serverExternalPackages: ["@react-pdf/renderer"],

  // 2. Configuración de Webpack para evitar errores de Canvas
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },

  // 3. Permitir imágenes externas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
};

export default nextConfig;