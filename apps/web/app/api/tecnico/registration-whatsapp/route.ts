import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

type TechnicianProfile = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  service_province?: string | null;
  company_address?: string | null;
  address?: string | null;
  service_lat?: number | string | null;
  service_lng?: number | string | null;
  access_granted?: boolean | null;
};

const REGISTRATION_NOTIFICATION_TYPE = 'technician_registration_whatsapp_sent';
const WHATSAPP_API_BASE = 'https://graph.facebook.com';

const normalizeText = (value: unknown) => String(value || '').trim();

const getPublicBaseUrl = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_PUBLIC_WEB_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.PUBLIC_WEB_URL,
  ];

  return normalizeText(candidates.find((value) => normalizeText(value))).replace(/\/+$/, '');
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

const buildProfilePayload = (profile: TechnicianProfile) => {
  const publicBase = getPublicBaseUrl();
  const businessName = normalizeText(profile.business_name) || normalizeText(profile.full_name) || 'Técnico UrbanFix';
  const fullName = normalizeText(profile.full_name) || businessName;

  return {
    type: 'technician_registered',
    user_id: profile.id,
    full_name: fullName,
    business_name: businessName,
    email: normalizeText(profile.email),
    phone: normalizeText(profile.phone),
    whatsapp_phone: normalizeWhatsappPhone(profile.phone),
    city: normalizeText(profile.city),
    province: normalizeText(profile.service_province),
    address: normalizeText(profile.company_address) || normalizeText(profile.address),
    access_granted: profile.access_granted === true,
    panel_url: publicBase ? `${publicBase}/tecnicos?perfil=tecnico&mode=login` : '',
  };
};

const getMissingRequiredFields = (profile: TechnicianProfile) => {
  const missing: string[] = [];
  if (!normalizeText(profile.full_name)) missing.push('full_name');
  if (!normalizeText(profile.business_name)) missing.push('business_name');
  if (!normalizeText(profile.phone)) missing.push('phone');
  if (toFiniteNumber(profile.service_lat) === null || toFiniteNumber(profile.service_lng) === null) {
    missing.push('location');
  }
  return missing;
};

const sendRegistrationWebhook = async (payload: ReturnType<typeof buildProfilePayload>) => {
  const url = normalizeText(process.env.TECHNICIAN_REGISTRATION_WEBHOOK_URL);
  if (!url) return { configured: false, sent: false, channel: 'webhook' as const };

  const secret = normalizeText(process.env.TECHNICIAN_REGISTRATION_WEBHOOK_SECRET || process.env.NOTIFY_WEBHOOK_SECRET);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-hook-secret': secret } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { configured: true, sent: false, channel: 'webhook' as const };
  }

  return { configured: true, sent: true, channel: 'webhook' as const };
};

const sendWhatsAppTemplate = async (payload: ReturnType<typeof buildProfilePayload>) => {
  const accessToken = normalizeText(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = normalizeText(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const templateName = normalizeText(process.env.WHATSAPP_REGISTRATION_TEMPLATE_NAME);
  const language = normalizeText(process.env.WHATSAPP_REGISTRATION_TEMPLATE_LANGUAGE) || 'es_AR';
  const graphVersion = normalizeText(process.env.WHATSAPP_GRAPH_VERSION) || 'v21.0';

  if (!accessToken || !phoneNumberId || !templateName) {
    return { configured: false, sent: false, channel: 'whatsapp' as const };
  }

  if (!payload.whatsapp_phone) {
    return { configured: true, sent: false, channel: 'whatsapp' as const };
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
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: payload.full_name || 'Técnico UrbanFix' },
              { type: 'text', text: payload.business_name || 'tu negocio' },
              { type: 'text', text: payload.panel_url || 'UrbanFix' },
            ],
          },
        ],
      },
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
    keyPrefix: 'technician-registration-whatsapp',
    max: 8,
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, full_name, business_name, email, phone, country, city, service_province, company_address, address, service_lat, service_lng, access_granted'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: 'No se pudo preparar el aviso.' }, { status: 500, headers: rateLimit.headers });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404, headers: rateLimit.headers });
  }

  const missing = getMissingRequiredFields(profile as TechnicianProfile);
  if (missing.length > 0) {
    return NextResponse.json({ ok: true, sent: false, skipped: 'incomplete_profile' }, { headers: rateLimit.headers });
  }

  const { data: existingNotification } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', REGISTRATION_NOTIFICATION_TYPE)
    .limit(1)
    .maybeSingle();

  if (existingNotification) {
    return NextResponse.json({ ok: true, sent: false, already_sent: true }, { headers: rateLimit.headers });
  }

  const payload = buildProfilePayload(profile as TechnicianProfile);
  if (!payload.whatsapp_phone) {
    return NextResponse.json({ ok: true, sent: false, skipped: 'missing_phone' }, { headers: rateLimit.headers });
  }

  const whatsappResult = await sendWhatsAppTemplate(payload);
  const webhookResult = whatsappResult.sent ? whatsappResult : await sendRegistrationWebhook(payload);
  const result = whatsappResult.sent ? whatsappResult : webhookResult;

  if (!result.configured) {
    return NextResponse.json({ ok: true, sent: false, configured: false }, { headers: rateLimit.headers });
  }

  if (!result.sent) {
    return NextResponse.json({ error: 'No se pudo enviar el aviso.' }, { status: 502, headers: rateLimit.headers });
  }

  await supabase.from('notifications').insert({
    user_id: user.id,
    type: REGISTRATION_NOTIFICATION_TYPE,
    title: 'Registro recibido',
    body: 'Te enviamos un WhatsApp con el estado de tu alta técnica.',
    data: {
      channel: result.channel,
      phone: payload.whatsapp_phone,
    },
  });

  return NextResponse.json({ ok: true, sent: true, channel: result.channel }, { headers: rateLimit.headers });
}
