import { supabase } from '../lib/supabase';
import { getWebApiUrl } from '../utils/config';

export type ClientResponse = {
  id: string;
  technicianId: string;
  technicianName: string;
  specialty: string;
  phone: string;
  priceArs: number | null;
  etaHours: number | null;
  responseType: 'application' | 'direct_quote' | null | string;
  responseMessage: string;
  visitEtaHours: number | null;
  quoteStatus: 'pending' | 'submitted' | 'accepted' | 'rejected' | string;
  rating: number | null;
  submittedAt: string | null;
};

export type ClientTimelineEvent = {
  id: string;
  at: string;
  label: string;
};

export type ClientRequestFeedback = {
  id: string;
  quoteId: string | null;
  matchId: string | null;
  technicianId: string | null;
  technicianName: string;
  rating: number;
  comment: string;
  isPublic: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ClientRequest = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string;
  province: string;
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
  photoUrls: string[];
  responses: ClientResponse[];
  quotes: ClientResponse[];
  timeline: ClientTimelineEvent[];
  feedbackAllowed: boolean;
  feedback: ClientRequestFeedback | null;
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

export type ClientNearbyTechnician = {
  id: string;
  name: string;
  phone: string | null;
  city: string;
  specialty: string;
  rating: number | null;
  available_now: boolean;
  distance_km: number;
  lat: number;
  lng: number;
  address: string;
};

export type ClientNearbyTechniciansPayload = {
  center: {
    lat: number;
    lng: number;
    label: string;
    source: 'request_geo' | 'request_address' | 'profile' | 'fallback' | string;
    radius_km: number;
  };
  technicians: ClientNearbyTechnician[];
  warning?: string | null;
  stats?: {
    loaded_profiles?: number;
    visible?: number;
    geocoded_source?: number;
  };
};

export type ClientTechniciansMapTechnician = {
  id: string;
  name: string;
  phone: string | null;
  city: string;
  specialty: string;
  rating: number | null;
  available_now: boolean;
  lat: number;
  lng: number;
  address: string;
  geo_source: 'service' | 'profile' | string;
};

export type ClientTechniciansMapPayload = {
  center: {
    lat: number;
    lng: number;
    label: string;
    source: 'country' | string;
  };
  technicians: ClientTechniciansMapTechnician[];
  warning?: string | null;
  stats?: {
    loaded_profiles?: number;
    visible?: number;
    available_now?: number;
    cities?: number;
    missing_geo?: number;
  };
};

export type ClientTechnicianProfile = {
  id: string;
  name: string;
  business_name: string | null;
  full_name: string | null;
  phone: string | null;
  city: string;
  specialty: string;
  rating: number | null;
  available_now: boolean;
  address: string;
  coverage_area: string | null;
  company_logo_url: string | null;
  avatar_url: string | null;
  working_hours_label: string;
  public_reviews_count: number;
  completed_jobs_total: number;
  public_likes_count: number;
  references_summary: string | null;
  client_recommendations: string | null;
  achievement_badges: string[];
  instagram_profile_url: string | null;
  facebook_profile_url: string | null;
  instagram_post_url: string | null;
  facebook_post_url: string | null;
  work_photo_urls: string[];
  recent_works: ClientTechnicianRecentWork[];
  reviews: ClientTechnicianReview[];
  lat: number | null;
  lng: number | null;
  geo_source: 'service' | 'profile' | string | null;
};

export type ClientTechnicianRecentWork = {
  id: string;
  title: string;
  client_name: string | null;
  location_label: string | null;
  status: string | null;
  happened_at: string | null;
};

export type ClientTechnicianReview = {
  id: string;
  author: string;
  text: string;
};

export type ClientTechnicianProfilePayload = {
  technician: ClientTechnicianProfile;
};

export type ClientTechnicianProfileLikeState = {
  profileId: string;
  likesCount: number;
  liked: boolean;
};

type ApiErrorPayload = {
  error?: string;
};

export type CreateClientRequestInput = {
  title: string;
  category: string;
  address: string;
  city: string;
  province?: string;
  description: string;
  urgency: 'baja' | 'media' | 'alta';
  preferredWindow?: string;
  mode: 'marketplace' | 'direct';
  radiusKm?: number;
  locationLat?: number;
  locationLng?: number;
  photoUrls?: string[];
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

const normalizeNetworkError = (error: unknown, fallback: string) => {
  const message = String((error as any)?.message || '').trim();
  const normalized = message.toLowerCase();
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return fallback;
  }
  return message || fallback;
};

const requestApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(getWebApiUrl(path), {
      ...init,
      headers,
    });
  } catch (error) {
    throw new Error(normalizeNetworkError(error, 'No pudimos conectar con UrbanFix. Verifica tu internet y reintenta.'));
  }

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

export const fetchClientNearbyTechnicians = async (radiusKm = 20) => {
  const safeRadius = Math.max(5, Math.min(100, Math.round(Number(radiusKm) || 20)));
  return requestApi<ClientNearbyTechniciansPayload>(`/api/client/technicians/nearby?radiusKm=${safeRadius}`, {
    method: 'GET',
  });
};

export const fetchClientTechniciansMap = async () =>
  requestApi<ClientTechniciansMapPayload>('/api/client/technicians/map', {
    method: 'GET',
  });

export const fetchClientTechnicianProfile = async (technicianId: string) => {
  const safeTechnicianId = String(technicianId || '').trim();
  if (!safeTechnicianId) {
    throw new Error('Tecnico invalido.');
  }

  return requestApi<ClientTechnicianProfilePayload>(`/api/client/technicians/${safeTechnicianId}`, {
    method: 'GET',
  });
};

export const fetchTechnicianProfileLikes = async (technicianId: string) => {
  const safeTechnicianId = String(technicianId || '').trim();
  if (!safeTechnicianId) {
    throw new Error('Tecnico invalido.');
  }

  return requestApi<ClientTechnicianProfileLikeState>(`/api/tecnicos/${safeTechnicianId}/likes`, {
    method: 'GET',
  });
};

export const toggleTechnicianProfileLike = async (technicianId: string) => {
  const safeTechnicianId = String(technicianId || '').trim();
  if (!safeTechnicianId) {
    throw new Error('Tecnico invalido.');
  }

  return requestApi<ClientTechnicianProfileLikeState>(`/api/tecnicos/${safeTechnicianId}/likes`, {
    method: 'POST',
  });
};

