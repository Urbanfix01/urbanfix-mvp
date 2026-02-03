export const rubros = {
  electricidad: {
    title: 'Electricidad',
    description:
      'Gestiona presupuestos, clientes y materiales de obra para trabajos electricos con MANO DE OBRA clara.',
    services: ['Instalaciones electricas', 'Tableros y protecciones', 'Reparaciones y mantenimiento'],
  },
  plomeria: {
    title: 'Plomeria',
    description:
      'Organiza presupuestos y materiales de obra para servicios de plomeria con control de MANO DE OBRA.',
    services: ['Instalaciones sanitarias', 'Reparaciones de perdidas', 'Mantenimiento de redes'],
  },
  pintura: {
    title: 'Pintura',
    description:
      'Gestiona presupuestos por ambiente y tipo de terminacion con MANO DE OBRA y materiales de obra.',
    services: ['Interior y exterior', 'Preparacion de superficies', 'Terminaciones y retoques'],
  },
  albanileria: {
    title: 'Albanileria',
    description:
      'Presupuestos de construccion y reformas con control de MANO DE OBRA y materiales por rubro.',
    services: ['Muros y revoques', 'Ampliaciones y reformas', 'Terminaciones generales'],
  },
  gasista: {
    title: 'Gasista',
    description:
      'Gestion de presupuestos y clientes para instalaciones y mantenimiento con MANO DE OBRA segura.',
    services: ['Instalaciones de gas', 'Reparaciones y pruebas', 'Mantenimiento preventivo'],
  },
  impermeabilizacion: {
    title: 'Impermeabilizacion',
    description:
      'Controla presupuestos y materiales de obra para cubiertas y filtraciones con MANO DE OBRA clara.',
    services: ['Cubiertas y terrazas', 'Sellados y membranas', 'Reparacion de filtraciones'],
  },
  techos: {
    title: 'Techos',
    description:
      'Gestiona presupuestos de techos con control de MANO DE OBRA, materiales y etapas de obra.',
    services: ['Estructuras y reparaciones', 'Aislaciones y mantenimiento', 'Inspecciones y refuerzos'],
  },
  carpinteria: {
    title: 'Carpinteria',
    description:
      'Presupuestos y materiales de obra para carpinteria con MANO DE OBRA detallada.',
    services: ['Muebles y placares', 'Aberturas y ajustes', 'Terminaciones finas'],
  },
  herreria: {
    title: 'Herreria',
    description:
      'Gestion de presupuestos para estructuras metalicas con control de MANO DE OBRA y materiales.',
    services: ['Rejas y portones', 'Estructuras metalicas', 'Mantenimiento y refuerzos'],
  },
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
