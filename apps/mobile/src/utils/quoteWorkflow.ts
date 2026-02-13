import { normalizeStatus } from './status';

export type QuoteWorkflowStatus =
  | 'draft'
  | 'sent'
  | 'revision_requested'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'cancelled';

type StatusMeta = {
  label: string;
  color: string;
  bg: string;
};

export type WorkflowAction = {
  nextStatus: QuoteWorkflowStatus;
  label: string;
  hint: string;
  icon:
    | 'send-outline'
    | 'thumbs-up-outline'
    | 'document-text-outline'
    | 'play-outline'
    | 'checkmark-done-outline'
    | 'cash-outline'
    | 'calendar-outline'
    | 'close-circle-outline';
};

const STATUS_META: Record<QuoteWorkflowStatus, StatusMeta> = {
  draft: { label: 'BORRADOR', color: '#92400E', bg: '#FEF3C7' },
  sent: { label: 'ENVIADO', color: '#1E40AF', bg: '#DBEAFE' },
  revision_requested: { label: 'REQUIERE CAMBIOS', color: '#7C2D12', bg: '#FED7AA' },
  approved: { label: 'APROBADO', color: '#166534', bg: '#DCFCE7' },
  scheduled: { label: 'PROGRAMADO', color: '#0F766E', bg: '#CCFBF1' },
  in_progress: { label: 'EN PROGRESO', color: '#7C3AED', bg: '#EDE9FE' },
  completed: { label: 'FINALIZADO', color: '#0F766E', bg: '#D1FAE5' },
  paid: { label: 'COBRADO', color: '#065F46', bg: '#A7F3D0' },
  cancelled: { label: 'CANCELADO', color: '#B91C1C', bg: '#FEE2E2' },
};

const ALIASES: Record<QuoteWorkflowStatus, string[]> = {
  draft: ['draft', 'borrador'],
  sent: ['sent', 'presented', 'presentado', 'pending', 'pendiente', 'client_review'],
  revision_requested: ['revision_requested', 'revision', 'changes_requested', 'cambios_solicitados', 'rework'],
  approved: ['approved', 'aprobado', 'accepted'],
  scheduled: ['scheduled', 'programado', 'agendado'],
  in_progress: ['in_progress', 'inprogress', 'en_progreso', 'working'],
  completed: ['completed', 'completado', 'finalizado', 'finalizados'],
  paid: ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'],
  cancelled: ['cancelled', 'canceled', 'cancelado', 'rechazado', 'rejected'],
};

const ORDERED_STATUSES: QuoteWorkflowStatus[] = [
  'draft',
  'sent',
  'revision_requested',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'paid',
  'cancelled',
];

const toWorkflowStatus = (status?: string | null): QuoteWorkflowStatus => {
  const normalized = normalizeStatus(status);
  const entry = ORDERED_STATUSES.find((key) => ALIASES[key].includes(normalized));
  return entry || 'draft';
};

const PROCESS_ACTIONS: Partial<Record<QuoteWorkflowStatus, WorkflowAction>> = {
  draft: {
    nextStatus: 'sent',
    label: 'Enviar al cliente',
    hint: 'Presupuesto enviado para revision del cliente.',
    icon: 'send-outline',
  },
  sent: {
    nextStatus: 'approved',
    label: 'Registrar aprobacion',
    hint: 'El cliente confirmo y se puede ejecutar.',
    icon: 'thumbs-up-outline',
  },
  revision_requested: {
    nextStatus: 'sent',
    label: 'Reenviar presupuesto',
    hint: 'Cambios aplicados y reenviado al cliente.',
    icon: 'document-text-outline',
  },
  approved: {
    nextStatus: 'scheduled',
    label: 'Marcar programado',
    hint: 'Trabajo con fecha y listo para iniciar.',
    icon: 'calendar-outline',
  },
  scheduled: {
    nextStatus: 'in_progress',
    label: 'Iniciar trabajo',
    hint: 'El tecnico ya esta trabajando.',
    icon: 'play-outline',
  },
  in_progress: {
    nextStatus: 'completed',
    label: 'Marcar finalizado',
    hint: 'Trabajo terminado, pendiente de cobro.',
    icon: 'checkmark-done-outline',
  },
  completed: {
    nextStatus: 'paid',
    label: 'Registrar cobro',
    hint: 'Cobro confirmado.',
    icon: 'cash-outline',
  },
};

export const getStatusMeta = (status?: string | null) => {
  const key = toWorkflowStatus(status);
  return STATUS_META[key];
};

export const getPrimaryProcessAction = (status?: string | null): WorkflowAction | null => {
  const key = toWorkflowStatus(status);
  return PROCESS_ACTIONS[key] || null;
};

export const getSecondaryProcessActions = (status?: string | null): WorkflowAction[] => {
  const key = toWorkflowStatus(status);
  if (key === 'sent') {
    return [
      {
        nextStatus: 'revision_requested',
        label: 'Registrar cambios pedidos',
        hint: 'Cliente solicito ajustes al presupuesto.',
        icon: 'document-text-outline',
      },
      {
        nextStatus: 'cancelled',
        label: 'Cancelar presupuesto',
        hint: 'Cliente rechaza o se cancela el trabajo.',
        icon: 'close-circle-outline',
      },
    ];
  }

  if (['approved', 'scheduled', 'in_progress'].includes(key)) {
    return [
      {
        nextStatus: 'cancelled',
        label: 'Cancelar trabajo',
        hint: 'Cancelar por decision de cliente/tecnico.',
        icon: 'close-circle-outline',
      },
    ];
  }

  return [];
};

export const getManualStatusOptions = (currentStatus?: string | null): QuoteWorkflowStatus[] => {
  const current = toWorkflowStatus(currentStatus);
  return ORDERED_STATUSES.filter((status) => status !== current);
};

export const getWorkflowLabel = (status: QuoteWorkflowStatus) => STATUS_META[status].label;
export const toCanonicalWorkflowStatus = toWorkflowStatus;
