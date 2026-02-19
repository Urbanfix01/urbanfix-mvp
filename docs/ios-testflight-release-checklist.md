# iOS TestFlight Release Checklist

Checklist operativo para preparar y publicar una release iOS en TestFlight.

## Scope

- Aplicable a `Release iOS 1.3.0 a TestFlight`.
- Cierre funcional final: `Owner + PC1`.
- Este checklist reduce errores de version/build y subida.

## Paso 1: preparar version/build

1. Editar `apps/mobile/app.json`:
- `expo.version` en formato `X.Y.Z` (ejemplo `1.3.0`).
- `expo.ios.buildNumber` incremental (ejemplo de `6` a `7`).
2. Confirmar `expo.ios.bundleIdentifier` correcto.

## Paso 2: preflight local

Desde la raiz del repo:

```bash
npm run release:ios:preflight -- --target-version 1.3.0 --target-build 7
```

Si falla, corregir `app.json`/`eas.json` antes de continuar.

## Paso 3: validacion tecnica minima

```bash
npx --prefix apps/mobile tsc --noEmit
```

Si hay errores, no subir build.

## Paso 4: build iOS en EAS

```bash
npx --prefix apps/mobile eas build --platform ios --profile production
```

Guardar URL/ID del build en el comentario de roadmap.

## Paso 5: submit a TestFlight

```bash
npx --prefix apps/mobile eas submit --platform ios --profile production
```

Confirmar en App Store Connect:
- build recibido,
- procesamiento completo,
- visible en TestFlight interno.

## Paso 6: registro en roadmap

Agregar feedback con prefijo:
- `[PC1]` resultado build/submit,
- `[Owner]` validacion funcional.

Mover tarjeta a `done` solo cuando:
1. Build subido sin error.
2. TestFlight visible para testers.
3. Owner valida criterio funcional.
