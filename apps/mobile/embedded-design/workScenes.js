import * as THREE from 'three';
import { MATERIALS_CATALOG } from '@/lib/materialsCatalog.js';
import { getMaterialVisual } from '@/lib/materialVisuals.js';
import { buildMaterialModel } from '@/lib/materialModel.js';
import { createMaterialPrimitives } from '@/lib/materialModelPrimitives.js';
import { createHouseDrawing, addDrawingElement, addDrawingWalls, normalizeHouseDrawing, calculateHouseDrawing } from '@/lib/houseDrawing.js';
import { buildHouseDrawingModel } from '@/lib/houseDrawingModel.js';
import { drawingWallSystem } from '@/lib/houseDrawingConstruction.js';
import { disposeMaterialModel } from '@/lib/constructionMaterialModel.js';

const drawingScenes = {
  pillar: { element: 'pilar-luz' }, fence: { element: 'cerco' }, subfloor: { element: 'contrapiso-cascote' }, screed: { element: 'carpeta-cementicia' }, 'cement-finish': { element: 'alisado-cemento' }, tiles: { element: 'piso-ceramico' }, roof: { element: 'techo-chapa' }, foundation: { element: 'zapata-aislada' }, column: { element: 'columna' }, slab: { element: 'losa-maciza' }, beam: { element: 'viga' }, 'strip-foundation': { element: 'zapata-corrida' },
  'brick-wall': { wall: 'ladrillo-comun' }, 'hollow-wall': { wall: 'ceramico-hueco' }, 'block-wall': { wall: 'bloque-hormigon' }, drywall: { wall: 'tabique-yeso-simple' }, 'drywall-double': { wall: 'tabique-yeso-doble' }, 'drywall-insulated': { wall: 'tabique-acustico' }, 'drywall-rh': { wall: 'tabique-humedo' }, 'drywall-half': { wall: 'tabique-yeso-simple', height: 1.1 }, 'wall-finish': { wall: 'ladrillo-comun', finish: 'full' }, 'plaster-wall': { wall: 'ladrillo-comun', finish: 'rough' },
};
const customIds = `ac-install ac-maintenance ac-preinstall ac-removal baseboard basin bath bath-accessories bidet breaker-mount cable-tray carpet ceiling ceiling-fan cement-wall cistern concrete-demolition concrete-tank concrete-wall conduit-surface conduit-wall countertop deck documentation door-install downpipe drain-chamber drain-maintenance drain-network drywall-frame earthing electric-buried electric-control electric-panel excavation extinguisher faucet faucet-repair flat-roof floor-removal gas-heater gas-network gas-valve generator glazing green-roof grid-ceiling hcca-wall heater-maintenance hood hydrant infiltration inspection instant-heater insulation intercom joinery-paint kitchen-cabinet landscape lighting pavers pendant-light pipe-repair plaster-removal pressure-test pump railing reinforcement rooftop-ac septic service-time sink site-cleaning site-fence site-hut site-layout site-sign skip soak-pit solar-heater stairs steel-frame stove switch-outlet tank tank-float tank-maintenance tile-roof tiled-wall toilet tube-light tv-mount wall-chase wall-demolition wardrobe washer water-buried water-heater water-network water-valve waterproof-wall window-install wood-ceiling wood-floor`.split(' ');
export const WORK_SCENE_IDS = [...Object.keys(drawingScenes), ...customIds];

function drawingModel(spec) {
  let project = createHouseDrawing();
  if (spec.element) project = addDrawingElement(project, spec.element, [0, 0]);
  else {
    project = addDrawingWalls(project, [[[0, 0], [3, 0]], [[3, 0], [3, 1.2]]]);
    project = normalizeHouseDrawing({ ...project, walls: project.walls.map((wall) => ({ ...wall, height: spec.height || 2.4, thickness: drawingWallSystem(spec.wall).thickness, construction: { system: spec.wall, finish: spec.finish || 'none' } })) });
  }
  return buildHouseDrawingModel(calculateHouseDrawing(project), { showLot: false });
}

