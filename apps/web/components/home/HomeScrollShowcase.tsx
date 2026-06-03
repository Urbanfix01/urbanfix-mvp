'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Droplets,
  Hammer,
  Lightbulb,
  MapPin,
  ReceiptText,
  Send,
  ShieldCheck,
  Snowflake,
  Star,
  UserRound,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ProfileOption = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
};

type RequestOption = {
  id: string;
  title: string;
  category: string;
  need: string;
  place: string;
  priority: string;
  technician: string;
  answer: string;
  icon: LucideIcon;
};

type VerifiedTechnician = {
  id: string;
  name: string;
  specialty: string;
  zone: string;
  initials: string;
};

type BudgetCopy = {
  title: string;
  detail: string;
  footer: string;
};

type BudgetQuote = BudgetCopy & {
  amount: string;
  tag: string;
};

const profileOptions: ProfileOption[] = [
  {
    id: 'cliente',
    title: 'Soy cliente',
    description: 'Quiero pedir un trabajo.',
    href: '/cliente',
    cta: 'Entrar como cliente',
    icon: UserRound,
  },
  {
    id: 'tecnico',
    title: 'Soy técnico',
    description: 'Quiero recibir pedidos.',
    href: '/tecnicos',
    cta: 'Entrar como técnico',
    icon: Wrench,
  },
];

const requestOptions: RequestOption[] = [
  {
    id: 'canilla',
    title: 'La canilla me pierde agua',
    category: 'Plomería',
    need: 'La canilla me pierde agua y necesito arreglarla.',
    place: 'Baño o cocina',
    priority: 'Hoy',
    technician: 'Plomero disponible',
    answer: 'Puedo revisar la pérdida y pasarte presupuesto por el arreglo.',
    icon: Droplets,
  },
  {
    id: 'aire',
    title: 'El aire no me enfría',
    category: 'Refrigeración',
    need: 'El aire prende, pero no me enfría bien.',
    place: 'Ambiente principal',
    priority: 'Próximos días',
    technician: 'Técnico en aire',
    answer: 'Puedo diagnosticarlo y cotizar limpieza, gas o reparación.',
    icon: Snowflake,
  },
  {
    id: 'luz',
    title: 'Se me cortó la luz',
    category: 'Electricidad',
    need: 'Se me cortó la luz y necesito revisar qué pasó.',
    place: 'Casa o local',
    priority: 'Urgente',
    technician: 'Electricista disponible',
    answer: 'Puedo revisar tablero, térmica e instalación y pasarte una propuesta clara.',
    icon: Lightbulb,
  },
];

const verifiedTechnicians: VerifiedTechnician[] = [
  {
    id: 'lucas',
    name: 'Lucas P.',
    specialty: 'Plomería',
    zone: 'Zona norte',
    initials: 'LP',
  },
  {
    id: 'mauro',
    name: 'Mauro C.',
    specialty: 'Refrigeración',
    zone: 'Centro',
    initials: 'MC',
  },
  {
    id: 'sofia',
    name: 'Sofía R.',
    specialty: 'Electricidad',
    zone: 'Zona oeste',
    initials: 'SR',
  },
  {
    id: 'equipo-sur',
    name: 'Equipo Sur',
    specialty: 'Mantenimiento',
    zone: 'Zona sur',
    initials: 'ES',
  },
];

const stepByStepStages = [
  {
    title: 'Solicitud',
    caption: 'Creá y publicá',
  },
  {
    title: 'Técnico',
    caption: 'Elegí con quién',
  },
  {
    title: 'Presupuesto',
    caption: 'Revisá la propuesta',
  },
  {
    title: 'Trabajo',
    caption: 'Se realiza',
  },
  {
    title: 'Pago',
    caption: 'Cliente paga',
  },
  {
    title: 'Calificación',
    caption: 'Cerrá el ciclo',
  },
];

const budgetCopyByRequest: Record<string, BudgetCopy> = {
  canilla: {
    title: 'Mano de obra de plomería',
    detail: 'Arreglo de pérdida en canilla. Repuestos aparte si hacen falta.',
    footer: 'El cliente compara y aprueba.',
  },
  aire: {
    title: 'Visita técnica de refrigeración',
    detail: 'Visita para diagnosticar el equipo y confirmar el valor final.',
    footer: 'Puede ser limpieza, gas o reparación.',
  },
  luz: {
    title: 'Visita técnica de electricidad',
    detail: 'Visita para revisar tablero e instalación antes de cotizar.',
    footer: 'Primero seguridad; después presupuesto final.',
  },
};

const budgetQuotesByRequest: Record<string, Record<string, BudgetQuote>> = {
  canilla: {
    lucas: {
      amount: '$42.000',
      tag: 'Resuelve hoy',
      title: 'Mano de obra de plomería',
      detail: 'Reparación de pérdida visible en canilla. Repuestos simples aparte si hacen falta.',
      footer: 'Buena opción si el cliente quiere resolverlo en el día.',
    },
    mauro: {
      amount: '$38.000',
      tag: 'Mejor valor',
      title: 'Ajuste y sellado de canilla',
      detail: 'Revisión de cierre, ajuste y sellado. Repuestos aparte solo si la pieza está dañada.',
      footer: 'Conviene si la pérdida parece simple y se busca cuidar el presupuesto.',
    },
    sofia: {
      amount: '$46.000',
      tag: 'Revisión completa',
      title: 'Reparación con diagnóstico',
      detail: 'Revisión de grifería, flexibles y pérdida. Incluye recomendación antes de comprar repuestos.',
      footer: 'Buena opción si no está claro de dónde viene la pérdida.',
    },
    'equipo-sur': {
      amount: '$58.000',
      tag: 'Con garantía',
      title: 'Servicio de plomería con garantía',
      detail: 'Arreglo de pérdida con control final de funcionamiento. Repuestos aparte si se necesitan.',
      footer: 'Conviene si el cliente prefiere equipo y garantía de seguimiento.',
    },
  },
  aire: {
    lucas: {
      amount: '$28.000',
      tag: 'Visita base',
      title: 'Visita técnica de refrigeración',
      detail: 'Diagnóstico inicial del aire que no enfría. Limpieza, gas o reparación se cotizan aparte.',
      footer: 'Buena opción para saber rápido qué falla antes de avanzar.',
    },
    mauro: {
      amount: '$35.000',
      tag: 'Especialista',
      title: 'Diagnóstico de aire acondicionado',
      detail: 'Revisión de presión, filtros y rendimiento. El arreglo final se confirma después de la visita.',
      footer: 'Conviene si se quiere un técnico de refrigeración específico.',
    },
    sofia: {
      amount: '$31.000',
      tag: 'Control completo',
      title: 'Visita técnica con informe',
      detail: 'Chequeo del equipo, consumo y posible falla eléctrica. Reparación o carga se cotiza aparte.',
      footer: 'Buena opción si el problema puede venir del equipo o de la instalación.',
    },
    'equipo-sur': {
      amount: '$45.000',
      tag: 'Prioridad',
      title: 'Visita prioritaria de refrigeración',
      detail: 'Diagnóstico con disponibilidad prioritaria. Presupuesto final según limpieza, gas o reparación.',
      footer: 'Conviene si el cliente necesita atención más rápida.',
    },
  },
  luz: {
    lucas: {
      amount: '$32.000',
      tag: 'Revisión segura',
      title: 'Visita técnica de electricidad',
      detail: 'Revisión de térmica, tablero y corte de luz. Materiales o reparación se cotizan aparte.',
      footer: 'Buena opción para detectar la causa sin avanzar a ciegas.',
    },
    mauro: {
      amount: '$36.000',
      tag: 'Diagnóstico claro',
      title: 'Control de instalación eléctrica',
      detail: 'Chequeo de tablero, tomas y posible sobrecarga. Presupuesto final después de revisar.',
      footer: 'Conviene si se necesita entender el origen del corte.',
    },
    sofia: {
      amount: '$30.000',
      tag: 'Mejor valor',
      title: 'Visita eléctrica inicial',
      detail: 'Diagnóstico del corte de luz y revisión básica de seguridad. Materiales aparte si hacen falta.',
      footer: 'Buena opción para una primera revisión cuidando el costo.',
    },
    'equipo-sur': {
      amount: '$48.000',
      tag: 'Equipo disponible',
      title: 'Atención eléctrica con soporte',
      detail: 'Visita técnica con revisión de tablero e instalación. Reparación final según falla detectada.',
      footer: 'Conviene si el cliente quiere soporte de equipo para casa o local.',
    },
  },
};

