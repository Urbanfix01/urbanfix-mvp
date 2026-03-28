import { NextRequest, NextResponse } from 'next/server';

const ARGENTINA_BOUNDS = {
  minLat: -55.5,
  maxLat: -21.78,
  minLng: -73.56,
  maxLng: -53.64,
};

const normalizeSearchText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isArgentinaCoordinate = (lat: number, lng: number) => {
  return (
    lat >= ARGENTINA_BOUNDS.minLat &&
    lat <= ARGENTINA_BOUNDS.maxLat &&
    lng >= ARGENTINA_BOUNDS.minLng &&
    lng <= ARGENTINA_BOUNDS.maxLng
  );
};

type NominatimRow = {
  display_name?: string;
  lat?: string;
  lon?: string;
  importance?: number;
};

const buildQueryVariants = (query: string, cityHint = '', provinceHint = '') => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const normalizedCityHint = String(cityHint || '').trim().replace(/\s+/g, ' ');
  const normalizedProvinceHint = String(provinceHint || '').trim().replace(/\s+/g, ' ');
  const variants = [compact];
  const tokens = compact.split(' ').filter(Boolean);
  const numberToken = tokens.find((token) => /\d/.test(token)) || '';
  const streetTokens = tokens.filter((token) => !/\d/.test(token));
  const streetPart = streetTokens.join(' ').trim();

  if (numberToken && streetPart) {
    variants.push(`${numberToken} ${streetPart}`);
    variants.push(`${streetPart} ${numberToken}, Argentina`);
    variants.push(`${numberToken} ${streetPart}, Argentina`);
  }

  if (streetPart) {
    variants.push(`${streetPart}, Argentina`);
  }

  if (normalizedProvinceHint) {
    variants.push(`${compact}, ${normalizedProvinceHint}, Argentina`);
    if (numberToken && streetPart) {
      variants.push(`${streetPart} ${numberToken}, ${normalizedProvinceHint}, Argentina`);
      variants.push(`${numberToken} ${streetPart}, ${normalizedProvinceHint}, Argentina`);
    }
    if (streetPart) {
      variants.push(`${streetPart}, ${normalizedProvinceHint}, Argentina`);
    }
  }

  if (normalizedCityHint) {
    variants.push(`${compact}, ${normalizedCityHint}, Argentina`);
    if (normalizedProvinceHint) {
      variants.push(`${compact}, ${normalizedCityHint}, ${normalizedProvinceHint}, Argentina`);
    }
    if (numberToken && streetPart) {
      variants.push(`${streetPart} ${numberToken}, ${normalizedCityHint}, Argentina`);
    }
    if (streetPart) {
      variants.push(`${streetPart}, ${normalizedCityHint}, Argentina`);
    }
  }

  variants.push(`${compact}, Argentina`);

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
};

const buildStreetFallbackVariants = (query: string, cityHint = '', provinceHint = '') => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const normalizedCityHint = String(cityHint || '').trim().replace(/\s+/g, ' ');
  const normalizedProvinceHint = String(provinceHint || '').trim().replace(/\s+/g, ' ');
  const tokens = compact.split(' ').filter(Boolean);
  const streetTokens = tokens.filter((token) => !/\d/.test(token));
  const streetPart = streetTokens.join(' ').trim();

  if (!streetPart) return [];

  const variants = [] as string[];
  if (normalizedProvinceHint) {
    variants.push(`${streetPart}, ${normalizedProvinceHint}, Argentina`);
  }
  if (normalizedCityHint) {
    variants.push(`${streetPart}, ${normalizedCityHint}`);
    variants.push(`${streetPart}, ${normalizedCityHint}, Argentina`);
    if (normalizedProvinceHint) {
      variants.push(`${streetPart}, ${normalizedCityHint}, ${normalizedProvinceHint}, Argentina`);
    }
  }
  variants.push(streetPart, `${streetPart}, Argentina`);

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
};

const fetchNominatimRows = async (query: string, limit: number) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&dedupe=0&countrycodes=ar&q=${encodeURIComponent(
    query
  )}&addressdetails=1&email=info@urbanfixar.com`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'UrbanFix/1.0 (info@urbanfixar.com)',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.6',
    },
    cache: 'no-store',
  });

  if (response.status === 429) {
    return {
      rows: [] as NominatimRow[],
      error: 'Demasiadas busquedas seguidas. Espera unos segundos e intenta nuevamente.',
      rateLimited: true,
    };
  }

  if (!response.ok) {
    return {
      rows: [] as NominatimRow[],
      error: 'No pudimos buscar direcciones en este momento.',
      rateLimited: false,
    };
  }

  return {
    rows: ((await response.json()) as NominatimRow[]) || [],
    error: '',
    rateLimited: false,
  };
};

export async function GET(request: NextRequest) {
  const query = String(request.nextUrl.searchParams.get('query') || '').trim();
  const cityHint = String(request.nextUrl.searchParams.get('city') || '').trim();
  const provinceHint = String(request.nextUrl.searchParams.get('province') || '').trim();
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 5);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(12, Math.round(requestedLimit))) : 8;

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const upstreamLimit = Math.max(limit, 8);
    const variants = buildQueryVariants(query, cityHint, provinceHint).slice(0, provinceHint ? 3 : 4);
    const fallbackVariants = buildStreetFallbackVariants(query, cityHint, provinceHint).slice(0, provinceHint ? 1 : 2);
    const settled = await Promise.all(
      variants.map((variant) => fetchNominatimRows(variant, upstreamLimit)).concat(
        fallbackVariants.map((variant) => fetchNominatimRows(variant, Math.max(6, limit)))
      )
    );
    const firstError = settled.find((item) => item.error)?.error || '';
    const rows = settled.flatMap((item) => item.rows);

    const normalizedQuery = normalizeSearchText(query);
    const normalizedCityHint = normalizeSearchText(cityHint);
    const normalizedProvinceHint = normalizeSearchText(provinceHint);
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const queryNumber = queryTokens.find((token) => /\d/.test(token)) || '';
    const seen = new Set<string>();

    const results = rows
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isArgentinaCoordinate(lat, lng)) {
          return null;
        }
        const displayName = String(item.display_name || '').trim();
        const normalizedDisplayName = normalizeSearchText(displayName);
        const dedupeKey = `${normalizedDisplayName}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
        if (seen.has(dedupeKey)) {
          return null;
        }
        seen.add(dedupeKey);

        let score = Number(item.importance || 0);
        if (normalizedDisplayName.startsWith(normalizedQuery)) score += 4;
        else if (normalizedDisplayName.includes(normalizedQuery)) score += 2;
        score += queryTokens.filter((token) => normalizedDisplayName.includes(token)).length * 0.45;
        if (queryNumber && normalizedDisplayName.includes(queryNumber)) score += 1.5;
        if (normalizedCityHint && normalizedDisplayName.includes(normalizedCityHint)) score += 2.5;
        if (normalizedProvinceHint && normalizedDisplayName.includes(normalizedProvinceHint)) score += 3;
        if (queryNumber && !normalizedDisplayName.includes(queryNumber)) score -= 0.75;

        return {
          display_name: displayName,
          lat,
          lon: lng,
          score,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number((b as any).score || 0) - Number((a as any).score || 0))
      .slice(0, limit)
      .map((item) => ({
        display_name: (item as any).display_name,
        lat: (item as any).lat,
        lon: (item as any).lon,
      }));

    return NextResponse.json({ results, error: results.length === 0 ? firstError : '' });
  } catch {
    return NextResponse.json({ results: [], error: 'No pudimos buscar direcciones en este momento.' });
  }
}