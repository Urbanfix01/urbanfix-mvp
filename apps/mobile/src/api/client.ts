import { supabase } from '../lib/supabase';
import { getWebApiUrl } from '../utils/config';

export type ClientQuote = {
  id: string;
  technicianId: string;
  technicianName: string;
  specialty: string;
  phone: string;
  priceArs: number | null;
  etaHours: number | null;
  quoteStatus: 'pending' | 'submitted' | 'accepted' | 'rejected' | string;
  rating: number | null;
};

export type ClientTimelineEvent = {
  id: string;
  at: string;
  label: string;
};

export type ClientRequest = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string;
  description: string;
  urgency: 'baja' | 'media' | 'alta' | string;
  preferredWindow: string;
  mode: 'marketplace' | 'direct' | string;
  status: string;
  updatedAt: string;
  targetTechId: string | null;
  targetTechName: string | null;
  targetTechPhone: string | null;
  assignedTechId: string | null;
  assignedTechName: string | null;
  assignedTechPhone: string | null;
  directExpiresAt: string | null;
  selectedQuoteId: string | null;
  quotes: ClientQuote[];
  timeline: ClientTimelineEvent[];
};

export type KnownTechnician = {
  id: string;
  name: string;
  phone: string;
  specialty?: string | null;
  rating?: number | null;
  lastJobAt?: string | null;
};

export type ClientWorkspacePayload = {
  requests: ClientRequest[];
  knownTechnicians: KnownTechnician[];
  warning?: string | null;
  request?: unknown;
  matches?: unknown[];
};

type ApiErrorPayload = {
  error?: string;
};

export type CreateClientRequestInput = {
  title: string;
  category: string;
  address: string;
  city: string;
  description: string;
  urgency: 'baja' | 'media' | 'alta';
  preferredWindow?: string;
  mode: 'marketplace' | 'direct';
  radiusKm?: number;
  locationLat?: number;
  locationLng?: number;
  targetTechnicianId?: string;
  targetTechnicianName?: string;
  targetTechnicianPhone?: string;
};

const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || '';
  if (!token) {
    throw new Error('Sesion expirada. Inicia sesion nuevamente.');
  }
  return token;
};

const parseApiError = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const value = (payload as ApiErrorPayload).error;
    const text = String(value || '').trim();
    if (text) return text;
  }
  return fallback;
};

const requestApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(getWebApiUrl(path), {
    ...init,
    headers,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(parseApiError(payload, 'No pudimos procesar la solicitud del cliente.'));
  }

  return payload as T;
};

export const fetchClientWorkspace = async () =>
  requestApi<ClientWorkspacePayload>('/api/client/requests', { method: 'GET' });

export const createClientRequest = async (input: CreateClientRequestInput) =>
  requestApi<ClientWorkspacePayload>('/api/client/requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const patchClientRequest = async (requestId: string, payload: Record<string, unknown>) => {
  const safeRequestId = String(requestId || '').trim();
  if (!safeRequestId) {
    throw new Error('Solicitud invalida.');
  }

  return requestApi<ClientWorkspacePayload>(`/api/client/requests/${safeRequestId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

