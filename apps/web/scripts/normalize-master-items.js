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

const RULES = [
  { column: 'source_ref', from: 'mo_rubro_elecdtricidad', to: 'mo_rubro_electricidad' },
  { column: 'source_ref', from: 'mo_rubro_demolicions', to: 'mo_rubro_demoliciones' },
  {
    column: 'source_ref',
    from: 'mo_rubro_cloaca_plucial_ventilacion',
    to: 'mo_rubro_cloaca_pluvial_ventilacion',
  },
  { column: 'category', from: 'REFIRGERACION', to: 'REFRIGERACION' },
  {
    column: 'category',
    from: 'CLOAACA, PLUVIAL,VENTILACION',
    to: 'CLOACA, PLUVIAL, VENTILACION',
  },
  { column: 'category', from: 'AGUAINCENDIO', to: 'AGUA/INCENDIO' },
];

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

const apply = process.argv.includes('--apply');
const supabase = createClient(supabaseUrl, serviceRoleKey);

const main = async () => {
  const summary = [];

  for (const rule of RULES) {
    const countQuery = await supabase
      .from('master_items')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'labor')
      .eq(rule.column, rule.from);

    if (countQuery.error) {
      console.error(`Error contando ${rule.column}=${rule.from}: ${countQuery.error.message}`);
      process.exit(1);
    }

    const count = countQuery.count || 0;
    const item = { ...rule, count, applied: false };
    summary.push(item);

    if (!apply || count === 0) {
      continue;
    }

    const { error } = await supabase
      .from('master_items')
      .update({ [rule.column]: rule.to })
      .eq('type', 'labor')
      .eq(rule.column, rule.from);

    if (error) {
      console.error(`Error actualizando ${rule.column}=${rule.from}: ${error.message}`);
      process.exit(1);
    }

    item.applied = true;
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        rules: summary,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Error inesperado normalizando master_items.');
  process.exit(1);
});
