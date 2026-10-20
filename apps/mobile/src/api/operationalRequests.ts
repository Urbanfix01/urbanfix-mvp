import type { NearbyRequest, NearbyRequestsPayload } from './marketplace';
import { mapCoordinate } from '../utils/mapGeometry';

type Row = Record<string, any>;
const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) ? Number(value) : null;
const activeStatuses = new Set(['published', 'matched', 'quoted', 'direct_sent', 'selected', 'scheduled', 'in_progress']);

export function operationalRequests(payload: Row, owner: string, profile: Row | null = null): NearbyRequestsPayload {
  if (payload?.ok !== true || !Array.isArray(payload.requests) || !Array.isArray(payload.matches) || payload.supabase_user_id !== owner) throw new Error('El servidor no devolvio solicitudes compatibles con tu cuenta.');
  const matches = new Map<string, Row>();
  for (const match of payload.matches) {
    if (!match || (match.technician_id || match.technician_user_id) !== owner || typeof match.request_id !== 'string') continue;
    const previous = matches.get(match.request_id);
    if (!previous || text(match.updated_at || match.created_at) > text(previous.updated_at || previous.created_at)) matches.set(match.request_id, match);
  }
  const ids = new Set<string>(), requests: NearbyRequest[] = [];
  for (const row of payload.requests) {
    if (!row || typeof row.id !== 'string' || ids.has(row.id) || !activeStatuses.has(row.status)) continue;
    const direct = row.mode === 'direct';
    if (direct && row.target_technician_id !== owner && row.assigned_technician_id !== owner) continue;
    ids.add(row.id);
    // Exact coordinates are used only when already returned by the authorized API.
    const exact = mapCoordinate(row.location_lat, row.location_lng), publicPoint = mapCoordinate(row.public_lat, row.public_lng), point = exact || publicPoint;
    const match = matches.get(row.id);
    requests.push({ id: row.id, title: text(row.title) || 'Solicitud sin titulo', category: text(row.category), address: text(row.address), city: text(row.city),
      description: text(row.description), urgency: ['alta', 'media', 'baja'].includes(row.urgency) ? row.urgency : 'media', preferred_window: text(row.preferred_window) || null,
      status: row.status, mode: direct ? 'direct' : 'marketplace', created_at: text(row.created_at || row.created_date),
      distance_km: null, match_radius_km: number(row.radius_km), location_lat: point?.lat ?? null, location_lng: point?.lng ?? null,
      location_precision: exact ? 'exact' : publicPoint ? 'approx' : 'missing',
      photo_urls: Array.isArray(row.photo_urls) ? row.photo_urls.filter((url: unknown) => typeof url === 'string' && url.startsWith('https://')).slice(0, 8) : [],
      my_quote_status: match?.quote_status || null, my_response_type: match?.response_type || null, my_response_message: text(match?.response_message) || null,
      my_visit_eta_hours: number(match?.visit_eta_hours), my_price_ars: number(match?.price_ars), my_eta_hours: number(match?.eta_hours), my_quote_updated_at: text(match?.updated_at) || null });
  }
  const center = mapCoordinate(profile?.service_lat, profile?.service_lng);
  return { requests, technician: { radius_km: number(profile?.service_radius_km), within_working_hours: null, working_hours_label: '', service_lat: center?.lat ?? null, service_lng: center?.lng ?? null },
    warning: payload.partial ? 'La consulta esta incompleta. Reintenta actualizar; algunas solicitudes pueden faltar.' : undefined };
}
