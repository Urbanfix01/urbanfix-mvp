import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { DEFAULT_COUNTRY_NAME, getCountryCode, getCountryConfig, isCoordinateWithinCountry } from '../../../../lib/location-catalog';

const GEOCODE_CACHE_TTL_MS = 45_000;
const MAX_SEARCH_QUERY_LENGTH = 140;
const MAX_SEARCH_HINT_LENGTH = 80;

type GeocodeApiPayload = {
  results: Array<{
    display_name: string;
    full_display_name?: string;
    primary_label?: string;
    secondary_label?: string;
    detail_label?: string;
    accuracy_label?: string;
    street?: string;
    house_number?: string;
    locality?: string;
    province?: string;
    postcode?: string;
    lat: number;
    lon: number;
    precision: 'exact' | 'approx';
  }>;
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

const normalizeSearchParam = (value: string | null) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const rejectOversizedSearchParam = (value: string, maxLength: number, message: string) => {
  if (value.length <= maxLength) return null;

  return NextResponse.json(
    {
      results: [],
      error: `${message} Usa hasta ${maxLength} caracteres.`,
    },
    { status: 400 }
  );
};

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
    municipality?: string;
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
  limit: number,
  quick: boolean
) => JSON.stringify({ query: normalizeSearchText(query), cityHint, provinceHint, countryHint, limit, quick });

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

const getHouseNumberLabel = (row: NominatimRow) =>
  String(row.address?.house_number || '').trim();

const getLocalityLabels = (row: NominatimRow) =>
  [
    row.address?.city,
    row.address?.town,
    row.address?.village,
    row.address?.hamlet,
    row.address?.municipality,
    row.address?.suburb,
    row.address?.neighbourhood,
    row.address?.quarter,
    row.address?.county,
    row.address?.state_district,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

const uniqLabels = (labels: string[]) => {
  const seen = new Set<string>();
  return labels
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item) return false;
      const key = normalizeSearchText(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const extractAddressNumber = (value: string) =>
  normalizeSearchText(value)
    .match(/\b\d{1,6}[a-z]?\b/)?.[0] || '';

const expandCommonAddressAbbreviations = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\bing\.?\b/gi, 'Ingeniero')
    .replace(/\bgral\.?\b/gi, 'General')
    .replace(/\bav\.?\b/gi, 'Avenida')
    .replace(/\bsta\.?\b/gi, 'Santa')
    .replace(/\bsto\.?\b/gi, 'Santo')
    .replace(/\s+/g, ' ');

const parseAddressQuery = (query: string) => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const parts = compact
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const expandedFirstPart = expandCommonAddressAbbreviations(parts[0] || compact);
  let streetAddress = expandedFirstPart;
  let inlineLocalities = parts.slice(1).map(expandCommonAddressAbbreviations).filter(Boolean);
  const numberToken = extractAddressNumber(streetAddress);
  if (numberToken && parts.length <= 1) {
    const tokens = expandedFirstPart.split(/\s+/).filter(Boolean);
    const numberIndex = tokens.findIndex((token) => normalizeSearchText(token) === numberToken);
    const trailingTokens = numberIndex >= 0 ? tokens.slice(numberIndex + 1) : [];
    const trailingFirstToken = normalizeSearchText(trailingTokens[0] || '');
    const looksLikeUnit =
      trailingFirstToken === 'piso' ||
      trailingFirstToken === 'depto' ||
      trailingFirstToken === 'dpto' ||
      trailingFirstToken === 'dto' ||
      trailingFirstToken === 'unidad' ||
      trailingFirstToken === 'uf';

    if (numberIndex >= 0 && trailingTokens.length > 0 && !looksLikeUnit) {
      streetAddress = tokens.slice(0, numberIndex + 1).join(' ');
      inlineLocalities = [trailingTokens.join(' '), ...inlineLocalities];
    }
  }
  const streetPart = streetAddress
    .split(/\s+/)
    .filter((token) => normalizeSearchText(token) !== numberToken)
    .join(' ')
    .trim();

  return {
    compact,
    streetAddress,
    streetPart,
    numberToken,
    inlineLocalities,
  };
};

type GeoRefAddressRow = {
  nomenclatura?: string;
  altura?: { valor?: number | string };
  calle?: { nombre?: string };
  departamento?: { nombre?: string };
  localidad?: { nombre?: string };
  localidad_censal?: { nombre?: string };
  municipio?: { nombre?: string };
  provincia?: { nombre?: string };
  ubicacion?: {
    lat?: number | string;
    lon?: number | string;
  };
};

