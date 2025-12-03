import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Esto le dice a Vercel: "Copia esta librería entera al servidor, la necesito"
  serverExternalPackages: ["@react-pdf/renderer"],

  // 2. Configuración mínima para evitar errores de compilación
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;