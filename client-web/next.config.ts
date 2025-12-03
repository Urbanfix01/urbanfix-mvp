import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita el error ESM en el build
  serverExternalPackages: ["@react-pdf/renderer"],
  
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

export default nextConfig;