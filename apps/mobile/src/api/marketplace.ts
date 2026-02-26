import { supabase } from '../lib/supabase';
import { getWebApiUrl } from '../utils/config';

export type NearbyRequest = {
  id: string;
  title: string;
  category: string;
  city: string;
  address: string;
  description: string;
  urgency: 'baja' | 'media' | 'alta';
  preferred_window: string | null;
  status: string;
  mode: 'marketplace' | 'direct';
  created_at: string;
  distance_km: number;
  match_radius_km: number;
  location_lat: number;
  location_lng: number;
  my_quote_status: 'pending' | 'submitted' | 'accepted' | 'rejected' | null;
  my_price_ars: number | null;
  my_eta_hours: number | null;
  my_quote_updated_at: string | null;
};

export type NearbyRequestsPayload = {
  requests: NearbyRequest[];
  technician: {
    radius_km: number;
    within_working_hours: boolean;
    working_hours_label: string;
    service_lat?: number;
    service_lng?: number;
  };
  warning?: string;
};

type OfferPayload = {
  request: {
    id: string;
    status: string;
    my_quote_status: 'submitted';
    my_price_ars: number;
    my_eta_hours: number;
    my_quote_updated_at: string;
  };
  message?: string;
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
    const value = (payload as { error?: unknown }).error;
    const errorText = String(value || '').trim();
    if (errorText) return errorText;
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
    throw new Error(parseApiError(payload, 'No pudimos procesar la solicitud.'));
  }

  return payload as T;
};

export const fetchNearbyRequests = async () => {
  return requestApi<NearbyRequestsPayload>('/api/tecnico/requests/nearby', {
    method: 'GET',
  });
};

export const submitOffer = async (requestId: string, priceArs: number, etaHours: number) => {
  const safeRequestId = String(requestId || '').trim();
  if (!safeRequestId) {
    throw new Error('Solicitud invalida.');
  }
  return requestApi<OfferPayload>(`/api/tecnico/requests/${safeRequestId}/offer`, {
    method: 'POST',
    body: JSON.stringify({
      price_ars: priceArs,
      eta_hours: etaHours,
    }),
  });
};