const requestResponseCopy: Record<
  string,
  { needsVisit: boolean; fallback: string; byTechnician: Record<string, string> }
> = {
  canilla: {
    needsVisit: false,
    fallback:
      'Podemos ayudarte con la canilla. Coordinamos horario y te pasamos un presupuesto de plomería claro antes de avanzar.',
    byTechnician: {
      lucas:
        'Hola, soy Lucas. Puedo revisar esa pérdida hoy y pasarte la mano de obra de plomería con el presupuesto bien claro.',
      mauro:
        'Te puedo dar una mano con la canilla. Primero vemos de dónde pierde y después te mando un presupuesto de plomería simple.',
      sofia:
        'Podemos ayudarte con esa pérdida. Coordinamos una visita, reviso la canilla y te paso mano de obra de plomería sin vueltas.',
      'equipo-sur':
        'Estamos disponibles para resolver la pérdida. Te confirmamos horario y presupuesto de plomería antes de hacer el arreglo.',
    },
  },
  aire: {
    needsVisit: true,
    fallback:
      'Podemos revisar el aire. Para saber el valor final, coordinamos una visita técnica y después te pasamos presupuesto claro.',
    byTechnician: {
      lucas:
        'Puedo ayudarte con el aire. Hago una visita técnica, reviso si es limpieza, gas o reparación y después te paso el valor claro.',
      mauro:
        'Hola, soy Mauro. Para saber por qué no enfría necesito verlo; coordinamos visita técnica y te paso presupuesto de refrigeración.',
      sofia:
        'Lo vemos sin problema. Te confirmo un horario, reviso el equipo en una visita técnica y te dejo el presupuesto claro.',
      'equipo-sur':
        'Podemos coordinar una visita para el aire. Revisamos la falla y te pasamos presupuesto de refrigeración después de verlo.',
    },
  },
  luz: {
    needsVisit: true,
    fallback:
      'Podemos ayudarte con el corte de luz. Por seguridad, una visita técnica permite revisar la instalación y confirmar el valor.',
    byTechnician: {
      lucas:
        'Puedo ayudarte con el corte. Reviso tablero y térmica en una visita técnica, y ahí te confirmo el valor de electricidad.',
      mauro:
        'Lo revisamos con cuidado. Primero vemos la instalación en una visita técnica y después te paso presupuesto de electricidad.',
      sofia:
        'Hola, soy Sofía. Puedo revisar el corte de luz, detectar qué pasó y confirmarte el valor después de la visita técnica.',
      'equipo-sur':
        'Estamos disponibles para ayudarte. Revisamos la luz en una visita técnica, confirmamos la causa y te pasamos presupuesto.',
    },
  },
};