const buildStructuredAddressLabels = (row: NominatimRow, countryHint: string) => {
  const displayName = String(row.display_name || '').trim();
  const displayParts = displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPartNumber = displayParts[0]?.match(/^\d{1,6}[a-zA-Z]?$/)?.[0] || '';
  const houseNumber = getHouseNumberLabel(row) || firstPartNumber;
  const street = getRoadLabel(row) || (firstPartNumber ? displayParts[1] : displayParts[0]) || '';
  const locality = uniqLabels([
    row.address?.city || '',
    row.address?.town || '',
    row.address?.village || '',
    row.address?.hamlet || '',
    row.address?.municipality || '',
    row.address?.suburb || '',
    row.address?.neighbourhood || '',
    row.address?.quarter || '',
    row.address?.county || '',
  ])[0] || '';
  const province = String(row.address?.state || row.address?.state_district || '').trim();
  const postcode = String(row.address?.postcode || '').trim();
  const primaryLabel = street && houseNumber ? `${street} ${houseNumber}` : street || displayParts.slice(0, 2).join(' ');
  const secondaryLabel = uniqLabels([locality, province]).join(', ');
  const detailLabel = uniqLabels([postcode, countryHint]).join(' · ');
  const displayLabel = [primaryLabel, secondaryLabel].filter(Boolean).join(' · ') || displayName;

  return {
    displayName,
    displayLabel,
    primaryLabel: primaryLabel || displayName,
    secondaryLabel,
    detailLabel,
    street,
    houseNumber,
    locality,
    province,
    postcode,
  };
};

const buildQueryVariants = (query: string, cityHint = '', provinceHint = '', countryHint = DEFAULT_COUNTRY_NAME) => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const parsed = parseAddressQuery(compact);
  const normalizedCityHint = String(cityHint || '').trim().replace(/\s+/g, ' ');
  const normalizedProvinceHint = String(provinceHint || '').trim().replace(/\s+/g, ' ');
  const normalizedCountryHint = String(countryHint || '').trim().replace(/\s+/g, ' ');
  const variants = [compact];
  const localityAliases = Array.from(
    new Set([
      ...parsed.inlineLocalities,
      normalizedCityHint,
      ...buildLocationAliases(normalizedCityHint).slice(0, 3),
    ].filter(Boolean))
  );
  const numberToken = parsed.numberToken;
  const streetPart = parsed.streetPart;
  const streetAddress = parsed.streetAddress;

  localityAliases.forEach((locality) => {
    if (normalizedProvinceHint) {
      variants.push(`${streetAddress}, ${locality}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    }
    if (normalizedCityHint && normalizeSearchText(locality) !== normalizeSearchText(normalizedCityHint)) {
      variants.push(`${streetAddress}, ${locality}, ${normalizedCityHint}, ${normalizedCountryHint}`);
      if (normalizedProvinceHint) {
        variants.push(`${streetAddress}, ${locality}, ${normalizedCityHint}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
      }
    }
    variants.push(`${streetAddress}, ${locality}, ${normalizedCountryHint}`);
  });

  if (numberToken && streetPart) {
    variants.push(streetAddress);
    variants.push(`${streetAddress}, ${normalizedCountryHint}`);
    variants.push(`${streetPart} ${numberToken}, ${normalizedCountryHint}`);
  }

  if (streetPart) {
    variants.push(`${streetPart}, ${normalizedCountryHint}`);
  }

  if (normalizedProvinceHint) {
    variants.push(`${compact}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
    if (numberToken && streetPart) {
      variants.push(`${streetAddress}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
      variants.push(`${streetPart} ${numberToken}, ${normalizedProvinceHint}, ${normalizedCountryHint}`);
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
      variants.push(`${streetAddress}, ${normalizedCityHint}, ${normalizedCountryHint}`);
    }
    if (streetPart) {
      variants.push(`${streetPart}, ${normalizedCityHint}, ${normalizedCountryHint}`);
    }
  }

  variants.push(`${compact}, ${normalizedCountryHint}`);

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)));
};