export function buildWorkScene(id) {
  if (!WORK_SCENE_IDS.includes(id)) throw new Error('Trabajo sin escena definida');
  if (drawingScenes[id]) return drawingModel(drawingScenes[id]);
  const c = createMaterialPrimitives({ shape: 'workScene', material: 'white' });
  const { box, round, cyl, tube, sphere, rod, ring, path, surface, mat } = c;
  const concrete = surface('concrete'), steel = surface('steel'), white = surface('white'), dark = surface('rubber'), wood = surface('wood');
  const material = (key, size, p, rotation = [0, 0, 0]) => {
    const item = MATERIALS_CATALOG.find((row) => row.id === key);
    if (!item) throw new Error(`Work scene material missing: ${key}`);
    const model = buildMaterialModel(getMaterialVisual(item));
    const extent = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.scale.setScalar(size / Math.max(extent.x, extent.y, extent.z)); model.position.set(...p); model.rotation.set(...rotation); c.model.add(model); return model;
  };
  const floor = (color = concrete) => box([3.2, .1, 2.1], [0, -.15, 0], color);
  const wall = (color = mat('#d9dfdc')) => box([2.9, 2, .1], [0, .9, -.58], color);
  const pipeRun = (color, elevated = false) => {
    const y = elevated ? .72 : .15;
    path([[-1.3, y, 0], [-.6, y, 0], [-.55, y + .5, 0], [.5, y + .5, 0], [.55, y + 1.2, 0]], .055, color, .038);
    for (const p of [[-.95, y, 0], [.55, y + 1, 0]]) { ring(.075, .055, .045, p, steel, [1, 0, 0]); box([.2, .04, .1], [p[0], p[1], -.07], steel); }
  };
  const rubble = () => { for (let i = 0; i < 18; i++) c.add(new THREE.IcosahedronGeometry(.08 + i % 3 * .025, 0), [Math.sin(i * 2.3) * 1.2, -.02 + i % 2 * .05, Math.cos(i * 3.1) * .65], i % 2 ? concrete : mat('#b2785c')); };
  const tool = () => material('herramientas-martillo', .9, [1, .1, .3], [0, 0, -.5]);
  const ac = (open = false, detached = false) => {
    floor(); wall(); round([1.9, .58, .42], [-.2, 1.42, detached ? .65 : -.25], white);
    for (let i = 0; i < 8; i++) box([1.65, .025, .035], [-.2, 1.23 + i * .035, detached ? .89 : -.01], dark);
    round([.88, .72, .5], [.9, .3, .15], white); ring(.27, .23, .025, [.9, .3, .42], steel);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; rod([.9, .3, .45], [.9 + Math.cos(a) * .22, .3 + Math.sin(a) * .22, .45], .025, dark); }
    if (open) { box([1.8, .42, .06], [-.2, 1.65, .45], white).rotation.x = -.6; box([.85, .25, .03], [-.5, .15, .6], dark); material('herramientas-martillo', .8, [-.9, .05, .7], [0, 0, -.5]); }
    if (detached) { for (const x of [-.7, .2]) box([.12, .4, .08], [x, 1.4, -.46], steel); tool(); }
    if (!detached) for (const x of [.6, .72]) path([[x, 1.4, -.3], [x + .15, 1.3, -.3], [x + .15, .65, -.3]], .035, surface('copper'));
  };
  const cabinet = (wardrobe = false) => {
    floor(); wall(); const h = wardrobe ? 1.8 : .85;
    box([2.3, h, .65], [0, h / 2, -.05], wood);
    for (const x of [-.75, 0, .75]) { box([.71, h - .06, .045], [x, h / 2, .3], mat('#d7ded9')); rod([x + .19, h / 2 - .09, .35], [x + .19, h / 2 + .09, .35], .018, steel); }
    if (!wardrobe) { box([2.4, .08, .79], [0, h + .06, -.05], mat('#8c999d')); box([2.2, .5, .3], [0, 1.6, -.35], wood); }
  };
  try {
    if (['toilet', 'bidet', 'basin', 'sink', 'bath-accessories', 'faucet', 'bath', 'washer'].includes(id)) {
      floor(); wall();
      const fixture = { toilet: 'bano-cocina-inodoro', bidet: 'bano-cocina-bidet', basin: 'bano-cocina-lavatorio', sink: 'bano-cocina-bacha-de-cocina', 'bath-accessories': 'bano-cocina-accesorios-de-bano', faucet: 'sanitaria-griferia-monocomando-de-lavatorio' }[id];
      if (fixture) {
        const appliance = material(fixture, id === 'bath-accessories' ? 1.8 : 1.35, [0, id === 'toilet' || id === 'bidet' ? .58 : .9, .02]);
        if (id === 'toilet' || id === 'bidet') appliance.position.y += -.1 - new THREE.Box3().setFromObject(appliance).min.y;
      }
      else if (id === 'bath') { round([2.2, .6, 1.15], [0, .3, .2], white); round([1.95, .08, .92], [0, .62, .2], mat('#a6c2c8')); material('bano-cocina-griferia-de-ducha', .8, [-.9, 1.18, -.35]); }
      else { round([1.1, 1.25, .95], [0, .55, .05], white); ring(.36, .25, .08, [0, .5, .57], steel); cyl(.25, .02, [0, .5, .62], mat('#71939d'), [0, 0, 1]); }
      if (id !== 'bath-accessories') { for (const x of [-.2, .2]) rod([x, .05, -.38], [x, .55, -.38], .035, x < 0 ? mat('#478ab3') : mat('#b76e57')); }
    } else if (['tank', 'tank-float', 'tank-maintenance', 'cistern', 'pump', 'water-valve', 'gas-valve', 'pressure-test', 'hydrant'].includes(id)) {
      floor();
      if (id === 'cistern') { box([2.8, .3, 1.8], [0, .02, 0], mat('#aa9f82')); material('sanitaria-tanque-de-agua-de-perfil-bajo', 1.8, [0, .35, 0]); }
      else if (id.startsWith('tank')) { box([1.5, .25, 1.4], [0, .05, 0], concrete); material('sanitaria-tanque-de-agua', 1.8, [0, 1, 0]); if (id !== 'tank') { material('sanitaria-flotante-para-tanque', .65, [.9, 1.5, .2]); material('sanitaria-tapa-para-tanque-de-agua', .6, [-1, 1.1, .1]); } }
      else if (id === 'hydrant') { wall(); box([1.2, 1.2, .45], [0, 1, -.23], mat('#ae4039')); material('sanitaria-canilla-de-servicio', .65, [0, .95, .05]); ring(.4, .3, .16, [0, .5, .1], white); }
      else { wall(); pipeRun(id === 'gas-valve' ? mat('#c7a35a') : mat('#5e9990')); const key = id === 'pressure-test' ? 'sanitaria-bomba-de-prueba-hidraulica' : id === 'pump' ? 'sanitaria-bomba-centrifuga-elevadora' : id === 'gas-valve' ? 'gas-llave-de-paso-para-gas' : 'sanitaria-valvula-esferica-de-paso-total'; material(key, 1.1, [.15, .5, .2]); }
      if (id === 'tank-maintenance') tool();
    } else if (['water-network', 'water-buried', 'drain-network', 'downpipe', 'gas-network', 'pipe-repair', 'drain-maintenance'].includes(id)) {
      floor(); if (id !== 'water-buried') wall();
      const color = id === 'gas-network' ? mat('#b79a53') : /drain|downpipe/.test(id) ? mat('#7e9296') : mat('#579987');
      pipeRun(color);
      if (id === 'water-network') path([[-1.3, .35, .18], [-.7, .35, .18], [-.7, 1.3, .18], [.8, 1.3, .18]], .05, mat('#b57560'), .035);
      if (id === 'water-buried') { for (const z of [-.55, .55]) box([3, .32, .5], [0, -.03, z], mat('#9e9279')); }
      if (id === 'downpipe') material('sanitaria-rejilla-de-desague', .45, [.55, .03, .2]);
      if (/maintenance|repair/.test(id)) { material(id === 'pipe-repair' ? 'sanitaria-llave-de-cano' : 'sanitaria-guia-destapacanerias', 1.2, [.7, .3, .7]); material('sanitaria-tapon-sanitario-pvc', .3, [-.7, .05, .55]); }
    } else if (['drain-chamber', 'septic', 'soak-pit', 'infiltration', 'concrete-tank'].includes(id)) {
      floor(mat('#9e9279'));
      if (id === 'infiltration') { for (const z of [-.5, 0, .5]) { tube(.09, .065, 2.4, [0, .03, z], mat('#788d93')); for (let x = -1; x <= 1; x += .25) cyl(.022, .01, [x, .12, z], dark); } }
      else if (id === 'septic' || id === 'soak-pit') { cyl(.68, 1.2, [0, .5, 0], id === 'septic' ? mat('#59696c') : concrete); cyl(.7, .08, [0, 1.16, 0], concrete); tube(.12, .085, 1.1, [1, .8, 0], mat('#7d9294')); }
      else { material('sanitaria-camara-de-inspeccion', id === 'concrete-tank' ? 2 : 1.4, [0, .5, 0]); material('sanitaria-tapa-de-camara-de-inspeccion', 1.2, [0, 1.4, .3]); }
    } else if (['faucet-repair', 'heater-maintenance'].includes(id)) {
      floor(); wall();
      if (id === 'faucet-repair') { material('sanitaria-griferia-monocomando-de-lavatorio', 1, [-.5, .5, .15]); material('sanitaria-cartucho-de-monocomando', .6, [.35, .7, .2]); material('sanitaria-manija-de-griferia', .5, [.9, 1, .2]); }
      else { round([.9, 1.6, .5], [-.4, .9, -.2], white); material('sanitaria-flexible-para-termotanque', 1, [.6, .5, .2]); }
      material('sanitaria-llave-de-cano', .95, [.8, .05, .6]);
    } else if (['gas-heater', 'instant-heater', 'water-heater', 'solar-heater', 'stove', 'hood'].includes(id)) {
      floor(); wall();
      if (id === 'water-heater') { cyl(.48, 1.5, [0, .72, 0], white); for (const x of [-.2, .2]) rod([x, 1.5, 0], [x, 1.8, -.35], .035, x < 0 ? mat('#5195b4') : mat('#bd7460')); }
      else if (id === 'solar-heater') { cyl(.25, 2, [0, 1.3, 0], white, [1, 0, 0]); for (let x = -.85; x <= .86; x += .17) rod([x, 1.25, .05], [x, .2, .8], .055, mat('#35546b')); }
      else if (id === 'stove') { round([1.4, 1.3, .85], [0, .55, 0], white); box([1.1, .65, .02], [0, .4, .44], dark); for (const x of [-.36, .36]) for (const z of [-.22, .22]) ring(.18, .12, .025, [x, 1.22, z], dark, [0, 1, 0]); }
      else if (id === 'hood') { box([1.9, .18, .9], [0, 1, 0], steel); box([.55, .9, .45], [0, 1.55, -.25], steel); }
      else { round([1.4, 1.25, .35], [0, .9, -.25], white); for (let y = .45; y < 1.2; y += .12) box([1.1, .035, .02], [0, y, -.06], dark); if (id === 'instant-heater') tube(.13, .1, .65, [0, 1.85, -.25], steel, [0, 1, 0]); }
    } else if (/^ac-|^rooftop-ac$/.test(id)) {
      if (id === 'rooftop-ac') { floor(); round([2.2, .9, 1.25], [0, .4, 0], steel); for (const x of [-.55, .55]) { ring(.38, .32, .06, [x, .9, 0], dark, [0, 1, 0]); } }
      else if (id === 'ac-preinstall') { floor(); wall(); for (const x of [-.1, .1]) path([[x, 1.5, -.35], [x + .5, 1.5, -.35], [x + .5, .2, -.35]], .045, surface('copper')); box([.6, .35, .08], [0, 1.5, -.45], white); }
      else ac(id === 'ac-maintenance', id === 'ac-removal');
    } else if (['conduit-wall', 'conduit-surface', 'switch-outlet', 'electric-panel', 'breaker-mount', 'electric-control', 'intercom', 'tv-mount', 'lighting', 'pendant-light', 'tube-light', 'ceiling-fan', 'cable-tray', 'electric-buried', 'earthing', 'generator'].includes(id)) {
      floor(); wall();
      if (/conduit/.test(id) || id === 'switch-outlet') { pipeRun(mat('#717c83')); material('electricidad-conjunto-punto-y-toma', .55, [-.55, .75, .1]); material('electricidad-caja-octogonal-de-chapa', .35, [.55, 1.35, -.15]); if (id === 'conduit-wall') box([.35, 1.6, .02], [-.55, .7, -.51], mat('#ad997f')); }
      else if (/panel|breaker|control/.test(id)) { material('electricidad-tablero-electrico', 1.5, [-.25, 1, -.1]); if (id !== 'electric-panel') material('electricidad-interruptor-termomagnetico', .65, [.95, .8, .25]); }
      else if (id === 'earthing') material('electricidad-jabalina-y-caja-de-inspeccion', 2.4, [0, .9, .1]);
      else if (id === 'electric-buried') { for (const z of [-.5, .5]) box([3, .3, .5], [0, 0, z], mat('#aa987d')); for (const z of [-.08, .08]) rod([-1.3, .05, z], [1.3, .05, z], .04, dark); box([.5, .25, .5], [1, .15, 0], concrete); }
      else if (id === 'cable-tray') { for (const z of [-.23, .23]) box([2.8, .2, .035], [0, 1.2, z], steel); for (let x = -1.3; x < 1.4; x += .2) box([.045, .045, .46], [x, 1.1, 0], steel); for (const z of [-.12, .12]) rod([-1.3, 1.2, z], [1.3, 1.2, z], .025, dark); }
      else if (id === 'lighting') material('electricidad-reflector-led', 1.3, [0, 1.1, -.1]);
      else if (id === 'pendant-light' || id === 'ceiling-fan' || id === 'tube-light') { rod([0, 1.8, -.3], [0, 1.05, -.3], .035, steel); if (id === 'tube-light') { box([2.4, .1, .6], [0, 1.2, -.1], steel); for (const z of [-.15, .15]) cyl(.065, 2.2, [0, 1.1, z], white, [1, 0, 0]); } else if (id === 'ceiling-fan') { cyl(.2, .18, [0, 1, -.3], steel); for (let i = 0; i < 3; i++) { const blade = box([1.2, .04, .2], [Math.cos(i * 2.094) * .55, .98, -.3 + Math.sin(i * 2.094) * .55], wood); blade.rotation.y = -i * 2.094; } } else { cyl(.5, .45, [0, .95, -.3], white, [0, 1, 0], .7); } }
      else if (id === 'intercom') { round([.5, .85, .2], [-.5, 1, -.35], white); round([.45, .7, .12], [.65, 1, -.4], steel); for (const y of [.85, .95, 1.05]) box([.22, .025, .01], [.65, y, -.33], dark); }
      else if (id === 'tv-mount') { for (const x of [-.5, .5]) box([.1, .9, .3], [x, .95, -.3], steel); round([2.3, 1.25, .08], [0, 1, 0], dark); }
      else { round([1.7, .9, .9], [0, .4, 0], mat('#526e6a')); cyl(.3, .5, [.65, .45, .1], steel, [1, 0, 0]); }
    } else if (['wall-demolition', 'concrete-demolition', 'floor-removal', 'plaster-removal', 'wall-chase'].includes(id)) {
      floor();
      if (id === 'floor-removal') { for (let x = -1; x < 1.1; x += .5) box([.46, .05, .8], [x, -.05, -.35], mat('#91a9ab')); box([.8, .06, .8], [.5, .25, .5], mat('#91a9ab')).rotation.z = .45; }
      else if (id === 'wall-chase') { box([1.1, 1.8, .2], [-.75, .8, -.4], mat('#b68d73')); box([1.1, 1.8, .2], [.75, .8, -.4], mat('#b68d73')); rod([0, 0, -.4], [0, 1.6, -.4], .04, steel); }
      else { box([1, 1.8, .25], [-.9, .8, -.4], id === 'concrete-demolition' ? concrete : mat('#ac7d63')); box([1.2, .55, .25], [.4, .18, -.4], concrete); if (id === 'concrete-demolition') for (const x of [-.2, .2, .6]) rod([x, .3, -.4], [x, 1.3, -.4], .025, steel); }
      rubble(); tool();
    } else if (['kitchen-cabinet', 'wardrobe', 'countertop'].includes(id)) cabinet(id === 'wardrobe');
    else if (['wood-floor', 'carpet', 'deck', 'pavers', 'baseboard', 'tiled-wall', 'joinery-paint', 'waterproof-wall', 'insulation', 'hcca-wall', 'cement-wall', 'drywall-frame', 'concrete-wall'].includes(id)) {
      floor();
      if (id === 'carpet') { box([2.9, .06, 1.8], [0, -.06, 0], surface('fabric')); tube(.14, .1, 1.8, [1.35, .08, 0], surface('fabric'), [0, 0, 1]); }
      else if (['wood-floor', 'deck', 'pavers'].includes(id)) {
        for (let x = -1.35; x <= 1.36; x += id === 'pavers' ? .4 : .23) for (const z of [-.5, .35]) box([id === 'pavers' ? .36 : .2, .08, .8], [x, -.05, z], id === 'carpet' ? surface('fabric') : id === 'pavers' ? mat('#98a29b') : wood);
      } else if (id === 'drywall-frame') { for (let x = -1.2; x <= 1.21; x += .6) { box([.04, 1.8, .12], [x, .8, -.3], steel); box([.09, 1.8, .03], [x, .8, -.35], steel); } for (const y of [-.1, 1.7]) box([2.5, .04, .15], [0, y, -.3], steel); }
      else { wall(id === 'hcca-wall' ? mat('#e3e4de') : id === 'concrete-wall' ? concrete : undefined); if (id === 'tiled-wall') for (let x = -1.2; x < 1.3; x += .4) for (let y = .1; y < 1.8; y += .4) box([.38, .38, .025], [x, y, -.51], mat('#91b0b3')); else if (id === 'baseboard') box([2.8, .16, .08], [0, .03, -.49], wood); else if (id === 'insulation') { box([1.3, 1.75, .15], [-.7, .8, -.46], mat('#cfbf83')); for (const x of [-1.35, -.7, 0]) box([.04, 1.8, .2], [x, .8, -.4], steel); } else if (id === 'waterproof-wall' || id === 'cement-wall') box([1.5, 1.85, .025], [-.65, .85, -.51], mat(id === 'cement-wall' ? '#7d8a8b' : '#5b6e6d')); else if (id === 'joinery-paint') { box([1.1, 1.6, .08], [0, .8, -.4], wood); material('pintura-rodillo-y-repuesto', .8, [.95, .6, .15]); } }
    } else if (['door-install', 'window-install', 'railing', 'glazing'].includes(id)) {
      floor();
      if (id === 'glazing') material('aberturas-vidrio-laminado', 2.1, [0, 1, 0]);
      else if (id === 'railing') { for (let x = -1.2; x <= 1.21; x += .3) rod([x, .1, 0], [x, 1.5, 0], .025, steel); for (const y of [.1, 1.5]) rod([-1.3, y, 0], [1.3, y, 0], .04, steel); }
      else { for (const x of [-1.15, 1.15]) box([.5, 2, .16], [x, .9, -.4], mat('#d9dfdc')); box([2.8, .25, .16], [0, 1.85, -.4], mat('#d9dfdc')); const width = id === 'door-install' ? .95 : 1.7, h = id === 'door-install' ? 1.8 : 1.1, y = id === 'door-install' ? .8 : 1; for (const x of [-width / 2, width / 2]) box([.07, h, .12], [x, y, -.4], wood); for (const dy of [-h / 2, h / 2]) box([width, .07, .12], [0, y + dy, -.4], wood); box([width - .08, h - .08, .04], [0, y, -.4], id === 'door-install' ? wood : mat('#92b3be')); }
    } else if (['ceiling', 'wood-ceiling', 'grid-ceiling', 'flat-roof', 'green-roof', 'tile-roof'].includes(id)) {
      for (const x of [-1.25, 1.25]) box([.15, 1.25, 1.8], [x, .5, 0], concrete);
      const roofMaterial = id === 'wood-ceiling' ? wood : id === 'green-roof' ? mat('#7e9a68') : white;
      box([2.8, .14, 2], [0, 1.2, 0], roofMaterial);
      for (let x = -1.25; x < 1.3; x += .35) {
        if (id === 'tile-roof') for (let z = -.75; z < .9; z += .35) cyl(.16, .4, [x, 1.35 + Math.abs(z) * .1, z], mat('#b87457'), [0, 0, 1]);
        else if (id === 'grid-ceiling') { box([.025, .04, 2], [x, 1.3, 0], steel); for (const z of [-.5, 0, .5]) box([2.7, .04, .025], [0, 1.3, z], steel); }
        else if (id === 'wood-ceiling') box([.025, .01, 2], [x, 1.28, 0], dark);
      }
      if (id === 'flat-roof') { box([1.4, .05, 2], [-.7, 1.3, 0], mat('#70858b')); tube(.08, .06, .7, [1, 1.2, .65], steel, [0, 1, 0]); }
      if (id === 'green-roof') for (let i = 0; i < 24; i++) sphere([.08, .06, .08], [Math.sin(i * 2.3) * 1.2, 1.32, Math.cos(i * 3) * .8], mat('#548361'));
    } else if (['stairs', 'steel-frame', 'reinforcement'].includes(id)) {
      floor();
      if (id === 'stairs') for (let i = 0; i < 7; i++) box([1, .18 * (i + 1), .28], [0, .09 * (i + 1), i * .27 - .9], concrete);
      else if (id === 'steel-frame') { for (const x of [-1, 1]) { box([.1, 1.8, .35], [x, .8, 0], steel); box([.3, .06, .35], [x, 1.7, 0], steel); } box([2.4, .2, .15], [0, 1.75, 0], steel); }
      else { for (const x of [-.23, .23]) for (const z of [-.23, .23]) rod([x, -.05, z], [x, 1.9, z], .025, steel); for (let y = .05; y < 1.9; y += .18) path([[-.26, y, -.26], [.26, y, -.26], [.26, y, .26], [-.26, y, .26], [-.26, y, -.26]], .016, steel); }
    } else if (['documentation', 'service-time', 'inspection'].includes(id)) {
      box([2.8, .12, 1.7], [0, 0, 0], wood);
      if (id === 'documentation') { round([1.45, .07, 1.5], [-.4, .1, 0], mat('#61767b')); box([1.25, .015, 1.25], [-.4, .15, 0], white); for (let i = 0; i < 6; i++) box([.75 + i % 2 * .25, .005, .015], [-.4, .16, -.4 + i * .16], mat('#88989b')); box([.4, .07, .13], [-.4, .2, -.67], steel); rod([.55, .15, -.5], [1.05, .15, .45], .03, mat('#d38d3f')); }
      else if (id === 'service-time') { material('seguridad-casco-de-seguridad', .95, [-.6, .45, 0]); cyl(.5, .12, [.65, .58, .1], white, [0, 0, 1]); rod([.65, .58, .18], [.65, .94, .18], .018, dark); rod([.65, .58, .18], [.95, .45, .18], .018, dark); }
      else { round([.7, 1.05, .2], [-.5, .56, .1], mat('#bd8a42')); box([.48, .3, .025], [-.5, .84, .22], mat('#92ac9c')); cyl(.17, .04, [-.5, .45, .23], dark, [0, 0, 1]); for (const x of [-.65, -.35]) path([[x, .1, .17], [x + .8, .05, .3], [x + 1.2, .15, .1]], .02, x < -.5 ? dark : mat('#b45a50')); }
    } else if (['site-cleaning', 'site-sign', 'site-fence', 'site-hut', 'site-layout', 'excavation', 'skip', 'landscape', 'extinguisher'].includes(id)) {
      floor(id === 'landscape' ? mat('#7c9569') : undefined);
      if (id === 'site-sign') { for (const x of [-.85, .85]) rod([x, -.05, 0], [x, 1.9, 0], .045, wood); box([2, 1, .07], [0, 1.2, 0], white); for (let y = .95; y < 1.55; y += .15) box([1.5, .03, .01], [0, y, .04], mat('#7e9299')); }
      else if (id === 'site-fence') for (let x = -1.4; x < 1.5; x += .4) { box([.38, 1.6, .07], [x, .7, 0], mat('#7d9490')); }
      else if (id === 'site-hut') { box([2.2, 1.5, 1.2], [0, .65, 0], mat('#94a5a4')); box([2.4, .08, 1.4], [0, 1.45, 0], steel); box([.5, 1.2, .02], [-.55, .5, .62], wood); box([.6, .45, .02], [.55, .9, .62], mat('#b4d1d6')); }
      else if (id === 'site-layout') { for (const x of [-1, 1]) for (const z of [-.6, .6]) { rod([x, -.1, z], [x, .4, z], .03, wood); } for (const z of [-.6, .6]) rod([-1, .3, z], [1, .3, z], .009, mat('#d78c4c')); for (const x of [-1, 1]) rod([x, .3, -.6], [x, .3, .6], .009, mat('#d78c4c')); }
      else if (id === 'excavation') { for (const z of [-.7, .7]) box([2.9, .4, .55], [0, .04, z], mat('#ac977a')); rubble(); }
      else if (id === 'skip') { box([2, .06, 1.1], [0, .05, 0], mat('#b88742')); for (const z of [-.55, .55]) box([2.1, .8, .07], [0, .4, z], mat('#b88742')); for (const x of [-1, 1]) box([.07, .8, 1.1], [x, .4, 0], mat('#b88742')); rubble(); }
      else if (id === 'extinguisher') { wall(); cyl(.25, 1.1, [0, .65, -.2], mat('#ac433c')); round([.3, .1, .15], [0, 1.3, -.2], dark); path([[0, 1.25, -.2], [.3, 1.15, -.2], [.35, .7, -.2]], .025, dark); }
      else if (id === 'landscape') { for (let i = 0; i < 50; i++) rod([Math.sin(i * 2.3) * 1.3, -.08, Math.cos(i * 3) * .85], [Math.sin(i * 2.3) * 1.3, .08, Math.cos(i * 3) * .85], .012, mat('#538256')); }
      else { rubble(); rod([.6, .1, .5], [1, 1.4, .5], .035, wood); box([.6, .12, .2], [.6, .05, .5], dark); }
    } else throw new Error(`Work scene not implemented: ${id}`);
    const model = c.finish(); model.userData.workScene = id; return model;
  } catch (error) { disposeMaterialModel(c.model); c.disposeUnused(); throw error; }
}
