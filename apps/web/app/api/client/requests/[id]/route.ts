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

      const { data: matchRow, error: matchError } = await supabase
        .from('client_request_matches')
        .select('*')
        .eq('id', matchId)
        .eq('request_id', requestId)
        .maybeSingle();

      if (matchError || !matchRow) {
        return NextResponse.json({ error: 'No encontramos el tecnico seleccionado.' }, { status: 404 });
      }

      await updateRequest(supabase, requestId, user.id, {
        status: 'selected',
        selected_match_id: matchRow.id,
        assigned_technician_id: matchRow.technician_id,
        assigned_technician_name: matchRow.technician_name,
        assigned_technician_phone: matchRow.technician_phone,
      });
      await insertClientEvent(supabase, requestId, user.id, `Tecnico elegido: ${matchRow.technician_name}.`);
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

      await updateRequest(supabase, requestId, user.id, { status: nextStatus });
      await insertClientEvent(supabase, requestId, user.id, label);
    } else if (action === 'cancel') {
      const currentStatus = String(row.status || '');
      if (currentStatus === 'completed' || currentStatus === 'cancelled') {
        return NextResponse.json({ error: 'La solicitud ya esta cerrada.' }, { status: 400 });
      }

      await updateRequest(supabase, requestId, user.id, { status: 'cancelled' });
      await insertClientEvent(supabase, requestId, user.id, 'Solicitud cancelada por el cliente.');
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
