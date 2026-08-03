const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const read = (...segments) => fs.readFileSync(path.join(appRoot, ...segments), 'utf8');
const failures = [];

const requireMarkers = (source, label, markers) => {
  markers.forEach((marker) => {
    if (!source.includes(marker)) failures.push(`${label} falta ${marker}`);
  });
};

const overview = read('app', 'api', 'admin', 'overview', 'route.ts');
const admin = read('app', 'admin', 'page.tsx');
const community = read('components', 'community', 'CommunityFeed.tsx');

requireMarkers(overview, 'admin/overview/route.ts', [
  'ANALYTICS_REACH_PAGE_SIZE = 1000',
  'MAX_ANALYTICS_REACH_ROWS = 100000',
  'fetchAnalyticsReachRows',
  '.range(from, to)',
  ".order('id', { ascending: true })",
  'dataComplete: !analyticsGeoRes.truncated',
  'geoContextAvailable',
  'rowCount: analyticsRows.length',
]);

if (overview.includes('.limit(20000)')) {
  failures.push('admin/overview/route.ts conserva la lectura truncada limit(20000)');
}

requireMarkers(community, 'community/CommunityFeed.tsx', [
  'COUNTRY_SELECTION_OPTIONS',
  'getStoredCountryPreference',
  'handleCountryFilterChange',
  'community_country_filtered',
  'community_marketplace_opened',
  "params.set('pais', country)",
  'author_country',
  'Todos los países',
  'Ver técnicos',
]);

requireMarkers(admin, 'admin/page.tsx', [
  'Comunidad + vidriera mundial',
  'Fuente paginada',
  'Cobertura completa',
  'summaryCommunitySection',
  'summaryMarketplaceSection',
  'summaryPublicProfilesSection',
  'global_growth_report_printed',
  "key: 'alcance-real'",
  "key: 'paises-ciudades'",
  "key: 'secciones-demanda'",
  "key: 'conversion-registros'",
  "key: 'comunidad-vidriera'",
  "key: 'reporte-mensual'",
]);

if (failures.length > 0) {
  console.error('Expansión mundial incompleta:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('OK: comunidad, vidriera y reporte mundial auditados.');
