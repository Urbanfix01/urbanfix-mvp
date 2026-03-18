import { cache } from 'react';
import { hasSupabaseConfig, supabase } from '../supabase/supabase';
import { rubros, type CiudadKey, type RubroKey } from './urbanfix-data';
import { getCatalogRubroBySlug, rubroCatalog, type RubroCatalogItem } from './rubro-catalog';

type MasterItemRow = {
  id: string;
  name: string;
  category: string | null;
  source_ref: string | null;
  suggested_price: number | null;
  created_at: string | null;
};

export type RubroPriceReference = {
  id: string;
  label: string;
  unit: string;
  reference: number;
  source: string;
  updatedAt: string | null;
};

export type RubroPriceData = {
  items: RubroPriceReference[];
  lastUpdatedAt: string | null;
  city: CiudadKey | null;
};

export type ActiveLaborCategory = {
  slug: string;
  name: string;
  itemCount: number;
  lastUpdatedAt: string | null;
};

export type CatalogRubroOverview = {
  slug: string;
  label: string;
  itemCount: number;
  lastUpdatedAt: string | null;
};

const SEO_PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

let activeLaborItemsCache:
  | {
      rows: MasterItemRow[];
      expiresAt: number;
    }
  | null = null;
let activeLaborItemsPromise: Promise<MasterItemRow[]> | null = null;
let didWarnMasterItemsFetchFailure = false;

const STOPWORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'y',
  'o',
  'con',
  'sin',
  'por',
  'para',
  'tipo',
  'obra',
  'obras',
  'trabajo',
  'trabajos',
  'servicio',
  'servicios',
  'mantenimiento',
  'reparacion',
  'reparaciones',
  'instalacion',
  'instalaciones',
  'gestion',
  'clientes',
  'materiales',
  'mano',
  'clara',
]);

const SOURCE_LABEL_ALIASES: Record<string, string> = {
  mo_rubro_elecdtricidad: 'mo rubro electricidad',
  mo_rubro_electricidad: 'mo rubro electricidad',
  mo_rubro_demolicions: 'mo rubro demoliciones',
  mo_rubro_demoliciones: 'mo rubro demoliciones',
  mo_rubro_cloaca_plucial_ventilacion: 'mo rubro cloaca pluvial ventilacion',
  mo_rubro_cloaca_pluvial_ventilacion: 'mo rubro cloaca pluvial ventilacion',
};

const rubroHints: Partial<Record<RubroKey, string[]>> = {
  electricidad: ['electricidad', 'electrica', 'tablero', 'cable', 'disyuntor'],
  plomeria: ['sanitario', 'plomeria', 'cloaca', 'agua', 'griferia', 'destanque', 'aapsya'],
  pintura: ['pintura', 'latex', 'esmalte', 'enduido'],
  albanileria: ['mamposteria', 'paramentos', 'albanileria', 'revoque'],
  gasista: ['gas', 'hermeticidad', 'calefon'],
  impermeabilizacion: ['impermeab', 'membrana', 'filtracion'],
  techos: ['cubierta', 'tejas', 'techo', 'babeta'],
  carpinteria: ['carpinteria', 'madera', 'abertura'],
  herreria: ['herreria', 'reja', 'porton', 'metalica'],
  'aire-acondicionado': ['aire', 'acondicionado', 'split'],
  refrigeracion: ['refrigeracion', 'frio', 'camara', 'aire'],
  cerrajeria: ['cerradura', 'llave', 'cerrajeria'],
  'durlock-yeseria': ['durlock', 'yeseria', 'cielorraso', 'placas'],
  'pisos-revestimientos': ['piso', 'revestimiento', 'porcelanato', 'ceramico'],
  'vidrieria-aberturas': ['vidrio', 'ventana', 'abertura'],
  soldadura: ['soldadura', 'soldar', 'metalica'],
  'portones-automaticos': ['porton', 'automatico', 'motor'],
  'alarmas-camaras': ['alarma', 'camara', 'monitoreo'],
  'redes-datos': ['red', 'datos', 'cableado', 'wifi'],
  calefaccion: ['calefaccion', 'caldera', 'radiador'],
  'energia-solar': ['solar', 'fotovoltaico', 'termotanque'],
  'jardineria-poda': ['jardineria', 'poda', 'riego'],
  'limpieza-post-obra': ['limpieza', 'post', 'obra'],
  'control-plagas': ['plaga', 'fumigacion', 'desratizacion'],
  'mantenimiento-piletas': ['pileta', 'filtrado', 'quimicos'],
  'mantenimiento-consorcios': ['consorcio', 'edificio', 'guardia'],
  'mantenimiento-comercial': ['comercial', 'local', 'oficina'],
  demolicion: ['demolicion', 'escombro'],
  excavaciones: ['excavacion', 'zanjeo', 'pozo'],
  'movimiento-suelo': ['suelo', 'compactacion', 'terreno'],
  'hormigon-armado': ['hormigon', 'encofrado', 'losa'],
  'estructuras-metalicas': ['estructura', 'metalica', 'perfil'],
  'banos-cocinas': ['bano', 'baño', 'cocina'],
  'reformas-integrales': ['reforma', 'integral'],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

const cleanText = (value: string | null | undefined) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\t/g, ' ')
    .trim();

