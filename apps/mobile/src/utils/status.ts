const normalizeStatusValue = (status?: string | null) => (status || '').toLowerCase().trim();

const STATUS_ALIASES = {
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
export const isPending = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.pending);
export const isPresented = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.presented);
export const isApproved = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.approved);
export const isPaid = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.paid);
export const isClosed = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.closed);
export const isCancelled = (status?: string | null) => matchesStatus(status, STATUS_ALIASES.cancelled);
