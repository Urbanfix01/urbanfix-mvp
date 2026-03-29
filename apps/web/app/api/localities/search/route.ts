import { NextRequest, NextResponse } from 'next/server';
import { getCountryCode, getCountryConfig } from '../../../../lib/location-catalog';

type GeoRefLocalityRow = {
  nombre?: string;
  departamento?: { nombre?: string };
  municipio?: { nombre?: string };
  provincia?: { nombre?: string };
};

type NominatimLocalityRow = {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
  };
};

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildLocalityLabel = (row: GeoRefLocalityRow) => {
  const name = String(row.nombre || '').trim();
  const department = String(row.departamento?.nombre || '').trim();
  const municipality = String(row.municipio?.nombre || '').trim();
  const parts = [name];

  if (department && normalizeText(department) !== normalizeText(name)) {
    parts.push(department);
  } else if (municipality && normalizeText(municipality) !== normalizeText(name)) {
    parts.push(municipality);
  }

  return parts.filter(Boolean).join(', ');
};

const fetchArgentinaLocalities = async (province: string, query: string, limit: number) => {
  const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(
    province
  )}&nombre=${encodeURIComponent(query)}&max=${limit}&campos=nombre,departamento,municipio,provincia`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        results: [] as Array<{ name: string; label: string }>,
        error: 'No pudimos consultar las localidades en este momento.',
      };
    }

    const payload = (await response.json()) as { localidades?: GeoRefLocalityRow[] };
    const rows = Array.isArray(payload.localidades) ? payload.localidades : [];
    const seen = new Set<string>();

    const results = rows
      .map((row) => {
        const name = String(row.nombre || '').trim();
        if (!name) return null;
        const key = normalizeText(name);
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          name,
          label: buildLocalityLabel(row),
        };
      })
      .filter(Boolean) as Array<{ name: string; label: string }>;

    return { results, error: '' };
  } catch {
    clearTimeout(timeoutId);
    return {
      results: [] as Array<{ name: string; label: string }>,
      error: 'La búsqueda de localidades tardó demasiado. Intenta nuevamente.',
    };
  }
};

const fetchGlobalLocalities = async (country: string, province: string, query: string, limit: number) => {
  const countryCode = getCountryCode(country);
  const q = `${query}, ${province}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&dedupe=0&featuretype=city&countrycodes=${encodeURIComponent(
    countryCode
  )}&q=${encodeURIComponent(q)}&addressdetails=1&email=info@urbanfixar.com`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UrbanFix/1.0 (info@urbanfixar.com)',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.6',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        results: [] as Array<{ name: string; label: string }>,
        error: 'No pudimos consultar las localidades en este momento.',
      };
    }

    const payload = (await response.json()) as NominatimLocalityRow[];
    const rows = Array.isArray(payload) ? payload : [];
    const seen = new Set<string>();

    const results = rows
      .map((row) => {
        const name = String(
          row.address?.city || row.address?.town || row.address?.village || row.address?.municipality || ''
        ).trim();
        if (!name) return null;
        const key = normalizeText(name);
        if (seen.has(key)) return null;
        seen.add(key);
        const county = String(row.address?.county || '').trim();
        const state = String(row.address?.state || '').trim();
        return {
          name,
          label: [name, county, state].filter(Boolean).join(', '),
        };
      })
      .filter(Boolean) as Array<{ name: string; label: string }>;

    return { results, error: '' };
  } catch {
    clearTimeout(timeoutId);
    return {
      results: [] as Array<{ name: string; label: string }>,
      error: 'La búsqueda de localidades tardó demasiado. Intenta nuevamente.',
    };
  }
};

export async function GET(request: NextRequest) {
  const country = String(request.nextUrl.searchParams.get('country') || '').trim();
  const province = String(request.nextUrl.searchParams.get('province') || '').trim();
  const query = String(request.nextUrl.searchParams.get('query') || '').trim();
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 8);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(12, Math.round(requestedLimit))) : 8;

  if (!country || !province || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const normalizedCountry = getCountryConfig(country).name;
  const { results, error } =
    normalizedCountry === 'Argentina'
      ? await fetchArgentinaLocalities(province, query, limit)
      : await fetchGlobalLocalities(normalizedCountry, province, query, limit);

  return NextResponse.json({ results, error });
}