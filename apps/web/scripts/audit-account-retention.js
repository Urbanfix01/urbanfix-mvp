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

const clientPortal = read('app', 'cliente', 'ClientRequestsHub.tsx');
const technicalPortal = read('app', 'tecnicos', 'page.tsx');
const analyticsSummary = read('app', 'api', 'admin', 'analytics', 'summary', 'route.ts');
const admin = read('app', 'admin', 'page.tsx');

requireMarkers(analyticsSummary, 'analytics/summary/route.ts', [
  'ANALYTICS_PAGE_SIZE = 1000',
  'MAX_ANALYTICS_ROWS = 50000',
  '.range(from, to)',
  ".order('id', { ascending: true })",
  'dataCoverage',
  'authRoleByUserId',
  "eventName === 'account_return_reason_viewed'",
  "eventName === 'account_return_reason_selected'",
  'returnedAfterSelectionAccounts',
  'activityDay > selectionDay',
]);

if (analyticsSummary.includes('.limit(50000)')) {
  failures.push('analytics/summary/route.ts conserva una lectura truncada con limit(50000)');
}

requireMarkers(clientPortal, 'cliente/ClientRequestsHub.tsx', [
  'clientReturnReason',
  'requestsLoaded',
  'clientProfileLoaded',
  "trackFunnelEvent('account_return_reason_viewed'",
  "trackFunnelEvent('account_return_reason_selected'",
  "origin: 'client_portal'",
  "role: 'client'",
  'Tu cuenta ya está lista',
  'Revisar propuestas',
  'Ver técnicos cercanos',
]);

requireMarkers(technicalPortal, 'tecnicos/page.tsx', [
  'technicianReturnReason',
  "trackFunnelEvent('account_return_reason_viewed'",
  "trackFunnelEvent('account_return_reason_selected'",
  "origin: 'technical_panel'",
  "role: 'technical'",
  "adminGateStatus !== 'done'",
  'Tu motivo para volver',
  'Revisar pendientes',
  'Ver mapa operativo',
]);

requireMarkers(admin, 'admin/page.tsx', [
  'Motivos de regreso instrumentados',
  'Exposición → selección → regreso posterior',
  'returnAfterSelectionRate',
  'dataComplete',
  'La instrumentación de motivos comienza con este despliegue',
]);

if (failures.length > 0) {
  console.error('Flujo de retención incompleto:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('OK: retención paginada y motivos de regreso auditados.');
