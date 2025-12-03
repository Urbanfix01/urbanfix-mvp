import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Configuración de Webpack (Ahora sí se leerá gracias al paso anterior)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  // 2. Permitir imágenes externas
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