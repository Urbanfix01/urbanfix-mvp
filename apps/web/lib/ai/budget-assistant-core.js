const TRADES = ['electricidad', 'sanitarios', 'pintura', 'mamposteria'];

const TRADE_LABELS = {
  electricidad: 'Electricidad',
  sanitarios: 'Sanitarios',
  pintura: 'Pintura',
  mamposteria: 'Mamposteria',
};

const TRADE_TERMS = {
  electricidad: ['electric', 'boca', 'luz', 'luces', 'tomacorriente', 'toma', 'cable', 'fotocelula', 'tablero'],
  sanitarios: ['sanitari', 'grifer', 'inodoro', 'lavatorio', 'caneria', 'desague', 'destape', 'bomba', 'termotanque'],
  pintura: ['pintur', 'pintar', 'latex', 'cielorraso', 'enduido', 'imprimacion'],
  mamposteria: ['mamposter', 'ladrillo', 'muro', 'pared', 'bloque de cemento'],
};

const TEMPLATE_OPTIONS = {
  electricidad: [
    { key: 'bocas', label: 'Bocas y cableado' },
    { key: 'iluminacion_fotocelula', label: 'Iluminacion y fotocelula' },
    { key: 'tomas', label: 'Tomacorrientes' },
    { key: 'canalizacion', label: 'Canalizacion' },
    { key: 'tablero_protecciones', label: 'Tablero y protecciones' },
  ],
  sanitarios: [
    { key: 'griferia', label: 'Griferia' },
    { key: 'artefactos', label: 'Artefactos sanitarios' },
    { key: 'canerias', label: 'Canerias' },
    { key: 'desagues_destapes', label: 'Desagues y destapes' },
    { key: 'bombas_termotanques', label: 'Bombas y termotanques' },
  ],
  pintura: [
    { key: 'interior', label: 'Interior' },
    { key: 'exterior', label: 'Exterior' },
    { key: 'cielorraso', label: 'Cielorraso' },
  ],
  mamposteria: [
    { key: 'ladrillo_hueco_8', label: 'Ladrillo hueco 8' },
    { key: 'ladrillo_hueco_12', label: 'Ladrillo hueco 12' },
    { key: 'ladrillo_hueco_18', label: 'Ladrillo hueco 18' },
    { key: 'ladrillo_comun', label: 'Ladrillo comun' },
    { key: 'bloque_cemento', label: 'Bloque de cemento' },
  ],
};

const NUMBER_WORDS = {
  un: '1', una: '1', uno: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7',
  ocho: '8', nueve: '9', diez: '10', once: '11', doce: '12', trece: '13', catorce: '14', quince: '15', veinte: '20',
};

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const normalizeQuantities = (value) => {
  let normalized = normalizeText(value);
  Object.entries(NUMBER_WORDS).forEach(([word, quantity]) => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), quantity);
  });
  return normalized;
};

const positiveNumber = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 1000) / 1000 : null;
};

const readAnswerNumber = (answers, key) => positiveNumber(answers && answers[key]);
const readAnswerString = (answers, key) => String((answers && answers[key]) || '').trim();
const hasAnswer = (answers, key) => answers && answers[key] !== null && answers[key] !== undefined && answers[key] !== '';

const findQuantity = (description, terms) => {
  const normalized = normalizeQuantities(description);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const direct = normalized.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:${escaped})\\b`));
    const reversed = normalized.match(new RegExp(`(?:${escaped})[^\\d]{0,18}(\\d+(?:[.,]\\d+)?)`));
    const quantity = positiveNumber(direct?.[1] || reversed?.[1]);
    if (quantity) return quantity;
  }
  return null;
};

const findMeters = (description, terms) => {
  const normalized = normalizeQuantities(description);
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const direct = normalized.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:m|metros?)\\s+(?:de\\s+)?(?:${escaped})`));
    const reversed = normalized.match(new RegExp(`(?:${escaped})[^\\d]{0,24}(\\d+(?:[.,]\\d+)?)\\s*(?:m|metros?)`));
    const quantity = positiveNumber(direct?.[1] || reversed?.[1]);
    if (quantity) return quantity;
  }
  return null;
};

