import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import {
  NEWSLETTER_AUDIENCE_LABELS,
  type NewsletterAudience,
  type NewsletterQuickLink,
  buildNewsletterBodyText,
  buildNewsletterHtml,
  buildNewsletterPlainText,
  buildNewsletterUnsubscribeUrl,
  normalizeNewsletterEmail,
  normalizeNewsletterUrl,
  resolveNewsletterAudience,
} from '@/lib/newsletter';

const RESEND_API_URL = 'https://api.resend.com/emails';
const AUTH_USERS_PAGE_SIZE = 200;
const SEND_BATCH_SIZE = 4;
const SEND_BATCH_DELAY_MS = 1100;
const MAX_NEWSLETTER_RECIPIENTS = 500;
const MAX_QUICK_LINKS = 3;

type NewsletterProfileRow = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  access_granted?: boolean | null;
  newsletter_opt_in?: boolean | null;
  newsletter_opt_in_at?: string | null;
  newsletter_unsubscribed_at?: string | null;
};

type NewsletterRecipient = {
  userId: string;
  email: string;
  audienceRole: 'tecnico' | 'cliente' | 'desconocido';
  label: string;
  optedIn: boolean;
  unsubscribedAt: string | null;
};

type NewsletterCampaignRecipientRow = {
  campaign_id: string;
  email: string;
  user_id?: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  error_text?: string | null;
  provider_message_id?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
};

type NewsletterCampaignContentRow = {
  id: string;
  subject: string;
  preview_text?: string | null;
  intro_text?: string | null;
  body_text: string;
  cta_label?: string | null;
  cta_url?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  quick_links?: unknown;
};

type NewsletterRenderContent = {
  subject: string;
  previewText: string;
  introText: string;
  bodyText: string;
  heroImageUrl: string;
  heroImageAlt: string;
  quickLinks: NewsletterQuickLink[];
  ctaLabel: string;
  ctaUrl: string;
};

const isMissingColumnError = (error: any, column: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
};

const isMissingRelationError = (error: any, relation: string) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes(relation.toLowerCase()) &&
    (message.includes('does not exist') || message.includes('relation') || message.includes('could not find'))
  );
};

const chunk = <T,>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitMessage = (value: unknown) => {
  const message = String(value || '').toLowerCase();
  return message.includes('too many requests') || message.includes('rate limit') || message.includes('requests per second');
};

const parseQuickLinks = (value: unknown) => {
  const rawItems = Array.isArray(value) ? value.slice(0, MAX_QUICK_LINKS) : [];
  const quickLinks: NewsletterQuickLink[] = [];

  for (const item of rawItems) {
    const label = String((item as any)?.label || '').trim();
    const rawUrl = String((item as any)?.url || '').trim();

    if (!label && !rawUrl) continue;
    if (!label || !rawUrl) {
      throw new Error('Completa etiqueta y URL en cada enlace directo o deja ambos vacios.');
    }

    const url = normalizeNewsletterUrl(rawUrl);
    if (!url) {
      throw new Error(`URL invalida en enlace directo: ${rawUrl}`);
    }

    quickLinks.push({ label, url });
  }

  return quickLinks;
};

