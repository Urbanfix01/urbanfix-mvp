import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

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
  const { data, error } = await supabase.from('beta_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error || !data) return false;
  return true;
};

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

