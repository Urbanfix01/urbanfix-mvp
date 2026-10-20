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

## Build and submission record

Source: `6289fe944726f2404394de472bc43cc4d7ed6d88`, pushed to
`codex/mobile-projects-current`, in
[draft PR 3](https://github.com/Urbanfix01/urbanfix-mvp/pull/3).
The 42 unit/contract tests and TypeScript were repeated successfully on this
source. No private signing credentials were downloaded or replaced.

| Platform | Version | Build ID | Outcome |
| --- | --- | --- | --- |
| iOS | 1.5.0 (38) | `f4e1b9c2-2e02-45fd-b3b0-df9a700cf7c8` | Signed build finished |
| Android | 1.5.0 (19) | `d25ade25-ad6e-4cc4-8b7d-87801127be5b` | Signed build finished |

[iOS build](https://expo.dev/accounts/urbanfix/projects/UrbanFix/builds/f4e1b9c2-2e02-45fd-b3b0-df9a700cf7c8)
and [Android build](https://expo.dev/accounts/urbanfix/projects/UrbanFix/builds/d25ade25-ad6e-4cc4-8b7d-87801127be5b)
belong to the existing production application identifiers, not the preview app.

The TestFlight submission
[`af75bd7a-01ef-49ce-b450-cbf686b48cd7`](https://expo.dev/accounts/urbanfix/projects/UrbanFix/submissions/af75bd7a-01ef-49ce-b450-cbf686b48cd7)
failed: EAS reports a required Apple agreement missing or expired. Earlier
read-only ASC/provisioning checks also returned HTTP 401. Do not assume the
private key must be replaced: resolve the reported agreement first, then
recheck access. No build was made available to TestFlight testers by this
attempt. The assistant did not accept legal agreements on the owner's behalf.

The Android submission
[`4b254bf6-6d34-476c-868c-07ba91bf6dec`](https://expo.dev/accounts/urbanfix/projects/UrbanFix/submissions/4b254bf6-6d34-476c-868c-07ba91bf6dec)
was verified as `FINISHED`, track `internal`, release status `COMPLETED`.
EAS confirmed successful submission to Google Play. This is not a production
rollout, proof of tester membership, or confirmation of installation on a
physical device. The internal build still has the documented Android Maps
configuration limitation. No public release was submitted.

For installation, the owner can open Play Console > Probar y publicar >
Pruebas > Prueba interna > Testers, verify the intended tester list and copy
the opt-in link. No existing tester list was changed by the assistant.
See the [Google Play testing guide](https://support.google.com/googleplay/android-developer/answer/9845334?hl=es).

The iOS submission was separately verified as `ERRORED`, with error code
`EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. Do not report that build as
available in TestFlight until a later submission and Apple processing succeed.

After the user reported Maps already configured, project variables were checked
again in production, preview and development, and production account variables
were checked separately. No Maps key was listed in this Expo project/account.
The user was asked to verify the exact project and production environment,
without exposing the key value. No existing key was copied or unrestricted.

## Acciones pendientes del titular

1. Revisar y aceptar los acuerdos requeridos en
   [App Store Connect](https://appstoreconnect.apple.com/business) y, si Apple
   lo solicita, la licencia en [Apple Developer](https://developer.apple.com/account/).
   Despues se puede reintentar el envio del build iOS 38 sin regenerar la app.
   Si persiste el 401, revisar el acceso de la clave ASC en Expo siguiendo la
   [guia oficial de envio iOS](https://docs.expo.dev/submit/ios/).
2. Configurar la clave Android de Maps en el entorno `production` de Expo,
   restringida a `com.urbanfix.app` y a la huella SHA-1 de firma de la app en
   Google Play. La firma de Google Play puede diferir de la clave de subida;
   usar la huella de firma de distribucion, no asumir que son la misma.
   Consultar [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756).
   Este build 19 se preparo sin esa clave y no sirve para validar cartografia
   Android; habilitarla requiere un nuevo build.
3. Probar con una cuenta QA en dispositivos reales. Promover Android al canal
   publico solo despues de esa validacion y la confirmacion del usuario.

No pegar contrasenas, claves privadas ni archivos de firma en el chat o Git.
