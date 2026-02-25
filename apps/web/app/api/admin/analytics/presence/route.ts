import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

const getProfileLabel = (profile: any) =>
  profile?.business_name || profile?.full_name || profile?.email || 'Sin perfil';

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

  const params = request.nextUrl.searchParams;
  const minutes = Math.min(60, Math.max(1, Number(params.get('minutes') || 5)));
  const limit = Math.min(30, Math.max(5, Number(params.get('limit') || 12)));
  const listLimit = Math.max(limit, 20);

  const now = new Date();
  const onlineSince = new Date(now.getTime() - minutes * 60 * 1000);

  const [profilesRes, onlineCountRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, business_name, email, last_seen_at, last_seen_path')
      .order('last_seen_at', { ascending: false })
      .limit(listLimit),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_seen_at', onlineSince.toISOString()),
  ]);

  if (profilesRes.error || onlineCountRes.error) {
    return NextResponse.json(
      { error: profilesRes.error?.message || onlineCountRes.error?.message },
      { status: 500 }
    );
  }

  const recentUsers = (profilesRes.data || []).map((row: any) => {
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
    const isOnline = lastSeen ? lastSeen >= onlineSince : false;
    return {
      id: row.id,
      label: getProfileLabel(row),
      email: row.email || null,
      last_seen_at: row.last_seen_at,
      last_seen_path: row.last_seen_path || null,
      is_online: isOnline,
    };
  });

  const onlineUsers = recentUsers.filter((item) => item.is_online).slice(0, limit);

  return NextResponse.json({
    onlineCount: onlineCountRes.count || onlineUsers.length,
    onlineUsers,
    recentUsers,
    onlineWindowMinutes: minutes,
  });
}
