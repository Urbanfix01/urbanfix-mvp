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

## Reglas obligatorias

1. Nunca trabajar directo en `master`.
2. Una tarea = una rama.
3. Antes de empezar, sincronizar con remoto.
4. No editar migraciones antiguas, crear migracion nueva.
5. No ejecutar ni editar SQL/migraciones desde `node_modules`.
6. Commits chicos y con scope claro.

## Protocolo Supabase (obligatorio)

Fuente unica de migraciones:
- `apps/web/lib/supabase/migrations`

Reglas:
- Todo cambio de DB se registra en una migracion nueva.
- No se editan migraciones historicas ya aplicadas.
- `PC2` y `Owner` no aplican cambios a produccion directo.
- Solo `PC1` ejecuta `supabase db push` contra el proyecto remoto.
- Queda prohibido usar archivos de `node_modules/.../migrations`.

Flujo `PC2` para cambios de DB:

```bash
git fetch origin
git switch master
git pull --ff-only origin master
git switch -c web/pc2-<tema-db>
cd apps/web
npx supabase migration new <nombre_cambio>
# editar el .sql generado en lib/supabase/migrations
git add lib/supabase/migrations/<timestamp>_<nombre_cambio>.sql
git commit -m "db: <cambio puntual>"
git push -u origin web/pc2-<tema-db>
```

Flujo `PC1` para aplicar a remoto:

```bash
git fetch origin
git switch master
git pull --ff-only origin master
cd apps/web
npx supabase db push
```

Si hubo SQL manual en dashboard (emergencia):
- `PC1` debe crear migracion espejo el mismo dia.
- Esa migracion se sube por PR y se documenta en Admin/Roadmap.

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

## Convencion de comentarios de Roadmap

- `[PC1] avance tecnico ...`
- `[PC2] avance tecnico ...`
- `[Owner] feedback funcional ...`

Formato recomendado:
- `Que cambie`
- `Que falta`
- `Riesgo o bloqueo`
