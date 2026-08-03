'use client';

import { useEffect } from 'react';
import { trackFunnelEvent } from '../../lib/analytics';

type VidrieraSearchAnalyticsProps = {
  zone: string;
  guild: string;
  specialty: string;
  availability: string;
  resultCount: number;
  zoneResultCount: number;
};

const trackedSearches = new Set<string>();

const cleanValue = (value: string) => String(value || '').trim().slice(0, 180);

export default function VidrieraSearchAnalytics({
  zone,
  guild,
  specialty,
  availability,
  resultCount,
  zoneResultCount,
}: VidrieraSearchAnalyticsProps) {
  useEffect(() => {
    const normalizedZone = cleanValue(zone);
    const normalizedGuild = cleanValue(guild);
    const normalizedSpecialty = cleanValue(specialty);
    const normalizedAvailability = cleanValue(availability);
    if (!normalizedZone && !normalizedGuild && !normalizedSpecialty && !normalizedAvailability) return;

    const safeResultCount = Number.isFinite(resultCount) ? Math.max(0, resultCount) : 0;
    const safeZoneResultCount = Number.isFinite(zoneResultCount)
      ? Math.max(0, zoneResultCount)
      : 0;
    const searchKey = [
      normalizedZone.toLocaleLowerCase('es'),
      normalizedGuild.toLocaleLowerCase('es'),
      normalizedSpecialty.toLocaleLowerCase('es'),
      normalizedAvailability.toLocaleLowerCase('es'),
      safeResultCount,
      safeZoneResultCount,
    ].join('|');

    if (trackedSearches.has(searchKey)) return;
    trackedSearches.add(searchKey);

    trackFunnelEvent('marketplace_search_performed', {
      zone: normalizedZone,
      guild: normalizedGuild,
      specialty: normalizedSpecialty,
      availability: normalizedAvailability,
      result_count: safeResultCount,
      zone_result_count: safeZoneResultCount,
      has_results: safeResultCount > 0,
    });
  }, [availability, guild, resultCount, specialty, zone, zoneResultCount]);

  return null;
}
