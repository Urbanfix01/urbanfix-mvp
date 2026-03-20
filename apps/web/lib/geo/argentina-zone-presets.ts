type ZonePreset = {
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
  territory: string;
  scope: 'province' | 'city';
};

type ZoneMatch = {
  label: string;
  lat: number;
  lng: number;
};

const ARGENTINA_ZONE_PRESETS: ZonePreset[] = [
  { label: 'CABA', lat: -34.6037, lng: -58.3816, aliases: ['caba', 'capital federal', 'ciudad autonoma de buenos aires'], territory: 'caba', scope: 'province' },
  { label: 'Buenos Aires', lat: -34.6037, lng: -58.3816, aliases: ['buenos aires', 'provincia de buenos aires', 'gran buenos aires', 'gba', 'amba', 'zona norte', 'zona sur', 'zona oeste'], territory: 'buenos-aires', scope: 'province' },
  { label: 'La Plata', lat: -34.9215, lng: -57.9545, aliases: ['la plata'], territory: 'buenos-aires', scope: 'city' },
  { label: 'Mar del Plata', lat: -38.0055, lng: -57.5426, aliases: ['mar del plata', 'mdq'], territory: 'buenos-aires', scope: 'city' },
  { label: 'Bahia Blanca', lat: -38.7196, lng: -62.2724, aliases: ['bahia blanca'], territory: 'buenos-aires', scope: 'city' },
  { label: 'San Miguel', lat: -34.5431, lng: -58.7111, aliases: ['san miguel'], territory: 'buenos-aires', scope: 'city' },
  { label: 'Ingeniero Adolfo Sourdeaux', lat: -34.4996, lng: -58.6512, aliases: ['ingeniero adolfo sourdeaux', 'sourdeaux'], territory: 'buenos-aires', scope: 'city' },
  { label: '11 de Septiembre', lat: -34.5632, lng: -58.6865, aliases: ['11 de septiembre'], territory: 'buenos-aires', scope: 'city' },
  { label: 'Cordoba', lat: -31.4201, lng: -64.1888, aliases: ['cordoba', 'provincia de cordoba'], territory: 'cordoba', scope: 'province' },
  { label: 'Rio Cuarto', lat: -33.1307, lng: -64.3499, aliases: ['rio cuarto'], territory: 'cordoba', scope: 'city' },
  { label: 'Villa Carlos Paz', lat: -31.4241, lng: -64.4978, aliases: ['villa carlos paz'], territory: 'cordoba', scope: 'city' },
  { label: 'Santa Fe', lat: -31.6333, lng: -60.7000, aliases: ['santa fe', 'provincia de santa fe'], territory: 'santa-fe', scope: 'province' },
  { label: 'Rosario', lat: -32.9442, lng: -60.6505, aliases: ['rosario'], territory: 'santa-fe', scope: 'city' },
  { label: 'Entre Rios', lat: -31.7319, lng: -60.5238, aliases: ['entre rios', 'provincia de entre rios'], territory: 'entre-rios', scope: 'province' },
  { label: 'Parana', lat: -31.7319, lng: -60.5238, aliases: ['parana'], territory: 'entre-rios', scope: 'city' },
  { label: 'Mendoza', lat: -32.8895, lng: -68.8458, aliases: ['mendoza', 'provincia de mendoza', 'san rafael'], territory: 'mendoza', scope: 'province' },
  { label: 'San Juan', lat: -31.5375, lng: -68.5364, aliases: ['san juan', 'provincia de san juan'], territory: 'san-juan', scope: 'province' },
  { label: 'San Luis', lat: -33.2950, lng: -66.3356, aliases: ['san luis', 'provincia de san luis'], territory: 'san-luis', scope: 'province' },
  { label: 'Tucuman', lat: -26.8083, lng: -65.2176, aliases: ['tucuman', 'provincia de tucuman', 'san miguel de tucuman'], territory: 'tucuman', scope: 'province' },
  { label: 'Salta', lat: -24.7821, lng: -65.4232, aliases: ['salta', 'provincia de salta'], territory: 'salta', scope: 'province' },
  { label: 'Jujuy', lat: -24.1858, lng: -65.2995, aliases: ['jujuy', 'provincia de jujuy', 'san salvador de jujuy'], territory: 'jujuy', scope: 'province' },
  { label: 'Santiago del Estero', lat: -27.7951, lng: -64.2615, aliases: ['santiago del estero', 'provincia de santiago del estero'], territory: 'santiago-del-estero', scope: 'province' },
  { label: 'Catamarca', lat: -28.4696, lng: -65.7852, aliases: ['catamarca', 'provincia de catamarca', 'san fernando del valle de catamarca'], territory: 'catamarca', scope: 'province' },
  { label: 'La Rioja', lat: -29.4131, lng: -66.8558, aliases: ['la rioja', 'provincia de la rioja'], territory: 'la-rioja', scope: 'province' },
  { label: 'Corrientes', lat: -27.4691, lng: -58.8306, aliases: ['corrientes', 'provincia de corrientes'], territory: 'corrientes', scope: 'province' },
  { label: 'Chaco', lat: -27.4514, lng: -58.9867, aliases: ['chaco', 'provincia del chaco'], territory: 'chaco', scope: 'province' },
  { label: 'Resistencia', lat: -27.4514, lng: -58.9867, aliases: ['resistencia'], territory: 'chaco', scope: 'city' },
  { label: 'Misiones', lat: -27.3621, lng: -55.9009, aliases: ['misiones', 'provincia de misiones'], territory: 'misiones', scope: 'province' },
  { label: 'Posadas', lat: -27.3621, lng: -55.9009, aliases: ['posadas'], territory: 'misiones', scope: 'city' },
  { label: 'Formosa', lat: -26.1775, lng: -58.1781, aliases: ['formosa', 'provincia de formosa'], territory: 'formosa', scope: 'province' },
  { label: 'Neuquen', lat: -38.9516, lng: -68.0591, aliases: ['neuquen', 'provincia del neuquen'], territory: 'neuquen', scope: 'province' },
  { label: 'Rio Negro', lat: -40.8135, lng: -62.9967, aliases: ['rio negro', 'provincia de rio negro'], territory: 'rio-negro', scope: 'province' },
  { label: 'Viedma', lat: -40.8135, lng: -62.9967, aliases: ['viedma'], territory: 'rio-negro', scope: 'city' },
  { label: 'Bariloche', lat: -41.1335, lng: -71.3103, aliases: ['bariloche', 'san carlos de bariloche'], territory: 'rio-negro', scope: 'city' },
  { label: 'Chubut', lat: -43.3002, lng: -65.1023, aliases: ['chubut', 'provincia del chubut'], territory: 'chubut', scope: 'province' },
  { label: 'Comodoro Rivadavia', lat: -45.8641, lng: -67.4966, aliases: ['comodoro rivadavia', 'comodoro'], territory: 'chubut', scope: 'city' },
  { label: 'Trelew', lat: -43.2490, lng: -65.3094, aliases: ['trelew'], territory: 'chubut', scope: 'city' },
  { label: 'Santa Cruz', lat: -51.6230, lng: -69.2168, aliases: ['santa cruz', 'provincia de santa cruz'], territory: 'santa-cruz', scope: 'province' },
  { label: 'Rio Gallegos', lat: -51.6230, lng: -69.2168, aliases: ['rio gallegos'], territory: 'santa-cruz', scope: 'city' },
  { label: 'Tierra del Fuego', lat: -54.8019, lng: -68.3030, aliases: ['tierra del fuego', 'ushuaia'], territory: 'tierra-del-fuego', scope: 'province' },
  { label: 'Ushuaia', lat: -54.8019, lng: -68.3030, aliases: ['ushuaia'], territory: 'tierra-del-fuego', scope: 'city' },
  { label: 'La Pampa', lat: -36.6167, lng: -64.2833, aliases: ['la pampa', 'provincia de la pampa'], territory: 'la-pampa', scope: 'province' },
  { label: 'Santa Rosa', lat: -36.6167, lng: -64.2833, aliases: ['santa rosa'], territory: 'la-pampa', scope: 'city' },
];

