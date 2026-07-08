export type PublicProfileVisibilityInput = {
  access_granted?: boolean | null;
  profile_published?: boolean | null;
  full_name?: string | null;
  business_name?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  company_address?: string | null;
  coverage_area?: string | null;
  service_city?: string | null;
  service_province?: string | null;
  service_district?: string | null;
  service_lat?: number | string | null;
  service_lng?: number | string | null;
  specialties?: string | null;
};

const toText = (value: unknown) => String(value || '').trim();

const normalizeText = (value: unknown) =>
  toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseDelimitedValues = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const toFiniteLocationNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isProfilePublished = (value: boolean | null | undefined) => value !== false;

export const hasMeaningfulCoverageArea = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return !normalized.includes('tu ciudad base') && !normalized.includes('zona sin ciudad');
};

export const hasPublicName = (profile: PublicProfileVisibilityInput) =>
  Boolean(toText(profile.business_name) || toText(profile.full_name));

export const hasPublicContact = (profile: PublicProfileVisibilityInput) =>
  toText(profile.phone).replace(/\D/g, '').length >= 8;

export const hasPublicExactLocation = (profile: PublicProfileVisibilityInput) =>
  toFiniteLocationNumber(profile.service_lat) !== null && toFiniteLocationNumber(profile.service_lng) !== null;

export const hasPublicWorkZone = (profile: PublicProfileVisibilityInput) =>
  Boolean(
    toText(profile.service_city) ||
      toText(profile.city) ||
      toText(profile.service_district) ||
      toText(profile.service_province) ||
      toText(profile.country) ||
      toText(profile.address) ||
      toText(profile.company_address) ||
      hasMeaningfulCoverageArea(profile.coverage_area)
  );

export const hasPublicSpecialty = (profile: PublicProfileVisibilityInput) =>
  parseDelimitedValues(profile.specialties).some((item) => {
    const normalized = normalizeText(item);
    return normalized && normalized !== 'general' && normalized !== 'servicios generales';
  });

export const getPublicProfileMissingLabels = (profile: PublicProfileVisibilityInput) => {
  const missing: string[] = [];
  if (!hasPublicName(profile)) missing.push('nombre o negocio');
  if (!hasPublicContact(profile)) missing.push('WhatsApp');
  if (!hasPublicSpecialty(profile)) missing.push('rubro');
  if (!hasPublicWorkZone(profile)) missing.push('zona de trabajo');
  if (!hasPublicExactLocation(profile)) missing.push('ubicacion exacta');
  return missing;
};

export const isPublicProfileVisible = (profile: PublicProfileVisibilityInput) =>
  profile.access_granted === true &&
  isProfilePublished(profile.profile_published) &&
  getPublicProfileMissingLabels(profile).length === 0;
