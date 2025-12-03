import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Webpack intente empaquetar esta librería, dejándola para el runtime de Node
  serverExternalPackages: ["@react-pdf/renderer"],
  
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;