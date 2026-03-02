const UUID_PATTERN =
  /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i;

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

export const extractProfileId = (segment: string) => {
  const value = String(segment || '').trim();
  const directMatch = value.match(UUID_PATTERN);
  return directMatch ? directMatch[1].toLowerCase() : '';
};

export const slugifyTechnicianName = (value: string) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'perfil-tecnico';
};

export const buildTechnicianPath = (profileId: string, displayName: string) => {
  const safeId = String(profileId || '').trim().toLowerCase();
  const slug = slugifyTechnicianName(displayName);
  return `/tecnico/${slug}-${safeId}`;
};
