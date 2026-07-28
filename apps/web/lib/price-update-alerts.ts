import type { IndecLaborIndex } from '@/lib/indec-labor-index';
import {
  buildNewsletterHtml,
  buildNewsletterPlainText,
  buildNewsletterUnsubscribeUrl,
  normalizeNewsletterEmail,
} from '@/lib/newsletter';

const RESEND_API_URL = 'https://api.resend.com/emails';
const AUTH_USERS_PAGE_SIZE = 200;
const NOTIFICATION_BATCH_SIZE = 500;
const SEND_BATCH_SIZE = 4;
const SEND_BATCH_DELAY_MS = 1100;
const DEFAULT_EMAIL_LIMIT = 500;

type PriceAlertSupabaseClient = {
  auth: {
    admin: {
      listUsers: (params: { page: number; perPage: number }) => Promise<{
        data?: { users?: AuthUserRow[] };
        error?: any;
      }>;
    };
  };
  from: (table: string) => any;
};

type AuthUserRow = {
  id?: string | null;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  access_granted?: boolean | null;
  profile_published?: boolean | null;
  specialties?: string | null;
  service_city?: string | null;
  company_address?: string | null;
  newsletter_unsubscribed_at?: string | null;
};

export type PriceUpdateAlertResult = {
  notificationCount: number;
  notificationError: string | null;
  emailConfigured: boolean;
  emailRecipientCount: number;
  emailSentCount: number;
  emailFailedCount: number;
  emailSkippedCount: number;
  emailError: string | null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const toErrorMessage = (error: any) => String(error?.message || error || 'Error desconocido.');

const isMissingColumnError = (error: any, column?: string) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42703' || (column ? message.includes(column.toLowerCase()) : message.includes('column'));
};

const isMissingRelationError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('relation');
};

const getProviderConfig = () => ({
  apiKey: (process.env.RESEND_API_KEY || '').trim(),
  fromEmail: (process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || '').trim(),
  replyTo: (process.env.NEWSLETTER_REPLY_TO_EMAIL || '').trim(),
});

const getEmailLimit = () => {
  const parsed = Number(process.env.PRICE_UPDATE_EMAIL_MAX_RECIPIENTS || DEFAULT_EMAIL_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_EMAIL_LIMIT;
};

const listAllAuthUsers = async (supabase: PriceAlertSupabaseClient) => {
  const users: AuthUserRow[] = [];
  let page = 1;

  while (page < 100) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: AUTH_USERS_PAGE_SIZE });
    if (result.error) throw result.error;
    const batch = result.data?.users || [];
    users.push(...batch);
    if (batch.length < AUTH_USERS_PAGE_SIZE) break;
    page += 1;
  }

  return users;
};

const loadProfiles = async (supabase: PriceAlertSupabaseClient, userIds: string[]) => {
  const map = new Map<string, ProfileRow>();
  if (!userIds.length) return map;

  const variants = [
    [
      'id',
      'full_name',
      'business_name',
      'email',
      'access_granted',
      'profile_published',
      'specialties',
      'service_city',
      'company_address',
      'newsletter_unsubscribed_at',
    ],
    ['id', 'full_name', 'business_name', 'email', 'access_granted', 'profile_published', 'specialties', 'service_city', 'company_address'],
    ['id', 'full_name', 'business_name', 'email', 'access_granted'],
    ['id', 'full_name', 'business_name', 'email'],
  ];

  for (const columns of variants) {
    map.clear();
    let retryWithoutNewsletterColumn = false;

    for (const ids of chunk(userIds, 200)) {
      const { data, error } = await supabase.from('profiles').select(columns.join(',')).in('id', ids);
      if (error) {
        if (
          (columns.includes('newsletter_unsubscribed_at') && isMissingColumnError(error, 'newsletter_unsubscribed_at')) ||
          (columns.includes('access_granted') && isMissingColumnError(error, 'access_granted'))
        ) {
          retryWithoutNewsletterColumn = true;
          break;
        }
        if (isMissingRelationError(error)) return new Map<string, ProfileRow>();
        throw error;
      }

      (data || []).forEach((row: ProfileRow) => {
        map.set(row.id, row);
      });
    }

    if (!retryWithoutNewsletterColumn) return new Map(map);
  }

  return new Map<string, ProfileRow>();
};

const formatPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${Number(value || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

const buildAlertCopy = (params: { index: IndecLaborIndex; updatedCount: number }) => {
  const percent = formatPercent(params.index.monthlyPercent);
  const period = params.index.periodLabel;
  const subject = `UrbanFix actualizo precios de mano de obra - ${period}`;
  const title = 'Precios UrbanFix actualizados';
  const body = `Ya esta disponible la nueva referencia de mano de obra ${period}: ${percent} segun INDEC. Se actualizaron ${params.updatedCount} items.`;

  return { subject, title, body, period, percent };
};

const toText = (value: unknown) => String(value || '').trim();

const isTechnicianUser = (user: AuthUserRow, profile?: ProfileRow) => {
  const metadata = user.user_metadata || {};
  const metadataValues = [metadata.app_audience, metadata.profile, metadata.user_type, metadata.account_type]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  if (metadataValues.some((value) => value === 'cliente' || value === 'client')) return false;
  if (metadataValues.some((value) => value === 'tecnico' || value === 'technician' || value === 'empresa' || value === 'company')) {
    return true;
  }

  return (
    profile?.access_granted === true ||
    profile?.profile_published === true ||
    Boolean(toText(profile?.specialties)) ||
    Boolean(toText(profile?.service_city)) ||
    Boolean(toText(profile?.company_address)) ||
    Boolean(toText(profile?.business_name))
  );
};

const buildPriceUpdateEmail = (params: {
  index: IndecLaborIndex;
  updatedCount: number;
  failedCount: number;
  recipientEmail: string;
  userId?: string | null;
}) => {
  const copy = buildAlertCopy({ index: params.index, updatedCount: params.updatedCount });
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_WEB_URL ||
    'https://www.urbanfix.com.ar'
  ).replace(/\/+$/, '');
  const ctaUrl = `${baseUrl}/tecnicos?tab=precios`;
  const unsubscribeUrl = buildNewsletterUnsubscribeUrl(params.recipientEmail, params.userId);
  const paragraphs = [
    `Actualizamos la base de precios de mano de obra de UrbanFix con la referencia INDEC ${copy.period}.`,
    `Variacion mensual aplicada: ${copy.percent}. Items actualizados: ${params.updatedCount}.`,
    params.failedCount
      ? `Algunos items quedaron pendientes de revisar: ${params.failedCount}.`
      : 'La actualizacion quedo aplicada sobre los items activos con precio.',
  ];

  return {
    subject: copy.subject,
    html: buildNewsletterHtml({
      title: copy.title,
      previewText: copy.body,
      intro: 'Base de precios actualizada',
      paragraphs,
      quickLinks: [{ label: 'Ver valores de mano de obra', url: ctaUrl }],
      ctaLabel: 'Ver precios',
      ctaUrl,
      unsubscribeUrl,
    }),
    text: buildNewsletterPlainText({
      title: copy.title,
      intro: 'Base de precios actualizada',
      paragraphs,
      quickLinks: [{ label: 'Ver valores de mano de obra', url: ctaUrl }],
      ctaLabel: 'Ver precios',
      ctaUrl,
      unsubscribeUrl,
    }),
  };
};

const sendPriceUpdateEmail = async (params: {
  to: string;
  userId?: string | null;
  index: IndecLaborIndex;
  updatedCount: number;
  failedCount: number;
}) => {
  const provider = getProviderConfig();
  if (!provider.apiKey || !provider.fromEmail) {
    throw new Error('Servicio de email no configurado.');
  }

  const content = buildPriceUpdateEmail({
    index: params.index,
    updatedCount: params.updatedCount,
    failedCount: params.failedCount,
    recipientEmail: params.to,
    userId: params.userId,
  });

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      from: provider.fromEmail,
      to: [params.to],
      subject: content.subject,
      html: content.html,
      text: content.text,
      ...(provider.replyTo ? { reply_to: provider.replyTo } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'No se pudo enviar el correo.');
  }
};

