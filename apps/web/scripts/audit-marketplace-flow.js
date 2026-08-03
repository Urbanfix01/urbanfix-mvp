const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

const failures = [];
const ok = [];

const requireMarkers = (label, source, markers) => {
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) {
    failures.push(`${label}: falta ${missing.join(', ')}`);
    return;
  }
  ok.push(`${label}: contrato conectado`);
};

const forbidMarkers = (label, source, markers) => {
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length) {
    failures.push(`${label}: no debe contener ${present.join(', ')}`);
    return;
  }
  ok.push(`${label}: sin atajos de contacto`);
};

const walk = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
};

const assertNoLegacyTablesInRuntime = () => {
  const runtimeRoots = ['app', 'components', 'lib'].map((entry) => path.join(appRoot, entry));
  const legacyMarkers = ['master_requests', 'request_quotes'];

  for (const filePath of runtimeRoots.flatMap(walk)) {
    const relativePath = path.relative(appRoot, filePath).split(path.sep).join('/');
    const source = fs.readFileSync(filePath, 'utf8');
    for (const marker of legacyMarkers) {
      if (source.includes(marker)) {
        failures.push(`${relativePath}: usa tabla legacy ${marker}`);
      }
    }
  }
};

const clientRequestsRoute = read('app/api/client/requests/route.ts');
const clientRequestDetailRoute = read('app/api/client/requests/[id]/route.ts');
const clientData = read('app/api/client/_shared/data.ts');
const technicianNearbyRoute = read('app/api/tecnico/requests/nearby/route.ts');
const technicianOfferRoute = read('app/api/tecnico/requests/[id]/offer/route.ts');
const technicianDashboardRoute = read('app/api/tecnico/dashboard/route.ts');
const clientHub = read('app/cliente/ClientRequestsHub.tsx');
const technicianPage = read('app/tecnicos/page.tsx');
const publicMarketplacePage = read('app/vidriera/page.tsx');
const publicMarketplaceZonePage = read('app/vidriera/[zona]/page.tsx');
const publicTechniciansMap = read('components/public/PublicTechniciansMap.tsx');
const publicTechnicianProfile = read('app/tecnico/[id]/page.tsx');
const publicPhone = read('lib/public-phone.ts');
const analyticsSummaryRoute = read('app/api/admin/analytics/summary/route.ts');
const analyticsTracker = read('components/AnalyticsTracker.tsx');
const baseMigration = read('supabase/migrations/20260315_client_requests_marketplace.sql');
const alignmentMigration = read('supabase/migrations/20260323110000_client_requests_contract_alignment.sql');

requireMarkers('Cliente publica solicitudes', clientRequestsRoute, [
  "from('client_requests')",
  'readLimitedJsonBody',
  'geocodeFirstResult',
  'location_lat',
  'location_lng',
  'radius_km',
  "from('client_request_matches')",
  'access_granted',
]);

requireMarkers('Cliente ve respuestas y estados', clientData, [
  "from('client_requests')",
  "from('client_request_matches')",
  "from('client_request_events')",
  'quote_status',
  'selected_match_id',
  'assigned_technician_id',
]);

requireMarkers('Cliente acepta/rechaza ofertas', clientRequestDetailRoute, [
  "from('client_request_matches')",
  'quote_status',
  'accepted',
  'rejected',
  'selected_match_id',
  'syncQuoteStatus',
]);

requireMarkers('Tecnico recibe solicitudes por zona', technicianNearbyRoute, [
  "from('client_requests')",
  "from('client_request_matches')",
  'haversineKm',
  'service_lat',
  'service_lng',
  'radius_km',
  'target_technician_id',
  'access_granted',
]);

requireMarkers('Tecnico responde solicitudes', technicianOfferRoute, [
  'readLimitedJsonBody',
  "from('client_requests')",
  "from('client_request_matches')",
  "quote_status: 'submitted'",
  "from('client_request_events')",
  'quoted',
]);

requireMarkers('Dashboard tecnico legacy delegado', technicianDashboardRoute, [
  "GET as getNearbyRequests",
  'return getNearbyRequests(request)',
]);

requireMarkers('UI cliente usa endpoints marketplace', clientHub, [
  "fetch('/api/client/requests'",
  '/api/client/technicians/nearby',
  'isClientProfileComplete',
  'handlePublishRequest',
]);

requireMarkers('UI tecnico usa endpoints marketplace', technicianPage, [
  "fetch('/api/tecnico/requests/nearby'",
  '/api/tecnico/requests/${request.id}/offer',
  'nearbyRequests',
  'dashboardRequestPoints',
]);

requireMarkers('Mapa público ordena cercanía y exige perfil', publicTechniciansMap, [
  'haversineKm',
  'marketplace_location_requested',
  'marketplace_location_resolved',
  'marketplace_technician_selected',
  'marketplace_profile_opened',
  'marketplace_nearby_strip',
  'availabilityValue',
]);

forbidMarkers('Mapa público', publicTechniciansMap, ['whatsappHref', '>WhatsApp<']);

requireMarkers('Vidriera pública filtra disponibilidad', publicMarketplacePage, [
  'availabilityQuery',
  'resolveWorkingHoursTimeZone',
  'marketplace_profile_opened',
  'data-analytics-location="marketplace_list"',
]);

requireMarkers('Vidriera por zona filtra disponibilidad', publicMarketplaceZonePage, [
  'availabilityQuery',
  'resolveWorkingHoursTimeZone',
  'marketplace_profile_opened',
]);

forbidMarkers('Listado público principal', publicMarketplacePage, ['href={whatsappLink}', 'buildWhatsappLink']);
forbidMarkers('Listado público por zona', publicMarketplaceZonePage, ['href={whatsappLink}', 'buildWhatsappLink']);

requireMarkers('Perfil público concentra el contacto', publicTechnicianProfile, [
  'buildPublicWhatsappHref',
  'resolveWorkingHoursTimeZone',
  'technician_whatsapp_contact',
  'data-analytics-target={profile.id}',
]);

requireMarkers('Teléfono público usa país real', publicPhone, [
  'libphonenumber-js/min',
  'getCountryCode',
  'buildPublicWhatsappHref',
]);

requireMarkers('Embudo reconoce todas las rutas públicas', analyticsSummaryRoute, [
  "pathname.startsWith('/vidriera/')",
  '/^\\/tecnicos\\/[^/]+\\/[^/]+\\/?$/.test(pathname)',
  "eventNames: ['marketplace_profile_opened']",
]);

requireMarkers('Analítica excluye pruebas locales', analyticsTracker, [
  'isLocalAnalyticsRuntime',
  "['localhost', '127.0.0.1', '::1']",
]);

requireMarkers('Migracion base marketplace', baseMigration, [
  'create table if not exists public.client_requests',
  'create table if not exists public.client_request_matches',
  'create table if not exists public.client_request_events',
  'unique (request_id, technician_id)',
]);

requireMarkers('Migracion contrato mapa/ofertas', alignmentMigration, [
  'add column if not exists radius_km',
  'add column if not exists location_lat',
  'add column if not exists location_lng',
  'add column if not exists photo_urls',
  'add column if not exists response_type',
  'add column if not exists quote_id',
]);

assertNoLegacyTablesInRuntime();

if (ok.length) {
  console.log('\nOK');
  ok.forEach((item) => console.log(`- ${item}`));
}

if (failures.length) {
  console.error('\nFAIL');
  failures.forEach((item) => console.error(`- ${item}`));
  console.error(`\nMarketplace flow audit failed: ${failures.length} bloqueo(s).`);
  process.exit(1);
}

console.log('\nMarketplace flow audit passed.');
