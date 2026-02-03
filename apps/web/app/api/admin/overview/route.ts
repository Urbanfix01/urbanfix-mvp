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
    const analyticsSince1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const analyticsSince7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const analyticsSince30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const paidQuoteStatuses = ['paid', 'charged', 'completed'];
    const activeSubStatuses = ['authorized', 'active', 'approved'];
    const blockedPaymentStatuses = new Set(['rejected', 'cancelled', 'canceled', 'refunded']);

    const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 12 });
    if (usersRes.error) {
      throw usersRes.error;
    }

    const [
      totalUsersRes,
      accessGrantedRes,
      totalQuotesRes,
      activeSubsRes,
      activeSubsDataRes,
      supportLast7Res,
      paidQuotesRes,
      paymentRowsRes,
      recentMessagesRes,
      recentSubsRes,
      recentPaymentsRes,
      pendingAccessRes,
      analyticsViewsRes,
      analyticsViewsLast1Res,
      analyticsDurationsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('access_granted', true),
      supabase.from('quotes').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).in('status', activeSubStatuses),
      supabase
        .from('subscriptions')
        .select('status, plan:billing_plans(period_months, price_ars)')
        .in('status', activeSubStatuses),
      supabase
        .from('beta_support_messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('quotes')
        .select('id, total_amount, status, user_id')
        .in('status', paidQuoteStatuses),
      supabase
        .from('subscription_payments')
        .select('amount, status, created_at, user_id')
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
      supabase
        .from('analytics_events')
        .select('session_id')
        .eq('event_type', 'page_view')
        .gte('created_at', analyticsSince7.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('analytics_events')
        .select('session_id')
        .eq('event_type', 'page_view')
        .gte('created_at', analyticsSince1.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000),
      supabase
        .from('analytics_events')
        .select('path, duration_ms')
        .eq('event_type', 'page_duration')
        .gte('created_at', analyticsSince30.toISOString())
        .order('created_at', { ascending: false })
        .limit(20000),
    ]);

    if (
      totalUsersRes.error ||
      accessGrantedRes.error ||
      totalQuotesRes.error ||
      activeSubsRes.error ||
      activeSubsDataRes.error ||
      supportLast7Res.error ||
      paymentRowsRes.error ||
      recentMessagesRes.error ||
      recentSubsRes.error ||
      recentPaymentsRes.error ||
      pendingAccessRes.error ||
      analyticsViewsRes.error ||
      analyticsViewsLast1Res.error ||
      analyticsDurationsRes.error
    ) {
      throw (
        totalUsersRes.error ||
        accessGrantedRes.error ||
        totalQuotesRes.error ||
        activeSubsRes.error ||
        activeSubsDataRes.error ||
        supportLast7Res.error ||
        paymentRowsRes.error ||
        recentMessagesRes.error ||
        recentSubsRes.error ||
        recentPaymentsRes.error ||
        pendingAccessRes.error ||
        analyticsViewsRes.error ||
        analyticsViewsLast1Res.error ||
        analyticsDurationsRes.error
      );
    }

    let paidQuotesData = paidQuotesRes.data || [];
    if (paidQuotesRes.error) {
      const message = String(paidQuotesRes.error.message || '').toLowerCase();
      if (message.includes('invalid input value for enum')) {
        const fallback = await supabase.from('quotes').select('id, total_amount, status, user_id');
        if (fallback.error) throw fallback.error;
        paidQuotesData = fallback.data || [];
      } else {
        throw paidQuotesRes.error;
      }
    }

    const paidStatusSet = new Set([
      'paid',
      'charged',
      'cobrado',
      'cobrados',
      'pagado',
      'pagados',
      'completed',
      'finalizado',
    ]);
    const paidQuotes = paidQuotesData.filter((quote) =>
      paidStatusSet.has(String(quote.status || '').toLowerCase())
    );
    const paidQuotesTotal = paidQuotes.reduce((sum, quote) => sum + parseAmount(quote.total_amount), 0);
    const paidQuotesCount = paidQuotes.length;

    const paymentRows = paymentRowsRes.data || [];
    const revenueTotal = paymentRows.reduce((sum, row) => {
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) {
        return sum;
      }
      return sum + parseAmount(row.amount);
    }, 0);

    const visitsLast7 = (analyticsViewsRes.data || []).length;
    const uniqueSessionsLast7 = new Set(
      (analyticsViewsRes.data || []).map((item: any) => item.session_id).filter(Boolean)
    ).size;
    const visitsLast24 = (analyticsViewsLast1Res.data || []).length;
    const uniqueSessionsLast24 = new Set(
      (analyticsViewsLast1Res.data || []).map((item: any) => item.session_id).filter(Boolean)
    ).size;

    const durationRows = analyticsDurationsRes.data || [];
    const screenMap = new Map<string, { totalMs: number; count: number }>();
    durationRows.forEach((row: any) => {
      const path = (row.path || '').toString();
      const duration = Number(row.duration_ms || 0);
      if (!path || !Number.isFinite(duration) || duration <= 0) return;
      const current = screenMap.get(path) || { totalMs: 0, count: 0 };
      current.totalMs += duration;
      current.count += 1;
      screenMap.set(path, current);
    });
    const topScreens = Array.from(screenMap.entries())
      .map(([path, stats]) => ({
        path,
        total_minutes: stats.totalMs / 1000 / 60,
        avg_seconds: stats.count ? stats.totalMs / 1000 / stats.count : 0,
        views: stats.count,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 5);

    const activeSubsRows = activeSubsDataRes.data || [];
    const mrr = activeSubsRows.reduce((sum, row: any) => {
      const price = parseAmount(row?.plan?.price_ars);
      const periodMonths = Number(row?.plan?.period_months || 1);
      if (!price || !periodMonths) return sum;
      return sum + price / periodMonths;
    }, 0);
    const arr = mrr * 12;

    const revenueUserIds = new Set<string>();
    paidQuotes.forEach((quote: any) => {
      if (quote?.user_id) revenueUserIds.add(quote.user_id);
    });
    paymentRows.forEach((row: any) => {
      if (!row?.user_id) return;
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) return;
      revenueUserIds.add(row.user_id);
    });

    const listsRaw = {
      supportMessages: recentMessagesRes.data || [],
      recentSubscriptions: recentSubsRes.data || [],
      recentPayments: recentPaymentsRes.data || [],
      pendingAccess: pendingAccessRes.data || [],
      recentUsers: usersRes.data?.users || [],
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
    listsRaw.recentUsers.forEach((user) => {
      if (user?.id) userIds.add(user.id);
    });
    revenueUserIds.forEach((id) => userIds.add(id));

    let profiles: Record<string, any> = {};
    if (userIds.size) {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, email, access_granted, city, coverage_area, address')
        .in('id', Array.from(userIds));
      if (profileError) throw profileError;
      profiles = (profileRows || []).reduce((acc: Record<string, any>, row) => {
        acc[row.id] = row;
        return acc;
      }, {});
    }

    let subscriptionsByUser: Record<string, any> = {};
    if (userIds.size) {
      const { data: subsRows, error: subsError } = await supabase
        .from('subscriptions')
        .select('user_id, status, current_period_end, plan:billing_plans(name, period_months, price_ars, is_partner)')
        .in('user_id', Array.from(userIds));
      if (subsError) throw subsError;
      subscriptionsByUser = (subsRows || []).reduce((acc: Record<string, any>, row) => {
        if (row.user_id && !acc[row.user_id]) {
          acc[row.user_id] = row;
        }
        return acc;
      }, {});
    }

    const getZoneLabel = (profile?: any | null) => {
      const city = (profile?.city || '').toString().trim();
      if (city) return city;
      const coverage = (profile?.coverage_area || '').toString().trim();
      if (coverage) return coverage;
      const address = (profile?.address || '').toString().trim();
      if (address) return address;
      return 'Sin zona';
    };

    const incomeByZoneMap = new Map<
      string,
      {
        zone: string;
        quotes_amount: number;
        subscriptions_amount: number;
        quotes_count: number;
        payments_count: number;
        users: Set<string>;
      }
    >();

    const ensureZone = (zone: string) => {
      if (!incomeByZoneMap.has(zone)) {
        incomeByZoneMap.set(zone, {
          zone,
          quotes_amount: 0,
          subscriptions_amount: 0,
          quotes_count: 0,
          payments_count: 0,
          users: new Set(),
        });
      }
      return incomeByZoneMap.get(zone)!;
    };

    paidQuotes.forEach((quote: any) => {
      const zone = getZoneLabel(profiles[quote.user_id]);
      const entry = ensureZone(zone);
      entry.quotes_amount += parseAmount(quote.total_amount);
      entry.quotes_count += 1;
      if (quote?.user_id) entry.users.add(quote.user_id);
    });

    paymentRows.forEach((row: any) => {
      if (row?.status && blockedPaymentStatuses.has(String(row.status).toLowerCase())) return;
      const zone = getZoneLabel(profiles[row.user_id]);
      const entry = ensureZone(zone);
      entry.subscriptions_amount += parseAmount(row.amount);
      entry.payments_count += 1;
      if (row?.user_id) entry.users.add(row.user_id);
    });

    const incomeByZone = Array.from(incomeByZoneMap.values())
      .map((item) => ({
        zone: item.zone,
        total_amount: item.quotes_amount + item.subscriptions_amount,
        quotes_amount: item.quotes_amount,
        subscriptions_amount: item.subscriptions_amount,
        quotes_count: item.quotes_count,
        payments_count: item.payments_count,
        users_count: item.users.size,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 12);

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
        mrr,
        arr,
        visitsLast7,
        uniqueSessionsLast7,
        visitsLast24,
        uniqueSessionsLast24,
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
        recentUsers: listsRaw.recentUsers.map((user) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          profile: profiles[user.id] || null,
          subscription: subscriptionsByUser[user.id] || null,
        })),
        incomeByZone,
        topScreens,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Admin query failed' }, { status: 500 });
  }
}
