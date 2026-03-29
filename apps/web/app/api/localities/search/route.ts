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

const tokenizeText = (value: string) => normalizeText(value).split(' ').filter(Boolean);

const isSingleEditAway = (source: string, target: string) => {
  if (!source || !target) return false;
  const lengthDiff = Math.abs(source.length - target.length);
  if (lengthDiff > 1) return false;
  if (source === target) return true;

  let sourceIndex = 0;
  let targetIndex = 0;
  let mismatches = 0;

  while (sourceIndex < source.length && targetIndex < target.length) {
    if (source[sourceIndex] === target[targetIndex]) {
      sourceIndex += 1;
      targetIndex += 1;
      continue;
    }

    mismatches += 1;
    if (mismatches > 1) return false;

    if (source.length > target.length) {
      sourceIndex += 1;
    } else if (source.length < target.length) {
      targetIndex += 1;
    } else {
      sourceIndex += 1;
      targetIndex += 1;
    }
  }

  if (sourceIndex < source.length || targetIndex < target.length) {
    mismatches += 1;
  }

  return mismatches <= 1;
};

const buildPredictiveQueryVariants = (query: string) => {
  const trimmedQuery = String(query || '').trim();
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean);
  const variants = [trimmedQuery];

  if (tokens.length > 1) {
    variants.push(tokens.slice(-2).join(' '));
    variants.push(tokens[tokens.length - 1]);
  }

  if (trimmedQuery.length >= 6) {
    variants.push(trimmedQuery.slice(0, -1));
  }

  if (trimmedQuery.length >= 8) {
    variants.push(trimmedQuery.slice(0, -2));
  }

  return Array.from(new Set(variants.map((value) => value.trim()).filter((value) => value.length >= 2))).slice(0, 4);
};

const scoreLocalityResult = (
  row: { name: string; label: string },
  query: string,
  province: string
) => {
  const normalizedQuery = normalizeText(query);
  const normalizedName = normalizeText(row.name);
  const normalizedLabel = normalizeText(row.label);
  const queryTokens = tokenizeText(query);
  const nameTokens = tokenizeText(row.name);
  const labelTokens = tokenizeText(row.label);
  const normalizedProvince = normalizeText(province);

  let score = 0;

  if (normalizedName === normalizedQuery) score += 1400;
  if (normalizedLabel === normalizedQuery) score += 1200;
  if (normalizedName.startsWith(normalizedQuery)) score += 1000;
  if (normalizedName.includes(normalizedQuery)) score += 850;
  if (normalizedLabel.includes(normalizedQuery)) score += 500;

  let matchedTokens = 0;
  for (const queryToken of queryTokens) {
    let tokenScore = 0;

    if (nameTokens.includes(queryToken)) {
      tokenScore = Math.max(tokenScore, 260);
    }
    if (nameTokens.some((token) => token.startsWith(queryToken))) {
      tokenScore = Math.max(tokenScore, 220);
    }
    if (nameTokens.some((token) => token.includes(queryToken))) {
      tokenScore = Math.max(tokenScore, 170);
    }
    if (queryToken.length >= 5 && nameTokens.some((token) => isSingleEditAway(token, queryToken))) {
      tokenScore = Math.max(tokenScore, 140);
    }
    if (labelTokens.some((token) => token.startsWith(queryToken))) {
      tokenScore = Math.max(tokenScore, 90);
    }

    if (tokenScore > 0) {
      matchedTokens += 1;
      score += tokenScore;
    }
  }

  if (queryTokens.length > 1 && matchedTokens === queryTokens.length) {
    score += 240;
  }
  if (normalizedProvince && normalizedLabel.includes(normalizedProvince)) {
    score += 45;
  }
  if (normalizedQuery.length >= 6 && isSingleEditAway(normalizedName, normalizedQuery)) {
    score += 120;
  }

  score -= Math.max(0, nameTokens.length - queryTokens.length) * 4;

  return score;
};

