import { NextRequest, NextResponse } from 'next/server';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { getServiceRoleClient } from '@/lib/supabase/server';

const supabase = getServiceRoleClient();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const statusAliases: Record<string, string> = {
  accepted: 'approved',
  sent: 'presented',
  finalizado: 'completed',
  completado: 'completed',
  finalizados: 'completed',
  cobrado: 'paid',
  cobrados: 'paid',
  pagado: 'paid',
  pagados: 'paid',
  charged: 'paid',
  programado: 'scheduled',
  agendado: 'scheduled',
  'in-progress': 'in_progress',
  en_curso: 'in_progress',
  'en curso': 'in_progress',
  enproceso: 'in_progress',
  en_proceso: 'in_progress',
  borrador: 'draft',
  rechazado: 'rejected',
  rechazada: 'rejected',
  desestimado: 'discarded',
  desestimada: 'discarded',
  canceled: 'cancelled',
  cancelado: 'cancelled',
  cancelada: 'cancelled',
  vencido: 'expired',
  vencida: 'expired',
};

const allowedStatuses = new Set([
  'draft',
  'pending',
  'presented',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'paid',
  'rejected',
  'discarded',
  'cancelled',
  'expired',
]);

const resolveStatus = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  const canonical = statusAliases[normalized] || normalized;
  return allowedStatuses.has(canonical) ? canonical : null;
};

const getAuthUser = async (request: NextRequest) => {
  if (!supabase) return null;
  const authHeader = (request.headers.get('authorization') || '').trim();
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  if (!token || token.length < 20) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const resolveQuoteId = async (params: Promise<{ id: string }>) => {
  const resolvedParams = await params;
  const quoteId = String(resolvedParams?.id || '').trim();
  return isUuid(quoteId) ? quoteId : null;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quoteId = await resolveQuoteId(params);
  if (!quoteId) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  const bodyResult = await readLimitedJsonBody(request, { maxBytes: 8 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const nextStatus = resolveStatus(bodyResult.body.status ?? bodyResult.body.nextStatus);
  if (!nextStatus) {
    return NextResponse.json({ error: 'Estado invalido.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('quotes')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId)
    .eq('user_id', user.id)
    .select('*')
    .limit(1);

  if (error) {
    return NextResponse.json(
      { error: error.message || 'No pudimos actualizar el estado.' },
      { status: 500 }
    );
  }

  const quote = Array.isArray(data) ? data[0] : null;
  if (!quote) {
    return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, quote });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quoteId = await resolveQuoteId(params);
  if (!quoteId) {
    return NextResponse.json({ error: 'Presupuesto invalido.' }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, user_id')
    .eq('id', quoteId)
    .maybeSingle();

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message || 'No pudimos leer el presupuesto.' },
      { status: 500 }
    );
  }

  if (!quote || String(quote.user_id || '') !== user.id) {
    return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
  }

  const { error: itemsError } = await supabase.from('quote_items').delete().eq('quote_id', quoteId);
  if (itemsError) {
    return NextResponse.json(
      { error: itemsError.message || 'No pudimos eliminar los items del presupuesto.' },
      { status: 500 }
    );
  }

  const { error: attachmentsError } = await supabase.from('quote_attachments').delete().eq('quote_id', quoteId);
  if (attachmentsError) {
    return NextResponse.json(
      { error: attachmentsError.message || 'No pudimos eliminar los adjuntos del presupuesto.' },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase.from('quotes').delete().eq('id', quoteId).eq('user_id', user.id);
  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || 'No pudimos eliminar el presupuesto.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, quoteId });
}
