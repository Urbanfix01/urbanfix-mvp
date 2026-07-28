import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase } from '@/app/api/admin/_shared/auth';
import { applyLaborPriceIndexUpdate, LaborPriceUpdateError } from '@/lib/labor-price-index-update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isAuthorizedCronRequest = (request: NextRequest) => {
  const secret = (process.env.CRON_SECRET || '').trim();
  const authHeader = request.headers.get('authorization') || '';

  if (secret) return authHeader === `Bearer ${secret}`;

  return process.env.NODE_ENV !== 'production';
};

const runCron = async (request: NextRequest) => {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  try {
    const result = await applyLaborPriceIndexUpdate({
      supabase,
      createdBy: null,
      notify: true,
      alreadyAppliedMode: 'skip',
    });

    return NextResponse.json({
      ok: true,
      mode: 'automatic',
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'No se pudo ejecutar la automatizacion INDEC.',
      },
      { status: error instanceof LaborPriceUpdateError ? error.status : 500 }
    );
  }
};

export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}
