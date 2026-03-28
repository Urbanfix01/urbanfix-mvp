import { getNewsletterPublicBaseUrl } from '@/lib/newsletter';

export type AdminClientRequestRecord = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string | null;
  description: string;
  urgency: string;
  mode: string;
  status: string;
  preferredWindow?: string | null;
  createdAt: string;
  updatedAt: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  targetTechnicianName?: string | null;
  targetTechnicianPhone?: string | null;
  matchesCount?: number;
  submittedQuotesCount?: number;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toText = (value: unknown) => String(value || '').trim();

const normalizeRequestZone = (value: string | null | undefined) =>
  toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatModeLabel = (value: string) => (toText(value).toLowerCase() === 'direct' ? 'Asignación directa' : 'Marketplace');

const formatUrgencyLabel = (value: string) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'alta') return 'Alta';
  if (normalized === 'baja') return 'Baja';
  return 'Media';
};

const formatStatusLabel = (value: string) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'matched') return 'Matcheada';
  if (normalized === 'quoted') return 'Cotizada';
  if (normalized === 'direct_sent') return 'Directa enviada';
  if (normalized === 'selected') return 'Técnico elegido';
  if (normalized === 'scheduled') return 'Agendada';
  if (normalized === 'in_progress') return 'En curso';
  if (normalized === 'completed') return 'Completada';
  if (normalized === 'cancelled') return 'Cancelada';
  return 'Publicada';
};

export const buildAdminClientRequestTicketHref = (request: Pick<AdminClientRequestRecord, 'id'>) =>
  `${getNewsletterPublicBaseUrl()}/solicitudes/${encodeURIComponent(toText(request.id))}`;

export const buildAdminClientRequestZoneHref = (request: AdminClientRequestRecord) => {
  const city = toText(request.city);
  const base = getNewsletterPublicBaseUrl();
  if (!city) return `${base}/vidriera`;
  return `${base}/vidriera?zona=${encodeURIComponent(city)}`;
};

export const buildAdminClientRequestWhatsappText = (request: AdminClientRequestRecord) => {
  const ticketHref = buildAdminClientRequestTicketHref(request);
  const lines = [
    'UrbanFix | Solicitud nueva',
    '',
    `Trabajo: ${request.title}`,
    `Rubro: ${request.category}`,
    `Zona: ${toText(request.city) || 'Sin ciudad'}`,
    `Dirección: ${request.address}`,
    `Urgencia: ${formatUrgencyLabel(request.urgency)}`,
    `Modo: ${formatModeLabel(request.mode)}`,
    `Estado: ${formatStatusLabel(request.status)}`,
  ];

  if (toText(request.preferredWindow)) {
    lines.push(`Franja sugerida: ${toText(request.preferredWindow)}`);
  }

  if (toText(request.targetTechnicianName)) {
    lines.push(`Técnico objetivo: ${toText(request.targetTechnicianName)}`);
  }

  lines.push('', 'Detalle:', request.description, '', `Ver ticket: ${ticketHref}`);

  return lines.join('\n').trim();
};

export const buildAdminClientRequestWhatsappHref = (request: AdminClientRequestRecord) =>
  `https://wa.me/?text=${encodeURIComponent(buildAdminClientRequestWhatsappText(request))}`;

export const buildAdminClientRequestEmailSubject = (request: AdminClientRequestRecord) =>
  `UrbanFix | Solicitud ${request.category} en ${toText(request.city) || 'tu zona'}`;

