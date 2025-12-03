import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esta línea evita que el Build falle al procesar la librería de PDF en el servidor
  serverExternalPackages: ["@react-pdf/renderer"],

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