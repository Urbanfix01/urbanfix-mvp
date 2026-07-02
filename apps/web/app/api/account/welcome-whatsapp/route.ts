import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

type AccountAudience = 'cliente' | 'tecnico' | 'empresa';

type ProfileRow = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  service_city?: string | null;
  service_province?: string | null;
  company_address?: string | null;
  address?: string | null;
};

const WELCOME_NOTIFICATION_TYPE = 'account_welcome_whatsapp_sent';
const WHATSAPP_API_BASE = 'https://graph.facebook.com';
const RECENT_ACCOUNT_WINDOW_MS = 48 * 60 * 60 * 1000;
const DEFAULT_PUBLIC_BASE_URL = 'https://www.urbanfix.com.ar';
const DEFAULT_WHATSAPP_COMMUNITY_URL = 'https://whatsapp.com/channel/0029VbCFl1TKQuJGScUp4b0J';

const normalizeText = (value: unknown) => String(value || '').trim();

const getMetadataText = (metadata: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = normalizeText(metadata[key]);
    if (value) return value;
  }
  return '';
};

const normalizeRole = (value: unknown): AccountAudience | '' => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'cliente' || normalized === 'client') return 'cliente';
  if (normalized === 'tecnico' || normalized === 'technician') return 'tecnico';
  if (normalized === 'empresa' || normalized === 'company' || normalized === 'business') return 'empresa';
  return '';
};

const normalizeWhatsappPhone = (phone: unknown) => {
  const raw = normalizeText(phone);
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('549')) return digits;
  if (digits.startsWith('54')) {
    const withoutCountry = digits.slice(2);
    return withoutCountry.startsWith('9') ? digits : `549${withoutCountry}`;
  }
  if (digits.startsWith('15') && digits.length >= 10) {
    return `549${digits.slice(2)}`;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `549${digits}`;
  }
  return digits;
};

const getPublicBaseUrl = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.PUBLIC_WEB_URL,
  ];

  return (normalizeText(candidates.find((value) => normalizeText(value))) || DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, '');
};

const getWhatsappCommunityUrl = () =>
  normalizeText(
    process.env.WHATSAPP_COMMUNITY_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL ||
      DEFAULT_WHATSAPP_COMMUNITY_URL
  );

const isRecentAccount = (createdAt: unknown) => {
  const createdTime = new Date(normalizeText(createdAt)).getTime();
  if (!Number.isFinite(createdTime)) return true;
  return Date.now() - createdTime <= RECENT_ACCOUNT_WINDOW_MS;
};

const resolveAudience = (
  profile: ProfileRow | null,
  metadata: Record<string, unknown>,
  requestedAudience: unknown
): AccountAudience => {
  const requested = normalizeRole(requestedAudience);
  if (requested) return requested;

  const explicit = normalizeRole(metadata.user_type) || normalizeRole(metadata.profile) || normalizeRole(metadata.app_audience);
  if (explicit) return explicit;

  if (normalizeText(profile?.business_name) || normalizeText(profile?.service_city) || normalizeText(profile?.company_address)) {
    return 'tecnico';
  }

  return 'cliente';
};

const getAudienceLabel = (audience: AccountAudience) => {
  if (audience === 'empresa') return 'empresa';
  if (audience === 'tecnico') return 'tecnico';
  return 'cliente';
};

const getPanelUrl = (audience: AccountAudience) => {
  const publicBase = getPublicBaseUrl();
  if (audience === 'cliente') return `${publicBase}/cliente`;
  if (audience === 'empresa') return `${publicBase}/tecnicos?perfil=empresa&mode=login`;
  return `${publicBase}/tecnicos?perfil=tecnico&mode=login`;
};

const getCommunityWebUrl = () => `${getPublicBaseUrl()}/comunidad`;

const buildWelcomePayload = ({
  user,
  profile,
  audience,
}: {
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
  profile: ProfileRow | null;
  audience: AccountAudience;
}) => {
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const displayName =
    normalizeText(profile?.full_name) ||
    normalizeText(profile?.business_name) ||
    getMetadataText(metadata, ['full_name', 'name', 'business_name']) ||
    normalizeText(user.email).split('@')[0] ||
    'UrbanFix';
  const phone = normalizeText(profile?.phone) || getMetadataText(metadata, ['phone', 'whatsapp', 'whatsapp_phone']);

  return {
    type: 'account_welcome',
    user_id: user.id,
    audience,
    audience_label: getAudienceLabel(audience),
    full_name: displayName,
    business_name: normalizeText(profile?.business_name) || getMetadataText(metadata, ['business_name']),
    email: normalizeText(profile?.email) || normalizeText(user.email),
    phone,
    whatsapp_phone: normalizeWhatsappPhone(phone),
    city: normalizeText(profile?.city) || normalizeText(profile?.service_city),
    province: normalizeText(profile?.service_province),
    panel_url: getPanelUrl(audience),
    profile_url: getPanelUrl(audience),
    whatsapp_community_url: getWhatsappCommunityUrl(),
    web_community_url: getCommunityWebUrl(),
  };
};

const buildWelcomeMessage = (payload: ReturnType<typeof buildWelcomePayload>) =>
  [
    `Hola ${payload.full_name || 'UrbanFix'}, tu cuenta de UrbanFix ya esta creada.`,
    `Termina de crear tu perfil de ${payload.audience_label}: ${payload.profile_url}`,
    `Comunidad de WhatsApp: ${payload.whatsapp_community_url}`,
    `Comunidad web: ${payload.web_community_url}`,
  ].join('\n');

