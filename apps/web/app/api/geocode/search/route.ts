import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_COUNTRY_NAME, getCountryCode, getCountryConfig, isCoordinateWithinCountry } from '../../../../lib/location-catalog';

const GEOCODE_CACHE_TTL_MS = 45_000;

type GeocodeApiPayload = {
  results: Array<{ display_name: string; lat: number; lon: number; precision: 'exact' | 'approx' }>;
  error: string;
  rateLimited?: boolean;
};

const geocodeResponseCache = new Map<string, { expiresAt: number; payload: GeocodeApiPayload }>();

const normalizeSearchText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

type NominatimRow = {
  display_name?: string;
  lat?: string;
  lon?: string;
  importance?: number;
  addresstype?: string;
  place_rank?: number;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    residential?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
  };
};

const buildGeocodeCacheKey = (
  query: string,
  cityHint: string,
  provinceHint: string,
  countryHint: string,
  limit: number
) => JSON.stringify({ query: normalizeSearchText(query), cityHint, provinceHint, countryHint, limit });

const dedupeNominatimRows = (rows: NominatimRow[]) => {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const displayName = String(row.display_name || '').trim().toLowerCase();
    const lat = Number(row.lat);
    const lon = Number(row.lon);
    const key = `${displayName}|${Number.isFinite(lat) ? lat.toFixed(6) : 'nan'}|${Number.isFinite(lon) ? lon.toFixed(6) : 'nan'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const collectNominatimRows = async (variants: string[], limit: number, countryCode: string) => {
  const rows: NominatimRow[] = [];
  let error = '';
  let rateLimited = false;

  for (const variant of variants) {
    const result = await fetchNominatimRows(variant, limit, countryCode);
    if (result.rows.length > 0) {
      rows.push(...result.rows);
    }
    if (!error && result.error) {
      error = result.error;
    }
    if (result.rateLimited) {
      rateLimited = true;
      break;
    }
    if (dedupeNominatimRows(rows).length >= limit) {
      break;
    }
  }

  return {
    rows: dedupeNominatimRows(rows),
    error,
    rateLimited,
  };
};

const buildLocationAliases = (value: string) => {
  const compact = String(value || '').trim().replace(/\s+/g, ' ');
  if (!compact) return [] as string[];

  const tokens = compact.split(' ').filter(Boolean);
  const aliases = [compact];

  if (tokens.length >= 2) {
    aliases.push(tokens.slice(-2).join(' '));
  }
  if (tokens.length >= 1) {
    aliases.push(tokens[tokens.length - 1]);
  }

  return Array.from(new Set(aliases.map((item) => item.trim()).filter((item) => item.length >= 4)));
};

const getRoadLabel = (row: NominatimRow) =>
  String(row.address?.road || row.address?.pedestrian || row.address?.footway || row.address?.residential || '').trim();

const getLocalityLabels = (row: NominatimRow) =>
  [
    row.address?.city,
    row.address?.town,
    row.address?.village,
    row.address?.hamlet,
    row.address?.suburb,
    row.address?.neighbourhood,
    row.address?.quarter,
    row.address?.county,
    row.address?.state_district,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

const buildQueryVariants = (query: string, cityHint = '', provinceHint = '', countryHint = DEFAULT_COUNTRY_NAME) => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const normalizedCityHint = String(cityHint || '').trim().replace(/\s+/g, ' ');
  const normalizedProvinceHint = String(provinceHint || '').trim().replace(/\s+/g, ' ');
  const normalizedCountryHint = String(countryHint || '').trim().replace(/\s+/g, ' ');
  const localityAliases = buildLocationAliases(normalizedCityHint).slice(0, 3);
  const variants = [compact];
  const tokens = compact.split(' ').filter(Boolean);
  const numberToken = tokens.find((token) => /\d/.test(token)) || '';
  const streetTokens = tokens.filter((token) => !/\d/.test(token));
  const streetPart = streetTokens.join(' ').trim();

  if (numberToken && streetPart) {
    variants.push(`${numberToken} ${streetPart}`);
    variants.push(`${streetPart} ${numberToken}, ${normalizedCountryHint}`);
    variants.push(`${numberToken} ${streetPart}, ${normalizedCountryHint}`);
  }

  if (streetPart) {
    variants.push(`${streetPart}, ${normalizedCountryHint}`);
  }

  if (normalizedProvinceHint) {
    variants.push(`${compact}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    if (numberToken && streetPart) {
      variants.push(`${streetPart} ${numberToken}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
      variants.push(`${numberToken} ${streetPart}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
    if (streetPart) {
      variants.push(`${streetPart}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
  }

  if (normalizedCityHint) {
    variants.push(`${compact}, ${normalizedCityHint}, ${normalizedCountryHint}`);
    if (normalizedProvinceHint) {
      variants.push(`${compact}, ${normalizedCityHint}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
    if (numberToken && streetPart) {
      variants.push(`${streetPart} ${numberToken}, ${normalizedCityHint}, ${normalizedCountryHint}`);
    }
    if (streetPart) {
      variants.push(`${streetPart}, ${normalizedCityHint}, ${normalizedCountryHint}`);
    }
  }

  localityAliases.forEach((locality) => {
    variants.push(`${compact}, ${locality}, ${normalizedCountryHint}`);
    if (normalizedProvinceHint) {
      variants.push(`${compact}, ${locality}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
    if (numberToken && streetPart) {
      variants.push(`${streetPart} ${numberToken}, ${locality}, ${normalizedCountryHint}`);
      if (normalizedProvinceHint) {
        variants.push(`${streetPart} ${numberToken}, ${locality}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
      }
    }
    if (streetPart) {
      variants.push(`${streetPart}, ${locality}, ${normalizedCountryHint}`);
      if (normalizedProvinceHint) {
        variants.push(`${streetPart}, ${locality}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
      }
    }
  });

  variants.push(`${compact}, ${normalizedCountryHint}`);

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
};

const buildStreetFallbackVariants = (query: string, cityHint = '', provinceHint = '', countryHint = DEFAULT_COUNTRY_NAME) => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const normalizedCityHint = String(cityHint || '').trim().replace(/\s+/g, ' ');
  const normalizedProvinceHint = String(provinceHint || '').trim().replace(/\s+/g, ' ');
  const normalizedCountryHint = String(countryHint || '').trim().replace(/\s+/g, ' ');
  const localityAliases = buildLocationAliases(normalizedCityHint).slice(0, 3);
  const tokens = compact.split(' ').filter(Boolean);
  const streetTokens = tokens.filter((token) => !/\d/.test(token));
  const streetPart = streetTokens.join(' ').trim();

  if (!streetPart) return [];

  const variants = [] as string[];
  if (normalizedProvinceHint) {
    variants.push(`${streetPart}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
  }
  if (normalizedCityHint) {
    variants.push(`${streetPart}, ${normalizedCityHint}`);
    variants.push(`${streetPart}, ${normalizedCityHint}, ${normalizedCountryHint}`);
    if (normalizedProvinceHint) {
      variants.push(`${streetPart}, ${normalizedCityHint}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
  }
  localityAliases.forEach((locality) => {
    variants.push(`${streetPart}, ${locality}, ${normalizedCountryHint}`);
    if (normalizedProvinceHint) {
      variants.push(`${streetPart}, ${locality}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
  });
  variants.push(streetPart, `${streetPart}, ${normalizedCountryHint}`);

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
};

const fetchNominatimRows = async (query: string, limit: number, countryCode: string) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&dedupe=0&countrycodes=${encodeURIComponent(countryCode)}&q=${encodeURIComponent(
    query
  )}&addressdetails=1&email=info@urbanfixar.com`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'UrbanFix/1.0 (info@urbanfixar.com)',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.6',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    return {
      rows: [] as NominatimRow[],
      error: 'La búsqueda de direcciones tardó demasiado. Intenta de nuevo con la localidad cargada.',
      rateLimited: false,
    };
  }

  clearTimeout(timeoutId);

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
  const countryHint = getCountryConfig(String(request.nextUrl.searchParams.get('country') || '').trim() || DEFAULT_COUNTRY_NAME).name;
  const countryCode = getCountryCode(countryHint);
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 5);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(12, Math.round(requestedLimit))) : 8;

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = buildGeocodeCacheKey(query, cityHint, provinceHint, countryHint, limit);
  const cached = geocodeResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  try {
    const upstreamLimit = Math.max(limit, 8);
    const variants = buildQueryVariants(query, cityHint, provinceHint, countryHint).slice(0, cityHint ? 4 : provinceHint ? 3 : 2);
    const fallbackVariants = buildStreetFallbackVariants(query, cityHint, provinceHint, countryHint).slice(
      0,
      cityHint ? 1 : provinceHint ? 1 : 0
    );
    const primaryResult = await collectNominatimRows(variants, upstreamLimit, countryCode);
    let firstError = primaryResult.error;
    let rateLimited = primaryResult.rateLimited;
    let rows = primaryResult.rows;

    if (!rateLimited && rows.length < limit && fallbackVariants.length > 0) {
      const fallbackResult = await collectNominatimRows(fallbackVariants, Math.max(6, limit), countryCode);
      rows = dedupeNominatimRows([...rows, ...fallbackResult.rows]);
      if (!firstError) {
        firstError = fallbackResult.error;
      }
      rateLimited = fallbackResult.rateLimited;
    }

    const normalizedQuery = normalizeSearchText(query);
    const normalizedCityHint = normalizeSearchText(cityHint);
    const normalizedProvinceHint = normalizeSearchText(provinceHint);
    const normalizedLocalityAliases = buildLocationAliases(cityHint).map((item) => normalizeSearchText(item));
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const queryNumber = queryTokens.find((token) => /\d/.test(token)) || '';
    const queryStreet = normalizeSearchText(queryTokens.filter((token) => !/\d/.test(token)).join(' '));
    const seen = new Set<string>();

    const results = rows
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isCoordinateWithinCountry(lat, lng, countryHint)) {
          return null;
        }
        const displayName = String(item.display_name || '').trim();
        const normalizedDisplayName = normalizeSearchText(displayName);
        const dedupeKey = `${normalizedDisplayName}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
        if (seen.has(dedupeKey)) {
          return null;
        }
        seen.add(dedupeKey);

        const normalizedRoad = normalizeSearchText(getRoadLabel(item));
        const normalizedHouseNumber = normalizeSearchText(String(item.address?.house_number || ''));
        const normalizedLocalities = getLocalityLabels(item).map((part) => normalizeSearchText(part));
        let score = Number(item.importance || 0);
        if (normalizedDisplayName.startsWith(normalizedQuery)) score += 4;
        else if (normalizedDisplayName.includes(normalizedQuery)) score += 2;
        score += queryTokens.filter((token) => normalizedDisplayName.includes(token)).length * 0.45;
        if (queryStreet) {
          if (normalizedRoad === queryStreet) score += 4.5;
          else if (normalizedRoad.includes(queryStreet) || queryStreet.includes(normalizedRoad)) score += 3;
          else if (normalizedDisplayName.includes(queryStreet)) score += 1.5;
        }
        if (queryNumber && normalizedHouseNumber === queryNumber) score += 7;
        else if (queryNumber && normalizedDisplayName.includes(queryNumber)) score += 1.5;
        if (normalizedCityHint && normalizedDisplayName.includes(normalizedCityHint)) score += 2.5;
        if (normalizedProvinceHint && normalizedDisplayName.includes(normalizedProvinceHint)) score += 3;
        if (normalizedLocalityAliases.length > 0) {
          if (normalizedLocalities.some((locality) => normalizedLocalityAliases.includes(locality))) {
            score += 5;
          } else if (
            normalizedLocalities.some((locality) =>
              normalizedLocalityAliases.some((alias) => locality.includes(alias) || alias.includes(locality))
            )
          ) {
            score += 3.5;
          } else if (normalizedLocalityAliases.some((alias) => normalizedDisplayName.includes(alias))) {
            score += 2;
          }
        }
        if (queryNumber && !normalizedDisplayName.includes(queryNumber) && !normalizedHouseNumber) score -= 2.25;
        if (queryNumber && normalizedHouseNumber && normalizedHouseNumber !== queryNumber) score -= 1.25;
        if (queryNumber && !normalizedHouseNumber && item.addresstype === 'road') score -= 1;

        return {
          display_name: displayName,
          lat,
          lon: lng,
          precision: normalizedHouseNumber === queryNumber && queryNumber ? 'exact' : 'approx',
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
        precision: (item as any).precision,
      }));

    const payload: GeocodeApiPayload = {
      results,
      error: results.length === 0 ? firstError : '',
      rateLimited,
    };

    geocodeResponseCache.set(cacheKey, {
      expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ results: [], error: 'No pudimos buscar direcciones en este momento.' });
  }
}