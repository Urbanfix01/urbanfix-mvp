import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. ESTO ES LO QUE FALTA PARA ARREGLAR EL BUILD
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