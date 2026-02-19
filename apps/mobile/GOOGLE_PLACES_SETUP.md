# Google Places: desbloqueo rapido (UrbanFix)

Esta app usa Places desde mobile en:
- `apps/mobile/src/components/molecules/LocationAutocomplete.tsx`

Variables que consume:
- `EXPO_PUBLIC_PLACES_API_KEY` (preferida para mobile)
- `EXPO_PUBLIC_IOS_API_KEY` (fallback)
- `EXPO_PUBLIC_ANDROID_API_KEY` (fallback)
- `EXPO_PUBLIC_WEB_API_KEY` (web)

## 1) Checklist Google Cloud

1. Habilitar **Billing** en el proyecto de Google Cloud.
2. Habilitar APIs:
- Places API
- Maps JavaScript API (solo si usas autocomplete web)
3. Revisar restricciones de key:
- iOS key: restriction `iOS apps`, bundle `com.urbanfix.urbanfix`
- Android key: restriction `Android apps`, package `com.urbanfix.app` + SHA-1
- Web key: restriction `HTTP referrers` (dominio prod + localhost)
4. Si sigue `REQUEST_DENIED`, probar una key temporal sin restricciones para diagnostico.

## 2) Verificar desde terminal

En `apps/mobile`:

```bash
npm run places:check -- --key=TU_API_KEY
```

Opcional:

```bash
npm run places:check -- --key=TU_API_KEY --query="Pe" --country=ar
```

Si devuelve `REQUEST_DENIED`, el problema es de configuración en Google Cloud (billing/restricciones/API).

## 3) EAS / entorno de build

Para builds de EAS, confirmar variables en entorno `production`:
- `EXPO_PUBLIC_PLACES_API_KEY`
- `EXPO_PUBLIC_IOS_API_KEY`
- `EXPO_PUBLIC_ANDROID_API_KEY`
- `EXPO_PUBLIC_WEB_API_KEY` (si aplica)

Luego regenerar build.

