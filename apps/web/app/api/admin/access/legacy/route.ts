import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';

type LegacyCandidateRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  access_granted: boolean | null;
  profile_published: boolean | null;
};

const toText = (value: unknown) => String(value || '').trim();

const hasValidEmail = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('@');
};

const isLegacyValidProfile = (profile: LegacyCandidateRow) =>
  profile.access_granted !== true &&
  profile.profile_published === true &&
  hasValidEmail(profile.email) &&
  Boolean(toText(profile.business_name)) &&
  Boolean(toText(profile.phone)) &&
  Boolean(toText(profile.city));

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
    .select('id,email,full_name,business_name,phone,city,access_granted,profile_published')
    .eq('profile_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudieron leer perfiles legacy.' }, { status: 500 });
  }

  const candidates = ((data || []) as LegacyCandidateRow[]).filter(isLegacyValidProfile);
  if (!candidates.length) {
    return NextResponse.json({ ok: true, updatedCount: 0, updatedIds: [], updatedProfiles: [] });
  }

  const updatedAt = new Date().toISOString();
  const candidateIds = candidates.map((candidate) => candidate.id);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      access_granted: true,
      access_granted_at: updatedAt,
    })
    .in('id', candidateIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'No se pudieron habilitar perfiles legacy.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updatedCount: candidateIds.length,
    updatedIds: candidateIds,
    updatedProfiles: candidates.map((candidate) => ({
      id: candidate.id,
      email: candidate.email,
      fullName: candidate.full_name,
      businessName: candidate.business_name,
      city: candidate.city,
    })),
  });
}