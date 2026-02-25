import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/tecnicos", "/p/"],
      },
    ],
    sitemap: "https://www.urbanfix.com.ar/sitemap.xml",
  };
}
