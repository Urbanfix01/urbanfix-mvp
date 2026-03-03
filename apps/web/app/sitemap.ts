import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { ciudadSlugs, guiaSlugs } from "../lib/seo/urbanfix-data";
import { buildTechnicianPath } from "../lib/seo/technician-profile";
import { getActiveLaborCategories } from "../lib/seo/rubro-prices";

type ProfileSitemapRow = {
  id: string;
  access_granted: boolean | null;
  profile_published: boolean | null;
  full_name: string | null;
  business_name: string | null;
  city: string | null;
  address: string | null;
  company_address: string | null;
  coverage_area: string | null;
};

const hasMeaningfulCoverageArea = (value: string | null | undefined) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.includes("tu ciudad base");
};

const hasWorkZoneConfigured = (profile: ProfileSitemapRow) =>
  Boolean(
    String(profile.city || "").trim() ||
      String(profile.address || "").trim() ||
      String(profile.company_address || "").trim() ||
      hasMeaningfulCoverageArea(profile.coverage_area)
  );

const getTechnicianEntries = async (baseUrl: string): Promise<MetadataRoute.Sitemap> => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return [];

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("id,access_granted,profile_published,full_name,business_name,city,address,company_address,coverage_area")
    .eq("access_granted", true)
    .eq("profile_published", true)
    .limit(2400);

  if (error || !data) return [];

  const rows = (data || []) as ProfileSitemapRow[];
  const validRows = rows.filter((row) => row.access_granted && row.profile_published && hasWorkZoneConfigured(row));

  return validRows.map((row) => ({
    url: `${baseUrl}${buildTechnicianPath(row.id, row.business_name || row.full_name || "Tecnico UrbanFix")}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanfixar.com").replace(/\/+$/, "");
  const technicianEntries = await getTechnicianEntries(baseUrl);
  const laborCategories = await getActiveLaborCategories();
  const rubroSlugs = laborCategories.map((item) => item.slug);
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
      url: `${baseUrl}/vidriera`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...technicianEntries,
    {
      url: `${baseUrl}/soporte`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/politicas`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/nueva`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
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
