import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import VidrieraPage from '../../page';
import { getGremioBySlug, gremioSlugs } from '../../../../lib/seo/gremios-data';

type GremioVidrieraSearchParams = {
  especialidad?: string | string[] | undefined;
};

export const dynamicParams = false;
export const revalidate = 300;

export function generateStaticParams() {
  return gremioSlugs.map((gremio) => ({ gremio }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gremio: string }>;
}): Promise<Metadata> {
  const { gremio: slug } = await params;
  const gremio = getGremioBySlug(slug);

  if (!gremio) {
    return { title: 'Gremio no encontrado | UrbanFix' };
  }

  return {
    title: `Tecnicos de ${gremio.title} | UrbanFix`,
    description: `Explora tecnicos publicados de ${gremio.title.toLowerCase()}, mapa publico, perfiles visibles y cobertura real en UrbanFix.`,
    alternates: { canonical: `/vidriera/gremio/${gremio.slug}` },
    openGraph: {
      title: `Tecnicos de ${gremio.title} | UrbanFix`,
      description: `Vidriera publica por gremio para ${gremio.title.toLowerCase()} con mapa, perfiles y cobertura.`,
      url: `https://www.urbanfix.com.ar/vidriera/gremio/${gremio.slug}`,
      type: 'website',
    },
  };
}

export default async function VidrieraGremioSeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ gremio: string }>;
  searchParams?: Promise<GremioVidrieraSearchParams>;
}) {
  const { gremio: slug } = await params;
  const gremio = getGremioBySlug(slug);
  if (!gremio) return notFound();

  const resolvedSearchParams = (await searchParams) || {};
  const especialidadRaw = Array.isArray(resolvedSearchParams.especialidad)
    ? resolvedSearchParams.especialidad[0] || ''
    : resolvedSearchParams.especialidad || '';

  return (
    <VidrieraPage
      searchParams={Promise.resolve({
        gremio: gremio.slug,
        especialidad: String(especialidadRaw || '').trim(),
      })}
    />
  );
}