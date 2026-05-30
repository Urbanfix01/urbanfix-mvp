import { NextRequest } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase/server';

export const adminSupabase = getServiceRoleClient();

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token || token.length < 20) return null;
  return token;
};

export const getAuthUser = async (request: NextRequest) => {
  const token = getBearerToken(request);
  if (!token || !adminSupabase) return null;
  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error) return null;
  return data?.user || null;
};

export const ensureAdmin = async (userId: string) => {
  if (!adminSupabase) return false;
  const { data, error } = await adminSupabase
    .from('beta_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
};
