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
  match_radius_km: number | null;
  location_lat: number;
  location_lng: number;
  photo_urls: string[];
  my_quote_status: 'pending' | 'submitted' | 'accepted' | 'rejected' | null;
  my_response_type: 'application' | 'direct_quote' | null | string;
  my_response_message: string | null;
  my_visit_eta_hours: number | null;
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
    my_response_type: 'application' | 'direct_quote';
    my_response_message?: string | null;
    my_visit_eta_hours?: number | null;
    my_price_ars: number | null;
    my_eta_hours: number | null;
    my_quote_updated_at: string;
  };
  match?: {
    id: string | null;
  } | null;
  message?: string;
};

export type TechnicianDashboardBillingItem = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at?: string | null;
  scheduled_date?: string | null;
  source: 'marketplace';
};

type TechnicianDashboardBillingPayload = {
  items: TechnicianDashboardBillingItem[];
};

export type TechnicianPublicProfileStatusSummary = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  access_granted: boolean;
  profile_published: boolean;
  completed_jobs_total: number;
  public_reviews_count: number;
  company_logo_url: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export type TechnicianPublicProfileStatusPayload = {
  mode: 'current_profile' | 'recommended_profile';
  reason: 'published_current' | 'duplicate_unpublished_account' | 'unpublished_profile' | 'missing_profile';
  currentProfile: TechnicianPublicProfileStatusSummary | null;
  previewProfile: TechnicianPublicProfileStatusSummary | null;
  matchingProfilesCount: number;
  matchSignals: string[];
};

export type QuoteFeedbackLinkPayload = {
  ok: true;
  url: string;
  token: string;
  quoteId: string;
  alreadyReviewed: boolean;
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

export const fetchTechnicianDashboardBilling = async () => {
  return requestApi<TechnicianDashboardBillingPayload>('/api/tecnico/dashboard/billing', {
    method: 'GET',
  });
};

export const fetchTechnicianPublicProfileStatus = async () => {
  return requestApi<TechnicianPublicProfileStatusPayload>('/api/tecnico/profile-public-status', {
    method: 'GET',
  });
};

export const fetchQuoteFeedbackLink = async (quoteId: string) => {
  const safeQuoteId = String(quoteId || '').trim();
  if (!safeQuoteId) {
    throw new Error('Trabajo invalido.');
  }
  return requestApi<QuoteFeedbackLinkPayload>(`/api/tecnico/quotes/${safeQuoteId}/feedback-link`, {
    method: 'POST',
  });
};

export const submitOffer = async (
  requestId: string,
  priceArs: number,
  etaHours: number,
  quoteId?: string | null
) => {
  const safeRequestId = String(requestId || '').trim();
  if (!safeRequestId) {
    throw new Error('Solicitud invalida.');
  }
  return requestApi<OfferPayload>(`/api/tecnico/requests/${safeRequestId}/offer`, {
    method: 'POST',
    body: JSON.stringify({
      response_type: 'direct_quote',
      price_ars: priceArs,
      eta_hours: etaHours,
      quote_id: quoteId || null,
    }),
  });
};

export const submitRequestApplication = async (requestId: string, message: string, visitEtaHours: number) => {
  const safeRequestId = String(requestId || '').trim();
  if (!safeRequestId) {
    throw new Error('Solicitud invalida.');
  }
  return requestApi<OfferPayload>(`/api/tecnico/requests/${safeRequestId}/offer`, {
    method: 'POST',
    body: JSON.stringify({
      response_type: 'application',
      message,
      visit_eta_hours: visitEtaHours,
    }),
  });
};
