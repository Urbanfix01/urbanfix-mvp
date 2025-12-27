import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://urbanfixar.com"),
  title: {
    default: "UrbanFix | Gestion clara para tecnicos en movimiento",
    template: "%s | UrbanFix",
  },
  description:
    "Plataforma de presupuestos y gestion para tecnicos. Clientes reciben presupuestos por link y tecnicos gestionan desde la web.",
  openGraph: {
    title: "UrbanFix | Gestion clara para tecnicos en movimiento",
    description:
      "Plataforma de presupuestos y gestion para tecnicos. Clientes reciben presupuestos por link y tecnicos gestionan desde la web.",
    url: "https://urbanfixar.com",
    siteName: "UrbanFix",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UrbanFix | Gestion clara para tecnicos en movimiento",
    description:
      "Plataforma de presupuestos y gestion para tecnicos. Clientes reciben presupuestos por link y tecnicos gestionan desde la web.",
  },
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
