import type { MapPoint } from '../types/maps';
import { mapCoordinate, mapRegionForPoints } from './mapGeometry';
import { isApproved, isClosed, isPending } from './status';

type WorkLocation = { location_lat?: unknown; location_lng?: unknown; location_address?: string | null; address?: string | null };
type QuoteMapJob = WorkLocation & {
  id: string; created_at: string; status?: string | null; client_name?: string | null;
  total_amount?: number | null; archived_at?: string | null; deleted_at?: string | null;
};
const workAddress = (job: WorkLocation) => job.location_address?.trim() || job.address?.trim() || '';

export function quoteMapData(jobs: readonly QuoteMapJob[], now = new Date()) {
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3);
  const points: MapPoint[] = [];
  let missingLocationCount = 0;
  for (const job of jobs) {
    const created = new Date(job.created_at);
    if (job.archived_at || job.deleted_at || !Number.isFinite(created.getTime()) || created < cutoff) continue;
    const status = isClosed(job.status) ? { key: 'closed', label: 'Cerrado', color: '#059669' }
      : isApproved(job.status) ? { key: 'approved', label: 'Aprobado', color: '#10B981' }
      : isPending(job.status) ? { key: 'pending', label: 'Presupuestado', color: '#F59E0B' } : null;
    if (!status) continue;
    const coordinate = mapCoordinate(job.location_lat, job.location_lng);
    if (!coordinate) { missingLocationCount++; continue; }
    points.push({ id: job.id, title: job.client_name || `Presupuesto #${job.id.slice(0, 4).toUpperCase()}`,
      amount: job.total_amount || 0, address: workAddress(job), createdAt: job.created_at, ...coordinate, status });
  }
  return { points, missingLocationCount, region: mapRegionForPoints(points) };
}

export function quoteWorkMapLinks(job: WorkLocation) {
  const coordinate = mapCoordinate(job.location_lat, job.location_lng);
  const address = workAddress(job);
  if (!coordinate && !address) return null;
  const query = coordinate ? `${coordinate.lat},${coordinate.lng}` : encodeURIComponent(address);
  return { embedUrl: `https://maps.google.com/maps?q=${query}&t=m&z=15&output=embed&iwloc=near`,
    externalUrl: `https://www.google.com/maps/search/?api=1&query=${query}` };
}