export const buildAdminClientRequestEmailText = (request: AdminClientRequestRecord) => {
  const ticketHref = buildAdminClientRequestTicketHref(request);
  const lines = [
    buildAdminClientRequestEmailSubject(request),
    '',
    `Trabajo: ${request.title}`,
    `Rubro: ${request.category}`,
    `Urgencia: ${formatUrgencyLabel(request.urgency)}`,
    `Modo: ${formatModeLabel(request.mode)}`,
    `Estado actual: ${formatStatusLabel(request.status)}`,
    `Zona: ${toText(request.city) || 'Sin ciudad'}`,
    `Dirección: ${request.address}`,
  ];

  if (toText(request.preferredWindow)) {
    lines.push(`Franja sugerida: ${toText(request.preferredWindow)}`);
  }

  lines.push('', 'Descripción:', request.description, '');

  if (toText(request.clientName) || toText(request.clientEmail) || toText(request.clientPhone)) {
    lines.push('Datos del cliente:');
    lines.push(`- Nombre: ${toText(request.clientName) || 'Cliente UrbanFix'}`);
    if (toText(request.clientEmail)) lines.push(`- Email: ${toText(request.clientEmail)}`);
    if (toText(request.clientPhone)) lines.push(`- Teléfono: ${toText(request.clientPhone)}`);
    lines.push('');
  }

  if (Number.isFinite(Number(request.matchesCount || 0))) {
    lines.push(`Técnicos matcheados: ${Number(request.matchesCount || 0)}`);
  }
  if (Number.isFinite(Number(request.submittedQuotesCount || 0))) {
    lines.push(`Cotizaciones recibidas: ${Number(request.submittedQuotesCount || 0)}`);
  }

  lines.push('', `Ver ticket del trabajo: ${ticketHref}`, `Explorar técnicos de la zona: ${buildAdminClientRequestZoneHref(request)}`);
  return lines.join('\n').trim();
};

export const buildAdminClientRequestEmailHtml = (request: AdminClientRequestRecord) => {
  const zoneHref = buildAdminClientRequestZoneHref(request);
  const ticketHref = buildAdminClientRequestTicketHref(request);

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(buildAdminClientRequestEmailSubject(request))}</title>
    </head>
    <body style="margin:0;padding:24px;background:#f2f4f7;font-family:Arial,sans-serif;color:#0f172a;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="padding:28px 28px 18px;background:#2a0338;color:#ffffff;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#ffd6a6;">Solicitud UrbanFix</p>
            <h1 style="margin:0;font-size:30px;line-height:1.12;">${escapeHtml(request.title)}</h1>
            <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#f3e9ff;">
              ${escapeHtml(request.category)} | ${escapeHtml(toText(request.city) || 'Sin ciudad')} | ${escapeHtml(formatUrgencyLabel(request.urgency))}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            <div style="margin:0 0 18px;padding:16px 18px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#475569;">Datos de la solicitud</p>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;"><strong>Dirección:</strong> ${escapeHtml(request.address)}</p>
              <p style="margin:0 0 6px;font-size:14px;line-height:1.6;"><strong>Modo:</strong> ${escapeHtml(formatModeLabel(request.mode))}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;"><strong>Estado:</strong> ${escapeHtml(formatStatusLabel(request.status))}</p>
            </div>
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#475569;">Descripcion</p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#0f172a;">${escapeHtml(request.description)}</p>
            ${
              toText(request.clientName) || toText(request.clientEmail) || toText(request.clientPhone)
                ? `<div style="margin:0 0 18px;padding:16px 18px;border-radius:18px;background:#fff7ed;border:1px solid #fed7aa;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#9a3412;">Cliente</p>
                    <p style="margin:0 0 6px;font-size:14px;line-height:1.6;"><strong>Nombre:</strong> ${escapeHtml(toText(request.clientName) || 'Cliente UrbanFix')}</p>
                    ${toText(request.clientEmail) ? `<p style="margin:0 0 6px;font-size:14px;line-height:1.6;"><strong>Email:</strong> ${escapeHtml(toText(request.clientEmail))}</p>` : ''}
                    ${toText(request.clientPhone) ? `<p style="margin:0;font-size:14px;line-height:1.6;"><strong>Teléfono:</strong> ${escapeHtml(toText(request.clientPhone))}</p>` : ''}
                  </div>`
                : ''
            }
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;">
              <tr>
                <td style="border-radius:999px;background:#ff8f1f;">
                  <a href="${escapeHtml(ticketHref)}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#2a0338;text-decoration:none;">
                    Ver ticket del trabajo
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#475569;">
              Zona y cobertura: <a href="${escapeHtml(zoneHref)}" style="color:#7c3aed;text-decoration:underline;">explorar técnicos de la zona</a>.
            </p>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};
