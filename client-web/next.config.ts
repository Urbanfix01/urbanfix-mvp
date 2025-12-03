import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Forzamos que @react-pdf se trate como paquete externo (no bundler)
  serverExternalPackages: ["@react-pdf/renderer"],

  // 2. Configuración Avanzada de Webpack
  webpack: (config, { isServer }) => {
    // Evitamos errores de Canvas/FS (necesario para React-PDF)
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // FIX ESM: Si es servidor, ignora la extensión .mjs para evitar conflictos
    if (isServer) {
        config.externals = [...(config.externals || []), '@react-pdf/renderer'];
    }

    return config;
  },

  // 3. Imágenes
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;