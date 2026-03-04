import { NextRequest, NextResponse } from 'next/server';
import { clientSupabase as supabase, getAuthUser } from '../../client/_shared/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Missing server config' }, { status: 500 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id, true);
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
