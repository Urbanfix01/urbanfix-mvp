# Mobile Project Workspace

## Source And Release Boundary

The mobile application lives in `Urbanfix01/urbanfix-mvp`, `apps/mobile`.
Use `main`, not the stale default branch `master`. Expo's last inspected
Android production build was `20bd6244-36fb-4919-b5bf-6b18a99e65ba`:
version 1.4.5, version code 18, source `6518aed732d1cbfbd93c274c16bb60da8b81acfc`.
This feature is based on `main` at `813ddf54f798fb15964a78275adf4ae13ed09c86`,
which retains the mobile changes following that release. Recheck Expo and Play
Console before every store release; these are dated observations, not permanent
version numbers.

The current production web source is a different repository:
`Urbanfix01/urbanfix_web`. Do not deploy this monorepo's old `apps/web` as part
of a mobile release. No production web files or store releases are changed by
the project workspace implementation.

## Scope

- Technician navigation: Projects, Panel, Agenda, Operativo, More.
- More retains the native price catalog, map, notifications and profile.
- Existing client mode, profile completion and authentication remain intact.
- Projects can be created natively in four steps, with an optional existing
  client reference, optional site coordinates, and a rectangular reference lot.
- Foreground GPS is requested only on an explicit action. Manual coordinates
  and an address-only project are supported. No background tracking or
  automatic cadastral/normative conclusions are made.
- Native project details show a reference plan, metadata, versions and private
  JSON export. This is not an independently implemented 3D or price engine.
- Plan editing, construction calculations, 3D and client PDF delivery continue
  in the canonical web application. The system browser opens the own-account
  history filtered by project and editor. Web login may be required. There is
  no token in the URL, embedded authenticated WebView, automatic draft merge,
  or claim of single sign-on. The web's existing protected restore confirmation
  remains authoritative. Multiple versions must still be reviewed by the user.

## Storage And Permissions

`src/projects/projectWorkspace.ts` creates version 1 `house-drawing` documents
in meters, using the web's empty-plan contract. It does not copy construction
coefficients or introduce estimated prices. New plans have no assigned costs.

Each local snapshot has an independent AsyncStorage key partitioned by owner
UUID and country. Full snapshots are immutable and SHA-256 verified; lightweight
indexes track backup status. An interrupted index write can be recovered from
the durable snapshot. No old history is pruned or overwritten. Opened cloud
versions are scope/format validated and cached for later offline use. PostgreSQL
JSONB can reorder object keys: the web's original digest remains a version
identifier, and a separate device checksum protects the retrieved local copy.
It is not a cryptographic signature of remote contents. Device storage remains
finite and can be lost if the app is uninstalled; backup status and private
export matter. Local storage is app-private storage, not encrypted archival
storage and not a replacement for a confirmed cloud backup.

The existing Supabase `design_project_history` table and
`design_project_latest` view provide the shared history. Queries are scoped by
authenticated owner and country. Inserts are immutable; duplicate IDs must
match the stored digest. Existing own-account RLS is required. No migration,
service-role client key, policy relaxation, tariff publication or public sharing
is included. Client lookups read only the signed-in technician's directory;
documents retain the selected name and ID, not the entire contact directory.

Cloud tests use fixtures, not real client records. A physical-device test with
a dedicated QA account is required to confirm live RLS, permissions, OS sharing,
OAuth and web handoff before production submission.

## Local Verification

Run from `apps/mobile`, which has its own lockfile:

```sh
npm ci
npm run test:projects
npm run typecheck
npm run check:bundles
npm run web -- --port 8082
```

Use public anonymous/publishable Supabase configuration from the existing
deployment. Never put a service-role key, signing password or private token in
`EXPO_PUBLIC_*`, Git or chat. Runtime configuration follows the existing
`src/lib/supabase.ts`; no hardcoded connection fallback is added.

Optional isolated UI smoke test, after starting Expo Web with fixture-only
configuration:

```sh
node tests/projectFlow.browser.mjs
```

Set `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to local installed
paths. The test blocks every external request except its in-memory Supabase
fixtures and checks 320, 390 and 768 px viewports. Its auth fixture exists only
in the test process, never in the shipped application. Screenshots go to ignored
`dist/mobile-smoke`. Native bundles are not APK/AAB/IPA installers or evidence
of a physical-device test.

## Preview And Production

The `preview` EAS profile uses `APP_VARIANT=preview`, internal distribution and
an Android APK. The existing `app.config.ts` derives separate preview identifiers
while preserving Supabase and Google Maps configuration:

- Android: `com.urbanfix.app.preview`
- iOS: `com.urbanfix.urbanfix.preview`
- URL scheme: `urbanfix-preview`
- Display name: UrbanFix Prueba

The default production identifiers remain `com.urbanfix.app` and
`com.urbanfix.urbanfix`. Production version sources and automatic build-number
management are unchanged. No production signing credentials are replaced.
Preview OAuth needs its own allowed callback
`urbanfix-preview://auth/callback`; use the existing email/password flow until
that callback is explicitly configured. Preview signing and Apple capabilities
may also need first-time setup in the owner's account.

```sh
eas build --platform android --profile preview
```

Do not run submit, auto-submit, production build or an OTA publish as a side
effect of testing. There is no configured OTA delivery for this feature. After
device and dedicated-account verification, review the diff and store version
state, then explicitly prepare a signed store build and submit separately.
iOS requires an Apple account and a macOS/EAS build; an Android APK does not
update iOS or Play Store installations.
