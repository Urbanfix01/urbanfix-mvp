import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indica a Next.js que este paquete debe ser tratado como externo en el servidor
  serverExternalPackages: ["@react-pdf/renderer"],

  // Configuración de Webpack para manejar dependencias de node nativas
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },

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