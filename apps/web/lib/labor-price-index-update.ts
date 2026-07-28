import { fetchIndecLaborIndex, type IndecLaborIndex } from '@/lib/indec-labor-index';
import { notifyLaborPriceUpdate, type PriceUpdateAlertResult } from '@/lib/price-update-alerts';

export type LaborItemRow = {
  id: string;
  name: string;
  suggested_price?: number | null;
  category?: string | null;
  source_ref?: string | null;
  active?: boolean | null;
};

type LaborPriceSupabaseClient = {
  from: (table: string) => any;
  auth?: any;
};

export type LaborPriceApplyResult = {
  index: IndecLaborIndex;
  updatedCount: number;
  failedCount: number;
  failedItems: Array<{ id: string; name: string; error: string }>;
  auditAvailable: boolean;
  updateId: string | null;
  status: 'applied' | 'partial' | 'failed' | 'skipped';
  skippedReason?: string;
  alreadyApplied?: boolean;
  appliedAt?: string | null;
  alerts: PriceUpdateAlertResult | null;
  totals: {
    candidateCount: number;
    currentTotal: number;
    suggestedTotal: number;
    deltaTotal: number;
  };
  preview: Array<{
    id: string;
    name: string;
    category: string | null;
    currentPrice: number;
    suggestedPrice: number;
    delta: number;
  }>;
};

export class LaborPriceUpdateError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'LaborPriceUpdateError';
    this.status = status;
  }
}

const SOURCE_SERIES = 'icc_mano_obra';

export const isMissingRelationError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('relation');
};

const isUniqueError = (error: any) => error?.code === '23505';

