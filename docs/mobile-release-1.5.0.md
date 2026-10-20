# UrbanFix Mobile 1.5.0

## Release boundary

Prepared on 2026-10-20 for the existing Expo project
`834bb60b-4d87-4372-9495-7d3b48b30b4b`.

- Android: `com.urbanfix.app`, signed store bundle, internal testing first.
- iOS: `com.urbanfix.urbanfix`, signed store build, TestFlight only.
- Remote build numbers increment through EAS; do not reuse a previous binary.
- No production web deployment, database migration or price publication.

The user requested production updates, then confirmed that physical-device QA
has not been performed and selected preparation for testing. Public Android
submission remains on hold until that validation is complete. Do not submit
this version to Apple App Store review as part of the TestFlight request.

## Included changes

- Native project creation, shared immutable project history and integrated
  drawing/3D/quotation workbench, without redirecting to the external browser.
- Material and labor preview assets in the original mobile catalog layout.
- Shared mobile headers, controls, typography and spacing.
- Operational map using the current authenticated read-only server workflow,
  valid coordinates, controlled selection and location privacy.
- Optional operational location and social links in the technician profile,
  compatible owner-scoped updates, without changing publication permissions.

## Preflight observations

EAS session and project access were verified. Latest inspected store builds:
Android 1.4.5 (18), iOS 1.4.5 (37). These are dated build observations, not
proof of the currently available store release or TestFlight processing state.

Production variables exist for the public web URL and public Supabase client
configuration. No Google Maps key was found in production project or account
variables. Android's existing missing-key guard keeps the app usable but does
not provide native cartography without a configured key. Configure
`EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` on Expo, restricted to this Android
package and the appropriate signing certificate, before map QA/public release.
Do not copy a browser-restricted key or put private signing credentials in Git.

Automated verification before version preparation passed: TypeScript, 42 unit
and contract tests, map/browser flows at mobile and desktop widths, live web
cartography with simulated requests, and Android/iOS JavaScript exports.
These exports are not signed installers or physical-device verification.

## Device QA before public Android release

- Sign in, sign out, switch accounts and verify owner-scoped project history.
- Save a profile with optional location/social fields empty, then populated.
- Open the operative map, select a request, pan/zoom and verify privacy labels.
- Create a project, draw/edit/undo, inspect and rotate the 3D view.
- Check catalog previews and the matching material 3D view.
- Review prices and pending-price guards, save a QA quote and reopen history.
- Restart the app; verify local drafts, confirmed sync and OS file sharing.
- Check foreground location permission denied/granted and offline recovery.

Use a dedicated QA account and test records, not live customer budgets.

## Release notes

Diseno y presupuestos de proyectos integrados en la app. Nuevas vistas de
materiales y trabajos en el catalogo. Interfaz unificada y mejoras en el mapa
operativo, la seleccion de solicitudes y el guardado de proyectos.

Build and submission IDs and actual outcomes must be recorded after EAS
confirms them; preparation does not mean publication or TestFlight availability.
