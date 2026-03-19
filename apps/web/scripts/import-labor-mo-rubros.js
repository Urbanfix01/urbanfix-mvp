/* eslint-disable no-console */
/**
 * Importa mano de obra desde planilla XLSX (MO - RUBROS) a master_items.
 *
 * Uso:
 *   cd apps/web
 *   node scripts/import-labor-mo-rubros.js
 *   node scripts/import-labor-mo-rubros.js --sheet ELECTRICIDAD
 *   node scripts/import-labor-mo-rubros.js --sheet ELECTRICIDAD --apply
 *   node scripts/import-labor-mo-rubros.js --source mo_rubros_2026_03 --apply
 *   node scripts/import-labor-mo-rubros.js --file "C:\\ruta\\archivo.xlsx" --apply
 */

const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const defaultFilePath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'urbanfix-mvp',
  'mo-rubros',
  'MO - RUBROS .xlsx'
);

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
const defaultSource = `mo_rubros_${today}`;

const CANONICAL_CATEGORY_BY_SOURCE_REF = {
  mo_rubro_refrigeracion: 'REFRIGERACION',
  mo_rubro_agua_incendio: 'AGUA/INCENDIO',
  mo_rubro_cloaca_pluvial_ventilacion: 'CLOACA, PLUVIAL, VENTILACION',
};

const TECH_SIGNAL_HEADERS = [
  'rango',
  'potencia',
  'kw',
  'kva',
  'frigo',
  'fg',
  'medida',
  'diam',
  'capacidad',
  'caudal',
];

const normalizeText = (value) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const cleanText = (value) => (value ?? '').toString().replace(/\s+/g, ' ').trim();
const normalizeTechnicalNotes = (value) => cleanText(value).replace(/\r/g, '');

const toNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = cleanText(value);
  if (!raw) return null;

  let normalized = raw.replace(/[^\d,.\-]/g, '');
  if (!normalized) return null;

  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (commaCount > 0 && dotCount === 0) {
    normalized = normalized.replace(',', '.');
  } else if (dotCount > 1 && commaCount === 0) {
    normalized = normalized.replace(/\./g, '');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    file: defaultFilePath,
    source: defaultSource,
    sheets: [],
    apply: false,
    listSheets: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--apply') {
      options.apply = true;
      continue;
    }
    if (token === '--list-sheets') {
      options.listSheets = true;
      continue;
    }
    if (token === '--sheet' && args[i + 1]) {
      options.sheets.push(args[i + 1]);
      i += 1;
      continue;
    }
    if (token.startsWith('--sheet=')) {
      options.sheets.push(token.split('=').slice(1).join('='));
      continue;
    }
    if (token === '--file' && args[i + 1]) {
      options.file = args[i + 1];
      i += 1;
      continue;
    }
    if (token.startsWith('--file=')) {
      options.file = token.split('=').slice(1).join('=');
      continue;
    }
    if (token === '--source' && args[i + 1]) {
      options.source = args[i + 1];
      i += 1;
      continue;
    }
    if (token.startsWith('--source=')) {
      options.source = token.split('=').slice(1).join('=');
    }
  }

  return options;
};

const findColumnIndex = (headers, candidates) => {
  for (let i = 0; i < headers.length; i += 1) {
    const header = normalizeText(headers[i]);
    if (!header) continue;
    if (candidates.some((candidate) => header.includes(candidate))) return i;
  }
  return -1;
};

const detectHeaderRow = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const row = rows[i] || [];
    const normalized = row.map((cell) => normalizeText(cell));
    const hasItem = normalized.some(
      (cell) => cell.includes('tarea') || cell.includes('item') || cell.includes('descripcion')
    );
    const hasPrice = normalized.some(
      (cell) =>
        cell.includes('mano obra') ||
        cell === 'mo' ||
        cell.includes('precio') ||
        cell.includes('total')
    );
    if (hasItem && hasPrice) return i;
  }
  return 0;
};

