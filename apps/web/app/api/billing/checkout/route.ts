import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
const publicWebUrl = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL || 'https://www.urbanfixar.com';

const supabase =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const getAuthUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

const createMpPlan = async (plan: any) => {
  if (!mpAccessToken) {
    throw new Error('Falta MP_ACCESS_TOKEN');
  }
  const autoRecurring: any = {
    frequency: plan.period_months,
    frequency_type: 'months',
    transaction_amount: Number(plan.price_ars),
    currency_id: 'ARS',
  };
  if (plan.trial_days && Number(plan.trial_days) > 0) {
    autoRecurring.free_trial = {
      frequency: Number(plan.trial_days),
      frequency_type: 'days',
    };
  }
  const payload = {
    reason: plan.name,
    auto_recurring: autoRecurring,
  };
  const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo crear el plan en Mercado Pago.');
  }
  return response.json();
};

const createMpPreapproval = async (payload: any) => {
  if (!mpAccessToken) {
    throw new Error('Falta MP_ACCESS_TOKEN');
  }
  const response = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo crear la suscripcion.');
  }
  return response.json();
};

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const planId = String(payload?.planId || '');
  const couponCode = String(payload?.couponCode || '').trim().toUpperCase();
  const successUrl = String(payload?.successUrl || '').trim() || `${publicWebUrl}/tecnicos?billing=success`;

  if (!planId) {
    return NextResponse.json({ error: 'Missing plan' }, { status: 400 });
  }

  const { data: basePlan, error: planError } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !basePlan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
  }

  let finalPlan = basePlan;
  let appliedCoupon: any = null;

  if (couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode)
      .single();

    if (coupon && coupon.active) {
      const expired = coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now();
      const limitReached = coupon.max_redemptions && coupon.redeemed_count >= coupon.max_redemptions;
      const { data: redemption } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!expired && !limitReached && !redemption) {
        appliedCoupon = coupon;
        if (coupon.is_partner) {
          const { data: partnerPlan } = await supabase
            .from('billing_plans')
            .select('*')
            .eq('period_months', basePlan.period_months)
            .eq('is_partner', true)
            .single();
          if (partnerPlan) {
            finalPlan = partnerPlan;
          }
        }
      }
    }
  }

  let mpPlanId = finalPlan.mp_plan_id;
  if (!mpPlanId) {
    const mpPlan = await createMpPlan(finalPlan);
    mpPlanId = mpPlan?.id;
    if (mpPlanId) {
      await supabase.from('billing_plans').update({ mp_plan_id: mpPlanId }).eq('id', finalPlan.id);
    }
  }

  if (!mpPlanId) {
    return NextResponse.json({ error: 'No se pudo crear el plan de Mercado Pago' }, { status: 500 });
  }

  const preapproval = await createMpPreapproval({
    preapproval_plan_id: mpPlanId,
    payer_email: user.email,
    reason: finalPlan.name,
    back_url: successUrl,
    status: 'pending',
    external_reference: `${user.id}|${finalPlan.id}`,
  });

  const preapprovalId = preapproval?.id;
  const initPoint = preapproval?.init_point || preapproval?.sandbox_init_point;

  if (!initPoint) {
    return NextResponse.json({ error: 'No se obtuvo link de pago' }, { status: 500 });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: user.id,
        plan_id: finalPlan.id,
        coupon_id: appliedCoupon?.id || null,
        mp_preapproval_id: preapprovalId,
        status: preapproval?.status || 'pending',
        current_period_start: preapproval?.auto_recurring?.start_date || null,
        current_period_end: preapproval?.auto_recurring?.end_date || null,
        trial_end: preapproval?.trial_end_date || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle();

  if (appliedCoupon?.id) {
    await supabase
      .from('coupon_redemptions')
      .insert({ coupon_id: appliedCoupon.id, user_id: user.id })
      .maybeSingle();
    await supabase
      .from('coupons')
      .update({ redeemed_count: (appliedCoupon.redeemed_count || 0) + 1 })
      .eq('id', appliedCoupon.id);
  }

  return NextResponse.json({
    checkout_url: initPoint,
    subscription,
    plan: finalPlan,
    coupon: appliedCoupon ? { code: appliedCoupon.code, discount_percent: appliedCoupon.discount_percent } : null,
  });
}