const slugify = (value: string) =>
  normalize(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const inferUnit = (name: string) => {
  const text = normalize(name);
  if (text.includes('m3') || text.includes('metro cubico')) return 'm3';
  if (text.includes('m2') || text.includes('metro cuadrado')) return 'm2';
  if (text.includes('ml') || text.includes('m lineal') || text.includes('metro lineal')) return 'ml';
  if (text.includes('jornada') || text.includes('8 hs') || text.includes('hora')) return 'jornada';
  if (text.includes('unidad') || text.includes('c u') || text.includes(' unid')) return 'unidad';
  if (text.includes('par ')) return 'par';
  return 'trabajo';
};

const formatSource = (sourceRef: string | null, category: string | null) => {
  const source = cleanText(sourceRef);
  if (source) {
    const aliased = SOURCE_LABEL_ALIASES[source.toLowerCase()];
    if (aliased) return aliased;
    if (source === 'lista_92') return 'Lista 92';
    if (source.includes('_')) return source.replace(/_/g, ' ');
    return source;
  }
  const categoryText = cleanText(category);
  return categoryText || 'Base UrbanFix';
};

const buildRubroKeywords = (rubro: RubroKey) => {
  const fromSlug = tokenize(rubro.replace(/-/g, ' '));
  const fromTitle = tokenize(rubros[rubro].title);
  const fromServices = rubros[rubro].services.flatMap((item) => tokenize(item));
  const fromHints = (rubroHints[rubro] || []).flatMap((item) => tokenize(item));
  return Array.from(new Set([...fromSlug, ...fromTitle, ...fromServices, ...fromHints]));
};

const scoreItem = (row: MasterItemRow, keywords: string[]) => {
  const haystack = normalize(
    `${cleanText(row.name)} ${cleanText(row.category)} ${cleanText(row.source_ref)}`
  );
  let score = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      score += keyword.length >= 7 ? 8 : 5;
    }
  }
  return score;
};

