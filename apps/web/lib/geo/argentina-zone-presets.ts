type ZonePreset = {
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
};

type ZoneMatch = {
  label: string;
  lat: number;
  lng: number;
};

const ARGENTINA_ZONE_PRESETS: ZonePreset[] = [
  { label: 'CABA', lat: -34.6037, lng: -58.3816, aliases: ['caba', 'capital federal', 'ciudad autonoma de buenos aires'] },
  { label: 'Buenos Aires', lat: -34.6037, lng: -58.3816, aliases: ['buenos aires', 'gran buenos aires', 'gba', 'amba', 'zona norte', 'zona sur', 'zona oeste'] },
  { label: 'La Plata', lat: -34.9215, lng: -57.9545, aliases: ['la plata'] },
  { label: 'Mar del Plata', lat: -38.0055, lng: -57.5426, aliases: ['mar del plata'] },
  { label: 'Bahia Blanca', lat: -38.7196, lng: -62.2724, aliases: ['bahia blanca'] },
  { label: 'Rosario', lat: -32.9442, lng: -60.6505, aliases: ['rosario'] },
  { label: 'Santa Fe', lat: -31.6333, lng: -60.7000, aliases: ['santa fe'] },
  { label: 'Parana', lat: -31.7319, lng: -60.5238, aliases: ['parana', 'entre rios'] },
  { label: 'Cordoba', lat: -31.4201, lng: -64.1888, aliases: ['cordoba', 'villa carlos paz', 'rio cuarto'] },
  { label: 'Mendoza', lat: -32.8895, lng: -68.8458, aliases: ['mendoza', 'san rafael'] },
  { label: 'San Juan', lat: -31.5375, lng: -68.5364, aliases: ['san juan'] },
  { label: 'San Luis', lat: -33.2950, lng: -66.3356, aliases: ['san luis'] },
  { label: 'Tucuman', lat: -26.8083, lng: -65.2176, aliases: ['tucuman', 'san miguel de tucuman'] },
  { label: 'Salta', lat: -24.7821, lng: -65.4232, aliases: ['salta'] },
  { label: 'Jujuy', lat: -24.1858, lng: -65.2995, aliases: ['jujuy', 'san salvador de jujuy'] },
  { label: 'Santiago del Estero', lat: -27.7951, lng: -64.2615, aliases: ['santiago del estero'] },
  { label: 'Catamarca', lat: -28.4696, lng: -65.7852, aliases: ['catamarca', 'san fernando del valle de catamarca'] },
  { label: 'La Rioja', lat: -29.4131, lng: -66.8558, aliases: ['la rioja'] },
  { label: 'Corrientes', lat: -27.4691, lng: -58.8306, aliases: ['corrientes'] },
  { label: 'Resistencia', lat: -27.4514, lng: -58.9867, aliases: ['resistencia', 'chaco'] },
  { label: 'Posadas', lat: -27.3621, lng: -55.9009, aliases: ['posadas', 'misiones'] },
  { label: 'Formosa', lat: -26.1775, lng: -58.1781, aliases: ['formosa'] },
  { label: 'Neuquen', lat: -38.9516, lng: -68.0591, aliases: ['neuquen'] },
  { label: 'Viedma', lat: -40.8135, lng: -62.9967, aliases: ['viedma', 'rio negro'] },
  { label: 'Bariloche', lat: -41.1335, lng: -71.3103, aliases: ['bariloche', 'san carlos de bariloche'] },
  { label: 'Comodoro Rivadavia', lat: -45.8641, lng: -67.4966, aliases: ['comodoro rivadavia', 'comodoro'] },
  { label: 'Trelew', lat: -43.2490, lng: -65.3094, aliases: ['trelew', 'chubut'] },
  { label: 'Rio Gallegos', lat: -51.6230, lng: -69.2168, aliases: ['rio gallegos', 'santa cruz'] },
  { label: 'Ushuaia', lat: -54.8019, lng: -68.3030, aliases: ['ushuaia', 'tierra del fuego'] },
  { label: 'Santa Rosa', lat: -36.6167, lng: -64.2833, aliases: ['santa rosa', 'la pampa'] },
];

const normalizeZoneText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const toFiniteCoordinate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const resolveArgentinaZoneCoords = (...values: Array<string | null | undefined>): ZoneMatch | null => {
  const normalized = values.map((value) => normalizeZoneText(value)).filter(Boolean).join(' ');
  if (!normalized) return null;

  for (const preset of ARGENTINA_ZONE_PRESETS) {
    if (preset.aliases.some((alias) => normalized.includes(normalizeZoneText(alias)))) {
      return {
        label: preset.label,
        lat: preset.lat,
        lng: preset.lng,
      };
    }
  }

  return null;
};
