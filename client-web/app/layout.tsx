import type { Metadata } from "next";
import { Inter } from "next/font/google";
// 👇 ¡ESTA ES LA LÍNEA MÁGICA QUE TE FALTA!
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UrbanFix Web",
  description: "Portal de presupuestos para clientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}