# Integrated Design Workspace

## User Flow And Scope

Projects -> open a Plano libre project -> Disenar y cotizar.
More -> Materiales y renders opens the original native Master Catalog, filtered
to materials. Its native item detail opens the matching 3D family directly.

The integrated tabs are Plano, 3D, Piezas, Cotizar, Computo and Renders:

- Draw orthogonal walls/rectangles in meters with grid snapping, zoom/fit, move,
  measure, undo/redo, and selected-wall height/construction system.
- Add existing construction pieces with their canonical inspectors, including
  fences, pillars, floor layers and roofs. Select door/window variants, place
  and inspect openings; deleting an opening preserves its containing wall.
- Orbit the canonical Three.js model, optionally with cutaway walls.
- Retrieve published prices/shared references using the signed-in account.
  Select compatible presentations or enter own tariffs. Estimates require an
  explicit choice. Unknown prices stay pending, never zero. Construction
  coefficients and compatibility rules are the canonical web implementation.
- Consolidate materials and retain their destination/use breakdown.
- Save a budget draft with the existing quote workflow, not a client delivery.
  This requires the existing server-side professional approval/publication gate,
  a client, positive quantities/prices and at most 80 lines. No approval is
  granted by this feature. Shared budget save currently supports ARS only:
  Uruguay computations stay in the project without an implicit currency change.
- Read published material images, with 5-minute signed URLs; Actualizar renders
  renews links. Only published images are requested, even for admin accounts.
  The existing interactive material model is available when defined.

This is the first integrated **Plano libre** workbench, not feature parity with
all web tools. Imported furniture is visible/movable; adding furniture and room
presets is not exposed yet. House/network/room editor kinds remain preserved but
read-only in mobile history. Client delivery PDF is not embedded here. All
construction output is preliminary, not structural/normative approval.

## Shared Engine, Not External Web Navigation

The app ships a self-contained HTML/React/Three.js module in a local native
WebView. Expo Web preview uses a sandboxed srcdoc iframe. Neither loads a remote
page or opens an external browser. The existing native Supabase session remains
in the host: the renderer has no token, cookies, network API client or remote
scripts. Its storage is memory only. A nonce-bound bridge permits only catalog,
references, published renders, project save and budget draft requests.

The generated CSP blocks network connections and forms. Only signed images on
the existing Supabase host can load. Native navigation is restricted to the
local document; file access and new windows are disabled. Host API requests are
HTTPS, destination-allowlisted and owner-checked. No service-role credentials,
schema migrations, grants or RLS changes are part of this feature.

## Data Synchronization

Edits append local immutable versions through projectRepository.revise, then
attempt cloud backup using the existing owner/country-scoped history table.
An offline edit is retained locally; the header reports backup pending and its
sync action retries. A confirmed local save is not a confirmed cloud backup.
Back navigation warns about changes not yet confirmed in the local history.
Uninstalling the app can remove unbacked-up device data. The same history
contract is accepted by the canonical web normalizer; no last-write-wins merge
or background conflict resolution is claimed.

Prices/references load on entering the quotation view and can be refreshed.
Renders load on material selection and refresh explicitly; there is no realtime
subscription. Selected price references and own prices remain with each project
version. Current catalogs are not an offline price cache: quotation refresh and
budget save require connectivity. Cached project geometry and own entered prices
remain editable offline; an expired signed image requires connectivity to renew.
The built-in material catalog/parametric models are code, so adding new catalog
definitions requires regenerating/releasing the app. Published price and image
data are shared with the web and do not require a new binary for each change.

## Regeneration

From apps/mobile, after installing the mobile and canonical web dependencies:

```sh
# Absolute path of the canonical Urbanfix01/urbanfix_web checkout:
export URBANFIX_WEB_ROOT=/path/to/urbanfix_web
npm run build:design
npm run sync:material-renders
npm run test:catalog-renders
npm run test:projects
npm run test:design
npm run typecheck
npm run check:bundles
```

PowerShell uses `$env:URBANFIX_WEB_ROOT='C:/path/to/urbanfix_web'` instead of
export. The default root resolves two levels above the native checkout for the
current local workspace arrangement. It is never the old apps/web directory.

The script imports canonical source modules, aliases their API/auth boundaries
to the bridge, and emits src/design/designBundle.js plus designManifest.json.
The manifest records source commit and SHA-256 hashes of the canonical inputs
and shipped HTML. Commit both generated files with source changes. Do not hand
edit the generated module. Set URBANFIX_WEB_ROOT when testing to detect engine
drift. Regenerate when changing canonical geometry, consumption or quotation
modules; those code changes require a new app build, not only a web push.

## Verification And Release

The isolated designWorkspace.browser.mjs test exercises the native React host
and renderer with in-memory API/storage fixtures: touch drawing/opening removal,
3D pixel checks, manual tariffs, missing-price rejection, draft quote save,
offline history retry, consolidated materials, signed-image refresh, no external
window, no token in the renderer and no horizontal overflow. Screenshots cover
320, 390 and 1024 px in ignored dist/mobile-smoke. Separate tests cover profile
completion, project history integrity and web contract compatibility.

