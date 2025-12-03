import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración mínima para que React-PDF v3 no falle con Canvas
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