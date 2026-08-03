const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

const failures = [];
const checks = [];

const requireMarkers = (label, source, markers) => {
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    failures.push(`${label}: falta ${missing.join(', ')}`);
    return;
  }
  checks.push(label);
};

const forbidMarkers = (label, source, markers) => {
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    failures.push(`${label}: contiene ${present.join(', ')}`);
    return;
  }
  checks.push(label);
};

const sitemap = read('app/sitemap.ts');
const profilePage = read('app/tecnico/[id]/page.tsx');
const profileValidity = read('lib/public-profile-validity.ts');
const report = read('docs/google-indexacion-perfiles-2026-08-03.md');

requireMarkers('Sitemap comparte la regla de visibilidad pública', sitemap, [
  'isPublicProfileVisible',
  'isPublicProfileVisible(row)',
  '.or("profile_published.is.null,profile_published.eq.true")',
  'service_lat',
  'service_lng',
  'specialties',
  'phone',
  'country',
]);

requireMarkers('Sitemap usa fechas reales del perfil', sitemap, [
  'updated_at',
  'created_at',
  'toLastModified',
  'Number.isNaN(date.getTime())',
]);

forbidMarkers('Sitemap no anuncia fechas ficticias ni reglas antiguas', sitemap, [
  'lastModified: new Date()',
  '.eq("profile_published", true)',
  'hasWorkZoneConfigured',
]);

requireMarkers('Perfil expone SEO canónico e indexable sólo cuando es válido', profilePage, [
  'isPublicProfileVisible(profile)',
  'alternates: { canonical: canonicalUrl }',
  'robots: { index: true, follow: true }',
  'metadataTitle',
  'truncateSeoDescription',
]);

requireMarkers('Datos estructurados usan contexto internacional real', profilePage, [
  "'@type': 'Person'",
  "'@id': `${canonicalUrl}#profile`",
  'normalizePublicWhatsappPhone',
  'addressCountry: addressCountry || undefined',
  'jobTitle: primarySpecialty',
]);

forbidMarkers('Perfil no fija Argentina ni duplica la marca en el título HTML', profilePage, [
  "addressCountry: 'AR'",
  "const titleParts = [displayName, city ? `Tecnico en ${city}` : '', 'UrbanFix']",
]);

requireMarkers('Regla de perfil completo conserva requisitos reales', profileValidity, [
  'hasPublicContact',
  'hasPublicSpecialty',
  'hasPublicWorkZone',
  'hasPublicExactLocation',
  'getPublicProfileMissingLabels(profile).length === 0',
]);

const canonicalUrls = [...report.matchAll(/https:\/\/www\.urbanfix\.com\.ar\/tecnico\/[a-z0-9-]+/g)].map(
  (match) => match[0]
);
const uniqueCanonicalUrls = new Set(canonicalUrls);

if (canonicalUrls.length !== 9 || uniqueCanonicalUrls.size !== 9) {
  failures.push(
    `Registro de indexación: se esperaban 9 URLs canónicas reales y únicas; hay ${canonicalUrls.length} (${uniqueCanonicalUrls.size} únicas)`
  );
} else {
  checks.push('Registro de indexación contiene 9 URLs canónicas reales y únicas');
}

requireMarkers('Registro documenta el límite 9/10 sin simular el décimo perfil', report, [
  '**9/10 perfiles públicos completos**',
  'no devolvió resultados individuales',
  'No se completaron campos de usuario ni se generaron perfiles o métricas sintéticas.',
]);

forbidMarkers('Registro no conserva el dominio obsoleto', report, ['urbanfixar.com']);

if (checks.length > 0) {
  console.log('\nOK');
  checks.forEach((check) => console.log(`- ${check}`));
}

if (failures.length > 0) {
  console.error('\nFAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`\nProfile indexing audit failed: ${failures.length} bloqueo(s).`);
  process.exit(1);
}

console.log('\nProfile indexing audit passed. Estado documentado: 9/10 perfiles reales.');