const rankLocalityResults = (
  rows: Array<{ name: string; label: string }>,
  query: string,
  province: string,
  limit: number
) => {
  const deduped = dedupeLocalityResults(rows);
  const scoredRows = deduped
    .map((row) => ({
      row,
      score: scoreLocalityResult(row, query, province),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.row.label.localeCompare(right.row.label, 'es', { sensitivity: 'base' });
    });

  const queryLength = normalizeText(query).length;
  const minimumScore = queryLength >= 6 ? 220 : queryLength >= 4 ? 140 : 70;
  const filtered = scoredRows.filter((item) => item.score >= minimumScore);
  const selectedRows = (filtered.length > 0 ? filtered : scoredRows.filter((item) => item.score > 0)).slice(0, limit);

  return selectedRows.map((item) => item.row);
};

const buildLocalityLabel = (row: GeoRefLocalityRow) => {
  const name = String(row.nombre || '').trim();
  const department = String(row.departamento?.nombre || '').trim();
  const municipality = String(row.municipio?.nombre || '').trim();
  const province = String(row.provincia?.nombre || '').trim();
  const parts = [name];

  if (department && normalizeText(department) !== normalizeText(name)) {
    parts.push(department);
  } else if (municipality && normalizeText(municipality) !== normalizeText(name)) {
    parts.push(municipality);
  }

  if (province && !parts.some((part) => normalizeText(part) === normalizeText(province))) {
    parts.push(province);
  }

  return parts.filter(Boolean).join(', ');
};

const dedupeLocalityResults = (rows: Array<{ name: string; label: string }>) => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = normalizeText(row.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    const results = rows
      .map((row) => {
        const name = String(row.nombre || '').trim();
        if (!name) return null;
        return {
          name,
          label: buildLocalityLabel(row),
        };
      })
      .filter(Boolean) as Array<{ name: string; label: string }>;

    return { results: dedupeLocalityResults(results), error: '' };
  } catch {
    clearTimeout(timeoutId);
    return {
      results: [] as Array<{ name: string; label: string }>,
      error: 'La búsqueda de localidades tardó demasiado. Intenta nuevamente.',
    };
  }
};

const fetchPredictiveArgentinaLocalities = async (province: string, query: string, limit: number) => {
  const variants = buildPredictiveQueryVariants(query);
  const collectedResults: Array<{ name: string; label: string }> = [];
  let lastError = '';

  for (const variant of variants) {
    const { results, error } = await fetchArgentinaLocalities(province, variant, limit);
    if (results.length > 0) {
      collectedResults.push(...results);
    }
    if (!lastError && error) {
      lastError = error;
    }
    if (dedupeLocalityResults(collectedResults).length >= limit) {
      break;
    }
  }

  return {
    results: rankLocalityResults(collectedResults, query, province, limit),
    error: collectedResults.length > 0 ? '' : lastError,
  };
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
    const results = rows
      .map((row) => {
        const name = String(
          row.address?.city || row.address?.town || row.address?.village || row.address?.municipality || ''
        ).trim();
        if (!name) return null;
        const county = String(row.address?.county || '').trim();
        const state = String(row.address?.state || '').trim();
        return {
          name,
          label: [name, county, state].filter(Boolean).join(', '),
        };
      })
      .filter(Boolean) as Array<{ name: string; label: string }>;

    return { results: rankLocalityResults(results, query, province, limit), error: '' };
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
  if (normalizedCountry === 'Argentina') {
    const georefResult = await fetchPredictiveArgentinaLocalities(province, query, limit);
    if (georefResult.results.length > 0) {
      return NextResponse.json(georefResult);
    }

    const nominatimFallback = await fetchGlobalLocalities(normalizedCountry, province, query, limit);
    const mergedResults = rankLocalityResults(
      [...georefResult.results, ...nominatimFallback.results],
      query,
      province,
      limit
    );
    const error = mergedResults.length > 0 ? '' : georefResult.error || nominatimFallback.error;

    return NextResponse.json({ results: mergedResults, error });
  }

  const { results, error } = await fetchGlobalLocalities(normalizedCountry, province, query, limit);

  return NextResponse.json({ results, error });
}