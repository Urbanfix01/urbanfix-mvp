# Contributing

Este repositorio se trabaja en paralelo entre varias PCs. El objetivo es evitar colisiones y mantener `master` estable.

## Regla principal

- Nunca hacer push directo a `master`.
- Todo cambio se integra por Pull Request (PR).

## Convencion de ramas

- Web PC principal: `web/pc1-<tema>`
- Web PC secundaria: `web/pc2-<tema>`
- Mobile PC principal: `mobile/pc1-<tema>`
- Mobile PC secundaria: `mobile/pc2-<tema>`

## Flujo obligatorio antes de push

```bash
cd UrbanFix
git fetch origin
git switch master
git pull --rebase origin master
git switch -c web/pc2-<tema>
```

Hacer cambios solo en el scope de la tarea.

Validar web:

```bash
cd apps/web
npm run lint
npm run build
cd ../..
```

Commit:

```bash
git status
git add apps/web
git commit -m "web: <descripcion corta>"
```

Sincronizar antes de push:

```bash
git fetch origin
git rebase origin/master
git push -u origin web/pc2-<tema>
```

Abrir PR contra `master`.

## Si aparece conflicto en rebase

```bash
git status
# resolver archivos
git add <archivo>
git rebase --continue
# o cancelar:
git rebase --abort
```

## Reglas de no colision (sprint actual)

- Frente A no toca `apps/web/app/admin/**` ni paginas SEO.
- Frente B no toca `apps/web/app/tecnicos/**`.
- Frente B no toca `apps/mobile/src/screens/tabs/JobsScreen.tsx`.
- Frente B no toca `apps/mobile/src/screens/flow/JobConfigScreen.tsx`.
- Frente B no toca `apps/mobile/src/components/molecules/LocationAutocomplete.tsx`.

## Comunicacion minima en cada PR

- Archivos tocados.
- Resultado de `lint` y `build`.
- Pendientes o bloqueos.
- Enlace a la tarea/roadmap correspondiente.

