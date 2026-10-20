// Reproducible read-only audit of the dated, sanitized master catalog snapshot.
import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const ts = require('typescript');
const root = new URL('../apps/mobile/', import.meta.url);
const source = await readFile(new URL('src/materials/catalogRenderBindings.ts', root), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { resolveCatalogMaterial } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const catalog = JSON.parse(await readFile(new URL('src/materials/materialRenderCatalog.json', root)));
const rows = JSON.parse(await readFile(new URL('tests/fixtures/master-materials-2026-10-20.json', root)));
const audit = [];
for (const item of rows) {
  const nonphysical = item.type === 'consumable' && item.source_ref === 'generales' && ['Flete / Logística', 'Gastos Varios / Otros'].includes(item.name);
  const model = resolveCatalogMaterial(item, catalog);
  if (model) await access(new URL(`assets/material-renders/${model.id}.webp`, root));
  audit.push({ ...item, status: model ? 'illustrative-render' : nonphysical ? 'not-a-physical-material' : 'missing', materialId: model?.id || null });
}
const report = { snapshotDate: '2026-10-20', scope: 'master_items: material + consumable; no prices or customer records',
  summary: { total: rows.length, withRender: audit.filter((row) => row.materialId).length, nonphysical: audit.filter((row) => row.status === 'not-a-physical-material').length, missing: audit.filter((row) => row.status === 'missing').length, packagedFamilies: catalog.length }, items: audit };
await writeFile(new URL('../docs/material-render-audit-2026-10-20.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
assert.equal(report.summary.missing, 0, 'Physical materials still missing a render');
