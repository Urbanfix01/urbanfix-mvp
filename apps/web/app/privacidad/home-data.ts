export type HomeViewId =
  | 'view-tech'
  | 'view-biz'
  | 'view-personas'
  | 'view-guias'
  | 'view-ciudades'
  | 'view-rubros'
  | 'view-android';

export const highlights = [
  {
    title: 'Presupuestos claros',
    description: 'Items, materiales, impuestos y descuento en un formato facil de aprobar.',
  },
  {
    title: 'Seguimiento por estados',
    description: 'Mira en segundos que esta en computo, presentado, aprobado o cobrado.',
  },
  {
    title: 'Cliente con link directo',
    description: 'Tu cliente abre el detalle desde el celular sin cuentas ni pasos extra.',
  },
];

export const headerSecondaryViews = [
  { label: 'Guia precios', viewId: 'view-guias', windowId: 'ventana-guias' },
  { label: 'Ciudades', viewId: 'view-ciudades', windowId: 'ventana-ciudades' },
  { label: 'Rubros', viewId: 'view-rubros', windowId: 'ventana-rubros' },
] as const;

export const homepageViewInputs = [
  'view-tech',
  'view-biz',
  'view-personas',
  'view-guias',
  'view-ciudades',
  'view-rubros',
  'view-android',
] as const;

export const trustChips = [
  'Producto en uso real en Argentina',
  'Capturas reales del sistema',
  'Soporte humano',
  'Politicas publicas y claras',
];

export const inPageWindows: Array<{
  id: string;
  viewId: HomeViewId;
  title: string;
  description: string;
  bullets: string[];
  image: string;
}> = [
  {
    id: 'ventana-tecnicos',
    viewId: 'view-tech',
    title: 'Ventana Tecnicos',
    description: 'Operacion diaria para crear, enviar y seguir presupuestos con trazabilidad.',
    bullets: ['Panel y actividad del dia', 'Presupuestador operativo', 'Seguimiento por estados'],
    image: '/illustrations/window-tecnicos.svg',
  },
  {
    id: 'ventana-negocio',
    viewId: 'view-biz',
    title: 'Ventana Negocio',
    description: 'Control de pipeline comercial y estandar operativo para equipos y lideres.',
    bullets: ['Estandarizacion de propuestas', 'Visibilidad por responsable', 'Escala sin perder control'],
    image: '/illustrations/window-negocio.svg',
  },
  {
    id: 'ventana-personas',
    viewId: 'view-personas',
    title: 'Ventana Clientes',
    description: 'Personas que necesitan una reparacion y quieren comparar, aprobar y coordinar sin friccion.',
    bullets: ['Pedido en 30 segundos', 'Comparacion clara de alcance y precio', 'Confirmacion por link o WhatsApp'],
    image: '/illustrations/window-institucional.svg',
  },
  {
    id: 'ventana-guias',
    viewId: 'view-guias',
    title: 'Ventana Guias y Precios',
    description: 'Acceso simple a referencias de precios y buenas practicas comerciales.',
    bullets: ['Guias por categoria', 'Contexto para cotizar', 'Base de consulta rapida'],
    image: '/illustrations/window-guias.svg',
  },
  {
    id: 'ventana-ciudades',
    viewId: 'view-ciudades',
    title: 'Ventana Ciudades',
    description: 'Cobertura geografica y lectura por zona para orientar la operacion.',
    bullets: ['Foco regional', 'Demanda por zonas', 'Expansion planificada'],
    image: '/illustrations/window-ciudades.svg',
  },
  {
    id: 'ventana-rubros',
    viewId: 'view-rubros',
    title: 'Ventana Rubros',
    description: 'Especialidades y segmentos para comunicar servicios con mas precision.',
    bullets: ['Rubros priorizados', 'Lenguaje por especialidad', 'Oferta mas clara al cliente'],
    image: '/illustrations/window-rubros.svg',
  },
];

export const processStepsTech = [
  {
    title: '1. Armado',
    description: 'Carga cliente, direccion, tareas y materiales en un solo flujo operativo.',
  },
  {
    title: '2. Envio',
    description: 'Comparte el presupuesto por link o WhatsApp con formato profesional.',
  },
  {
    title: '3. Confirmacion',
    description: 'El cliente revisa y confirma desde el visualizador web.',
  },
  {
    title: '4. Seguimiento',
    description: 'Pasa a agenda, notificaciones e historial para cerrar la obra sin perder datos.',
  },
];