export default function HomeScrollShowcase() {
  const [isTutorialStarted, setIsTutorialStarted] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [chosenTechnicianIds, setChosenTechnicianIds] = useState<string[]>([]);
  const [acceptedBudgetTechnicianId, setAcceptedBudgetTechnicianId] = useState<string | null>(null);
  const [postBudgetStep, setPostBudgetStep] = useState(0);
  const [clientRating, setClientRating] = useState(0);
  const [tutorialStage, setTutorialStage] = useState(0);
  const [isFlowDragging, setIsFlowDragging] = useState(false);
  const [flowScrollLeft, setFlowScrollLeft] = useState(0);
  const flowScrollRef = useRef<HTMLDivElement | null>(null);
  const flowDragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const selectedProfile = profileOptions.find((item) => item.id === selectedProfileId) || null;
  const selectedRequest = requestOptions.find((item) => item.id === selectedRequestId) || null;
  const selectedTechnician = verifiedTechnicians.find((item) => item.id === selectedTechnicianId) || null;
  const chosenTechnicians = verifiedTechnicians.filter((item) => chosenTechnicianIds.includes(item.id));
  const acceptedBudgetTechnician =
    chosenTechnicians.find((item) => item.id === acceptedBudgetTechnicianId) || null;
  const selectedBudgetTechnician =
    chosenTechnicians.find((item) => item.id === selectedTechnicianId) || acceptedBudgetTechnician;
  const hasChosenTechnicians = chosenTechnicians.length > 0;
  const hasAcceptedBudget = Boolean(acceptedBudgetTechnician);
  const visibleTechnicians = hasChosenTechnicians ? chosenTechnicians : verifiedTechnicians;
  const selectedBudgetCopy = selectedRequest ? budgetCopyByRequest[selectedRequest.id] : null;
  const SelectedIcon = (selectedRequest || requestOptions[0]).icon;
  const profileActionLabel = selectedProfileId === 'tecnico' ? 'Recibir una solicitud' : 'Crear una solicitud';
  const visibleProfileOptions = selectedProfile ? [selectedProfile] : profileOptions;
  const stepByStepIndex =
    clientRating
      ? 5
      : postBudgetStep >= 2
        ? 5
        : postBudgetStep >= 1
          ? 4
          : hasAcceptedBudget
            ? 3
            : hasChosenTechnicians
      ? 2
      : tutorialStage > 1
        ? 1
        : selectedRequest
          ? 0
          : selectedProfileId
            ? 0
            : -1;
  const stepByStepPrompt = hasAcceptedBudget
    ? `Presupuesto aceptado: ${acceptedBudgetTechnician?.name} queda seleccionado para avanzar.`
    : selectedBudgetTechnician
      ? `Revisando presupuesto de ${selectedBudgetTechnician.name}.`
    : hasChosenTechnicians
    ? chosenTechnicians.length === 1
      ? `${chosenTechnicians[0].name} te envió el presupuesto.`
      : `${chosenTechnicians.length} técnicos te enviaron presupuesto.`
    : selectedTechnicianIds.length
      ? `${selectedTechnicianIds.length} técnico${selectedTechnicianIds.length > 1 ? 's' : ''} seleccionado${
          selectedTechnicianIds.length > 1 ? 's' : ''
        }. Pedí presupuestos para comparar.`
      : tutorialStage > 1
        ? 'Paso 3: elegí uno o más técnicos para que presupuesten.'
        : selectedRequest
          ? 'Paso 1: publicá la solicitud para enviarla al mapa.'
          : selectedProfileId
            ? 'Paso 1: creá y publicá la solicitud.'
            : 'Antes de empezar, elegí si entrás como cliente o técnico.';
  const technicianTopPositions = hasChosenTechnicians
    ? chosenTechnicians.length === 1
      ? [112]
      : [40, 245, 450, 655]
    : [0, 110, 220, 330];
  const technicianLineYs = visibleTechnicians.map(
    (_, index) => technicianTopPositions[index] + (hasChosenTechnicians ? 48 : 38)
  );
  const acceptedBudgetIndex = acceptedBudgetTechnician
    ? chosenTechnicians.findIndex((item) => item.id === acceptedBudgetTechnician.id)
    : -1;
  const acceptedBudgetLineY = acceptedBudgetIndex >= 0 ? technicianLineYs[acceptedBudgetIndex] : null;
  const conceptPrompt =
    clientRating
      ? `Ciclo cerrado: el cliente pagó y calificó a ${acceptedBudgetTechnician?.name} con ${clientRating} estrellas.`
      : postBudgetStep >= 2
        ? `Pago realizado. Ahora el cliente cierra el trabajo con una calificación.`
        : postBudgetStep >= 1
          ? `${acceptedBudgetTechnician?.name} realizó el trabajo. El siguiente paso es el pago.`
          : hasAcceptedBudget
      ? `Presupuesto aceptado: ${acceptedBudgetTechnician?.name} queda seleccionado para avanzar.`
      : selectedBudgetTechnician
        ? `Revisando presupuesto de ${selectedBudgetTechnician.name}`
        : hasChosenTechnicians
          ? `${chosenTechnicians.length} técnico${chosenTechnicians.length > 1 ? 's' : ''} seleccionado${
              chosenTechnicians.length > 1 ? 's' : ''
            }. Tocá uno para ver su presupuesto.`
          : stepByStepPrompt;
  const selectedBudgetIndex = selectedBudgetTechnician
    ? chosenTechnicians.findIndex((item) => item.id === selectedBudgetTechnician.id)
    : -1;
  const selectedBudgetLineY = !hasAcceptedBudget && selectedBudgetIndex >= 0 ? technicianLineYs[selectedBudgetIndex] : null;
  const finalRouteStartX = 611;
  const finalWorkX = 650;
  const finalPayX = 850;
  const finalCloseX = 1035;
  const finalRouteEndX = finalCloseX;
  const finalRouteProgressX = postBudgetStep >= 2 ? finalCloseX : postBudgetStep >= 1 ? finalPayX : finalWorkX;
  const visibleStepIndex = Math.max(stepByStepIndex, 0);
  const activeStep = stepByStepStages[visibleStepIndex] || stepByStepStages[0];
  const linkedFlowStyle = selectedRequest
    ? { transform: `translateX(-${flowScrollLeft}px)` }
    : undefined;
  const getConceptNodeStateClass = (stageIndex: number) => {
    if (stepByStepIndex > stageIndex) return 'ufx-node-past';
    if (stepByStepIndex === stageIndex) return 'ufx-node-current';
    return 'ufx-node-next';
  };

  const getBudgetQuote = (technician: VerifiedTechnician): BudgetQuote | null => {
    if (!selectedRequest || !selectedBudgetCopy) return null;

    return (
      budgetQuotesByRequest[selectedRequest.id]?.[technician.id] || {
        ...selectedBudgetCopy,
        amount: 'A confirmar',
        tag: 'Presupuesto',
      }
    );
  };

  const renderProfilePill = (option: ProfileOption, isDestination = false) => {
    const OptionIcon = option.icon;
    const profileStateClass = selectedProfile ? 'ufx-node-past' : 'ufx-node-current';
    const className = `group ufx-flow-node ${profileStateClass} relative mx-auto inline-flex min-h-12 w-full max-w-[238px] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-extrabold text-[#2a0338] shadow-[0_14px_34px_rgba(255,143,31,0.18)] transition ${
      isDestination
        ? 'cursor-default bg-[#ffad56] sm:col-start-3'
        : 'hover:bg-[#ffad56] hover:shadow-[0_18px_40px_rgba(255,143,31,0.24)]'
    }`;

    const content = (
      <>
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#2a0338] text-[#ffb35e]">
          <OptionIcon className="h-4 w-4" />
        </span>
        <span className="relative">{option.title}</span>
        {!isDestination ? (
          <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-1" />
        ) : null}
      </>
    );

    if (isDestination) {
      return (
        <div key={option.id} className={className} aria-label={option.title}>
          {content}
        </div>
      );
    }

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => selectProfile(option.id)}
        aria-pressed={selectedProfileId === option.id}
        className={className}
      >
        {content}
      </button>
    );
  };

  const renderBudgetCard = (technician: VerifiedTechnician, className = '') => {
    const budgetQuote = getBudgetQuote(technician);
    if (!budgetQuote) return null;
    const isAccepted = acceptedBudgetTechnicianId === technician.id;
    const budgetStateClass = hasAcceptedBudget && !isAccepted ? 'ufx-node-past' : 'ufx-node-current';

    return (
      <div
        className={`ufx-budget-card ${budgetStateClass} rounded-2xl border px-3 py-3 text-left text-white shadow-[0_18px_54px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 ${
          isAccepted
            ? 'border-[#ff8f1f] bg-[#ff8f1f]/18 ring-1 ring-[#ff8f1f]/70'
            : 'border-[#ff8f1f]/45 bg-[#2f073f]/95 hover:border-[#ff8f1f]/80'
        } ${className}`}
        aria-live="polite"
      >
        <p
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.11em] ${
            isAccepted ? 'bg-white text-[#2a0338]' : 'bg-[#ff8f1f] text-[#2a0338]'
          }`}
        >
          {isAccepted ? <CheckCircle2 className="h-3 w-3" /> : <ReceiptText className="h-3 w-3" />}
          {isAccepted ? 'Aceptado' : 'Presupuesto enviado'}
        </p>
        <h3 className="mt-2 text-sm font-extrabold">{technician.name} envió su propuesta</h3>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#ff8f1f] px-3 py-2 text-[#2a0338]">
          <span className="text-xl font-black leading-none">{budgetQuote.amount}</span>
          <span className="rounded-full bg-[#2a0338]/12 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]">
            {budgetQuote.tag}
          </span>
        </div>
        <p className="mt-3 text-xs font-bold text-[#ffd6a6]">{budgetQuote.title}</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-white/86">{budgetQuote.detail}</p>
        <p className="mt-2 rounded-xl bg-white/[0.06] px-3 py-2 text-[11px] font-semibold leading-4 text-white/70">
          {isAccepted ? 'Cliente acepta esta propuesta.' : budgetQuote.footer}
        </p>
        <button
          type="button"
          onClick={() => {
            setAcceptedBudgetTechnicianId(technician.id);
            setSelectedTechnicianId(null);
            setPostBudgetStep(0);
            setClientRating(0);
          }}
          disabled={isAccepted}
          aria-label={`Aceptar presupuesto de ${technician.name}`}
          aria-pressed={isAccepted}
          className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
            isAccepted
              ? 'cursor-default bg-[#22c55e] text-[#062b15] shadow-[0_14px_34px_rgba(34,197,94,0.18)]'
              : 'bg-[#22c55e] text-[#062b15] shadow-[0_14px_34px_rgba(34,197,94,0.22)] hover:-translate-y-0.5 hover:bg-[#4ade80] hover:shadow-[0_18px_42px_rgba(34,197,94,0.30)]'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isAccepted ? 'Presupuesto aceptado' : 'Aceptar presupuesto'}
        </button>
      </div>
    );
  };

  const renderTechnicianCard = (technician: VerifiedTechnician, className = '', style?: CSSProperties) => {
    const isFocused = selectedTechnicianId === technician.id;
    const isSelected = selectedTechnicianIds.includes(technician.id);
    const isChosen = chosenTechnicianIds.includes(technician.id);
    const isActive = isSelected || isChosen || isFocused;
    const displayedSpecialty = selectedRequest?.category || technician.specialty;
    const responseCopy = selectedRequest ? requestResponseCopy[selectedRequest.id] : null;
    const technicianMessage = responseCopy
      ? responseCopy.byTechnician[technician.id] || responseCopy.fallback
      : 'Podemos ayudarte. Te paso disponibilidad, valor de mano de obra y presupuesto claro.';
    const visitNote = responseCopy?.needsVisit
      ? 'Para saber cuánto vale, este trabajo se confirma con visita técnica.'
      : 'Con este pedido puede pasar una orientación clara antes de avanzar.';
    const selectedCount = Math.max(selectedTechnicianIds.length, 1);
    const technicianStateClass = hasChosenTechnicians
      ? selectedBudgetTechnician?.id === technician.id && !hasAcceptedBudget
        ? 'ufx-node-current'
        : 'ufx-node-past'
      : 'ufx-node-current';
    const budgetRequestLabel = `Pedir presupuesto a ${selectedCount} técnico${selectedCount > 1 ? 's' : ''}`;

    const cardTop = typeof style?.top === 'number' ? style.top : null;
    const messagePositionClass =
      cardTop !== null && cardTop <= 40
        ? 'ufx-tech-message--top top-0'
        : cardTop !== null && cardTop >= 300
          ? 'ufx-tech-message--bottom bottom-0'
          : 'top-1/2 -translate-y-1/2';

    return (
      <div key={technician.id} className={`ufx-tech-card-shell ${className}`} style={style}>
        <button
          type="button"
          onClick={() => {
            if (hasChosenTechnicians) {
              return;
            }
            const wasSelected = selectedTechnicianIds.includes(technician.id);
            setSelectedTechnicianId(wasSelected ? null : technician.id);
            setSelectedTechnicianIds(
              wasSelected
                ? selectedTechnicianIds.filter((id) => id !== technician.id)
                : [...selectedTechnicianIds, technician.id]
            );
          }}
          aria-label={`Elegir ${technician.name}`}
          aria-pressed={isActive}
          className={`ufx-tech-card ${technicianStateClass} flex min-h-[76px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${
            isActive ? 'text-white ring-1 ring-[#ff8f1f]/60' : 'text-white hover:border-[#ff8f1f]/60'
          }`}
          style={{
            background: isActive
              ? 'linear-gradient(135deg, rgba(255,143,31,0.28), rgba(255,255,255,0.08))'
              : 'rgba(255,255,255,0.05)',
            borderColor: isActive ? 'rgba(255,143,31,0.74)' : 'rgba(255,255,255,0.13)',
            boxShadow: isActive
              ? '0 18px 44px rgba(255,143,31,0.18), inset 0 1px 0 rgba(255,255,255,0.18)'
              : undefined,
          }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff8f1f] text-sm font-extrabold text-[#2a0338]">
            {technician.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white">{technician.name}</p>
            <p className={`truncate text-xs font-semibold ${isActive ? 'text-[#ffd6a6]' : 'text-white/55'}`}>
              {displayedSpecialty}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                isChosen
                  ? 'bg-white text-[#2a0338]'
                  : isSelected
                    ? 'bg-[#ff8f1f] text-[#2a0338]'
                    : 'bg-[#ff8f1f]/12 text-[#ffd6a6]'
              }`}
            >
              {isChosen ? <ReceiptText className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {isChosen ? 'Presupuestó' : isSelected ? 'Seleccionado' : 'Verificado'}
            </span>
          </div>
        </button>

        {isFocused && isSelected && !hasChosenTechnicians ? (
          <>
            <div className={`ufx-tech-message absolute left-[calc(100%+10px)] z-40 hidden w-[246px] rounded-2xl border border-[#ff8f1f]/40 bg-[#2f073f]/95 px-3 py-3 text-[13px] font-semibold leading-5 text-white shadow-[0_18px_54px_rgba(0,0,0,0.32)] sm:block ${messagePositionClass}`}>
              <p>{technicianMessage}</p>
              <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold leading-5 text-[#ffd6a6]">
                {visitNote}
              </p>
              <button
                type="button"
                onClick={() => {
                  const nextIds = selectedTechnicianIds.includes(technician.id)
                    ? selectedTechnicianIds
                    : [...selectedTechnicianIds, technician.id];
                  setSelectedTechnicianId(null);
                  setSelectedTechnicianIds(nextIds);
                  setChosenTechnicianIds(nextIds);
                  setAcceptedBudgetTechnicianId(null);
                  setPostBudgetStep(0);
                  setClientRating(0);
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#ff8f1f] px-4 py-2.5 text-sm font-extrabold text-[#2a0338] transition hover:bg-[#ffad56]"
              >
                {budgetRequestLabel}
              </button>
            </div>
            <div className="mt-3 rounded-2xl border border-[#ff8f1f]/35 bg-[#2f073f]/95 px-4 py-3 text-sm font-semibold leading-6 text-white sm:hidden">
              <p>{technicianMessage}</p>
              <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold leading-5 text-[#ffd6a6]">
                {visitNote}
              </p>
              <button
                type="button"
                onClick={() => {
                  const nextIds = selectedTechnicianIds.includes(technician.id)
                    ? selectedTechnicianIds
                    : [...selectedTechnicianIds, technician.id];
                  setSelectedTechnicianId(null);
                  setSelectedTechnicianIds(nextIds);
                  setChosenTechnicianIds(nextIds);
                  setAcceptedBudgetTechnicianId(null);
                  setPostBudgetStep(0);
                  setClientRating(0);
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#ff8f1f] px-4 py-2.5 text-sm font-extrabold text-[#2a0338] transition hover:bg-[#ffad56]"
              >
                {budgetRequestLabel}
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const selectProfile = (id: string) => {
    setSelectedProfileId(id);
    setSelectedRequestId(null);
    setSelectedTechnicianId(null);
    setSelectedTechnicianIds([]);
    setChosenTechnicianIds([]);
    setAcceptedBudgetTechnicianId(null);
    setPostBudgetStep(0);
    setClientRating(0);
    setTutorialStage(0);
    setFlowScrollLeft(0);
  };

  const continueFromProfile = () => {
    setSelectedRequestId(null);
    setSelectedTechnicianId(null);
    setSelectedTechnicianIds([]);
    setChosenTechnicianIds([]);
    setAcceptedBudgetTechnicianId(null);
    setPostBudgetStep(0);
    setClientRating(0);
    setTutorialStage(1);
    setFlowScrollLeft(0);
  };

  const selectRequest = (id: string) => {
    setSelectedRequestId(id);
    setSelectedTechnicianId(null);
    setSelectedTechnicianIds([]);
    setChosenTechnicianIds([]);
    setAcceptedBudgetTechnicianId(null);
    setPostBudgetStep(0);
    setClientRating(0);
    setTutorialStage(1);
    setFlowScrollLeft(0);
  };

  const publishRequest = () => {
    if (!selectedRequestId) return;
    setSelectedTechnicianId(null);
    setSelectedTechnicianIds([]);
    setChosenTechnicianIds([]);
    setAcceptedBudgetTechnicianId(null);
    setPostBudgetStep(0);
    setClientRating(0);
    setTutorialStage(2);
    setFlowScrollLeft(0);
  };

  const restartTutorial = () => {
    setSelectedProfileId(null);
    setSelectedRequestId(null);
    setSelectedTechnicianId(null);
    setSelectedTechnicianIds([]);
    setChosenTechnicianIds([]);
    setAcceptedBudgetTechnicianId(null);
    setPostBudgetStep(0);
    setClientRating(0);
    setTutorialStage(0);
    setFlowScrollLeft(0);
  };

  const startTutorial = () => {
    restartTutorial();
    setIsTutorialStarted(true);
  };

  const goBackTutorialStep = () => {
    if (clientRating) {
      setClientRating(0);
      setPostBudgetStep(2);
      return;
    }

    if (postBudgetStep > 0) {
      setPostBudgetStep(postBudgetStep - 1);
      return;
    }

    if (acceptedBudgetTechnicianId) {
      setAcceptedBudgetTechnicianId(null);
      setPostBudgetStep(0);
      setClientRating(0);
      return;
    }

    if (tutorialStage === 2) {
      setTutorialStage(1);
      setSelectedTechnicianId(null);
      setSelectedTechnicianIds([]);
      setChosenTechnicianIds([]);
      setAcceptedBudgetTechnicianId(null);
      setPostBudgetStep(0);
      setClientRating(0);
      setFlowScrollLeft(0);
      return;
    }

    if (tutorialStage === 1) {
      setTutorialStage(0);
      setSelectedRequestId(null);
      setSelectedTechnicianId(null);
      setSelectedTechnicianIds([]);
      setChosenTechnicianIds([]);
      setAcceptedBudgetTechnicianId(null);
      setPostBudgetStep(0);
      setClientRating(0);
      setFlowScrollLeft(0);
      if (selectedProfileId !== 'cliente') {
        setSelectedProfileId(null);
      }
      return;
    }

    restartTutorial();
    setIsTutorialStarted(false);
  };

  const syncFlowScroll = () => {
    const node = flowScrollRef.current;
    if (!node) return;
    setFlowScrollLeft(Math.round(node.scrollLeft));
  };

  const beginFlowDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button, a'))) return;
    const node = flowScrollRef.current;
    if (!node || node.scrollWidth <= node.clientWidth) return;

    flowDragState.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: node.scrollLeft,
    };
    setIsFlowDragging(true);
    setFlowScrollLeft(Math.round(node.scrollLeft));
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveFlowDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = flowScrollRef.current;
    if (!node || !flowDragState.current.active) return;

    event.preventDefault();
    const distance = event.clientX - flowDragState.current.startX;
    node.scrollLeft = flowDragState.current.scrollLeft - distance;
    setFlowScrollLeft(Math.round(node.scrollLeft));
  };

  const endFlowDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!flowDragState.current.active) return;
    flowDragState.current.active = false;
    setIsFlowDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-ufx-reveal]'));
    if (!nodes.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -12% 0px',
      }
    );

    nodes.forEach((node, index) => {
      node.style.setProperty('--reveal-delay', `${Math.min(index * 45, 260)}ms`);
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="border-t border-white/10 bg-[#21002f] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl space-y-12 px-4 sm:px-6 lg:px-8">
        <div data-ufx-reveal className="ufx-reveal">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-4xl">
              <p className="ufx-tutorial-kicker inline-flex rounded-full border border-[#ff8f1f]/30 bg-[#ff8f1f]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#ffb35e]">
                PASO A PASO INTERACTIVO
              </p>
              <h2 className="ufx-tutorial-title mt-4 text-4xl font-extrabold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
                ¿Cómo funciona?
              </h2>
            </div>

            {!isTutorialStarted ? (
              <div className="ufx-tutorial-cta inline-flex lg:shrink-0">
                <button
                  type="button"
                  onClick={startTutorial}
                  className="group relative inline-flex min-h-14 items-center gap-3 overflow-hidden rounded-full bg-[#ff8f1f] px-7 py-4 text-base font-extrabold text-[#2a0338] shadow-[0_18px_44px_rgba(255,143,31,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffad56] hover:shadow-[0_24px_52px_rgba(255,143,31,0.30)]"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.32),rgba(255,255,255,0))] opacity-0 transition group-hover:opacity-100" />
                  <span className="relative">Empezar paso a paso</span>
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#2a0338] text-[#ffb35e]">
                    <ArrowRight className="h-4 w-4 animate-[ufx-arrow-nudge_1.05s_ease-in-out_infinite]" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="ufx-tutorial-cta inline-flex lg:shrink-0">
                <button
                  type="button"
                  onClick={goBackTutorialStep}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/14 px-5 py-2.5 text-sm font-bold text-white/76 transition hover:border-white/35 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver un paso
                </button>
              </div>
            )}
          </div>

          {isTutorialStarted && tutorialStage <= 2 ? (
            <div className="mt-8 max-w-7xl">
              <div
                className="rounded-[28px] border border-white/10 bg-black/16 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-4"
                aria-label="Paso a paso"
              >
                <div className="sm:hidden">
                  <div className="rounded-2xl border border-[#ff8f1f]/45 bg-[#ff8f1f]/12 px-4 py-3 text-white">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff8f1f] text-sm font-extrabold text-[#2a0338]">
                        {visibleStepIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold">{activeStep.title}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-white/68">
                          {activeStep.caption}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-extrabold text-[#ffb35e]">
                        {visibleStepIndex + 1}/{stepByStepStages.length}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-1.5" aria-hidden="true">
                      {stepByStepStages.map((step, index) => (
                        <span
                          key={`mobile-step-${step.title}`}
                          className={`h-1.5 flex-1 rounded-full ${
                            index <= visibleStepIndex ? 'bg-[#ff8f1f]' : 'bg-white/12'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="hidden gap-2 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {stepByStepStages.map((step, index) => {
                    const isActive = index === stepByStepIndex;
                    const isDone = stepByStepIndex >= 0 && index < stepByStepIndex;

                    return (
                      <div
                        key={step.title}
                        className={`relative flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                          isActive
                            ? 'border-[#ff8f1f]/70 bg-[#ff8f1f]/14 text-white'
                            : isDone
                              ? 'border-[#ff8f1f]/35 bg-[#ff8f1f]/8 text-white/82'
                              : 'border-white/10 bg-black/10 text-white/45'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                            isActive || isDone
                              ? 'bg-[#ff8f1f] text-[#2a0338]'
                              : 'bg-white/[0.06] text-white/45'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-extrabold">{step.title}</span>
                          <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-current opacity-70">
                            {step.caption}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-5 text-lg font-semibold text-white">{conceptPrompt}</p>
              <div
                className={`mt-6 grid w-full gap-4 ${
                  selectedProfile
                    ? `${selectedRequest ? 'max-w-[300px]' : 'mx-auto max-w-[340px]'} justify-items-center`
                    : 'max-w-5xl sm:grid-cols-3'
                } sm:items-start`}
                style={linkedFlowStyle}
              >
                {visibleProfileOptions.map((option) => renderProfilePill(option))}
              </div>

              {selectedProfileId ? (
                <div
                  className={`grid w-full ${selectedRequest ? 'max-w-[300px]' : 'max-w-[340px]'} justify-items-center ${
                    selectedRequest ? '' : 'mx-auto'
                  }`}
                  style={linkedFlowStyle}
                >
                  <div className="flex min-w-[190px] flex-col items-center">
                    <div className="ufx-flow-connector h-10 w-px bg-[#ff8f1f]/75" />
                    <button
                      type="button"
                      onClick={continueFromProfile}
                      className={`group ufx-flow-node ${getConceptNodeStateClass(0)} relative inline-flex min-h-12 w-full max-w-[238px] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-extrabold text-[#2a0338] shadow-[0_14px_34px_rgba(255,143,31,0.18)] transition hover:bg-[#ffad56] hover:shadow-[0_18px_40px_rgba(255,143,31,0.24)]`}
                    >
                      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#2a0338] text-[#ffb35e]">
                        <ClipboardList className="h-4 w-4" />
                      </span>
                      <span className="relative">
                        {profileActionLabel}
                      </span>
                      <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedProfileId && (tutorialStage === 1 || selectedRequest) ? (
                <div className="mt-0 max-w-7xl">
                  {selectedRequest ? (
                    <>
                      <div
                        ref={flowScrollRef}
                        onPointerDown={beginFlowDrag}
                        onPointerMove={moveFlowDrag}
                        onPointerUp={endFlowDrag}
                        onPointerCancel={endFlowDrag}
                        onScroll={syncFlowScroll}
                        className={`ufx-flow-scroll -mx-4 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${
                          isFlowDragging ? 'is-dragging' : ''
                        }`}
                      >
                      <div className="grid w-full gap-5 sm:min-w-[1700px] sm:grid-cols-[300px_1300px]">
                        {selectedProfileId === 'tecnico' ? <div className="hidden sm:block" /> : null}
                        <div className="flex min-w-[250px] flex-col items-center">
                          <div className="ufx-flow-connector h-10 w-px bg-[#ff8f1f]/75" />
                          <div className={`ufx-flow-node ${getConceptNodeStateClass(1)} inline-flex min-h-14 w-full max-w-[286px] items-center justify-center gap-2.5 rounded-full bg-[#ffad56] px-5 py-3 text-center text-sm font-extrabold text-[#2a0338] shadow-[0_14px_34px_rgba(255,143,31,0.16)]`}>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a0338] text-[#ffb35e]">
                              <SelectedIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 leading-tight">{selectedRequest.title}</span>
                          </div>
                          <div className="ufx-flow-connector h-10 w-px bg-[#ff8f1f]/75" />
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              onClick={publishRequest}
                              disabled={tutorialStage > 1}
                              className={`group ufx-flow-node ${getConceptNodeStateClass(1)} relative z-10 inline-flex min-h-12 w-[190px] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#ff8f1f] px-5 py-2.5 text-sm font-extrabold text-[#2a0338] shadow-[0_14px_34px_rgba(255,143,31,0.18)] transition hover:bg-[#ffad56] hover:shadow-[0_18px_40px_rgba(255,143,31,0.24)] disabled:cursor-default disabled:bg-[#ffad56] disabled:hover:shadow-[0_14px_34px_rgba(255,143,31,0.18)]`}
                            >
                              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#2a0338] text-[#ffb35e]">
                                <Send className="h-4 w-4" />
                              </span>
                              <span className="relative">Publicar</span>
                              {tutorialStage <= 1 ? (
                                <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-1" />
                              ) : null}
                            </button>
                          </div>
                        </div>
                        {tutorialStage > 1 ? (
                          <div className="hidden min-w-[250px] justify-center sm:flex">
                            <div
                              className={`relative w-[1300px] max-w-[1300px] shrink-0 transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                hasChosenTechnicians ? 'h-[850px]' : 'h-[440px]'
                              }`}
                            >
                              <svg
                                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                                viewBox={`0 0 1300 ${hasChosenTechnicians ? 850 : 440}`}
                                aria-hidden="true"
                              >
                                <path d="M -146 160 H 130" stroke="#ff8f1f" strokeOpacity="0.62" strokeWidth="1.25" />
                                <path d="M 130 160 H 220" stroke="#ff8f1f" strokeOpacity="0.5" strokeWidth="1.15" />
                                {technicianLineYs.length ? (
                                  <path
                                    d={`M 220 ${Math.min(...technicianLineYs)} V ${Math.max(...technicianLineYs)}`}
                                    stroke="#ff8f1f"
                                    strokeOpacity="0.46"
                                    strokeWidth="1.1"
                                  />
                                ) : null}
                                {technicianLineYs.map((lineY) => (
                                  <path
                                    key={`tech-line-${lineY}`}
                                    d={`M 220 ${lineY} H 240`}
                                    stroke="#ff8f1f"
                                    strokeOpacity="0.46"
                                    strokeWidth="1.1"
                                  />
                                ))}
                                {hasChosenTechnicians
                                  ? technicianLineYs.map((lineY) => (
                                      <path
                                        key={`budget-button-line-${lineY}`}
                                        d={`M 430 ${lineY} H 455`}
                                        stroke="#ff8f1f"
                                        strokeOpacity="0.5"
                                        strokeWidth="1.1"
                                      />
                                    ))
                                  : null}
                                {selectedBudgetLineY !== null ? (
                                  <path
                                    d={`M 611 ${selectedBudgetLineY} H 615`}
                                    stroke="#ff8f1f"
                                    strokeOpacity="0.58"
                                    strokeWidth="1.15"
                                  />
                                ) : null}
                                {hasAcceptedBudget && acceptedBudgetLineY !== null ? (
                                  <>
                                    <path
                                      d={`M ${finalRouteStartX} ${acceptedBudgetLineY} H ${finalRouteEndX}`}
                                      stroke="#ff8f1f"
                                      strokeDasharray="7 9"
                                      strokeLinecap="round"
                                      strokeOpacity="0.24"
                                      strokeWidth="2"
                                    />
                                    <path
                                      d={`M ${finalRouteStartX} ${acceptedBudgetLineY} H ${finalRouteProgressX}`}
                                      stroke="#22c55e"
                                      strokeLinecap="round"
                                      strokeOpacity="0.86"
                                      strokeWidth="2.4"
                                    />
                                  </>
                                ) : null}
                              </svg>
                              <ArrowRight className="absolute left-[82px] top-[152px] h-4 w-4 text-[#ff8f1f]" />
                              <div
                                className={`absolute left-[130px] top-[160px] z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338] shadow-[0_0_46px_rgba(255,143,31,0.32)] ${getConceptNodeStateClass(2)}`}
                                aria-label="Ubicación"
                              >
                                <MapPin className="h-7 w-7" />
                              </div>
                              {visibleTechnicians.map((technician, index) => {
                                const positionClass =
                                  'absolute left-[240px] w-[190px]';
                                const chosenPositionClass =
                                  'absolute left-[240px] w-[190px]';

                                return renderTechnicianCard(
                                  technician,
                                  `ufx-tech-network-card ${hasChosenTechnicians ? chosenPositionClass : positionClass}`,
                                  { top: technicianTopPositions[index] }
                                );
                              })}
                              {hasChosenTechnicians
                                ? chosenTechnicians.map((technician, index) => {
                                    const lineY = technicianLineYs[index];
                                    const isBudgetAccepted = acceptedBudgetTechnicianId === technician.id;
                                    const isBudgetActive =
                                      !hasAcceptedBudget && selectedBudgetTechnician?.id === technician.id;
                                    const isBudgetMuted = hasAcceptedBudget && !isBudgetAccepted;
                                    const budgetQuote = getBudgetQuote(technician);

                                    return (
                                      <button
                                        key={`budget-node-${technician.id}`}
                                        type="button"
                                        onClick={() => {
                                          if (hasAcceptedBudget) {
                                            return;
                                          }
                                          setSelectedTechnicianId(technician.id);
                                        }}
                                        aria-label={`Ver presupuesto de ${technician.name}`}
                                        aria-pressed={isBudgetAccepted || isBudgetActive}
                                        className={`ufx-budget-node absolute left-[455px] z-30 inline-flex min-h-11 w-[156px] flex-col items-center justify-center rounded-full border px-3 py-2 text-xs font-extrabold leading-tight transition hover:-translate-y-0.5 ${
                                          isBudgetAccepted
                                            ? 'border-[#22c55e] bg-[#22c55e] text-[#062b15] shadow-[0_12px_30px_rgba(34,197,94,0.28)]'
                                            : isBudgetActive
                                            ? 'border-[#ff8f1f] bg-[#ff8f1f] text-[#2a0338] shadow-[0_12px_28px_rgba(255,143,31,0.24)]'
                                            : isBudgetMuted
                                              ? 'border-white/10 bg-white/18 text-white/42'
                                            : 'border-white/18 bg-white text-[#2a0338] hover:border-[#ff8f1f]'
                                        }`}
                                        style={{
                                          top: lineY,
                                          transform: 'translateY(-50%)',
                                        }}
                                      >
                                        <span className="inline-flex items-center gap-1.5">
                                          {isBudgetAccepted ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          ) : (
                                            <ReceiptText className="h-3.5 w-3.5" />
                                          )}
                                          {isBudgetAccepted ? 'Aceptado' : 'Presupuesto'}
                                        </span>
                                        <span className="text-[11px] font-black">{budgetQuote?.amount || 'A confirmar'}</span>
                                      </button>
                                    );
                                  })
                                : null}
                              {!hasAcceptedBudget && selectedBudgetTechnician ? (() => {
                                const budgetPositionClass =
                                  [
                                    'absolute left-[615px] top-[0px] z-30 w-[220px]',
                                    'absolute left-[615px] top-[205px] z-30 w-[220px]',
                                    'absolute left-[615px] top-[410px] z-30 w-[220px]',
                                    'absolute left-[615px] top-[615px] z-30 w-[220px]',
                                  ][selectedBudgetIndex] || 'absolute left-[615px] z-30 w-[220px]';

                                return renderBudgetCard(selectedBudgetTechnician, budgetPositionClass);
                              })() : null}
                              {hasAcceptedBudget && acceptedBudgetLineY !== null ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPostBudgetStep(Math.max(postBudgetStep, 1));
                                      setClientRating(0);
                                    }}
                                    disabled={postBudgetStep >= 1}
                                    className={`absolute z-30 inline-flex min-h-11 w-[170px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                                      postBudgetStep >= 1
                                        ? 'cursor-default border-[#22c55e] bg-[#22c55e] text-[#062b15] shadow-[0_12px_30px_rgba(34,197,94,0.24)]'
                                        : 'border-[#ff8f1f] bg-[#ff8f1f] text-[#2a0338] shadow-[0_12px_28px_rgba(255,143,31,0.22)] hover:bg-[#ffad56]'
                                    }`}
                                    style={{
                                      left: finalWorkX,
                                      top: acceptedBudgetLineY,
                                      transform: 'translateY(-50%)',
                                    }}
                                    aria-label="Marcar trabajo realizado"
                                  >
                                    {postBudgetStep >= 1 ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <Hammer className="h-4 w-4" />
                                    )}
                                    {postBudgetStep >= 1 ? 'Trabajo realizado' : 'Realizar trabajo'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (postBudgetStep < 1) return;
                                      setPostBudgetStep(Math.max(postBudgetStep, 2));
                                      setClientRating(0);
                                    }}
                                    disabled={postBudgetStep < 1 || postBudgetStep >= 2}
                                    className={`absolute z-30 inline-flex min-h-11 w-[160px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                                      postBudgetStep >= 2
                                        ? 'cursor-default border-[#22c55e] bg-[#22c55e] text-[#062b15] shadow-[0_12px_30px_rgba(34,197,94,0.24)]'
                                        : postBudgetStep >= 1
                                          ? 'border-[#ff8f1f] bg-[#ff8f1f] text-[#2a0338] shadow-[0_12px_28px_rgba(255,143,31,0.22)] hover:bg-[#ffad56]'
                                          : 'cursor-default border-white/10 bg-white/14 text-white/38'
                                    }`}
                                    style={{
                                      left: finalPayX,
                                      top: acceptedBudgetLineY,
                                      transform: 'translateY(-50%)',
                                    }}
                                    aria-label="Pagar trabajo"
                                  >
                                    {postBudgetStep >= 2 ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <CreditCard className="h-4 w-4" />
                                    )}
                                    {postBudgetStep >= 2 ? 'Pago realizado' : 'Pagar trabajo'}
                                  </button>
                                  {postBudgetStep >= 2 ? (
                                    <div
                                      className={`absolute z-30 w-[260px] rounded-2xl border px-4 py-3 text-white shadow-[0_18px_48px_rgba(0,0,0,0.24)] ${
                                        clientRating
                                          ? 'border-[#22c55e]/70 bg-[#12351f]/92'
                                          : 'border-[#ff8f1f]/45 bg-[#2f073f]/95'
                                      }`}
                                      style={{
                                        left: finalCloseX,
                                        top: acceptedBudgetLineY,
                                        transform: 'translateY(-50%)',
                                      }}
                                      aria-label="Calificar trabajo"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-extrabold">
                                          {clientRating ? 'Control final' : 'Calificar servicio'}
                                        </span>
                                        <span
                                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                            clientRating ? 'bg-[#22c55e] text-[#062b15]' : 'bg-[#ff8f1f] text-[#2a0338]'
                                          }`}
                                        >
                                          {clientRating ? <CheckCircle2 className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs font-semibold leading-5 text-white/68">
                                        {clientRating
                                          ? `Ciclo cerrado con ${clientRating} estrellas para ${acceptedBudgetTechnician?.name}.`
                                          : 'El cliente evalúa cómo salió el trabajo y cierra la solicitud.'}
                                      </p>
                                      <div className="mt-3 flex gap-1.5" aria-label="Elegir calificación">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                          <button
                                            key={score}
                                            type="button"
                                            onClick={() => {
                                              setClientRating(score);
                                              setPostBudgetStep(3);
                                            }}
                                            aria-label={`Calificar con ${score} estrella${score > 1 ? 's' : ''}`}
                                            aria-pressed={clientRating === score}
                                            className={`flex h-8 w-8 items-center justify-center rounded-full border transition hover:-translate-y-0.5 ${
                                              clientRating >= score
                                                ? 'border-[#22c55e] bg-[#22c55e] text-[#062b15]'
                                                : 'border-white/14 bg-white/[0.06] text-white/55 hover:border-[#ff8f1f]/60 hover:text-[#ffb35e]'
                                            }`}
                                          >
                                            <Star className="h-4 w-4" fill={clientRating >= score ? 'currentColor' : 'none'} />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          </div>
                        ) : selectedProfileId === 'cliente' ? (
                          <div className="hidden sm:block" />
                        ) : null}
                        {tutorialStage > 1 ? (
                          <div className="flex flex-col items-center sm:hidden">
                            <div className="h-10 w-px bg-[#ff8f1f]/75" />
                            <div
                              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338] shadow-[0_0_46px_rgba(255,143,31,0.32)]"
                              aria-label="Ubicación"
                            >
                              <MapPin className="h-7 w-7" />
                            </div>
                            <div className="mt-5 grid w-full gap-3">
                              {visibleTechnicians.map((technician) => renderTechnicianCard(technician, 'w-full'))}
                            </div>
                            {hasChosenTechnicians ? (
                              <div className="mt-3 grid w-full gap-2">
                                {chosenTechnicians.map((technician) => {
                                  const isBudgetAccepted = acceptedBudgetTechnicianId === technician.id;
                                  const isBudgetActive =
                                    !hasAcceptedBudget && selectedBudgetTechnician?.id === technician.id;
                                  const isBudgetMuted = hasAcceptedBudget && !isBudgetAccepted;
                                  const budgetQuote = getBudgetQuote(technician);

                                  return (
                                    <button
                                      key={`mobile-budget-node-${technician.id}`}
                                      type="button"
                                      onClick={() => {
                                        if (hasAcceptedBudget) {
                                          return;
                                        }
                                        setSelectedTechnicianId(technician.id);
                                      }}
                                      aria-label={`Ver presupuesto de ${technician.name}`}
                                      aria-pressed={isBudgetAccepted || isBudgetActive}
                                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                                        isBudgetAccepted
                                          ? 'border-[#22c55e] bg-[#22c55e] text-[#062b15]'
                                          : isBudgetActive
                                          ? 'border-[#ff8f1f] bg-[#ff8f1f] text-[#2a0338]'
                                          : isBudgetMuted
                                            ? 'border-white/10 bg-white/18 text-white/42'
                                          : 'border-white/18 bg-white text-[#2a0338]'
                                      }`}
                                    >
                                      {isBudgetAccepted ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <ReceiptText className="h-4 w-4" />
                                      )}
                                      <span>{isBudgetAccepted ? 'Aceptado' : `Presupuesto de ${technician.name}`}</span>
                                      <span className="rounded-full bg-[#2a0338]/10 px-2 py-1 text-xs font-black">
                                        {budgetQuote?.amount || 'A confirmar'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                            {!hasAcceptedBudget && selectedBudgetTechnician ? (
                              <div className="mt-4 grid w-full gap-3">
                                {renderBudgetCard(selectedBudgetTechnician, 'w-full')}
                              </div>
                            ) : null}
                            {hasAcceptedBudget ? (
                              <div className="mt-4 flex w-full flex-col items-center">
                                <div className="h-8 w-px bg-[#22c55e]/75" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPostBudgetStep(Math.max(postBudgetStep, 1));
                                    setClientRating(0);
                                  }}
                                  disabled={postBudgetStep >= 1}
                                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${
                                    postBudgetStep >= 1
                                      ? 'bg-[#22c55e] text-[#062b15]'
                                      : 'bg-[#ff8f1f] text-[#2a0338]'
                                  }`}
                                >
                                  {postBudgetStep >= 1 ? <CheckCircle2 className="h-4 w-4" /> : <Hammer className="h-4 w-4" />}
                                  {postBudgetStep >= 1 ? 'Trabajo realizado' : 'Realizar trabajo'}
                                </button>
                                <div className={`h-8 w-px ${postBudgetStep >= 1 ? 'bg-[#22c55e]/75' : 'bg-[#ff8f1f]/45'}`} />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (postBudgetStep < 1) return;
                                    setPostBudgetStep(Math.max(postBudgetStep, 2));
                                    setClientRating(0);
                                  }}
                                  disabled={postBudgetStep < 1 || postBudgetStep >= 2}
                                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${
                                    postBudgetStep >= 2
                                      ? 'bg-[#22c55e] text-[#062b15]'
                                      : postBudgetStep >= 1
                                        ? 'bg-[#ff8f1f] text-[#2a0338]'
                                        : 'bg-white/14 text-white/40'
                                  }`}
                                >
                                  {postBudgetStep >= 2 ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                                  {postBudgetStep >= 2 ? 'Pago realizado' : 'Pagar trabajo'}
                                </button>
                                {postBudgetStep >= 2 ? (
                                  <>
                                    <div className="h-8 w-px bg-[#22c55e]/75" />
                                    <div
                                      className={`w-full rounded-2xl border px-4 py-3 ${
                                        clientRating
                                          ? 'border-[#22c55e]/70 bg-[#22c55e]/14'
                                          : 'border-[#ff8f1f]/45 bg-[#2f073f]/95'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-extrabold text-white">
                                          {clientRating ? 'Control final' : 'Calificar servicio'}
                                        </span>
                                        <Star className={clientRating ? 'h-4 w-4 text-[#22c55e]' : 'h-4 w-4 text-[#ffb35e]'} />
                                      </div>
                                      <div className="mt-3 flex justify-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                          <button
                                            key={score}
                                            type="button"
                                            onClick={() => {
                                              setClientRating(score);
                                              setPostBudgetStep(3);
                                            }}
                                            aria-label={`Calificar con ${score} estrella${score > 1 ? 's' : ''}`}
                                            className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                                              clientRating >= score
                                                ? 'border-[#22c55e] bg-[#22c55e] text-[#062b15]'
                                                : 'border-white/14 bg-white/[0.06] text-white/55'
                                            }`}
                                          >
                                            <Star className="h-4 w-4" fill={clientRating >= score ? 'currentColor' : 'none'} />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      </div>

                    {tutorialStage > 1 ? (
                      <p className="mt-3 text-center text-sm font-semibold text-white/60" aria-live="polite">
                        {hasAcceptedBudget
                          ? clientRating
                            ? `Ciclo cerrado: trabajo realizado, pago registrado y ${clientRating} estrellas.`
                            : postBudgetStep >= 2
                              ? 'Pago registrado. Falta calificar para cerrar el ciclo.'
                              : postBudgetStep >= 1
                                ? `${acceptedBudgetTechnician?.name} realizó el trabajo. Falta registrar el pago.`
                                : `${acceptedBudgetTechnician?.name} queda elegido. El cliente acepta el presupuesto.`
                          : selectedTechnician || hasChosenTechnicians
                            ? hasChosenTechnicians
                            ? selectedRequest && requestResponseCopy[selectedRequest.id]?.needsVisit
                              ? `${chosenTechnicians.length} técnico${
                                  chosenTechnicians.length > 1 ? 's' : ''
                                } enviaron presupuesto de visita técnica para confirmar el valor final.`
                              : `${chosenTechnicians.length} técnico${
                                  chosenTechnicians.length > 1 ? 's' : ''
                                } enviaron presupuesto para avanzar con el trabajo.`
                            : `${selectedTechnician?.name} respondió. Podés sumar más técnicos o pedir presupuestos.`
                          : 'Elegí uno o más técnicos para pedir presupuestos.'}
                      </p>
                    ) : null}
                    </>
                  ) : (
                    <>
                      <div className="relative mx-auto hidden h-14 w-full max-w-[820px] sm:block">
                        <span className="ufx-flow-connector absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-[#ff8f1f]/75" />
                        <span className="absolute left-[16.06%] right-[16.06%] top-7 h-px bg-[#ff8f1f]/70" />
                        <span className="absolute left-[16.06%] top-7 h-7 w-px -translate-x-1/2 bg-[#ff8f1f]/70" />
                        <span className="absolute left-1/2 top-7 h-7 w-px -translate-x-1/2 bg-[#ff8f1f]/70" />
                        <span className="absolute left-[83.94%] top-7 h-7 w-px -translate-x-1/2 bg-[#ff8f1f]/70" />
                        <span className="absolute left-1/2 top-[1.62rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#ff8f1f]" />
                      </div>

                      <div className="mx-auto grid w-full max-w-[820px] gap-4 sm:grid-cols-3">
                        {requestOptions.map((option) => {
                          const OptionIcon = option.icon;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => selectRequest(option.id)}
                              className="group ufx-flow-node relative flex min-h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#ff8f1f] px-4 py-3 text-center text-sm font-extrabold text-[#2a0338] shadow-[0_14px_34px_rgba(255,143,31,0.18)] transition hover:bg-[#ffad56] hover:shadow-[0_18px_40px_rgba(255,143,31,0.24)]"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a0338] text-[#ffb35e]">
                                <OptionIcon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 leading-tight">{option.title}</span>
                              <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <style jsx global>{`
        .ufx-tutorial-kicker,
        .ufx-tutorial-title,
        .ufx-tutorial-cta {
          opacity: 0;
          filter: blur(8px);
          transition:
            opacity 820ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 820ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 820ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform, filter;
        }

        .ufx-tutorial-kicker {
          transform: translate3d(0, 18px, 0);
          transition-delay: 80ms;
        }

        .ufx-tutorial-title {
          transform: translate3d(0, 34px, 0) scale(0.985);
          transition-delay: 170ms;
        }

        .ufx-tutorial-cta {
          transform: translate3d(34px, 0, 0) scale(0.96);
          transition-delay: 310ms;
        }

        .ufx-reveal.is-visible .ufx-tutorial-kicker,
        .ufx-reveal.is-visible .ufx-tutorial-title,
        .ufx-reveal.is-visible .ufx-tutorial-cta {
          opacity: 1;
          filter: blur(0);
          transform: translate3d(0, 0, 0) scale(1);
        }

        @media (max-width: 1023px) {
          .ufx-tutorial-cta {
            transform: translate3d(0, 22px, 0) scale(0.97);
          }
        }

        @keyframes ufx-arrow-nudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(4px);
          }
        }

        .ufx-flow-node {
          animation: ufx-flow-node-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: center;
          transition:
            transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 220ms ease,
            background-color 220ms ease;
          will-change: transform, opacity;
        }

        .ufx-node-current {
          opacity: 1 !important;
          filter: none;
        }

        .ufx-node-next {
          opacity: 0.82 !important;
          filter: saturate(0.9);
        }

        .ufx-node-past {
          opacity: 0.48 !important;
          filter: saturate(0.62) brightness(0.9);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14) !important;
        }

        .ufx-node-past:hover {
          opacity: 0.68 !important;
        }

        .ufx-flow-scroll {
          cursor: grab;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
          touch-action: pan-y;
        }

        .ufx-flow-scroll.is-dragging {
          cursor: grabbing;
          user-select: none;
        }

        .ufx-flow-scroll::-webkit-scrollbar {
          display: none;
          height: 0;
          width: 0;
        }

        .ufx-flow-node:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.01);
        }

        .ufx-flow-node:active:not(:disabled) {
          transform: translateY(0) scale(0.99);
        }

        .ufx-flow-connector {
          animation: ufx-flow-line-in 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top;
        }

        .ufx-tech-card {
          cursor: pointer;
        }

        .ufx-tech-card-shell {
          position: relative;
          overflow: visible;
        }

        .ufx-tech-network-card {
          position: absolute;
          animation: ufx-flow-node-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .ufx-budget-card {
          animation: ufx-flow-node-in 440ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes ufx-flow-node-in {
          from {
            opacity: 0;
            filter: blur(7px);
            transform: translate3d(0, 12px, 0) scale(0.985);
          }
          to {
            opacity: 1;
            filter: blur(0);
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes ufx-flow-line-in {
          from {
            opacity: 0;
            transform: scaleY(0);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        .ufx-tech-message::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 50%;
          height: 12px;
          width: 12px;
          transform: translateY(-50%) rotate(45deg);
          border-bottom: 1px solid rgba(255, 143, 31, 0.4);
          border-left: 1px solid rgba(255, 143, 31, 0.4);
          background: rgba(47, 7, 63, 0.95);
        }

        .ufx-tech-message--top::before {
          top: 38px;
        }

        .ufx-tech-message--bottom::before {
          top: auto;
          bottom: 38px;
          transform: rotate(45deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .ufx-tutorial-kicker,
          .ufx-tutorial-title,
          .ufx-tutorial-cta,
          .ufx-flow-node,
          .ufx-flow-connector,
          .ufx-tech-network-card,
          .ufx-budget-card,
          .ufx-tech-card {
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
