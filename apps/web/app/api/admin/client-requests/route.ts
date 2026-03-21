import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import {
  type AdminClientRequestRecord,
  buildAdminClientRequestEmailHtml,
  buildAdminClientRequestEmailSubject,
  buildAdminClientRequestEmailText,
  buildAdminClientRequestTicketHref,
  buildAdminClientRequestWhatsappHref,
  buildAdminClientRequestWhatsappText,
} from '@/lib/client-requests-share';
import { normalizeNewsletterEmail } from '@/lib/newsletter';

const RESEND_API_URL = 'https://api.resend.com/emails';
const MAX_REQUESTS = 80;

type RequestProfileRow = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

const toText = (value: unknown) => String(value || '').trim();

const normalizeUrgency = (value: unknown) => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'alta' || normalized === 'media' || normalized === 'baja') return normalized;
  return 'media';
};

const normalizeMode = (value: unknown) => (toText(value).toLowerCase() === 'direct' ? 'direct' : 'marketplace');

const normalizeStatus = (value: unknown) => {
  const normalized = toText(value).toLowerCase();
  const allowed = new Set([
    'published',
    'matched',
    'quoted',
    'direct_sent',
    'selected',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
  ]);
  return allowed.has(normalized) ? normalized : 'published';
};

const getProviderConfig = () => ({
  apiKey: (process.env.RESEND_API_KEY || '').trim(),
  fromEmail: (process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || '').trim(),
  replyTo: (process.env.NEWSLETTER_REPLY_TO_EMAIL || '').trim(),
});

const sendEmail = async (params: { to: string[]; subject: string; html: string; text: string }) => {
  const provider = getProviderConfig();
  if (!provider.apiKey || !provider.fromEmail) {
    throw new Error('Falta configurar RESEND_API_KEY y NEWSLETTER_FROM_EMAIL para enviar mails desde admin.');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      from: provider.fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(provider.replyTo ? { reply_to: provider.replyTo } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'No se pudo enviar el mail.');
  }

  return {
    id: typeof data?.id === 'string' ? data.id : null,
    fromEmail: provider.fromEmail,
  };
};

const buildRequestRecord = (
  row: any,
  profilesMap: Map<string, RequestProfileRow>,
  matchesStatsMap: Map<string, { total: number; submitted: number }>
): AdminClientRequestRecord => {
  const profile = profilesMap.get(String(row.client_id || ''));
  const matchStats = matchesStatsMap.get(String(row.id || ''));

  return {
    id: String(row.id || ''),
    title: toText(row.title) || 'Solicitud UrbanFix',
    category: toText(row.category) || 'General',
    address: toText(row.address),
    city: toText(row.city) || null,
    description: toText(row.description),
    urgency: toText(row.urgency) || 'media',
    mode: toText(row.mode) || 'marketplace',
    status: toText(row.status) || 'published',
    preferredWindow: toText(row.preferred_window) || null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || row.created_at || ''),
    clientName: toText(profile?.business_name || profile?.full_name) || 'Cliente UrbanFix',
    clientEmail: normalizeNewsletterEmail(profile?.email),
    clientPhone: toText(profile?.phone) || null,
    targetTechnicianName: toText(row.target_technician_name) || null,
    targetTechnicianPhone: toText(row.target_technician_phone) || null,
    matchesCount: matchStats?.total || 0,
    submittedQuotesCount: matchStats?.submitted || 0,
  };
};