export const processStepsBiz = [
  {
    title: '1. Estandarizacion',
    description: 'Define criterio comercial comun para todo el equipo y evita propuestas dispares.',
  },
  {
    title: '2. Distribucion',
    description: 'Asigna responsables y canaliza las propuestas con visibilidad por area.',
  },
  {
    title: '3. Control',
    description: 'Supervisa avance, aprobacion y conversion con lectura clara del pipeline.',
  },
  {
    title: '4. Escala',
    description: 'Replica el flujo en mas zonas o equipos sin perder trazabilidad de punta a punta.',
  },
];

export const processStepsClients = [
  {
    title: '1. Pedido rapido',
    description: 'Describe la reparacion, agrega direccion y define necesidad en pocos segundos.',
  },
  {
    title: '2. Cotizacion clara',
    description: 'Recibe propuesta con alcance, materiales y total en formato facil de entender.',
  },
  {
    title: '3. Confirmacion simple',
    description: 'Aprueba por link o WhatsApp sin crear cuenta ni perder tiempo.',
  },
  {
    title: '4. Seguimiento',
    description: 'Consulta estado de la obra y proximos pasos desde un mismo hilo.',
  },
];

export const featureShowcase = [
  {
    title: 'Panel de control',
    description: 'Resumen de actividad, estados y accesos rapidos para arrancar el dia con foco.',
    image: '/illustrations/PANEL DE CONTROL.jpeg',
    imagePosition: 'center center',
    badge: 'Control',
  },
  {
    title: 'Presupuestos profesionales',
    description: 'Items por mano de obra y materiales, totales claros y estructura lista para enviar.',
    image: '/illustrations/PRESUPUESTADOR.jpeg',
    imagePosition: 'center center',
    badge: 'Cotizacion',
  },
  {
    title: 'Visualizador para clientes',
    description: 'Tu cliente abre el presupuesto por link, revisa el detalle y confirma.',
    image: '/illustrations/LINK DEL PRESUPUESTO.jpeg',
    imagePosition: 'center center',
    badge: 'Cliente',
  },
  {
    title: 'Agenda',
    description: 'Organiza trabajos aprobados y fechas comprometidas sin planillas paralelas.',
    image: '/illustrations/AGENDA.jpeg',
    imagePosition: 'center center',
    badge: 'Planificacion',
  },
  {
    title: 'Notificaciones',
    description: 'Mantente al dia con eventos importantes: respuestas, cambios y tareas pendientes.',
    image: '/illustrations/PRESUPUESTO PDF.jpeg',
    imagePosition: 'center center',
    badge: 'Alertas',
  },
  {
    title: 'Perfil y marca',
    description: 'Logo, datos y presentacion profesional en cada propuesta que envias.',
    image: '/illustrations/PERFIL TECNICO.jpeg',
    imagePosition: 'center center',
    badge: 'Marca',
  },
];

export const kpiCards = [
  {
    value: '3x',
    label: 'Mas velocidad para armar presupuestos',
    detail: 'Plantillas y flujo guiado para cotizar sin rehacer trabajo.',
  },
  {
    value: '1 link',
    label: 'Para que el cliente vea y confirme',
    detail: 'Un solo enlace con detalle completo y aprobacion sin friccion.',
  },
  {
    value: '100%',
    label: 'Del flujo en un solo lugar',
    detail: 'Cliente, cotizacion y seguimiento conectados de punta a punta.',
  },
];

export const businessHighlights = [
  {
    title: 'Estandar operativo',
    description: 'Criterio unificado de cotizacion para todo el equipo y menos desvio comercial.',
  },
  {
    title: 'Trazabilidad completa',
    description: 'Cada propuesta queda registrada con estado, historial y responsable.',
  },
  {
    title: 'Escala comercial',
    description: 'Mas volumen de presupuestos sin perder control ni calidad de entrega.',
  },
];

export const clientHighlights = [
  {
    title: 'Pedido en segundos',
    description: 'Solicita una reparacion desde celular con datos clave y sin formularios largos.',
  },
  {
    title: 'Comparacion transparente',
    description: 'Visualiza tareas, materiales y montos para decidir con confianza.',
  },
  {
    title: 'Confirmacion inmediata',
    description: 'Aprueba por link y coordina avance sin llamadas interminables.',
  },
];

