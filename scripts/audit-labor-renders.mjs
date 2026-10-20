import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url)), ts = require('typescript');
const mobile = new URL('../apps/mobile/', import.meta.url);
const source = await readFile(new URL('src/materials/catalogWorkBindings.ts', mobile), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { resolveCatalogWork } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const rows = JSON.parse(await readFile(new URL('tests/fixtures/master-labor-2026-10-20.json', mobile)));
const { images } = JSON.parse(await readFile(new URL('src/materials/workPreviewManifest.json', mobile)));
const items = rows.map((item) => ({ ...item, visual: resolveCatalogWork(item) }));
const missing = items.filter((row) => !row.visual?.model || !images[row.visual.model]);
const operations = {}, scenes = {};
for (const row of items) if (row.visual) { operations[row.visual.operation] = (operations[row.visual.operation] || 0) + 1; scenes[row.visual.model] = (scenes[row.visual.model] || 0) + 1; }
const summary = { totalLabor: rows.length, withRender: rows.length - missing.length, missing: missing.length, sceneFamiliesUsed: Object.keys(scenes).length, packagedScenes: Object.keys(images).length, operations };
await writeFile(new URL('../docs/labor-render-audit-2026-10-20.json', import.meta.url), JSON.stringify({ snapshotDate: '2026-10-20', scope: 'master_items labor; no prices or customer data', summary, scenes, items }, null, 2) + '\n');
console.log(JSON.stringify(summary)); assert.deepEqual(missing, []);
