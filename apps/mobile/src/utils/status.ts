const normalizeStatusValue = (status?: string | null) => (status || '').toLowerCase().trim();

const STATUS_ALIASES = {
  draft: ['draft', 'borrador'],
  pending: ['pending', 'draft', 'pendiente', 'presented', 'sent'],
  presented: ['presented', 'sent'],
  approved: ['approved', 'aprobado', 'accepted'],
  paid: ['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'],
  closed: ['completed', 'completado', 'finalizado', 'finalizados', 'paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged'],
  cancelled: ['cancelled', 'canceled', 'cancelado', 'rechazado', 'rejected'],
};

const matchesStatus = (status: string | null | undefined, list: string[]) =>
  list.includes(normalizeStatusValue(status));

export const normalizeStatus = (status?: string | null) => normalizeStatusValue(status);
export const isDraft = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.draft);
export const isPending = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.pending);
export const isPresented = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.presented);
export const isApproved = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.approved);
export const isPaid = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.paid);
export const isClosed = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.closed);
export const isCancelled = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.cancelled);

export type QuoteStatusUiKey =
  | 'draft'
  | 'presented'
  | 'pending'
  | 'approved'
  | 'completed'
  | 'paid'
  | 'cancelled'
  | 'unknown';

export const getStatusUiKey = (status?: string | null): QuoteStatusUiKey => {
  const normalized = normalizeStatusValue(status);
  if (!normalized) return 'unknown';
  if (isPaid(normalized)) return 'paid';
  if (isClosed(normalized)) return 'completed';
  if (isApproved(normalized)) return 'approved';
  if (isPresented(normalized)) return 'presented';
  if (isDraft(normalized)) return 'draft';
  if (normalized === 'pending' || normalized === 'pendiente') return 'pending';
  if (isCancelled(normalized)) return 'cancelled';
  if (isPending(normalized)) return 'pending';
  return 'unknown';
};

export const getStatusLabelEs = (status?: string | null) => {
  const normalized = normalizeStatusValue(status);
  switch (getStatusUiKey(status)) {
    case 'draft':
      return 'BORRADOR';
    case 'presented':
      return 'PRESENTADO';
    case 'pending':
      return 'PENDIENTE';
    case 'approved':
      return 'APROBADO';
    case 'completed':
      return 'FINALIZADO';
    case 'paid':
      return 'COBRADO';
    case 'cancelled':
      return normalized === 'rejected' || normalized === 'rechazado' ? 'RECHAZADO' : 'CANCELADO';
    default:
      return normalized ? normalized.replace(/_/g, ' ').toUpperCase() : 'SIN ESTADO';
  }
};
