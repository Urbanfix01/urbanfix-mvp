import type { MetadataRoute } from "next";
import { rubroSlugs, ciudadSlugs, guiaSlugs } from "../lib/seo/urbanfix-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.urbanfixar.com";
  const rubrosEntries: MetadataRoute.Sitemap = rubroSlugs.map((slug) => ({
    url: `${baseUrl}/rubros/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const ciudadesEntries: MetadataRoute.Sitemap = ciudadSlugs.map((slug) => ({
    url: `${baseUrl}/ciudades/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const rubroCiudadEntries: MetadataRoute.Sitemap = rubroSlugs.flatMap((rubro) =>
    ciudadSlugs.map((ciudad) => ({
      url: `${baseUrl}/rubros/${rubro}/${ciudad}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    }))
  );
  const guiasEntries: MetadataRoute.Sitemap = guiaSlugs.map((slug) => ({
    url: `${baseUrl}/guias-precios/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/precios-mano-de-obra`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rubros`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...rubrosEntries,
    ...rubroCiudadEntries,
    {
      url: `${baseUrl}/ciudades`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...ciudadesEntries,
    {
      url: `${baseUrl}/guias-precios`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...guiasEntries,
    {
      url: `${baseUrl}/urbanfix`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
