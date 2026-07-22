import { NextRequest, NextResponse } from 'next/server';
import { getCountryCode, getProvinceOptions, hasProvinceCatalogForCountry } from '../../../../lib/location-catalog';

const COUNTRIES_NOW_BASE_URL = 'https://countriesnow.space/api/v0.1';
const PROVINCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const provinceCache = new Map<string, { expiresAt: number; provinces: string[]; source: string }>();
let countriesStatesCache: { expiresAt: number; rows: CountriesNowCountryStates[] } | null = null;

type CountriesNowState = {
  name?: string;
  state_code?: string;
};

type CountriesNowCountryStates = {
  name?: string;
  iso2?: string;
  Iso2?: string;
  states?: CountriesNowState[];
};

type CountriesNowAllStatesPayload = {
  error?: boolean;
  msg?: string;
  data?: CountriesNowCountryStates[];
};

type CountriesNowStatesPayload = {
  error?: boolean;
  msg?: string;
  data?: {
    name?: string;
    states?: CountriesNowState[];
  };
};

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeProvinceName = (value: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeCountryParam = (value: string | null) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const dedupeAndSortProvinces = (provinces: string[]) => {
  const seen = new Set<string>();
  return provinces
    .map((province) => normalizeProvinceName(province))
    .filter((province) => {
      const key = normalizeText(province);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.localeCompare(right, 'es', { sensitivity: 'base' }));
};

const getRowIso2 = (row: { iso2?: string; Iso2?: string }) => String(row.iso2 || row.Iso2 || '').toUpperCase();

const fetchCountriesNowJson = async <T,>(path: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${COUNTRIES_NOW_BASE_URL}${path}`, {
      next: { revalidate: 24 * 60 * 60 },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const loadAllRemoteCountryStates = async () => {
  if (countriesStatesCache && countriesStatesCache.expiresAt > Date.now()) return countriesStatesCache.rows;

  const payload = await fetchCountriesNowJson<CountriesNowAllStatesPayload>('/countries/states');
  if (!payload) return [];
  const rows = payload.error || !Array.isArray(payload.data) ? [] : payload.data;
  countriesStatesCache = { expiresAt: Date.now() + PROVINCE_CACHE_TTL_MS, rows };
  return rows;
};

const loadRemoteProvinces = async (countryCode: string) => {
  const iso2 = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) return [];

  const payload = await fetchCountriesNowJson<CountriesNowStatesPayload>(
    `/countries/states/q?iso2=${encodeURIComponent(iso2)}`
  );

  if (payload && !payload.error && Array.isArray(payload.data?.states)) {
    const directProvinces = dedupeAndSortProvinces(payload.data.states.map((state) => state.name || ''));
    if (directProvinces.length > 0) return directProvinces;
  }

  const allRows = await loadAllRemoteCountryStates();
  const row = allRows.find((candidate) => getRowIso2(candidate) === iso2);
  if (!Array.isArray(row?.states)) return [];

  return dedupeAndSortProvinces(row.states.map((state) => state.name || ''));
};

export async function GET(request: NextRequest) {
  const country = normalizeCountryParam(request.nextUrl.searchParams.get('country'));
  const countryCode = getCountryCode(country).toUpperCase();
  const localProvinces = dedupeAndSortProvinces(getProvinceOptions(country));
  const hasLocalProvinceCatalog = hasProvinceCatalogForCountry(country);

  if (hasLocalProvinceCatalog) {
    return NextResponse.json({
      country,
      countryCode,
      provinces: localProvinces,
      source: 'local',
      error: '',
    });
  }

  const cached = provinceCache.get(countryCode);
  if (cached && cached.expiresAt > Date.now()) {
    const provinces = dedupeAndSortProvinces([...localProvinces, ...cached.provinces]);
    return NextResponse.json({
      country,
      countryCode,
      provinces,
      source: localProvinces.length > 0 && cached.source !== 'local' ? `local+${cached.source}` : cached.source,
    });
  }

  try {
    const remoteProvinces = await loadRemoteProvinces(countryCode);
    const provinces = dedupeAndSortProvinces([...localProvinces, ...remoteProvinces]);
    const source =
      localProvinces.length > 0 && remoteProvinces.length > 0
        ? 'local+countriesnow'
        : remoteProvinces.length > 0
          ? 'countriesnow'
          : localProvinces.length > 0
            ? 'local'
            : 'manual';

    if (remoteProvinces.length > 0) {
      provinceCache.set(countryCode, {
        expiresAt: Date.now() + PROVINCE_CACHE_TTL_MS,
        provinces: remoteProvinces,
        source: 'countriesnow',
      });
    }

    return NextResponse.json({
      country,
      countryCode,
      provinces,
      source,
      error: provinces.length > 0 ? '' : 'No pudimos cargar provincias o estados para este pais.',
    });
  } catch {
    return NextResponse.json({
      country,
      countryCode,
      provinces: localProvinces,
      source: localProvinces.length > 0 ? 'local' : 'manual',
      error: localProvinces.length > 0 ? '' : 'No pudimos cargar provincias o estados para este pais.',
    });
  }
}
