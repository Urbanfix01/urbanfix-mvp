import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

type ReviewCandidateRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  access_granted: boolean | null;
  profile_published: boolean | null;
  admin_review_status: string | null;
};

const toText = (value: unknown) => String(value || '').trim();

const normalizeEmail = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('@') ? normalized : '';
};

const hasLegacyValidAccessCandidate = (profile: ReviewCandidateRow) =>
  profile.access_granted !== true &&
  profile.profile_published === true &&
  Boolean(normalizeEmail(profile.email)) &&
  Boolean(toText(profile.business_name)) &&
  Boolean(toText(profile.phone)) &&
  Boolean(toText(profile.city));

const hasProfileSignal = (profile: ReviewCandidateRow) =>
  Boolean(
    normalizeEmail(profile.email) ||
      toText(profile.full_name) ||
      toText(profile.business_name) ||
      toText(profile.phone) ||
      toText(profile.city)
  );

const buildSignature = (profile: ReviewCandidateRow) =>
  [
    normalizeEmail(profile.email),
    toText(profile.full_name).toLowerCase(),
    toText(profile.business_name).toLowerCase(),
    toText(profile.phone),
    toText(profile.city).toLowerCase(),
  ].join('|');

const getMissingFieldLabels = (profile: ReviewCandidateRow) => {
  const missing: string[] = [];
  if (!normalizeEmail(profile.email)) missing.push('email');
  if (!toText(profile.business_name)) missing.push('negocio');
  if (!toText(profile.phone)) missing.push('teléfono');
  if (!toText(profile.city)) missing.push('ciudad');
  return missing;
};

export async function POST(request: NextRequest) {
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
    .from('profiles')
    .select(
      'id,email,full_name,business_name,phone,city,access_granted,profile_published,admin_review_status'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudieron leer perfiles incompletos.' }, { status: 500 });
  }

  const rows = (data || []) as ReviewCandidateRow[];
  const duplicateCounts = new Map<string, number>();
  rows.forEach((row) => {
    if (normalizeEmail(row.email)) return;
    const signature = buildSignature(row);
    if (!signature.replace(/\|/g, '')) return;
    duplicateCounts.set(signature, (duplicateCounts.get(signature) || 0) + 1);
  });

  const candidates = rows.filter((row) => {
    if (row.access_granted === true) return false;
    if (hasLegacyValidAccessCandidate(row)) return false;
    if (String(row.admin_review_status || '').toLowerCase() === 'pending') return false;
    if (!hasProfileSignal(row)) return false;

    const missingFields = getMissingFieldLabels(row);
    if (missingFields.length === 0) return false;

    const signature = buildSignature(row);
    if (!normalizeEmail(row.email) && signature.replace(/\|/g, '') && (duplicateCounts.get(signature) || 0) > 1) {
      return false;
    }

    return true;
  });

  if (!candidates.length) {
    return NextResponse.json({ ok: true, updatedCount: 0, updatedIds: [], updatedProfiles: [] });
  }

  const updatedProfiles: Array<{
    id: string;
    email: string | null;
    fullName: string | null;
    businessName: string | null;
    city: string | null;
    reason: string;
  }> = [];

  for (const candidate of candidates) {
    const reason = `Perfil incompleto. Faltan: ${getMissingFieldLabels(candidate).join(', ')}.`;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        admin_review_status: 'pending',
        admin_review_reason: reason,
        admin_review_marked_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'No se pudieron marcar perfiles para revisión.' }, { status: 500 });
    }

    updatedProfiles.push({
      id: candidate.id,
      email: candidate.email,
      fullName: candidate.full_name,
      businessName: candidate.business_name,
      city: candidate.city,
      reason,
    });
  }

  return NextResponse.json({
    ok: true,
    updatedCount: updatedProfiles.length,
    updatedIds: updatedProfiles.map((candidate) => candidate.id),
    updatedProfiles,
  });
}