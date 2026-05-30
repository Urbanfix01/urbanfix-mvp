const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const canonicalDir = path.join(appRoot, 'supabase', 'migrations');
const legacyDir = path.join(appRoot, 'lib', 'supabase', 'migrations');

const productionCriticalMigrations = [
  '20240502_approve_quote_rpc.sql',
  '20251227_notifications.sql',
  '20260121_quote_attachments.sql',
  '20260127_delete_quote_rpc.sql',
  '20260127_job_schedule.sql',
  '20260127_profile_fields.sql',
  '20260128_profile_logo_shape.sql',
  '20260128_public_quote_bundle_allow_drafts.sql',
  '20260128_secure_user_data.sql',
  '20260130_billing_subscriptions.sql',
  '20260131_notifications.sql',
  '20260201_access_codes.sql',
  '20260202_access_gate.sql',
  '20260203_beta_support_chat.sql',
  '20260204_aapsya_price_list.sql',
  '20260205_quote_geolocation.sql',
  '20260206_beta_support_attachments.sql',
  '20260215_quotes_policies.sql',
  '20260215_quote_items_policies.sql',
  '20260215_quote_revision_requests.sql',
  '20260216_approve_quote_rpc_fix.sql',
  '20260216_update_quote_status_rpc.sql',
  '20260220_analytics_events.sql',
  '20260221_profile_branding_fields.sql',
  '20260222_profile_presence.sql',
  '20260223_quote_discount_percent.sql',
  '20260224_profile_mp_payer_email.sql',
  '20260224_profile_trial.sql',
  '20260225_master_items_active.sql',
  '20260314_admin_security_hardening_rls.sql',
  '20260226_profiles_geo_precision.sql',
  '20260315_client_requests_marketplace.sql',
  '20260316_profile_reputation_fields.sql',
  '20260317_profile_likes.sql',
  '20260323110000_client_requests_contract_alignment.sql',
];

const optionalOperationalMigrations = [
  '20260228_admin_roadmap_feedback.sql',
  '20260306_analytics_funnel_events.sql',
  '20260313_admin_flow_diagram_state.sql',
];

const legacyReferenceMigrations = [
  '20260131_sample_quotes_seed.sql',
  '20260301_admin_roadmap_initial_sync_seed.sql',
  '20260302_admin_roadmap_autosync_rules.sql',
  '20260303_remote_history_placeholder.sql',
  '20260304_admin_roadmap_web_improvements_plan.sql',
  '20260305_admin_roadmap_go_live_20260228.sql',
  '20260306_admin_roadmap_execution_batch_home_v2.sql',
  '20260306_admin_roadmap_progress_embudo_performance.sql',
  '20260307_admin_roadmap_execution_dashboard_reporting.sql',
  '20260308_admin_roadmap_feedback_facturacion_v1.sql',
  '20260309_admin_roadmap_access_profiles_enterprise_client.sql',
  '20260310_remote_history_placeholder.sql',
  '20260311_admin_roadmap_sync_and_close_realized_items.sql',
  '20260312_admin_roadmap_sector_split_and_pending_flow.sql',
];

const listSqlFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
};

const printList = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title}`);
  items.forEach((item) => console.log(`- ${item}`));
};

const canonicalFiles = listSqlFiles(canonicalDir);
const legacyFiles = listSqlFiles(legacyDir);
const canonicalSet = new Set(canonicalFiles);
const legacySet = new Set(legacyFiles);
const criticalSet = new Set(productionCriticalMigrations);
const optionalOperationalSet = new Set(optionalOperationalMigrations);
const referenceSet = new Set(legacyReferenceMigrations);

const missingCritical = productionCriticalMigrations.filter(
  (file) => legacySet.has(file) && !canonicalSet.has(file),
);

const missingOptionalOperational = optionalOperationalMigrations.filter(
  (file) => legacySet.has(file) && !canonicalSet.has(file),
);

const duplicated = legacyFiles.filter((file) => canonicalSet.has(file));
const referenceOnly = legacyReferenceMigrations.filter((file) => legacySet.has(file) && !canonicalSet.has(file));
const unclassifiedLegacy = legacyFiles.filter(
  (file) =>
    !canonicalSet.has(file) &&
    !criticalSet.has(file) &&
    !optionalOperationalSet.has(file) &&
    !referenceSet.has(file),
);

console.log('Supabase migration audit');
console.log(`Canonical: ${path.relative(appRoot, canonicalDir)}`);
console.log(`Legacy reference: ${path.relative(appRoot, legacyDir)}`);
console.log(`Canonical migrations: ${canonicalFiles.length}`);
console.log(`Legacy reference migrations: ${legacyFiles.length}`);

printList('Already present in canonical and legacy', duplicated);
printList('Optional operational migrations missing from canonical', missingOptionalOperational);
printList('Reference-only legacy migrations. Do not bulk-apply to production.', referenceOnly);
printList('Unclassified legacy migrations. Review before launch.', unclassifiedLegacy);
printList('Production-critical migrations missing from canonical', missingCritical);

if (missingCritical.length > 0 || unclassifiedLegacy.length > 0) {
  console.error('\nMigration audit found launch blockers.');
  console.error('Action: audit and promote only the production-critical SQL needed by the live database.');
  console.error('Avoid bulk-copying legacy seed, roadmap, or placeholder migrations into production.');
  process.exit(1);
}

console.log('\nMigration folders are launch-clean.');
