import * as XLSX from 'xlsx';

export const INDEC_LABOR_INDEX_URL =
  'https://www.indec.gob.ar/ftp/cuadros/economia/icc_variaciones_indices_2016.xls';

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

type RawPoint = {
  year: number;
  monthIndex: number;
  monthLabel: string;
  periodLabel: string;
  provisional: boolean;
  value: number;
};

export type IndecLaborIndex = {
  sourceLabel: string;
  sourceUrl: string;
  downloadUrl: string;
  seriesLabel: string;
  periodLabel: string;
  previousPeriodLabel: string;
  publishedAtLabel: string;
  latestIndex: number;
  previousIndex: number;
  monthlyPercent: number;
  multiplier: number;
  provisional: boolean;
};

const normalizeText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseYear = (value: unknown) => {
  const match = String(value || '').match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
};

const parseMonth = (value: unknown) => {
  const raw = String(value || '').trim();
  const normalized = normalizeText(raw.replace('*', ''));
  const monthIndex = MONTHS.indexOf(normalized);
  if (monthIndex < 0) return null;
  const label = MONTHS[monthIndex].replace(/^./, (letter) => letter.toUpperCase());
  return {
    label,
    monthIndex,
    provisional: raw.includes('*'),
  };
};

const findHeaderRows = (rows: unknown[][]) => {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length - 1, 12); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const nextRow = rows[rowIndex + 1] || [];
    const yearCount = row.filter((cell) => parseYear(cell)).length;
    const monthCount = nextRow.filter((cell) => parseMonth(cell)).length;
    if (yearCount >= 2 && monthCount >= 6) {
      return { yearRow: row, monthRow: nextRow };
    }
  }
  return null;
};

const extractLaborSeries = (rows: unknown[][]) => {
  const headers = findHeaderRows(rows);
  if (!headers) return [];

  const laborRow = rows.find((row) => {
    const label = normalizeText(row?.[0]);
    return label.includes('mano') && label.includes('obra');
  });
  if (!laborRow) return [];

  const series: RawPoint[] = [];
  let currentYear: number | null = null;

  for (let col = 1; col < Math.max(headers.yearRow.length, headers.monthRow.length, laborRow.length); col += 1) {
    const year = parseYear(headers.yearRow[col]);
    if (year) currentYear = year;

    const month = parseMonth(headers.monthRow[col]);
    if (!month || !currentYear) continue;

    const value = parseNumber(laborRow[col]);
    if (value === null) continue;

    series.push({
      year: currentYear,
      monthIndex: month.monthIndex,
      monthLabel: month.label,
      periodLabel: `${month.label} ${currentYear}`,
      provisional: month.provisional,
      value,
    });
  }

  return series.sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);
};

const formatPublishedAt = (value: string | null) => {
  if (!value) return 'Sin fecha de publicacion';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export async function fetchIndecLaborIndex(): Promise<IndecLaborIndex> {
  const response = await fetch(INDEC_LABOR_INDEX_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.ms-excel,application/octet-stream,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`INDEC no respondio correctamente (${response.status}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const variationSheet =
    workbook.Sheets['Nivel general y capítulos_var%'] || workbook.Sheets[workbook.SheetNames[0]];
  const indexSheet =
    workbook.Sheets['Nivel general y capítulos_ind'] || workbook.Sheets[workbook.SheetNames[1] || workbook.SheetNames[0]];

  const variationRows = XLSX.utils.sheet_to_json<unknown[]>(variationSheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  const indexRows = XLSX.utils.sheet_to_json<unknown[]>(indexSheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const variationSeries = extractLaborSeries(variationRows);
  const indexSeries = extractLaborSeries(indexRows);
  const latestVariation = variationSeries.at(-1);
  const latestIndex = indexSeries.at(-1);
  const previousIndex = indexSeries.at(-2);

  if (!latestVariation || !latestIndex || !previousIndex) {
    throw new Error('No se pudo leer la serie Mano de obra del archivo oficial de INDEC.');
  }

  return {
    sourceLabel: 'ICC INDEC - mano de obra',
    sourceUrl: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-33',
    downloadUrl: INDEC_LABOR_INDEX_URL,
    seriesLabel: 'Indice del Costo de la Construccion, capitulo Mano de obra',
    periodLabel: latestVariation.periodLabel,
    previousPeriodLabel: previousIndex.periodLabel,
    publishedAtLabel: formatPublishedAt(response.headers.get('last-modified')),
    latestIndex: latestIndex.value,
    previousIndex: previousIndex.value,
    monthlyPercent: latestVariation.value,
    multiplier: 1 + latestVariation.value / 100,
    provisional: latestVariation.provisional || latestIndex.provisional,
  };
}
