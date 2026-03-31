import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import VidrieraZonaPage from '../page';
import { getGremioBySlug, gremioSlugs } from '../../../../lib/seo/gremios-data';
import { ciudades, ciudadSlugs, type CiudadKey } from '../../../../lib/seo/urbanfix-data';

type ZonaGremioVidrieraSearchParams = {
  especialidad?: string | string[] | undefined;
};

export const dynamicParams = false;
export const revalidate = 300;

export function generateStaticParams() {
  return ciudadSlugs.flatMap((zona) => gremioSlugs.map((gremio) => ({ zona, gremio })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zona: string; gremio: string }>;
}): Promise<Metadata> {
  const { zona, gremio: gremioSlug } = await params;
  const city = ciudades[zona as CiudadKey];
  const gremio = getGremioBySlug(gremioSlug);

  if (!city || !gremio) {
    return { title: 'Ruta no encontrada | UrbanFix' };
  }

  return {
    title: `${gremio.title} en ${city.name} | Tecnicos UrbanFix`,
    description: `Explora tecnicos publicados de ${gremio.title.toLowerCase()} en ${city.name}, con mapa, cobertura y perfiles visibles dentro de UrbanFix.`,
    alternates: { canonical: `/vidriera/${zona}/${gremio.slug}` },
    openGraph: {
      title: `${gremio.title} en ${city.name} | Tecnicos UrbanFix`,
      description: `Vidriera segmentada por zona y gremio para ${gremio.title.toLowerCase()} en ${city.name}.`,
      url: `https://www.urbanfix.com.ar/vidriera/${zona}/${gremio.slug}`,
      type: 'website',
    },
  };
}

export default async function VidrieraZonaGremioSeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ zona: string; gremio: string }>;
  searchParams?: Promise<ZonaGremioVidrieraSearchParams>;
}) {
  const { zona, gremio: gremioSlug } = await params;
  const city = ciudades[zona as CiudadKey];
  const gremio = getGremioBySlug(gremioSlug);
  if (!city || !gremio) return notFound();

  const resolvedSearchParams = (await searchParams) || {};
  const especialidadRaw = Array.isArray(resolvedSearchParams.especialidad)
    ? resolvedSearchParams.especialidad[0] || ''
    : resolvedSearchParams.especialidad || '';

  return (
    <VidrieraZonaPage
      params={Promise.resolve({ zona })}
      searchParams={Promise.resolve({
        gremio: gremio.slug,
        especialidad: String(especialidadRaw || '').trim(),
      })}
    />
  );
}