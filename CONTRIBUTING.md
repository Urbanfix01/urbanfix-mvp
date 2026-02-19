# Contributing Guide (PC1 + PC2 + Owner)

Este proyecto se mantiene desde varias PCs. Este documento define el protocolo
obligatorio para evitar pisadas, conflictos y deploys inseguros.

## Objetivo

- Mantener `master` estable.
- Trabajar en paralelo sin pisarse.
- Tener trazabilidad de cambios tecnicos y de producto.

## Roles

- `PC1` (integracion): integra PRs, ejecuta deploys y valida release final.
- `PC2` (feature): desarrolla tareas en ramas aisladas y abre PR.
- `Owner` (producto/QA): define prioridad, valida funcionalmente y aprueba cierre.

## Fuente de verdad: Admin Roadmap

La coordinacion diaria se hace en `admin > Roadmap`.

Cada tarea debe tener:
- `status`: `planned`, `in_progress`, `blocked`, `done`
- `owner`: `PC1`, `PC2`, `Owner` o combinacion
- comentario de avance con prefijo: `[PC1]`, `[PC2]`, `[Owner]`

Regla:
- Si empezas una tarea, primero cambiar a `in_progress`.
- Si te bloqueas, pasar a `blocked` y explicar causa concreta.
- Si terminas, pasar a `done` y comentar que validaste.

## Regla automatica de Roadmap

- Toda tarea nueva de roadmap debe incluir feedback inicial (obligatorio).
- Si hay cambios de codigo que no quedaron registrados en roadmap, se crea/actualiza tarjeta `AUTO` automaticamente.
- Cada sincronizacion `AUTO` agrega feedback tecnico con rama, commit y cantidad de archivos.

Auto-sync disponible por 2 vias:
- Hook local `pre-push` (si hay token configurado).
- GitHub Action (`.github/workflows/roadmap-auto-sync.yml`) en push/PR.

Variables necesarias en cada PC (o en GitHub Secrets):
- `ROADMAP_AUTOSYNC_URL` (endpoint `.../api/admin/roadmap/auto-sync`)
- `ROADMAP_AUTOSYNC_TOKEN`

## Reglas obligatorias

1. Nunca trabajar directo en `master`.
2. Una tarea = una rama.
3. Antes de empezar, sincronizar con remoto.
4. No editar migraciones antiguas, crear migracion nueva.
5. No ejecutar ni editar SQL/migraciones desde `node_modules`.
6. Commits chicos y con scope claro.

## Nomenclatura de ramas

- Web: `web/pc1-<tema>` o `web/pc2-<tema>`
- Mobile: `mobile/pc1-<tema>` o `mobile/pc2-<tema>`
- Ops/infra: `ops/<tema>`

Ejemplos:
- `web/pc1-roadmap-sync`
- `mobile/pc2-direcciones-autocomplete`

## Flujo diario (PC1/PC2)

```bash
git fetch origin
git switch master
git pull --ff-only origin master
git switch -c web/pc2-<tema>
```

Trabajar -> validar -> push:

```bash
git add <archivos>
git commit -m "web: <cambio puntual>"
git push -u origin web/pc2-<tema>
```

Despues abrir PR y actualizar Roadmap con link o nombre de rama.

## Integracion a master (PC1)

```bash
git fetch origin
git switch master
git pull --ff-only origin master
git switch web/pc2-<tema>
git rebase master
git switch master
git merge --ff-only web/pc2-<tema>
git push origin master
```

Si `--ff-only` falla, resolver historia/conflictos antes de mergear.

## Validaciones minimas antes de push

Para `apps/web`:

```bash
cd apps/web
npm run lint
npm run build
```

Para `apps/mobile` (minimo):

```bash
cd apps/mobile
npx tsc --noEmit
```

Hook local `pre-push`:
- Si detecta cambios en `apps/web`, ejecuta automaticamente `npm --prefix apps/web run lint` y `npm --prefix apps/web run build`.
- Si falla alguna validacion web, bloquea el push.
- Si detecta cambios en `apps/mobile`, muestra recordatorio para correr `npx --prefix apps/mobile tsc --noEmit`.

## Checklist pre-push

1. Rama correcta (nunca `master`).
2. Task en Roadmap en `in_progress`.
3. Validaciones del modulo tocado en OK.
4. Sin archivos temporales.
5. Commit claro.
6. Push + PR.
7. Comentario en Roadmap con resumen corto.

## Deploy

- Solo `PC1` ejecuta deploy a produccion.
- Se deploya solo codigo que ya esta mergeado a `master`.
- Si hay migraciones nuevas, aplicarlas antes de validar feature en produccion.
- Para QA previo a release, usar checklist compartido:
  `docs/qa-cross-release-checklist.md`.

## Convencion de comentarios de Roadmap

- `[PC1] avance tecnico ...`
- `[PC2] avance tecnico ...`
- `[Owner] feedback funcional ...`

Formato recomendado:
- `Que cambie`
- `Que falta`
- `Riesgo o bloqueo`
