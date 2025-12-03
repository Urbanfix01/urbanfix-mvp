import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Esto es lo único vital: Evita que el compilador rompa la librería
  serverExternalPackages: ["@react-pdf/renderer"],

  // 2. Imágenes (Supabase)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
  
  // NOTA: Hemos borrado el bloque 'webpack' que causaba el conflicto con Turbopack
};

export default nextConfig;