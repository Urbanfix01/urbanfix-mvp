# UrbanFix MVP

## Fuente de verdad

La web activa vive en `apps/web`.

No trabajar ni desplegar desde estas carpetas:

- `UrbanFix/`
- `UrbanFix_base_latest/`
- `urbanfix-main-clean/`
- `urbanfix-mvp/`
- `tmp_sync_client_map_v1/`
- `tmp/`

Esas carpetas son copias, snapshots o artefactos locales y no son la fuente de verdad.

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

## Deploy

- Proyecto web: `urbanfix-web`
- App a desplegar: `apps/web`
- Branch habilitada para deploy automatico: `main`

Si hay cambios locales sin subir, no lanzar deploy manual desde una copia vieja del repo.
