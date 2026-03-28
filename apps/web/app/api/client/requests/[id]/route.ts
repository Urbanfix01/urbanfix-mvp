import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '@/app/api/client/_shared/auth';
import {
  ensureMarketplaceMatches,
  getClientWorkspaceSnapshot,
  insertClientEvent,
  loadClientRequest,
} from '@/app/api/client/_shared/data';

const statusSet = new Set([
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

const toText = (value: unknown) => String(value || '').trim();
const toFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const parseMoney = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const loadRequestMatch = async (client: any, requestId: string, matchId: string) => {
  const { data, error } = await client
    .from('client_request_matches')
    .select('*')
    .eq('id', matchId)
    .eq('request_id', requestId)
    .maybeSingle();
  if (error || !data) {
    throw new Error('No encontramos la cotizacion seleccionada.');
  }
  return data as Record<string, any>;
};

const hasSubmittedQuote = (matchRow: Record<string, any>) => String(matchRow.quote_status || '').trim() === 'submitted';
const isDirectQuoteMatch = (matchRow: Record<string, any>) => String(matchRow.response_type || '').trim() === 'direct_quote';

const loadSelectedRequestMatch = async (client: any, requestId: string, row: Record<string, any>) => {
  const selectedMatchId = toText(row.selected_match_id);
  if (selectedMatchId) {
    return loadRequestMatch(client, requestId, selectedMatchId);
  }

  const assignedTechnicianId = toText(row.assigned_technician_id);
  if (!assignedTechnicianId) return null;

  const { data, error } = await client
    .from('client_request_matches')
    .select('*')
    .eq('request_id', requestId)
    .eq('technician_id', assignedTechnicianId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'No pudimos cargar la respuesta seleccionada.');
  }
  return data as Record<string, any> | null;
};

const refreshRequestStatusFromQuotes = async (client: any, requestId: string, userId: string) => {
  const { data: matchRows, error } = await client
    .from('client_request_matches')
    .select('id, quote_status')
    .eq('request_id', requestId);
  if (error) {
    throw new Error(error.message || 'No pudimos recalcular estado de cotizaciones.');
  }
  const rows = (matchRows || []) as Array<{ id: string; quote_status: string }>;
  const hasSubmitted = rows.some((row) => String(row.quote_status || '') === 'submitted');
  const nextStatus = hasSubmitted ? 'quoted' : 'matched';
  await updateRequest(client, requestId, userId, {
    status: nextStatus,
    selected_match_id: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_phone: null,
  });
};

const updateRequest = async (client: any, requestId: string, userId: string, payload: Record<string, unknown>) => {
  const { error } = await client
    .from('client_requests')
    .update(payload)
    .eq('id', requestId)
    .eq('client_id', userId);
  if (error) {
    throw new Error(error.message || 'No pudimos actualizar la solicitud.');
  }
};

const syncQuoteStatus = async (client: any, quoteIdRaw: unknown, nextStatus: 'approved' | 'completed') => {
  const quoteId = toText(quoteIdRaw);
  if (!quoteId) return;

  const payload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };
  if (nextStatus === 'completed') {
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await client.from('quotes').update(payload).eq('id', quoteId);
  if (error) {
    throw new Error(error.message || 'No pudimos sincronizar el presupuesto asociado.');
  }
};

const tryFindQuoteByField = async (client: any, field: 'client_request_match_id' | 'client_request_id', value: string, technicianId?: string | null) => {
  if (!value) return null;

  let query = client
    .from('quotes')
    .select('id, user_id, status')
    .eq(field, value)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (technicianId) {
    query = query.eq('user_id', technicianId);
  }

  const { data, error } = await query;
  if (error) return null;
  return Array.isArray(data) && data.length ? (data[0] as Record<string, any>) : null;
};

const resolveQuoteForMatch = async (client: any, requestId: string, matchRow: Record<string, any> | null) => {
  if (!matchRow) return null;

  const storedQuoteId = toText(matchRow.quote_id);
  if (storedQuoteId) {
    return {
      id: storedQuoteId,
      user_id: toText(matchRow.technician_id) || null,
      status: null,
    };
  }

  const matchId = toText(matchRow.id);
  const technicianId = toText(matchRow.technician_id) || null;
  const byMatch = await tryFindQuoteByField(client, 'client_request_match_id', matchId, technicianId);
  const resolvedQuote = byMatch || (await tryFindQuoteByField(client, 'client_request_id', requestId, technicianId));

  if (resolvedQuote?.id && matchId) {
    await client.from('client_request_matches').update({ quote_id: resolvedQuote.id }).eq('id', matchId).eq('request_id', requestId);
  }

  return resolvedQuote;
};

const loadClientDisplayName = async (client: any, userId: string) => {
  const { data } = await client
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', userId)
    .maybeSingle();

  return toText(data?.business_name) || toText(data?.full_name) || null;
};

const ensureQuoteFeedbackRequest = async (client: any, quoteId: string, technicianId: string, clientName: string | null) => {
  const { data: existing, error: existingError } = await client
    .from('quote_feedback_requests')
    .select('id')
    .eq('quote_id', quoteId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'No pudimos preparar el feedback del trabajo.');
  }

  if (existing?.id) {
    if (clientName) {
      await client
        .from('quote_feedback_requests')
        .update({ client_name_snapshot: clientName })
        .eq('id', existing.id);
    }
    return String(existing.id);
  }

  const shareToken = crypto.randomUUID().replace(/-/g, '');
  const { data: createdRows, error: createError } = await client
    .from('quote_feedback_requests')
    .insert({
      quote_id: quoteId,
      technician_id: technicianId,
      share_token: shareToken,
      client_name_snapshot: clientName,
    })
    .select('id')
    .limit(1);

  if (createError) {
    throw new Error(createError.message || 'No pudimos preparar el feedback del trabajo.');
  }

  const created = Array.isArray(createdRows) ? createdRows[0] : null;
  const feedbackRequestId = toText(created?.id);
  if (!feedbackRequestId) {
    throw new Error('No pudimos crear el registro de feedback del trabajo.');
  }
  return feedbackRequestId;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const requestId = toText(resolvedParams?.id);
  if (!requestId) {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido.' }, { status: 400 });
  }

  const action = toText(body.action);
  if (!action) {
    return NextResponse.json({ error: 'Accion requerida.' }, { status: 400 });
  }

  let row: Record<string, any>;
  try {
    row = await loadClientRequest(supabase, requestId, user.id);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Solicitud no encontrada.' }, { status: 404 });
  }

  try {
    if (action === 'open_marketplace') {
      await updateRequest(supabase, requestId, user.id, {
        mode: 'marketplace',
        status: 'published',
        target_technician_id: null,
        target_technician_name: null,
        target_technician_phone: null,
        direct_expires_at: null,
        selected_match_id: null,
        assigned_technician_id: null,
        assigned_technician_name: null,
        assigned_technician_phone: null,
      });
      await insertClientEvent(supabase, requestId, user.id, 'Solicitud abierta al marketplace.');
    } else if (action === 'direct_accepted') {
      if (row.status !== 'direct_sent') {
        return NextResponse.json({ error: 'La solicitud no esta en estado directo pendiente.' }, { status: 400 });
      }
      await updateRequest(supabase, requestId, user.id, {
        status: 'selected',
        assigned_technician_id: row.target_technician_id,
        assigned_technician_name: row.target_technician_name,
        assigned_technician_phone: row.target_technician_phone,
        direct_expires_at: null,
      });
      await insertClientEvent(
        supabase,
        requestId,
        user.id,
        `Solicitud directa aceptada por ${row.target_technician_name || 'tecnico'}.`
      );
    } else if (action === 'direct_rejected') {
      await updateRequest(supabase, requestId, user.id, {
        mode: 'marketplace',
        status: 'published',
        target_technician_id: null,
        target_technician_name: null,
        target_technician_phone: null,
        direct_expires_at: null,
        selected_match_id: null,
        assigned_technician_id: null,
        assigned_technician_name: null,
        assigned_technician_phone: null,
      });
      await insertClientEvent(supabase, requestId, user.id, 'Solicitud directa rechazada. Se abrio marketplace.');
    } else if (action === 'ensure_matches') {
      const matches = await ensureMarketplaceMatches(supabase, row, user.id, 5);
      if (matches.length) {
        await updateRequest(supabase, requestId, user.id, { status: 'matched' });
        await insertClientEvent(supabase, requestId, user.id, 'Tecnicos compatibles encontrados por rubro y zona.');
      } else {
        await insertClientEvent(supabase, requestId, user.id, 'No encontramos tecnicos compatibles en esta ronda.');
      }
    } else if (action === 'select_match') {
      const matchId = toText(body.matchId);
      if (!matchId) {
        return NextResponse.json({ error: 'Match requerido.' }, { status: 400 });
      }

      const matchRow = await loadRequestMatch(supabase, requestId, matchId);
      if (!hasSubmittedQuote(matchRow)) {
        return NextResponse.json({ error: 'Solo puedes seleccionar respuestas enviadas por tecnicos.' }, { status: 400 });
      }
      await updateRequest(supabase, requestId, user.id, {
        status: 'selected',
        selected_match_id: matchRow.id,
        assigned_technician_id: matchRow.technician_id,
        assigned_technician_name: matchRow.technician_name,
        assigned_technician_phone: matchRow.technician_phone,
      });
      await insertClientEvent(supabase, requestId, user.id, `Tecnico elegido: ${matchRow.technician_name}.`);
    } else if (action === 'quote_accept') {
      const matchId = toText(body.matchId);
      if (!matchId) {
        return NextResponse.json({ error: 'Cotizacion requerida.' }, { status: 400 });
      }

      const matchRow = await loadRequestMatch(supabase, requestId, matchId);
      if (!hasSubmittedQuote(matchRow) || !isDirectQuoteMatch(matchRow)) {
        return NextResponse.json({ error: 'Solo puedes aceptar cotizaciones enviadas por tecnicos.' }, { status: 400 });
      }
      const linkedQuote = await resolveQuoteForMatch(supabase, requestId, matchRow);
      if (linkedQuote?.id) {
        await syncQuoteStatus(supabase, linkedQuote.id, 'approved');
      }

      const { error: acceptError } = await supabase
        .from('client_request_matches')
        .update({ quote_status: 'accepted' })
        .eq('id', matchRow.id)
        .eq('request_id', requestId);
      if (acceptError) {
        return NextResponse.json(
          { error: acceptError.message || 'No pudimos aceptar la oferta.' },
          { status: 500 }
        );
      }

      const { error: rejectOthersError } = await supabase
        .from('client_request_matches')
        .update({ quote_status: 'rejected' })
        .eq('request_id', requestId)
        .neq('id', matchRow.id)
        .eq('quote_status', 'submitted');
      if (rejectOthersError) {
        return NextResponse.json(
          { error: rejectOthersError.message || 'No pudimos cerrar las otras cotizaciones.' },
          { status: 500 }
        );
      }

      await updateRequest(supabase, requestId, user.id, {
        status: 'selected',
        selected_match_id: matchRow.id,
        assigned_technician_id: matchRow.technician_id,
        assigned_technician_name: matchRow.technician_name,
        assigned_technician_phone: matchRow.technician_phone,
      });
      await insertClientEvent(
        supabase,
        requestId,
        user.id,
        `Oferta aceptada: ${matchRow.technician_name || 'tecnico'} seleccionado.`
      );
    } else if (action === 'quote_reject') {
      const matchId = toText(body.matchId);
      if (!matchId) {
        return NextResponse.json({ error: 'Cotizacion requerida.' }, { status: 400 });
      }

      const reason = toText(body.reason);
      const matchRow = await loadRequestMatch(supabase, requestId, matchId);
      const { error: rejectError } = await supabase
        .from('client_request_matches')
        .update({ quote_status: 'rejected' })
        .eq('id', matchRow.id)
        .eq('request_id', requestId);
      if (rejectError) {
        return NextResponse.json(
          { error: rejectError.message || 'No pudimos rechazar la oferta.' },
          { status: 500 }
        );
      }

      await refreshRequestStatusFromQuotes(supabase, requestId, user.id);
      await insertClientEvent(
        supabase,
        requestId,
        user.id,
        `Oferta rechazada: ${matchRow.technician_name || 'tecnico'}${reason ? ` (${reason})` : ''}.`
      );
    } else if (action === 'counter_offer') {
      const matchId = toText(body.matchId);
      if (!matchId) {
        return NextResponse.json({ error: 'Cotizacion requerida.' }, { status: 400 });
      }

      const counterPrice = parseMoney(body.counterPriceArs);
      const counterEta = toFiniteNumber(body.counterEtaHours);
      const note = toText(body.note);
      if (counterPrice === null || counterPrice <= 0) {
        return NextResponse.json({ error: 'Precio de contraoferta invalido.' }, { status: 400 });
      }
      if (counterEta === null || counterEta <= 0) {
        return NextResponse.json({ error: 'ETA de contraoferta invalida.' }, { status: 400 });
      }

      const matchRow = await loadRequestMatch(supabase, requestId, matchId);
      const normalizedPrice = Math.round(counterPrice * 100) / 100;
      const normalizedEta = Math.max(1, Math.min(720, Math.round(counterEta)));
      const { error: updateMatchError } = await supabase
        .from('client_request_matches')
        .update({
          quote_status: 'submitted',
          response_type: 'direct_quote',
          response_message: null,
          visit_eta_hours: null,
          price_ars: normalizedPrice,
          eta_hours: normalizedEta,
        })
        .eq('id', matchRow.id)
        .eq('request_id', requestId);
      if (updateMatchError) {
        return NextResponse.json(
          { error: updateMatchError.message || 'No pudimos guardar la contraoferta.' },
          { status: 500 }
        );
      }

      await updateRequest(supabase, requestId, user.id, {
        status: 'quoted',
        selected_match_id: null,
        assigned_technician_id: null,
        assigned_technician_name: null,
        assigned_technician_phone: null,
      });
      const priceLabel = Math.round(normalizedPrice).toLocaleString('es-AR');
      await insertClientEvent(
        supabase,
        requestId,
        user.id,
        `Contraoferta enviada a ${matchRow.technician_name || 'tecnico'}: $${priceLabel} - ETA ${normalizedEta}h${
          note ? ` - ${note}` : ''
        }.`
      );
    } else if (action === 'advance') {
      const currentStatus = String(row.status || '');
      let nextStatus: string | null = null;
      let label = '';

      if (currentStatus === 'selected') {
        nextStatus = 'scheduled';
        label = 'Trabajo agendado.';
      } else if (currentStatus === 'scheduled') {
        nextStatus = 'in_progress';
        label = 'Trabajo iniciado.';
      } else if (currentStatus === 'in_progress') {
        nextStatus = 'completed';
        label = 'Trabajo finalizado.';
      }

      if (!nextStatus) {
        return NextResponse.json({ error: 'La solicitud no puede avanzar en este estado.' }, { status: 400 });
      }

      if (nextStatus === 'completed') {
        const selectedMatch = await loadSelectedRequestMatch(supabase, requestId, row);
        const linkedQuote = await resolveQuoteForMatch(supabase, requestId, selectedMatch);
        if (linkedQuote?.id) {
          await syncQuoteStatus(supabase, linkedQuote.id, 'completed');
        }
      }

      await updateRequest(supabase, requestId, user.id, { status: nextStatus });
      await insertClientEvent(supabase, requestId, user.id, label);
    } else if (action === 'cancel') {
      const currentStatus = String(row.status || '');
      if (currentStatus === 'completed' || currentStatus === 'cancelled') {
        return NextResponse.json({ error: 'La solicitud ya esta cerrada.' }, { status: 400 });
      }

      await updateRequest(supabase, requestId, user.id, { status: 'cancelled' });
      await insertClientEvent(supabase, requestId, user.id, 'Solicitud cancelada por el cliente.');
    } else if (action === 'submit_feedback') {
      const rating = Math.round(Number(body.rating));
      const comment = toText(body.comment).replace(/\s+/g, ' ');
      const isPublic = body.isPublic === undefined ? true : Boolean(body.isPublic);

      if (String(row.status || '') !== 'completed') {
        return NextResponse.json({ error: 'La calificacion se habilita cuando el trabajo este finalizado.' }, { status: 400 });
      }
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Selecciona una calificacion valida de 1 a 5.' }, { status: 400 });
      }
      if (comment.length < 6) {
        return NextResponse.json({ error: 'Escribe un comentario breve sobre el trabajo realizado.' }, { status: 400 });
      }

      const selectedMatch = await loadSelectedRequestMatch(supabase, requestId, row);
      if (!selectedMatch) {
        return NextResponse.json({ error: 'No encontramos el tecnico asociado a este trabajo.' }, { status: 400 });
      }

      const linkedQuote = await resolveQuoteForMatch(supabase, requestId, selectedMatch);
      const quoteId = toText(linkedQuote?.id);
      const technicianId = toText(selectedMatch.technician_id || row.assigned_technician_id);
      if (!quoteId || !technicianId) {
        return NextResponse.json(
          { error: 'Este trabajo todavia no tiene un presupuesto vinculado para guardar la calificacion.' },
          { status: 400 }
        );
      }

      const clientName = await loadClientDisplayName(supabase, user.id);
      const feedbackRequestId = await ensureQuoteFeedbackRequest(supabase, quoteId, technicianId, clientName);
      const { error: reviewError } = await supabase
        .from('quote_feedback_reviews')
        .upsert(
          {
            feedback_request_id: feedbackRequestId,
            quote_id: quoteId,
            technician_id: technicianId,
            client_name: clientName,
            rating,
            comment,
            is_public: isPublic,
          },
          { onConflict: 'feedback_request_id' }
        );

      if (reviewError) {
        return NextResponse.json(
          { error: reviewError.message || 'No pudimos guardar la calificacion.' },
          { status: 500 }
        );
      }

      await insertClientEvent(
        supabase,
        requestId,
        user.id,
        `Cliente califico el trabajo de ${toText(selectedMatch.technician_name) || 'tecnico'} con ${rating}/5.`
      );
    } else if (action === 'set_status') {
      const status = toText(body.status);
      if (!statusSet.has(status)) {
        return NextResponse.json({ error: 'Estado invalido.' }, { status: 400 });
      }
      await updateRequest(supabase, requestId, user.id, { status });
      await insertClientEvent(supabase, requestId, user.id, `Estado actualizado a ${status}.`);
    } else {
      return NextResponse.json({ error: 'Accion no soportada.' }, { status: 400 });
    }

    const snapshot = await getClientWorkspaceSnapshot(supabase, user.id);
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'No pudimos procesar la accion.' }, { status: 500 });
  }
}
