import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ts = require('typescript');
const source = await readFile(new URL('../src/materials/catalogRenderBindings.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resolveCatalogMaterial: resolve, SOURCE_RENDER_FAMILIES: families } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const catalog = JSON.parse(await readFile(new URL('../src/materials/materialRenderCatalog.json', import.meta.url)));
const workSource = await readFile(new URL('../src/materials/catalogWorkBindings.ts', import.meta.url), 'utf8');
const workOutput = ts.transpileModule(workSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resolveCatalogWork } = await import(`data:text/javascript;base64,${Buffer.from(workOutput).toString('base64')}`);
const item = (name, source_ref = '') => ({ id: 'test', name, source_ref, type: 'material' });
test('every explicit price-source binding identifies an existing material', () => {
  for (const [source, id] of Object.entries(families)) assert.equal(resolve(item('not matched by name', source), catalog)?.id, id, source);
});
test('material families do not imply equivalence of prices, brands or dimensions', () => {
  assert.equal(resolve(item('Cemento Holcim 25 kg', 'cifras-367-2026-10:material:cement-holcim'), catalog).id, 'obra-gruesa-cemento-portland');
  assert.equal(resolve(item('Cable Unipolar 2.5mm Normalizado (Metro)', 'electricidad'), catalog).id, 'electricidad-cable-unipolar');
  assert.equal(resolve(item('Cal viva', 'cifras-367-2026-10:material:lime-quick-andina'), catalog).id, 'obra-gruesa-cal-viva-molida');
  assert.equal(resolve(item('Vidrio templado', 'cifras-367-2026-10:material:glass-tempered-10'), catalog).id, 'aberturas-vidrio-templado');
  assert.equal(resolve(item('Gastos Varios / Otros', 'generales'), catalog), null);
  assert.equal(resolve(item('Cemento Holcim', 'unknown-source'), catalog), null);
  assert.equal(resolve({ ...item('Cemento Portland'), type: 'labor' }, catalog), null);
});

test('dated master catalog covers every physical material, excluding only nonphysical costs', async () => {
  const rows = JSON.parse(await readFile(new URL('fixtures/master-materials-2026-10-20.json', import.meta.url)));
  assert.equal(rows.length, 128);
  const exclusions = rows.filter((row) => row.source_ref === 'generales' && ['Flete / Logística', 'Gastos Varios / Otros'].includes(row.name));
  assert.equal(exclusions.length, 4);
  const physical = rows.filter((row) => !exclusions.includes(row));
  assert.equal(physical.length, 124);
  for (const row of physical) assert.ok(resolve(row, catalog), row.name);
  for (const row of exclusions) assert.equal(resolve(row, catalog), null, row.name);
  assert.notEqual(resolve(item('Conector PVC 3/4 o 20mm (Unidad)', 'electricidad'), catalog).id, 'sanitaria-cano-sanitario-de-pvc');
  assert.equal(resolve(item('Bastidor + Tapa', 'unknown-source'), catalog), null);
  assert.equal(resolve(item('Reflector LED 50W', 'unknown-source'), catalog), null);
  assert.equal(resolve(item('Tapa de tanque', 'electricidad'), catalog), null);
});
test('all shipped thumbnails match the original web assets and are packaged locally', async () => {
  const { inputs } = JSON.parse(await readFile(new URL('../src/materials/materialPreviewManifest.json', import.meta.url)));
  assert.equal(Object.keys(inputs).length, catalog.length);
  for (const [id, digest] of Object.entries(inputs)) {
    const bytes = await readFile(new URL(`../assets/material-renders/${id}.webp`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, id);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});
test('the work rows in Todos get work references, without becoming material offers', () => {
  const work = (name, source_ref) => ({ ...item(name, source_ref), type: 'labor' });
  for (let meters = 1; meters <= 4; meters++) {
    const row = work(`Acometida en pilar o muro - Gabinete para ${meters} medidores monofásicos`, 'aaieric');
    assert.equal(resolveCatalogWork(row).model, 'pillar');
    assert.equal(resolve(row, catalog), null);
  }
  assert.equal(resolveCatalogWork(work('Accesorios de baño loza blanca (9 pzas.)')).equipment, 'bano-cocina-accesorios-de-bano');
  assert.equal(resolveCatalogWork(work('Acrílica transparente para muros exteriores')).model, 'wall-finish');
  assert.equal(resolveCatalogWork(work('Colocación de contrapiso')).model, 'subfloor');
  assert.equal(resolveCatalogWork(work('Retiro de contrapiso')), null);
  assert.equal(resolveCatalogWork(work('Contrapiso a demoler')).operation, 'removal');
  assert.equal(resolveCatalogWork(work('Visita profesional')).model, 'inspection');
  assert.equal(resolveCatalogWork(item('Pilar de luz')), null);
});
test('generated work scenes are nonblank, uncropped and pinned to the shared models', async () => {
  const { images, inputs } = JSON.parse(await readFile(new URL('../src/materials/workPreviewManifest.json', import.meta.url)));
  assert.ok(Object.keys(images).length >= 120);
  assert.ok(inputs['src/lib/houseDrawingModel.js']);
  const localScenes = await readFile(new URL('../embedded-design/workScenes.js', import.meta.url));
  assert.equal(createHash('sha256').update(localScenes).digest('hex'), inputs['mobile/embedded-design/workScenes.js']);
  for (const [id, row] of Object.entries(images)) {
    assert.ok(row.visiblePixels >= 384);
    const bytes = await readFile(new URL(`../assets/work-renders/${id}.webp`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('all dated labor entries have local work scenes, without changing their financial units', async () => {
  const rows = JSON.parse(await readFile(new URL('fixtures/master-labor-2026-10-20.json', import.meta.url)));
  const { images } = JSON.parse(await readFile(new URL('../src/materials/workPreviewManifest.json', import.meta.url)));
  assert.equal(rows.length, 410);
  const original = structuredClone(rows);
  for (const row of rows) { const binding = resolveCatalogWork(row); assert.ok(binding?.model && images[binding.model], row.name); assert.equal(resolve(row, catalog), null); }
  assert.deepEqual(rows, original);
  const labor = (name, source_ref) => ({ type: 'labor', name, source_ref });
  assert.equal(resolveCatalogWork(labor('Demolición mamposterías ladrillos comunes', 'mo_rubro_demoliciones')).operation, 'removal');
  assert.equal(resolveCatalogWork(labor('Cambio cartucho monocomando', 'mo_rubro_sanitarios')).operation, 'repair');
  assert.equal(resolveCatalogWork(labor('Llave de paso Ø 13 mm', 'mo_rubro_gas')).model, 'gas-valve');
  assert.equal(resolveCatalogWork(labor('Llave de paso Ø 13 mm', 'mo_rubro_agua_incendio')).model, 'water-valve');
  assert.equal(resolveCatalogWork(labor('Cemento alisado', 'cifras-367-2026-10:labor:cement-wall-finish')).model, 'plaster-wall');
  assert.equal(resolveCatalogWork(labor('Cemento alisado', 'cifras-367-2026-10:labor:cement-floor-finish')).model, 'cement-finish');
  assert.equal(resolveCatalogWork(labor('Visita técnica', 'unknown-source')), null);
  assert.equal(resolveCatalogWork(labor('Trabajo sin alcance', 'mo_rubro_sanitarios')), null);
});
