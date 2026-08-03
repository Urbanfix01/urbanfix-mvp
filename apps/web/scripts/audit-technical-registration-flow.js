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

const registration = read('lib', 'auth', 'technical-registration.ts');
const technicians = read('app', 'tecnicos', 'page.tsx');
const authHash = read('components', 'AuthHashHandler.tsx');
const authBridge = read('components', 'AuthSessionBridge.tsx');
const emailValidation = read('app', 'api', 'auth', 'validate-email', 'route.ts');
const analyticsSummary = read('app', 'api', 'admin', 'analytics', 'summary', 'route.ts');
const admin = read('app', 'admin', 'page.tsx');
const home = read('app', 'page.tsx');
const portal = read('components', 'PortalAccessHub.tsx');
const technicianDashboard = read('components', 'TechnicianDashboard.tsx');

requireMarkers(registration, 'technical-registration.ts', [
  'TechnicalRegistrationAttempt',
  'TECHNICAL_REGISTRATION_ATTEMPT_TTL_MS',
  "mode: 'register'",
  'attemptId',
  'accessProfile',
  'source',
  'method',
  'consumeTechnicalRegistrationAttempt',
  'isUserCreatedDuringTechnicalRegistrationAttempt',
]);

[
  'technical_registration_started',
  'technical_registration_method_selected',
  'technical_registration_submitted',
  'technical_registration_validation_failed',
  'technical_registration_confirmation_required',
  'technical_registration_existing_account',
  'technical_registration_failed',
  'technical_registration_completed',
].forEach((eventName) => {
  if (!technicians.includes(eventName) && !authBridge.includes(eventName)) {
    failures.push(`falta instrumentar ${eventName}`);
  }
});

requireMarkers(technicians, 'tecnicos/page.tsx', [
  'Crear cuenta con Google',
  'Ingresar con Google',
  'Crear con correo',
  'showRegistrationEmail',
  'normalizePublicWhatsappPhone',
  'getStoredCountryPreference',
  'emailRedirectTo',
  'returnedIdentities',
  "disabled={authLoading || googleAuthLoading}",
]);

requireMarkers(authBridge, 'AuthSessionBridge.tsx', [
  "attempt.method !== 'google'",
  'hasPendingAuthCallback',
  'technical_registration_existing_account',
  'technical_registration_completed',
  'consumeTechnicalRegistrationAttempt',
]);

requireMarkers(authHash, 'AuthHashHandler.tsx', [
  'applyIntendedAccessProfile',
  'getAuthAccessProfileIntent',
  "new URLSearchParams(window.location.search).get('recovery') === '1'",
]);
if (authHash.includes("basePath === '/' && !!code")) {
  failures.push('AuthHashHandler no debe tratar todo code en / como recuperación.');
}

requireMarkers(emailValidation, 'validate-email/route.ts', [
  'readLimitedJsonBody',
  'enforceRateLimit',
  'domain_not_found',
  'dns_temporarily_unavailable',
  "valid: true",
]);
if (emailValidation.includes('request.json()')) {
  failures.push('validate-email no debe leer JSON sin límite.');
}

requireMarkers(analyticsSummary, 'analytics/summary/route.ts', [
  'getTechnicalRegistrationJourneyKey',
  'attempt_id',
  'summarizeTechnicalRegistrationAttempts',
  'listAllAuthUsers',
  'summarizeTechnicalAuthAccounts',
  'instrumentationCoverage',
]);
requireMarkers(admin, 'admin/page.tsx', [
  'Fuente real · Supabase Auth',
  'Cuentas atribuidas',
  'instrumentationCoverage',
]);
requireMarkers(home, 'app/page.tsx', ['source=home']);
requireMarkers(portal, 'PortalAccessHub.tsx', ['source=portal']);
requireMarkers(technicianDashboard, 'TechnicianDashboard.tsx', ['source=technician_dashboard']);

if (failures.length > 0) {
  console.error('Flujo de registro técnico incompleto:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Flujo de registro técnico sin bloqueos.');
