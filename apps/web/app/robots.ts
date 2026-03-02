import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanfixar.com").replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/tecnicos", "/p/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
