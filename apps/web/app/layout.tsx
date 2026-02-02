import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnalyticsTracker from "../components/AnalyticsTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.urbanfixar.com"),
  title: {
    default: "UrbanFix | Gestion clara para tecnicos en movimiento",
    template: "%s | UrbanFix",
  },
  description:
    "Plataforma de presupuestos y gestion para tecnicos. Clientes reciben presupuestos por link y tecnicos gestionan desde la web.",
  icons: {
    icon: [
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "UrbanFix | Gestion clara para tecnicos en movimiento",
    description:
      "Plataforma de presupuestos y gestion para tecnicos. Clientes reciben presupuestos por link y tecnicos gestionan desde la web.",
    url: "https://www.urbanfixar.com",
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
      <body className={inter.className}>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
