import type { RubroKey } from './urbanfix-data';

const AVAILABLE_TWEMOJI_CODES = new Set([
  '1f310',
  '1f33f',
  '1f3a8',
  '1f3ca',
  '1f3d7',
  '1f3e0',
  '1f3e2',
  '1f3ec',
  '1f3ed',
  '1f41c',
  '1f4a7',
  '1f4f9',
  '1f510',
  '1f525',
  '1f527',
  '1f529',
  '1f69c',
  '1f6aa',
  '1f6bf',
  '1f6e0',
  '1f9ca',
  '1f9e8',
  '1f9e9',
  '1f9f1',
  '1f9f9',
  '1fa9a',
  '1fa9f',
  '2600',
  '2668',
  '2699',
  '26a1',
  '26cf',
  '2744',
]);

export const rubroTwemoji: Record<RubroKey, string> = {
  electricidad: '26a1',
  plomeria: '1f527',
  pintura: '1f3a8',
  albanileria: '1f9f1',
  gasista: '1f525',
  impermeabilizacion: '1f4a7',
  techos: '1f3e0',
  carpinteria: '1fa9a',
  herreria: '1f529',
  'aire-acondicionado': '2744',
  refrigeracion: '1f9ca',
  cerrajeria: '1f510',
  'durlock-yeseria': '1f9f1',
  'pisos-revestimientos': '1f9e9',
  'vidrieria-aberturas': '1fa9f',
  soldadura: '2699',
  'portones-automaticos': '1f6aa',
  'alarmas-camaras': '1f4f9',
  'redes-datos': '1f310',
  calefaccion: '2668',
  'energia-solar': '2600',
  'jardineria-poda': '1f33f',
  'limpieza-post-obra': '1f9f9',
  'control-plagas': '1f41c',
  'mantenimiento-piletas': '1f3ca',
  'mantenimiento-consorcios': '1f3e2',
  'mantenimiento-comercial': '1f3ec',
  demolicion: '1f9e8',
  excavaciones: '26cf',
  'movimiento-suelo': '1f69c',
  'hormigon-armado': '1f3d7',
  'estructuras-metalicas': '1f3ed',
  'banos-cocinas': '1f6bf',
  'reformas-integrales': '1f6e0',
};

const pickAvailableTwemoji = (code: string) => (AVAILABLE_TWEMOJI_CODES.has(code) ? code : '1f6e0');

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const getRubroTwemojiByName = (name: string) => {
  const text = normalize(name);

  if (text.includes('electric')) return pickAvailableTwemoji('26a1');
  if (text.includes('gas')) return pickAvailableTwemoji('1f525');
  if (text.includes('sanitar')) return pickAvailableTwemoji('1f6bf');
  if (text.includes('pluvial') || text.includes('cloac') || text.includes('agua')) return pickAvailableTwemoji('1f4a7');
  if (text.includes('incendio')) return pickAvailableTwemoji('1f525');
  if (text.includes('refrig')) return pickAvailableTwemoji('1f9ca');
  if (text.includes('aire')) return pickAvailableTwemoji('2744');
  if (text.includes('pintur')) return pickAvailableTwemoji('1f3a8');
  if (text.includes('carpinter')) return pickAvailableTwemoji('1fa9a');
  if (text.includes('vidrier')) return pickAvailableTwemoji('1fa9f');
  if (text.includes('demolic')) return pickAvailableTwemoji('1f9e8');
  if (text.includes('estructura') || text.includes('contrapiso')) return pickAvailableTwemoji('1f3d7');
  if (text.includes('mamposter') || text.includes('tabiquer') || text.includes('revoque') || text.includes('zocal')) {
    return pickAvailableTwemoji('1f9f1');
  }
  if (text.includes('cubierta') || text.includes('techo')) return pickAvailableTwemoji('1f3e0');
  if (text.includes('piso') || text.includes('revest')) return pickAvailableTwemoji('1f9e9');
  if (text.includes('preliminar') || text.includes('equipamiento') || text.includes('varios')) {
    return pickAvailableTwemoji('1f6e0');
  }
  if (text.includes('aislacion')) return pickAvailableTwemoji('1f4a7');
  if (text.includes('cielorraso')) return pickAvailableTwemoji('2699');
  return pickAvailableTwemoji('1f6e0');
};