Metro's development-only loopback proxy exposes only the three exact API paths
needed by Expo Web because the existing backend does not enable browser CORS
for that preview. It requires POST JSON and a Bearer token, checks loopback
origin, forwards only to the fixed production HTTPS host and does not log tokens.
It is not part of the native runtime or a production API deployment. Android
and iOS call the same HTTPS APIs directly from the native host.

The react-native-webview version is pinned to Expo SDK 54's supported 13.15.0.
Android/iOS export is a bundling check, not a signed installer or physical-device
verification. Before release, test a dedicated QA account on real Android/iOS:
local-document startup and bridge, drawing touch/keyboard/back, GPU rendering,
live history RLS, published render access and real approved-professional quote
save. Review the inherited npm audit findings before a production release;
no forced unrelated dependency upgrade is included in this feature.

No Play Store/App Store update, production signing change, EAS submit or OTA
publication is performed by this implementation. Prepare a new signed build
after device QA and explicit release authorization; see mobile-project-workspace.md.

## Original Mobile Catalog And Renders

The Master Catalog retains its original ScreenHeader, Montserrat/Raleway fonts,
orange actions, purple accents and rounded white cards. Material thumbnails and
recognized work previews replace their corresponding icons. Item types, search,
price values, categories and type filters retain their original behavior. The header has an explicit refresh
action. Unknown/nonpositive reference prices display Pending rather than zero;
this does not mutate stored tariffs.

The app packages the 685 canonical public/material-thumbnails WebP
assets (about 1.9 MB total), not a live WebView per list row. The sync script
copies them unchanged, generates static Metro require declarations and records
hashes. Do not hand-edit generated materialPreviews.ts, the catalog JSON or
manifest. Updating canonical thumbnails requires rerunning the sync script and
building a new app. The asset test verifies every packaged file's hash.

catalogRenderBindings.ts links known price source references to illustrative
material families and recognizes a small explicit set of legacy electrical
names. It does not equate packages, dimensions, manufacturers, prices or
technical suitability. Unknown/ambiguous materials retain their icon instead
of borrowing a misleading image. Labor never becomes a material price offer. For
example quicklime is not linked to hydrated lime. Images are labelled as
illustrative in the detail unless a published image is available.

useCatalogRenders batches published-image queries, chooses the primary/latest
image and signs only selected paths. The exact master item ID takes precedence
over a mapped generic material family. The same private render-library bucket
and 5-minute signed URL policy are retained. It never queries drafts or changes
publication. A failed/expired image falls back to the packaged illustration;
refresh retries even if the server returns the same URL. A library query failure
does not block catalog prices. Queries are owner-scoped in the React Query cache,
refresh periodically and on explicit refresh; account changes clear that cache.
No private signed images or URLs are written into packaged assets or projects.

Item detail supports native image enlargement and a direct 3D view without
opening the browser. The 3D material-only view uses the original native header
and mobile palette; the shared geometric engine is unchanged. These are family
illustrations, not manufacturer-specific models.

Run tests/catalogRenders.browser.mjs with the existing isolated Playwright
configuration to check 320/390/768 px: local thumbnail decoding, original card
styles, labor/material filtering, search, published-image priority, expired-URL
fallback, offline-library retry, native enlargement, direct 3D geometry and no
external window. All writes and signed images are fixtures in this test.

### Work Previews In Todos

The default Todos screen also shows previews for recognized labor tasks. These
are separate work bindings, not material quotations or implied included supplies.
The exact rows reported by the user (bathroom accessories, service-pillar work
and exterior-wall finish) have indicative work/equipment views. The dated audit
now covers 410 labor records across 125 used families, with separate scenes for
repairs, removal, maintenance, inspections, documentation and hourly services.
Unknown future tasks retain their icons. Labels and prices
remain labor, and enlarging the image explicitly identifies it as a work-family
reference, not an approved detail or an exact configuration/quantity scope.

generate-work-previews.mjs creates 126 local WebP scenes from the canonical
HouseDrawing/material models and the shared embedded workScene builder. It does not recreate
construction formulas. Each image is checked for nonblank pixels and unclipped
framing; workPreviewManifest.json records image hashes and canonical source hashes.
The work-binding tests keep these distinct from material bindings. The Todos
browser test starts at Catalogo de precios, not the Materiales shortcut, and
checks the first labor rows, native work enlargement and all filters.

Each recognized labor detail now has Ver trabajo en 3D. It opens a read-only,
offline work scene in the same native WebView, not a material offer or an external
website. The work mode cannot save project versions or quotation drafts. Service
illustrations do not certify hours, inspections or issued documents. The labor
browser scenario uses CATALOG_LABOR_ONLY=1 with the dated 410-record fixture;
all network writes are mocked. See labor-render-audit-2026-10-20.json for the
per-record mapping and operation counts.

```sh
# With URBANFIX_WEB_ROOT and the isolated Playwright paths configured:
npm run build:work-renders
npm run test:catalog-renders
```