const getLatestDate = (rows: MasterItemRow[]) => {
  const dates = rows
    .map((row) => (row.created_at ? new Date(row.created_at).getTime() : 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!dates.length) return null;
  return new Date(Math.max(...dates)).toISOString();
};

const warnMasterItemsFetchFailure = (message: string) => {
  if (didWarnMasterItemsFetchFailure) return;
  didWarnMasterItemsFetchFailure = true;
  console.warn(`SEO/rubros: no se pudieron leer precios de master_items; se usa fallback vacio. ${message}`);
};

const fetchActiveLaborItems = cache(async (): Promise<MasterItemRow[]> => {
  if (!hasSupabaseConfig) {
    return [];
  }

  if (activeLaborItemsCache && activeLaborItemsCache.expiresAt > Date.now()) {
    return activeLaborItemsCache.rows;
  }

  if (activeLaborItemsPromise) {
    return activeLaborItemsPromise;
  }

  activeLaborItemsPromise = (async () => {
    const { data, error } = await supabase
      .from('master_items')
      .select('id,name,category,source_ref,suggested_price,created_at')
      .eq('type', 'labor')
      .eq('active', true)
      .not('suggested_price', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      warnMasterItemsFetchFailure(error.message);
      activeLaborItemsCache = {
        rows: [],
        expiresAt: Date.now() + SEO_PRICE_CACHE_TTL_MS,
      };
      return [];
    }

    const rows = (data || []).filter((row) => Number(row.suggested_price || 0) > 0);
    activeLaborItemsCache = {
      rows,
      expiresAt: Date.now() + SEO_PRICE_CACHE_TTL_MS,
    };
    return rows;
  })();

  try {
    return await activeLaborItemsPromise;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    warnMasterItemsFetchFailure(message);
    activeLaborItemsCache = {
      rows: [],
      expiresAt: Date.now() + SEO_PRICE_CACHE_TTL_MS,
    };
    return [];
  } finally {
    activeLaborItemsPromise = null;
  }
});

export const getActiveLaborCategories = cache(async (): Promise<ActiveLaborCategory[]> => {
  const rows = await fetchActiveLaborItems();
  const categories = new Map<
    string,
    {
      name: string;
      itemCount: number;
      lastUpdatedAt: string | null;
      lastUpdatedAtMs: number;
    }
  >();

  for (const row of rows) {
    const categoryName = cleanText(row.category) || 'Sin categoria';
    const categoryKey = normalize(categoryName);
    if (!categoryKey) continue;

    const timestampMs = row.created_at ? new Date(row.created_at).getTime() : 0;
    const current = categories.get(categoryKey);

    if (!current) {
      categories.set(categoryKey, {
        name: categoryName,
        itemCount: 1,
        lastUpdatedAt: row.created_at || null,
        lastUpdatedAtMs: Number.isFinite(timestampMs) ? timestampMs : 0,
      });
      continue;
    }

    current.itemCount += 1;
    if (Number.isFinite(timestampMs) && timestampMs > current.lastUpdatedAtMs) {
      current.lastUpdatedAtMs = timestampMs;
      current.lastUpdatedAt = row.created_at || null;
    }
  }

  return [...categories.values()]
    .map((entry) => ({
      slug: slugify(entry.name),
      name: entry.name,
      itemCount: entry.itemCount,
      lastUpdatedAt: entry.lastUpdatedAt,
    }))
    .filter((entry) => entry.slug.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
});

export const getActiveLaborCategoryBySlug = async (
  slug: string
): Promise<ActiveLaborCategory | null> => {
  const categories = await getActiveLaborCategories();
  return categories.find((item) => item.slug === slug) || null;
};

export const getCategoryPriceReferences = async (
  categorySlug: string,
  ciudad?: CiudadKey
): Promise<RubroPriceData> => {
  const category = await getActiveLaborCategoryBySlug(categorySlug);
  if (!category) {
    return {
      items: [],
      lastUpdatedAt: null,
      city: ciudad || null,
    };
  }

  const allItems = await fetchActiveLaborItems();
  const categoryKey = normalize(category.name);
  const selectedRows = allItems
    .filter((row) => normalize(cleanText(row.category)) === categoryKey)
    .sort(
      (a, b) =>
        Number(b.suggested_price || 0) - Number(a.suggested_price || 0) ||
        cleanText(a.name).localeCompare(cleanText(b.name), 'es')
    );

  const items: RubroPriceReference[] = selectedRows.map((row) => ({
    id: row.id,
    label: cleanText(row.name),
    unit: inferUnit(row.name),
    reference: Number(row.suggested_price || 0),
    source: formatSource(row.source_ref, row.category),
    updatedAt: row.created_at || null,
  }));

  return {
    items,
    lastUpdatedAt: getLatestDate(selectedRows),
    city: ciudad || null,
  };
};

const textMatch = (row: MasterItemRow, terms: string[]) => {
  const category = normalize(cleanText(row.category));
  const name = normalize(cleanText(row.name));
  return terms.some((termRaw) => {
    const term = normalize(termRaw);
    if (!term) return false;
    return category.includes(term) || name.includes(term);
  });
};

const getCatalogRows = async (rubro: RubroCatalogItem) => {
  const allItems = await fetchActiveLaborItems();
  const sourceSet = new Set(rubro.sources.map((source) => normalize(source)));
  const selectedBySource = allItems.filter((row) => sourceSet.has(normalize(cleanText(row.source_ref))));
  const selected = rubro.terms?.length ? selectedBySource.filter((row) => textMatch(row, rubro.terms || [])) : selectedBySource;
  return selected.sort(
    (a, b) =>
      Number(b.suggested_price || 0) - Number(a.suggested_price || 0) ||
      cleanText(a.name).localeCompare(cleanText(b.name), 'es')
  );
};

export const getCatalogRubrosOverview = cache(async (): Promise<CatalogRubroOverview[]> => {
  return Promise.all(rubroCatalog.map(async (rubro) => {
    const selected = await getCatalogRows(rubro);
    return {
      slug: rubro.slug,
      label: rubro.label,
      itemCount: selected.length,
      lastUpdatedAt: getLatestDate(selected),
    };
  }));
});

export const getCatalogRubroPriceReferences = async (
  rubroSlug: string,
  ciudad?: CiudadKey
): Promise<RubroPriceData> => {
  const rubro = getCatalogRubroBySlug(rubroSlug);
  if (!rubro) {
    return {
      items: [],
      lastUpdatedAt: null,
      city: ciudad || null,
    };
  }

  const selectedRows = await getCatalogRows(rubro);
  const items: RubroPriceReference[] = selectedRows.map((row) => ({
    id: row.id,
    label: cleanText(row.name),
    unit: inferUnit(row.name),
    reference: Number(row.suggested_price || 0),
    source: formatSource(row.source_ref, row.category),
    updatedAt: row.created_at || null,
  }));

  return {
    items,
    lastUpdatedAt: getLatestDate(selectedRows),
    city: ciudad || null,
  };
};

export const formatArs = (value: number) => `$${value.toLocaleString('es-AR')}`;

export const formatDateAr = (isoDate: string | null) => {
  if (!isoDate) return 'Sin fecha';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleDateString('es-AR');
};

export const getRubroPriceReferences = async (
  rubro: RubroKey,
  ciudad?: CiudadKey
): Promise<RubroPriceData> => {
  const allItems = await fetchActiveLaborItems();
  const keywords = buildRubroKeywords(rubro);

  const scored = allItems
    .map((row) => ({ row, score: scoreItem(row, keywords) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.row.suggested_price || 0) - Number(a.row.suggested_price || 0));

  const selectedRows: MasterItemRow[] = [];
  const usedIds = new Set<string>();

  for (const entry of scored) {
    if (usedIds.has(entry.row.id)) continue;
    usedIds.add(entry.row.id);
    selectedRows.push(entry.row);
    if (selectedRows.length >= 6) break;
  }

  // Si un rubro tiene poca señal en keywords, completa con items reales recientes de la base.
  if (selectedRows.length < 6) {
    for (const row of allItems) {
      if (usedIds.has(row.id)) continue;
      usedIds.add(row.id);
      selectedRows.push(row);
      if (selectedRows.length >= 6) break;
    }
  }

  const items: RubroPriceReference[] = selectedRows.map((row) => ({
    id: row.id,
    label: cleanText(row.name),
    unit: inferUnit(row.name),
    reference: Number(row.suggested_price || 0),
    source: formatSource(row.source_ref, row.category),
    updatedAt: row.created_at || null,
  }));

  return {
    items,
    lastUpdatedAt: getLatestDate(selectedRows),
    city: ciudad || null,
  };
};
