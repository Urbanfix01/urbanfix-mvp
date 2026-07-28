import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import {
  applyLaborPriceIndexUpdate,
  getLaborPriceIndexPayload,
  LaborPriceUpdateError,
} from '@/lib/labor-price-index-update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requireAdmin = async (request: NextRequest) => {
  if (!supabase) return { response: NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 }) };
  const user = await getAuthUser(request);
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const isAdmin = await ensureAdmin(user.id);
  if (!isAdmin) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user };
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const payload = await getLaborPriceIndexPayload(supabase);
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo consultar INDEC.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  const bodyResult = await readLimitedJsonBody<{ confirmPeriodLabel?: string }>(request, {
    maxBytes: 2 * 1024,
    allowEmpty: true,
  });
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status });
  }

  try {
    const payload = await applyLaborPriceIndexUpdate({
      supabase,
      confirmPeriodLabel: bodyResult.body.confirmPeriodLabel,
      createdBy: auth.user.id,
      notify: true,
      alreadyAppliedMode: 'error',
    });
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo aplicar el ajuste INDEC.' },
      { status: error instanceof LaborPriceUpdateError ? error.status : 500 }
    );
  }
}
