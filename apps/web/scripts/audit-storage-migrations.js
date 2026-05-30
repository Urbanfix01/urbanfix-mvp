const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(appRoot, 'supabase', 'migrations');

const requiredMarkers = [
  { label: 'bucket urbanfix-assets', marker: "'urbanfix-assets'" },
  { label: 'bucket beta-support', marker: "'beta-support'" },
  { label: 'storage objects RLS', marker: 'alter table storage.objects enable row level security' },
  { label: 'urbanfix public read policy', marker: '"UrbanFix assets public read"' },
  { label: 'urbanfix insert policy', marker: '"UrbanFix assets user insert"' },
  { label: 'urbanfix update policy', marker: '"UrbanFix assets user update"' },
  { label: 'urbanfix delete policy', marker: '"UrbanFix assets user delete"' },
  { label: 'support insert policy', marker: '"Beta support images insert"' },
  { label: 'support delete policy', marker: '"Beta support images delete"' },
];

const source = fs.existsSync(migrationsDir)
  ? fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
      .join('\n')
  : '';

const normalizedSource = source.toLowerCase();
const missing = requiredMarkers.filter((entry) => !normalizedSource.includes(entry.marker.toLowerCase()));

if (missing.length) {
  console.error('\nFAIL');
  missing.forEach((entry) => console.error(`- ${entry.label}: falta ${entry.marker}`));
  console.error(`\nStorage migration audit failed: ${missing.length} marker(s) missing.`);
  process.exit(1);
}

console.log('\nOK');
requiredMarkers.forEach((entry) => console.log(`- ${entry.label}`));
console.log('\nStorage migration audit passed.');
