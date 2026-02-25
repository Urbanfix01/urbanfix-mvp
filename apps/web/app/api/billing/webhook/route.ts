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

const fetchMpPayment = async (id: string) => {
  if (!mpAccessToken) throw new Error('Falta MP_ACCESS_TOKEN');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo leer el pago.');
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

  if (topic.includes('preapproval')) {
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

  if (topic.includes('payment')) {
    try {
      const payment = await fetchMpPayment(dataId);
      const paymentId = String(payment?.id || dataId);
      const status = String(payment?.status || '').toLowerCase();
      const amount = Number(payment?.transaction_amount || payment?.amount || 0);
      const paidAt = payment?.date_approved || payment?.date_created || null;
      const preapprovalId = payment?.preapproval_id || payment?.subscription_id || null;
      const externalRef = String(payment?.external_reference || '');
      const [userId] = externalRef.split('|');
      let subscriptionId: string | null = null;

      if (preapprovalId) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('mp_preapproval_id', preapprovalId)
          .maybeSingle();
        subscriptionId = sub?.id || null;
      }

      const { data: existing } = await supabase
        .from('subscription_payments')
        .select('id')
        .eq('mp_payment_id', paymentId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('subscription_payments').insert({
          user_id: userId || null,
          subscription_id: subscriptionId,
          mp_payment_id: paymentId,
          status,
          amount: Number.isFinite(amount) ? amount : 0,
          paid_at: paidAt,
          created_at: paidAt || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Webhook payment error:', error);
    }
  }

  return NextResponse.json({ ok: true });
}
