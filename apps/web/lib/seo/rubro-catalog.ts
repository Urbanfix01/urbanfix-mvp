export type RubroCatalogItem = {
  slug: string;
  label: string;
  sources: string[];
  terms?: string[];
};

export const rubroCatalog: RubroCatalogItem[] = [
  { slug: 'refrigeracion', label: 'REFRIGERACION', sources: ['mo_rubro_refrigeracion'] },
  { slug: 'sanitarios', label: 'SANITARIOS', sources: ['mo_rubro_sanitarios'] },
  { slug: 'preliminares', label: 'PRELIMINARES', sources: ['mo_rubro_preliminares'] },
  { slug: 'demolicions', label: 'DEMOLICIONS', sources: ['mo_rubro_demolicions'] },
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
    slug: 'elecdtricidad',
    label: 'ELECDTRICIDAD',
    sources: ['mo_rubro_elecdtricidad'],
  },
  { slug: 'agua-incendio', label: 'AGUA/INCENDIO', sources: ['mo_rubro_agua_incendio'] },
  {
    slug: 'cloaca',
    label: 'CLOACA',
    sources: ['mo_rubro_cloaca_plucial_ventilacion'],
    terms: ['cloaca', 'cloacal', 'cloaaca'],
  },
  {
    slug: 'plucial',
    label: 'PLUCIAL',
    sources: ['mo_rubro_cloaca_plucial_ventilacion'],
    terms: ['pluvial', 'plucial'],
  },
  {
    slug: 'ventilacion',
    label: 'VENTILACION',
    sources: ['mo_rubro_cloaca_plucial_ventilacion'],
    terms: ['ventilacion'],
  },
  { slug: 'gas', label: 'GAS', sources: ['mo_rubro_gas'] },
  { slug: 'equipamiento', label: 'EQUIPAMIENTO', sources: ['mo_rubro_equipamiento'] },
  { slug: 'varios', label: 'VARIOS', sources: ['mo_rubro_varios'] },
];

export const rubroCatalogSlugs = rubroCatalog.map((item) => item.slug);

export const rubroCatalogBySlug = new Map(rubroCatalog.map((item) => [item.slug, item]));
