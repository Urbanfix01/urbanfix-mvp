export type GeoOption = {
  id: string;
  label: string;
};

type ProvincesResponse = {
  provincias?: Array<{ id?: string; nombre?: string }>;
};

type CitiesResponse = {
  localidades?: Array<{ id?: string; nombre?: string }>;
};

const GEOREF_API = 'https://apis.datos.gob.ar/georef/api/v2.0';

let provincesCache: GeoOption[] | null = null;
const citiesCache = new Map<string, GeoOption[]>();

const CONNECTOR_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e']);

const titleCaseEs = (value: string) =>
  value
    .toLocaleLowerCase('es-AR')
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && CONNECTOR_WORDS.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase('es-AR') + word.slice(1);
    })
    .join(' ');

const normalizeOptions = (items: Array<{ id?: string; nombre?: string }>): GeoOption[] => {
  const seen = new Set<string>();

  return items
    .map((item) => ({
      id: String(item.id || item.nombre || ''),
      label: titleCaseEs(String(item.nombre || '')),
    }))
    .filter((item) => item.id && item.label)
    .filter((item) => {
      const key = item.label.toLocaleLowerCase('es-AR');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'es-AR'));
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${GEOREF_API}${path}`);
  if (!response.ok) {
    throw new Error(`Georef respondio ${response.status}`);
  }

  return (await response.json()) as T;
};

export const getArgentinaProvinces = async (): Promise<GeoOption[]> => {
  if (provincesCache) return provincesCache;

  const data = await fetchJson<ProvincesResponse>('/provincias?campos=id,nombre&max=30');
  provincesCache = normalizeOptions(data.provincias || []);
  return provincesCache;
};

export const getArgentinaCitiesByProvince = async (provinceName: string): Promise<GeoOption[]> => {
  const normalizedProvince = titleCaseEs(provinceName.trim());
  const cacheKey = normalizedProvince.toLocaleLowerCase('es-AR');
  const cached = citiesCache.get(cacheKey);
  if (cached) return cached;

  const data = await fetchJson<CitiesResponse>(
    `/localidades?provincia=${encodeURIComponent(normalizedProvince)}&campos=id,nombre&max=5000`
  );

  const cities = normalizeOptions(data.localidades || []);
  citiesCache.set(cacheKey, cities);
  return cities;
};
