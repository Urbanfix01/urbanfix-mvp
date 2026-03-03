export type RubroCatalogItem = {
  slug: string;
  label: string;
  terms: string[];
};

export const rubroCatalog: RubroCatalogItem[] = [
  { slug: 'refrigeracion', label: 'REFRIGERACION', terms: ['refirgeracion', 'refrigeracion', 'aire'] },
  { slug: 'sanitarios', label: 'SANITARIOS', terms: ['sanitarios', 'sanitario', 'artefactos', 'griferias'] },
  { slug: 'preliminares', label: 'PRELIMINARES', terms: ['preliminar'] },
  { slug: 'demolicions', label: 'DEMOLICIONS', terms: ['demolic'] },
  { slug: 'estructuras', label: 'ESTRUCTURAS', terms: ['estructuras', 'estructura', 'hormigon'] },
  { slug: 'mamposteria-y-tabiqueria', label: 'MAMPOSTERIA Y TABIQUERIA', terms: ['mamposteria', 'tabiqueria'] },
  { slug: 'aislaciones', label: 'AISLACIONES', terms: ['aislacion'] },
  { slug: 'cubiertas', label: 'CUBIERTAS', terms: ['cubiertas', 'cubierta'] },
  { slug: 'revoques', label: 'REVOQUES', terms: ['revoques', 'revoque'] },
  { slug: 'contrapisos', label: 'CONTRAPISOS', terms: ['contrapisos', 'contrapiso'] },
  { slug: 'revestimientos', label: 'REVESTIMIENTOS', terms: ['revestimientos', 'revestimiento'] },
  { slug: 'pisos', label: 'PISOS', terms: ['pisos', 'piso'] },
  { slug: 'zocalos', label: 'ZOCALOS', terms: ['zocalos', 'zocalo'] },
  { slug: 'carpinterias', label: 'CARPINTERIAS', terms: ['carpinterias', 'carpinteria'] },
  { slug: 'vidrieria', label: 'VIDRIERIA', terms: ['vidrieria', 'vidrio'] },
  { slug: 'pinturas', label: 'PINTURAS', terms: ['pinturas', 'pintura'] },
  {
    slug: 'elecdtricidad',
    label: 'ELECDTRICIDAD',
    terms: ['elecdtricidad', 'electricidad', 'electrica', 'tablero', 'iluminacion', 'cableado'],
  },
  { slug: 'agua-incendio', label: 'AGUA/INCENDIO', terms: ['aguaincendio', 'agua incendio', 'incendio', 'agua'] },
  { slug: 'cloaca', label: 'CLOACA', terms: ['cloaca', 'cloacas'] },
  { slug: 'plucial', label: 'PLUCIAL', terms: ['plucial', 'pluvial'] },
  { slug: 'ventilacion', label: 'VENTILACION', terms: ['ventilacion'] },
  { slug: 'gas', label: 'GAS', terms: ['gas'] },
  { slug: 'equipamiento', label: 'EQUIPAMIENTO', terms: ['equipamiento'] },
  { slug: 'varios', label: 'VARIOS', terms: ['varios', 'hogar'] },
];

export const rubroCatalogSlugs = rubroCatalog.map((item) => item.slug);

export const rubroCatalogBySlug = new Map(rubroCatalog.map((item) => [item.slug, item]));
