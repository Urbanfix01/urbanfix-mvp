import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const DELETE_CONFIRMATION = 'ELIMINAR';
const ACCOUNT_AUDIENCES = new Set(['cliente', 'empresa', 'tecnico']);

const toText = (value: unknown) => String(value || '').trim();

const isAuthUserNotFoundError = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return message.includes('not found') || message.includes('not exist') || message.includes('no user');
};

const extractMissingProfileColumn = (error: { code?: string; message?: string } | null | undefined) => {
  const message = String(error?.message || '');
  const code = String(error?.code || '');
  if (!message) return '';
  if (code !== 'PGRST204' && !message.toLowerCase().includes("column of 'profiles'")) return '';
  const match = message.match(/Could not find the '([^']+)' column of 'profiles'/i);
  return match?.[1] || '';
};

const upsertProfileWithSchemaFallback = async (payload: Record<string, unknown>) => {
  if (!supabase) return { error: new Error('Servicio no disponible.') };
  const attemptPayload: Record<string, unknown> = { ...payload };
  const maxAttempts = Math.max(1, Object.keys(attemptPayload).length + 1);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await supabase.from('profiles').upsert(attemptPayload, { onConflict: 'id' });
    if (!result.error) return result;

    const missingColumn = extractMissingProfileColumn(result.error);
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(attemptPayload, missingColumn)) {
      return result;
    }

    delete attemptPayload[missingColumn];
  }

  return supabase.from('profiles').upsert({ id: payload.id }, { onConflict: 'id' });
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const accountId = toText(resolvedParams?.id).toLowerCase();
  if (!UUID_PATTERN.test(accountId)) {
    return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
  }

  if (accountId === user.id) {
    return NextResponse.json({ error: 'No podes cambiar tu propia cuenta admin desde este panel.' }, { status: 400 });
  }

  const bodyResult = await readLimitedJsonBody<Record<string, any>>(request, { maxBytes: 4 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const body = bodyResult.body;
  const action = toText(body?.action);
  const targetAudience = toText(body?.targetAudience).toLowerCase();
  if (action !== 'change_audience' || !ACCOUNT_AUDIENCES.has(targetAudience)) {
    return NextResponse.json({ error: 'Accion invalida.' }, { status: 400 });
  }

  if (targetAudience !== 'tecnico') {
    return NextResponse.json({ error: 'Por ahora este panel solo permite pasar cuentas a tecnico.' }, { status: 400 });
  }

  const authUserResult = await supabase.auth.admin.getUserById(accountId);
  if (authUserResult.error || !authUserResult.data?.user) {
    return NextResponse.json(
      { error: authUserResult.error?.message || 'No se encontro la cuenta de acceso.' },
      { status: 404 }
    );
  }

  const authUser = authUserResult.data.user;
  const metadata = (authUser.user_metadata || {}) as Record<string, unknown>;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,business_name,phone')
    .eq('id', accountId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'No se pudo leer el perfil.' }, { status: 500 });
  }

  const nextMetadata = {
    ...metadata,
    user_type: 'tecnico',
    profile: 'tecnico',
    app_audience: 'tecnico',
    account_type: 'tecnico',
  };

  const updateAuthResult = await supabase.auth.admin.updateUserById(accountId, {
    user_metadata: nextMetadata,
  });

  if (updateAuthResult.error) {
    return NextResponse.json(
      { error: updateAuthResult.error.message || 'No se pudo cambiar el tipo de cuenta.' },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const profilePayload: Record<string, unknown> = {
    id: accountId,
    email: toText(profile?.email) || toText(authUser.email) || null,
    full_name: toText(profile?.full_name) || toText(metadata.full_name) || toText(metadata.name) || null,
    phone: toText(profile?.phone) || toText(metadata.phone) || null,
    access_granted: false,
    access_granted_at: null,
    profile_published: false,
    profile_published_at: null,
    admin_review_status: 'pending',
    admin_review_reason: 'Cuenta marcada como tecnico desde administracion.',
    admin_review_marked_at: now,
    updated_at: now,
  };

  const profileResult = await upsertProfileWithSchemaFallback(profilePayload);
  if (profileResult.error) {
    return NextResponse.json(
      { error: profileResult.error.message || 'Se cambio el acceso, pero no se pudo actualizar el perfil.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    accountId,
    audience: 'tecnico',
    label:
      toText(profile?.business_name) ||
      toText(profile?.full_name) ||
      toText(profile?.email) ||
      toText(authUser.email) ||
      accountId,
  });
}

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
  const accountId = toText(resolvedParams?.id).toLowerCase();
  if (!UUID_PATTERN.test(accountId)) {
    return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
  }

  if (accountId === user.id) {
    return NextResponse.json({ error: 'No podes eliminar tu propia cuenta admin desde este panel.' }, { status: 400 });
  }

  const bodyResult = await readLimitedJsonBody<Record<string, any>>(request, { maxBytes: 4 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  const body = bodyResult.body;
  if (toText(body?.confirmation).toUpperCase() !== DELETE_CONFIRMATION || toText(body?.userId).toLowerCase() !== accountId) {
    return NextResponse.json({ error: 'Confirmacion invalida para eliminar la cuenta.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,business_name')
    .eq('id', accountId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'No se pudo leer el perfil.' }, { status: 500 });
  }

  const authDeleteResult = await supabase.auth.admin.deleteUser(accountId);
  if (authDeleteResult.error && !isAuthUserNotFoundError(authDeleteResult.error)) {
    return NextResponse.json(
      { error: authDeleteResult.error.message || 'No se pudo eliminar la cuenta vinculada.' },
      { status: 500 }
    );
  }

  const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('id', accountId);
  if (deleteProfileError) {
    return NextResponse.json({ error: deleteProfileError.message || 'No se pudo eliminar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedAccountId: accountId,
    deletedAuthUser: !authDeleteResult.error,
    label: toText(profile?.business_name) || toText(profile?.full_name) || toText(profile?.email) || accountId,
  });
}
