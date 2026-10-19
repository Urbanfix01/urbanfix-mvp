# Mobile Project Workspace Verification

Story: a technician creates a project on a phone, saves an account/country-scoped
local snapshot, backs it up to the shared history, and continues in the web
history without overwriting an existing browser draft.

## Confirmed Locally

- `npm run typecheck`: passes on the current `main`-based mobile source.
- `npm run test:projects`, with `URBANFIX_WEB_ROOT` pointing at canonical web
  commit `3b2e496e08bd542787c30d28c02d510803c7f77e`: 15 tests pass. Includes
  actual web normalization, ownership/country isolation, offline retry,
  interrupted index recovery, immutable snapshots, key-reordered JSONB caching,
  local integrity checks, and allowlisted token-free web links.
- Isolated React Native Web flow: passes at 320, 390 and 768 px. Covers an
  existing-client selection, address/manual coordinates, 22 x 33 m lot, creation,
  confirmed fixture backup, native version list, private JSON download,
  project-filtered browser handoff and recovery after reload with failed cloud
  reads. No uncaught runtime errors or page-width overflow. All nonlocal network
  access is intercepted; no real clients or business records were modified.
- Android and iOS Hermes bundle export: passes. This verifies JavaScript and
  asset resolution, not native installation or hardware permissions.
- Expo public configuration: preview uses `UrbanFix Prueba`,
  `com.urbanfix.app.preview`, `com.urbanfix.urbanfix.preview`,
  `urbanfix-preview`; production identifiers remain unchanged.
- Preview initially had no environment configuration. The existing canonical
  backend URL and verified public anonymous key were configured for the Preview
  environment only. No service-role key, signing key, private data or production
  environment changes were used. Preview uses the same backend, so dedicated QA
  accounts and disposable projects are required for live tests.

## Required Before Store Submission

- Physical-device Android QA and an iOS/TestFlight build/test.
- Live own-account history and client lookup verification with a QA account,
  including denied cross-account access and a real JSONB round trip.
- Native foreground GPS permission denial/timeout/accuracy, OS JSON sharing,
  Android back navigation, and returning from the browser editor.
- Preview OAuth callback allowlist and preview Google Maps package/certificate
  restrictions. These are not silently widened by this change. Email/password
  login is available in the existing application.
- Dependency security review. `npm audit --omit=dev` reported 60 advisories
  (1 low, 22 moderate, 35 high, 2 critical) in the inherited dependency tree.
  Critical findings trace to `tar@7.5.7` through Expo CLI and
  `shell-quote@1.8.3` through React Native devtools. No advisory was reported
  against the three added Expo modules. This is not a blanket safety approval;
  no `npm audit fix --force` or major framework upgrades were applied.
- Recheck latest store/EAS build numbers and signing before an explicit
  production build or submission. No store submission or OTA publication was
  performed as part of these checks.

Browser screenshots and bundle outputs are ignored local artifacts under
`apps/mobile/dist`, not committed fixtures containing customer information.