const buildStreetFallbackVariants = (query: string, cityHint = '', provinceHint = '', countryHint = DEFAULT_COUNTRY_NAME) => {
  const compact = String(query || '').trim().replace(/\s+/g, ' ');
  const parsed = parseAddressQuery(compact);
  const normalizedCityHint = String(cityHint || '').trim().replace(/\s+/g, ' ');
  const normalizedProvinceHint = String(provinceHint || '').trim().replace(/\s+/g, ' ');
  const normalizedCountryHint = String(countryHint || '').trim().replace(/\s+/g, ' ');
  const localityAliases = Array.from(
    new Set([
      ...parsed.inlineLocalities,
      normalizedCityHint,
      ...buildLocationAliases(normalizedCityHint).slice(0, 3),
    ].filter(Boolean))
  );
  const streetPart = parsed.streetPart;

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
    const timeoutId = setTimeout(() => controller.abort(), 4500);

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

const fetchArgentinaAddressRows = async (query: string, cityHint: string, provinceHint: string, limit: number) => {
  const parsed = parseAddressQuery(query);
  if (!parsed.streetAddress || !parsed.numberToken) {
    return { rows: [] as NominatimRow[], error: '' };
  }
  const departmentHint = cityHint.trim() || parsed.inlineLocalities[0] || '';

  const buildUrl = (includeDepartment: boolean) => {
    const params = new URLSearchParams({
      direccion: parsed.streetAddress,
      max: String(Math.max(limit, 8)),
    });
    if (provinceHint.trim()) {
      params.set('provincia', provinceHint.trim());
    }
    if (includeDepartment && departmentHint.trim()) {
      params.set('departamento', departmentHint.trim());
    }
    return `https://apis.datos.gob.ar/georef/api/direcciones?${params.toString()}`;
  };

  const fetchRows = async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { rows: [] as GeoRefAddressRow[], error: 'No pudimos consultar direcciones oficiales en este momento.' };
      }

      const payload = (await response.json()) as { direcciones?: GeoRefAddressRow[] };
      return { rows: Array.isArray(payload.direcciones) ? payload.direcciones : [], error: '' };
    } catch {
      clearTimeout(timeoutId);
      return { rows: [] as GeoRefAddressRow[], error: 'La busqueda oficial de direcciones tardó demasiado.' };
    }
  };

  const primary = await fetchRows(buildUrl(true));
  const sourceRows = primary.rows.length > 0 || !departmentHint.trim() ? primary : await fetchRows(buildUrl(false));
  const rows = sourceRows.rows
    .map((row): NominatimRow | null => {
      const lat = Number(row.ubicacion?.lat);
      const lon = Number(row.ubicacion?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const rawRoad = String(row.calle?.nombre || parsed.streetPart || '').trim();
      const numericRoadPrefixMatch = rawRoad.match(/^\d+\s+(.+)$/);
      const road =
        numericRoadPrefixMatch && normalizeSearchText(numericRoadPrefixMatch[1]) === normalizeSearchText(parsed.streetPart)
          ? numericRoadPrefixMatch[1].trim()
          : rawRoad;
      const houseNumber = String(row.altura?.valor || parsed.numberToken || '').trim();
      const locality = String(
        row.localidad_censal?.nombre || row.localidad?.nombre || parsed.inlineLocalities[0] || ''
      ).trim();
      const department = String(row.departamento?.nombre || row.municipio?.nombre || cityHint || '').trim();
      const province = String(row.provincia?.nombre || provinceHint || '').trim();
      const displayName =
        row.nomenclatura ||
        [road && houseNumber ? `${road} ${houseNumber}` : road, locality, department, province, DEFAULT_COUNTRY_NAME]
          .filter(Boolean)
          .join(', ');

      return {
        display_name: displayName,
        lat: String(lat),
        lon: String(lon),
        importance: 1,
        addresstype: 'house',
        address: {
          house_number: houseNumber,
          road,
          city: locality,
          county: department,
          state: province,
        },
      };
    })
    .filter(Boolean) as NominatimRow[];

  return {
    rows,
    error: rows.length > 0 ? '' : sourceRows.error,
  };
};