export const notifyLaborPriceUpdate = async (params: {
  supabase: PriceAlertSupabaseClient;
  index: IndecLaborIndex;
  updateId: string | null;
  updatedCount: number;
  failedCount: number;
}): Promise<PriceUpdateAlertResult> => {
  const result: PriceUpdateAlertResult = {
    notificationCount: 0,
    notificationError: null,
    emailConfigured: Boolean(getProviderConfig().apiKey && getProviderConfig().fromEmail),
    emailRecipientCount: 0,
    emailSentCount: 0,
    emailFailedCount: 0,
    emailSkippedCount: 0,
    emailError: null,
  };

  const authUsers = await listAllAuthUsers(params.supabase);
  const userIds = authUsers.map((user) => String(user.id || '')).filter(Boolean);
  const profiles = await loadProfiles(params.supabase, userIds);
  const technicianUsers = authUsers.filter((user) => {
    const userId = String(user.id || '').trim();
    return Boolean(userId && isTechnicianUser(user, profiles.get(userId)));
  });
  const copy = buildAlertCopy({ index: params.index, updatedCount: params.updatedCount });
  const href = '/tecnicos?tab=precios';

  const notificationRows = technicianUsers
    .map((user) => String(user.id || '').trim())
    .filter(Boolean)
    .map((userId) => ({
      user_id: userId,
      type: 'price_update',
      title: copy.title,
      body: copy.body,
      data: {
        href,
        update_id: params.updateId,
        source: 'INDEC',
        source_series: 'icc_mano_obra',
        period_label: params.index.periodLabel,
        previous_period_label: params.index.previousPeriodLabel,
        monthly_percent: params.index.monthlyPercent,
        updated_count: params.updatedCount,
        failed_count: params.failedCount,
      },
    }));

  try {
    for (const rows of chunk(notificationRows, NOTIFICATION_BATCH_SIZE)) {
      const { error } = await params.supabase.from('notifications').insert(rows);
      if (error) throw error;
      result.notificationCount += rows.length;
    }
  } catch (error: any) {
    result.notificationError = toErrorMessage(error);
  }

  const uniqueEmailRecipients = new Map<string, { email: string; userId?: string | null }>();
  technicianUsers.forEach((user) => {
    const userId = String(user.id || '').trim();
    const profile = profiles.get(userId);
    if (profile?.newsletter_unsubscribed_at) return;

    const email = normalizeNewsletterEmail(profile?.email) || normalizeNewsletterEmail(user.email);
    if (!email || uniqueEmailRecipients.has(email)) return;
    uniqueEmailRecipients.set(email, { email, userId: userId || null });
  });

  const allEmailRecipients = Array.from(uniqueEmailRecipients.values());
  const emailLimit = getEmailLimit();
  const emailRecipients = allEmailRecipients.slice(0, emailLimit);
  result.emailRecipientCount = emailRecipients.length;
  result.emailSkippedCount = Math.max(0, allEmailRecipients.length - emailRecipients.length);

  if (!result.emailConfigured || !emailRecipients.length) return result;

  for (const batch of chunk(emailRecipients, SEND_BATCH_SIZE)) {
    await Promise.all(
      batch.map(async (recipient) => {
        try {
          await sendPriceUpdateEmail({
            to: recipient.email,
            userId: recipient.userId,
            index: params.index,
            updatedCount: params.updatedCount,
            failedCount: params.failedCount,
          });
          result.emailSentCount += 1;
        } catch (error: any) {
          result.emailFailedCount += 1;
          result.emailError = result.emailError || toErrorMessage(error);
        }
      })
    );

    if (batch.length === SEND_BATCH_SIZE) {
      await wait(SEND_BATCH_DELAY_MS);
    }
  }

  return result;
};
