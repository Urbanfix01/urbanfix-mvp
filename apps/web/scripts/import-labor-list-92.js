/* eslint-disable no-console */
/**
 * Importa la lista de mano de obra (Lista N°92) a la tabla master_items en Supabase.
 * Usa la SERVICE_ROLE_KEY desde .env.local.
 *
 * Ejecución:
 *   cd apps/web
 *   node scripts/import-labor-list-92.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const rawData = fs.readFileSync(path.join(__dirname, 'lista92.txt'), 'utf8');

const parseLines = (text) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /^\d+/.test(l));

  const items = [];
  const errors = [];

  for (const line of lines) {
    // Formato: N°<tab>RUBRO<tab>DESCRIPCION<tab>PRECIO
    // Acepta espacios en las columnas y precio con coma decimal.
    const regex = /^(\d+)\s+([A-ZÁÉÍÓÚÜÑ\.º°\/\-\s]+?)\s+(.+?)\s+([\d.,]+)$/i;
    const match = line.match(regex);
    if (!match) {
      errors.push(line);
      continue;
    }
    const [, order, category, name, priceStrRaw] = match;
    const priceStr = priceStrRaw.replace(/\./g, '').replace(',', '.');
    const price = Number.parseFloat(priceStr);
    if (!Number.isFinite(price)) {
      errors.push(line);
      continue;
    }

    items.push({
      order: Number(order),
      category: category.trim(),
      name: name.trim(),
      suggested_price: price,
      type: 'labor',
      source_ref: 'lista_92',
      active: true,
    });
  }

  return { items, errors };
};

const upsertItems = async (items) => {
  console.log(`Importando ${items.length} items...`);

  // Obtener existentes para evitar duplicados por nombre+category
  const { data: existing, error: existingError } = await supabase
    .from('master_items')
    .select('id,name,category,type');

  if (existingError) {
    console.error('Error leyendo existentes:', existingError.message);
    process.exit(1);
  }

  const existingMap = new Map(
    (existing || [])
      .filter((row) => row.type === 'labor')
      .map((row) => [`${row.name.toLowerCase()}|${(row.category || '').toLowerCase()}`, row])
  );

  const payload = items.map((item) => {
    const key = `${item.name.toLowerCase()}|${item.category.toLowerCase()}`;
    const found = existingMap.get(key);
    return {
      id: found?.id || crypto.randomUUID(), // si existe, actualiza; si no, inserta
      name: item.name,
      category: item.category,
      type: 'labor',
      suggested_price: item.suggested_price,
      source_ref: item.source_ref,
      active: item.active,
    };
  });

  const tryUpsert = async (rows, includeActive = true) => {
    const normalized = rows.map((row) =>
      includeActive
        ? row
        : Object.fromEntries(
            Object.entries(row).filter(([key]) => key !== 'active')
          )
    );
    return supabase.from('master_items').upsert(normalized, { onConflict: 'id' });
  };

  let { error } = await tryUpsert(payload, true);
  if (error && String(error.message || '').toLowerCase().includes('active')) {
    console.warn('Columna active no existe, reintentando sin active...');
    ({ error } = await tryUpsert(payload, false));
  }

  if (error) {
    console.error('Error guardando:', error.message);
    process.exit(1);
  }

  console.log('Importación completada.');
};

const main = async () => {
  const { items, errors } = parseLines(rawData);
  if (errors.length) {
    console.warn('Líneas sin parsear:', errors.length);
    errors.slice(0, 5).forEach((l) => console.warn('  ', l));
  }

  await upsertItems(items);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
