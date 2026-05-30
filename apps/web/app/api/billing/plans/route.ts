import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase/server';

const supabase = getServiceRoleClient();

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('active', true)
    .order('period_months', { ascending: true })
    .order('is_partner', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data || [] });
}
