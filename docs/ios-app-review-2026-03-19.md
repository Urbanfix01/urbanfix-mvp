# iOS App Review - March 19, 2026

## Context

Apple rejected the iOS submission reviewed on March 17, 2026 for two reasons:

1. Sign in with Apple was followed by a required profile step that Apple interpreted as asking again for identity data.
2. App Review did not have working access to both account types: `Tecnico` and `Cliente`.

The current mobile source of truth is `apps/mobile`.

## App Review Information

Use this block in App Store Connect > App Review Information.

```text
Review device used previously: iPad Air 11-inch (M3)

This app supports two account types:
1. Cliente
2. Tecnico

Please use the following demo accounts to review all features.

Cliente demo
Email: [CLIENT_DEMO_EMAIL]
Password: [CLIENT_DEMO_PASSWORD]

Tecnico demo
Email: [TECH_DEMO_EMAIL]
Password: [TECH_DEMO_PASSWORD]

Review steps
1. Open the app.
2. On the first screen, choose the audience:
   - "Cliente" for customer features
   - "Tecnico" for technician features
3. Tap "Ingresar".
4. Sign in using the demo credentials above.

Cliente review path
- Open "Solicitudes" to review existing requests and responses.
- Open "Publicar" to create a new request.
- Open "Mapa" to review technician availability and map-related features.
- Open "MiPerfil" to review account and support options.

Tecnico review path
- Open "Panel" to review quotes and dashboard items.
- Open "Agenda" to review scheduled work.
- Open "Operativo" to review the operational map.
- Open "Notificaciones" to review alerts.
- Open "Perfil" to review profile and account options.

Sign in with Apple
- Sign in with Apple is available on iOS.
- Users are not required to re-enter their name or email after Apple authentication.
- Any remaining profile fields are operational profile fields and not part of authentication.
```

## Response To Apple

Use this as the reply in App Store Connect after uploading the new build.

```text
Hello,

Thank you for the review.

We updated the Sign in with Apple flow so users are no longer required to re-enter their name or email after authentication. Any remaining fields are operational profile fields and are not part of the authentication flow.

We also provided working demo credentials for both supported account types in App Review Information so your team can access and test all major features:
- Cliente
- Tecnico

The app is ready for re-review.

Thank you.
```

## Internal Checklist Before Resubmission

1. Confirm the mobile app being built is `apps/mobile`.
2. Run `npm run mobile:typecheck`.
3. Test Sign in with Apple on iOS with a fresh account.
4. Confirm Apple sign-in does not require name or email after authentication.
5. Confirm `Cliente` can enter the app with only operational data requirements.
6. Confirm `Tecnico` can enter the app with only operational data requirements.
7. Verify both demo accounts are active and not blocked by OTP, email confirmation, or missing profile access.
8. Build and submit a new iOS build through EAS.
