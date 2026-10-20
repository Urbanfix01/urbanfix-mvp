type Item = { type: string; name: string; source_ref?: string | null };
export type WorkOperation = 'execution' | 'repair' | 'removal' | 'maintenance' | 'inspection' | 'documentation' | 'service';
export type WorkPreviewBinding = { name: string; model?: string; equipment?: string; operation?: WorkOperation };
export const WORK_OPERATION_LABELS: Record<WorkOperation, string> = { execution: 'Ejecucion / montaje', repair: 'Reparacion / reemplazo', removal: 'Demolicion / retiro', maintenance: 'Mantenimiento / limpieza', inspection: 'Inspeccion / ensayo', documentation: 'Servicio documental', service: 'Servicio / tiempo de trabajo' };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const models: Record<string, string> = {};
const bind = (scene: string, keys: string) => keys.split('|').forEach((key) => { models[key] = scene; });
bind('brick-wall', 'common-brick-masonry-volume'); bind('hollow-wall', 'hollow-brick-wall-8|hollow-brick-wall-12|hollow-brick-wall-18');
bind('block-wall', 'concrete-block-wall'); bind('hcca-wall', 'hcca-wall-10|hcca-wall-15|hcca-wall-20');
bind('drywall', 'drywall-simple-no-insulation'); bind('drywall-double', 'drywall-double-insulation'); bind('drywall-rh', 'drywall-rh'); bind('drywall-half', 'drywall-half-wall'); bind('drywall-insulated', 'drywall-simple-insulation'); bind('cement-wall', 'cement-board-exterior');
bind('ceiling', 'ceiling-drywall-insulation|ceiling-drywall-no-insulation'); bind('subfloor', 'subfloor-8|subfloor-10|subfloor-12'); bind('screed', 'screed'); bind('cement-finish', 'cement-floor-finish');
bind('tiles', 'ceramic-floor|porcelain-unpolished|porcelain-polished|granite-mosaic'); bind('pavers', 'concrete-tile|paver-installed');
bind('foundation', 'concrete-bases-installed'); bind('column', 'concrete-columns-installed'); bind('beam', 'concrete-beams-installed'); bind('strip-foundation', 'concrete-wall-footing-installed');
bind('waterproof-wall', 'waterproof-dash'); bind('plaster-wall', 'rough-plaster|interior-plaster-complete|cement-wall-finish'); bind('wall-finish', 'paint-exterior|paint-interior'); bind('site-fence', 'temporary-site-fence');
bind('drain-network', 'pvc-installed-40|pvc-installed-110'); bind('water-network', 'pp-installed-13|pp-installed-25'); bind('faucet', 'garden-faucet-installed'); bind('tank', 'tank-installed');

