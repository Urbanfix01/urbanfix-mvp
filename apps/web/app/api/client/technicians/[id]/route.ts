import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/app/api/client/_shared/auth';
import { getPublicTechnicianProfile } from '@/app/api/_shared/public-technician-profile';

const toText = (value: unknown) => String(value || '').trim();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = await context.params;
  const technicianId = toText(params?.id);
  const result = await getPublicTechnicianProfile(technicianId);

  if (result.error || !result.technician) {
    return NextResponse.json({ error: result.error || 'No se pudo cargar el perfil tecnico.' }, { status: result.status });
  }

  return NextResponse.json({ technician: result.technician });
}