const loadClientRequests = async () => {
  if (!supabase) throw new Error('Missing server config');

  const { data: requestRows, error: requestError } = await supabase
    .from('client_requests')
    .select(
      'id, client_id, title, category, address, city, description, urgency, mode, status, preferred_window, target_technician_name, target_technician_phone, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .limit(MAX_REQUESTS);

  if (requestError) {
    throw new Error(requestError.message || 'No se pudieron cargar las solicitudes.');
  }

  const requestIds = (requestRows || []).map((row: any) => String(row.id));
  const clientIds = Array.from(new Set((requestRows || []).map((row: any) => String(row.client_id || '')).filter(Boolean)));

  const profilesMap = new Map<string, RequestProfileRow>();
  if (clientIds.length) {
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, email, phone')
      .in('id', clientIds);
    if (profilesError) {
      throw new Error(profilesError.message || 'No se pudieron cargar los perfiles de cliente.');
    }
    (profileRows || []).forEach((row: any) => profilesMap.set(String(row.id), row as RequestProfileRow));
  }

  const matchesStatsMap = new Map<string, { total: number; submitted: number }>();
  if (requestIds.length) {
    const { data: matchRows, error: matchesError } = await supabase
      .from('client_request_matches')
      .select('request_id, quote_status')
      .in('request_id', requestIds);
    if (matchesError) {
      throw new Error(matchesError.message || 'No se pudieron cargar los matches de solicitudes.');
    }

    (matchRows || []).forEach((row: any) => {
      const requestId = String(row.request_id || '');
      const current = matchesStatsMap.get(requestId) || { total: 0, submitted: 0 };
      current.total += 1;
      if (toText(row.quote_status).toLowerCase() === 'submitted') {
        current.submitted += 1;
      }
      matchesStatsMap.set(requestId, current);
    });
  }

  return (requestRows || []).map((row: any) => buildRequestRecord(row, profilesMap, matchesStatsMap));
};

const parseDestinationEmails = (value: unknown) => {
  const raw = String(value || '');
  const emails = raw
    .split(/[\n,;]+/)
    .map((item) => normalizeNewsletterEmail(item))
    .filter(Boolean);

  return Array.from(new Set(emails));
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
    const requests = await loadClientRequests();
    const provider = getProviderConfig();

    return NextResponse.json({
      requests: requests.map((item) => ({
        ...item,
        ticketHref: buildAdminClientRequestTicketHref(item),
        whatsappHref: buildAdminClientRequestWhatsappHref(item),
        whatsappText: buildAdminClientRequestWhatsappText(item),
        emailSubject: buildAdminClientRequestEmailSubject(item),
      })),
      resendConfigured: Boolean(provider.apiKey && provider.fromEmail),
      fromEmail: provider.fromEmail || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudieron cargar las solicitudes.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const requestId = toText(body.requestId);
  if (!requestId) {
    return NextResponse.json({ error: 'Falta requestId.' }, { status: 400 });
  }

  const updatePayload = {
    title: toText(body.title),
    category: toText(body.category),
    address: toText(body.address),
    city: toText(body.city) || null,
    description: toText(body.description),
    urgency: normalizeUrgency(body.urgency),
    mode: normalizeMode(body.mode),
    status: normalizeStatus(body.status),
    preferred_window: toText(body.preferredWindow) || null,
    target_technician_name: toText(body.targetTechnicianName) || null,
    target_technician_phone: toText(body.targetTechnicianPhone) || null,
  };

  if (!updatePayload.title || !updatePayload.category || !updatePayload.address || !updatePayload.description) {
    return NextResponse.json(
      { error: 'Completa titulo, categoria, direccion y descripcion para guardar la solicitud.' },
      { status: 400 }
    );
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from('client_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .select('id')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'No se pudo editar la solicitud.' }, { status: 500 });
  }
  if (!updatedRow) {
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
  }

  await supabase.from('client_request_events').insert({
    request_id: requestId,
    actor_id: user.id,
    label: 'Admin actualizo la solicitud.',
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
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

  const requestId = toText(request.nextUrl.searchParams.get('requestId'));
  if (!requestId) {
    return NextResponse.json({ error: 'Falta requestId.' }, { status: 400 });
  }

  const { data: deletedRow, error: deleteError } = await supabase
    .from('client_requests')
    .delete()
    .eq('id', requestId)
    .select('id')
    .maybeSingle();
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || 'No se pudo eliminar la solicitud.' }, { status: 500 });
  }
  if (!deletedRow) {
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
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

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const action = toText(body.action).toLowerCase();
  if (action !== 'send_email') {
    return NextResponse.json({ error: 'Accion no soportada.' }, { status: 400 });
  }

  const requestId = toText(body.requestId);
  if (!requestId) {
    return NextResponse.json({ error: 'Falta requestId.' }, { status: 400 });
  }

  const destinationEmails = parseDestinationEmails(body.toEmail);
  if (!destinationEmails.length) {
    return NextResponse.json({ error: 'Carga al menos un email destino valido.' }, { status: 400 });
  }

  try {
    const requests = await loadClientRequests();
    const requestRecord = requests.find((item) => item.id === requestId);
    if (!requestRecord) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    const subject = buildAdminClientRequestEmailSubject(requestRecord);
    const html = buildAdminClientRequestEmailHtml(requestRecord);
    const text = buildAdminClientRequestEmailText(requestRecord);
    const sent = await sendEmail({
      to: destinationEmails,
      subject,
      html,
      text,
    });

    await supabase.from('client_request_events').insert({
      request_id: requestId,
      actor_id: user.id,
      label: `Admin compartio la solicitud por mail a ${destinationEmails.join(', ')}.`,
    });

    return NextResponse.json({
      ok: true,
      provider: 'resend',
      providerMessageId: sent.id,
      fromEmail: sent.fromEmail,
      sentTo: destinationEmails,
      subject,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No se pudo enviar el mail.' }, { status: 500 });
  }
}
