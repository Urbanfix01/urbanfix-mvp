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

const ensureAdmin = async (userId: string) => {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('beta_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
};

const parseAmount = (value: any) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
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
    const now = new Date();
    const revenueSince = new Date(now);
    revenueSince.setMonth(revenueSince.getMonth() - 12);
    const paidQuoteStatuses = ['paid', 'cobrado', 'pagado', 'charged'];
    const activeSubStatuses = ['authorized', 'active', 'approved'];
    const blockedPaymentStatuses = new Set(['rejected', 'cancelled', 'canceled', 'refunded']);

    const [
      totalUsersRes,
      accessGrantedRes,
      totalQuotesRes,
      activeSubsRes,
      supportLast7Res,
      paidQuotesRes,
      paymentRowsRes,
      recentMessagesRes,
      recentSubsRes,
      recentPaymentsRes,
      pendingAccessRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('access_granted', true),
      supabase.from('quotes').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', activeSubStatuses),
      supabase
        .from('beta_support_messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('quotes')
        .select('id, total_amount, status')
        .in('status', paidQuoteStatuses),
      supabase
        .from('subscription_payments')
        .select('amount, status, created_at')
        .gte('created_at', revenueSince.toISOString()),
      supabase
        .from('beta_support_messages')
        .select('id, user_id, sender_id, body, created_at, image_urls')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('subscriptions')
        .select('id, user_id, status, current_period_end, created_at, plan:billing_plans(name, period_months, price_ars, is_partner)')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('subscription_payments')
        .select('id, user_id, status, amount, paid_at, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('profiles')
        .select('id, full_name, business_name, email, access_granted')
        .eq('access_granted', false)
        .limit(12),
    ]);

    if (
      totalUsersRes.error ||
      accessGrantedRes.error ||
      totalQuotesRes.error ||
      activeSubsRes.error ||
      supportLast7Res.error ||
      paidQuotesRes.error ||
      paymentRowsRes.error ||
      recentMessagesRes.error ||
      recentSubsRes.error ||
      recentPaymentsRes.error ||
      pendingAccessRes.error
    ) {
      throw (
        totalUsersRes.error ||
        accessGrantedRes.error ||
        totalQuotesRes.error ||
        activeSubsRes.error ||
        supportLast7Res.error ||
        paidQuotesRes.error ||
        paymentRowsRes.error ||
        recentMessagesRes.error ||
        recentSubsRes.error ||
        recentPaymentsRes.error ||
        pendingAccessRes.error
      );
    }

    const paidQuotes = paidQuotesRes.data || [];
    const paidQuotesTotal = paidQuotes.reduce((sum, quote) => sum + parseAmount(quote.total_amount), 0);
    const paidQuotesCount = paidQuotes.length;

    const paymentRows = paymentRowsRes.data || [];
    const revenueTotal = paymentRows.reduce((sum, row) => {
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) {
        return sum;
      }
      return sum + parseAmount(row.amount);
    }, 0);

    const listsRaw = {
      supportMessages: recentMessagesRes.data || [],
      recentSubscriptions: recentSubsRes.data || [],
      recentPayments: recentPaymentsRes.data || [],
      pendingAccess: pendingAccessRes.data || [],
    };

    const userIds = new Set<string>();
    listsRaw.supportMessages.forEach((item) => {
      if (item.user_id) userIds.add(item.user_id);
      if (item.sender_id) userIds.add(item.sender_id);
    });
    listsRaw.recentSubscriptions.forEach((item) => {
      if (item.user_id) userIds.add(item.user_id);
    });
    listsRaw.recentPayments.forEach((item) => {
      if (item.user_id) userIds.add(item.user_id);
    });
    listsRaw.pendingAccess.forEach((item) => {
      if (item.id) userIds.add(item.id);
    });

    let profiles: Record<string, any> = {};
    if (userIds.size) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, email, access_granted')
        .in('id', Array.from(userIds));
      if (profileError) throw profileError;
      profiles = (profileRows || []).reduce((acc: Record<string, any>, row) => {
        acc[row.id] = row;
        return acc;
      }, {});
    }

    return NextResponse.json({
      kpis: {
        totalUsers: totalUsersRes.count || 0,
        accessGranted: accessGrantedRes.count || 0,
        pendingAccess: (totalUsersRes.count || 0) - (accessGrantedRes.count || 0),
        totalQuotes: totalQuotesRes.count || 0,
        paidQuotesCount,
        paidQuotesTotal,
        activeSubscribers: activeSubsRes.count || 0,
        supportMessagesLast7: supportLast7Res.count || 0,
        revenueTotal,
        revenueSince: revenueSince.toISOString(),
      },
      lists: {
        supportMessages: listsRaw.supportMessages.map((item) => ({
          ...item,
          profile: profiles[item.user_id] || null,
          sender: profiles[item.sender_id] || null,
        })),
        recentSubscriptions: listsRaw.recentSubscriptions.map((item) => ({
          ...item,
          profile: profiles[item.user_id] || null,
        })),
        recentPayments: listsRaw.recentPayments.map((item) => ({
          ...item,
          profile: profiles[item.user_id] || null,
        })),
        pendingAccess: listsRaw.pendingAccess.map((item) => ({
          ...item,
          profile: profiles[item.id] || null,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Admin query failed' }, { status: 500 });
  }
}
