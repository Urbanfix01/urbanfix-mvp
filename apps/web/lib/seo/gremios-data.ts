import type { GuiaKey } from './urbanfix-data';

export type GremioCatalogItem = {
  slug: string;
  title: string;
  summary: string;
  overview: string;
  specialties: string[];
  useCases: string[];
  relatedSlugs: string[];
  rubroSlugs: string[];
  guideSlugs: GuiaKey[];
};

export const gremiosCatalog: GremioCatalogItem[] = [
  {
    slug: 'movimiento-de-suelos',
    title: 'Movimiento de Suelos',
    summary: 'Preparacion inicial del terreno para excavar, nivelar, desmontar y compactar antes de construir.',
    overview:
      'Este gremio interviene cuando la obra necesita preparar el terreno, corregir desniveles o generar bases estables para fundaciones, plateas, accesos y sectores exteriores.',
    specialties: ['Excavacion', 'Nivelacion', 'Desmonte', 'Relleno y Compactacion'],
    useCases: ['Inicio de obra', 'Preparacion de plateas y cimientos', 'Ajuste de terrenos para veredas, accesos o patios'],
    relatedSlugs: ['estructura-y-obra-gruesa', 'exteriores-y-paisajismo', 'logistica-y-apoyo'],
    rubroSlugs: ['preliminares', 'demoliciones', 'contrapisos'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
  {
    slug: 'estructura-y-obra-gruesa',
    title: 'Estructura y Obra Gruesa',
    summary: 'Base estructural de la obra con hormigon armado, albanileria y capas aisladoras.',
    overview:
      'Reune los trabajos que definen la resistencia y la forma principal de la construccion, desde cimientos y muros hasta elementos de hormigon y resoluciones de humedad de base.',
    specialties: ['Hormigon Armado', 'Albanileria (Muros/Cimientos)', 'Capa Aisladora'],
    useCases: ['Construccion de vivienda nueva', 'Ampliaciones estructurales', 'Reparacion de bases, muros y sectores con humedad'],
    relatedSlugs: ['movimiento-de-suelos', 'techistas', 'construccion-en-seco'],
    rubroSlugs: ['estructuras', 'mamposteria-y-tabiqueria', 'aislaciones'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra', 'guia-mano-de-obra'],
  },
  {
    slug: 'techistas',
    title: 'Techistas',
    summary: 'Resolucion de cubiertas, estructuras de techo, zingueria y sellados impermeables.',
    overview:
      'Es el gremio que toma la envolvente superior de la obra para protegerla del agua, el viento y el desgaste, tanto en techos inclinados como en terrazas transitables o tecnicas.',
    specialties: ['Estructuras', 'Cubiertas (Chapa/Teja)', 'Zingueria', 'Impermeabilizacion de Terrazas'],
    useCases: ['Cambio o reparacion de techos', 'Filtraciones en terrazas', 'Cierres metalicos y desagues de cubierta'],
    relatedSlugs: ['estructura-y-obra-gruesa', 'herreria-de-obra', 'pintura'],
    rubroSlugs: ['cubiertas', 'aislaciones', 'estructuras'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
  {
    slug: 'instalaciones-sanitarias',
    title: 'Instalaciones Sanitarias',
    summary: 'Redes de agua, desagues, cloacas y tanques para abastecimiento y evacuacion sanitaria.',
    overview:
      'Agrupa la infraestructura sanitaria de una propiedad, desde alimentacion de agua fria y caliente hasta desagues, cloacas y almacenamiento en tanques o cisternas.',
    specialties: ['Plomeria (Agua/Gas)', 'Cloacas', 'Desagues Pluviales', 'Tanques'],
    useCases: ['Remodelacion de banos y cocinas', 'Cambios de canerias y cloacas', 'Instalacion de tanques y bombeo'],
    relatedSlugs: ['gas-matriculado', 'electricidad', 'mantenimiento-tecnico'],
    rubroSlugs: ['sanitarios', 'cloaca', 'pluvial', 'agua-incendio'],
    guideSlugs: ['precio-mano-de-obra-sanitarios', 'guia-mano-de-obra', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'electricidad',
    title: 'Electricidad',
    summary: 'Canalizaciones, cableado, tableros y seguridad electrica para viviendas, locales y obras.',
    overview:
      'Se ocupa de la distribucion de energia, el canalizado de obra, el montaje de tableros, la iluminacion y las medidas de proteccion necesarias para una instalacion segura.',
    specialties: ['Canalizado', 'Cableado', 'Tableros', 'Iluminacion', 'Puesta a Tierra'],
    useCases: ['Instalacion electrica nueva', 'Readecuacion de tablero y circuitos', 'Iluminacion interior y exterior'],
    relatedSlugs: ['infraestructura-it-y-redes', 'seguridad-electronica', 'sistemas-contra-incendio'],
    rubroSlugs: ['electricidad'],
    guideSlugs: ['precio-mano-de-obra-electricidad', 'guia-mano-de-obra', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'gas-matriculado',
    title: 'Gas Matriculado',
    summary: 'Instalaciones internas de gas y pruebas reglamentarias realizadas por matriculados.',
    overview:
      'Incluye el tendido interno de gas, gabinetes, conexion de artefactos y ensayos de hermeticidad que exigen intervencion profesional habilitada.',
    specialties: ['Redes internas', 'Gabinetes', 'Artefactos', 'Pruebas de Hermeticidad'],
    useCases: ['Alta o reforma de instalacion de gas', 'Conexion de cocina, calefon o termotanque', 'Regularizacion y prueba de hermeticidad'],
    relatedSlugs: ['instalaciones-sanitarias', 'climatizacion', 'mantenimiento-tecnico'],
    rubroSlugs: ['gas'],
    guideSlugs: ['precio-mano-de-obra-sanitarios', 'guia-mano-de-obra', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'climatizacion',
    title: 'Climatizacion',
    summary: 'Sistemas de aire acondicionado y calefaccion para confort termico y eficiencia.',
    overview:
      'Trabaja sobre equipos y redes de climatizacion para enfriar, calefaccionar y distribuir temperatura de forma estable, ya sea por expansion directa o sistemas hidrónicos.',
    specialties: ['Aire Acondicionado', 'Calefaccion (Radiadores/Piso Radiante)'],
    useCases: ['Instalacion de split y multisplit', 'Montaje de radiadores o piso radiante', 'Mantenimiento de equipos termicos'],
    relatedSlugs: ['gas-matriculado', 'electricidad', 'mantenimiento-tecnico'],
    rubroSlugs: ['refrigeracion', 'ventilacion', 'equipamiento'],
    guideSlugs: ['precio-mano-de-obra-refrigeracion', 'guia-mano-de-obra', 'guia-materiales-obra'],
  },
  {
    slug: 'infraestructura-it-y-redes',
    title: 'Infraestructura IT y Redes',
    summary: 'Conectividad fisica y logica con cableado estructurado, fibra, Wi-Fi y racks.',
    overview:
      'Es el gremio tecnico para oficinas, edificios y hogares que requieren red de datos ordenada, backbone de fibra o puntos Wi-Fi estables con equipamiento correctamente montado.',
    specialties: ['Cableado Estructurado', 'Fibra Optica', 'Wi-Fi', 'Racks'],
    useCases: ['Red de datos para oficina o local', 'Backbone y fibra interna', 'Armado de rack y distribucion de puestos'],
    relatedSlugs: ['electricidad', 'seguridad-electronica', 'sistemas-contra-incendio'],
    rubroSlugs: ['electricidad', 'equipamiento', 'varios'],
    guideSlugs: ['precio-mano-de-obra-electricidad', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'seguridad-electronica',
    title: 'Seguridad Electronica',
    summary: 'Sistemas de CCTV, alarmas, sensores y control de acceso para proteccion del inmueble.',
    overview:
      'Este gremio implementa soluciones de vigilancia, deteccion y control de ingreso integrando camaras, sensores y dispositivos de acceso segun el tipo de propiedad.',
    specialties: ['CCTV', 'Alarmas', 'Sensores', 'Control de Acceso'],
    useCases: ['Instalacion de camaras y DVR/NVR', 'Alarmas domiciliarias o comerciales', 'Control de acceso con lectores o cerraduras inteligentes'],
    relatedSlugs: ['infraestructura-it-y-redes', 'electricidad', 'herreria-de-obra'],
    rubroSlugs: ['electricidad', 'equipamiento'],
    guideSlugs: ['precio-mano-de-obra-electricidad', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'sistemas-contra-incendio',
    title: 'Sistemas Contra Incendio',
    summary: 'Deteccion, rociadores e hidrantes para prevencion y respuesta ante incendios.',
    overview:
      'Agrupa los sistemas activos de deteccion y combate de incendios que suelen requerir diseno, montaje y mantenimiento coordinado con normas de seguridad.',
    specialties: ['Deteccion de Humo', 'Rociadores', 'Hidrantes'],
    useCases: ['Proteccion de edificios y locales', 'Mantenimiento preventivo de red contra incendio', 'Actualizacion de sistemas de deteccion'],
    relatedSlugs: ['electricidad', 'infraestructura-it-y-redes', 'seguridad-electronica'],
    rubroSlugs: ['agua-incendio', 'electricidad'],
    guideSlugs: ['precio-mano-de-obra-sanitarios', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'construccion-en-seco',
    title: 'Construccion en Seco',
    summary: 'Tabiques, cielorrasos y soluciones livianas con yeso y steel frame.',
    overview:
      'Es un gremio orientado a divisiones interiores, cierres y estructuras livianas que permiten obra rapida, limpia y flexible para reformas y ampliaciones.',
    specialties: ['Tabiques de Yeso (Durlock)', 'Cielorrasos', 'Steel Frame'],
    useCases: ['Division de ambientes', 'Cielorrasos suspendidos', 'Ampliaciones livianas con steel frame'],
    relatedSlugs: ['estructura-y-obra-gruesa', 'pintura', 'aberturas-y-vidrieria'],
    rubroSlugs: ['mamposteria-y-tabiqueria', 'aislaciones', 'revoques'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra', 'guia-mano-de-obra'],
  },
  {
    slug: 'revestimientos-y-pisos',
    title: 'Revestimientos y Pisos',
    summary: 'Terminaciones de superficies con ceramicos, porcelanatos, marmol y revoques.',
    overview:
      'Toma la capa visible y tecnica de muros y pisos, resolviendo colocacion, nivelacion, juntas y acabados que impactan en durabilidad y estetica.',
    specialties: ['Ceramicos', 'Porcelanatos', 'Pulido de Marmol', 'Revoques'],
    useCases: ['Cambio de pisos y revestimientos', 'Terminacion de banos y cocinas', 'Revoques finos y recuperacion de superficies'],
    relatedSlugs: ['pintura', 'construccion-en-seco', 'aberturas-y-vidrieria'],
    rubroSlugs: ['revestimientos', 'pisos', 'revoques', 'contrapisos'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra', 'guia-mano-de-obra'],
  },
  {
    slug: 'pintura',
    title: 'Pintura',
    summary: 'Acabados finales y proteccion de superficies con latex, enduidos, barnices y revestimientos.',
    overview:
      'Este gremio define la terminacion visual de la obra y tambien protege muros, maderas y fachadas con esquemas de pintura o revestimientos decorativos y tecnicos.',
    specialties: ['Latex', 'Enduido', 'Barnices', 'Revestimientos Plasticos (Tarquini)'],
    useCases: ['Pintura final de obra', 'Mantenimiento de fachadas', 'Preparacion y sellado de superficies interiores'],
    relatedSlugs: ['revestimientos-y-pisos', 'techistas', 'construccion-en-seco'],
    rubroSlugs: ['pinturas', 'revoques'],
    guideSlugs: ['precio-mano-de-obra-pintura', 'guia-mano-de-obra', 'guia-materiales-obra'],
  },
  {
    slug: 'aberturas-y-vidrieria',
    title: 'Aberturas y Vidrieria',
    summary: 'Fabricacion e instalacion de aberturas, DVH, mamparas y soluciones vidriadas.',
    overview:
      'Incluye carpinterias de aluminio, PVC o madera junto con vidrios de seguridad o DVH para mejorar cierre, aislacion, iluminacion y terminacion del proyecto.',
    specialties: ['Aluminio', 'PVC', 'Madera', 'Vidrios DVH', 'Mamparas'],
    useCases: ['Cambio de ventanas y puertas', 'Mamparas para bano', 'Mejora de aislacion con DVH'],
    relatedSlugs: ['herreria-de-obra', 'construccion-en-seco', 'revestimientos-y-pisos'],
    rubroSlugs: ['carpinterias', 'vidrieria'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
  {
    slug: 'herreria-de-obra',
    title: 'Herreria de Obra',
    summary: 'Rejas, portones, escaleras y estructuras metalicas a medida para obra y seguridad.',
    overview:
      'Es el gremio metalico que resuelve piezas estructurales o funcionales para acceso, contencion, cerramiento y soporte en viviendas, locales y edificios.',
    specialties: ['Rejas', 'Portones', 'Escaleras', 'Estructuras Metalicas'],
    useCases: ['Portones y rejas de seguridad', 'Escaleras metalicas', 'Estructuras auxiliares para techos o entrepisos'],
    relatedSlugs: ['techistas', 'aberturas-y-vidrieria', 'seguridad-electronica'],
    rubroSlugs: ['estructuras', 'carpinterias', 'cubiertas'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
  {
    slug: 'energias-renovables',
    title: 'Energias Renovables',
    summary: 'Instalaciones solares fotovoltaicas y termicas para ahorro energetico y autonomia.',
    overview:
      'Agrupa las soluciones que aprovechan energia solar para generacion electrica o agua caliente, integrandose con instalaciones preexistentes y nuevos proyectos.',
    specialties: ['Paneles Fotovoltaicos', 'Termotanques Solares'],
    useCases: ['Autogeneracion solar', 'Agua caliente sanitaria solar', 'Complemento energetico para viviendas y comercios'],
    relatedSlugs: ['electricidad', 'gas-matriculado', 'climatizacion'],
    rubroSlugs: ['electricidad', 'agua-incendio', 'equipamiento'],
    guideSlugs: ['precio-mano-de-obra-electricidad', 'guia-materiales-obra'],
  },
  {
    slug: 'exteriores-y-paisajismo',
    title: 'Exteriores y Paisajismo',
    summary: 'Espacios verdes, riego y piscinas para sectores exteriores funcionales y terminados.',
    overview:
      'Este gremio se enfoca en el uso del espacio exterior, combinando jardineria, sistemas de riego y obras complementarias como piscinas o ambientacion de patios.',
    specialties: ['Jardineria', 'Riego Automatico', 'Piscinas'],
    useCases: ['Diseno y mantenimiento de jardines', 'Instalacion de riego programado', 'Construccion o puesta en valor de piscinas'],
    relatedSlugs: ['movimiento-de-suelos', 'electricidad', 'instalaciones-sanitarias'],
    rubroSlugs: ['preliminares', 'pluvial', 'varios'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
  {
    slug: 'mantenimiento-tecnico',
    title: 'Mantenimiento Tecnico',
    summary: 'Servicios de urgencia, service y soporte tecnico para instalaciones y equipos.',
    overview:
      'Reune intervenciones correctivas o preventivas para resolver problemas recurrentes, urgencias y mantenimiento de sistemas ya instalados en edificios o viviendas.',
    specialties: ['Destapaciones', 'Cerrajeria', 'Service de Equipos', 'Ascensores'],
    useCases: ['Urgencias domiciliarias', 'Mantenimiento preventivo de equipos', 'Resolucion rapida de fallas de uso diario'],
    relatedSlugs: ['instalaciones-sanitarias', 'climatizacion', 'gas-matriculado'],
    rubroSlugs: ['sanitarios', 'gas', 'electricidad', 'refrigeracion'],
    guideSlugs: ['guia-mano-de-obra', 'guia-presupuestos-construccion'],
  },
  {
    slug: 'logistica-y-apoyo',
    title: 'Logistica y Apoyo',
    summary: 'Servicios auxiliares de fletes, volquetes, andamios y ayuda operativa para obra.',
    overview:
      'Es la capa de soporte que permite mover materiales, retirar escombros, montar medios auxiliares y sostener la operacion diaria del resto de los gremios.',
    specialties: ['Fletes', 'Volquetes', 'Alquiler de Andamios', 'Ayuda de Gremios'],
    useCases: ['Inicio y cierre de obra', 'Retiro de escombros y materiales', 'Apoyo logistico para trabajos en altura o traslados'],
    relatedSlugs: ['movimiento-de-suelos', 'limpieza-y-gestion', 'estructura-y-obra-gruesa'],
    rubroSlugs: ['preliminares', 'demoliciones', 'varios'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
  {
    slug: 'limpieza-y-gestion',
    title: 'Limpieza y Gestion',
    summary: 'Cierre, orden y presentacion de obra con limpieza final, plagas y senaletica.',
    overview:
      'Agrupa tareas de acondicionamiento final y soporte operativo para entregar espacios limpios, identificados y listos para uso o habilitacion.',
    specialties: ['Final de Obra', 'Control de Plagas', 'Senaletica', 'Carteleria'],
    useCases: ['Entrega final de una obra o reforma', 'Control preventivo y correctivo de plagas', 'Carteles, identificacion y orden del espacio'],
    relatedSlugs: ['logistica-y-apoyo', 'pintura', 'seguridad-electronica'],
    rubroSlugs: ['varios', 'pinturas'],
    guideSlugs: ['guia-presupuestos-construccion', 'guia-materiales-obra'],
  },
];

export const gremioSlugs = gremiosCatalog.map((item) => item.slug);

export const getGremioBySlug = (slug: string) => gremiosCatalog.find((item) => item.slug === slug) || null;

export const normalizeGremioText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const parseGremioSpecialties = (value: string | null | undefined) =>
  String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const getGremioSearchTerms = (gremio: GremioCatalogItem) =>
  Array.from(
    new Set(
      [
        gremio.title,
        ...gremio.specialties,
        ...gremio.rubroSlugs.map((slug) => slug.replace(/-/g, ' ')),
      ]
        .map((item) => normalizeGremioText(item))
        .filter(Boolean)
    )
  );

const matchesTerm = (candidate: string, term: string) => Boolean(candidate && term && (candidate.includes(term) || term.includes(candidate)));

export const profileMatchesSpecialtyQuery = (specialtiesValue: string | null | undefined, specialtyQuery: string) => {
  const normalizedQuery = normalizeGremioText(specialtyQuery);
  if (!normalizedQuery) return true;

  return parseGremioSpecialties(specialtiesValue)
    .map((item) => normalizeGremioText(item))
    .some((item) => matchesTerm(item, normalizedQuery));
};

export const profileMatchesGremioQuery = (
  specialtiesValue: string | null | undefined,
  gremioOrSlug: GremioCatalogItem | string
) => {
  const gremio = typeof gremioOrSlug === 'string' ? getGremioBySlug(gremioOrSlug) : gremioOrSlug;
  if (!gremio) return true;

  const normalizedSpecialties = parseGremioSpecialties(specialtiesValue).map((item) => normalizeGremioText(item));
  const gremioTerms = getGremioSearchTerms(gremio);

  return normalizedSpecialties.some((specialty) => gremioTerms.some((term) => matchesTerm(specialty, term)));
};
