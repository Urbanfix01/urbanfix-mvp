type RubroSourceItem = {
  category?: string | null;
  source_ref?: string | null;
  name?: string | null;
};

export const RUBRO_ORDER = [
  'electricidad',
  'plomeria',
  'sanitario',
  'agua cloaca',
  'gas',
  'albanileria',
  'pintura',
  'aire acondicionado',
  'refrigeracion',
  'cerrajeria',
  'impermeabilizacion',
  'techos',
  'durlock y yeseria',
  'pisos y revestimientos',
  'carpinteria',
  'herreria',
  'vidrieria y aberturas',
  'soldadura',
  'portones automaticos',
  'alarmas y camaras',
  'redes y datos',
  'calefaccion',
  'energia solar',
  'jardineria y poda',
  'limpieza post obra',
  'control de plagas',
  'mantenimiento de piletas',
  'mantenimiento de consorcios',
  'mantenimiento comercial',
  'banos y cocinas',
  'demolicion',
  'excavaciones',
  'movimiento de suelo',
  'hormigon armado',
  'estructuras metalicas',
  'jornales',
  'general',
] as const;

const RUBRO_LABELS: Record<string, string> = {
  electricidad: 'Electricidad',
  plomeria: 'Plomeria',
  sanitario: 'Sanitario',
  'agua cloaca': 'Agua y Cloaca',
  gas: 'Gas',
  albanileria: 'Albanileria',
  pintura: 'Pintura',
  'aire acondicionado': 'Aire acondicionado',
  refrigeracion: 'Refrigeracion',
  cerrajeria: 'Cerrajeria',
  impermeabilizacion: 'Impermeabilizacion',
  techos: 'Techos',
  'durlock y yeseria': 'Durlock y yeseria',
  'pisos y revestimientos': 'Pisos y revestimientos',
  carpinteria: 'Carpinteria',
  herreria: 'Herreria',
  'vidrieria y aberturas': 'Vidrieria y aberturas',
  soldadura: 'Soldadura',
  'portones automaticos': 'Portones automaticos',
  'alarmas y camaras': 'Alarmas y camaras',
  'redes y datos': 'Redes y datos',
  calefaccion: 'Calefaccion',
  'energia solar': 'Energia solar',
  'jardineria y poda': 'Jardineria y poda',
  'limpieza post obra': 'Limpieza post obra',
  'control de plagas': 'Control de plagas',
  'mantenimiento de piletas': 'Mantenimiento de piletas',
  'mantenimiento de consorcios': 'Mantenimiento de consorcios',
  'mantenimiento comercial': 'Mantenimiento comercial',
  'banos y cocinas': 'Banos y cocinas',
  demolicion: 'Demolicion',
  excavaciones: 'Excavaciones',
  'movimiento de suelo': 'Movimiento de suelo',
  'hormigon armado': 'Hormigon armado',
  'estructuras metalicas': 'Estructuras metalicas',
  jornales: 'Jornales y Visitas',
  general: 'General',
};

