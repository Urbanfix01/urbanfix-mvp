const assert = require('node:assert/strict');

const {
  buildGuidedSelection,
  collectAssistantPendingConcepts,
  dedupeCatalog,
  detectTrade,
  replaceProposalItems,
  resolveCatalogUnit,
  stableRevision,
} = require('../lib/ai/budget-assistant-core');

const row = (id, name, type, unit, category, price = 100, createdAt = '2026-08-01T00:00:00Z') => ({
  id,
  name,
  type,
  unit,
  category,
  source_ref: category,
  suggested_price: price,
  technical_notes: null,
  created_at: createdAt,
});

const catalog = [
  row('e-mouth', 'Obra Nueva - Canalizacion propia', 'labor', 'boca', 'Electricidad'),
  row('e-point', 'Punto, toma simple y portalampara', 'labor', 'boca', 'Electricidad'),
  row('e-wall', 'Amurado mamposteria ladrillo hueco', 'labor', 'metro', 'Electricidad'),
  row('e-pipe', 'Caño Corrugado 3/4 (Metro)', 'material', 'unidad', 'Electricidad', 250),
  row('e-box-light', 'Caja octogonal', 'material', 'unidad', 'Electricidad', 300),
  row('e-box-outlet', 'Caja rectangular 10x5', 'material', 'unidad', 'Electricidad', 350),
  row('e-cable15', 'Cable Unipolar 1.5mm (Metro)', 'material', 'unidad', 'Electricidad', 400),
  row('e-cable25', 'Cable Unipolar 2.5mm (Metro)', 'material', 'unidad', 'Electricidad', 500),
  row('e-sensor', 'Instalacion contactores y sensores', 'labor', 'unidad', 'Electricidad', 1000),
  row('s-pipe', 'Instalacion de caneria sanitaria', 'labor', 'metro', 'Sanitarios', 1200),
  row('s-tap', 'Colocacion de griferia', 'labor', 'unidad', 'Sanitarios', 900),
  row('p-interior', 'Pintura interior', 'labor', 'm2', 'Pintura', 800),
  row('p-exterior', 'Pintura exterior', 'labor', 'm2', 'Pintura', 900),
  row('p-ceiling', 'Pintura cielorraso', 'labor', 'm2', 'Pintura', 850),
  row('m-h12', 'Mamposteria ladrillo hueco 12', 'labor', 'm2', 'Mamposteria', 1500),
  row('m-common', 'Mamposteria ladrillo comun', 'labor', 'm2', 'Mamposteria', 1600),
  row('m-block', 'Mamposteria bloque cemento', 'labor', 'm2', 'Mamposteria', 1700),
];

const testTradeDetection = () => {
  assert.equal(detectTrade('Instalar cinco bocas, cuatro luces y una fotocelula').trade, 'electricidad');
  assert.equal(detectTrade('Cambiar una griferia y reparar la caneria').trade, 'sanitarios');
  assert.equal(detectTrade('Pintar interior y cielorraso').trade, 'pintura');
  assert.equal(detectTrade('Levantar muro de ladrillo hueco').trade, 'mamposteria');
  assert.equal(detectTrade('Trabajo general sin detalle').ambiguous, true);
};

const testFiveMouthElectricalCase = () => {
  const electricalCatalog = dedupeCatalog(catalog, 'electricidad');
  const first = buildGuidedSelection({
    trade: 'electricidad',
    templateKey: null,
    description: '5 bocas: 4 luces, 1 tomacorriente, 5 cajas, canaleta en ladrillo hueco, fase y neutro, una fotocelula',
    answers: {},
    catalog: electricalCatalog,
  });
  assert.ok(first.questions.some((item) => item.key === 'metros_canalizacion'));
  assert.ok(first.questions.some((item) => item.key === 'metros_cable_15'));
  assert.ok(first.questions.some((item) => item.key === 'metros_cable_25'));
  assert.ok(first.questions.some((item) => item.key === 'material_supply'));
  assert.equal(first.items.find((item) => item.catalogItemId === 'e-mouth').quantity, 5);
  assert.equal(first.items.find((item) => item.catalogItemId === 'e-pipe').quantity, null);

  const completed = buildGuidedSelection({
    trade: 'electricidad',
    description: '5 bocas: 4 luces, 1 tomacorriente, 5 cajas, canaleta en ladrillo hueco y una fotocelula',
    answers: {
      metros_canalizacion: 12,
      metros_cable_15: 36,
      metros_cable_25: 18,
      material_supply: 'tecnico',
      manual_material_total: 25000,
      luminarias_incluidas: 'no',
    },
    catalog: electricalCatalog,
  });
  assert.equal(completed.items.find((item) => item.catalogItemId === 'e-pipe').quantity, 12);
  assert.equal(completed.items.find((item) => item.catalogItemId === 'e-cable15').quantity, 36);
  assert.equal(completed.items.find((item) => item.catalogItemId === 'e-cable25').quantity, 18);
  assert.ok(completed.items.some((item) => item.catalogItemId === null && item.manualUnitPrice === 25000));
  assert.equal(completed.unmatchedItems.length, 0);
};

