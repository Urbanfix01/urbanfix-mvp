import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DELETE_CONFIRMATION = 'ELIMINAR';

const toText = (value: unknown) => String(value || '').trim();

const isAuthUserNotFoundError = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return message.includes('not found') || message.includes('not exist') || message.includes('no user');
};

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resolvedParams = await params;
  const technicianId = toText(resolvedParams?.id).toLowerCase();
  if (!UUID_PATTERN.test(technicianId)) {
    return NextResponse.json({ error: 'Invalid technician id' }, { status: 400 });
  }

  if (technicianId === user.id) {
    return NextResponse.json({ error: 'No podes eliminar tu propia cuenta admin desde este panel.' }, { status: 400 });
  }

  const bodyResult = await readLimitedJsonBody<Record<string, any>>(request, { maxBytes: 4 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const body = bodyResult.body;
  if (toText(body?.confirmation).toUpperCase() !== DELETE_CONFIRMATION || toText(body?.userId).toLowerCase() !== technicianId) {
    return NextResponse.json({ error: 'Confirmacion invalida para eliminar el perfil.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,business_name')
    .eq('id', technicianId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'No se pudo leer el perfil.' }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Perfil tecnico no encontrado.' }, { status: 404 });
  }

  const authDeleteResult = await supabase.auth.admin.deleteUser(technicianId);
  if (authDeleteResult.error && !isAuthUserNotFoundError(authDeleteResult.error)) {
    return NextResponse.json(
      { error: authDeleteResult.error.message || 'No se pudo eliminar la cuenta vinculada.' },
      { status: 500 }
    );
  }

  const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('id', technicianId);
  if (deleteProfileError) {
    return NextResponse.json({ error: deleteProfileError.message || 'No se pudo eliminar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedProfileId: technicianId,
    deletedAuthUser: !authDeleteResult.error,
    label: toText(profile.business_name) || toText(profile.full_name) || toText(profile.email) || technicianId,
  });
}
