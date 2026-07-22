import { GLOBAL_COUNTRY_OPTIONS } from './global-country-options';
import { GLOBAL_PROVINCE_OPTIONS_BY_CODE } from './global-province-options';

export type CountryBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type SupportedCountryConfig = {
  name: string;
  code: string;
  provinceLabel: string;
  timeZone: string;
  bounds: CountryBounds;
  aliases?: string[];
  provinces: string[];
};

const normalizeLocationText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const DEFAULT_COUNTRY_NAME = 'Argentina';

const WORLD_BOUNDS: CountryBounds = { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };

const GLOBAL_COUNTRY_OPTIONS_BY_NORMALIZED = new Map(
  GLOBAL_COUNTRY_OPTIONS.map((country) => [normalizeLocationText(country.name), country])
);

export const SUPPORTED_COUNTRIES: SupportedCountryConfig[] = [
  {
    name: 'Argentina',
    code: 'ar',
    provinceLabel: 'Provincia',
    timeZone: 'America/Argentina/Buenos_Aires',
    bounds: { minLat: -55.5, maxLat: -21.78, minLng: -73.56, maxLng: -53.64 },
    aliases: ['republica argentina'],
    provinces: [
      'Buenos Aires',
      'Ciudad Autonoma de Buenos Aires',
      'Catamarca',
      'Chaco',
      'Chubut',
      'Cordoba',
      'Corrientes',
      'Entre Rios',
      'Formosa',
      'Jujuy',
      'La Pampa',
      'La Rioja',
      'Mendoza',
      'Misiones',
      'Neuquen',
      'Rio Negro',
      'Salta',
      'San Juan',
      'San Luis',
      'Santa Cruz',
      'Santa Fe',
      'Santiago del Estero',
      'Tierra del Fuego',
      'Tucuman',
    ],
  },
  {
    name: 'Uruguay',
    code: 'uy',
    provinceLabel: 'Departamento',
    timeZone: 'America/Montevideo',
    bounds: { minLat: -35.03, maxLat: -30.08, minLng: -58.44, maxLng: -53.07 },
    aliases: ['republica oriental del uruguay'],
    provinces: [
      'Artigas',
      'Canelones',
      'Cerro Largo',
      'Colonia',
      'Durazno',
      'Flores',
      'Florida',
      'Lavalleja',
      'Maldonado',
      'Montevideo',
      'Paysandu',
      'Rio Negro',
      'Rivera',
      'Rocha',
      'Salto',
      'San Jose',
      'Soriano',
      'Tacuarembo',
      'Treinta y Tres',
    ],
  },
  {
    name: 'Chile',
    code: 'cl',
    provinceLabel: 'Region',
    timeZone: 'America/Santiago',
    bounds: { minLat: -56.0, maxLat: -17.5, minLng: -75.0, maxLng: -66.3 },
    aliases: ['republica de chile'],
    provinces: [
      'Arica y Parinacota',
      'Tarapaca',
      'Antofagasta',
      'Atacama',
      'Coquimbo',
      'Valparaiso',
      'Metropolitana de Santiago',
      'Libertador General Bernardo O Higgins',
      'Maule',
      'Nuble',
      'Biobio',
      'La Araucania',
      'Los Rios',
      'Los Lagos',
      'Aysen',
      'Magallanes y de la Antartica Chilena',
    ],
  },
  {
    name: 'Paraguay',
    code: 'py',
    provinceLabel: 'Departamento',
    timeZone: 'America/Asuncion',
    bounds: { minLat: -27.6, maxLat: -19.2, minLng: -62.65, maxLng: -54.25 },
    aliases: ['republica del paraguay'],
    provinces: [
      'Alto Paraguay',
      'Alto Parana',
      'Amambay',
      'Asuncion',
      'Boqueron',
      'Caaguazu',
      'Caazapa',
      'Canindeyu',
      'Central',
      'Concepcion',
      'Cordillera',
      'Guaira',
      'Itapua',
      'Misiones',
      'Neembucu',
      'Paraguari',
      'Presidente Hayes',
      'San Pedro',
    ],
  },
  {
    name: 'Bolivia',
    code: 'bo',
    provinceLabel: 'Departamento',
    timeZone: 'America/La_Paz',
    bounds: { minLat: -22.9, maxLat: -9.6, minLng: -69.7, maxLng: -57.45 },
    aliases: ['estado plurinacional de bolivia'],
    provinces: ['Chuquisaca', 'Cochabamba', 'Beni', 'La Paz', 'Oruro', 'Pando', 'Potosi', 'Santa Cruz', 'Tarija'],
  },
  {
    name: 'Brasil',
    code: 'br',
    provinceLabel: 'Estado',
    timeZone: 'America/Sao_Paulo',
    bounds: { minLat: -33.8, maxLat: 5.3, minLng: -74.1, maxLng: -28.6 },
    aliases: ['brasil', 'brazil', 'republica federativa do brasil'],
    provinces: [
      'Acre',
      'Alagoas',
      'Amapa',
      'Amazonas',
      'Bahia',
      'Ceara',
      'Distrito Federal',
      'Espirito Santo',
      'Goias',
      'Maranhao',
      'Mato Grosso',
      'Mato Grosso do Sul',
      'Minas Gerais',
      'Para',
      'Paraiba',
      'Parana',
      'Pernambuco',
      'Piaui',
      'Rio de Janeiro',
      'Rio Grande do Norte',
      'Rio Grande do Sul',
      'Rondonia',
      'Roraima',
      'Santa Catarina',
      'Sao Paulo',
      'Sergipe',
      'Tocantins',
    ],
  },
  {
    name: 'Peru',
    code: 'pe',
    provinceLabel: 'Departamento',
    timeZone: 'America/Lima',
    bounds: { minLat: -18.5, maxLat: 0.2, minLng: -81.4, maxLng: -68.5 },
    aliases: ['republica del peru'],
    provinces: [
      'Amazonas',
      'Ancash',
      'Apurimac',
      'Arequipa',
      'Ayacucho',
      'Cajamarca',
      'Callao',
      'Cusco',
      'Huancavelica',
      'Huanuco',
      'Ica',
      'Junin',
      'La Libertad',
      'Lambayeque',
      'Lima',
      'Loreto',
      'Madre de Dios',
      'Moquegua',
      'Pasco',
      'Piura',
      'Puno',
      'San Martin',
      'Tacna',
      'Tumbes',
      'Ucayali',
    ],
  },
];