const sendWelcomeWebhook = async (payload: ReturnType<typeof buildWelcomePayload>) => {
  const url = normalizeText(process.env.USER_WELCOME_WEBHOOK_URL || process.env.WHATSAPP_WELCOME_WEBHOOK_URL);
  if (!url) return { configured: false, sent: false, channel: 'webhook' as const };

  const secret = normalizeText(process.env.USER_WELCOME_WEBHOOK_SECRET || process.env.NOTIFY_WEBHOOK_SECRET);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-hook-secret': secret } : {}),
    },
    body: JSON.stringify({ ...payload, message: buildWelcomeMessage(payload) }),
  });

  if (!response.ok) {
    return { configured: true, sent: false, channel: 'webhook' as const };
  }

  return { configured: true, sent: true, channel: 'webhook' as const };
};

const sendWhatsAppWelcomeTemplate = async (payload: ReturnType<typeof buildWelcomePayload>) => {
  const accessToken = normalizeText(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = normalizeText(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const templateName = normalizeText(process.env.WHATSAPP_WELCOME_TEMPLATE_NAME);
  const language = normalizeText(process.env.WHATSAPP_WELCOME_TEMPLATE_LANGUAGE) || 'es_AR';
  const graphVersion = normalizeText(process.env.WHATSAPP_GRAPH_VERSION) || 'v21.0';

  if (!accessToken || !phoneNumberId || !templateName) {
    return { configured: false, sent: false, channel: 'whatsapp' as const };
  }

  if (!payload.whatsapp_phone) {
    return { configured: true, sent: false, channel: 'whatsapp' as const };
  }

  const usesSampleTemplate = templateName.toLowerCase() === 'hello_world';
  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: language },
  };

  if (!usesSampleTemplate) {
    template.components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: payload.full_name || 'UrbanFix' },
          { type: 'text', text: payload.audience_label },
          { type: 'text', text: payload.profile_url },
          { type: 'text', text: payload.whatsapp_community_url },
          { type: 'text', text: payload.web_community_url },
        ],
      },
    ];
  }

  const response = await fetch(`${WHATSAPP_API_BASE}/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: payload.whatsapp_phone,
      type: 'template',
      template,
    }),
  });

  if (!response.ok) {
    return { configured: true, sent: false, channel: 'whatsapp' as const };
  }

  return { configured: true, sent: true, channel: 'whatsapp' as const };
};

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const rateLimit = enforceRateLimit(request, {
    keyPrefix: 'account-welcome-whatsapp',
    max: 6,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status, headers: rateLimit.headers });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: rateLimit.headers });
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 2 * 1024, allowEmpty: true });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status, headers: rateLimit.headers });
  }
  const body = bodyResult.body && typeof bodyResult.body === 'object' ? (bodyResult.body as Record<string, unknown>) : {};

  if (!isRecentAccount(user.created_at)) {
    return NextResponse.json({ ok: true, sent: false, skipped: 'old_account' }, { headers: rateLimit.headers });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, email, phone, country, city, service_city, service_province, company_address, address')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: 'No se pudo preparar la bienvenida.' }, { status: 500, headers: rateLimit.headers });
  }

  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const audience = resolveAudience((profile || null) as ProfileRow | null, metadata, body.audience);
  const payload = buildWelcomePayload({
    user: {
      id: user.id,
      email: user.email,
      user_metadata: metadata,
    },
    profile: (profile || null) as ProfileRow | null,
    audience,
  });

  if (!payload.whatsapp_phone) {
    return NextResponse.json({ ok: true, sent: false, skipped: 'missing_phone' }, { headers: rateLimit.headers });
  }

  const { data: existingNotification } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', WELCOME_NOTIFICATION_TYPE)
    .limit(1)
    .maybeSingle();

  if (existingNotification) {
    return NextResponse.json({ ok: true, sent: false, already_sent: true }, { headers: rateLimit.headers });
  }

  const whatsappResult = await sendWhatsAppWelcomeTemplate(payload);
  const webhookResult = whatsappResult.sent ? whatsappResult : await sendWelcomeWebhook(payload);
  const result = whatsappResult.sent ? whatsappResult : webhookResult;

  if (!result.configured) {
    return NextResponse.json({ ok: true, sent: false, configured: false }, { headers: rateLimit.headers });
  }

  if (!result.sent) {
    return NextResponse.json({ error: 'No se pudo enviar la bienvenida.' }, { status: 502, headers: rateLimit.headers });
  }

  await supabase.from('notifications').insert({
    user_id: user.id,
    type: WELCOME_NOTIFICATION_TYPE,
    title: 'Bienvenida UrbanFix',
    body: 'Tu cuenta esta creada. Te enviamos los enlaces para completar tu perfil y sumarte a la comunidad.',
    data: {
      channel: result.channel,
      phone: payload.whatsapp_phone,
      audience,
      source: normalizeText(body.source),
      profile_url: payload.profile_url,
      whatsapp_community_url: payload.whatsapp_community_url,
      web_community_url: payload.web_community_url,
      message: buildWelcomeMessage(payload),
    },
  });

  return NextResponse.json({ ok: true, sent: true, channel: result.channel }, { headers: rateLimit.headers });
}
