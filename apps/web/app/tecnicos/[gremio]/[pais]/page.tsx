import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import VidrieraPage from '../../../vidriera/page';
import {
  getTechnicianSeoCountry,
  getTechnicianSeoTrade,
  technicianSeoStaticParams,
} from '../../../../lib/seo/technician-market-data';

type MarketPageSearchParams = {
  zona?: string | string[] | undefined;
  especialidad?: string | string[] | undefined;
  disponibilidad?: string | string[] | undefined;
};

export const revalidate = 300;

export function generateStaticParams() {
  return technicianSeoStaticParams;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gremio: string; pais: string }>;
}): Promise<Metadata> {
  const { gremio: tradeSlug, pais: countrySlug } = await params;
  const trade = getTechnicianSeoTrade(tradeSlug);
  const country = getTechnicianSeoCountry(countrySlug);

  if (!trade || !country) return { title: 'Tecnicos no encontrados | UrbanFix' };

  const title = `${trade.label} en ${country.name}`;
  const description = `Encuentra ${trade.label.toLowerCase()} en ${country.name}, compara perfiles publicados, zonas de cobertura y contacto directo en UrbanFix.`;
  const path = `/tecnicos/${trade.slug}/${country.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `https://www.urbanfix.com.ar${path}`,
      type: 'website',
    },
  };
}

export default async function TechnicianMarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ gremio: string; pais: string }>;
  searchParams?: Promise<MarketPageSearchParams>;
}) {
  const { gremio: tradeSlug, pais: countrySlug } = await params;
  const trade = getTechnicianSeoTrade(tradeSlug);
  const country = getTechnicianSeoCountry(countrySlug);
  if (!trade || !country) return notFound();

  const resolvedSearchParams = (await searchParams) || {};
  const zona = Array.isArray(resolvedSearchParams.zona)
    ? resolvedSearchParams.zona[0] || ''
    : resolvedSearchParams.zona || '';
  const especialidad = Array.isArray(resolvedSearchParams.especialidad)
    ? resolvedSearchParams.especialidad[0] || ''
    : resolvedSearchParams.especialidad || '';
  const disponibilidad = Array.isArray(resolvedSearchParams.disponibilidad)
    ? resolvedSearchParams.disponibilidad[0] || ''
    : resolvedSearchParams.disponibilidad || '';

  return (
    <VidrieraPage
      searchParams={Promise.resolve({
        pais: country.name,
        gremio: trade.gremioSlug,
        zona: String(zona || '').trim(),
        especialidad: String(especialidad || '').trim(),
        disponibilidad: String(disponibilidad || '').trim(),
        mercado: `${trade.label} en ${country.name}`,
        ruta_mercado: `/tecnicos/${trade.slug}/${country.slug}`,
      })}
    />
  );
}
