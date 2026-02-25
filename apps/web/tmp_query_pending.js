const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function readEnvFile(path) {
  const out = {};
  const raw = fs.readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function main() {
  const env = readEnvFile('.env.local');
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from('roadmap_updates')
    .select('id,title,status,priority,area,sector,owner,eta_date,updated_at')
    .neq('status', 'done')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('QUERY_ERROR:', error.message);
    process.exit(1);
  }

  const items = data || [];
  console.log(`PENDING_COUNT=${items.length}`);
  console.log(JSON.stringify(items, null, 2));
}

main().catch((e) => {
  console.error('UNEXPECTED_ERROR:', e?.message || e);
  process.exit(1);
});
