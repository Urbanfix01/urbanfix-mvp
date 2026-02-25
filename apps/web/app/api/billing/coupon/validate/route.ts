import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const code = String(payload?.code || '').trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ valid: false, reason: 'missing_code' });
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !coupon || !coupon.active) {
    return NextResponse.json({ valid: false, reason: 'invalid' });
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: 'expired' });
  }

  if (coupon.max_redemptions && coupon.redeemed_count >= coupon.max_redemptions) {
    return NextResponse.json({ valid: false, reason: 'limit' });
  }

  const { data: redemption } = await supabase
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (redemption) {
    return NextResponse.json({ valid: false, reason: 'already_used' });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      is_partner: coupon.is_partner,
    },
  });
}