const isNoiseName = (name) => {
  const normalized = normalizeText(name);
  if (!normalized) return true;
  if (normalized === 'item' || normalized === 'tarea / item') return true;
  if (normalized === 'categoria') return true;
  if (/^total(es)?$/.test(normalized)) return true;
  if (/^subtotal(es)?$/.test(normalized)) return true;
  return false;
};

const appendTechnicalNote = (notes, value) => {
  const existing = normalizeTechnicalNotes(notes)
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean);
  const next = cleanText(value);
  if (!next) return existing.join('\n') || null;
  const seen = new Set(existing.map((line) => normalizeText(line)));
  if (!seen.has(normalizeText(next))) {
    existing.push(next);
  }
  return existing.join('\n') || null;
};

const extractTechnicalTokensFromName = (name) => {
  const source = cleanText(name);
  if (!source) return [];

  const patterns = [
    /\u00D8\s*\d+(?:[.,]\d+)?\s*mm/gi,
    /\d+\s*x\s*\d+\s*x\s*\d+\s*cm/gi,
    /\d+\s*x\s*\d+\s*cm/gi,
    /e\s*=\s*\d+(?:[.,]\d+)?\s*cm/gi,
    /\d+\+\d+\s*mm/gi,
    /\d+\/\d+\s*hp/gi,
    /h\d+\/\d+\s*kg/gi,
    /\d+(?:[.,]\d+)?\s*(?:mm|cm|lt|lts|kg|hp|cal|fg|kva|kw)\b/gi,
  ];

  const tokens = [];
  const seen = new Set();
  const occupiedRanges = [];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const raw = cleanText(match[0]);
      const start = Number(match.index || 0);
      const end = start + raw.length;
      const overlapsExisting = occupiedRanges.some((range) => start >= range.start && end <= range.end);
      if (overlapsExisting) continue;

      const key = normalizeText(raw);
      if (!raw || seen.has(key)) continue;

      seen.add(key);
      tokens.push(raw);
      occupiedRanges.push({ start, end });
    }
  }

  return tokens;
};

