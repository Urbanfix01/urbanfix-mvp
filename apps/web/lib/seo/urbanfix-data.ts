const buildRubro = (title: string, services: [string, string, string]) => ({
  title,
  description: `Gestiona presupuestos, clientes y materiales de obra para ${title.toLowerCase()} con MANO DE OBRA clara.`,
  services,
});

export const rubros = {
  electricidad: buildRubro('Electricidad', ['Instalaciones electricas', 'Tableros y protecciones', 'Mantenimiento y diagnostico']),
  plomeria: buildRubro('Plomeria', ['Instalaciones sanitarias', 'Reparaciones de perdidas', 'Destapaciones y mantenimiento']),
  pintura: buildRubro('Pintura', ['Interior y exterior', 'Preparacion de superficies', 'Terminaciones y retoques']),
  albanileria: buildRubro('Albanileria', ['Muros y revoques', 'Ampliaciones y reformas', 'Terminaciones generales']),
  gasista: buildRubro('Gasista', ['Instalaciones de gas', 'Pruebas de hermeticidad', 'Mantenimiento preventivo']),
  impermeabilizacion: buildRubro('Impermeabilizacion', [
    'Cubiertas y terrazas',
    'Sellados y membranas',
    'Reparacion de filtraciones',
  ]),
  techos: buildRubro('Techos', ['Estructuras y reparaciones', 'Aislaciones y mantenimiento', 'Inspecciones y refuerzos']),
  carpinteria: buildRubro('Carpinteria', ['Muebles y placares', 'Aberturas y ajustes', 'Terminaciones finas']),
  herreria: buildRubro('Herreria', ['Rejas y portones', 'Estructuras metalicas', 'Mantenimiento y refuerzos']),
  'aire-acondicionado': buildRubro('Aire acondicionado', ['Instalacion de equipos', 'Mantenimiento preventivo', 'Diagnostico y reparacion']),
  refrigeracion: buildRubro('Refrigeracion', ['Equipos comerciales', 'Camara de frio', 'Mantenimiento y carga']),
  cerrajeria: buildRubro('Cerrajeria', ['Aperturas y cambios', 'Cerraduras de seguridad', 'Mantenimiento de accesos']),
  'durlock-yeseria': buildRubro('Durlock y yeseria', ['Tabiques y cielorrasos', 'Reparaciones y terminaciones', 'Placas y molduras']),
  'pisos-revestimientos': buildRubro('Pisos y revestimientos', ['Ceramica y porcelanato', 'Nivelacion y carpeta', 'Revestimientos interiores']),
  'vidrieria-aberturas': buildRubro('Vidrieria y aberturas', ['Vidrios y espejos', 'Aberturas de aluminio', 'Sellado y ajuste']),
  soldadura: buildRubro('Soldadura', ['Reparaciones metalicas', 'Soldadura MIG y electrodo', 'Refuerzos estructurales']),
  'portones-automaticos': buildRubro('Portones automaticos', ['Instalacion de motores', 'Automatizacion de accesos', 'Mantenimiento y service']),
  'alarmas-camaras': buildRubro('Alarmas y camaras', ['Sistemas de alarma', 'Camaras y monitoreo', 'Configuracion y soporte']),
  'redes-datos': buildRubro('Redes y datos', ['Cableado estructurado', 'WiFi y conectividad', 'Puntos de red y ordenamiento']),
  calefaccion: buildRubro('Calefaccion', ['Calderas y radiadores', 'Piso radiante', 'Mantenimiento y purga']),
  'energia-solar': buildRubro('Energia solar', ['Paneles solares', 'Termotanque solar', 'Sistemas fotovoltaicos']),
  'jardineria-poda': buildRubro('Jardineria y poda', ['Diseno y mantenimiento', 'Poda y desmalezado', 'Riego y puesta a punto']),
  'limpieza-post-obra': buildRubro('Limpieza post obra', ['Limpieza final de obra', 'Retiro de residuos', 'Puesta en condiciones']),
  'control-plagas': buildRubro('Control de plagas', ['Fumigacion', 'Desratizacion', 'Prevencion y seguimiento']),
  'mantenimiento-piletas': buildRubro('Mantenimiento de piletas', ['Limpieza y filtrado', 'Control de quimicos', 'Puesta en marcha estacional']),
  'mantenimiento-consorcios': buildRubro('Mantenimiento de consorcios', ['Mantenimiento preventivo', 'Reparaciones comunes', 'Guardias y urgencias']),
  'mantenimiento-comercial': buildRubro('Mantenimiento comercial', ['Locales y oficinas', 'Ajustes rapidos', 'Mantenimiento programado']),
  demolicion: buildRubro('Demolicion', ['Demolicion parcial', 'Retiro de escombros', 'Preparacion para reforma']),
  excavaciones: buildRubro('Excavaciones', ['Zanjeo y pozos', 'Excavacion manual y mecanica', 'Nivelacion inicial']),
  'movimiento-suelo': buildRubro('Movimiento de suelo', ['Relleno y compactacion', 'Nivelacion de terreno', 'Preparacion de base']),
  'hormigon-armado': buildRubro('Hormigon armado', ['Bases y columnas', 'Vigas y losas', 'Encofrado y llenado']),
  'estructuras-metalicas': buildRubro('Estructuras metalicas', [
    'Montaje de perfiles',
    'Refuerzos y cerramientos',
    'Estructuras para techos y naves',
  ]),
  'banos-cocinas': buildRubro('Banos y cocinas', ['Remodelaciones completas', 'Instalaciones y revestimientos', 'Armado y terminaciones']),
  'reformas-integrales': buildRubro('Reformas integrales', ['Planificacion por etapas', 'Ejecucion de obra', 'Coordinacion de rubros']),
} as const;

