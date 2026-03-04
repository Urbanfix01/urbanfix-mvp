import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const defaultSupabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://jfqutuptbrgtwbofpawp.supabase.co';

  const parseTokenProjectUrl = (value: string) => {
    try {
      const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'));
      const issuer = String(payload?.iss || '').trim();
      if (!issuer.startsWith('https://') || !issuer.includes('.supabase.co')) return null;
      return issuer.replace(/\/auth\/v1\/?$/, '');
    } catch {
      return null;
    }
  };

  const projectUrl = parseTokenProjectUrl(token) || defaultSupabaseUrl;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcXV0dXB0YnJndHdib2ZwYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTU1MjksImV4cCI6MjA3OTE3MTUyOX0.EXQ89oqcIzwaNm3jQifb3fbYyRPsmr5udy0BFJLinUs';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const authClient = createClient(projectUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData?.user || null;
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await adminClient.auth.admin.deleteUser(user.id, true);
  if (error) {
    return NextResponse.json(
      { error: error.message || 'No se pudo eliminar la cuenta.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    deletedAt: new Date().toISOString(),
  });
}
