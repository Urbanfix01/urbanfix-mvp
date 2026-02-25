# UrbanFix - Guia rapida del sistema

Este README resume como funciona la app y la web, con rutas clave y puntos de integracion. Se usa como contexto para futuras mejoras.

## Estructura del repo
- `apps/web/`: Web publica y panel de tecnicos (Next.js 14, App Router).
- `apps/mobile/`: App movil (Expo/React Native).
- `packages/shared/`: Logica compartida (tipos, calculos, validaciones).
- `logo/`: Logos fuente.

## Web (Next.js)
Entry points y paginas:
- Layout y metadata SEO: `apps/web/app/layout.tsx`.
- Home publica (login/registro): `apps/web/app/page.tsx`.
- Area tecnicos: `apps/web/app/tecnicos/page.tsx`.
- Presupuesto por link: `apps/web/app/p/[id]/page.tsx`.
- Legal y contenido: `apps/web/app/privacidad/page.tsx`, `apps/web/app/terminos/page.tsx`, `apps/web/app/urbanfix/page.tsx`.
- Link beta Android: `apps/web/app/page.tsx` (boton Android).

SEO y rastreo:
- Robots: `apps/web/app/robots.ts`.
- Sitemap: `apps/web/app/sitemap.ts`.
- Dominio canonico: `https://www.urbanfixar.com` (redirige desde el dominio sin www).

API y utilidades:
- Notificaciones: `apps/web/app/api/notify/route.ts`.
- PDF de presupuestos: `apps/web/components/pdf/QuoteDocument.tsx`.

Assets publicos:
- Favicons: `apps/web/public/icon-16.png`, `apps/web/public/icon-32.png`, `apps/web/public/icon-48.png`, `apps/web/public/favicon.ico`.
- Apple icon: `apps/web/public/apple-touch-icon.png`, `apps/web/public/apple-icon.png`.
- Logo UI: `apps/web/public/icon.png` (usa el logo fuente en `logo/ICONO UFX.png`).

## App movil (Expo / React Native)
Puntos clave:
- Entry: `apps/mobile/App.tsx`.
- Navegacion: `apps/mobile/src/navigation/RootNavigator.tsx`.
- Pantallas: `apps/mobile/src/screens/flow/JobConfigScreen.tsx`, `apps/mobile/src/screens/tabs/CatalogScreen.tsx`, `apps/mobile/src/screens/tabs/NotificationsScreen.tsx`.
- Hooks y utils: `apps/mobile/src/hooks/useJobCalculator.ts`, `apps/mobile/src/utils/notifications.ts`.

## Backend / datos
- Supabase es el backend principal (auth y datos). En web se usa en `apps/web/lib/supabase`.
- Migraciones relacionadas a notificaciones: `apps/web/lib/supabase/migrations/20251227_notifications.sql`.

## Deploy
- Web: Vercel (construye `apps/web`).
- App: Expo/EAS (`apps/mobile/app.json`, `apps/mobile/eas.json`).
- iOS TestFlight: requiere `ios.bundleIdentifier` en `apps/mobile/app.json`.

## Operacion release
- Scope freeze + criterios de salida: `docs/ops/2026-02-23_scope_freeze_y_criterios_salida.md`

## Desarrollo local
- Web:
  - `cd apps/web`
  - `npm install`
  - `npm run dev`
  - (Opcional) Define `NEXT_PUBLIC_PUBLIC_WEB_URL` para forzar el dominio de los links publicos `/p/[id]`.
- App:
  - `cd apps/mobile`
  - `npm install`
  - `npm run start`

## Scripts en la raiz
- `npm run dev:web` (Next.js)
- `npm run start:mobile` (Expo)
- `npm run android`, `npm run ios`
- `npm run roadmap:sync` (sincroniza cambios de codigo al Roadmap)

## Auto-sync roadmap (Supabase)
1) Crear `./.env.roadmap.local` usando `./.env.roadmap.example`.
2) Elegir modo:
- Endpoint: `ROADMAP_AUTOSYNC_URL` + `ROADMAP_AUTOSYNC_TOKEN`.
- Directo Supabase: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
3) Instalar hooks una vez por PC:
- `scripts\\setup-git-hooks.cmd`
4) Validar configuracion sin escribir datos:
- `node scripts/roadmap-auto-sync.mjs --dry-run`

Notas:
- El hook `pre-push` ejecuta auto-sync antes de cada push.
- Si endpoint falla y hay credenciales de Supabase, usa fallback directo.

## Politica de actualizacion del README
Cada vez que se agregue una funcion nueva, se cambie el flujo principal, o se modifique el deploy/infra:
1) Actualizar esta guia en las secciones relevantes.
2) Agregar una linea en "Actualizaciones".
### Actualizaciones
- 2024-05-30 - Base del README y guia general del sistema.
- 2024-05-30 - Reorganizacion del repo a monorepo (`apps/web`, `apps/mobile`, `packages/shared`).
- 2024-06-02 - Se agrega `ios.bundleIdentifier` para deploy iOS/TestFlight.
- 2024-06-02 - Link beta Android en la home web.
- 2024-06-02 - IVA desactivado por defecto en el panel web de tecnicos.
- 2024-06-02 - IVA reseteado en nuevos presupuestos desde la app movil.
- 2024-06-02 - Subtotales separados por mano de obra y materiales en la vista de presupuesto web.
- 2024-06-16 - Panel web: links publicos de presupuestos configurables y datos alineados con la app movil.
- 2024-07-23 - Definido scope freeze + criterios de salida de release (P0/P1 + checklist Go/No-Go).
- 2024-07-24 - Seguridad: Mover credenciales de Supabase a variables de entorno.
- 2024-07-24 - Rendimiento: Reemplazar tags `<a>` por `<Link>` de Next.js para navegacion interna.
- 2024-07-24 - Optimizacion: Usar componente `<Image>` de Next.js para optimizacion de imagenes.