export type RubroKey = keyof typeof rubros;

export type UrbanFixCity = {
  name: string;
  region: string;
  description: string;
  coverageFocus: string;
  zoneQuery: string;
  highlights: [string, string, string];
};

const buildCityEntry = ({
  name,
  region,
  description,
  coverageFocus,
  zoneQuery,
  highlights,
}: UrbanFixCity) => ({
  name,
  region,
  description,
  coverageFocus,
  zoneQuery,
  highlights,
});

export const ciudades = {
  caba: buildCityEntry({
    name: 'CABA',
    region: 'Ciudad Autonoma de Buenos Aires',
    description:
      'Cobertura urbana para presupuestos, mantenimiento, reformas por rubro y referencia de precios activos dentro de CABA.',
    coverageFocus: 'Ideal para trabajos rapidos, consorcios, locales y operaciones con alta rotacion por barrio.',
    zoneQuery: 'CABA',
    highlights: ['Rubros urbanos de alta demanda', 'Presupuestos comparables por zona', 'Cruce rapido con vidriera publica'],
  }),
  'buenos-aires': buildCityEntry({
    name: 'Buenos Aires',
    region: 'Provincia de Buenos Aires',
    description:
      'Cobertura publica para explorar rubros, referencias de mano de obra y salida a tecnicos disponibles en toda la provincia de Buenos Aires.',
    coverageFocus: 'Pensada para operaciones amplias, cobertura metropolitana y expansion por corredores urbanos del AMBA y el interior.',
    zoneQuery: 'Buenos Aires',
    highlights: ['Cobertura provincial extensa', 'Lectura comercial por zona', 'Cruce natural con la vidriera publica'],
  }),
  catamarca: buildCityEntry({
    name: 'Catamarca',
    region: 'Provincia de Catamarca',
    description:
      'Entrada publica para revisar rubros activos, referencias base y estructura de cobertura tecnica en Catamarca.',
    coverageFocus: 'Sirve para abrir presencia comercial, ordenar demanda local y conectar rubros con presupuestos comparables.',
    zoneQuery: 'Catamarca',
    highlights: ['Base inicial por provincia', 'Referencia operativa simple', 'Expansión territorial ordenada'],
  }),
  chaco: buildCityEntry({
    name: 'Chaco',
    region: 'Provincia del Chaco',
    description:
      'Capa publica de UrbanFix para navegar rubros, referencias de mano de obra y cobertura potencial en Chaco.',
    coverageFocus: 'Util para operaciones de mantenimiento, servicios tecnicos y despliegue comercial en la region.',
    zoneQuery: 'Chaco',
    highlights: ['Entrada territorial clara', 'Rubros listos para consulta', 'Cruce rapido con perfiles tecnicos'],
  }),
  chubut: buildCityEntry({
    name: 'Chubut',
    region: 'Provincia del Chubut',
    description:
      'Vista publica para organizar cobertura, rubros y referencias tecnicas iniciales en Chubut.',
    coverageFocus: 'Pensada para abrir visibilidad por provincia y evaluar alcance tecnico antes de operar a escala.',
    zoneQuery: 'Chubut',
    highlights: ['Cobertura por provincia', 'Lectura base para expansion', 'Conexion con mapa publico'],
  }),
  cordoba: buildCityEntry({
    name: 'Cordoba',
    region: 'Provincia de Cordoba',
    description:
      'Base publica para ordenar mano de obra, rubros y presupuestos de obras, mantenimiento y servicios en Cordoba.',
    coverageFocus: 'Pensada para operaciones tecnicas mixtas entre mantenimiento, reformas y servicios de campo.',
    zoneQuery: 'Cordoba',
    highlights: ['Rubros con lectura simple', 'Guia base para cotizar', 'Cruce con cobertura tecnica'],
  }),
  corrientes: buildCityEntry({
    name: 'Corrientes',
    region: 'Provincia de Corrientes',
    description:
      'Cobertura publica para ordenar rubros, referencias de mano de obra y rutas de expansion tecnica en Corrientes.',
    coverageFocus: 'Buena base para mantenimiento, servicios y lectura comercial por provincia.',
    zoneQuery: 'Corrientes',
    highlights: ['Rubros visibles por provincia', 'Base de consulta operativa', 'Salida rapida a cobertura tecnica'],
  }),
  'entre-rios': buildCityEntry({
    name: 'Entre Rios',
    region: 'Provincia de Entre Rios',
    description:
      'Vista publica para consultar rubros, referencias activas y cobertura tecnica en Entre Rios.',
    coverageFocus: 'Ordena una entrada provincial clara para presupuestos, ventas y analisis de presencia regional.',
    zoneQuery: 'Entre Rios',
    highlights: ['Lectura territorial simple', 'Rubros activos de referencia', 'Conexion con la vidriera publica'],
  }),
  formosa: buildCityEntry({
    name: 'Formosa',
    region: 'Provincia de Formosa',
    description:
      'Base publica de UrbanFix para abrir cobertura, revisar rubros y conectar referencias tecnicas en Formosa.',
    coverageFocus: 'Sirve para validar presencia inicial por provincia y preparar crecimiento comercial ordenado.',
    zoneQuery: 'Formosa',
    highlights: ['Cobertura inicial util', 'Entrada a rubros clave', 'Preparada para crecimiento'],
  }),
  jujuy: buildCityEntry({
    name: 'Jujuy',
    region: 'Provincia de Jujuy',
    description:
      'Entrada publica para explorar rubros, referencias de mano de obra y visibilidad tecnica en Jujuy.',
    coverageFocus: 'Pensada para estructurar cobertura provincial y ordenar la lectura publica de servicios.',
    zoneQuery: 'Jujuy',
    highlights: ['Cobertura provincial clara', 'Rubros navegables', 'Cruce con salida comercial'],
  }),
  'la-pampa': buildCityEntry({
    name: 'La Pampa',
    region: 'Provincia de La Pampa',
    description:
      'Capa publica para revisar rubros activos, referencias base y potencial de cobertura en La Pampa.',
    coverageFocus: 'Aporta una vista de provincia lista para expansion, lectura comercial y consulta tecnica.',
    zoneQuery: 'La Pampa',
    highlights: ['Base provincial ordenada', 'Lectura comercial rapida', 'Referencias visibles por rubro'],
  }),
  'la-rioja': buildCityEntry({
    name: 'La Rioja',
    region: 'Provincia de La Rioja',
    description:
      'Cobertura publica inicial para explorar estructura de rubros y referencias tecnicas en La Rioja.',
    coverageFocus: 'Sirve para abrir una provincia nueva dentro de la capa publica sin perder orden operativo.',
    zoneQuery: 'La Rioja',
    highlights: ['Entrada de provincia nueva', 'Rubros accesibles', 'Expansión con estructura clara'],
  }),
  mendoza: buildCityEntry({
    name: 'Mendoza',
    region: 'Provincia de Mendoza',
    description:
      'Cobertura inicial de UrbanFix para consultar rubros, mano de obra y estructura de presupuesto en Mendoza.',
    coverageFocus: 'Sirve como capa publica para evaluar precios, alcance y presencia tecnica por ciudad.',
    zoneQuery: 'Mendoza',
    highlights: ['Rubros activos en base', 'Acceso a guias y referencias', 'Vista util para expansion comercial'],
  }),
  misiones: buildCityEntry({
    name: 'Misiones',
    region: 'Provincia de Misiones',
    description:
      'Vista publica para navegar rubros, cobertura tecnica y referencias de base en Misiones.',
    coverageFocus: 'Pensada para presencia regional, lectura comercial y orden de rubros antes de la operacion intensiva.',
    zoneQuery: 'Misiones',
    highlights: ['Cobertura regional visible', 'Rubros listos para abrir', 'Cruce con mapa publico'],
  }),
  neuquen: buildCityEntry({
    name: 'Neuquen',
    region: 'Provincia del Neuquen',
    description:
      'Entrada publica para consultar rubros, referencias activas y cobertura tecnica potencial en Neuquen.',
    coverageFocus: 'Buena base para servicios tecnicos, mantenimiento y despliegue por provincia.',
    zoneQuery: 'Neuquen',
    highlights: ['Base de consulta provincial', 'Rubros con salida operativa', 'Lectura comercial por territorio'],
  }),
  'rio-negro': buildCityEntry({
    name: 'Rio Negro',
    region: 'Provincia de Rio Negro',
    description:
      'Cobertura publica para ordenar rubros, referencias de mano de obra y visibilidad tecnica en Rio Negro.',
    coverageFocus: 'Util para abrir cobertura regional y conectar la capa publica con la vidriera de tecnicos.',
    zoneQuery: 'Rio Negro',
    highlights: ['Cobertura tecnica visible', 'Rubros navegables', 'Entrada territorial organizada'],
  }),
  rosario: buildCityEntry({
    name: 'Rosario',
    region: 'Provincia de Santa Fe',
    description:
      'Referencias publicas para presupuestar rubros, ordenar clientes y revisar estructura de trabajo en Rosario.',
    coverageFocus: 'Buena base para trabajos de mantenimiento edilicio, reformas y coordinacion por rubro.',
    zoneQuery: 'Rosario',
    highlights: ['Precios base por rubro', 'Entrada rapida a rubros activos', 'Conexion con mapa de tecnicos'],
  }),
  salta: buildCityEntry({
    name: 'Salta',
    region: 'Provincia de Salta',
    description:
      'Vista publica para revisar rubros, referencias tecnicas y cobertura comercial inicial en Salta.',
    coverageFocus: 'Ayuda a estructurar presencia provincial y a conectar lectura publica con operacion futura.',
    zoneQuery: 'Salta',
    highlights: ['Cobertura por provincia', 'Rubros y guias enlazados', 'Expansion con criterio territorial'],
  }),
  'san-juan': buildCityEntry({
    name: 'San Juan',
    region: 'Provincia de San Juan',
    description:
      'Base publica para consultar rubros activos, referencias de mano de obra y cobertura tecnica en San Juan.',
    coverageFocus: 'Pensada para mantener una lectura territorial clara mientras se expande la presencia tecnica.',
    zoneQuery: 'San Juan',
    highlights: ['Lectura tecnica simple', 'Rubros base disponibles', 'Cruce rapido con mapa publico'],
  }),
  'san-luis': buildCityEntry({
    name: 'San Luis',
    region: 'Provincia de San Luis',
    description:
      'Capa publica de UrbanFix para navegar rubros y referencias de base en San Luis.',
    coverageFocus: 'Sirve para expansion ordenada, visibilidad por provincia y consulta comercial.',
    zoneQuery: 'San Luis',
    highlights: ['Base de provincia clara', 'Rubros visibles', 'Cobertura preparada para crecer'],
  }),
  'santa-cruz': buildCityEntry({
    name: 'Santa Cruz',
    region: 'Provincia de Santa Cruz',
    description:
      'Cobertura publica para explorar presencia tecnica, rubros y referencias activas en Santa Cruz.',
    coverageFocus: 'Organiza una salida territorial prolija para una provincia de baja densidad y gran extension.',
    zoneQuery: 'Santa Cruz',
    highlights: ['Territorio amplio ordenado', 'Rubros listos para lectura', 'Estructura publica consistente'],
  }),
  'santa-fe': buildCityEntry({
    name: 'Santa Fe',
    region: 'Provincia de Santa Fe',
    description:
      'Entrada publica para consultar rubros, mano de obra y cobertura tecnica en toda la provincia de Santa Fe.',
    coverageFocus: 'Ideal para combinar lectura provincial con focos urbanos como Rosario y Santa Fe capital.',
    zoneQuery: 'Santa Fe',
    highlights: ['Provincia con foco urbano', 'Rubros listos para comparar', 'Cruce simple con vidriera'],
  }),
  'santiago-del-estero': buildCityEntry({
    name: 'Santiago del Estero',
    region: 'Provincia de Santiago del Estero',
    description:
      'Vista publica para revisar rubros, referencias y cobertura potencial en Santiago del Estero.',
    coverageFocus: 'Pensada para abrir presencia territorial y mantener una capa de consulta simple.',
    zoneQuery: 'Santiago del Estero',
    highlights: ['Entrada publica provincial', 'Rubros accesibles', 'Expansión sin perder orden'],
  }),
  'tierra-del-fuego': buildCityEntry({
    name: 'Tierra del Fuego',
    region: 'Provincia de Tierra del Fuego, Antartida e Islas del Atlantico Sur',
    description:
      'Cobertura publica para explorar rubros, referencias tecnicas y presencia operativa en Tierra del Fuego.',
    coverageFocus: 'Util para extender la capa publica nacional y mostrar cobertura aun en jurisdicciones extremas.',
    zoneQuery: 'Tierra del Fuego',
    highlights: ['Cobertura nacional completa', 'Visibilidad territorial fuerte', 'Lectura publica consistente'],
  }),
  tucuman: buildCityEntry({
    name: 'Tucuman',
    region: 'Provincia de Tucuman',
    description:
      'Base publica para navegar rubros, referencias de mano de obra y cobertura tecnica en Tucuman.',
    coverageFocus: 'Buena base para servicios de mantenimiento, reformas y crecimiento comercial por provincia.',
    zoneQuery: 'Tucuman',
    highlights: ['Rubros con salida rapida', 'Base provincial solida', 'Conexion con cobertura publica'],
  }),
} as const satisfies Record<string, UrbanFixCity>;

