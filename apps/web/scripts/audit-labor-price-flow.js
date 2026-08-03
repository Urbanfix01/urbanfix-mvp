const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

const technicianPage = read(path.join('app', 'tecnicos', 'page.tsx'));
const analyticsSummary = read(path.join('app', 'api', 'admin', 'analytics', 'summary', 'route.ts'));

const requireMarkers = (source, label, markers) => {
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${label}: faltan marcadores: ${missing.join(', ')}`);
  }
};

requireMarkers(technicianPage, 'Panel tecnico', [
  "trackFunnelEvent('labor_prices_viewed'",
  "!session?.user?.id",
  '!profileHydrated',
  'profileRequiredMissing.length > 0',
  'laborPricesViewTrackedRef.current',
  "trackFunnelEvent('labor_price_item_selected'",
  "trackFunnelEvent('labor_price_items_added_to_quote'",
  "source: catalogItemCount > 0 ? 'labor_prices' : 'quote_builder'",
  'catalog_item_count: catalogItemCount',
  'labor_catalog_item_count: laborCatalogItemCount',
]);

requireMarkers(analyticsSummary, 'Embudo administrativo', [
  "key: 'prices_to_quote'",
  "eventNames: ['labor_prices_viewed']",
  'requiresUser: true',
  "eventNames: ['labor_price_item_selected']",
  "eventNames: ['labor_price_items_added_to_quote']",
  "eventNames: ['quote_created']",
  "measurement: 'Misma sesión y orden real'",
  "if (stage.requiresUser && !String(row?.user_id || '').trim()) return;",
]);

if (analyticsSummary.includes("eventNames: ['labor_prices_viewed', 'home_open_guia_precios']")) {
  throw new Error('Embudo administrativo: el clic de Inicio no debe contarse como visita confirmada a Valores MO.');
}

console.log('OK: flujo Valores MO -> presupuesto auditado.');