const parseStoredQuickLinks = (value: unknown) => {
  if (Array.isArray(value)) return parseQuickLinks(value);

  if (typeof value === 'string' && value.trim()) {
    try {
      return parseQuickLinks(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
};

const getNewsletterProviderConfig = () => ({
  apiKey: (process.env.RESEND_API_KEY || '').trim(),
  fromEmail: (process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || '').trim(),
  replyTo: (process.env.NEWSLETTER_REPLY_TO_EMAIL || '').trim(),
});

const listAllAuthUsers = async () => {
  if (!supabase) return [];

  const users: any[] = [];
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

const loadNewsletterProfiles = async (userIds: string[]) => {
  if (!supabase || userIds.length === 0) {
    return { map: new Map<string, NewsletterProfileRow>(), columnsReady: false };
  }

  const variants = [
    ['id', 'full_name', 'business_name', 'email', 'access_granted', 'newsletter_opt_in', 'newsletter_opt_in_at', 'newsletter_unsubscribed_at'],
    ['id', 'full_name', 'business_name', 'email', 'access_granted'],
  ];

  for (const columns of variants) {
    const map = new Map<string, NewsletterProfileRow>();
    let failed = false;

    for (const ids of chunk(userIds, 200)) {
      const { data, error } = await supabase.from('profiles').select(columns.join(',')).in('id', ids);
      if (error) {
        const newsletterColumnsMissing =
          isMissingColumnError(error, 'newsletter_opt_in') || isMissingColumnError(error, 'newsletter_unsubscribed_at');
        if (newsletterColumnsMissing && columns.includes('newsletter_opt_in')) {
          failed = true;
          break;
        }
        throw error;
      }
      (data || []).forEach((row: any) => {
        map.set(row.id, row as NewsletterProfileRow);
      });
    }

    if (!failed) {
      return { map, columnsReady: columns.includes('newsletter_opt_in') };
    }
  }

  return { map: new Map<string, NewsletterProfileRow>(), columnsReady: false };
};

const buildNewsletterRecipients = async () => {
  const authUsers = await listAllAuthUsers();
  const userIds = authUsers.map((user) => user.id).filter(Boolean);
  const { map: profilesMap, columnsReady } = await loadNewsletterProfiles(userIds);

  const recipients = new Map<string, NewsletterRecipient>();

  authUsers.forEach((user) => {
    const email = normalizeNewsletterEmail(user.email);
    if (!email) return;

    const profile = profilesMap.get(user.id);
    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const audienceRole = resolveNewsletterAudience(
      typeof metadata.app_audience === 'string' ? metadata.app_audience : null,
      profile?.access_granted
    );
    const label =
      String(profile?.business_name || profile?.full_name || metadata.business_name || metadata.full_name || email).trim() || email;

    recipients.set(email, {
      userId: user.id,
      email,
      audienceRole,
      label,
      optedIn: columnsReady ? profile?.newsletter_opt_in === true && !profile?.newsletter_unsubscribed_at : false,
      unsubscribedAt: profile?.newsletter_unsubscribed_at || null,
    });
  });

  return {
    recipients: Array.from(recipients.values()),
    newsletterColumnsReady: columnsReady,
  };
};

const matchesAudience = (recipient: NewsletterRecipient, audience: NewsletterAudience, newsletterColumnsReady: boolean) => {
  const requiresOptIn = audience.startsWith('opted_in_');
  if (requiresOptIn && (!newsletterColumnsReady || !recipient.optedIn)) return false;

  if (audience.endsWith('_tecnicos')) return recipient.audienceRole === 'tecnico';
  if (audience.endsWith('_clientes')) return recipient.audienceRole === 'cliente';
  return true;
};

const buildAudienceCounts = (recipients: NewsletterRecipient[], newsletterColumnsReady: boolean) => {
  const countBy = (audience: NewsletterAudience) =>
    recipients.filter((recipient) => matchesAudience(recipient, audience, newsletterColumnsReady)).length;

  return {
    base_all: countBy('base_all'),
    base_tecnicos: countBy('base_tecnicos'),
    base_clientes: countBy('base_clientes'),
    opted_in_all: newsletterColumnsReady ? countBy('opted_in_all') : 0,
    opted_in_tecnicos: newsletterColumnsReady ? countBy('opted_in_tecnicos') : 0,
    opted_in_clientes: newsletterColumnsReady ? countBy('opted_in_clientes') : 0,
  } satisfies Record<NewsletterAudience, number>;
};

const loadRecentCampaigns = async () => {
  if (!supabase) return { campaigns: [], tablesReady: false };

  const { data, error } = await supabase
    .from('newsletter_campaigns')
    .select('id,subject,audience,status,total_recipients,sent_count,failed_count,warning_text,sent_at,created_at,created_by_label')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaigns')) {
      return { campaigns: [], tablesReady: false };
    }
    throw error;
  }

  return { campaigns: data || [], tablesReady: true };
};

const loadRecentCampaignRecipients = async (campaignIds: string[]) => {
  if (!supabase || campaignIds.length === 0) return new Map<string, NewsletterCampaignRecipientRow[]>();

  const { data, error } = await supabase
    .from('newsletter_campaign_recipients')
    .select('campaign_id,email,user_id,status,error_text,provider_message_id,sent_at,created_at')
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaign_recipients')) {
      return new Map<string, NewsletterCampaignRecipientRow[]>();
    }
    throw error;
  }

  const grouped = new Map<string, NewsletterCampaignRecipientRow[]>();
  const priority: Record<NewsletterCampaignRecipientRow['status'], number> = {
    failed: 0,
    pending: 1,
    sent: 2,
    skipped: 3,
  };

  for (const row of (data || []) as NewsletterCampaignRecipientRow[]) {
    const current = grouped.get(row.campaign_id) || [];
    current.push(row);
    grouped.set(row.campaign_id, current);
  }

  grouped.forEach((items, campaignId) => {
    items.sort((left, right) => {
      const priorityDelta = priority[left.status] - priority[right.status];
      if (priorityDelta !== 0) return priorityDelta;
      const leftTime = new Date(left.sent_at || left.created_at || 0).getTime();
      const rightTime = new Date(right.sent_at || right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
    grouped.set(campaignId, items);
  });

  return grouped;
};

const loadCampaignContent = async (campaignId: string) => {
  if (!supabase) return { campaign: null as NewsletterCampaignContentRow | null, payloadReady: false };

  const variants = [
    [
      'id',
      'subject',
      'preview_text',
      'intro_text',
      'body_text',
      'cta_label',
      'cta_url',
      'hero_image_url',
      'hero_image_alt',
      'quick_links',
    ],
    ['id', 'subject', 'preview_text', 'intro_text', 'body_text', 'cta_label', 'cta_url'],
  ];

  for (const columns of variants) {
    const { data, error } = await supabase.from('newsletter_campaigns').select(columns.join(',')).eq('id', campaignId).single();

    if (error) {
      const missingPayloadColumns =
        isMissingColumnError(error, 'hero_image_url') ||
        isMissingColumnError(error, 'hero_image_alt') ||
        isMissingColumnError(error, 'quick_links');
      if (missingPayloadColumns && columns.includes('hero_image_url')) {
        continue;
      }
      if (isMissingRelationError(error, 'newsletter_campaigns')) {
        return { campaign: null, payloadReady: false };
      }
      throw error;
    }

    return {
      campaign: (data || null) as unknown as NewsletterCampaignContentRow | null,
      payloadReady: columns.includes('hero_image_url'),
    };
  }

  return { campaign: null, payloadReady: false };
};

const createCampaignRecord = async (payload: Record<string, unknown>) => {
  if (!supabase) return { campaign: null, tablesReady: false };

  const variants = [
    payload,
    Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) => !['hero_image_url', 'hero_image_alt', 'quick_links'].includes(key)
      )
    ),
  ];

  for (const candidate of variants) {
    const { data, error } = await supabase.from('newsletter_campaigns').insert(candidate).select().single();
    if (error) {
      const missingPayloadColumns =
        isMissingColumnError(error, 'hero_image_url') ||
        isMissingColumnError(error, 'hero_image_alt') ||
        isMissingColumnError(error, 'quick_links');
      if (missingPayloadColumns && Object.prototype.hasOwnProperty.call(candidate, 'hero_image_url')) {
        continue;
      }
      if (isMissingRelationError(error, 'newsletter_campaigns')) {
        return { campaign: null, tablesReady: false };
      }
      throw error;
    }

    return { campaign: data, tablesReady: true };
  }

  return { campaign: null, tablesReady: false };
};

