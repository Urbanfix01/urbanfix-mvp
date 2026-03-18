/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
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
    dotenv.config({ path: envPath, override: false });
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

const main = async () => {
  const { data, error } = await supabase
    .from('master_items')
    .select('id,type,active,name,category,source_ref,suggested_price,created_at')
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
