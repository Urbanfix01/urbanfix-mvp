const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const nextConfigPath = path.join(appRoot, 'next.config.js');

const requiredMarkers = [
  'X-Frame-Options',
  'DENY',
  'X-Content-Type-Options',
  'nosniff',
  'Referrer-Policy',
  'strict-origin-when-cross-origin',
  'Permissions-Policy',
  'Strict-Transport-Security',
  'includeSubDomains',
  'Cache-Control',
  'no-store, max-age=0',
  '/api/:path*',
  'async headers()',
];

if (!fs.existsSync(nextConfigPath)) {
  console.error('\nFAIL');
  console.error('- next.config.js no encontrado');
  process.exit(1);
}

const source = fs.readFileSync(nextConfigPath, 'utf8');
const missing = requiredMarkers.filter((marker) => !source.includes(marker));

if (missing.length) {
  console.error('\nFAIL');
  missing.forEach((marker) => console.error(`- falta ${marker}`));
  console.error(`\nSecurity headers audit failed: ${missing.length} marker(s) missing.`);
  process.exit(1);
}

console.log('\nOK');
requiredMarkers.forEach((marker) => console.log(`- ${marker}`));
console.log('\nSecurity headers audit passed.');
