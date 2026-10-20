# UrbanFix MVP

## Actualizaciones

- 2026-10-20: las tarjetas de Todos y Mano de obra tambien muestran vistas
  orientativas de trabajos reconocidos (pilares, contrapisos, muros y otros),
  manteniendo su tipo y tarifa. Los trabajos sin referencia conservan el icono.
- 2026-10-20: renders en las tarjetas y fichas del Catalogo Maestro, con
  ampliacion y acceso directo al material 3D. Conserva el diseno movil original;
  reutiliza las miniaturas de la web y prioriza imagenes publicadas compatibles.
- 2026-10-20: Plano libre integrado dentro de la app: dibujo en metros, piezas,
  aberturas, 3D, computos y borradores de presupuesto, sin abrir el navegador.
  Materiales y renders publicados consultan la misma cuenta que la web.
  El motor compartido se distribuye localmente, no descarga codigo remoto.
  Ver alcance, regeneracion y pruebas en
  [Integrated Design Workspace](docs/mobile-integrated-design.md).
  Todavia requiere QA fisica y una nueva compilacion para las tiendas.
- 2026-10-19: el perfil se actualiza por propietario sin reescribir `id`,
  publicacion ni aprobacion; compatible con los permisos por columna existentes.
- 2026-10-19: redes sociales opcionales; guardado compatible con los campos
  `instagram_url` y `facebook_url` del perfil alojado, sin exigir publicaciones.
- 2026-10-19: base operativa y punto en el mapa opcionales en el perfil movil;
  telefono y nombre comercial siguen siendo necesarios para completar el alta.
- 2026-10-19: espacio movil de proyectos, nuevo proyecto en cuatro pasos,
  historial compatible con la web y perfil interno de prueba separado.

## Fuente de verdad

La web actual vive en el repositorio `Urbanfix01/urbanfix_web`.
`apps/web` en este monorepo es la web anterior; no desplegarla como parte de esta actualizacion movil.
La app movil activa vive en `apps/mobile`.

El espacio nativo de proyectos, sus pruebas y el alcance de la version interna
estan documentados en [Mobile Project Workspace](docs/mobile-project-workspace.md).
Para esta funcion usar `main`, no la rama predeterminada antigua `master`.

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

Esta seccion describe la web historica del monorepo. No ejecutar su deploy
para actualizar la web actual; usar el repositorio `Urbanfix01/urbanfix_web`.

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