const updateCampaignRecord = async (campaignId: string, payload: Record<string, unknown>) => {
  if (!supabase) return false;

  const variants = [
    payload,
    Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) => !['hero_image_url', 'hero_image_alt', 'quick_links'].includes(key)
      )
    ),
  ];

  for (const candidate of variants) {
    const { error } = await supabase.from('newsletter_campaigns').update(candidate).eq('id', campaignId);
    if (error) {
      const missingPayloadColumns =
        isMissingColumnError(error, 'hero_image_url') ||
        isMissingColumnError(error, 'hero_image_alt') ||
        isMissingColumnError(error, 'quick_links');
      if (missingPayloadColumns && Object.prototype.hasOwnProperty.call(candidate, 'hero_image_url')) {
        continue;
      }
      if (isMissingRelationError(error, 'newsletter_campaigns')) return false;
      throw error;
    }

    return true;
  }

  return false;
};

const seedCampaignRecipients = async (campaignId: string, recipients: NewsletterRecipient[]) => {
  if (!supabase || recipients.length === 0) return false;
  const rows = recipients.map((recipient) => ({
    campaign_id: campaignId,
    user_id: recipient.userId || null,
    email: recipient.email,
    audience_role: recipient.audienceRole,
    status: 'pending',
  }));

  const { error } = await supabase.from('newsletter_campaign_recipients').insert(rows);
  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaign_recipients')) return false;
    throw error;
  }
  return true;
};

