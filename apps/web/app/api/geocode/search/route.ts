import { NextRequest, NextResponse } from 'next/server';

const ARGENTINA_BOUNDS = {
  minLat: -55.5,
  maxLat: -21.78,
  minLng: -73.56,
  maxLng: -53.64,
};

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
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(8, Math.round(requestedLimit))) : 5;

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&countrycodes=ar&q=${encodeURIComponent(
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
    }>;

    const results = rows
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isArgentinaCoordinate(lat, lng)) {
          return null;
        }
        return {
          display_name: String(item.display_name || '').trim(),
          lat,
          lon: lng,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'No pudimos buscar direcciones en este momento.' });
  }
}