export type CiudadKey = keyof typeof ciudades;

export const guias = {
  'guia-presupuestos-construccion': {
    title: 'Guia de presupuestos para construccion',
    description:
      'Como armar presupuestos claros, gestionar clientes y ordenar materiales de obra en construccion.',
    sections: [
      {
        title: 'Datos basicos',
        items: [
          'Cliente, direccion y rubro del trabajo.',
          'Detalle de MANO DE OBRA y materiales.',
          'Tiempos estimados y condiciones.',
        ],
      },
      {
        title: 'Estructura recomendada',
        items: [
          'Agrupa items por rubro.',
          'Separa materiales y MANO DE OBRA.',
          'Inclui impuestos y descuentos si aplica.',
        ],
      },
    ],
  },
  'guia-mano-de-obra': {
    title: 'Guia de MANO DE OBRA en construccion',
    description:
      'Buenas practicas para definir tarifas de MANO DE OBRA y presentarlas al cliente.',
    sections: [
      {
        title: 'Tarifas claras',
        items: [
          'Define precios por rubro o por hora.',
          'Considera complejidad y accesos.',
          'Revisa valores por zona y temporada.',
        ],
      },
      {
        title: 'Comunicacion con clientes',
        items: [
          'Explica alcances y exclusiones.',
          'Documenta cambios y adicionales.',
          'Comparte el presupuesto por link.',
        ],
      },
    ],
  },
  'guia-materiales-obra': {
    title: 'Guia de materiales de obra',
    description:
      'Como organizar materiales de obra, consumos y actualizaciones de precios.',
    sections: [
      {
        title: 'Inventario simple',
        items: [
          'Lista materiales frecuentes por rubro.',
          'Actualiza precios periodicamente.',
          'Guarda notas sobre proveedores.',
        ],
      },
      {
        title: 'Control de costos',
        items: [
          'Registra desperdicio y reposiciones.',
          'Comparte con el cliente solo lo necesario.',
          'Revisa margenes antes de enviar.',
        ],
      },
    ],
  },
  'precio-mano-de-obra-electricidad': {
    title: 'Precio de mano de obra de electricidad en Argentina',
    description:
      'Guia practica para entender precios de mano de obra de electricidad por boca, metro, tablero y complejidad tecnica.',
    sections: [
      {
        title: 'Que cambia el precio en electricidad',
        items: [
          'No vale lo mismo una instalacion por boca que un tendido por metro o una intervencion sobre tablero.',
          'La cantidad de bocas, el tipo de canalizacion, el acceso y la necesidad de amurado cambian la referencia.',
          'Tambien influyen las observaciones tecnicas como diametro, punteado, cierre posterior y nivel de terminacion.',
        ],
      },
      {
        title: 'Como presupuestarlo mejor',
        items: [
          'Separa mano de obra por unidad de referencia: boca, metro, jornada o trabajo completo.',
          'Aclara si incluye canalizacion, amurado, tendido, conexion final o solo una parte del trabajo.',
          'Cruza siempre el item con su variante tecnica antes de comparar precios o copiar referencias.',
        ],
      },
    ],
  },
  'precio-mano-de-obra-refrigeracion': {
    title: 'Precios de mano de obra de refrigeracion en Argentina',
    description:
      'Guia orientativa para leer precios de mano de obra de refrigeracion por rango FG, instalacion, desmontaje y mantenimiento.',
    sections: [
      {
        title: 'Por que varia tanto en refrigeracion',
        items: [
          'Una instalacion estandar de aire acondicionado cambia segun el rango FG del equipo y la complejidad del montaje.',
          'No es igual un split chico que una instalacion con preinstalacion, roof-top o equipos de mayor capacidad.',
          'Tambien cambian el precio la distancia entre unidades, el tendido, la carga y el contexto de obra.',
        ],
      },
      {
        title: 'Buenas practicas para comparar valores',
        items: [
          'Usa siempre el rango FG o la capacidad del equipo como dato tecnico visible.',
          'Aclara si el precio incluye soporte, cañeria, cableado, vacio, prueba y puesta en marcha.',
          'Diferencia instalaciones nuevas, preinstalaciones, desmontajes y mantenimientos preventivos.',
        ],
      },
    ],
  },
  'precio-mano-de-obra-sanitarios': {
    title: 'Precio de mano de obra sanitaria en Argentina',
    description:
      'Guia para ordenar precios de mano de obra sanitaria por diametro, tramo, montaje y sistema de agua, cloaca o pluvial.',
    sections: [
      {
        title: 'Factores tecnicos en sanitarios',
        items: [
          'El diametro de la cañeria, el tipo de material y la altura de trabajo modifican la referencia.',
          'No es lo mismo agua fria, agua caliente, incendio, cloaca o pluvial aunque el item parezca similar.',
          'La apertura de muros, el acceso y el cierre posterior suelen explicar buena parte de la diferencia.',
        ],
      },
      {
        title: 'Como comunicarlo al cliente',
        items: [
          'Define si la unidad es por metro, punto, tramo, artefacto o trabajo completo.',
          'Indica el diametro, la red y el alcance del trabajo para que el presupuesto sea comparable.',
          'Separa los adicionales por roturas, pruebas, desmontes o reinstalaciones.',
        ],
      },
    ],
  },
  'precio-mano-de-obra-pintura': {
    title: 'Precio de mano de obra de pintura en Argentina',
    description:
      'Guia para leer precios de mano de obra de pintura por m2, preparacion de superficie, manos y terminacion.',
    sections: [
      {
        title: 'Que mueve el precio en pintura',
        items: [
          'Los metros cuadrados por si solos no alcanzan: importa mucho la preparacion previa y el estado de la superficie.',
          'No vale igual una mano de mantenimiento que una pintura con enduido, lijado, sellado o reparacion previa.',
          'Tambien cambia segun interior, exterior, altura, andamio y tipo de terminacion final.',
        ],
      },
      {
        title: 'Como dejar la referencia clara',
        items: [
          'Expresa la unidad en m2 cuando corresponda y detalla cantidad de manos y tratamiento previo.',
          'Aclara si el precio incluye proteccion, reparacion de fisuras, enduido o solo aplicacion final.',
          'Cruza la referencia con ciudad, superficie y condicion de la obra antes de cerrar el valor.',
        ],
      },
    ],
  },
} as const;

export type GuiaKey = keyof typeof guias;

export const rubroSlugs = Object.keys(rubros) as RubroKey[];
export const ciudadSlugs = Object.keys(ciudades) as CiudadKey[];
export const guiaSlugs = Object.keys(guias) as GuiaKey[];
