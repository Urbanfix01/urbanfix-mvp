import type { MasterItem } from '../types/database';

export type CalculatorUnit = 'm2' | 'm3';

type MasterItemLike = Pick<MasterItem, 'name' | 'technical_notes' | 'category' | 'source_ref' | 'unit'>;

const EXPLICIT_M3_PATTERNS = [
  'm3',
  'por m3',
  'metro cubico',
  'metros cubicos',
  'unidad de referencia m3',
];

const EXPLICIT_M2_PATTERNS = [
  'm2',
  'por m2',
  'metro cuadrado',
  'metros cuadrados',
  'unidad de referencia m2',
];

const M3_NAME_HINTS = [
  'pozo ciego',
  'biodigestor',
  'lecho de infiltracion',
  'zanjeo',
  'hormigon de cascotes',
  'hormigon alivianado',
  'hormigon armado',
  'bases h a',
  'columnas h a',
  'encadenado h a',
  'escalera h a',
  'losa h a',
  'movimiento de suelo',
  'relleno',
];

const M2_NAME_HINTS = [
  'cielorraso',
  'cubierta',
  'mamposter',
  'revoque',
  'azotado',
  'grueso',
  'fino',
  'estucado',
  'premezclado',
  'pintur',
  'latex',
  'membrana',
  'aislacion',
  'tejas',
  'chapas',
  'contrapiso',
  'carpeta',
  'pisos',
  'solado',
  'solados',
  'revest',
  'yeso',
  'yeseria',
  'durlock',
  'impermeable',
  'azotea',
  'baldosa',
  'porcelanato',
];

const M2_EXCLUDED_HINTS = [
  'pase de losa',
  'ventilador de techo',
  'cable subterraneo en piso',
  'adicional por caja de paso piso',
  'instalacion de banera',
  'instalacion caneria',
  'caneria desague',
];

const normalizeSearchValue = (value: string | null | undefined) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const canonicalizeMasterItemUnit = (value: string | null | undefined) => {
  const normalized = normalizeSearchValue(String(value || '').replace(/\u00B2/g, '2').replace(/\u00B3/g, '3'));
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

export const formatMasterItemUnitLabel = (value: string | null | undefined) => canonicalizeMasterItemUnit(value) || '';

const hasPattern = (value: string, patterns: string[]) => patterns.some((pattern) => value.includes(pattern));

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

export const inferCalculatorUnit = (item: MasterItemLike): CalculatorUnit | null => {
  const explicitUnit = canonicalizeMasterItemUnit(item.unit);
  if (explicitUnit === 'm2') return 'm2';
  if (explicitUnit === 'm3') return 'm3';

  const combinedText = normalizeSearchValue(
    `${item.name || ''} ${item.technical_notes || ''} ${item.category || ''} ${item.source_ref || ''}`
  );
  const nameContext = normalizeSearchValue(`${item.name || ''} ${item.category || ''} ${item.source_ref || ''}`);

  if (!combinedText) return null;
  if (hasPattern(combinedText, EXPLICIT_M3_PATTERNS)) return 'm3';
  if (hasPattern(combinedText, EXPLICIT_M2_PATTERNS)) return 'm2';
  if (hasPattern(nameContext, M3_NAME_HINTS)) return 'm3';
  if (hasPattern(nameContext, M2_EXCLUDED_HINTS)) return null;
  if (hasPattern(nameContext, M2_NAME_HINTS)) return 'm2';
  return null;
};

export const buildMasterItemChoiceLabel = (
  item: MasterItemLike,
  options?: { maxTechnicalLength?: number }
) => {
  const name = String(item?.name || '').trim();
  const technicalNotes = compactTechnicalNotesText(item?.technical_notes, {
    maxLength: options?.maxTechnicalLength,
  });

  if (!name) return technicalNotes;
  return technicalNotes ? `${name} | ${technicalNotes}` : name;
};

export const buildMasterItemSearchIndex = (item: MasterItemLike) =>
  normalizeSearchValue(
    `${item.name || ''} ${item.technical_notes || ''} ${item.category || ''} ${item.source_ref || ''} ${
      canonicalizeMasterItemUnit(item.unit) || item.unit || ''
    }`
  );

export const formatMasterItemSourceLabel = (item: Pick<MasterItem, 'category' | 'source_ref'>) => {
  const raw = String(item?.source_ref || item?.category || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) return 'Base UrbanFix';
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};
