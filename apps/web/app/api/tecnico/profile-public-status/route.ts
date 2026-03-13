import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/app/api/client/_shared/auth';
import { getTechnicianPublicProfileStatus } from '@/app/api/_shared/technician-public-profile-status';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await getTechnicianPublicProfileStatus(user.id, user.email || null);
  if (result.status !== 200) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    mode: result.mode,
    reason: result.reason,
    currentProfile: result.currentProfile,
    previewProfile: result.previewProfile,
    matchingProfilesCount: result.matchingProfilesCount,
    matchSignals: result.matchSignals,
  });
}
