export type RubroCatalogItem = {
  slug: string;
  label: string;
  sources: string[];
  terms?: string[];
  aliases?: string[];
};

const cloacaPluvialVentilacionSources = [
  'mo_rubro_cloaca_pluvial_ventilacion',
  'mo_rubro_cloaca_plucial_ventilacion',
];

export const rubroCatalog: RubroCatalogItem[] = [
  { slug: 'refrigeracion', label: 'REFRIGERACION', sources: ['mo_rubro_refrigeracion'] },
  { slug: 'sanitarios', label: 'SANITARIOS', sources: ['mo_rubro_sanitarios'] },
  { slug: 'preliminares', label: 'PRELIMINARES', sources: ['mo_rubro_preliminares'] },
  {
    slug: 'demoliciones',
    label: 'DEMOLICIONES',
    sources: ['mo_rubro_demoliciones', 'mo_rubro_demolicions'],
    aliases: ['demolicions'],
  },
  { slug: 'estructuras', label: 'ESTRUCTURAS', sources: ['mo_rubro_estructuras'] },
  { slug: 'mamposteria-y-tabiqueria', label: 'MAMPOSTERIA Y TABIQUERIA', sources: ['mo_rubro_mamposteria_tabiqueria'] },
  { slug: 'aislaciones', label: 'AISLACIONES', sources: ['mo_rubro_aislaciones'] },
  { slug: 'cubiertas', label: 'CUBIERTAS', sources: ['mo_rubro_cubiertas'] },
  { slug: 'revoques', label: 'REVOQUES', sources: ['mo_rubro_revoques'] },
  { slug: 'contrapisos', label: 'CONTRAPISOS', sources: ['mo_rubro_contrapisos'] },
  { slug: 'revestimientos', label: 'REVESTIMIENTOS', sources: ['mo_rubro_revestimientos'] },
  { slug: 'pisos', label: 'PISOS', sources: ['mo_rubro_pisos'] },
  { slug: 'zocalos', label: 'ZOCALOS', sources: ['mo_rubro_zocalos'] },
  { slug: 'carpinterias', label: 'CARPINTERIAS', sources: ['mo_rubro_carpinterias'] },
  { slug: 'vidrieria', label: 'VIDRIERIA', sources: ['mo_rubro_vidrieria'] },
  { slug: 'pinturas', label: 'PINTURAS', sources: ['mo_rubro_pinturas'] },
  {
    slug: 'electricidad',
    label: 'ELECTRICIDAD',
    sources: ['mo_rubro_electricidad', 'mo_rubro_elecdtricidad'],
    aliases: ['elecdtricidad'],
  },
  { slug: 'agua-incendio', label: 'AGUA/INCENDIO', sources: ['mo_rubro_agua_incendio'] },
  {
    slug: 'cloaca',
    label: 'CLOACA',
    sources: cloacaPluvialVentilacionSources,
    terms: ['cloaca', 'cloacal', 'cloaaca'],
  },
  {
    slug: 'pluvial',
    label: 'PLUVIAL',
    sources: cloacaPluvialVentilacionSources,
    terms: ['pluvial', 'plucial'],
    aliases: ['plucial'],
  },
  {
    slug: 'ventilacion',
    label: 'VENTILACION',
    sources: cloacaPluvialVentilacionSources,
    terms: ['ventilacion'],
  },
  { slug: 'gas', label: 'GAS', sources: ['mo_rubro_gas'] },
  { slug: 'equipamiento', label: 'EQUIPAMIENTO', sources: ['mo_rubro_equipamiento'] },
  { slug: 'varios', label: 'VARIOS', sources: ['mo_rubro_varios'] },
];

export const rubroCatalogSlugs = rubroCatalog.map((item) => item.slug);

export const rubroCatalogRouteSlugs = Array.from(
  new Set(rubroCatalog.flatMap((item) => [item.slug, ...(item.aliases || [])]))
);

export const rubroCatalogBySlug = new Map<string, RubroCatalogItem>();
rubroCatalog.forEach((item) => {
  rubroCatalogBySlug.set(item.slug, item);
  (item.aliases || []).forEach((alias) => rubroCatalogBySlug.set(alias, item));
});

export const getCatalogRubroBySlug = (slug: string) => rubroCatalogBySlug.get(slug) || null;

export const resolveCatalogRubroSlug = (slug: string) => getCatalogRubroBySlug(slug)?.slug || null;