export async function GET(request: NextRequest) {
  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'geocode-search',
    max: 90,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error, results: [] }, { status: rateLimit.status, headers: rateLimit.headers });
  }

  const query = normalizeSearchParam(request.nextUrl.searchParams.get('query'));
  const cityHint = normalizeSearchParam(request.nextUrl.searchParams.get('city'));
  const provinceHint = normalizeSearchParam(request.nextUrl.searchParams.get('province'));
  const rawCountryHint = normalizeSearchParam(request.nextUrl.searchParams.get('country')) || DEFAULT_COUNTRY_NAME;
  const quick = request.nextUrl.searchParams.get('quick') === '1';
  const oversizedParamResponse =
    rejectOversizedSearchParam(query, MAX_SEARCH_QUERY_LENGTH, 'La direccion es demasiado larga.') ||
    rejectOversizedSearchParam(cityHint, MAX_SEARCH_HINT_LENGTH, 'La ciudad es demasiado larga.') ||
    rejectOversizedSearchParam(provinceHint, MAX_SEARCH_HINT_LENGTH, 'La provincia es demasiado larga.') ||
    rejectOversizedSearchParam(rawCountryHint, MAX_SEARCH_HINT_LENGTH, 'El pais es demasiado largo.');
  if (oversizedParamResponse) return oversizedParamResponse;

  const countryHint = getCountryConfig(rawCountryHint).name;
  const countryCode = getCountryCode(countryHint);
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 5);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(12, Math.round(requestedLimit))) : 8;

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = buildGeocodeCacheKey(query, cityHint, provinceHint, countryHint, limit, quick);
  const cached = geocodeResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  try {
    const upstreamLimit = quick ? Math.max(limit, 4) : Math.max(limit, 8);
    const parsedQuery = parseAddressQuery(query);
    const variants = buildQueryVariants(query, cityHint, provinceHint, countryHint).slice(
      0,
      quick ? 1 : cityHint ? 8 : provinceHint ? 6 : 4
    );
    const fallbackVariants = buildStreetFallbackVariants(query, cityHint, provinceHint, countryHint).slice(
      0,
      quick ? 0 : cityHint ? 3 : provinceHint ? 2 : 0
    );
    const [argentinaAddressResult, primaryResult] = await Promise.all([
      countryHint === 'Argentina'
        ? fetchArgentinaAddressRows(query, cityHint, provinceHint, upstreamLimit)
        : Promise.resolve({ rows: [] as NominatimRow[], error: '' }),
      collectNominatimRows(variants, upstreamLimit, countryCode),
    ]);
    let firstError = argentinaAddressResult.error || primaryResult.error;
    let rateLimited = primaryResult.rateLimited;
    let rows = dedupeNominatimRows([...argentinaAddressResult.rows, ...primaryResult.rows]);

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
    const normalizedLocalityAliases = Array.from(
      new Set([...parsedQuery.inlineLocalities, cityHint, ...buildLocationAliases(cityHint)].map((item) => normalizeSearchText(item)).filter(Boolean))
    );
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const queryNumber = extractAddressNumber(query) || queryTokens.find((token) => /\d/.test(token)) || '';
    const queryStreet = normalizeSearchText(parsedQuery.streetPart || queryTokens.filter((token) => !/\d/.test(token)).join(' '));
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

        const labels = buildStructuredAddressLabels(item, countryHint);
        const normalizedRoad = normalizeSearchText(labels.street);
        const normalizedHouseNumber = extractAddressNumber(labels.houseNumber);
        const normalizedLocalities = getLocalityLabels(item).map((part) => normalizeSearchText(part));
        const hasHouseNumber = Boolean(normalizedHouseNumber);
        const exactHouseNumberMatch = Boolean(queryNumber && normalizedHouseNumber === queryNumber);
        let score = Number(item.importance || 0);
        if (normalizedDisplayName.startsWith(normalizedQuery)) score += 4;
        else if (normalizedDisplayName.includes(normalizedQuery)) score += 2;
        score += queryTokens.filter((token) => normalizedDisplayName.includes(token)).length * 0.45;
        if (queryStreet) {
          if (normalizedRoad === queryStreet) score += 4.5;
          else if (normalizedRoad.includes(queryStreet) || queryStreet.includes(normalizedRoad)) score += 3;
          else if (normalizedDisplayName.includes(queryStreet)) score += 1.5;
        }
        if (queryNumber && exactHouseNumberMatch) score += 18;
        else if (queryNumber && hasHouseNumber) score += 5;
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
        if (queryNumber && !hasHouseNumber) score -= 10;
        if (queryNumber && hasHouseNumber && !exactHouseNumberMatch) score -= 3;
        if (queryNumber && !hasHouseNumber && item.addresstype === 'road') score -= 4;
        if (item.addresstype === 'house' || item.addresstype === 'building') score += 3;

        return {
          display_name: labels.displayLabel,
          full_display_name: labels.displayName,
          primary_label: labels.primaryLabel,
          secondary_label: labels.secondaryLabel,
          detail_label: labels.detailLabel,
          accuracy_label:
            queryNumber && exactHouseNumberMatch
              ? 'Altura exacta'
              : hasHouseNumber
                ? 'Altura detectada'
                : 'Confirmar en mapa',
          street: labels.street,
          house_number: labels.houseNumber,
          locality: labels.locality,
          province: labels.province,
          postcode: labels.postcode,
          lat,
          lon: lng,
          precision: hasHouseNumber && (!queryNumber || exactHouseNumberMatch) ? 'exact' : 'approx',
          score,
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number((b as any).score || 0) - Number((a as any).score || 0))
      .slice(0, limit)
      .map((item) => ({
        display_name: (item as any).display_name,
        full_display_name: (item as any).full_display_name,
        primary_label: (item as any).primary_label,
        secondary_label: (item as any).secondary_label,
        detail_label: (item as any).detail_label,
        accuracy_label: (item as any).accuracy_label,
        street: (item as any).street,
        house_number: (item as any).house_number,
        locality: (item as any).locality,
        province: (item as any).province,
        postcode: (item as any).postcode,
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