export const COUNTRY_NAMES = Array.from(
  new Set([...SUPPORTED_COUNTRIES.map((country) => country.name), ...GLOBAL_COUNTRY_OPTIONS.map((country) => country.name)])
);

const COUNTRY_PROVINCE_ALIASES: Record<string, Record<string, string[]>> = {
  Argentina: {
    'Ciudad Autonoma de Buenos Aires': ['ciudad autonoma de buenos aires', 'capital federal', 'caba'],
    'Buenos Aires': ['provincia de buenos aires', 'buenos aires'],
  },
};

export const getCountryConfig = (countryName?: string | null) => {
  const defaultCountry =
    SUPPORTED_COUNTRIES.find((country) => country.name === DEFAULT_COUNTRY_NAME) || SUPPORTED_COUNTRIES[0];
  const normalizedCountry = normalizeLocationText(countryName || '');

  if (!normalizedCountry) {
    return defaultCountry;
  }

  const supportedCountry = SUPPORTED_COUNTRIES.find((country) => {
    const aliases = [country.name, ...(country.aliases || [])].map((value) => normalizeLocationText(value));
    return aliases.includes(normalizedCountry);
  });

  if (supportedCountry) {
    return supportedCountry;
  }

  const globalCountry = GLOBAL_COUNTRY_OPTIONS_BY_NORMALIZED.get(normalizedCountry);

  if (globalCountry) {
    const countryCode = globalCountry.code.toUpperCase();
    return {
      name: globalCountry.name,
      code: globalCountry.code.toLowerCase(),
      provinceLabel: 'Provincia / estado',
      timeZone: 'UTC',
      bounds: WORLD_BOUNDS,
      provinces: GLOBAL_PROVINCE_OPTIONS_BY_CODE[countryCode] || [],
    };
  }

  return defaultCountry;
};

export const getProvinceOptions = (countryName?: string | null) => getCountryConfig(countryName).provinces;

export const getProvinceLabel = (countryName?: string | null) => getCountryConfig(countryName).provinceLabel;

export const getCountryCode = (countryName?: string | null) => getCountryConfig(countryName).code;

export const hasProvinceCatalogForCountry = (countryName?: string | null) => {
  const country = getCountryConfig(countryName);
  const supportedCountryHasCatalog = SUPPORTED_COUNTRIES.some((supportedCountry) => supportedCountry.code === country.code);
  return supportedCountryHasCatalog || Object.prototype.hasOwnProperty.call(GLOBAL_PROVINCE_OPTIONS_BY_CODE, country.code.toUpperCase());
};
export const getCountryTimeZone = (countryName?: string | null) => getCountryConfig(countryName).timeZone;

export const inferCountryFromCandidates = (...candidates: Array<string | null | undefined>) => {
  const normalizedCandidates = candidates.map((candidate) => normalizeLocationText(String(candidate || '')));
  for (const country of SUPPORTED_COUNTRIES) {
    const aliases = [country.name, ...(country.aliases || [])].map((value) => normalizeLocationText(value));
    if (normalizedCandidates.some((candidate) => aliases.some((alias) => candidate.includes(alias)))) {
      return country.name;
    }
  }

  for (const country of GLOBAL_COUNTRY_OPTIONS) {
    const normalizedCountry = normalizeLocationText(country.name);
    if (normalizedCandidates.some((candidate) => candidate.includes(normalizedCountry))) {
      return country.name;
    }
  }

  return DEFAULT_COUNTRY_NAME;
};

export const extractProvinceHintForCountry = (
  countryName: string | null | undefined,
  ...candidates: Array<string | null | undefined>
) => {
  const country = getCountryConfig(countryName);
  const aliasesByProvince = COUNTRY_PROVINCE_ALIASES[country.name] || {};
  const normalizedCandidates = candidates.map((candidate) => normalizeLocationText(String(candidate || '')));

  for (const province of country.provinces) {
    const aliases = [province, ...(aliasesByProvince[province] || [])].map((value) => normalizeLocationText(value));
    if (normalizedCandidates.some((candidate) => aliases.some((alias) => candidate.includes(alias)))) {
      return province;
    }
  }

  return '';
};

export const isKnownProvinceName = (value: string) => {
  const normalizedValue = normalizeLocationText(value);
  return SUPPORTED_COUNTRIES.some((country) => {
    const aliasesByProvince = COUNTRY_PROVINCE_ALIASES[country.name] || {};
    return country.provinces.some((province) => {
      const aliases = [province, ...(aliasesByProvince[province] || [])].map((item) => normalizeLocationText(item));
      return aliases.includes(normalizedValue);
    });
  });
};

export const isCoordinateWithinCountry = (lat: number, lng: number, countryName?: string | null) => {
  const bounds = getCountryConfig(countryName).bounds;
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
};

export const isCoordinateWithinSupportedCountries = (lat: number, lng: number) =>
  SUPPORTED_COUNTRIES.some((country) => isCoordinateWithinCountry(lat, lng, country.name));