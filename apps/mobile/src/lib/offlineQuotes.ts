import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const OFFLINE_QUOTES_KEY = 'offline_quotes_pending_v1';
const REMOTE_QUOTES_CACHE_PREFIX = 'quotes_remote_cache_v1';

export type QuoteListItem = {
  id: string;
  client_name?: string | null;
  client_address?: string | null;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount?: number | null;
  status?: string | null;
  created_at: string;
  scheduled_date?: string | null;
};

export type QuoteItemPayload = {
  description: string;
  unit_price: number;
  quantity: number;
  metadata?: Record<string, unknown>;
};

export type OfflineQuoteData = {
  client_name: string;
  client_address: string;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount: number;
  discount_percent: number;
  tax_rate: number;
  status: string;
  scheduled_date?: string | null;
};

type OfflineQuoteDraft = {
  local_id: string;
  user_id: string;
  created_at: string;
  quote: OfflineQuoteData;
  items: QuoteItemPayload[];
};

type OfflineQuoteDetail = {
  id: string;
  client_name: string;
  client_address: string;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount: number;
  discount_percent: number;
  tax_rate: number;
  status: string;
  scheduled_date?: string | null;
  created_at: string;
  quote_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    metadata?: Record<string, unknown>;
  }>;
};

let syncInFlight: Promise<number> | null = null;

const getRemoteCacheKey = (userId: string) => `${REMOTE_QUOTES_CACHE_PREFIX}:${userId}`;

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch (_err) {
    return fallback;
  }
};

const readOfflineDrafts = async (): Promise<OfflineQuoteDraft[]> => {
  const raw = await AsyncStorage.getItem(OFFLINE_QUOTES_KEY);
  const drafts = safeParse<OfflineQuoteDraft[]>(raw, []);
  return Array.isArray(drafts) ? drafts : [];
};

const writeOfflineDrafts = async (drafts: OfflineQuoteDraft[]) => {
  await AsyncStorage.setItem(OFFLINE_QUOTES_KEY, JSON.stringify(drafts));
};

const toQuoteListItem = (draft: OfflineQuoteDraft): QuoteListItem => ({
  id: draft.local_id,
  client_name: draft.quote.client_name,
  client_address: draft.quote.client_address,
  address: draft.quote.address ?? draft.quote.client_address,
  location_address: draft.quote.location_address ?? draft.quote.client_address,
  location_lat: draft.quote.location_lat ?? null,
  location_lng: draft.quote.location_lng ?? null,
  total_amount: draft.quote.total_amount,
  status: draft.quote.status,
  created_at: draft.created_at,
  scheduled_date: draft.quote.scheduled_date ?? null,
});

const mergeQuotes = (remote: QuoteListItem[], pending: QuoteListItem[]) => {
  const map = new Map<string, QuoteListItem>();
  remote.forEach((item) => map.set(item.id, item));
  pending.forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
};

const readRemoteCache = async (userId: string): Promise<QuoteListItem[]> => {
  const raw = await AsyncStorage.getItem(getRemoteCacheKey(userId));
  const cached = safeParse<QuoteListItem[]>(raw, []);
  return Array.isArray(cached) ? cached : [];
};

const writeRemoteCache = async (userId: string, data: QuoteListItem[]) => {
  await AsyncStorage.setItem(getRemoteCacheKey(userId), JSON.stringify(data));
};

export const isLocalQuoteId = (id?: string | null) => Boolean(id && id.startsWith('local-'));

