import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';

type ProfileAccessRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  service_city: string | null;
  service_lat: number | string | null;
  service_lng: number | string | null;
  service_location_precision: string | null;
};

const toText = (value: unknown) => String(value || '').trim();

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getMissingApprovalFields = (profile: ProfileAccessRow) => {
  const missing: string[] = [];
  if (!toText(profile.full_name)) missing.push('nombre');
  if (!toText(profile.business_name)) missing.push('negocio');
  if (!toText(profile.email).includes('@') && !toText(profile.phone)) missing.push('mail o WhatsApp');
  if (!toText(profile.service_city || profile.city)) missing.push('localidad');
  if (
    toFiniteNumber(profile.service_lat) === null ||
    toFiniteNumber(profile.service_lng) === null ||
    toText(profile.service_location_precision).toLowerCase() !== 'exact'
  ) {
    missing.push('ubicacion exacta');
  }
  return missing;
};

const normalizeReviewStatus = (value: unknown) => {
  const status = toText(value).toLowerCase();
  return status === 'pending' || status === 'resolved' || status === 'dismissed' ? status : null;
};

const insertAccessNotification = async ({
  userId,
  type,
  title,
  body,
  data,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) => {
  if (!supabase) return;
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      data: data || {},
    });
  } catch {
    // The access change is the source of truth; notifications must not block admin moderation.
  }
};

export async function POST(request: NextRequest) {
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

  const bodyResult = await readLimitedJsonBody<Record<string, any>>(request, { maxBytes: 4 * 1024 });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }
  const body = bodyResult.body;

  const targetUserId = (body?.userId || '').toString();
  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const accessGranted = typeof body?.accessGranted === 'boolean' ? body.accessGranted : true;
  const profilePublished = typeof body?.profilePublished === 'boolean' ? body.profilePublished : undefined;
  const reviewStatus = normalizeReviewStatus(body?.reviewStatus);
  const reviewReason = toText(body?.reviewReason).slice(0, 700);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,email,full_name,business_name,phone,city,service_city,service_lat,service_lng,service_location_precision')
    .eq('id', targetUserId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'No se pudo leer el perfil.' }, { status: 500 });
  }

  if (accessGranted) {
    if (!profile) {
      return NextResponse.json({ error: 'Perfil tecnico no encontrado.' }, { status: 404 });
    }

    const missing = getMissingApprovalFields(profile as ProfileAccessRow);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Perfil incompleto para aprobar. Falta: ${missing.join(', ')}.`, missingFields: missing },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: targetUserId,
    access_granted: accessGranted,
    access_granted_at: accessGranted ? now : null,
  };

  if (typeof profilePublished === 'boolean') {
    payload.profile_published = profilePublished;
    payload.profile_published_at = profilePublished ? now : null;
  }

  if (accessGranted) {
    payload.admin_review_status = 'resolved';
    payload.admin_review_reason = null;
    payload.admin_review_marked_at = now;
  } else if (reviewStatus) {
    payload.admin_review_status = reviewStatus;
    payload.admin_review_reason =
      reviewReason ||
      (reviewStatus === 'pending'
        ? 'El perfil necesita correcciones antes de aprobarse.'
        : 'El perfil fue descartado en la revision admin.');
    payload.admin_review_marked_at = now;
  }

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (accessGranted) {
    await insertAccessNotification({
      userId: targetUserId,
      type: 'technician_profile_approved',
      title: 'Perfil aprobado',
      body: 'Tu perfil tecnico fue aprobado. Ya podes operar en UrbanFix.',
      data: { profile_published: profilePublished ?? null },
    });
  } else if (reviewStatus === 'pending') {
    await insertAccessNotification({
      userId: targetUserId,
      type: 'technician_profile_needs_changes',
      title: 'Perfil en revision',
      body: reviewReason || 'Necesitamos que revises algunos datos de tu perfil tecnico.',
      data: { review_status: reviewStatus },
    });
  } else if (reviewStatus === 'dismissed') {
    await insertAccessNotification({
      userId: targetUserId,
      type: 'technician_profile_rejected',
      title: 'Perfil no aprobado',
      body: reviewReason || 'Tu perfil no fue aprobado por el momento.',
      data: { review_status: reviewStatus },
    });
  }

  return NextResponse.json({
    ok: true,
    accessGranted,
    profilePublished: typeof profilePublished === 'boolean' ? profilePublished : null,
    reviewStatus: accessGranted ? 'resolved' : reviewStatus,
  });
}
