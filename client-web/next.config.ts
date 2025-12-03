import type { NextConfig } from "next";

// Forzando actualización de config
const nextConfig: NextConfig = {
  // Asegúrate de que esta línea esté aquí:
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