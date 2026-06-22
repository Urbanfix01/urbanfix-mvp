/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ENV_CANDIDATES = [
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '..', '..', '..', '.env.local'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.tmp-vercel-env'),
];

const SOURCE_RENAMES = {
  mo_rubro_elecdtricidad: 'mo_rubro_electricidad',
  mo_rubro_demolicions: 'mo_rubro_demoliciones',
  mo_rubro_cloaca_plucial_ventilacion: 'mo_rubro_cloaca_pluvial_ventilacion',
};

const CATEGORY_RENAMES = {
  REFIRGERACION: 'REFRIGERACION',
  'CLOAACA, PLUVIAL,VENTILACION': 'CLOACA, PLUVIAL, VENTILACION',
  AGUAINCENDIO: 'AGUA/INCENDIO',
};

for (const envPath of ENV_CANDIDATES) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (!match) return;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) return;
      const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    });
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const toSortedEntries = (map, limit = 25) => Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findEstimatorCatalogMatch = (rows, { label, types, terms, unit }) => {
  const wantedTypes = new Set(types);
  const normalizedTerms = terms.map(normalizeText).filter(Boolean);
  const normalizedUnit = normalizeText(unit);
  const matches = rows
    .filter((row) => wantedTypes.has(String(row.type || '')))
    .map((row) => {
      const suggestedPrice = Number(row.suggested_price || 0);
      if (!Number.isFinite(suggestedPrice) || suggestedPrice <= 0) return null;

      const name = normalizeText(row.name);
      const category = normalizeText(row.category);
      const source = normalizeText(row.source_ref);
      const rowUnit = normalizeText(row.unit);
      const text = `${name} ${category} ${source}`;
      if (!normalizedTerms.every((term) => text.includes(term))) return null;
      if (normalizedUnit && rowUnit && rowUnit !== normalizedUnit) return null;

      let score = 100;
      if (normalizedUnit && rowUnit === normalizedUnit) score += 30;
      if (normalizedTerms.every((term) => name.includes(term))) score += 20;
      if (row.active === false) score -= 50;
      return { row, score };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.row.suggested_price || 0) - Number(a.row.suggested_price || 0) ||
        String(a.row.name || '').localeCompare(String(b.row.name || ''))
    );

  const match = matches[0]?.row || null;
  return {
    label,
    status: match ? 'ok' : 'missing',
    item: match?.name || null,
    source_ref: match?.source_ref || null,
    unit: match?.unit || null,
    suggested_price: match?.suggested_price || null,
  };
};

const main = async () => {
  const { data, error } = await supabase
    .from('master_items')
    .select('id,type,active,name,category,source_ref,unit,suggested_price,created_at')
    .limit(5000);

  if (error) {
    console.error(`Error leyendo master_items: ${error.message}`);
    process.exit(1);
  }

  const rows = data || [];
  const byType = new Map();
  const bySource = new Map();
  const byCategory = new Map();
  const renameCandidates = {
    source_ref: [],
    category: [],
  };

  for (const row of rows) {
    const type = String(row.type || 'unknown');
    const source = String(row.source_ref || '').trim() || 'SIN_FUENTE';
    const category = String(row.category || '').trim() || 'SIN_CATEGORIA';

    byType.set(type, (byType.get(type) || 0) + 1);
    bySource.set(source, (bySource.get(source) || 0) + 1);
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
  }

  for (const [from, to] of Object.entries(SOURCE_RENAMES)) {
    const count = bySource.get(from) || 0;
    if (count > 0) {
      renameCandidates.source_ref.push({ from, to, count });
    }
  }

  for (const [from, to] of Object.entries(CATEGORY_RENAMES)) {
    const count = byCategory.get(from) || 0;
    if (count > 0) {
      renameCandidates.category.push({ from, to, count });
    }
  }

  const laborRows = rows.filter((row) => row.type === 'labor');
  const laborActive = laborRows.filter((row) => row.active !== false).length;
  const laborInactive = laborRows.length - laborActive;
  const estimatorCoverage = [
    findEstimatorCatalogMatch(rows, {
      label: 'Mano de obra - Mamposteria hueco 12',
      types: ['labor'],
      terms: ['ladrillo', 'hueco', '12'],
      unit: 'm2',
    }),
    findEstimatorCatalogMatch(rows, {
      label: 'Mano de obra - Revoque interior completo',
      types: ['labor'],
      terms: ['interior', 'cal', 'comun', 'completo'],
      unit: 'm2',
    }),
    findEstimatorCatalogMatch(rows, {
      label: 'Material - Cemento',
      types: ['material', 'consumable'],
      terms: ['cemento'],
      unit: 'bolsa',
    }),
    findEstimatorCatalogMatch(rows, {
      label: 'Material - Cal',
      types: ['material', 'consumable'],
      terms: ['cal'],
      unit: 'bolsa',
    }),
    findEstimatorCatalogMatch(rows, {
      label: 'Material - Arena',
      types: ['material', 'consumable'],
      terms: ['arena'],
      unit: 'm3',
    }),
    findEstimatorCatalogMatch(rows, {
      label: 'Material - Ladrillo hueco 12',
      types: ['material', 'consumable'],
      terms: ['ladrillo', 'hueco', '12'],
      unit: 'unidad',
    }),
    findEstimatorCatalogMatch(rows, {
      label: 'Material - Hidrofugo',
      types: ['material', 'consumable'],
      terms: ['hidrofugo'],
      unit: 'litro',
    }),
  ];

  console.log(
    JSON.stringify(
      {
        totalRows: rows.length,
        laborRows: laborRows.length,
        laborActive,
        laborInactive,
        distinctSources: bySource.size,
        distinctCategories: byCategory.size,
        byType: Object.fromEntries(byType),
        topSources: toSortedEntries(bySource, 30),
        topCategories: toSortedEntries(byCategory, 30),
        renameCandidates,
        estimatorCoverage,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Error inesperado auditando master_items.');
  process.exit(1);
});