const buildTechnicalNotes = ({
  headers,
  row,
  name,
  idxName,
  idxCategory,
  idxUnit,
  idxMo,
  idxPrice,
  idxTechnicalNotes,
}) => {
  const parts = [];
  const seen = new Set();
  const pushPart = (value) => {
    const cleaned = cleanText(value);
    if (!cleaned || cleaned === '-') return;
    const key = normalizeText(cleaned);
    if (!key || seen.has(key)) return;
    seen.add(key);
    parts.push(cleaned);
  };

  if (idxTechnicalNotes >= 0) {
    pushPart(row[idxTechnicalNotes]);
  }

  headers.forEach((headerValue, index) => {
    if ([idxName, idxCategory, idxUnit, idxMo, idxPrice, idxTechnicalNotes].includes(index)) return;
    const header = cleanText(headerValue);
    const normalizedHeader = normalizeText(header);
    const value = cleanText(row[index]);
    if (!value || value === '-') return;
    if (!TECH_SIGNAL_HEADERS.some((signal) => normalizedHeader.includes(signal))) return;
    pushPart(`${header}: ${value}`);
  });

  const technicalTokens = extractTechnicalTokensFromName(name);
  if (technicalTokens.length > 0) {
    pushPart(`Especificacion nominal: ${technicalTokens.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
};

const buildIdentityKey = (item) =>
  [
    normalizeText(item.name),
    normalizeText(item.category),
    normalizeText(item.source_ref),
    normalizeText(item.technical_notes || ''),
  ].join('|');

const buildPriceKey = (item) =>
  [
    normalizeText(item.name),
    normalizeText(item.category),
    normalizeText(item.source_ref),
    Number(item.suggested_price || 0).toFixed(2),
  ].join('|');

const collapseItemsByIdentity = (items) => {
  const map = new Map();
  const duplicates = [];

  items.forEach((item) => {
    const key = buildIdentityKey(item);
    if (map.has(key)) {
      duplicates.push({
        key,
        keptRow: item._row,
        replacedRow: map.get(key)._row,
      });
    }
    map.set(key, item);
  });

  return { items: [...map.values()], duplicates };
};

const parseSheetRows = (sheetName, matrix, sourceRef) => {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return { items: [], skipped: 0, collapsedDuplicates: [] };
  }

  const headerRowIndex = detectHeaderRow(matrix);
  const headers = matrix[headerRowIndex] || [];

  const idxName = findColumnIndex(headers, ['tarea', 'item', 'descripcion']);
  const idxCategory = findColumnIndex(headers, ['categoria', 'rubro']);
  const idxUnit = findColumnIndex(headers, ['unidad', 'u/m', 'um']);
  const idxMo = findColumnIndex(headers, ['costo mano obra', 'mano obra', ' mo', 'mo']);
  const idxPrice = findColumnIndex(headers, ['precio total', 'precio', 'total', 'valor']);
  const idxTechnicalNotes = findColumnIndex(headers, [
    'observaciones tecnicas',
    'observacion tecnica',
    'obs tecnicas',
    'obs tecnica',
    'nota tecnica',
    'detalle tecnico',
    'observaciones',
  ]);

  if (idxName === -1 || (idxMo === -1 && idxPrice === -1)) {
    return { items: [], skipped: Math.max(matrix.length - headerRowIndex - 1, 0), collapsedDuplicates: [] };
  }

  const fallbackCategory = CANONICAL_CATEGORY_BY_SOURCE_REF[sourceRef] || cleanText(sheetName);
  const items = [];
  let skipped = 0;

  for (let r = headerRowIndex + 1; r < matrix.length; r += 1) {
    const row = matrix[r] || [];
    const name = cleanText(row[idxName]);
    const category = idxCategory >= 0 ? cleanText(row[idxCategory]) || fallbackCategory : fallbackCategory;
    const unit = idxUnit >= 0 ? cleanText(row[idxUnit]) : '';
    const priceRaw = idxMo >= 0 ? row[idxMo] : row[idxPrice];
    const price = toNumber(priceRaw);
    const technicalNotes = buildTechnicalNotes({
      headers,
      row,
      name,
      idxName,
      idxCategory,
      idxUnit,
      idxMo,
      idxPrice,
      idxTechnicalNotes,
    });

    if (isNoiseName(name) || !category || !Number.isFinite(price) || price <= 0) {
      skipped += 1;
      continue;
    }

    items.push({
      name,
      category,
      type: 'labor',
      suggested_price: price,
      source_ref: sourceRef,
      active: true,
      technical_notes: technicalNotes,
      unit,
      _sheet: sheetName,
      _row: r + 1,
    });
  }

  const groupedByBaseKey = new Map();
  items.forEach((item) => {
    const key = [normalizeText(item.name), normalizeText(item.category), normalizeText(item.source_ref)].join('|');
    const current = groupedByBaseKey.get(key) || [];
    current.push(item);
    groupedByBaseKey.set(key, current);
  });

  const normalizedItems = items.map((item) => {
    const key = [normalizeText(item.name), normalizeText(item.category), normalizeText(item.source_ref)].join('|');
    const siblings = groupedByBaseKey.get(key) || [];
    const distinctUnits = new Set(siblings.map((entry) => normalizeText(entry.unit || '')));
    if (distinctUnits.size > 1 && item.unit) {
      return {
        ...item,
        technical_notes: appendTechnicalNote(item.technical_notes, `Unidad de referencia: ${item.unit}`),
      };
    }
    return item;
  });

  const collapsed = collapseItemsByIdentity(normalizedItems);
  return { items: collapsed.items, skipped, collapsedDuplicates: collapsed.duplicates };
};

const groupBySheet = (items) => {
  const summary = new Map();
  for (const item of items) {
    const current = summary.get(item._sheet) || 0;
    summary.set(item._sheet, current + 1);
  }
  return [...summary.entries()].sort(([a], [b]) => a.localeCompare(b));
};

const removePrivateFields = (item) => ({
  name: item.name,
  category: item.category,
  type: item.type,
  suggested_price: item.suggested_price,
  source_ref: item.source_ref,
  active: item.active,
  technical_notes: item.technical_notes || null,
});

const main = async () => {
  const options = parseArgs();
  const filePath = path.resolve(options.file);

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const allSheets = workbook.SheetNames || [];
  const wantedSheets = options.sheets.length
    ? allSheets.filter((sheet) =>
        options.sheets.some((target) => normalizeText(target) === normalizeText(sheet))
      )
    : allSheets;

  if (options.listSheets) {
    console.log('Hojas detectadas:');
    wantedSheets.forEach((sheet) => console.log(`- ${sheet}`));
    return;
  }

  if (!wantedSheets.length) {
    console.error('No se encontraron hojas para procesar. Verifica --sheet o --list-sheets.');
    process.exit(1);
  }

  const parsedItems = [];
  const parseDiagnostics = [];
  const collapsedDiagnostics = [];

  for (const sheetName of wantedSheets) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    const { items, skipped, collapsedDuplicates } = parseSheetRows(sheetName, rows, options.source);
    parsedItems.push(...items);
    parseDiagnostics.push({ sheet: sheetName, imported: items.length, skipped });
    collapsedDiagnostics.push(...collapsedDuplicates.map((entry) => ({ sheet: sheetName, ...entry })));
  }

  if (!parsedItems.length) {
    console.error('No se generaron items validos desde la planilla.');
    process.exit(1);
  }

  console.log(`Archivo: ${filePath}`);
  console.log(`Source: ${options.source}`);
  console.log(`Modo: ${options.apply ? 'APPLY (escribe en DB)' : 'DRY-RUN (no escribe)'}`);
  console.log(`Hojas procesadas: ${wantedSheets.length}`);
  console.log(`Items validos: ${parsedItems.length}`);
  console.log('');
  console.log('Resumen por hoja:');
  for (const row of parseDiagnostics.sort((a, b) => a.sheet.localeCompare(b.sheet))) {
    console.log(`- ${row.sheet}: ${row.imported} importables, ${row.skipped} omitidos`);
  }
  if (collapsedDiagnostics.length > 0) {
    console.log('');
    console.log(`Duplicados exactos colapsados: ${collapsedDiagnostics.length}`);
    collapsedDiagnostics.slice(0, 10).forEach((entry) => {
      console.log(`- ${entry.sheet}: fila ${entry.replacedRow} reemplazada por fila ${entry.keptRow}`);
    });
  }
  console.log('');

  const bySheet = groupBySheet(parsedItems);
  for (const [sheet, count] of bySheet) {
    const sample = parsedItems.find((item) => item._sheet === sheet);
    if (sample) {
      console.log(`Ejemplo ${sheet}: ${sample.name} | ${sample.category} | ARS ${sample.suggested_price.toFixed(2)}`);
    }
  }

  if (!options.apply) return;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: existingRows, error: existingError } = await supabase
    .from('master_items')
    .select('id,name,category,type,source_ref,technical_notes,suggested_price')
    .eq('type', 'labor')
    .eq('source_ref', options.source);

  if (existingError) {
    console.error(`Error leyendo master_items: ${existingError.message}`);
    process.exit(1);
  }

  const existingIdentityMap = new Map(
    (existingRows || []).map((row) => [
      buildIdentityKey({
        name: row.name,
        category: row.category,
        source_ref: row.source_ref,
        technical_notes: row.technical_notes,
      }),
      row.id,
    ])
  );

  const existingPriceMap = new Map(
    (existingRows || []).map((row) => [
      buildPriceKey({
        name: row.name,
        category: row.category,
        source_ref: row.source_ref,
        suggested_price: row.suggested_price,
      }),
      row.id,
    ])
  );

  const payload = parsedItems.map((item) => {
    const identityKey = buildIdentityKey(item);
    const priceKey = buildPriceKey(item);
    const existingId = existingIdentityMap.get(identityKey) || existingPriceMap.get(priceKey);
    return {
      id: existingId || crypto.randomUUID(),
      ...removePrivateFields(item),
    };
  });

  const BATCH_SIZE = 200;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('master_items').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error en batch ${i / BATCH_SIZE + 1}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Batch ${i / BATCH_SIZE + 1}: ${batch.length} items guardados.`);
  }

  console.log(`Importacion completada. Total guardado: ${payload.length}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
