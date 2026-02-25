import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

const isMissingColumnError = (error: any, column: string) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist');
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

  const type = (request.nextUrl.searchParams.get('type') || '').trim() || 'labor';
  const onlyActive = request.nextUrl.searchParams.get('active') === 'true';

  const selectColumns = 'id,name,type,suggested_price,category,source_ref,active,created_at';
  let query = supabase.from('master_items').select(selectColumns).eq('type', type);
  if (onlyActive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query
    .order('active', { ascending: false })
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .limit(5000);

  if (error) {
    if (onlyActive && isMissingColumnError(error, 'active')) {
      const fallback = await supabase
        .from('master_items')
        .select('id,name,type,suggested_price,category,source_ref,created_at')
        .eq('type', type)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
        .limit(5000);
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      return NextResponse.json({ items: fallback.data || [] });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