const detectTrade = (description) => {
  const text = normalizeText(description);
  const scores = TRADES.map((trade) => ({
    trade,
    score: TRADE_TERMS[trade].reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  if (!scores[0] || scores[0].score === 0) return { trade: null, ambiguous: true, scores };
  return {
    trade: scores[0].trade,
    ambiguous: Boolean(scores[1] && scores[1].score === scores[0].score),
    scores,
  };
};

const catalogBelongsToTrade = (item, trade) => {
  const text = normalizeText([item?.category, item?.source_ref, item?.name].filter(Boolean).join(' '));
  if (trade === 'electricidad') return text.includes('electric');
  if (trade === 'sanitarios') return ['sanitari', 'plomer', 'gasista', 'caneria', 'desague'].some((term) => text.includes(term));
  if (trade === 'pintura') return ['pintur', 'pintor'].some((term) => text.includes(term));
  return ['mamposter', 'albanil', 'ladrillo', 'bloque'].some((term) => text.includes(term));
};

const resolveCatalogUnit = (item) => {
  const name = normalizeText(item?.name);
  const unit = normalizeText(item?.unit);
  if (/\(\s*metro(?:s)?\s*\)/i.test(String(item?.name || ''))) return 'metro';
  if ((name.includes('cable ') || name.includes('cano ') || name.includes('caneria ')) && name.includes('metro')) return 'metro';
  if (['m', 'metro', 'metros'].includes(unit)) return 'metro';
  if (['m2', 'mt2', 'metro cuadrado', 'metros cuadrados'].includes(unit)) return 'm2';
  if (['m3', 'mt3', 'metro cubico', 'metros cubicos'].includes(unit)) return 'm3';
  if (['u', 'un', 'unid', 'unidad', 'unidades'].includes(unit)) return 'unidad';
  return unit || 'unidad';
};

const dedupeCatalog = (rows, trade) => {
  const sorted = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => String(b?.created_at || '').localeCompare(String(a?.created_at || '')));
  const seen = new Map();
  sorted.forEach((item) => {
    if (!catalogBelongsToTrade(item, trade)) return;
    const price = Number(item?.suggested_price || 0);
    if (!Number.isFinite(price) || price <= 0) return;
    const normalizedItem = { ...item, unit: resolveCatalogUnit(item) };
    const key = [normalizedItem.type, normalizeText(normalizedItem.name), normalizedItem.unit].join('|');
    if (!seen.has(key)) seen.set(key, normalizedItem);
  });
  return [...seen.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
};

const findCatalogItem = (catalog, groups, preferredUnit) => {
  const candidates = catalog.filter((item) => !preferredUnit || resolveCatalogUnit(item) === preferredUnit);
  for (const parts of groups) {
    const match = candidates.find((item) => parts.every((part) => normalizeText(item.name).includes(normalizeText(part))));
    if (match) return match;
  }
  return null;
};

const question = (key, text, reason, kind, options = {}) => ({
  key,
  question: text,
  reason,
  kind,
  required: options.required !== false,
  unit: options.unit || null,
  options: options.options,
});

const addQuestion = (questions, answers, nextQuestion) => {
  if (!hasAnswer(answers, nextQuestion.key) && !questions.some((item) => item.key === nextQuestion.key)) questions.push(nextQuestion);
};

const addSelection = (items, catalogItem, quantity, purpose, options = {}) => {
  if (!catalogItem) return false;
  if (items.some((item) => item.catalogItemId === catalogItem.id)) return true;
  items.push({
    catalogItemId: catalogItem.id,
    quantity: positiveNumber(quantity),
    purpose,
    optional: Boolean(options.optional),
    confidence: options.confidence || (positiveNumber(quantity) ? 'high' : 'low'),
  });
  return true;
};

const materialSupplyQuestions = (questions, answers, unmatchedItems, exclusions, tradeLabel) => {
  if (!unmatchedItems.length) return;
  const supply = readAnswerString(answers, 'material_supply');
  if (!supply) {
    addQuestion(questions, answers, question(
      'material_supply',
      `Quien aporta los materiales sin precio exacto de ${tradeLabel.toLowerCase()}?`,
      'Los conceptos sin un valor de catalogo no pueden entrar al total automaticamente.',
      'choice',
      { options: [{ value: 'cliente', label: 'Aporta el cliente' }, { value: 'tecnico', label: 'Los aporta el tecnico' }] }
    ));
    return;
  }
  if (supply === 'cliente') {
    unmatchedItems.forEach((item) => exclusions.push(`${item.description}: aporta el cliente.`));
    unmatchedItems.splice(0, unmatchedItems.length);
    return;
  }
  if (!readAnswerNumber(answers, 'manual_material_total')) {
    addQuestion(questions, answers, question(
      'manual_material_total',
      'Cual es el importe manual total de esos materiales?',
      'El tecnico debe confirmar el valor; quedara identificado como precio manual.',
      'money',
      { unit: 'ARS' }
    ));
  }
};

const baseSelection = (trade, templateKey) => ({
  title: `${TRADE_LABELS[trade]} - propuesta a confirmar`,
  summary: `Propuesta ${templateKey ? 'desde plantilla' : 'guiada'} con valores activos del catalogo de ${TRADE_LABELS[trade].toLowerCase()}.`,
  assumptions: [],
  questions: [],
  unmatchedItems: [],
  exclusions: [],
  safetyNotes: ['Revisar cantidades, alcance y condiciones reales en obra antes de enviar.'],
  items: [],
});

const buildElectricSelection = (description, answers, templateKey, catalog) => {
  const result = baseSelection('electricidad', templateKey);
  const text = normalizeQuantities(description);
  const lights = readAnswerNumber(answers, 'luces') || findQuantity(description, ['luces', 'luz']);
  const outlets = readAnswerNumber(answers, 'tomacorrientes') || findQuantity(description, ['tomacorrientes', 'tomacorriente', 'tomas', 'toma']);
  const mouths = readAnswerNumber(answers, 'bocas') || findQuantity(description, ['bocas', 'boca']) || ((lights || outlets) ? Number(lights || 0) + Number(outlets || 0) : null);
  const routeMeters = readAnswerNumber(answers, 'metros_canalizacion') || findMeters(description, ['canaleta', 'cano corrugado', 'canalizacion', 'recorrido']);
  const cable15 = readAnswerNumber(answers, 'metros_cable_15');
  const cable25 = readAnswerNumber(answers, 'metros_cable_25');
  const boxes = readAnswerNumber(answers, 'cajas') || findQuantity(description, ['cajas', 'caja']);
  const wall = readAnswerString(answers, 'tipo_muro') || (text.includes('ladrillo hueco') ? 'ladrillo_hueco' : text.includes('ladrillo comun') ? 'ladrillo_comun' : text.includes('a la vista') ? 'vista' : '');
  const hasPhotocell = templateKey === 'iluminacion_fotocelula' || text.includes('fotocelula') || text.includes('fotocontrol');

  result.title = mouths ? `Instalacion electrica de ${mouths} bocas` : 'Instalacion electrica';
  if (!mouths) addQuestion(result.questions, answers, question('bocas', 'Cuantas bocas electricas hay en total?', 'La mano de obra se valoriza por boca.', 'number', { unit: 'bocas' }));
  if (!lights && (templateKey === 'iluminacion_fotocelula' || text.includes('luz') || text.includes('ilumin'))) addQuestion(result.questions, answers, question('luces', 'Cuantas bocas corresponden a luces?', 'Define cajas, cableado y artefactos opcionales.', 'number', { unit: 'bocas' }));
  if (!outlets && (templateKey === 'tomas' || text.includes('toma'))) addQuestion(result.questions, answers, question('tomacorrientes', 'Cuantas bocas son tomacorrientes?', 'Permite separar el alcance del circuito de tomas.', 'number', { unit: 'bocas' }));

  if (mouths) {
    addSelection(result.items, findCatalogItem(catalog, [['obra nueva', 'canalizacion propia'], ['canalizacion propia']], 'boca'), mouths, 'Tendido de conductores en canalizacion ejecutada por el profesional.');
    addSelection(result.items, findCatalogItem(catalog, [['punto', 'toma simple', 'portalampara'], ['punto', 'toma']], 'boca'), mouths, 'Conexion de las bocas terminales; no incluye luminarias definitivas.');
  }

  if (!wall && (templateKey === 'canalizacion' || text.includes('canalet') || text.includes('embut'))) {
    addQuestion(result.questions, answers, question('tipo_muro', 'Como se ejecuta la canalizacion?', 'La mano de obra cambia segun el soporte.', 'choice', {
      options: [
        { value: 'ladrillo_hueco', label: 'Ladrillo hueco' },
        { value: 'ladrillo_comun', label: 'Ladrillo comun' },
        { value: 'vista', label: 'A la vista' },
      ],
    }));
  }
  if (!routeMeters && (templateKey === 'canalizacion' || text.includes('canalet') || text.includes('cano') || mouths)) {
    addQuestion(result.questions, answers, question('metros_canalizacion', 'Cuantos metros de canaleta y cano corrugado hay?', 'No se infieren metros desde la cantidad de bocas.', 'number', { unit: 'm' }));
  }
  if (wall && routeMeters) {
    if (wall !== 'vista') {
      addSelection(
        result.items,
        findCatalogItem(catalog, [['calado', 'muro', 'caneria electrica'], ['calado', 'muro', 'electrica']], 'metro'),
        routeMeters,
        'Calado o ranurado del muro para alojar la caneria electrica; no incluye tapado ni revoque.'
      );
    }
    const wallGroups = wall === 'ladrillo_hueco'
      ? [['amurado', 'ladrillo hueco'], ['mamposteria', 'ladrillo hueco']]
      : wall === 'ladrillo_comun'
        ? [['amurado', 'ladrillo comun'], ['mamposteria', 'ladrillo comun']]
        : [['canalizacion', 'vista'], ['caneria', 'vista']];
    addSelection(result.items, findCatalogItem(catalog, wallGroups, 'metro') || findCatalogItem(catalog, wallGroups), routeMeters, `Ejecucion de canalizacion ${wall === 'vista' ? 'a la vista' : `embutida en ${wall.replace('_', ' ')}`}.`);
  }
  addSelection(result.items, findCatalogItem(catalog, [['cano corrugado', '3/4'], ['cano corrugado']], 'metro'), routeMeters, 'Cano corrugado para la canalizacion.');

  if (boxes && lights) addSelection(result.items, findCatalogItem(catalog, [['caja octogonal']]), Math.min(boxes, lights), 'Cajas terminales para puntos de luz.');
  if (boxes && outlets) addSelection(result.items, findCatalogItem(catalog, [['caja rectangular', '10x5'], ['caja rectangular']]), Math.min(boxes, outlets), 'Cajas terminales para tomacorrientes.');
  if (!boxes && mouths) addQuestion(result.questions, answers, question('cajas', 'Cuantas cajas terminales se colocan?', 'Las cajas deben computarse con una cantidad confirmada.', 'number', { unit: 'unidades' }));

  if (lights) {
    if (!cable15) addQuestion(result.questions, answers, question('metros_cable_15', 'Cuantos metros totales de cable de iluminacion se colocan?', 'Se cuentan metros de conductor, no metros de pared.', 'number', { unit: 'm' }));
    addSelection(result.items, findCatalogItem(catalog, [['cable unipolar', '1.5mm'], ['cable unipolar', '1,5']], 'metro'), cable15, 'Conductores para iluminacion.');
    const luminarias = readAnswerString(answers, 'luminarias_incluidas');
    if (!luminarias) addQuestion(result.questions, answers, question('luminarias_incluidas', 'Se incluyen las luminarias definitivas?', 'Las bocas no implican automaticamente la provision o colocacion de artefactos.', 'choice', { required: false, options: [{ value: 'si', label: 'Si, incluir colocacion' }, { value: 'no', label: 'No, dejarlas fuera' }] }));
    if (luminarias === 'si') addSelection(result.items, findCatalogItem(catalog, [['artefacto', 'aplique simple'], ['spot led']]), lights, 'Colocacion de luminarias definitivas.', { optional: true, confidence: 'medium' });
  }
  if (outlets) {
    if (!cable25) addQuestion(result.questions, answers, question('metros_cable_25', 'Cuantos metros totales de cable para tomacorrientes se colocan?', 'Se cuentan metros de conductor, no metros de pared.', 'number', { unit: 'm' }));
    addSelection(result.items, findCatalogItem(catalog, [['cable unipolar', '2.5mm'], ['cable unipolar', '2,5']], 'metro'), cable25, 'Conductores para tomacorrientes.');
  }
  if (hasPhotocell) {
    addSelection(result.items, findCatalogItem(catalog, [['contactores', 'sensores'], ['sensor']]), 1, 'Instalacion y conexion de la fotocelula.', { confidence: 'medium' });
    result.unmatchedItems.push({ description: 'Fotocelula', quantity: 1, unit: 'unidad', reason: 'Sin coincidencia exacta de material activo en el catalogo.' });
  }
  materialSupplyQuestions(result.questions, answers, result.unmatchedItems, result.exclusions, 'Electricidad');
  result.safetyNotes.push('Confirmar conductor de proteccion, secciones y protecciones del circuito antes de ejecutar.');
  return result;
};

const buildSanitarySelection = (description, answers, templateKey, catalog) => {
  const result = baseSelection('sanitarios', templateKey);
  const text = normalizeText(description);
  const quantity = readAnswerNumber(answers, 'cantidad_trabajos') || findQuantity(description, ['artefactos', 'artefacto', 'griferias', 'griferia', 'bombas', 'bomba', 'termotanques', 'termotanque']) || 1;
  const meters = readAnswerNumber(answers, 'metros_caneria') || findMeters(description, ['caneria', 'cañeria', 'desague']);
  const inferredTemplate = templateKey || (text.includes('grifer') ? 'griferia' : text.includes('destap') || text.includes('desague') ? 'desagues_destapes' : text.includes('bomba') || text.includes('termotanque') ? 'bombas_termotanques' : text.includes('caneria') ? 'canerias' : 'artefactos');
  const groups = {
    griferia: [['grifer']],
    artefactos: [['artefacto sanitario'], ['inodoro'], ['lavatorio']],
    canerias: [['caneria'], ['tendido', 'agua']],
    desagues_destapes: [['destap'], ['desague']],
    bombas_termotanques: [['bomba'], ['termotanque']],
  }[inferredTemplate] || [['sanitari']];
  const usesMeters = inferredTemplate === 'canerias';
  if (usesMeters && !meters) addQuestion(result.questions, answers, question('metros_caneria', 'Cuantos metros de caneria se ejecutan?', 'La longitud no se puede inferir del tipo de trabajo.', 'number', { unit: 'm' }));
  addSelection(result.items, findCatalogItem(catalog, groups, usesMeters ? 'metro' : undefined), usesMeters ? meters : quantity, `Mano de obra de ${String(inferredTemplate).replace(/_/g, ' ')}.`);
  result.unmatchedItems.push({ description: `Materiales de ${String(inferredTemplate).replace(/_/g, ' ')}`, quantity: null, unit: null, reason: 'Deben confirmarse segun diametro, marca y condicion existente.' });
  materialSupplyQuestions(result.questions, answers, result.unmatchedItems, result.exclusions, 'Sanitarios');
  result.title = `${TRADE_LABELS.sanitarios}: ${String(inferredTemplate).replace(/_/g, ' ')}`;
  result.safetyNotes.push('Confirmar diametros, uniones, llaves de paso y pruebas de estanqueidad en obra.');
  return result;
};

const buildPaintSelection = (description, answers, templateKey, catalog) => {
  const result = baseSelection('pintura', templateKey);
  const text = normalizeText(description);
  const variant = templateKey || (text.includes('exterior') ? 'exterior' : text.includes('cielorraso') ? 'cielorraso' : 'interior');
  const surface = readAnswerNumber(answers, 'superficie_m2') || findQuantity(description, ['m2', 'metros cuadrados']);
  const coats = readAnswerNumber(answers, 'manos_pintura');
  if (!surface) addQuestion(result.questions, answers, question('superficie_m2', 'Cuantos metros cuadrados se pintan?', 'La superficie confirmada define la mano de obra.', 'number', { unit: 'm2' }));
  if (!coats) addQuestion(result.questions, answers, question('manos_pintura', 'Cuantas manos de pintura se aplican?', 'Define el consumo; no se asume una cantidad de manos.', 'number', { unit: 'manos' }));
  addSelection(result.items, findCatalogItem(catalog, [[variant], ['pintura', variant]], 'm2') || findCatalogItem(catalog, [['pintura']], 'm2'), surface, `Preparacion y pintura ${variant}.`);
  result.unmatchedItems.push({ description: `Pintura y preparadores para ${variant}`, quantity: null, unit: null, reason: 'La marca, rendimiento real y estado del soporte deben confirmarse.' });
  materialSupplyQuestions(result.questions, answers, result.unmatchedItems, result.exclusions, 'Pintura');
  result.title = `Pintura ${variant}`;
  result.assumptions.push(coats ? `Se confirmaron ${coats} manos; el precio manual de materiales debe respetar ese alcance.` : 'No se calcula consumo de pintura hasta confirmar las manos.');
  return result;
};

const buildMasonrySelection = (description, answers, templateKey, catalog) => {
  const result = baseSelection('mamposteria', templateKey);
  const text = normalizeText(description);
  const variant = templateKey || (text.includes('hueco 8') ? 'ladrillo_hueco_8' : text.includes('hueco 18') ? 'ladrillo_hueco_18' : text.includes('ladrillo comun') ? 'ladrillo_comun' : text.includes('bloque') ? 'bloque_cemento' : 'ladrillo_hueco_12');
  const surface = readAnswerNumber(answers, 'superficie_m2') || findQuantity(description, ['m2', 'metros cuadrados']);
  if (!surface) addQuestion(result.questions, answers, question('superficie_m2', 'Cuantos metros cuadrados netos de muro se ejecutan?', 'Debe descontar aberturas; no se inventan medidas.', 'number', { unit: 'm2' }));
  const terms = String(variant).replace(/_/g, ' ').split(' ');
  addSelection(result.items, findCatalogItem(catalog, [terms, ['mamposteria']], 'm2'), surface, `Ejecucion de muro con ${String(variant).replace(/_/g, ' ')}.`);
  result.unmatchedItems.push({ description: `Ladrillos, mezcla y consumibles para ${String(variant).replace(/_/g, ' ')}`, quantity: null, unit: null, reason: 'Los coeficientes requieren superficie neta y el precio exacto de cada material.' });
  materialSupplyQuestions(result.questions, answers, result.unmatchedItems, result.exclusions, 'Mamposteria');
  result.title = `Mamposteria de ${String(variant).replace(/_/g, ' ')}`;
  result.safetyNotes.push('Confirmar espesor, encuentros, dinteles, encadenados y condiciones estructurales fuera de este computo.');
  return result;
};

const buildGuidedSelection = ({ trade, description = '', answers = {}, templateKey = null, catalog = [] }) => {
  if (!TRADES.includes(trade)) throw new Error('Rubro no soportado.');
  const builders = {
    electricidad: buildElectricSelection,
    sanitarios: buildSanitarySelection,
    pintura: buildPaintSelection,
    mamposteria: buildMasonrySelection,
  };
  const result = builders[trade](description, answers, templateKey, catalog);
  const manualTotal = readAnswerNumber(answers, 'manual_material_total');
  if (manualTotal && readAnswerString(answers, 'material_supply') === 'tecnico') {
    result.items.push({
      catalogItemId: null,
      quantity: 1,
      manualUnitPrice: manualTotal,
      manualName: `Materiales de ${TRADE_LABELS[trade]} (precio manual)`,
      purpose: 'Importe ingresado y confirmado por el tecnico.',
      optional: false,
      confidence: 'high',
    });
    result.unmatchedItems.splice(0, result.unmatchedItems.length);
  }
  return result;
};

const stableRevision = (input) => {
  const value = JSON.stringify(input || {});
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `r${(hash >>> 0).toString(36)}`;
};

const replaceProposalItems = (currentItems, nextItems, proposalId) => [
  ...(Array.isArray(currentItems) ? currentItems : []).filter((item) => item?.assistantProposalId !== proposalId),
  ...(Array.isArray(nextItems) ? nextItems : []),
];

const collectAssistantPendingConcepts = (items) => [...new Set(
  (Array.isArray(items) ? items : [])
    .flatMap((item) => Array.isArray(item?.assistantPending) ? item.assistantPending : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
)];

module.exports = {
  TRADES,
  TRADE_LABELS,
  TEMPLATE_OPTIONS,
  normalizeText,
  positiveNumber,
  detectTrade,
  catalogBelongsToTrade,
  resolveCatalogUnit,
  dedupeCatalog,
  buildGuidedSelection,
  stableRevision,
  replaceProposalItems,
  collectAssistantPendingConcepts,
};