const normalizeZoneText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildNormalizedZoneText = (...values: Array<string | null | undefined>) =>
  values.map((value) => normalizeZoneText(value)).filter(Boolean).join(' ');

export const toFiniteCoordinate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const resolveArgentinaZonePreset = (...values: Array<string | null | undefined>): ZonePreset | null => {
  const normalized = buildNormalizedZoneText(...values);
  if (!normalized) return null;

  for (const preset of ARGENTINA_ZONE_PRESETS) {
    if (preset.aliases.some((alias) => normalized.includes(normalizeZoneText(alias)))) {
      return preset;
    }
  }

  return null;
};

export const resolveArgentinaZoneCoords = (...values: Array<string | null | undefined>): ZoneMatch | null => {
  const preset = resolveArgentinaZonePreset(...values);
  if (!preset) return null;

  return {
    label: preset.label,
    lat: preset.lat,
    lng: preset.lng,
  };
};

export const matchesArgentinaZoneQuery = (
  query: string | null | undefined,
  ...values: Array<string | null | undefined>
) => {
  const normalizedQuery = normalizeZoneText(query);
  if (!normalizedQuery) return true;

  const normalizedHaystack = buildNormalizedZoneText(...values);
  if (normalizedHaystack.includes(normalizedQuery)) {
    return true;
  }

  const queryPreset = resolveArgentinaZonePreset(query);
  if (!queryPreset) {
    return false;
  }

  const profilePreset = resolveArgentinaZonePreset(...values);
  if (!profilePreset) {
    return false;
  }

  if (queryPreset.scope === 'province') {
    return queryPreset.territory === profilePreset.territory;
  }

  return queryPreset.label === profilePreset.label;
};

export const getArgentinaZoneSearchOptions = () => {
  const labels = new Set<string>();
  for (const preset of ARGENTINA_ZONE_PRESETS) {
    labels.add(preset.label);
  }
  return [...labels].sort((a, b) => a.localeCompare(b, 'es'));
};
