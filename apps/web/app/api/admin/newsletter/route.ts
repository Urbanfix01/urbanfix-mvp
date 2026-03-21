import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import {
  NEWSLETTER_AUDIENCE_LABELS,
  type NewsletterAudience,
  type NewsletterQuickLink,
  buildNewsletterHtml,
  buildNewsletterPlainText,
  buildNewsletterBodyText,
  buildNewsletterUnsubscribeUrl,
  normalizeNewsletterEmail,
  normalizeNewsletterUrl,
  resolveNewsletterAudience,
} from '@/lib/newsletter';

const RESEND_API_URL = 'https://api.resend.com/emails';
const AUTH_USERS_PAGE_SIZE = 200;
const SEND_BATCH_SIZE = 20;
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

const createCampaignRecord = async (payload: Record<string, unknown>) => {
  if (!supabase) return { campaign: null, tablesReady: false };

  const { data, error } = await supabase.from('newsletter_campaigns').insert(payload).select().single();
  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaigns')) {
      return { campaign: null, tablesReady: false };
    }
    throw error;
  }

  return { campaign: data, tablesReady: true };
};

const updateCampaignRecord = async (campaignId: string, payload: Record<string, unknown>) => {
  if (!supabase) return false;
  const { error } = await supabase.from('newsletter_campaigns').update(payload).eq('id', campaignId);
  if (error) {
    if (isMissingRelationError(error, 'newsletter_campaigns')) return false;
    throw error;
  }
  return true;
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
      'Content-Type': 'application/json',
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
      recentCampaigns: recentCampaignsResult.campaigns,
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

  const mode = body?.mode === 'test' ? 'test' : 'send';
  const audience = String(body?.audience || 'opted_in_all') as NewsletterAudience;
  const subject = String(body?.subject || '').trim();
  const previewText = String(body?.previewText || '').trim();
  const introText = String(body?.introText || '').trim();
  const bodyText = String(body?.bodyText || '').trim();
  const heroImageRawUrl = String(body?.heroImageUrl || '').trim();
  const heroImageAlt = String(body?.heroImageAlt || '').trim();
  const ctaLabel = String(body?.ctaLabel || '').trim();
  const ctaUrl = normalizeNewsletterUrl(body?.ctaUrl);
  const testEmail = normalizeNewsletterEmail(body?.testEmail);

  if (!Object.prototype.hasOwnProperty.call(NEWSLETTER_AUDIENCE_LABELS, audience)) {
    return NextResponse.json({ error: 'Audience invalida.' }, { status: 400 });
  }

  if (subject.length < 4 || bodyText.length < 12) {
    return NextResponse.json({ error: 'Completa asunto y cuerpo del newsletter.' }, { status: 400 });
  }

  if (mode === 'test' && !testEmail) {
    return NextResponse.json({ error: 'Ingresa un email de prueba valido.' }, { status: 400 });
  }

  const heroImageUrl = heroImageRawUrl ? normalizeNewsletterUrl(heroImageRawUrl) : '';
  if (heroImageRawUrl && !heroImageUrl) {
    return NextResponse.json({ error: 'La URL de la imagen principal no es valida.' }, { status: 400 });
  }

  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    return NextResponse.json({ error: 'Completa ambos campos del CTA o deja ambos vacios.' }, { status: 400 });
  }

  try {
    const quickLinks = parseQuickLinks(body?.quickLinks);
    const { recipients, newsletterColumnsReady } = await buildNewsletterRecipients();
    const provider = getNewsletterProviderConfig();

    if (!provider.apiKey || !provider.fromEmail) {
      return NextResponse.json(
        { error: 'Falta configurar RESEND_API_KEY y NEWSLETTER_FROM_EMAIL para enviar newsletters.' },
        { status: 500 }
      );
    }

    if (audience.startsWith('opted_in_') && !newsletterColumnsReady) {
      return NextResponse.json(
        { error: 'Falta la migracion newsletter_opt_in/newsletter_unsubscribed_at en profiles.' },
        { status: 409 }
      );
    }

    const paragraphs = buildNewsletterBodyText(bodyText);

    if (mode === 'test') {
      const unsubscribeUrl = buildNewsletterUnsubscribeUrl(testEmail, user.id);
      const html = buildNewsletterHtml({
        title: subject,
        previewText,
        intro: introText,
        paragraphs,
        heroImageUrl,
        heroImageAlt,
        quickLinks,
        ctaLabel,
        ctaUrl,
        unsubscribeUrl,
      });
      const text = buildNewsletterPlainText({
        title: subject,
        intro: introText,
        paragraphs,
        heroImageUrl,
        quickLinks,
        ctaLabel,
        ctaUrl,
        unsubscribeUrl,
      });
      const result = await sendNewsletterEmail({
        to: testEmail,
        subject,
        html,
        text,
        replyTo: provider.replyTo || null,
      });

      return NextResponse.json({
        ok: true,
        mode,
        message: `Prueba enviada a ${testEmail}.`,
        provider: result.provider,
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
      audience,
      status: 'sending',
      from_email: provider.fromEmail,
      provider: 'resend',
      total_recipients: campaignRecipients.length,
      sent_count: 0,
      failed_count: 0,
    });

    if (!tablesReady) {
      warningMessages.push('La migracion de historial de campañas todavia no esta aplicada; el envio no quedara persistido.');
    } else if (campaign?.id) {
      await seedCampaignRecipients(campaign.id, campaignRecipients);
    }

    const results: Array<{ email: string; status: 'sent' | 'failed'; providerMessageId?: string | null; errorText?: string | null }> = [];

    for (const batch of chunk(campaignRecipients, SEND_BATCH_SIZE)) {
      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const unsubscribeUrl = buildNewsletterUnsubscribeUrl(recipient.email, recipient.userId);
          const html = buildNewsletterHtml({
            title: subject,
            previewText,
            intro: introText,
            paragraphs,
            heroImageUrl,
            heroImageAlt,
            quickLinks,
            ctaLabel,
            ctaUrl,
            unsubscribeUrl,
          });
          const text = buildNewsletterPlainText({
            title: subject,
            intro: introText,
            paragraphs,
            heroImageUrl,
            quickLinks,
            ctaLabel,
            ctaUrl,
            unsubscribeUrl,
          });

          try {
            const sent = await sendNewsletterEmail({
              to: recipient.email,
              subject,
              html,
              text,
              replyTo: provider.replyTo || null,
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
    }

    const sentCount = results.filter((result) => result.status === 'sent').length;
    const failedCount = results.length - sentCount;

    if (tablesReady && campaign?.id) {
      await updateCampaignRecipients(campaign.id, results);
      await updateCampaignRecord(campaign.id, {
        status: failedCount === results.length ? 'failed' : 'sent',
        sent_count: sentCount,
        failed_count: failedCount,
        body_html: buildNewsletterHtml({
          title: subject,
          previewText,
          intro: introText,
          paragraphs,
          heroImageUrl,
          heroImageAlt,
          quickLinks,
          ctaLabel,
          ctaUrl,
          unsubscribeUrl: buildNewsletterUnsubscribeUrl(campaignRecipients[0].email, campaignRecipients[0].userId),
        }),
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