const testFourTradeFallbacks = () => {
  const sanitary = buildGuidedSelection({ trade: 'sanitarios', templateKey: 'canerias', description: '', answers: { metros_caneria: 8, material_supply: 'cliente' }, catalog: dedupeCatalog(catalog, 'sanitarios') });
  assert.equal(sanitary.items[0].quantity, 8);
  assert.ok(sanitary.exclusions.some((item) => item.includes('aporta el cliente')));

  const paint = buildGuidedSelection({ trade: 'pintura', templateKey: 'interior', description: '', answers: { superficie_m2: 30, manos_pintura: 2, material_supply: 'tecnico', manual_material_total: 40000 }, catalog: dedupeCatalog(catalog, 'pintura') });
  assert.equal(paint.items.find((item) => item.catalogItemId === 'p-interior').quantity, 30);
  assert.ok(paint.items.some((item) => item.manualUnitPrice === 40000));

  const masonry = buildGuidedSelection({ trade: 'mamposteria', templateKey: 'ladrillo_hueco_12', description: '', answers: { superficie_m2: 15, material_supply: 'cliente' }, catalog: dedupeCatalog(catalog, 'mamposteria') });
  assert.equal(masonry.items.find((item) => item.catalogItemId === 'm-h12').quantity, 15);
};

const testDedupeUnitsAndProposalReplacement = () => {
  const duplicateRows = [
    row('old', 'Cable Unipolar 1.5mm (Metro)', 'material', 'unidad', 'Electricidad', 10, '2026-01-01T00:00:00Z'),
    row('new', 'Cable Unipolar 1.5mm (Metro)', 'material', 'unidad', 'Electricidad', 20, '2026-08-01T00:00:00Z'),
  ];
  const deduped = dedupeCatalog(duplicateRows, 'electricidad');
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id, 'new');
  assert.equal(resolveCatalogUnit(duplicateRows[0]), 'metro');
  assert.equal(deduped[0].suggested_price, 20);

  const original = [{ id: 'a1', assistantProposalId: 'proposal-a' }, { id: 'b1', assistantProposalId: 'proposal-b' }];
  const updated = replaceProposalItems(original, [{ id: 'a2', assistantProposalId: 'proposal-a' }], 'proposal-a');
  assert.deepEqual(updated.map((item) => item.id), ['b1', 'a2']);
  const withSecondBlock = replaceProposalItems(updated, [{ id: 'c1', assistantProposalId: 'proposal-c' }], 'proposal-c');
  assert.deepEqual(withSecondBlock.map((item) => item.id), ['b1', 'a2', 'c1']);
  assert.deepEqual(
    collectAssistantPendingConcepts([
      { assistantPending: ['Metros de cable', 'Fotocelula'] },
      { assistantPending: ['Metros de cable'] },
    ]),
    ['Metros de cable', 'Fotocelula']
  );
  assert.equal(stableRevision({ answers: { meters: 10 } }), stableRevision({ answers: { meters: 10 } }));
  assert.notEqual(stableRevision({ answers: { meters: 10 } }), stableRevision({ answers: { meters: 11 } }));
};

testTradeDetection();
testFiveMouthElectricalCase();
testFourTradeFallbacks();
testDedupeUnitsAndProposalReplacement();

console.log('budget-assistant:test OK - deteccion, preguntas, cuatro rubros, precios manuales, unidades y bloques');
