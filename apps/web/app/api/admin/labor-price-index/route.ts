import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase as supabase, ensureAdmin, getAuthUser } from '@/app/api/admin/_shared/auth';
import { readLimitedJsonBody } from '@/lib/api/read-json-body';
import { fetchIndecLaborIndex, type IndecLaborIndex } from '@/lib/indec-labor-index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LaborItemRow = {
  id: string;
  name: string;
  suggested_price?: number | null;
  category?: string | null;
  source_ref?: string | null;
  active?: boolean | null;
};

const SOURCE_SERIES = 'icc_mano_obra';

const isMissingRelationError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('relation');
};

const isUniqueError = (error: any) => error?.code === '23505';

const getCandidateItems = async () => {
  if (!supabase) return { items: [] as LaborItemRow[], error: null as any };

  const selectColumns = 'id,name,suggested_price,category,source_ref,active';
  const { data, error } = await supabase
    .from('master_items')
    .select(selectColumns)
    .eq('type', 'labor')
    .eq('active', true)
    .not('suggested_price', 'is', null)
    .gt('suggested_price', 0)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .limit(5000);

  if (!error) return { items: (data || []) as LaborItemRow[], error: null };

  const message = String(error?.message || '').toLowerCase();
  if (!message.includes('active')) return { items: [], error };

  const retry = await supabase
    .from('master_items')
    .select('id,name,suggested_price,category,source_ref')
    .eq('type', 'labor')
    .not('suggested_price', 'is', null)
    .gt('suggested_price', 0)
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .limit(5000);

  return { items: (retry.data || []) as LaborItemRow[], error: retry.error };
};

const buildPreview = (index: IndecLaborIndex, items: LaborItemRow[]) => {
  const preview = items.slice(0, 8).map((item) => {
    const currentPrice = Number(item.suggested_price || 0);
    const suggestedPrice = Math.round(currentPrice * index.multiplier);
    return {
      id: item.id,
      name: item.name,
      category: item.category || null,
      currentPrice,
      suggestedPrice,
      delta: suggestedPrice - currentPrice,
    };
  });

  const currentTotal = items.reduce((sum, item) => sum + Number(item.suggested_price || 0), 0);
  const suggestedTotal = Math.round(currentTotal * index.multiplier);

  return {
    totals: {
      candidateCount: items.length,
      currentTotal,
      suggestedTotal,
      deltaTotal: suggestedTotal - currentTotal,
    },
    preview,
  };
};

const getAppliedState = async (index: IndecLaborIndex) => {
  if (!supabase) {
    return { auditAvailable: false, alreadyApplied: false, appliedAt: null as string | null };
  }

  const { data, error } = await supabase
    .from('labor_price_index_updates')
    .select('id,applied_at')
    .eq('source_series', SOURCE_SERIES)
    .eq('period_label', index.periodLabel)
    .eq('status', 'applied')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { auditAvailable: false, alreadyApplied: false, appliedAt: null as string | null };
    }
    throw error;
  }

  return {
    auditAvailable: true,
    alreadyApplied: Boolean(data?.id),
    appliedAt: data?.applied_at || null,
  };
};

const getPayload = async () => {
  const index = await fetchIndecLaborIndex();
  const { items, error } = await getCandidateItems();
  if (error) throw error;
  const appliedState = await getAppliedState(index);
  return {
    index,
    ...buildPreview(index, items),
    ...appliedState,
  };
};

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
    const payload = await getPayload();
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
    const index = await fetchIndecLaborIndex();
    if (bodyResult.body.confirmPeriodLabel && bodyResult.body.confirmPeriodLabel !== index.periodLabel) {
      return NextResponse.json({ error: 'El periodo de INDEC cambio. Volve a revisar antes de aplicar.' }, { status: 409 });
    }

    const { items, error } = await getCandidateItems();
    if (error) throw error;
    if (!items.length) {
      return NextResponse.json({ error: 'No hay items activos con precio para actualizar.' }, { status: 409 });
    }

    const appliedState = await getAppliedState(index);
    if (!appliedState.auditAvailable) {
      return NextResponse.json(
        { error: 'Falta aplicar la migracion de historial INDEC antes de actualizar precios.' },
        { status: 409 }
      );
    }
    if (appliedState.auditAvailable && appliedState.alreadyApplied) {
      return NextResponse.json({ error: `El ajuste ${index.periodLabel} ya fue aplicado.` }, { status: 409 });
    }

    let updateId: string | null = null;
    const auditAvailable = appliedState.auditAvailable;

    if (auditAvailable) {
      const { data: updateData, error: updateError } = await supabase!
        .from('labor_price_index_updates')
        .insert({
          source: 'INDEC',
          source_url: index.downloadUrl,
          source_series: SOURCE_SERIES,
          period_label: index.periodLabel,
          previous_period_label: index.previousPeriodLabel,
          index_value: index.latestIndex,
          previous_index_value: index.previousIndex,
          monthly_percent: index.monthlyPercent,
          multiplier: index.multiplier,
          status: 'applying',
          item_count: items.length,
          created_by: auth.user.id,
        })
        .select('id')
        .maybeSingle();

      if (updateError) {
        if (isMissingRelationError(updateError)) {
          return NextResponse.json(
            { error: 'Falta aplicar la migracion de historial INDEC antes de actualizar precios.' },
            { status: 409 }
          );
        } else if (isUniqueError(updateError)) {
          return NextResponse.json({ error: `El ajuste ${index.periodLabel} ya fue aplicado.` }, { status: 409 });
        } else {
          throw updateError;
        }
      } else {
        updateId = updateData?.id || null;
      }
    }

    const updatedItems: Array<{ id: string; oldPrice: number; newPrice: number }> = [];
    const failedItems: Array<{ id: string; name: string; error: string }> = [];

    for (const item of items) {
      const oldPrice = Number(item.suggested_price || 0);
      const newPrice = Math.round(oldPrice * index.multiplier);

      const { error: itemError } = await supabase!
        .from('master_items')
        .update({ suggested_price: newPrice })
        .eq('id', item.id);

      if (itemError) {
        failedItems.push({ id: item.id, name: item.name, error: itemError.message });
        continue;
      }

      updatedItems.push({ id: item.id, oldPrice, newPrice });

      if (auditAvailable && updateId) {
        const { error: auditItemError } = await supabase!
          .from('labor_price_item_updates')
          .insert({
            update_id: updateId,
            master_item_id: item.id,
            old_price: oldPrice,
            suggested_price: newPrice,
            applied_price: newPrice,
            applied_at: new Date().toISOString(),
          });
        if (auditItemError && !isMissingRelationError(auditItemError)) {
          failedItems.push({ id: item.id, name: item.name, error: auditItemError.message });
        }
      }
    }

    if (auditAvailable && updateId) {
      await supabase!
        .from('labor_price_index_updates')
        .update({
          status: failedItems.length ? (updatedItems.length ? 'partial' : 'failed') : 'applied',
          item_count: updatedItems.length,
          applied_at: updatedItems.length ? new Date().toISOString() : null,
        })
        .eq('id', updateId);
    }

    return NextResponse.json({
      index,
      updatedCount: updatedItems.length,
      failedCount: failedItems.length,
      failedItems: failedItems.slice(0, 10),
      auditAvailable,
      ...buildPreview(index, []),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo aplicar el ajuste INDEC.' },
      { status: 500 }
    );
  }
}
