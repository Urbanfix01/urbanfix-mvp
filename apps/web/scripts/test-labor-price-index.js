const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '..', 'lib', 'labor-price-index.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const priceIndex = { exports: {} };

new Function('module', 'exports', compiled)(priceIndex, priceIndex.exports);

const {
  getCatalogLaborPrice,
  getUpdatedLaborPrice,
  isDirectLaborPriceSource,
} = priceIndex.exports;

assert.equal(getUpdatedLaborPrice(100000), 112100);
assert.equal(getCatalogLaborPrice(100000, 'mo_rubro_electricidad'), 112100);
assert.equal(getCatalogLaborPrice(100000, 'aaieric_electricidad_2026_07'), 100000);
assert.equal(getCatalogLaborPrice(100000.49, ' AAIERIC_ELECTRICIDAD_2026_07 '), 100000);
assert.equal(getCatalogLaborPrice(0, 'aaieric_electricidad_2026_07'), 0);
assert.equal(isDirectLaborPriceSource('aaieric_electricidad_2026_07'), true);
assert.equal(isDirectLaborPriceSource('mo_rubro_electricidad'), false);

console.log('labor-price-index:test OK - precios indexados y fuentes directas');
