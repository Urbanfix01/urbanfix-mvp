export const DEFAULT_MATCH_RADIUS_KM = 20;
export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

export type WorkingHoursConfig = {
  weekdayFrom: string;
  weekdayTo: string;
  saturdayEnabled: boolean;
  saturdayFrom: string;
  saturdayTo: string;
  sundayEnabled: boolean;
  sundayFrom: string;
  sundayTo: string;
};

export const DEFAULT_WORKING_HOURS_CONFIG: WorkingHoursConfig = {
  weekdayFrom: '09:00',
  weekdayTo: '18:00',
  saturdayEnabled: false,
  saturdayFrom: '09:00',
  saturdayTo: '13:00',
  sundayEnabled: false,
  sundayFrom: '09:00',
  sundayTo: '13:00',
};

export const normalizeTimeValue = (value: string | null | undefined, fallback: string) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const normalizeTextForParsing = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const extractTimeRange = (value: string, pattern: RegExp): [string, string] | null => {
  const match = value.match(pattern);
  if (!match) return null;
  return [match[1], match[2]];
};

export const parseWorkingHoursConfig = (rawValue: string | null | undefined): WorkingHoursConfig => {
  const safe = (rawValue || '').trim();
  const base: WorkingHoursConfig = { ...DEFAULT_WORKING_HOURS_CONFIG };
  if (!safe) return base;

  try {
    const parsed = JSON.parse(safe);
    if (parsed && typeof parsed === 'object') {
      const weekday = (parsed as any).weekday || {};
      const saturday = (parsed as any).saturday || {};
      const sunday = (parsed as any).sunday || {};
      return {
        weekdayFrom: normalizeTimeValue(weekday.from, base.weekdayFrom),
        weekdayTo: normalizeTimeValue(weekday.to, base.weekdayTo),
        saturdayEnabled: Boolean(saturday.enabled),
        saturdayFrom: normalizeTimeValue(saturday.from, base.saturdayFrom),
        saturdayTo: normalizeTimeValue(saturday.to, base.saturdayTo),
        sundayEnabled: Boolean(sunday.enabled),
        sundayFrom: normalizeTimeValue(sunday.from, base.sundayFrom),
        sundayTo: normalizeTimeValue(sunday.to, base.sundayTo),
      };
    }
  } catch {
    // Legacy text payload.
  }

  const normalized = normalizeTextForParsing(safe);
  const weekdayRange =
    extractTimeRange(
      normalized,
      /lun(?:es)?\s*(?:a|-|al)\s*vie(?:rnes)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
    ) || extractTimeRange(normalized, /(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/);
  const saturdayRange = extractTimeRange(
    normalized,
    /sab(?:ado)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
  );
  const sundayRange = extractTimeRange(
    normalized,
    /dom(?:ingo)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
  );

  if (weekdayRange) {
    base.weekdayFrom = normalizeTimeValue(weekdayRange[0], base.weekdayFrom);
    base.weekdayTo = normalizeTimeValue(weekdayRange[1], base.weekdayTo);
  }
  if (saturdayRange) {
    base.saturdayEnabled = true;
    base.saturdayFrom = normalizeTimeValue(saturdayRange[0], base.saturdayFrom);
    base.saturdayTo = normalizeTimeValue(saturdayRange[1], base.saturdayTo);
  }
  if (sundayRange) {
    base.sundayEnabled = true;
    base.sundayFrom = normalizeTimeValue(sundayRange[0], base.sundayFrom);
    base.sundayTo = normalizeTimeValue(sundayRange[1], base.sundayTo);
  }

  return base;
};

export const formatWorkingHoursLabel = (config: WorkingHoursConfig) => {
  const chunks = [`Lun a Vie ${config.weekdayFrom} - ${config.weekdayTo}`];
  if (config.saturdayEnabled) {
    chunks.push(`Sab ${config.saturdayFrom} - ${config.saturdayTo}`);
  }
  if (config.sundayEnabled) {
    chunks.push(`Dom ${config.sundayFrom} - ${config.sundayTo}`);
  }
  return chunks.join(' | ');
};

const toMinutes = (time: string) => {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
};

export const isNowWithinWorkingHours = (
  config: WorkingHoursConfig,
  now = new Date(),
  timeZone = ARGENTINA_TIMEZONE
) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(now);

  const weekday = (parts.find((part) => part.type === 'weekday')?.value || '').toLowerCase();
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const currentMinutes = hour * 60 + minute;

  if (weekday.startsWith('sat')) {
    if (!config.saturdayEnabled) return false;
    return currentMinutes >= toMinutes(config.saturdayFrom) && currentMinutes <= toMinutes(config.saturdayTo);
  }
  if (weekday.startsWith('sun')) {
    if (!config.sundayEnabled) return false;
    return currentMinutes >= toMinutes(config.sundayFrom) && currentMinutes <= toMinutes(config.sundayTo);
  }
  return currentMinutes >= toMinutes(config.weekdayFrom) && currentMinutes <= toMinutes(config.weekdayTo);
};

export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const geocodeFirstResult = async (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}&addressdetails=1&email=info@urbanfixar.com`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'UrbanFix/1.0 (info@urbanfixar.com)',
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const first = rows[0];
  if (!first) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    displayName: first.display_name || trimmed,
  };
};

export const parseUrgencyWeight = (urgency: string | null | undefined) => {
  const value = String(urgency || '').toLowerCase();
  if (value === 'alta') return 15;
  if (value === 'media') return 8;
  return 2;
};

export const toFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};
