import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const fetchMpPreapproval = async (id: string) => {
  if (!mpAccessToken) throw new Error('Falta MP_ACCESS_TOKEN');
  const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo leer la preapproval.');
  }
  return response.json();
};

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const topic = (body?.type || body?.topic || searchParams.get('type') || searchParams.get('topic') || '')
    .toString()
    .toLowerCase();
  const dataId = (body?.data?.id || body?.id || searchParams.get('id') || '').toString();

  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  if (topic.includes('subscription_preapproval')) {
    try {
      const preapproval = await fetchMpPreapproval(dataId);
      const externalRef = String(preapproval.external_reference || '');
      const [userId, planId] = externalRef.split('|');

      const payload = {
        status: preapproval.status,
        current_period_start: preapproval.auto_recurring?.start_date || null,
        current_period_end: preapproval.auto_recurring?.end_date || null,
        trial_end: preapproval.trial_end_date || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updated } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('mp_preapproval_id', dataId)
        .select()
        .maybeSingle();

      if (!updated && userId) {
        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            plan_id: planId || null,
            mp_preapproval_id: dataId,
            ...payload,
          },
          { onConflict: 'user_id' }
        );
      }
    } catch (error) {
      console.error('Webhook preapproval error:', error);
    }
  }

  return NextResponse.json({ ok: true });
}
