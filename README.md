# UrbanFix MVP

## Fuente de verdad

La web activa vive en `apps/web`.
La app movil activa vive en `apps/mobile`.

No trabajar ni desplegar desde estas carpetas:

- `UrbanFix/`
- `UrbanFix_base_latest/`
- `urbanfix-main-clean/`
- `urbanfix-mvp/`
- `tmp_sync_client_map_v1/`
- `tmp/`

Esas carpetas son copias, snapshots o artefactos locales y no son la fuente de verdad.

## Documentacion

La documentacion operativa y los resúmenes tecnicos viven en `docs/`.

En particular, todo el material historico de la integracion de Location Picker quedó agrupado en `docs/location-picker/`.

## Flujo de trabajo movil

Antes de empezar una tarea en mobile:

```bash
git pull --ff-only origin main
```

Para correr la app movil desde la raiz:

```bash
npm run mobile:start
```

Atajos utiles:

```bash
npm run mobile:ios
npm run mobile:android
npm run mobile:typecheck
```

Para demo rapido:

```bash
npm run mobile:demo:android
npm run mobile:demo:ios
npm run mobile:demo:ios:submit
```

El flujo recomendado de demo es:

- Android: APK por link abierto.
- iPhone: TestFlight con enlace publico.

La guia operativa completa vive en `docs/mobile-demo-distribution.md`.

La configuracion de Expo/EAS para iOS y Android vive en `apps/mobile`.

## Flujo de trabajo web

Antes de empezar una tarea:

```bash
git pull --ff-only origin main
```

Para correr la web desde la raiz:

```bash
npm run web:dev
```

Para validar el deploy localmente:

```bash
npm run web:build
```

Para ejecutar el flujo completo de deploy web desde la raiz:

```bash
npm run web:deploy
```

Para revisar el estado sin empujar ni promover nada:

```bash
npm run web:deploy:dry
```

## Deploy

- Proyecto web: `urbanfix-web`
- App a desplegar: `apps/web`
- Branch habilitada para deploy automatico: `main`

Si hay cambios locales sin subir, no lanzar deploy manual desde una copia vieja del repo.

El script `web:deploy` hace este recorrido:

- valida Git y autenticacion de Vercel,
- corre `npm run web:build`,
- empuja `main`,
- espera el preview nuevo,
- lo promueve a produccion,
- verifica que `www.urbanfix.com.ar` quede apuntando al deployment nuevo.
