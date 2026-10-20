import type { MapPoint, MapRegion } from '../types/maps';

export function mapCoordinate(latValue: unknown, lngValue: unknown): { lat: number; lng: number } | null {
  const number = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  const lat = number(latValue), lng = number(lngValue);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
}
export const DEFAULT_MAP_REGION: MapRegion = { latitude: -34.6037, longitude: -58.3816, latitudeDelta: .32, longitudeDelta: .32 };
export function mapRegionForPoints(points: MapPoint[], center?: { lat: number; lng: number } | null): MapRegion {
  if (!points.length) return center ? { latitude: center.lat, longitude: center.lng, latitudeDelta: .2, longitudeDelta: .2 } : DEFAULT_MAP_REGION;
  const lats = points.map((point) => point.lat), lngs = points.map((point) => point.lng);
  return { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max(.02, (Math.max(...lats) - Math.min(...lats)) * 1.4), longitudeDelta: Math.max(.02, (Math.max(...lngs) - Math.min(...lngs)) * 1.4) };
}
