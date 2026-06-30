import { normalizeCountryPreference } from './country-preference';
import { DEFAULT_COUNTRY_NAME } from './location-catalog';

export const ACTIVE_LABOR_COUNTRY = DEFAULT_COUNTRY_NAME;

type LaborCountrySettings = {
  country: string;
  currencyCode: string;
  locale: string;
  laborPricingAvailable: boolean;
  rubroCatalogAvailable: boolean;
  operationalLabel: string;
  pendingLabel: string;
};

const getNormalizedCountry = (country?: string | null) =>
  normalizeCountryPreference(country) || DEFAULT_COUNTRY_NAME;

export const getLaborCountrySettings = (country?: string | null): LaborCountrySettings => {
  const normalizedCountry = getNormalizedCountry(country);
  const isArgentina = normalizedCountry === ACTIVE_LABOR_COUNTRY;

  return {
    country: normalizedCountry,
    currencyCode: isArgentina ? 'ARS' : '',
    locale: isArgentina ? 'es-AR' : 'es',
    laborPricingAvailable: isArgentina,
    rubroCatalogAvailable: isArgentina,
    operationalLabel: `Operativo hoy: ${ACTIVE_LABOR_COUNTRY}`,
    pendingLabel: `Los valores de mano de obra para ${normalizedCountry} todavia no estan cargados.`,
  };
};

export const isLaborCountryActive = (country?: string | null) =>
  getLaborCountrySettings(country).laborPricingAvailable;

export const formatLaborCurrency = (value: number, country?: string | null) => {
  const settings = getLaborCountrySettings(country);
  if (!settings.laborPricingAvailable || !settings.currencyCode) return 'Pendiente';
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
};
