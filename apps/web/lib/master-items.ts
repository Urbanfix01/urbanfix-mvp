type MasterItemDisplayInput = {
  name?: string | null;
  technical_notes?: string | null;
  technicalNotes?: string | null;
  unit?: string | null;
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
  const unit = String(item?.unit || '').trim();
  const technicalNotes = compactTechnicalNotesText(item?.technical_notes || item?.technicalNotes, {
    maxLength: options?.maxTechnicalLength,
  });
  const suffix = [unit, technicalNotes].filter(Boolean).join(' | ');

  if (!name) return suffix;
  return suffix ? `${name} | ${suffix}` : name;
};
