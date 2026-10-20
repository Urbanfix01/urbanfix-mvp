type Item = { id: string; name: string; type: string; source_ref?: string | null };
type Material = { id: string; name: string };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// Visual families only, never price/unit equivalence or manufacturer-specific models.
export const SOURCE_RENDER_FAMILIES: Record<string, string> = {};
const bind = (id: string, refs: string) => refs.split('|').forEach((ref) => { SOURCE_RENDER_FAMILIES[`cifras-367-2026-10:material:${ref}`] = id; });
bind('obra-gruesa-arena-fina', 'sand-bag|sand-truck|sand-delivered');
bind('obra-gruesa-piedra-partida', 'gravel-delivered|gravel-germat');
bind('obra-gruesa-cemento-portland', 'cement-holcim|cement-loma-spahn|cement-loma-sfm');
bind('obra-gruesa-cemento-de-albanileria', 'masonry-cement-revofacil|masonry-cement-plasticor');
bind('obra-gruesa-cal-hidratada', 'lime-hydrated|lime-hydrated-andina');
bind('obra-gruesa-cal-viva-molida', 'lime-quick-andina');
bind('yeso-placa-de-yeso-estandar', 'board-std-240-125|board-std-240-95|board-std-260|board-std-300|board-placo');
bind('yeso-montante-para-tabique-de-yeso', 'stud-69|stud-34');
bind('yeso-solera-para-tabique-de-yeso', 'track-70|track-35');
bind('yeso-perfil-omega', 'omega');
bind('yeso-cantonera-para-placa-de-yeso', 'corner');
bind('yeso-tornillo-t1-para-bastidor', 'screw-t1-needle|screw-t1-drill');
bind('yeso-tornillo-t2-para-placas', 'screw-t2-needle|screw-t2-drill');
bind('yeso-cinta-de-papel-para-juntas', 'paper-tape-75|paper-tape-150');
bind('yeso-masilla-para-juntas-de-yeso', 'compound-ready-32|compound-ready-18|compound-ready-7|compound-powder-25');
bind('aislaciones-lana-de-vidrio', 'insulation-aluminum-50|insulation-aluminum-80|insulation-plain-38');
bind('techos-chapa-acanalada', 'sheet-galvanized|sheet-aluzinc');
bind('techos-chapa-trapezoidal', 'sheet-t101');
bind('techos-chapa-prepintada', 'sheet-color');
bind('sanitaria-cano-sanitario-de-pvc', 'pvc-40|pvc-50|pvc-63');
bind('sanitaria-tanque-de-agua', 'tank-retail');
bind('sanitaria-llave-de-paso', 'valve-13|valve-19-bronze');
bind('sanitaria-canilla-de-servicio', 'garden-faucet-retail');
bind('electricidad-jabalina-y-caja-de-inspeccion', 'ground-rod');
bind('electricidad-interruptor-diferencial', 'rcd-2-40');
bind('electricidad-caja-para-medidor-monofasico', 'meter-box');
bind('electricidad-cano-galvanizado-de-acometida', 'entry-pipe');
bind('armaduras-acero-corrugado-para-armaduras', 'rebar-8|rebar-10|rebar-12|rebar-16');
bind('armaduras-malla-electrosoldada', 'mesh-5');
bind('mamposteria-ladrillo-comun-macizo', 'common-brick');
bind('mamposteria-ladrillo-ceramico-hueco', 'hollow-brick-8-retail|hollow-brick-12-retail|hollow-brick-18-retail');
bind('mamposteria-bloque-de-hormigon', 'concrete-block-retail');
bind('revoques-yeso-de-construccion', 'plaster-bag');
bind('obra-gruesa-aditivo-hidrofugo-para-mortero', 'waterproof-additive');
bind('pisos-porcelanato', 'porcelain-london-retail|porcelain-carrara-retail');
bind('aberturas-vidrio-float', 'glass-clear-3');
bind('aberturas-vidrio-templado', 'glass-tempered-10');

const legacyFamilies: [RegExp, string][] = [
  [/^cable (?:unipolar |\d)/, 'electricidad-cable-unipolar'],
  [/^cable canal /, 'electricidad-cablecanal'],
  [/^cano corrugado /, 'electricidad-cano-corrugado-para-electricidad'],
  [/^cano rigido pvc /, 'electricidad-cano-rigido-para-electricidad'],
  [/^caja rectangular /, 'electricidad-caja-para-interruptor-o-tomacorriente'],
  [/^(?:caja tablero |gabinete tablero )/, 'electricidad-tablero-electrico'],
  [/^(?:disyuntor diferencial |interruptor diferencial )/, 'electricidad-interruptor-diferencial'],
  [/^(?:llave termomagnetica |termomagnetica )/, 'electricidad-interruptor-termomagnetico'],
  [/^modulo (?:toma\b|tomacorriente)/, 'electricidad-tomacorriente'],
  [/^modulo punto /, 'electricidad-interruptor-de-iluminacion'],
  [/^lampara led /, 'electricidad-lampara-led'],
  [/^cinta aisladora /, 'electricidad-cinta-aisladora'],
  [/^jabalina /, 'electricidad-jabalina-y-caja-de-inspeccion'],
  [/^bastidor \+ tapa(?: \([^)]*\))?$/, 'electricidad-bastidor-y-tapa-modular'],
  [/^bastidor rectangular 10x5 \(plastico\)$/, 'electricidad-bastidor-modular'],
  [/^tapa bastidor 10x5 \(blanca\)$/, 'electricidad-tapa-para-bastidor-modular'],
  [/^caja octogonal chica\/grande \(chapa\)$/, 'electricidad-caja-octogonal-de-chapa'],
  [/^conector pvc 3\/4 o 20mm \(unidad\)$/, 'electricidad-conector-pvc-para-caja-electrica'],
  [/^kit armado punto y toma \(bast\+tapa\+modulos\)$/, 'electricidad-conjunto-punto-y-toma'],
  [/^portalampara ceramico$/, 'electricidad-portalampara-ceramico'],
  [/^precintos plasticos 20cm \(paquete x100\)$/, 'fijaciones-precinto-plastico'],
  [/^reflector led 50w$/, 'electricidad-reflector-led'],
  [/^tarugos \+ tornillos 8mm \(bolsita x 10\)$/, 'fijaciones-tarugo-con-tornillo'],
  [/^tortuga led exterior$/, 'electricidad-luminaria-tortuga-led'],
];
export function resolveCatalogMaterial(item: Item, catalog: Material[]): Material | null {
  if (!['material', 'consumable'].includes(item.type)) return null;
  const direct = catalog.find((entry) => entry.id === item.id);
  if (direct) return direct;
  const source = item.source_ref || '', family = SOURCE_RENDER_FAMILIES[source];
  if (family) return catalog.find((entry) => entry.id === family) || null;
  const name = normalize(item.name), exact = catalog.filter((entry) => normalize(entry.name) === name);
  if (exact.length === 1) return exact[0];
  // Unknown technical references do not borrow a vaguely matching render.
  if (source && source !== 'electricidad') return null;
  const rule = legacyFamilies.find(([pattern]) => pattern.test(name));
  return rule ? catalog.find((entry) => entry.id === rule[1]) || null : null;
}