const updateCampaignRecipients = async (
  campaignId: string,
  results: Array<{ email: string; status: 'sent' | 'failed'; providerMessageId?: string | null; errorText?: string | null }>
) => {
  if (!supabase || results.length === 0) return false;

  for (const result of results) {
    const { error } = await supabase
      .from('newsletter_campaign_recipients')
      .update({
        status: result.status,
        provider_message_id: result.providerMessageId || null,
        error_text: result.errorText || null,
        sent_at: result.status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('campaign_id', campaignId)
      .eq('email', result.email);

    if (error && !isMissingRelationError(error, 'newsletter_campaign_recipients')) {
      throw error;
    }
  }

  return true;
};

const loadCampaignRecipientsByStatus = async (
  campaignId: string,
  status: NewsletterCampaignRecipientRow['status']
) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('newsletter_campaign_recipients')
    .select('campaign_id,email,user_id,status,error_text,provider_message_id,sent_at,created_at')
    .eq('campaign_id', campaignId)
    .eq('status', status)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaign_recipients')) {
      return [];
    }
    throw error;
  }

  return (data || []) as NewsletterCampaignRecipientRow[];
};

const summarizeCampaignRecipientStatuses = async (campaignId: string) => {
  if (!supabase) {
    return {
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      pendingCount: 0,
    };
  }

  const { data, error } = await supabase.from('newsletter_campaign_recipients').select('status').eq('campaign_id', campaignId);

  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaign_recipients')) {
      return {
        totalRecipients: 0,
        sentCount: 0,
        failedCount: 0,
        pendingCount: 0,
      };
    }
    throw error;
  }

  const rows = data || [];
  const sentCount = rows.filter((row: any) => row.status === 'sent').length;
  const failedCount = rows.filter((row: any) => row.status === 'failed').length;
  const pendingCount = rows.filter((row: any) => row.status === 'pending').length;

  return {
    totalRecipients: rows.length,
    sentCount,
    failedCount,
    pendingCount,
  };
};

const sendNewsletterEmail = async (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}) => {
  const provider = getNewsletterProviderConfig();
  if (!provider.apiKey || !provider.fromEmail) {
    throw new Error('Falta configurar RESEND_API_KEY y NEWSLETTER_FROM_EMAIL para enviar newsletters.');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      from: provider.fromEmail,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'No se pudo enviar el correo.');
  }

  return {
    provider: 'resend',
    id: typeof data?.id === 'string' ? data.id : null,
  };
};

const sendNewsletterEmailWithRetry = async (params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}) => {
  try {
    return await sendNewsletterEmail(params);
  } catch (error: any) {
    if (!isRateLimitMessage(error?.message)) {
      throw error;
    }

    await wait(SEND_BATCH_DELAY_MS);
    return await sendNewsletterEmail(params);
  }
};

const buildRenderedNewsletterContent = (content: NewsletterRenderContent, recipient: { email: string; userId?: string | null }) => {
  const paragraphs = buildNewsletterBodyText(content.bodyText);
  const unsubscribeUrl = buildNewsletterUnsubscribeUrl(recipient.email, recipient.userId);

  return {
    html: buildNewsletterHtml({
      title: content.subject,
      previewText: content.previewText,
      intro: content.introText,
      paragraphs,
      heroImageUrl: content.heroImageUrl,
      heroImageAlt: content.heroImageAlt,
      quickLinks: content.quickLinks,
      ctaLabel: content.ctaLabel,
      ctaUrl: content.ctaUrl,
      unsubscribeUrl,
    }),
    text: buildNewsletterPlainText({
      title: content.subject,
      intro: content.introText,
      paragraphs,
      heroImageUrl: content.heroImageUrl,
      quickLinks: content.quickLinks,
      ctaLabel: content.ctaLabel,
      ctaUrl: content.ctaUrl,
      unsubscribeUrl,
    }),
  };
};

