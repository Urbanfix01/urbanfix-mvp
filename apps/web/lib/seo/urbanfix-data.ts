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

export const ciudades = {
  caba: {
    name: 'CABA',
    region: 'Ciudad Autonoma de Buenos Aires',
    description:
      'Gestion de presupuestos, clientes y materiales de obra para trabajos en CABA.',
  },
  cordoba: {
    name: 'Cordoba',
    region: 'Provincia de Cordoba',
    description:
      'Gestion de presupuestos y MANO DE OBRA para obras y mantenimiento en Cordoba.',
  },
  rosario: {
    name: 'Rosario',
    region: 'Provincia de Santa Fe',
    description:
      'Gestion de presupuestos y materiales de obra para clientes en Rosario.',
  },
  mendoza: {
    name: 'Mendoza',
    region: 'Provincia de Mendoza',
    description:
      'Gestion de presupuestos y MANO DE OBRA para obras y servicios en Mendoza.',
  },
} as const;

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
          'Cliente, direccion y rubro de construccion.',
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
} as const;

export type GuiaKey = keyof typeof guias;

export const rubroSlugs = Object.keys(rubros) as RubroKey[];
export const ciudadSlugs = Object.keys(ciudades) as CiudadKey[];
export const guiaSlugs = Object.keys(guias) as GuiaKey[];
