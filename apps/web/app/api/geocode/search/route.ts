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

export async function GET(request: NextRequest) {
  const query = String(request.nextUrl.searchParams.get('query') || '').trim();
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 5);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(12, Math.round(requestedLimit))) : 8;

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const upstreamLimit = Math.max(limit, 12);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${upstreamLimit}&dedupe=0&countrycodes=ar&q=${encodeURIComponent(
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
      return NextResponse.json({ results: [], error: 'Demasiadas busquedas seguidas. Espera unos segundos e intenta nuevamente.' });
    }

    if (!response.ok) {
      return NextResponse.json({ results: [], error: 'No pudimos buscar direcciones en este momento.' });
    }

    const rows = (await response.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      importance?: number;
    }>;

    const normalizedQuery = normalizeSearchText(query);
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

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'No pudimos buscar direcciones en este momento.' });
  }
}