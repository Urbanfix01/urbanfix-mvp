import type { RubroKey } from './urbanfix-data';

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

  if (text.includes('electric')) return '26a1';
  if (text.includes('gas')) return '1f525';
  if (text.includes('sanitar') || text.includes('pluvial') || text.includes('cloac')) return '1f6bd';
  if (text.includes('refrig') || text.includes('aire')) return '2744';
  if (text.includes('pintur')) return '1f3a8';
  if (text.includes('carpinter')) return '1fa9a';
  if (text.includes('vidrier')) return '1fa9f';
  if (text.includes('demolic')) return '1f9e8';
  if (text.includes('estructura')) return '1f3d7';
  if (text.includes('mamposter') || text.includes('tabiquer')) return '1f9f1';
  if (text.includes('cubierta') || text.includes('techo')) return '1f3e0';
  if (text.includes('revoque')) return '1f9f1';
  if (text.includes('zocal')) return '1f7eb';
  if (text.includes('piso') || text.includes('revest')) return '1f9e9';
  if (text.includes('preliminar')) return '1f4cb';
  if (text.includes('equipamiento')) return '1f6cb';
  if (text.includes('aislacion')) return '1f9f0';
  if (text.includes('contrapiso')) return '1f3d7';
  if (text.includes('cielorraso')) return '1f4d0';
  if (text.includes('incendio')) return '1f692';
  if (text.includes('varios')) return '1f6e0';
  return '1f6e0';
};