export const businessKpiCards = [
  {
    value: '1 tablero',
    label: 'Para ver operaciones y pipeline comercial',
    detail: 'Visibilidad central de avance, aprobacion y seguimiento por responsable.',
  },
  {
    value: '0 caos',
    label: 'En handoffs entre equipo y cliente',
    detail: 'Misma informacion para ventas, ejecucion y cliente final en tiempo real.',
  },
  {
    value: 'ROI',
    label: 'Con foco en eficiencia del proceso',
    detail: 'Menos retrabajo administrativo y mas tiempo en tareas de valor.',
  },
];

export const clientKpiCards = [
  {
    value: '<30s',
    label: 'Para iniciar una solicitud',
    detail: 'Carga minima de datos para activar una cotizacion real.',
  },
  {
    value: '1 link',
    label: 'Para revisar y confirmar',
    detail: 'El cliente visualiza detalle completo y responde sin fricciones.',
  },
  {
    value: '100%',
    label: 'Del proceso en una vista',
    detail: 'Pedido, propuesta y seguimiento unificados en el mismo flujo.',
  },
];

export const tradeBadges = [
  'Electricidad',
  'Plomeria',
  'Pintura',
  'Albanileria',
  'Herreria',
  'Mantenimiento',
  'Techos',
  'Gas',
];

export const businessBadges = ['Contratistas', 'Cuadrillas', 'Estudios tecnicos', 'Constructoras', 'Mantenimiento'];

export const clientBadges = ['Hogar', 'Comercio', 'Urgencias', 'Mantenimiento', 'Refacciones'];

export const impactPanels = [
  {
    title: 'Entrada ordenada',
    description: 'Cliente, direccion y alcance en un punto de inicio limpio.',
  },
  {
    title: 'Cotizacion clara',
    description: 'Items y totales legibles para que el cliente decida mas rapido.',
  },
  {
    title: 'Seguimiento accionable',
    description: 'Estado real de cada presupuesto para priorizar el dia.',
  },
];

export const trustSignals = [
  {
    title: 'Transparencia comercial',
    description: 'Propuesta de valor clara, sin letra chica y con foco en resultados operativos.',
  },
  {
    title: 'Operacion centralizada',
    description: 'Cliente, cotizacion, adjuntos y seguimiento viven en el mismo flujo.',
  },
  {
    title: 'Soporte y mejora continua',
    description: 'El equipo acompana implementacion y toma feedback para iterar rapido.',
  },
  {
    title: 'Base legal visible',
    description: 'Privacidad y terminos accesibles para trabajar con respaldo formal.',
  },
];

export const commitmentItems = [
  'Sin permanencia obligatoria para empezar.',
  'Proceso trazable desde primer contacto hasta cierre.',
  'Acceso web y app con experiencia consistente.',
  'Feedback de producto incorporado en roadmap activo.',
];

export const faq = [
  {
    question: 'UrbanFix sirve para una sola especialidad o varias?',
    answer:
      'Puedes usar UrbanFix para electricidad, plomeria, pintura, mantenimiento y rubros mixtos. El objetivo es ordenar tu proceso comercial.',
  },
  {
    question: 'El cliente necesita instalar algo para ver el presupuesto?',
    answer:
      'No. El cliente recibe un link web y puede revisar el detalle desde el navegador del celular.',
  },
  {
    question: 'Puedo empezar desde web y despues seguir en la app?',
    answer:
      'Si. Puedes gestionar desde web y complementar con la app para trabajar en campo.',
  },
  {
    question: 'Hay soporte para dudas iniciales?',
    answer:
      'Si. Desde soporte te ayudamos a configurar precios, perfil y flujo de trabajo en los primeros dias.',
  },
];

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'UrbanFix',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android',
  inLanguage: 'es-AR',
  description:
    'Plataforma para crear, enviar y gestionar presupuestos de obra con seguimiento por estados.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'ARS',
  },
  url: 'https://www.urbanfix.com.ar',
};

export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'UrbanFix',
  url: 'https://www.urbanfix.com.ar',
  email: 'info@urbanfixar.com',
};