export const isLikelyOfflineError = (error: unknown) => {
  const message = String(
    (error as any)?.message ||
      (error as any)?.error_description ||
      (error as any)?.details ||
      error ||
      ''
  ).toLowerCase();

  if (!message) return false;

  return (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
};

export const getPendingQuoteListForUser = async (userId: string): Promise<QuoteListItem[]> => {
  const drafts = await readOfflineDrafts();
  return drafts.filter((draft) => draft.user_id === userId).map(toQuoteListItem);
};

export const queueOfflineQuoteDraft = async ({
  userId,
  quoteData,
  items,
}: {
  userId: string;
  quoteData: OfflineQuoteData;
  items: QuoteItemPayload[];
}): Promise<QuoteListItem> => {
  const drafts = await readOfflineDrafts();
  const now = new Date().toISOString();
  const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const nextDraft: OfflineQuoteDraft = {
    local_id: localId,
    user_id: userId,
    created_at: now,
    quote: {
      ...quoteData,
      location_address: quoteData.location_address ?? quoteData.client_address,
      address: quoteData.address ?? quoteData.client_address,
      location_lat: quoteData.location_lat ?? null,
      location_lng: quoteData.location_lng ?? null,
      scheduled_date: quoteData.scheduled_date ?? null,
    },
    items,
  };

  drafts.unshift(nextDraft);
  await writeOfflineDrafts(drafts);
  return toQuoteListItem(nextDraft);
};

export const updateOfflineQuoteDraft = async ({
  userId,
  localId,
  quoteData,
  items,
}: {
  userId: string;
  localId: string;
  quoteData: OfflineQuoteData;
  items: QuoteItemPayload[];
}): Promise<QuoteListItem | null> => {
  const drafts = await readOfflineDrafts();
  const index = drafts.findIndex((draft) => draft.user_id === userId && draft.local_id === localId);
  if (index < 0) return null;

  const existing = drafts[index];
  const updated: OfflineQuoteDraft = {
    ...existing,
    quote: {
      ...quoteData,
      location_address: quoteData.location_address ?? quoteData.client_address,
      address: quoteData.address ?? quoteData.client_address,
      location_lat: quoteData.location_lat ?? null,
      location_lng: quoteData.location_lng ?? null,
      scheduled_date: quoteData.scheduled_date ?? null,
    },
    items,
  };

  drafts[index] = updated;
  await writeOfflineDrafts(drafts);
  return toQuoteListItem(updated);
};

export const updateOfflineQuoteSchedule = async ({
  userId,
  localId,
  scheduledDate,
}: {
  userId: string;
  localId: string;
  scheduledDate: string | null;
}): Promise<QuoteListItem | null> => {
  const drafts = await readOfflineDrafts();
  const index = drafts.findIndex((draft) => draft.user_id === userId && draft.local_id === localId);
  if (index < 0) return null;

  const existing = drafts[index];
  const updated: OfflineQuoteDraft = {
    ...existing,
    quote: {
      ...existing.quote,
      scheduled_date: scheduledDate,
    },
  };

  drafts[index] = updated;
  await writeOfflineDrafts(drafts);
  return toQuoteListItem(updated);
};

export const updateOfflineQuoteStatus = async ({
  userId,
  localId,
  status,
}: {
  userId: string;
  localId: string;
  status: string;
}): Promise<QuoteListItem | null> => {
  const drafts = await readOfflineDrafts();
  const index = drafts.findIndex((draft) => draft.user_id === userId && draft.local_id === localId);
  if (index < 0) return null;

  const existing = drafts[index];
  const updated: OfflineQuoteDraft = {
    ...existing,
    quote: {
      ...existing.quote,
      status,
    },
  };

  drafts[index] = updated;
  await writeOfflineDrafts(drafts);
  return toQuoteListItem(updated);
};

export const deleteOfflineQuoteDraft = async (localId: string, userId?: string) => {
  const drafts = await readOfflineDrafts();
  const filtered = drafts.filter((draft) =>
    userId ? !(draft.local_id === localId && draft.user_id === userId) : draft.local_id !== localId
  );
  await writeOfflineDrafts(filtered);
};

export const getOfflineQuoteDetail = async (
  localId: string,
  userId?: string
): Promise<OfflineQuoteDetail | null> => {
  const drafts = await readOfflineDrafts();
  const draft = drafts.find((item) =>
    userId ? item.local_id === localId && item.user_id === userId : item.local_id === localId
  );

  if (!draft) return null;

  return {
    id: draft.local_id,
    client_name: draft.quote.client_name,
    client_address: draft.quote.client_address,
    address: draft.quote.address ?? draft.quote.client_address,
    location_address: draft.quote.location_address ?? draft.quote.client_address,
    location_lat: draft.quote.location_lat ?? null,
    location_lng: draft.quote.location_lng ?? null,
    total_amount: draft.quote.total_amount,
    discount_percent: draft.quote.discount_percent,
    tax_rate: draft.quote.tax_rate,
    status: draft.quote.status,
    scheduled_date: draft.quote.scheduled_date ?? null,
    created_at: draft.created_at,
    quote_items: draft.items.map((item, index) => ({
      id: `${draft.local_id}-item-${index}`,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      metadata: item.metadata,
    })),
  };
};

const syncPendingQuotesInternal = async (userId: string) => {
  const drafts = await readOfflineDrafts();
  if (!drafts.length) return 0;

  const mine = drafts.filter((draft) => draft.user_id === userId);
  if (!mine.length) return 0;

  let pending = [...drafts];
  let syncedCount = 0;

  for (const draft of mine) {
    try {
      const { data: inserted, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          ...draft.quote,
          user_id: userId,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const payload = draft.items.map((item) => ({
        quote_id: inserted.id,
        description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        metadata: item.metadata || {},
      }));

      if (payload.length > 0) {
        const { error: itemsError } = await supabase.from('quote_items').insert(payload);
        if (itemsError) throw itemsError;
      }

      pending = pending.filter((item) => !(item.local_id === draft.local_id && item.user_id === draft.user_id));
      syncedCount += 1;
    } catch (error) {
      if (isLikelyOfflineError(error)) break;
      break;
    }
  }

  await writeOfflineDrafts(pending);
  return syncedCount;
};

export const syncPendingQuotesForUser = async (userId: string) => {
  if (syncInFlight) return syncInFlight;
  syncInFlight = syncPendingQuotesInternal(userId).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
};

export const fetchQuotesWithOffline = async (userId: string): Promise<QuoteListItem[]> => {
  await syncPendingQuotesForUser(userId);
  const pending = await getPendingQuoteListForUser(userId);

  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(
        'id, client_name, client_address, address, location_address, location_lat, location_lng, total_amount, status, created_at, scheduled_date'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const remote = (data || []) as QuoteListItem[];
    await writeRemoteCache(userId, remote);
    return mergeQuotes(remote, pending);
  } catch (error) {
    if (!isLikelyOfflineError(error)) throw error;
    const cached = await readRemoteCache(userId);
    return mergeQuotes(cached, pending);
  }
};

export const upsertQuoteInList = (quotes: QuoteListItem[], quote: QuoteListItem) => {
  const next = [quote, ...quotes.filter((item) => item.id !== quote.id)];
  return next.sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });
};
