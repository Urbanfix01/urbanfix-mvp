import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

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

  const { data, error } = await supabase
    .from('beta_support_messages')
    .select('user_id, body, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latestByUser = new Map<string, any>();
  (data || []).forEach((msg: any) => {
    if (!latestByUser.has(msg.user_id)) {
      latestByUser.set(msg.user_id, msg);
    }
  });

  const userIds = Array.from(latestByUser.keys());
  let profilesMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, email')
      .in('id', userIds);
    (profilesData || []).forEach((profile: any) => {
      profilesMap.set(profile.id, profile);
    });
  }

  const list = userIds.map((id) => {
    const profile = profilesMap.get(id);
    const label = profile?.business_name || profile?.full_name || profile?.email || id;
    return { userId: id, label, lastMessage: latestByUser.get(id) };
  });

  return NextResponse.json({ users: list });
}