const rules: [RegExp, string, WorkOperation?][] = [
  [/^(certificado |protocolo |proyecto electrico|plano electrico|lista de materiales|tramite conexion)/, 'documentation', 'documentation'],
  [/^(hora de trabajo|jornal de|medio oficial|oficial |ayudante montador|ayuda de gremio)/, 'service-time', 'service'],
  [/^(visita|emergencia:|urgencia:|service - instalacion)/, 'inspection', 'inspection'], [/^prueba hidraulica/, 'pressure-test', 'inspection'],
  [/^demolicion.*hormigon/, 'concrete-demolition', 'removal'], [/^demolicion.*mamposteria/, 'wall-demolition', 'removal'],
  [/^retiro de pisos|^demolicion de contrapisos|^contrapiso a demoler/, 'floor-removal', 'removal'], [/^picado de revoques/, 'plaster-removal', 'removal'],
  [/^desinstalacion de a\. acond/, 'ac-removal', 'removal'], [/^destranque/, 'drain-maintenance', 'maintenance'], [/^limpieza de tanque/, 'tank-maintenance', 'maintenance'], [/^limpieza (inicial|periodica)/, 'site-cleaning', 'maintenance'],
  [/^mantenimiento split/, 'ac-maintenance', 'maintenance'], [/^reparacion fuga|^recambio de (capacitor|placa logica)/, 'ac-maintenance', 'repair'],
  [/^service completo calefon/, 'heater-maintenance', 'maintenance'], [/^cambio de flotante/, 'tank-maintenance', 'repair'], [/^reemplazo anodo/, 'heater-maintenance', 'repair'], [/^cambio /, 'faucet-repair', 'repair'],
  [/^instalacion\/reemplazo termotanque solar/, 'solar-heater', 'repair'], [/^instalacion\/reemplazo termotanque/, 'water-heater', 'repair'],
  [/^acometida en pilar o muro\b|^pilar (de luz|completo)\b|^cano de acometida/, 'pillar'],
  [/^accesorios de bano|^instalacion accesorios de bano/, 'bath-accessories'], [/^armado y colocacion de bidet|^bidet -/, 'bidet'],
  [/^armado y colocacion de inodoro|^inodoro pedestal|^instalacion de artefacto sanitario/, 'toilet'], [/vanitory|^lavatorio -/, 'basin'], [/^bacha de cocina/, 'sink'], [/^banera |^instalacion de banera/, 'bath'],
  [/^instalacion griferia|^canilla de servicio/, 'faucet'], [/^instalacion lavavajillas/, 'washer'], [/^instalacion bomba|^bomba /, 'pump'], [/^flotante electrico/, 'tank-float'],
  [/^instalacion tanque cisterna/, 'cistern'], [/^instalacion tanque|^tanque de agua polietileno/, 'tank'],
  [/^instalacion (camara septica|biodigestor)/, 'septic'], [/^instalacion (de )?lecho/, 'infiltration'], [/^pozo ciego/, 'soak-pit'], [/^instalacion camara/, 'drain-chamber'],
  [/^instalacion caneria termofusion bajo suelo/, 'water-buried'], [/^instalacion (agua fria|caneria termofusion)|^caneria pp tf/, 'water-network'],
  [/^instalacion (caneria (desague|primaria|ventilacion)|desagues)|^caneria de pvc/, 'drain-network'], [/^bajada pluvial|^conductos de ventilacion/, 'downpipe'],
  [/^(boca de (acceso|desague)|camara de inspeccion|embudo de pvc|pileta de patio)/, 'drain-chamber'], [/^boca de incendio/, 'hydrant'], [/^caneria epoxi/, 'gas-network'],
  [/^calefactor/, 'gas-heater'], [/^calefon/, 'instant-heater'], [/^termotanque gn/, 'water-heater'], [/^cocina gn/, 'stove'], [/^soldadura hidrobronz/, 'pipe-repair', 'repair'], [/^zanjeo/, 'excavation'],
  [/^pase de (losa|muro|viga)|^calado de muro/, 'wall-chase'], [/^bandeja/, 'cable-tray'], [/^cable subterraneo|^adicional por caja de paso/, 'electric-buried'],
  [/^canalizacion a la vista/, 'conduit-surface'], [/^amurado de caneria|^canalizacion|^cableado|^recableado/, 'conduit-wall'],
  [/^tablero .*solo pat|^pat de servicio/, 'earthing'], [/^agregado de gabinete|^caja de toma|^tablero |^correccion de factor/, 'electric-panel'], [/^modulo adicional/, 'breaker-mount'],
  [/^conexion de |^unidad basica de cotizacion|^colocacion derivadores/, 'switch-outlet'], [/^artefacto colgante/, 'pendant-light'], [/^artefacto aplique|^spot led/, 'lighting'], [/^equipo (de )?tubo/, 'tube-light'],
  [/^ventilador de techo/, 'ceiling-fan'], [/^instalacion (de )?(contactor|sensor)|^contactores/, 'electric-control'], [/^inst\. portero/, 'intercom'], [/^instalacion electrica de grupo/, 'generator'], [/^soporte tv/, 'tv-mount'], [/^colocacion campana/, 'hood'],
  [/^instalacion estandar roof-top/, 'rooftop-ac'], [/^pre-instalacion/, 'ac-preinstall'], [/^instalacion estandar|^montaje split/, 'ac-install'],
  [/^contrapiso\b|^(ejecucion|colocacion) de contrapiso|^hormigon (de cascotes|alivianado|armado e=)|^mortero elaborado rdc/, 'subfloor'], [/^carpeta (cementicia|de cemento)/, 'screed'],
  [/^(colocacion de )?cerco de alambrado/, 'fence'], [/^acrilica transparente|^latex para muros/, 'wall-finish'], [/^barniz|^esmalte sintetico/, 'joinery-paint'], [/^latex para cielorraso/, 'ceiling'],
  [/^aislante acustico|^lana de vidrio|^membrana espuma/, 'insulation'], [/^cementicia|^pintura (asfaltica|impermeabilizante)/, 'waterproof-wall'],
  [/^bloques hormigon/, 'block-wall'], [/^ladrillos ceramicos/, 'hollow-wall'], [/^ladrillos comunes/, 'brick-wall'], [/^armado de bastidor/, 'drywall-frame'],
  [/^cartel de obra/, 'site-sign'], [/^cerco de obra/, 'site-fence'], [/^nivelacion y replanteo/, 'site-layout'], [/^obrador/, 'site-hut'], [/^contenedor, volquete/, 'skip'], [/^parquizacion/, 'landscape'],
];
export function resolveCatalogWork(item: Item): WorkPreviewBinding | null {
  if (item.type !== 'labor') return null;
  const name = normalize(item.name), source = item.source_ref || '';
  const work = (model: string, operation: WorkOperation = 'execution'): WorkPreviewBinding => ({ model, operation, name: WORK_OPERATION_LABELS[operation] });
  if (source === 'cifras-367-2026-10:labor:subfloor-demolition') return work('floor-removal', 'removal');
  const key = source.replace(/^cifras-367-2026-10:labor:/, '');
  if (models[key]) return work(models[key]);
  if (source && !/^mo_rubro_|^aaieric_electricidad_2026_07$|^(aaieric|albanileria)$/.test(source)) return null;
  if (/^llave de paso/.test(name)) return work(source === 'mo_rubro_gas' ? 'gas-valve' : 'water-valve');
  if (source === 'mo_rubro_zocalos') return work('baseboard');
  if (/^cemento (alisado|terminacion)/.test(name)) return work('cement-finish');
  const rule = rules.find(([pattern]) => pattern.test(name));
  if (rule) return { ...work(rule[1], rule[2]), ...(rule[1] === 'bath-accessories' ? { equipment: 'bano-cocina-accesorios-de-bano' } : {}) };
  if (source === 'mo_rubro_cubiertas') return /^chapas/.test(name) ? work('roof') : /^tejas/.test(name) ? work('tile-roof') : /^plana completa/.test(name) ? work(/verde/.test(name) ? 'green-roof' : 'flat-roof') : null;
  if (source === 'mo_rubro_cielorrazos') return work(/madera/.test(name) ? 'wood-ceiling' : /vinilica/.test(name) ? 'grid-ceiling' : 'ceiling');
  if (source === 'mo_rubro_revoques') return work('plaster-wall');
  if (source === 'mo_rubro_pisos') return work(/alfombra/.test(name) ? 'carpet' : /madera/.test(name) ? /deck/.test(name) ? 'deck' : 'wood-floor' : 'tiles');
  if (source === 'mo_rubro_revestimientos') return work(/mesada/.test(name) ? 'countertop' : /escalones/.test(name) ? 'stairs' : 'tiled-wall');
  if (source === 'mo_rubro_equipamiento') return work(/matafuegos/.test(name) ? 'extinguisher' : /placares/.test(name) ? 'wardrobe' : 'kitchen-cabinet');
  if (source === 'mo_rubro_carpinterias') return /^puerta/.test(name) ? work('door-install') : /^rejas/.test(name) ? work('railing') : /^ventana/.test(name) ? work('window-install') : null;
  if (source === 'mo_rubro_vidrieria') return work('glazing');
  if (source === 'mo_rubro_estructuras') return /escalera/.test(name) ? work('stairs') : /hierros/.test(name) ? work('reinforcement') : /perfiles/.test(name) ? work('steel-frame') : /encadenado/.test(name) ? work('beam') : /tabiques/.test(name) ? work('concrete-wall') : /tanques/.test(name) ? work('concrete-tank') : /zapata/.test(name) ? work('strip-foundation') : /losa/.test(name) ? work('slab') : null;
  return null;
}
