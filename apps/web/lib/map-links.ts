type MapLinkInput = {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  label?: string | null;
};

export type MapLinks = {
  query: string;
  googleMapsHref: string;
  appleMapsHref: string;
};

const toText = (value: unknown) => String(value || '').trim();

const toFiniteCoordinate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const composeMapQuery = (input: MapLinkInput) =>
  [input.address, input.city, input.province, input.country || 'Argentina']
    .map(toText)
    .filter(Boolean)
    .join(', ');

export const buildMapLinks = (input: MapLinkInput): MapLinks | null => {
  const lat = toFiniteCoordinate(input.lat);
  const lng = toFiniteCoordinate(input.lng);
  const fallbackQuery = composeMapQuery(input);
  const label = toText(input.label) || fallbackQuery;
  const coordinateQuery = lat !== null && lng !== null ? `${lat.toFixed(6)},${lng.toFixed(6)}` : '';
  const query = coordinateQuery || fallbackQuery;
  if (!query) return null;

  const appleParams = new URLSearchParams();
  if (coordinateQuery) {
    appleParams.set('ll', coordinateQuery);
    if (label) appleParams.set('q', label);
  } else {
    appleParams.set('address', query);
  }

  return {
    query,
    googleMapsHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    appleMapsHref: `https://maps.apple.com/?${appleParams.toString()}`,
  };
};

export const buildOpenStreetMapEmbedUrl = (lat: number, lng: number, zoomDelta = 0.004) => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return '';
  const delta = Math.max(0.001, Math.min(0.05, zoomDelta));
  const left = safeLng - delta;
  const right = safeLng + delta;
  const bottom = safeLat - delta;
  const top = safeLat + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${safeLat}%2C${safeLng}`;
};