export const getCandidateLaborItems = async (supabase: LaborPriceSupabaseClient | null) => {
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

export const buildLaborPricePreview = (index: IndecLaborIndex, items: LaborItemRow[]) => {
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

export const getLaborPriceAppliedState = async (
  supabase: LaborPriceSupabaseClient | null,
  index: IndecLaborIndex
) => {
  if (!supabase) {
    return { auditAvailable: false, alreadyApplied: false, appliedAt: null as string | null };
  }

  const { data, error } = await supabase
    .from('labor_price_index_updates')
    .select('id,status,applied_at')
    .eq('source_series', SOURCE_SERIES)
    .eq('period_label', index.periodLabel)
    .in('status', ['applying', 'applied', 'partial'])
    .order('created_at', { ascending: false })
    .limit(1)
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

export const getLaborPriceIndexPayload = async (supabase: LaborPriceSupabaseClient | null) => {
  const index = await fetchIndecLaborIndex();
  const { items, error } = await getCandidateLaborItems(supabase);
  if (error) throw error;
  const appliedState = await getLaborPriceAppliedState(supabase, index);
  return {
    index,
    ...buildLaborPricePreview(index, items),
    ...appliedState,
  };
};

export const applyLaborPriceIndexUpdate = async (params: {
  supabase: LaborPriceSupabaseClient | null;
  confirmPeriodLabel?: string;
  createdBy?: string | null;
  notify?: boolean;
  alreadyAppliedMode?: 'error' | 'skip';
}): Promise<LaborPriceApplyResult> => {
  const { supabase } = params;
  if (!supabase) {
    throw new LaborPriceUpdateError('Servicio no disponible.', 503);
  }

  const index = await fetchIndecLaborIndex();
  if (params.confirmPeriodLabel && params.confirmPeriodLabel !== index.periodLabel) {
    throw new LaborPriceUpdateError('El periodo de INDEC cambio. Volve a revisar antes de aplicar.', 409);
  }

  const { items, error } = await getCandidateLaborItems(supabase);
  if (error) throw error;
  if (!items.length) {
    throw new LaborPriceUpdateError('No hay items activos con precio para actualizar.', 409);
  }

  const appliedState = await getLaborPriceAppliedState(supabase, index);
  if (!appliedState.auditAvailable) {
    throw new LaborPriceUpdateError('Falta aplicar la migracion de historial INDEC antes de actualizar precios.', 409);
  }
  if (appliedState.alreadyApplied) {
    if (params.alreadyAppliedMode === 'skip') {
      return {
        index,
        updatedCount: 0,
        failedCount: 0,
        failedItems: [],
        auditAvailable: appliedState.auditAvailable,
        updateId: null,
        status: 'skipped',
        skippedReason: `El ajuste ${index.periodLabel} ya fue aplicado.`,
        alreadyApplied: true,
        appliedAt: appliedState.appliedAt,
        alerts: null,
        ...buildLaborPricePreview(index, []),
      };
    }
    throw new LaborPriceUpdateError(`El ajuste ${index.periodLabel} ya fue aplicado.`, 409);
  }

  const { data: updateData, error: updateError } = await supabase
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
      created_by: params.createdBy || null,
    })
    .select('id')
    .maybeSingle();

  if (updateError) {
    if (isMissingRelationError(updateError)) {
      throw new LaborPriceUpdateError('Falta aplicar la migracion de historial INDEC antes de actualizar precios.', 409);
    }
    if (isUniqueError(updateError)) {
      if (params.alreadyAppliedMode === 'skip') {
        return {
          index,
          updatedCount: 0,
          failedCount: 0,
          failedItems: [],
          auditAvailable: true,
          updateId: null,
          status: 'skipped',
          skippedReason: `El ajuste ${index.periodLabel} ya fue aplicado.`,
          alreadyApplied: true,
          appliedAt: null,
          alerts: null,
          ...buildLaborPricePreview(index, []),
        };
      }
      throw new LaborPriceUpdateError(`El ajuste ${index.periodLabel} ya fue aplicado.`, 409);
    }
    throw updateError;
  }

  const updateId = updateData?.id || null;
  const updatedItems: Array<{ id: string; oldPrice: number; newPrice: number }> = [];
  const failedItems: Array<{ id: string; name: string; error: string }> = [];

  for (const item of items) {
    const oldPrice = Number(item.suggested_price || 0);
    const newPrice = Math.round(oldPrice * index.multiplier);

    const { error: itemError } = await supabase.from('master_items').update({ suggested_price: newPrice }).eq('id', item.id);

    if (itemError) {
      failedItems.push({ id: item.id, name: item.name, error: itemError.message });
      continue;
    }

    updatedItems.push({ id: item.id, oldPrice, newPrice });

    if (updateId) {
      const { error: auditItemError } = await supabase.from('labor_price_item_updates').insert({
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

  const status: LaborPriceApplyResult['status'] = failedItems.length
    ? updatedItems.length
      ? 'partial'
      : 'failed'
    : 'applied';

  if (updateId) {
    await supabase
      .from('labor_price_index_updates')
      .update({
        status,
        item_count: updatedItems.length,
        applied_at: updatedItems.length ? new Date().toISOString() : null,
      })
      .eq('id', updateId);
  }

  let alerts: PriceUpdateAlertResult | null = null;
  if (params.notify !== false && updatedItems.length) {
    try {
      alerts = await notifyLaborPriceUpdate({
        supabase: supabase as any,
        index,
        updateId,
        updatedCount: updatedItems.length,
        failedCount: failedItems.length,
      });
    } catch (alertError: any) {
      alerts = {
        notificationCount: 0,
        notificationError: alertError?.message || 'No se pudieron crear las notificaciones.',
        emailConfigured: Boolean(process.env.RESEND_API_KEY && (process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL)),
        emailRecipientCount: 0,
        emailSentCount: 0,
        emailFailedCount: 0,
        emailSkippedCount: 0,
        emailError: alertError?.message || 'No se pudo enviar el aviso por mail.',
      };
    }
  }

  return {
    index,
    updatedCount: updatedItems.length,
    failedCount: failedItems.length,
    failedItems: failedItems.slice(0, 10),
    auditAvailable: true,
    updateId,
    status,
    alerts,
    ...buildLaborPricePreview(index, []),
  };
};