const RUBRO_TOKEN_RULES: Array<{ key: string; tokens: string[] }> = [
  {
    key: 'electricidad',
    tokens: ['electric', 'electrico', 'electrica', 'tablero', 'cableado', 'luminaria', 'tomacorriente', 'enchufe'],
  },
  { key: 'plomeria', tokens: ['plomer', 'griferia', 'agua fria', 'agua caliente', 'destapacion'] },
  { key: 'sanitario', tokens: ['sanitar', 'cloaca', 'desague', 'caneria', 'pluvial'] },
  { key: 'gas', tokens: ['gas', 'calefon', 'termotanque'] },
  { key: 'albanileria', tokens: ['albanil', 'mamposter', 'revoque', 'ladrillo', 'cemento'] },
  { key: 'pintura', tokens: ['pintur', 'enduido', 'esmalte'] },
  { key: 'aire acondicionado', tokens: ['aire acond', 'split'] },
  { key: 'refrigeracion', tokens: ['refriger', 'camara de frio'] },
  { key: 'cerrajeria', tokens: ['cerrajer', 'cerradura', 'llave'] },
  { key: 'impermeabilizacion', tokens: ['impermeab', 'membrana', 'filtracion', 'hidrofugo'] },
  { key: 'techos', tokens: ['techo', 'cubierta', 'chapa', 'canaleta', 'zingueria'] },
  { key: 'durlock y yeseria', tokens: ['durlock', 'yeseria', 'yeso', 'drywall', 'placa de yeso'] },
  { key: 'pisos y revestimientos', tokens: ['piso', 'revest', 'ceram', 'porcelanato', 'baldosa', 'mosaico'] },
  { key: 'carpinteria', tokens: ['carpinter', 'placard', 'mueble de melamina'] },
  { key: 'herreria', tokens: ['herrer', 'reja'] },
  { key: 'vidrieria y aberturas', tokens: ['vidri', 'abertura', 'aluminio'] },
  { key: 'soldadura', tokens: ['soldadur'] },
  { key: 'portones automaticos', tokens: ['porton automatic', 'motor de porton'] },
  { key: 'alarmas y camaras', tokens: ['alarma', 'camara', 'cctv', 'seguridad electronica'] },
  { key: 'redes y datos', tokens: ['red de datos', 'cableado estructurado', 'wifi', 'fibra optica'] },
  { key: 'calefaccion', tokens: ['calefaccion', 'caldera', 'radiador', 'piso radiante'] },
  { key: 'energia solar', tokens: ['energia solar', 'panel solar', 'fotovoltaic', 'termotanque solar'] },
  { key: 'jardineria y poda', tokens: ['jardiner', 'poda', 'parquiz'] },
  { key: 'limpieza post obra', tokens: ['limpieza post obra', 'limpieza final de obra'] },
  { key: 'control de plagas', tokens: ['plaga', 'fumig', 'desratiz', 'desinfeccion'] },
  { key: 'mantenimiento de piletas', tokens: ['pileta', 'piscina'] },
  { key: 'mantenimiento de consorcios', tokens: ['consorcio', 'edificio'] },
  { key: 'mantenimiento comercial', tokens: ['mantenimiento comercial', 'local comercial'] },
  { key: 'banos y cocinas', tokens: ['bano', 'cocina'] },
  { key: 'demolicion', tokens: ['demolic', 'picado'] },
  { key: 'excavaciones', tokens: ['excavacion', 'zanjeo'] },
  { key: 'movimiento de suelo', tokens: ['movimiento de suelo', 'nivelacion', 'compactacion', 'relleno'] },
  { key: 'hormigon armado', tokens: ['hormigon', 'losa', 'viga', 'columna', 'encadenado', 'encofrado'] },
  { key: 'estructuras metalicas', tokens: ['estructura metal', 'perfil metal', 'ipn', 'upn'] },
];

export const normalizeRubroText = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const normalizeRawRubro = (value: string | null | undefined) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolveKnownRubro = (normalized: string) => {
  for (const rule of RUBRO_TOKEN_RULES) {
    if (rule.tokens.some((token) => normalized.includes(token))) return rule.key;
  }
  return '';
};

export const resolveMasterRubro = (item: RubroSourceItem) => {
  const primaryRaw = normalizeRawRubro(item.category || item.source_ref);
  const primaryNormalized = normalizeRubroText(primaryRaw);
  const knownFromPrimary = resolveKnownRubro(primaryNormalized);
  if (knownFromPrimary) return knownFromPrimary;
  if (primaryRaw) return primaryRaw;

  const fallbackNormalized = normalizeRubroText(item.name || '');
  const knownFromName = resolveKnownRubro(fallbackNormalized);
  if (knownFromName) return knownFromName;

  return 'general';
};

export const formatRubroLabel = (value: string) => {
  const normalized = normalizeRubroText(value);
  const trimmed = String(value || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return RUBRO_LABELS[normalized] || trimmed.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const buildMasterRubroOptions = (items: RubroSourceItem[]) => {
  const values = new Map<string, string>();
  items.forEach((item) => {
    const rubro = resolveMasterRubro(item);
    const normalized = normalizeRubroText(rubro);
    if (!normalized || normalized === 'general') return;
    values.set(normalized, formatRubroLabel(rubro));
  });

  return Array.from(values.entries())
    .sort(([leftKey, leftLabel], [rightKey, rightLabel]) => {
      const leftIndex = RUBRO_ORDER.indexOf(leftKey as (typeof RUBRO_ORDER)[number]);
      const rightIndex = RUBRO_ORDER.indexOf(rightKey as (typeof RUBRO_ORDER)[number]);
      if (leftIndex === -1 && rightIndex === -1) return leftLabel.localeCompare(rightLabel, 'es');
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    })
    .map(([, label]) => label);
};
