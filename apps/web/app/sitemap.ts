import type { MetadataRoute } from "next";
import { gremioSlugs } from "../lib/seo/gremios-data";
import { ciudadSlugs, guiaSlugs } from "../lib/seo/urbanfix-data";
import { buildTechnicianPath } from "../lib/seo/technician-profile";
import { createAnonClient } from "../lib/supabase/server";
import { technicianSeoStaticParams } from "../lib/seo/technician-market-data";
import { isPublicProfileVisible } from "../lib/public-profile-validity";

export const dynamic = "force-dynamic";

type ProfileSitemapRow = {
  id: string;
  access_granted: boolean | null;
  profile_published: boolean | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  company_address: string | null;
  coverage_area: string | null;
  service_city: string | null;
  service_province: string | null;
  service_district: string | null;
  service_lat: number | string | null;
  service_lng: number | string | null;
  specialties: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const PROFILE_SITEMAP_SELECT = [
  "id",
  "access_granted",
  "profile_published",
  "full_name",
  "business_name",
  "phone",
  "country",
  "city",
  "address",
  "company_address",
  "coverage_area",
  "service_city",
  "service_province",
  "service_district",
  "service_lat",
  "service_lng",
  "specialties",
  "updated_at",
  "created_at",
].join(",");

const toLastModified = (row: ProfileSitemapRow) => {
  const value = String(row.updated_at || row.created_at || "").trim();
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getTechnicianEntries = async (baseUrl: string): Promise<MetadataRoute.Sitemap> => {
  let supabase: ReturnType<typeof createAnonClient>;
  try {
    supabase = createAnonClient();
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SITEMAP_SELECT)
    .eq("access_granted", true)
    .or("profile_published.is.null,profile_published.eq.true")
    .limit(2400);

  if (error || !data) return [];

  const rows = (data || []) as unknown as ProfileSitemapRow[];
  const validRows = rows.filter((row) => isPublicProfileVisible(row));

  return validRows.map((row) => {
    const lastModified = toLastModified(row);
    return {
      url: `${baseUrl}${buildTechnicianPath(row.id, row.business_name || row.full_name || "Tecnico UrbanFix")}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    };
  });
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanfix.com.ar").replace(/\/+$/, "");
  const technicianEntries = await getTechnicianEntries(baseUrl);
  const ciudadesEntries: MetadataRoute.Sitemap = ciudadSlugs.map((slug) => ({
    url: `${baseUrl}/ciudades/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const vidrieraZonaEntries: MetadataRoute.Sitemap = ciudadSlugs.map((slug) => ({
    url: `${baseUrl}/vidriera/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const vidrieraGremioEntries: MetadataRoute.Sitemap = gremioSlugs.map((slug) => ({
    url: `${baseUrl}/vidriera/gremio/${slug}`,
    changeFrequency: "weekly",
    priority: 0.72,
  }));
  const vidrieraZonaGremioEntries: MetadataRoute.Sitemap = ciudadSlugs.flatMap((zona) =>
    gremioSlugs.map((gremio) => ({
      url: `${baseUrl}/vidriera/${zona}/${gremio}`,
      changeFrequency: "weekly",
      priority: 0.68,
    }))
  );
  const technicianMarketEntries: MetadataRoute.Sitemap = technicianSeoStaticParams.map(({ gremio, pais }) => ({
    url: `${baseUrl}/tecnicos/${gremio}/${pais}`,
    changeFrequency: "weekly",
    priority: 0.74,
  }));
  const guiasEntries: MetadataRoute.Sitemap = guiaSlugs.map((slug) => ({
    url: `${baseUrl}/guias-precios/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const gremiosEntries: MetadataRoute.Sitemap = gremioSlugs.map((slug) => ({
    url: `${baseUrl}/gremios/${slug}`,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/ciudades`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...ciudadesEntries,
    {
      url: `${baseUrl}/guias-precios`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...guiasEntries,
    {
      url: `${baseUrl}/urbanfix`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/gremios`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...gremiosEntries,
    {
      url: `${baseUrl}/vidriera`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...vidrieraGremioEntries,
    ...vidrieraZonaEntries,
    ...vidrieraZonaGremioEntries,
    ...technicianMarketEntries,
    ...technicianEntries,
    {
      url: `${baseUrl}/soporte`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/politicas`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contacto`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/nueva`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacidad`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terminos`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
