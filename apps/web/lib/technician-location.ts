/**
 * Funciones auxiliares para manejo de ubicación de técnicos
 */

import {
  DEFAULT_COUNTRY_NAME,
  inferCountryFromCandidates,
  isCoordinateWithinCountry,
} from './location-catalog';

export interface TechnicianLocation {
  serviceLat: number | null;
  serviceLng: number | null;
  locationDisplayName: string;
  locationPrecision: 'exact' | 'approx';
}

/**
 * Convierte LocationPickerResult a formato de BD
 */
export const buildTechnicianLocation = (result: {
  lat: number;
  lng: number;
  displayName: string;
  precision: 'exact' | 'approx';
} | null): TechnicianLocation => {
  if (!result) {
    return {
      serviceLat: null,
      serviceLng: null,
      locationDisplayName: '',
      locationPrecision: 'approx',
    };
  }

  return {
    serviceLat: result.lat,
    serviceLng: result.lng,
    locationDisplayName: result.displayName,
    locationPrecision: result.precision,
  };
};

/**
 * Reconstruye LocationPickerResult desde BD
 */
export const parseTechnicianLocation = (profile: any): {
  lat: number;
  lng: number;
  displayName: string;
  isValid: boolean;
  precision: 'exact' | 'approx';
} | null => {
  const lat = Number(profile?.service_lat);
  const lng = Number(profile?.service_lng);
  const country = inferCountryFromCandidates(
    profile?.country,
    profile?.service_location_name,
    profile?.company_address,
    profile?.address
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (!isValidCountryCoordinate(lat, lng, country)) {
    return null;
  }

  return {
    lat,
    lng,
    displayName: String(profile?.service_location_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`),
    isValid: true,
    precision: String(profile?.service_location_precision || 'approx') === 'exact' ? 'exact' : 'approx',
  };
};

/**
 * Valida que la ubicación esté dentro del país soportado
 */
export const isValidCountryCoordinate = (
  lat: number,
  lng: number,
  countryName: string = DEFAULT_COUNTRY_NAME
): boolean => isCoordinateWithinCountry(lat, lng, countryName);

/**
 * Geocodifica una dirección a coordenadas
 */
export const geocodeAddressToCoordinates = async (query: string, countryName: string = DEFAULT_COUNTRY_NAME) => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      trimmed
    )}&addressdetails=1&email=info@urbanfixar.com`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;

    const data = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
    }>;

    const first = data[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    if (!isValidCountryCoordinate(lat, lng, countryName)) {
      return null;
    }

    return {
      lat,
      lng,
      displayName: first.display_name,
      isValid: true,
      precision: 'approx' as const,
    };
  } catch {
    return null;
  }
};
