type MasterItemDisplayInput = {
  name?: string | null;
  technical_notes?: string | null;
  technicalNotes?: string | null;
  unit?: string | null;
};

const normalizeUnitToken = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00B2/g, '2')
    .replace(/\u00B3/g, '3')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const canonicalizeMasterItemUnit = (value: string | null | undefined) => {
  const normalized = normalizeUnitToken(value);
  if (!normalized) return null;

  if (['m2', 'mt2', 'metro cuadrado', 'metros cuadrados', 'por m2'].includes(normalized)) return 'm2';
  if (['m3', 'mt3', 'metro cubico', 'metros cubicos', 'por m3'].includes(normalized)) return 'm3';
  if (['ml', 'm lineal', 'metro lineal', 'metros lineales'].includes(normalized)) return 'ml';
  if (['m', 'metro', 'metros'].includes(normalized)) return 'metro';
  if (['u', 'un', 'unid', 'unidad', 'unidades'].includes(normalized)) return 'unidad';
  if (['boca', 'bocas'].includes(normalized)) return 'boca';
  if (['hora', 'horas'].includes(normalized)) return 'hora';
  if (['jornada', 'jornadas'].includes(normalized)) return 'jornada';
  if (['dia', 'dias'].includes(normalized)) return 'dia';
  if (['global'].includes(normalized)) return 'global';
  if (['kg', 'kilo', 'kilos'].includes(normalized)) return 'kg';
  if (['jgo', 'juego', 'juegos'].includes(normalized)) return 'juego';
  if (['union', 'uniones'].includes(normalized)) return 'union';
  if (['par', 'pares'].includes(normalized)) return 'par';

  return normalized;
};

export const formatMasterItemUnitLabel = (value: string | null | undefined) => {
  const canonical = canonicalizeMasterItemUnit(value);
  if (!canonical) return '';
  return canonical;
};

export const normalizeTechnicalNotesText = (value: string | null | undefined) =>
  String(value || '').replace(/\r/g, '').trim();

export const compactTechnicalNotesText = (
  value: string | null | undefined,
  options?: { maxLength?: number }
) => {
  const compacted = normalizeTechnicalNotesText(value)
    .replace(/\s*\n+\s*/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const maxLength = options?.maxLength || 0;
  if (!maxLength || compacted.length <= maxLength) return compacted;
  return `${compacted.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

export const buildMasterItemChoiceLabel = (
  item: MasterItemDisplayInput,
  options?: { maxTechnicalLength?: number }
) => {
  const name = String(item?.name || '').trim();
  const unit = formatMasterItemUnitLabel(item?.unit);
  const technicalNotes = compactTechnicalNotesText(item?.technical_notes || item?.technicalNotes, {
    maxLength: options?.maxTechnicalLength,
  });
  const suffix = [unit, technicalNotes].filter(Boolean).join(' | ');

  if (!name) return suffix;
  return suffix ? `${name} | ${suffix}` : name;
};
