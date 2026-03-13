import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toFiniteNumber } from '../../../_shared/marketplace';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const approvedRequestStatuses = new Set(['selected', 'scheduled', 'in_progress', 'completed']);
const paidRequestStatuses = new Set(['completed']);

const getAuthUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const normalizeResponseType = (responseType: unknown, amount: number | null) => {
  const value = String(responseType || '').trim().toLowerCase();
  if (value) return value;
  if (amount !== null && amount > 0) return 'direct_quote';
  return '';
};

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: matchRows, error: matchError } = await supabase
    .from('client_request_matches')
    .select('id, request_id, quote_status, response_type, price_ars, submitted_at, created_at, updated_at')
    .eq('technician_id', user.id)
    .in('quote_status', ['submitted', 'accepted', 'rejected'])
    .order('updated_at', { ascending: false })
    .limit(400);

  if (matchError) {
    return NextResponse.json(
      { error: matchError.message || 'No pudimos cargar la facturacion del marketplace.' },
      { status: 500 }
    );
  }

  const requestIds = Array.from(
    new Set(
      (matchRows || [])
        .map((row: any) => String(row?.request_id || '').trim())
        .filter(Boolean)
    )
  );

  const requestMetaById = new Map<string, { status: string; updated_at: string | null }>();
  if (requestIds.length > 0) {
    const { data: requestRows, error: requestsError } = await supabase
      .from('client_requests')
      .select('id, status, updated_at')
      .in('id', requestIds);

    if (requestsError) {
      return NextResponse.json(
        { error: requestsError.message || 'No pudimos cruzar el estado de las solicitudes.' },
        { status: 500 }
      );
    }

    (requestRows || []).forEach((row: any) => {
      const requestId = String(row?.id || '').trim();
      if (!requestId) return;
      requestMetaById.set(requestId, {
        status: String(row?.status || '').trim().toLowerCase(),
        updated_at: row?.updated_at ? String(row.updated_at) : null,
      });
    });
  }

  const items = (matchRows || [])
    .map((row: any) => {
      const amount = toFiniteNumber(row?.price_ars);
      if (amount === null || amount <= 0) return null;

      const responseType = normalizeResponseType(row?.response_type, amount);
      if (responseType !== 'direct_quote') return null;

      const requestId = String(row?.request_id || '').trim();
      const requestMeta = requestMetaById.get(requestId);
      const requestStatus = requestMeta?.status || '';
      const quoteStatus = String(row?.quote_status || '').trim().toLowerCase();
      const createdAt = String(row?.submitted_at || row?.created_at || row?.updated_at || '').trim();
      if (!createdAt) return null;

      let normalizedStatus = 'sent';
      if (requestStatus === 'cancelled' || quoteStatus === 'rejected') {
        normalizedStatus = 'cancelled';
      } else if (paidRequestStatuses.has(requestStatus)) {
        normalizedStatus = 'paid';
      } else if (approvedRequestStatuses.has(requestStatus) || quoteStatus === 'accepted') {
        normalizedStatus = 'accepted';
      }

      return {
        id: `marketplace-${row.id}`,
        total_amount: Number(amount),
        status: normalizedStatus,
        created_at: createdAt,
        paid_at: normalizedStatus === 'paid' ? requestMeta?.updated_at || row?.updated_at || createdAt : null,
        source: 'marketplace' as const,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}