const deliverNewsletterRecipients = async (
  recipients: Array<{ email: string; userId?: string | null }>,
  content: NewsletterRenderContent,
  replyTo?: string | null
) => {
  const results: Array<{ email: string; status: 'sent' | 'failed'; providerMessageId?: string | null; errorText?: string | null }> =
    [];

  const recipientBatches = chunk(recipients, SEND_BATCH_SIZE);

  for (const [batchIndex, batch] of recipientBatches.entries()) {
    const batchResults = await Promise.all(
      batch.map(async (recipient) => {
        const rendered = buildRenderedNewsletterContent(content, recipient);

        try {
          const sent = await sendNewsletterEmailWithRetry({
            to: recipient.email,
            subject: content.subject,
            html: rendered.html,
            text: rendered.text,
            replyTo: replyTo || null,
          });
          return {
            email: recipient.email,
            status: 'sent' as const,
            providerMessageId: sent.id,
          };
        } catch (error: any) {
          return {
            email: recipient.email,
            status: 'failed' as const,
            errorText: error?.message || 'No se pudo enviar.',
          };
        }
      })
    );

    results.push(...batchResults);

    if (batchIndex < recipientBatches.length - 1) {
      await wait(SEND_BATCH_DELAY_MS);
    }
  }

  return results;
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [{ recipients, newsletterColumnsReady }, recentCampaignsResult] = await Promise.all([
      buildNewsletterRecipients(),
      loadRecentCampaigns(),
    ]);
    const recentCampaignRecipientMap = recentCampaignsResult.tablesReady
      ? await loadRecentCampaignRecipients(
          (recentCampaignsResult.campaigns || []).map((campaign: any) => campaign.id).filter(Boolean)
        )
      : new Map<string, NewsletterCampaignRecipientRow[]>();

    const provider = getNewsletterProviderConfig();
    const audienceCounts = buildAudienceCounts(recipients, newsletterColumnsReady);

    return NextResponse.json({
      capabilities: {
        resendConfigured: Boolean(provider.apiKey && provider.fromEmail),
        newsletterColumnsReady,
        campaignTablesReady: recentCampaignsResult.tablesReady,
        fromEmail: provider.fromEmail || null,
      },
      audienceCounts,
      audienceLabels: NEWSLETTER_AUDIENCE_LABELS,
      recentCampaigns: (recentCampaignsResult.campaigns || []).map((campaign: any) => ({
        ...campaign,
        recipients: recentCampaignRecipientMap.get(campaign.id) || [],
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo cargar el newsletter.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const mode = body?.mode === 'test' ? 'test' : body?.mode === 'retry_failed' ? 'retry_failed' : 'send';
  const audience = String(body?.audience || 'opted_in_all') as NewsletterAudience;
  const campaignId = String(body?.campaignId || '').trim();
  const subject = String(body?.subject || '').trim();
  const previewText = String(body?.previewText || '').trim();
  const introText = String(body?.introText || '').trim();
  const bodyText = String(body?.bodyText || '').trim();
  const heroImageRawUrl = String(body?.heroImageUrl || '').trim();
  const heroImageAlt = String(body?.heroImageAlt || '').trim();
  const ctaLabel = String(body?.ctaLabel || '').trim();
  const ctaUrl = normalizeNewsletterUrl(body?.ctaUrl);
  const testEmail = normalizeNewsletterEmail(body?.testEmail);

  if (mode !== 'retry_failed' && !Object.prototype.hasOwnProperty.call(NEWSLETTER_AUDIENCE_LABELS, audience)) {
    return NextResponse.json({ error: 'Audience invalida.' }, { status: 400 });
  }

  if (mode !== 'retry_failed' && (subject.length < 4 || bodyText.length < 12)) {
    return NextResponse.json({ error: 'Completa asunto y cuerpo del newsletter.' }, { status: 400 });
  }

  if (mode === 'test' && !testEmail) {
    return NextResponse.json({ error: 'Ingresa un email de prueba valido.' }, { status: 400 });
  }

  const heroImageUrl = heroImageRawUrl ? normalizeNewsletterUrl(heroImageRawUrl) : '';
  if (mode !== 'retry_failed' && heroImageRawUrl && !heroImageUrl) {
    return NextResponse.json({ error: 'La URL de la imagen principal no es valida.' }, { status: 400 });
  }

  if (mode !== 'retry_failed' && ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl))) {
    return NextResponse.json({ error: 'Completa ambos campos del CTA o deja ambos vacios.' }, { status: 400 });
  }

  try {
    const quickLinks = mode === 'retry_failed' ? [] : parseQuickLinks(body?.quickLinks);
    const { recipients, newsletterColumnsReady } = await buildNewsletterRecipients();
    const provider = getNewsletterProviderConfig();

    if (!provider.apiKey || !provider.fromEmail) {
      return NextResponse.json(
        { error: 'Falta configurar RESEND_API_KEY y NEWSLETTER_FROM_EMAIL para enviar newsletters.' },
        { status: 500 }
      );
    }

    if (mode !== 'retry_failed' && audience.startsWith('opted_in_') && !newsletterColumnsReady) {
      return NextResponse.json(
        { error: 'Falta la migracion newsletter_opt_in/newsletter_unsubscribed_at en profiles.' },
        { status: 409 }
      );
    }

    const draftContent: NewsletterRenderContent = {
      subject,
      previewText,
      introText,
      bodyText,
      heroImageUrl,
      heroImageAlt,
      quickLinks,
      ctaLabel,
      ctaUrl,
    };

    if (mode === 'test') {
      const rendered = buildRenderedNewsletterContent(draftContent, { email: testEmail, userId: user.id });
      const result = await sendNewsletterEmail({
        to: testEmail,
        subject,
        html: rendered.html,
        text: rendered.text,
        replyTo: provider.replyTo || null,
      });

      return NextResponse.json({
        ok: true,
        mode,
        message: `Prueba enviada a ${testEmail}.`,
        provider: result.provider,
      });
    }

    if (mode === 'retry_failed') {
      if (!campaignId) {
        return NextResponse.json({ error: 'Falta indicar la campana a reintentar.' }, { status: 400 });
      }

      const { campaign, payloadReady } = await loadCampaignContent(campaignId);
      if (!campaign) {
        return NextResponse.json({ error: 'No se encontro la campana para reintentar.' }, { status: 404 });
      }

      const failedRecipients = await loadCampaignRecipientsByStatus(campaignId, 'failed');
      if (failedRecipients.length === 0) {
        return NextResponse.json({ error: 'Esta campana no tiene destinatarios fallidos para reenviar.' }, { status: 400 });
      }

      const retryContent: NewsletterRenderContent = {
        subject: String(campaign.subject || '').trim(),
        previewText: String(campaign.preview_text || '').trim(),
        introText: String(campaign.intro_text || '').trim(),
        bodyText: String(campaign.body_text || '').trim(),
        heroImageUrl: payloadReady ? normalizeNewsletterUrl(campaign.hero_image_url) : '',
        heroImageAlt: payloadReady ? String(campaign.hero_image_alt || '').trim() : '',
        quickLinks: payloadReady ? parseStoredQuickLinks(campaign.quick_links) : [],
        ctaLabel: String(campaign.cta_label || '').trim(),
        ctaUrl: normalizeNewsletterUrl(campaign.cta_url),
      };

      const retryWarnings: string[] = [];
      if (!payloadReady) {
        retryWarnings.push(
          'La campana fue creada sin payload enriquecido; el reenvio conserva texto y CTA, pero puede omitir imagen y enlaces directos.'
        );
      }

      const retryResults = await deliverNewsletterRecipients(
        failedRecipients.map((recipient) => ({
          email: recipient.email,
          userId: recipient.user_id || null,
        })),
        retryContent,
        provider.replyTo || null
      );

      await updateCampaignRecipients(campaignId, retryResults);

      const summary = await summarizeCampaignRecipientStatuses(campaignId);
      const retrySentCount = retryResults.filter((result) => result.status === 'sent').length;
      const retryFailedCount = retryResults.filter((result) => result.status === 'failed').length;
      const retryLimited = retryResults.some(
        (result) => result.status === 'failed' && isRateLimitMessage(result.errorText)
      );

      if (retryLimited) {
        retryWarnings.push('Parte del reenvio volvio a quedar limitada por Resend.');
      }

      await updateCampaignRecord(campaignId, {
        status: summary.failedCount > 0 ? 'failed' : 'sent',
        sent_count: summary.sentCount,
        failed_count: summary.failedCount,
        warning_text: retryWarnings.join(' ') || null,
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        mode,
        message: `Reenvio completado. ${retrySentCount} recuperados, ${retryFailedCount} siguieron fallando.`,
        sentCount: retrySentCount,
        failedCount: retryFailedCount,
        remainingFailedCount: summary.failedCount,
        totalRecipients: failedRecipients.length,
        warnings: retryWarnings,
      });
    }

    const campaignRecipients = recipients.filter((recipient) => matchesAudience(recipient, audience, newsletterColumnsReady));
    if (campaignRecipients.length === 0) {
      return NextResponse.json({ error: 'No hay destinatarios para ese segmento.' }, { status: 400 });
    }

    if (campaignRecipients.length > MAX_NEWSLETTER_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `La audiencia excede el limite operativo de ${MAX_NEWSLETTER_RECIPIENTS} destinatarios. Segmenta el envio en tandas.`,
        },
        { status: 400 }
      );
    }

    const warningMessages: string[] = [];
    const { campaign, tablesReady } = await createCampaignRecord({
      created_by: user.id,
      created_by_label: user.email || user.id,
      subject,
      preview_text: previewText || null,
      intro_text: introText || null,
      body_text: bodyText,
      body_html: '',
      cta_label: ctaLabel || null,
      cta_url: ctaUrl || null,
      hero_image_url: heroImageUrl || null,
      hero_image_alt: heroImageAlt || null,
      quick_links: quickLinks,
      audience,
      status: 'sending',
      from_email: provider.fromEmail,
      provider: 'resend',
      total_recipients: campaignRecipients.length,
      sent_count: 0,
      failed_count: 0,
    });

    if (!tablesReady) {
      warningMessages.push('La migracion de historial de campanas todavia no esta aplicada; el envio no quedara persistido.');
    } else if (campaign?.id) {
      await seedCampaignRecipients(campaign.id, campaignRecipients);
    }

    const results = await deliverNewsletterRecipients(
      campaignRecipients.map((recipient) => ({
        email: recipient.email,
        userId: recipient.userId,
      })),
      draftContent,
      provider.replyTo || null
    );

    const sentCount = results.filter((result) => result.status === 'sent').length;
    const failedCount = results.length - sentCount;
    const failedByRateLimit = results.some(
      (result) => result.status === 'failed' && isRateLimitMessage(result.errorText)
    );

    if (failedByRateLimit) {
      warningMessages.push('Parte del envio quedo limitada por Resend. Revisa el detalle de fallidos en el historial.');
    }

    if (tablesReady && campaign?.id) {
      await updateCampaignRecipients(campaign.id, results);
      await updateCampaignRecord(campaign.id, {
        status: failedCount === 0 ? 'sent' : 'failed',
        sent_count: sentCount,
        failed_count: failedCount,
        body_html: buildRenderedNewsletterContent(draftContent, {
          email: campaignRecipients[0].email,
          userId: campaignRecipients[0].userId,
        }).html,
        hero_image_url: heroImageUrl || null,
        hero_image_alt: heroImageAlt || null,
        quick_links: quickLinks,
        warning_text: warningMessages.join(' ') || null,
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      mode,
      message: `Newsletter enviado. ${sentCount} enviados, ${failedCount} fallidos.`,
      sentCount,
      failedCount,
      totalRecipients: campaignRecipients.length,
      warnings: warningMessages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo enviar el newsletter.' }, { status: 500 });
  }
}
