'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase, supabaseConfigError } from '../../lib/supabase/supabase';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye, EyeOff, FilePlus, ImagePlus, Loader2, LockKeyhole, LogOut, Mail, MapPin, Settings, ShieldCheck, Store, User } from 'lucide-react';
import GoogleMark from '../../components/GoogleMark';
import PublicTopNav from '../../components/PublicTopNav';
import { buildMapLinks, buildOpenStreetMapEmbedUrl } from '../../lib/map-links';

type ClientRequestResponse = {
  id: string;
  technicianName: string;
  businessName: string | null;
  specialty: string;
  city: string;
  phone: string;
  responseType: string | null;
  responseMessage: string;
  visitEtaHours: number | null;
  priceArs: number | null;
  etaHours: number | null;
  quoteStatus: string;
  rating: number | null;
  reviewsCount: number;
  completedJobsTotal: number;
  submittedAt: string | null;
};

type ClientRequestRow = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string | null;
  description: string;
  urgency: string;
  status: string;
  mode: string;
  created_at: string;
  locationLat: number | null;
  locationLng: number | null;
  googleMapsHref: string;
  appleMapsHref: string;
  responses: ClientRequestResponse[];
  timeline: Array<{ id: string; at: string; label: string }>;
  assignedTechName: string | null;
  assignedTechPhone: string | null;
};

type ClientMapPoint = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  lat: number;
  lng: number;
  createdAt: string;
};

type CreateRequestForm = {
  title: string;
  category: string;
  address: string;
  city: string;
  description: string;
  urgency: 'baja' | 'media' | 'alta';
  preferredWindow: string;
  mode: 'marketplace' | 'direct';
  radiusKm: number;
  targetTechnicianId: string;
  targetTechnicianName: string;
  targetTechnicianPhone: string;
};

type ClientProfileForm = {
  fullName: string;
  phone: string;
  avatarUrl: string;
};

type NearbyTechnician = {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  city: string;
  zoneLabel: string | null;
  rating: number | null;
  distanceKm: number;
  availableNow: boolean;
  workingHoursLabel: string;
};

type AddressCandidate = {
  displayName: string;
  primaryLabel: string;
  secondaryLabel: string;
  accuracyLabel: string;
  locality: string;
  province: string;
  lat: number;
  lng: number;
  precision: 'exact' | 'approx';
};

const getAddressCandidateKey = (candidate: AddressCandidate) =>
  `${candidate.lat.toFixed(6)}:${candidate.lng.toFixed(6)}:${candidate.displayName}`;

type ClientWorkspaceView = 'request' | 'profile' | 'showcase' | 'map';

const defaultForm: CreateRequestForm = {
  title: '',
  category: '',
  address: '',
  city: '',
  description: '',
  urgency: 'media',
  preferredWindow: '',
  mode: 'marketplace',
  radiusKm: 20,
  targetTechnicianId: '',
  targetTechnicianName: '',
  targetTechnicianPhone: '',
};

const defaultClientProfileForm: ClientProfileForm = {
  fullName: '',
  phone: '',
  avatarUrl: '',
};

const requestSteps = [
  {
    id: 1,
    label: 'Problema',
    guide: 'Titulo, categoria y una descripcion corta.',
  },
  {
    id: 2,
    label: 'Ubicacion',
    guide: 'Direccion, ciudad y punto confirmado por validacion o GPS.',
  },
  {
    id: 3,
    label: 'Envio',
    guide: 'Urgencia, horario y modo de solicitud.',
  },
] as const;

const CREATE_REQUEST_INTENT = 'create-request';

const clientLoadingThemeStyles = {
  '--ui-bg': '#ECE9E2',
  '--ui-card': '#FFFFFF',
  '--ui-border': '#E2E8F0',
  '--ui-ink': '#0F172A',
  '--ui-muted': '#64748B',
  '--ui-accent': '#111827',
  '--ui-accent-soft': '#F5B942',
  '--ui-brand': '#2A0338',
  '--ui-brand-soft': '#F4ECF8',
  '--ui-brand-warm': '#FF8F1F',
} as React.CSSProperties;

const CLIENT_AUTH_FORM_VALIDATION_MESSAGES = [
  'Ingresa correo y contrasena.',
  'Ingresa un correo valido.',
  'La contrasena debe tener al menos 6 caracteres.',
  'Ingresa tu WhatsApp para crear tu perfil de cliente.',
] as const;

const getFriendlyClientAuthErrorMessage = (
  error: unknown,
  mode: 'login' | 'register' | 'recovery' | 'google'
) => {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  if (CLIENT_AUTH_FORM_VALIDATION_MESSAGES.includes(rawMessage as (typeof CLIENT_AUTH_FORM_VALIDATION_MESSAGES)[number])) {
    return rawMessage;
  }

  const normalizedMessage = rawMessage.toLowerCase();
  if (normalizedMessage.includes('invalid login credentials') || normalizedMessage.includes('invalid credentials')) {
    return 'Correo o contrasena incorrectos.';
  }
  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirma tu correo antes de ingresar.';
  }
  if (normalizedMessage.includes('already registered') || normalizedMessage.includes('user already exists')) {
    return 'Ese correo ya tiene cuenta. Ingresa o recupera la contrasena.';
  }
  if (normalizedMessage.includes('password should be at least') || normalizedMessage.includes('weak password')) {
    return 'La contrasena debe tener al menos 6 caracteres.';
  }
  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many')) {
    return 'Hay demasiados intentos. Espera un momento y vuelve a probar.';
  }
  if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return 'No pudimos conectar. Revisa tu conexion e intenta nuevamente.';
  }
  if (mode === 'google') {
    return 'No pudimos abrir el acceso con Google. Intenta nuevamente.';
  }
  if (mode === 'recovery') {
    return 'No pudimos enviar el correo de recuperacion.';
  }
  return mode === 'register'
    ? 'No pudimos crear la cuenta. Revisa los datos e intenta de nuevo.'
    : 'No pudimos ingresar. Revisa los datos e intenta de nuevo.';
};

const badgeByStatus = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'matched') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'published') return 'bg-sky-100 text-sky-700';
  if (normalized === 'direct_sent') return 'bg-indigo-100 text-indigo-700';
  if (normalized === 'completed') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-700';
};

const urgencyClass = (urgency: string) => {
  const normalized = urgency.toLowerCase();
  if (normalized === 'alta') return 'bg-rose-100 text-rose-700';
  if (normalized === 'media') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const responseStatusMeta = (status: string, responseType?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'accepted') return { label: 'Elegida', className: 'bg-emerald-100 text-emerald-700' };
  if (normalized === 'rejected') return { label: 'Rechazada', className: 'bg-slate-200 text-slate-600' };
  if (normalized === 'submitted') {
    return String(responseType || '') === 'direct_quote'
      ? { label: 'Nueva cotizacion', className: 'bg-sky-100 text-sky-700' }
      : { label: 'Nueva postulacion', className: 'bg-emerald-100 text-emerald-700' };
  }
  return { label: 'Pendiente', className: 'bg-slate-100 text-slate-600' };
};

const formatArs = (value: number | null | undefined) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      }).format(Number(value))
    : 'A coordinar';

const visibleResponseCount = (responses: ClientRequestResponse[]) =>
  responses.filter((item) => String(item.quoteStatus || '').toLowerCase() !== 'pending').length;

const clampLatitude = (value: number) => Math.max(-85, Math.min(85, value));

const clampLongitude = (value: number) => {
  if (value > 180) return 180;
  if (value < -180) return -180;
  return value;
};

const buildOsmLink = (lat: number, lng: number, zoom = 16) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;

const buildClientMapBoundsForPoints = (points: Array<{ lat: number; lng: number }>) => {
  const limitedPoints = points.slice(0, 80);
  const lats = limitedPoints.map((point) => point.lat);
  const lngs = limitedPoints.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.015);
  const lngSpan = Math.max(maxLng - minLng, 0.015);
  const marginLat = Math.max(latSpan * 0.25, 0.01);
  const marginLng = Math.max(lngSpan * 0.25, 0.01);
  return {
    left: clampLongitude(minLng - marginLng),
    right: clampLongitude(maxLng + marginLng),
    bottom: clampLatitude(minLat - marginLat),
    top: clampLatitude(maxLat + marginLat),
  };
};

const buildClientRequestsMapUrl = (points: ClientMapPoint[]) => {
  if (!points.length) return '';
  const limitedPoints = points.slice(0, 80);
  const bounds = buildClientMapBoundsForPoints(limitedPoints);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bounds.left.toFixed(6)}%2C${bounds.bottom.toFixed(
    6
  )}%2C${bounds.right.toFixed(6)}%2C${bounds.top.toFixed(6)}&layer=mapnik`;
};

const normalizeRequestResponse = (raw: any): ClientRequestResponse => ({
  id: String(raw?.id || ''),
  technicianName: String(raw?.technicianName || raw?.technician_name || 'Tecnico UrbanFix'),
  businessName: raw?.businessName || raw?.business_name ? String(raw?.businessName || raw?.business_name) : null,
  specialty: String(raw?.specialty || raw?.technician_specialty || 'General'),
  city: String(raw?.city || raw?.technician_city || ''),
  phone: String(raw?.phone || raw?.technician_phone || ''),
  responseType: raw?.responseType || raw?.response_type ? String(raw?.responseType || raw?.response_type) : null,
  responseMessage: String(raw?.responseMessage || raw?.response_message || ''),
  visitEtaHours: Number.isFinite(Number(raw?.visitEtaHours ?? raw?.visit_eta_hours))
    ? Number(raw?.visitEtaHours ?? raw?.visit_eta_hours)
    : null,
  priceArs: Number.isFinite(Number(raw?.priceArs ?? raw?.price_ars)) ? Number(raw?.priceArs ?? raw?.price_ars) : null,
  etaHours: Number.isFinite(Number(raw?.etaHours ?? raw?.eta_hours)) ? Number(raw?.etaHours ?? raw?.eta_hours) : null,
  quoteStatus: String(raw?.quoteStatus || raw?.quote_status || 'pending'),
  rating: Number.isFinite(Number(raw?.rating)) ? Number(raw.rating) : null,
  reviewsCount: Number.isFinite(Number(raw?.reviewsCount ?? raw?.reviews_count)) ? Number(raw?.reviewsCount ?? raw?.reviews_count) : 0,
  completedJobsTotal: Number.isFinite(Number(raw?.completedJobsTotal ?? raw?.completed_jobs_total))
    ? Number(raw?.completedJobsTotal ?? raw?.completed_jobs_total)
    : 0,
  submittedAt: raw?.submittedAt || raw?.submitted_at ? String(raw?.submittedAt || raw?.submitted_at) : null,
});

const normalizeClientRequestRow = (raw: any): ClientRequestRow => ({
  id: String(raw?.id || ''),
  title: String(raw?.title || 'Solicitud'),
  category: String(raw?.category || 'General'),
  address: String(raw?.address || ''),
  city: raw?.city ? String(raw.city) : null,
  description: String(raw?.description || ''),
  urgency: String(raw?.urgency || 'media'),
  status: String(raw?.status || 'published'),
  mode: String(raw?.mode || 'marketplace'),
  created_at: String(raw?.created_at || raw?.updated_at || raw?.updatedAt || new Date().toISOString()),
  locationLat: Number.isFinite(Number(raw?.locationLat ?? raw?.location_lat)) ? Number(raw?.locationLat ?? raw?.location_lat) : null,
  locationLng: Number.isFinite(Number(raw?.locationLng ?? raw?.location_lng)) ? Number(raw?.locationLng ?? raw?.location_lng) : null,
  googleMapsHref: String(raw?.googleMapsHref || raw?.google_maps_href || ''),
  appleMapsHref: String(raw?.appleMapsHref || raw?.apple_maps_href || ''),
  responses: Array.isArray(raw?.responses || raw?.quotes)
    ? ((raw.responses || raw.quotes) as any[]).map(normalizeRequestResponse).filter((item) => item.id)
    : [],
  timeline: Array.isArray(raw?.timeline)
    ? raw.timeline.map((event: any) => ({
        id: String(event?.id || ''),
        at: String(event?.at || ''),
        label: String(event?.label || ''),
      }))
    : [],
  assignedTechName: raw?.assignedTechName || raw?.assigned_technician_name ? String(raw?.assignedTechName || raw?.assigned_technician_name) : null,
  assignedTechPhone: raw?.assignedTechPhone || raw?.assigned_technician_phone ? String(raw?.assignedTechPhone || raw?.assigned_technician_phone) : null,
});

const normalizeRadiusKm = (value: unknown, fallback = 20) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, Math.round(parsed)));
};

const CLIENT_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const sanitizeUploadFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'avatar';

const inferAddressProvince = (city: string) => {
  const normalized = city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (
    normalized.includes('caba') ||
    normalized.includes('capital federal') ||
    normalized.includes('ciudad autonoma de buenos aires')
  ) {
    return 'Ciudad Autonoma de Buenos Aires';
  }
  return '';
};

const clientPanelSurfaceClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm';

const clientPanelCardClass =
  'rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_55px_-44px_rgba(15,23,42,0.6)] sm:p-5';

const clientPanelMutedCardClass =
  'rounded-2xl border border-slate-200 bg-slate-50 p-3';

const clientPanelInputClass =
  'mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200';

const clientPanelPrimaryButtonClass =
  'rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55';

const clientPanelSecondaryButtonClass =
  'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950';

export default function ClientRequestsHub() {
  const requestTitleInputRef = useRef<HTMLInputElement | null>(null);
  const clientProfilePhoneInputRef = useRef<HTMLInputElement | null>(null);
  const profileIntentHandledRef = useRef(false);
  const requestIntentHandledRef = useRef(false);
  const addressLookupTimerRef = useRef<number | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createRequestIntent, setCreateRequestIntent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [sendingRecovery, setSendingRecovery] = useState(false);

  const [activeClientView, setActiveClientView] = useState<ClientWorkspaceView>('request');
  const [form, setForm] = useState<CreateRequestForm>(defaultForm);
  const [requestStep, setRequestStep] = useState<1 | 2 | 3>(1);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestNotice, setRequestNotice] = useState('');
  const [requests, setRequests] = useState<ClientRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedClientRequestId, setSelectedClientRequestId] = useState('');
  const [clientMapShowAll, setClientMapShowAll] = useState(true);
  const [clientResponseActionId, setClientResponseActionId] = useState('');
  const [clientResponseActionError, setClientResponseActionError] = useState('');
  const [clientResponseActionNotice, setClientResponseActionNotice] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'address' | null>(null);
  const [locatingRequestGeo, setLocatingRequestGeo] = useState(false);
  const [requestGeoNotice, setRequestGeoNotice] = useState('');
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressCandidates, setAddressCandidates] = useState<AddressCandidate[]>([]);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const [selectedAddressCandidateKey, setSelectedAddressCandidateKey] = useState('');
  const [confirmedAddressLabel, setConfirmedAddressLabel] = useState('');
  const [confirmedAddressProvince, setConfirmedAddressProvince] = useState('');
  const [addressValidationError, setAddressValidationError] = useState('');
  const [clientProfileForm, setClientProfileForm] = useState<ClientProfileForm>(defaultClientProfileForm);
  const [loadingClientProfile, setLoadingClientProfile] = useState(false);
  const [savingClientProfile, setSavingClientProfile] = useState(false);
  const [uploadingClientAvatar, setUploadingClientAvatar] = useState(false);
  const [clientProfileError, setClientProfileError] = useState('');
  const [clientProfileNotice, setClientProfileNotice] = useState('');
  const [nearbyTechnicians, setNearbyTechnicians] = useState<NearbyTechnician[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyWarning, setNearbyWarning] = useState('');
  const [nearbyCenterLabel, setNearbyCenterLabel] = useState('');
  const [isDesktopNavExpanded, setIsDesktopNavExpanded] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      setLoadingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get('mode') || '').toLowerCase();
    const intent = (params.get('intent') || '').toLowerCase();
    if (mode === 'register') {
      setAuthMode('register');
    } else if (mode === 'login') {
      setAuthMode('login');
    }
    if (params.get('quick') === '1') {
      setAuthMode('register');
      setAuthNotice('Modo rápido activo: puedes continuar con Google.');
    }
    if (intent === CREATE_REQUEST_INTENT) {
      setCreateRequestIntent(true);
      setAuthMode('register');
      setAuthNotice('Crea tu cuenta o ingresa para publicar tu solicitud.');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (addressLookupTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(addressLookupTimerRef.current);
      }
    };
  }, []);

  const clearCreateRequestIntent = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('intent');
      url.searchParams.delete('quick');
      url.searchParams.delete('mode');
      const nextSearch = url.searchParams.toString();
      window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
    }
    setCreateRequestIntent(false);
    profileIntentHandledRef.current = false;
    requestIntentHandledRef.current = false;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const openClientProfileSection = (focusField = false) => {
    if (typeof window === 'undefined') return;
    setActiveClientView('profile');
    document.getElementById('perfil-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusField) {
      window.setTimeout(() => {
        clientProfilePhoneInputRef.current?.focus();
      }, 220);
    }
  };

  const openRequestSection = () => {
    if (typeof window === 'undefined') return;
    setActiveClientView('request');
    setRequestStep(1);
    document.getElementById('nueva-solicitud-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      requestTitleInputRef.current?.focus();
    }, 220);
  };

  const openClientShowcase = async () => {
    if (typeof window === 'undefined') return;
    setActiveClientView('showcase');
    document.getElementById('vidriera-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await loadNearbyTechnicians(form.radiusKm);
  };

  const openClientRequestsMap = () => {
    if (typeof window === 'undefined') return;
    const firstMappedRequest = requests.find((item) => item.locationLat !== null && item.locationLng !== null);
    setSelectedClientRequestId((current) => current || firstMappedRequest?.id || '');
    setClientMapShowAll(true);
    setActiveClientView('map');
    document.getElementById('mapa-solicitudes-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clientSidebarAccountLabel = clientProfileForm.fullName.trim() || session?.user?.email || 'Tu cuenta';

  const fetchRequests = async () => {
    if (!session?.access_token) return;
    setLoadingRequests(true);
    setRequestError('');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/client/requests', {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar tus solicitudes.');
      const normalized = Array.isArray(payload?.requests)
        ? (payload.requests as any[]).map(normalizeClientRequestRow)
        : [];
      setRequests(normalized);
    } catch (error: any) {
      setRequestError(
        error?.name === 'AbortError'
          ? 'La carga de solicitudes tardo demasiado. Intenta actualizar.'
          : error?.message || 'No se pudieron cargar tus solicitudes.'
      );
    } finally {
      window.clearTimeout(timeoutId);
      setLoadingRequests(false);
    }
  };

  const fetchClientProfile = async (userId?: string) => {
    if (!userId) return;
    setLoadingClientProfile(true);
    setClientProfileError('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url, email')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;

      let profileRow: any = data || null;
      if (!profileRow) {
        const fallback = {
          id: userId,
          email: session?.user?.email || null,
          full_name: session?.user?.user_metadata?.full_name || '',
          phone: session?.user?.user_metadata?.phone || '',
          avatar_url: session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || null,
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(fallback)
          .select('id, full_name, phone, avatar_url, email')
          .single();
        if (createError) throw createError;
        profileRow = created;
      }

      setClientProfileForm({
        fullName: String(profileRow?.full_name || '').trim(),
        phone: String(profileRow?.phone || '').trim(),
        avatarUrl: String(profileRow?.avatar_url || '').trim(),
      });
    } catch (error: any) {
      setClientProfileError(error?.message || 'No se pudo cargar tu perfil.');
    } finally {
      setLoadingClientProfile(false);
    }
  };

  const loadNearbyTechnicians = async (radiusOverride?: number) => {
    if (!session?.access_token) return;
    const safeRadius = normalizeRadiusKm(radiusOverride ?? form.radiusKm ?? defaultForm.radiusKm, defaultForm.radiusKm);
    setNearbyLoading(true);
    setNearbyError('');
    try {
      const params = new URLSearchParams();
      params.set('radiusKm', String(safeRadius));
      if (form.address.trim()) params.set('address', form.address.trim());
      if (form.city.trim()) params.set('city', form.city.trim());
      if (locationLat !== null && locationLng !== null) {
        params.set('locationLat', String(locationLat));
        params.set('locationLng', String(locationLng));
      }

      const response = await fetch(`/api/client/technicians/nearby?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar técnicos por zona.');
      const normalized = Array.isArray(payload?.technicians)
        ? (payload.technicians as any[]).map((row) => ({
            id: String(row?.id || ''),
            name: String(row?.name || 'Técnico UrbanFix'),
            phone: String(row?.phone || '').trim(),
            specialty: String(row?.specialty || 'General'),
            city: String(row?.city || ''),
            zoneLabel: row?.zone_label ? String(row.zone_label) : null,
            rating: Number.isFinite(Number(row?.rating)) ? Number(row.rating) : null,
            distanceKm: Number.isFinite(Number(row?.distance_km)) ? Number(row.distance_km) : 0,
            availableNow: Boolean(row?.available_now),
            workingHoursLabel: String(row?.working_hours_label || ''),
          }))
        : [];
      setNearbyTechnicians(normalized);
      setNearbyCenterLabel(String(payload?.center_label || '').trim());
      setNearbyWarning(String(payload?.warning || '').trim());
    } catch (error: any) {
      setNearbyTechnicians([]);
      setNearbyCenterLabel('');
      setNearbyWarning('');
      setNearbyError(error?.message || 'No se pudieron cargar técnicos por zona.');
    } finally {
      setNearbyLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchRequests();
    loadNearbyTechnicians(defaultForm.radiusKm);
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setClientProfileForm(defaultClientProfileForm);
      setClientProfileError('');
      setClientProfileNotice('');
      setNearbyTechnicians([]);
      setNearbyError('');
      setNearbyWarning('');
      setNearbyCenterLabel('');
      return;
    }
    fetchClientProfile(session.user.id);
  }, [session?.user?.id]);

  const handleGoogleAuth = async () => {
    if (googleAuthLoading) return;
    setAuthError('');
    setAuthNotice('');
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      return;
    }
    setGoogleAuthLoading(true);
    const redirectTo = `${window.location.origin}/cliente${window.location.search || ''}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setAuthError(getFriendlyClientAuthErrorMessage(error, 'google'));
      setGoogleAuthLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    setAuthError('');
    setAuthNotice('');
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      return;
    }
    const safeEmail = email.trim();
    if (!safeEmail) {
      setAuthError('Ingresa tu correo para recuperar la contrasena.');
      return;
    }
    setSendingRecovery(true);
    try {
      const redirectTo = `${window.location.origin}/cliente`;
      const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, { redirectTo });
      if (error) throw error;
      setAuthNotice('Te enviamos un correo para recuperar tu contrasena.');
    } catch (error: any) {
      setAuthError(getFriendlyClientAuthErrorMessage(error, 'recovery'));
    } finally {
      setSendingRecovery(false);
    }
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    setAuthNotice('');
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      return;
    }
    setAuthLoading(true);
    try {
      const safeEmail = email.trim().toLowerCase();
      if (!safeEmail || !password) {
        throw new Error('Ingresa correo y contrasena.');
      }
      if (!safeEmail.includes('@')) {
        throw new Error('Ingresa un correo valido.');
      }
      if (password.trim().length < 6) {
        throw new Error('La contrasena debe tener al menos 6 caracteres.');
      }
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) throw error;
      } else {
        const safePhone = clientProfileForm.phone.trim();
        if (!safePhone) {
          throw new Error('Ingresa tu WhatsApp para crear tu perfil de cliente.');
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              phone: safePhone,
              user_type: 'cliente',
            },
          },
        });
        if (error) throw error;
        setClientProfileForm((prev) => ({
          ...prev,
          phone: safePhone,
        }));
        if (signUpData?.session && signUpData?.user?.id) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            email: safeEmail,
            phone: safePhone,
          });
          if (profileError) throw profileError;
        }
        setAuthNotice(
          signUpData?.session
            ? 'Cuenta creada. Tu perfil de cliente ya quedo guardado.'
            : 'Cuenta creada. Revisa tu correo para confirmar y luego entra: el perfil base se completará al iniciar sesión.'
        );
        setPassword('');
      }
    } catch (error: any) {
      setAuthError(getFriendlyClientAuthErrorMessage(error, authMode));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveClientProfile = async () => {
    if (!session?.user?.id) return;
    setSavingClientProfile(true);
    setClientProfileError('');
    setClientProfileNotice('');
    try {
      const phone = clientProfileForm.phone.trim();
      if (!phone) {
        throw new Error('Ingresa tu WhatsApp para guardar tu perfil.');
      }

      const payload = {
        id: session.user.id,
        email: session.user.email || null,
        phone,
      };

      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;

      setClientProfileNotice('WhatsApp guardado.');
      await loadNearbyTechnicians(form.radiusKm);
    } catch (error: any) {
      setClientProfileError(error?.message || 'No se pudo guardar tu perfil.');
    } finally {
      setSavingClientProfile(false);
    }
  };

  const handleClientAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!session?.user?.id) {
      setClientProfileError('Inicia sesion para subir una foto.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setClientProfileError('Solo se permiten imagenes.');
      return;
    }
    if (file.size > CLIENT_AVATAR_MAX_BYTES) {
      setClientProfileError('La foto debe pesar menos de 5 MB.');
      return;
    }

    setUploadingClientAvatar(true);
    setClientProfileError('');
    setClientProfileNotice('');
    try {
      const storagePath = `${session.user.id}/client/avatar-${Date.now()}-${sanitizeUploadFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email || null,
          phone: clientProfileForm.phone.trim() || null,
          avatar_url: publicUrl,
        });
      if (error) throw error;

      setClientProfileForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      setClientProfileNotice('Foto de perfil actualizada.');
    } catch (error: any) {
      setClientProfileError(error?.message || 'No pudimos subir la foto.');
    } finally {
      setUploadingClientAvatar(false);
    }
  };

  const handlePublishRequest = async () => {
    if (!session?.access_token) return;
    setSavingRequest(true);
    setRequestError('');
    setRequestNotice('');
    try {
      if (!isClientProfileComplete) {
        throw new Error('Agrega tu foto de perfil y WhatsApp antes de publicar una solicitud.');
      }
      if (!form.title.trim() || !form.category.trim() || !form.address.trim() || !form.city.trim() || !form.description.trim()) {
        throw new Error('Completa titulo, categoria, direccion, ciudad y descripcion.');
      }
      if (locationLat === null || locationLng === null) {
        setRequestStep(2);
        throw new Error('Valida la direccion o usa GPS antes de publicar.');
      }
      const response = await fetch('/api/client/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          city: form.city.trim(),
          province: confirmedAddressProvince.trim(),
          locationLat,
          locationLng,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo publicar la solicitud.');
      const createdRequest = normalizeClientRequestRow(payload?.request || {});
      const snapshotRequests = Array.isArray(payload?.requests)
        ? (payload.requests as any[]).map(normalizeClientRequestRow)
        : [];
      const matchesCount = Array.isArray(payload?.matches) ? payload.matches.length : 0;
      const warning = String(payload?.warning || '').trim();
      if (snapshotRequests.length > 0) {
        setRequests(snapshotRequests);
      } else if (createdRequest.id) {
        setRequests((current) => [createdRequest, ...current.filter((item) => item.id !== createdRequest.id)]);
      }
      if (createdRequest.id) {
        setSelectedClientRequestId(createdRequest.id);
      }
      setRequestNotice(
        matchesCount > 0
          ? `Solicitud publicada. Encontramos ${matchesCount} técnico(s) cercano(s).`
          : 'Solicitud publicada. Aún no hay técnicos cercanos disponibles.'
      );
      setRequestGeoNotice(warning);
      setForm((prev) => ({
        ...defaultForm,
        city: prev.city,
        radiusKm: prev.radiusKm || defaultForm.radiusKm,
      }));
      setRequestStep(1);
      setLocationLat(null);
      setLocationLng(null);
      setLocationSource(null);
      setAddressCandidates([]);
      setAddressDropdownOpen(false);
      setSelectedAddressCandidateKey('');
      setConfirmedAddressLabel('');
      setConfirmedAddressProvince('');
      setAddressValidationError('');
      setActiveClientView('map');
      clearCreateRequestIntent();
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          document.getElementById('mapa-solicitudes-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
      await loadNearbyTechnicians(form.radiusKm);
    } catch (error: any) {
      setRequestError(error?.message || 'No se pudo publicar la solicitud.');
    } finally {
      setSavingRequest(false);
    }
  };

  const clientProfileMissingFields = useMemo(() => {
    const missing: string[] = [];
    if (!clientProfileForm.avatarUrl.trim()) missing.push('Foto');
    if (!clientProfileForm.phone.trim()) missing.push('WhatsApp');
    return missing;
  }, [clientProfileForm.avatarUrl, clientProfileForm.phone]);

  const isClientProfileComplete = clientProfileMissingFields.length === 0;
  const clientSetupSteps = useMemo(
    () => [
      {
        key: 'profile',
        title: 'Completa tu perfil',
        description: 'Foto de perfil y WhatsApp para identificar tus solicitudes.',
        done: isClientProfileComplete,
        href: '#perfil-cliente',
      },
      {
        key: 'request',
        title: 'Publica tu primera solicitud',
        description: 'Carga trabajo, dirección, urgencia y modo de atención.',
        done: requests.length > 0,
        href: '#nueva-solicitud-cliente',
      },
      {
        key: 'nearby',
        title: 'Revisa técnicos cercanos',
        description: 'Valida cobertura, disponibilidad y distancia antes de decidir.',
        done: nearbyTechnicians.length > 0,
        href: '#tecnicos-cercanos',
      },
    ],
    [isClientProfileComplete, nearbyTechnicians.length, requests.length]
  );
  const clientSetupCompleted = useMemo(
    () => clientSetupSteps.filter((item) => item.done).length,
    [clientSetupSteps]
  );

  const requestsByStatus = useMemo(() => {
    const total = requests.length;
    const matched = requests.filter((item) => String(item.status).toLowerCase() === 'matched').length;
    const published = requests.filter((item) => String(item.status).toLowerCase() === 'published').length;
    return { total, matched, published };
  }, [requests]);

  const selectedNearbyTechnician = useMemo(
    () => nearbyTechnicians.find((item) => item.id === form.targetTechnicianId) || null,
    [nearbyTechnicians, form.targetTechnicianId]
  );
  const currentRequestMapLinks = useMemo(
    () =>
      buildMapLinks({
        address: form.address,
        city: form.city,
        province: confirmedAddressProvince,
        lat: locationLat,
        lng: locationLng,
        label: confirmedAddressLabel,
      }),
    [confirmedAddressLabel, confirmedAddressProvince, form.address, form.city, locationLat, locationLng]
  );
  const currentRequestMapEmbedUrl = useMemo(
    () =>
      locationLat !== null && locationLng !== null
        ? buildOpenStreetMapEmbedUrl(locationLat, locationLng)
        : '',
    [locationLat, locationLng]
  );
  const requestsWithMap = useMemo(
    () => requests.filter((item) => item.locationLat !== null && item.locationLng !== null),
    [requests]
  );
  const selectedMapRequest = useMemo(
    () =>
      requestsWithMap.find((item) => item.id === selectedClientRequestId) ||
      requestsWithMap[0] ||
      null,
    [requestsWithMap, selectedClientRequestId]
  );
  const selectedMapRequestLinks = useMemo(
    () =>
      selectedMapRequest
        ? buildMapLinks({
            address: selectedMapRequest.address,
            city: selectedMapRequest.city,
            lat: selectedMapRequest.locationLat,
            lng: selectedMapRequest.locationLng,
          })
        : null,
    [selectedMapRequest]
  );
  const selectedGoogleMapsHref = selectedMapRequest?.googleMapsHref || selectedMapRequestLinks?.googleMapsHref || '';
  const selectedAppleMapsHref = selectedMapRequest?.appleMapsHref || selectedMapRequestLinks?.appleMapsHref || '';
  const selectedMapResponses = useMemo(
    () =>
      (selectedMapRequest?.responses || [])
        .filter((item) => String(item.quoteStatus || '').toLowerCase() !== 'pending')
        .sort((a, b) => {
          const weight = (status: string) => (status === 'accepted' ? 0 : status === 'submitted' ? 1 : 2);
          return weight(String(a.quoteStatus).toLowerCase()) - weight(String(b.quoteStatus).toLowerCase());
        }),
    [selectedMapRequest]
  );
  const clientMapPoints = useMemo(() => {
    return requestsWithMap
      .map((item) => {
        if (item.locationLat === null || item.locationLng === null) return null;
        const responseCount = visibleResponseCount(item.responses);
        const point: ClientMapPoint = {
          id: item.id,
          title: item.title || 'Solicitud',
          subtitle: [item.address, item.city].filter(Boolean).join(' · ') || 'Zona sin detalle',
          meta: `${String(item.status || '').toUpperCase()} · ${responseCount} ${responseCount === 1 ? 'respuesta' : 'respuestas'}`,
          lat: item.locationLat,
          lng: item.locationLng,
          createdAt: item.created_at,
        };
        return point;
      })
      .filter((point): point is ClientMapPoint => Boolean(point))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requestsWithMap]);
  const selectedClientMapPoint = useMemo(() => {
    if (!selectedMapRequest || selectedMapRequest.locationLat === null || selectedMapRequest.locationLng === null) return null;
    return {
      id: selectedMapRequest.id,
      title: selectedMapRequest.title || 'Solicitud',
      subtitle: [selectedMapRequest.address, selectedMapRequest.city].filter(Boolean).join(' · ') || 'Zona sin detalle',
      meta: `${String(selectedMapRequest.status || '').toUpperCase()} · ${visibleResponseCount(selectedMapRequest.responses)} respuestas`,
      lat: selectedMapRequest.locationLat,
      lng: selectedMapRequest.locationLng,
      createdAt: selectedMapRequest.created_at,
    };
  }, [selectedMapRequest]);
  const clientMapView = useMemo(() => {
    if (!clientMapShowAll && selectedClientMapPoint) {
      return {
        mode: 'single' as const,
        url: buildOpenStreetMapEmbedUrl(selectedClientMapPoint.lat, selectedClientMapPoint.lng, 0.004),
      };
    }
    if (clientMapPoints.length > 0) {
      return {
        mode: 'all' as const,
        url: buildClientRequestsMapUrl(clientMapPoints),
      };
    }
    return { mode: 'none' as const, url: '' };
  }, [clientMapPoints, clientMapShowAll, selectedClientMapPoint]);

  useEffect(() => {
    if (requestsWithMap.length === 0) {
      setSelectedClientRequestId('');
      return;
    }

    setSelectedClientRequestId((current) =>
      current && requestsWithMap.some((item) => item.id === current)
        ? current
        : requestsWithMap[0].id
    );
  }, [requestsWithMap]);

  const handleRefreshWorkspace = async () => {
    await Promise.all([fetchRequests(), loadNearbyTechnicians(form.radiusKm)]);
  };

  const handleClientResponseAction = async (
    requestItem: ClientRequestRow,
    responseItem: ClientRequestResponse,
    intent: 'select' | 'reject'
  ) => {
    if (!session?.access_token) return;
    const actionId = `${requestItem.id}:${responseItem.id}:${intent}`;
    setClientResponseActionId(actionId);
    setClientResponseActionError('');
    setClientResponseActionNotice('');
    try {
      const action =
        intent === 'reject'
          ? 'quote_reject'
          : responseItem.responseType === 'direct_quote'
            ? 'quote_accept'
            : 'select_match';
      const response = await fetch(`/api/client/requests/${requestItem.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          matchId: responseItem.id,
          reason: intent === 'reject' ? 'No seleccionado por el cliente' : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No pudimos procesar la respuesta.');
      }
      const normalized = Array.isArray(payload?.requests)
        ? (payload.requests as any[]).map(normalizeClientRequestRow)
        : [];
      if (normalized.length > 0) {
        setRequests(normalized);
      } else {
        await fetchRequests();
      }
      setSelectedClientRequestId(requestItem.id);
      setClientResponseActionNotice(
        intent === 'reject'
          ? 'Respuesta rechazada.'
          : `${responseItem.technicianName || 'Tecnico'} seleccionado para esta solicitud.`
      );
    } catch (error: any) {
      setClientResponseActionError(error?.message || 'No pudimos procesar la respuesta.');
    } finally {
      setClientResponseActionId('');
    }
  };

  useEffect(() => {
    if (!session?.user) {
      profileIntentHandledRef.current = false;
      requestIntentHandledRef.current = false;
      return;
    }
    if (!createRequestIntent) return;

    if (!isClientProfileComplete) {
      if (profileIntentHandledRef.current) return;
      profileIntentHandledRef.current = true;
      setClientProfileNotice((current) => current || 'Agrega foto y WhatsApp para publicar tu solicitud.');
      window.setTimeout(() => {
        document.getElementById('perfil-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 180);
      return;
    }

    if (requestIntentHandledRef.current) return;
    requestIntentHandledRef.current = true;
    setRequestNotice((current) => current || 'Tu cuenta ya está lista. Carga los datos y publica tu solicitud.');
    window.setTimeout(() => {
      document.getElementById('nueva-solicitud-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestTitleInputRef.current?.focus();
    }, 180);
  }, [createRequestIntent, isClientProfileComplete, session?.user]);

  useEffect(() => {
    if (form.mode !== 'direct') return;
    if (!form.targetTechnicianId) return;
    if (nearbyTechnicians.some((tech) => tech.id === form.targetTechnicianId)) return;
    setForm((prev) => ({
      ...prev,
      targetTechnicianId: '',
      targetTechnicianName: '',
      targetTechnicianPhone: '',
    }));
  }, [form.mode, form.targetTechnicianId, nearbyTechnicians]);

  const clearConfirmedAddress = () => {
    setAddressCandidates([]);
    setAddressDropdownOpen(false);
    setSelectedAddressCandidateKey('');
    setConfirmedAddressLabel('');
    setConfirmedAddressProvince('');
    setAddressValidationError('');
    if (locationSource === 'address') {
      setLocationLat(null);
      setLocationLng(null);
      setLocationSource(null);
      setRequestGeoNotice('');
    }
  };

  const applyAddressCandidate = (candidate: AddressCandidate) => {
    setLocationLat(Number(candidate.lat.toFixed(6)));
    setLocationLng(Number(candidate.lng.toFixed(6)));
    setLocationSource('address');
    setConfirmedAddressLabel(candidate.displayName);
    setConfirmedAddressProvince(candidate.province);
    setSelectedAddressCandidateKey(getAddressCandidateKey(candidate));
    setAddressDropdownOpen(false);
    setAddressValidationError('');
    setRequestGeoNotice(
      candidate.precision === 'exact'
        ? 'Direccion validada con altura exacta.'
        : 'Direccion ubicada de forma aproximada. Revisa que calle, numero y ciudad esten completos.'
    );
    setForm((prev) => ({
      ...prev,
      address: candidate.primaryLabel || prev.address,
      city: candidate.locality || prev.city,
    }));
  };

  const handleValidateAddress = async (options: { auto?: boolean; address?: string; city?: string } = {}) => {
    const address = (options.address ?? form.address).trim();
    const city = (options.city ?? form.city).trim();
    setAddressValidationError('');
    setRequestError('');
    if (!address) {
      if (!options.auto) setAddressValidationError('Completa direccion para validar el punto.');
      return;
    }
    if (options.auto && (!/\d/.test(address) || address.length < 5)) {
      return;
    }

    setValidatingAddress(true);
    try {
      const province = inferAddressProvince(city);
    const params = new URLSearchParams({ query: address, country: 'Argentina', limit: '8' });
      if (city) params.set('city', city);
      if (province) params.set('province', province);
      const response = await fetch(`/api/geocode/search?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No pudimos validar la direccion.');
      const candidates: AddressCandidate[] = Array.isArray(payload?.results)
        ? payload.results
            .map((item: any) => {
              const lat = Number(item?.lat);
              const lng = Number(item?.lon);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
              return {
                displayName: String(item?.full_display_name || item?.display_name || '').trim(),
                primaryLabel: String(item?.primary_label || item?.display_name || '').trim(),
                secondaryLabel: String(item?.secondary_label || '').trim(),
                accuracyLabel: String(item?.accuracy_label || '').trim(),
                locality: String(item?.locality || '').trim(),
                province: String(item?.province || '').trim(),
                lat,
                lng,
                precision: item?.precision === 'exact' ? 'exact' : 'approx',
              } satisfies AddressCandidate;
            })
            .filter((item: AddressCandidate | null): item is AddressCandidate => Boolean(item))
        : [];

      setAddressCandidates(candidates);
      if (!candidates.length) {
        setLocationLat(null);
        setLocationLng(null);
        setLocationSource(null);
        setSelectedAddressCandidateKey('');
        setConfirmedAddressLabel('');
        setConfirmedAddressProvince('');
        setAddressDropdownOpen(false);
        if (!options.auto) setAddressValidationError('No encontramos esa direccion. Revisa calle, numero y ciudad.');
        return;
      }

      setAddressDropdownOpen(true);
      setRequestGeoNotice('Selecciona una direccion del desplegable para confirmar el punto.');
    } catch (error: any) {
      setAddressValidationError(error?.message || 'No pudimos validar la direccion.');
    } finally {
      setValidatingAddress(false);
    }
  };

  const scheduleAddressLookup = (address: string, city = form.city) => {
    if (addressLookupTimerRef.current) {
      window.clearTimeout(addressLookupTimerRef.current);
      addressLookupTimerRef.current = null;
    }
    if (!/\d/.test(address) || address.trim().length < 5) return;
    addressLookupTimerRef.current = window.setTimeout(() => {
      void handleValidateAddress({ auto: true, address, city });
    }, 450);
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      setRequestError('Tu navegador no soporta geolocalización.');
      return;
    }

    setLocatingRequestGeo(true);
    setRequestError('');
    setRequestGeoNotice('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(Number(position.coords.latitude.toFixed(6)));
        setLocationLng(Number(position.coords.longitude.toFixed(6)));
        setLocationSource('gps');
        setConfirmedAddressLabel('Ubicacion actual del dispositivo');
        setConfirmedAddressProvince('');
        setAddressValidationError('');
        setAddressCandidates([]);
        setRequestGeoNotice('Ubicación capturada. Esta solicitud se sincronizará con técnicos cercanos en mapa.');
        setLocatingRequestGeo(false);
      },
      (error) => {
        const code = Number(error?.code || 0);
        if (code === 1) {
          setRequestError('Permite acceso a ubicación para sincronizar por cercanía.');
        } else if (code === 3) {
          setRequestError('No pudimos obtener tu ubicación a tiempo. Intenta de nuevo.');
        } else {
          setRequestError('No pudimos obtener tu ubicación. Seguimos con dirección + ciudad.');
        }
        setLocatingRequestGeo(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  if (!session?.user) {
    return (
      <div
        style={clientLoadingThemeStyles}
        data-ui-theme="light"
        className="ufx-theme-scope min-h-screen bg-[#16031f] text-white"
      >
        <PublicTopNav activeHref="/cliente" sticky />
        <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#16031f_0%,#21002f_52%,#14031c_100%)]"
          />
          <main className="relative z-10 mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
            <section className="ufx-auth-view-enter w-full rounded-[32px] border border-white/[0.16] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.055)_48%,rgba(255,143,31,0.10))] p-4 text-white shadow-[0_44px_120px_-64px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Link
                  href="/tecnicos"
                  aria-label="Volver al selector de perfiles"
                  title="Volver al selector de perfiles"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.06] text-[#ffcf93] transition hover:border-[#ffcf93]/50 hover:bg-[#ff8f1f]/[0.12] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.72]">
                  <User className="h-3.5 w-3.5 text-[#ffcf93]" />
                  Portal cliente
                </span>
              </div>

              {createRequestIntent && (
                <div className="mb-4 rounded-[22px] border border-[#ffcf93]/40 bg-[#ff8f1f]/[0.12] px-4 py-3 text-sm text-[#ffe2bd]">
                  <p className="leading-6">Ingresa o crea tu cuenta para publicar tu solicitud.</p>
                </div>
              )}

              <div className="rounded-[28px] border border-[#eadfce]/70 bg-[#fffdf9] p-4 text-[#180f24] shadow-[0_28px_76px_-50px_rgba(0,0,0,0.92)] sm:p-5">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={authLoading || googleAuthLoading}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[15px] font-semibold text-slate-700 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.46)] transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                >
                  {googleAuthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                  ) : (
                    <GoogleMark className="h-4 w-4" />
                  )}
                  {googleAuthLoading ? 'Abriendo Google...' : 'Continuar con Google'}
                </button>

                <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  o
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="relative grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-[#2a0338] shadow-sm transition-transform duration-300 ease-out ${
                      authMode === 'register' ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthNotice('');
                      setShowAuthPassword(false);
                    }}
                    className={`relative z-10 min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      authMode === 'login'
                        ? 'text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    Ingresar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                      setAuthNotice('');
                      setShowAuthPassword(false);
                    }}
                    className={`relative z-10 min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      authMode === 'register'
                        ? 'text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                {authMode === 'register' && (
                  <div className="mt-4 space-y-3">
                    <input
                      value={clientProfileForm.phone}
                      onChange={(event) => setClientProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="WhatsApp de contacto"
                      autoComplete="tel"
                      className="min-h-[48px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2a0338] focus:ring-2 focus:ring-[#2a0338]/10"
                    />
                    <p className="text-[11px] leading-5 text-slate-500">
                      La direccion del trabajo se carga despues, dentro de cada solicitud.
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Correo"
                      autoComplete="email"
                      className="min-h-[48px] w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2a0338] focus:ring-2 focus:ring-[#2a0338]/10"
                    />
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Contrasena"
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      className="min-h-[48px] w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2a0338] focus:ring-2 focus:ring-[#2a0338]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((current) => !current)}
                      aria-label={showAuthPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showAuthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'login' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasswordRecovery}
                      disabled={sendingRecovery || authLoading || googleAuthLoading}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-[#ffcf93] hover:bg-[#fff4e8] hover:text-[#8f4f08] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingRecovery && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {sendingRecovery ? 'Enviando correo...' : 'Olvidaste tu contrasena?'}
                    </button>
                  </div>
                )}

                {authNotice && (
                  <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700">
                    {authNotice}
                  </p>
                )}
                {authError && (
                  <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                    {authError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleEmailAuth}
                  disabled={authLoading || googleAuthLoading}
                  className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff8f1f] px-4 py-3 text-sm font-semibold text-[#2a0338] shadow-[0_18px_40px_-24px_rgba(255,143,31,0.78)] transition hover:bg-[#ffad56] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {authLoading ? 'Procesando...' : authMode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                  {!authLoading && <ArrowRight className="h-4 w-4" />}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#c48635]" />
                  Acceso seguro UrbanFix
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicTopNav activeHref="/cliente" sticky />
      <div className={activeClientView === 'map' ? 'lg:pl-[74px]' : 'p-4 sm:p-6 lg:p-8 lg:pl-[104px]'}>
        <div className="hidden" />
        <div className="hidden" />
        <div className="hidden" />
        <div className="hidden" />
        <div className={activeClientView === 'map' ? 'w-full' : 'mx-auto w-full max-w-6xl'}>
          <aside
            aria-label="Navegacion cliente"
            onMouseEnter={() => setIsDesktopNavExpanded(true)}
            onMouseLeave={() => setIsDesktopNavExpanded(false)}
            className={`fixed left-0 top-[57px] z-40 hidden h-[calc(100vh-57px)] overflow-hidden border-r border-white/[0.08] bg-[linear-gradient(180deg,#17031f_0%,#250331_48%,#13021a_100%)] shadow-[14px_0_44px_-42px_rgba(0,0,0,0.9),inset_-1px_0_0_rgba(255,255,255,0.05)] transition-[width] duration-300 lg:flex ${
              isDesktopNavExpanded ? 'w-[222px]' : 'w-[74px]'
            }`}
          >
            <div className="flex h-full w-full flex-col">
              <div className={isDesktopNavExpanded ? 'px-3 pb-2 pt-4' : 'px-2 pb-2 pt-4'}>
                <div
                  className={`flex items-center ${
                    isDesktopNavExpanded ? 'gap-3 rounded-[18px] px-2.5 py-2' : 'mx-auto h-10 w-10 justify-center rounded-[14px]'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-[#ffcf93]/25 bg-[#ff8f1f] text-sm font-black text-[#2a0338] shadow-[0_14px_28px_-22px_rgba(255,143,31,0.9)]">
                    UF
                  </span>
                  {isDesktopNavExpanded && (
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{clientSidebarAccountLabel}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-white/[0.42]">Panel cliente</p>
                    </div>
                  )}
                </div>
              </div>

              <nav className={`flex-1 overflow-y-auto ${isDesktopNavExpanded ? 'px-2.5 py-2' : 'px-2 py-2'}`}>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    title={!isDesktopNavExpanded ? 'Solicitud' : undefined}
                    onClick={openRequestSection}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'mx-auto h-10 w-10 justify-center rounded-[14px]'
                    } ${activeClientView === 'request' ? 'text-white' : 'text-white/[0.72]'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition group-hover:bg-white/[0.09] ${
                      activeClientView === 'request' ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.055] text-[#ff9c1a]'
                    }`}>
                      <FilePlus className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Solicitud</span>}
                  </button>

                  <button
                    type="button"
                    title={!isDesktopNavExpanded ? 'Mapa' : undefined}
                    onClick={openClientRequestsMap}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'mx-auto h-10 w-10 justify-center rounded-[14px]'
                    } ${activeClientView === 'map' ? 'text-white' : 'text-white/[0.72]'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition group-hover:bg-white/[0.09] ${
                      activeClientView === 'map' ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.055]'
                    }`}>
                      <MapPin className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Mapa</span>}
                  </button>

                  <button
                    type="button"
                    title={!isDesktopNavExpanded ? 'Tecnicos' : undefined}
                    onClick={openClientShowcase}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'mx-auto h-10 w-10 justify-center rounded-[14px]'
                    } ${activeClientView === 'showcase' ? 'text-white' : 'text-white/[0.72]'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition group-hover:bg-white/[0.09] ${
                      activeClientView === 'showcase' ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.055]'
                    }`}>
                      <Store className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Tecnicos</span>}
                  </button>

                  <button
                    type="button"
                    title={!isDesktopNavExpanded ? 'Perfil' : undefined}
                    onClick={() => openClientProfileSection(false)}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'mx-auto h-10 w-10 justify-center rounded-[14px]'
                    } ${activeClientView === 'profile' ? 'text-white' : 'text-white/[0.72]'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition group-hover:bg-white/[0.09] ${
                      activeClientView === 'profile' ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.055]'
                    }`}>
                      <User className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Perfil</span>}
                  </button>
                </div>
              </nav>

              <div className={`${isDesktopNavExpanded ? 'px-2.5 pb-3 pt-2.5' : 'px-2 pb-3 pt-2.5'} border-t border-white/[0.08]`}>
                <button
                  type="button"
                  title={!isDesktopNavExpanded ? 'Cerrar sesion' : undefined}
                  onClick={handleLogout}
                  className={`group relative flex items-center text-white/[0.76] transition hover:bg-white/[0.075] hover:text-white ${
                    isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'mx-auto h-10 w-10 justify-center rounded-[14px]'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#ff8f1f] text-[#2a0338] transition group-hover:brightness-105">
                    <LogOut className="h-4 w-4" />
                  </span>
                  {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Cerrar sesion</span>}
                </button>
              </div>
            </div>
          </aside>
          <div className="hidden">
            <aside
              onMouseEnter={() => setIsDesktopNavExpanded(true)}
              onMouseLeave={() => setIsDesktopNavExpanded(false)}
              className={`fixed left-0 top-[57px] z-40 hidden h-[calc(100vh-57px)] [height:calc(100dvh-57px)] overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#22062f_0%,#2a0338_48%,#1d0829_100%)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)] transition-[width] duration-300 lg:flex ${
                isDesktopNavExpanded ? 'w-[238px]' : 'w-[78px]'
              }`}
            >
              <div className="flex h-full w-full flex-col justify-end">
                <div className={`${isDesktopNavExpanded ? 'px-3 pb-3 pt-2.5' : 'px-2 pb-3 pt-2.5'} border-t border-white/10`}>
                  {isDesktopNavExpanded && (
                    <div className="mb-2 rounded-[16px] border border-white/10 bg-white/5 px-2.5 py-2">
                      <p className="truncate text-[13px] font-semibold text-white">{clientSidebarAccountLabel}</p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/45">Cuenta cliente</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Perfil' : undefined}
                      onClick={() => openClientProfileSection(false)}
                      className={`group relative flex items-center text-white transition hover:bg-white/10 hover:text-white ${
                        isDesktopNavExpanded
                          ? 'h-9 w-full gap-2.5 rounded-r-[16px] rounded-l-none px-3 text-left'
                          : 'mx-auto h-9 w-9 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white transition group-hover:bg-white/16 group-hover:text-white">
                        <User className="h-4 w-4" />
                      </span>
                      {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Perfil</span>}
                    </button>

                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Configuración' : undefined}
                      onClick={() => openClientProfileSection(true)}
                      className={`group relative flex items-center text-white transition hover:bg-white/10 hover:text-white ${
                        isDesktopNavExpanded
                          ? 'h-9 w-full gap-2.5 rounded-r-[16px] rounded-l-none px-3 text-left'
                          : 'mx-auto h-9 w-9 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white transition group-hover:bg-white/16 group-hover:text-white">
                        <Settings className="h-4 w-4" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Configuración</span>
                      )}
                    </button>

                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Cerrar sesión' : undefined}
                      onClick={handleLogout}
                      className={`group relative flex items-center text-white transition hover:bg-white/10 hover:text-white ${
                        isDesktopNavExpanded
                          ? 'h-9 w-full gap-2.5 rounded-r-[16px] rounded-l-none px-3 text-left'
                          : 'mx-auto h-9 w-9 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#ff9c1a,#ff7b00)] text-[#2a0338] shadow-[0_16px_28px_-18px_rgba(255,140,26,0.95)] transition group-hover:brightness-105">
                        <LogOut className="h-4 w-4" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Cerrar sesión</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="min-w-0 flex-1">
            <div className={activeClientView === 'map' ? 'w-full space-y-0' : 'mx-auto w-full max-w-2xl space-y-4'}>
        <header className="hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Solicitudes</h1>
              <p className="mt-1 text-sm text-slate-600">{session.user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                Total: {requestsByStatus.total}
              </span>
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Matcheadas: {requestsByStatus.matched}
              </span>
              <button
                type="button"
                onClick={() => openClientProfileSection(false)}
                className={`${clientPanelSecondaryButtonClass} ${isClientProfileComplete ? 'hidden' : ''}`}
              >
                Perfil
              </button>
              <button
                type="button"
                onClick={() => openClientProfileSection(true)}
                className={`${clientPanelSecondaryButtonClass} ${isClientProfileComplete ? 'hidden' : ''}`}
              >
                Configuración
              </button>
              <Link
                href="/vidriera"
                className={clientPanelSecondaryButtonClass}
              >
                Ver vidriera
              </Link>
              <button
                type="button"
                onClick={handleRefreshWorkspace}
                className={clientPanelSecondaryButtonClass}
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={clientPanelPrimaryButtonClass}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <section className="hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Primeros pasos</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {isClientProfileComplete
                  ? requests.length > 0
                    ? 'Tu cuenta ya está operando con una base mucho más clara.'
                    : 'Tu cuenta ya está lista. Solo falta publicar tu primera solicitud.'
                  : 'Tu registro ya quedo hecho. Ahora agrega foto y WhatsApp para publicar.'}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                UrbanFix te lleva por una secuencia simple: perfil, solicitud y lectura de técnicos cercanos.
              </p>
            </div>
            <div className="rounded-[24px] border border-[#e7dff0] bg-white/82 px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Progreso</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{clientSetupCompleted}/3</p>
              <p className="text-xs text-slate-500">Hitos iniciales completados</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {clientSetupSteps.map((step) => (
              <a
                key={step.key}
                href={step.href}
                className="rounded-[24px] border border-[#e8dff0] bg-[linear-gradient(180deg,rgba(247,239,248,0.86),rgba(255,255,255,0.92))] p-4 transition hover:border-[#d7cadf] hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {step.done ? 'Listo' : 'Pendiente'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a6786]">
                  Ir a esta seccion
                </p>
              </a>
            ))}
          </div>
        </section>

        <section id="perfil-cliente" className={!isClientProfileComplete || activeClientView === 'profile' ? clientPanelCardClass : 'hidden'}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Perfil cliente</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Foto y WhatsApp</h2>
              <p className="mt-1 text-sm text-slate-600">
                Solo necesitamos estos datos. La direccion del trabajo se carga en cada solicitud.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isClientProfileComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isClientProfileComplete ? 'Perfil completo' : `Faltan: ${clientProfileMissingFields.join(', ')}`}
            </span>
          </div>

          {loadingClientProfile ? (
            <p className="mt-4 text-sm text-slate-500">Cargando perfil...</p>
          ) : (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                    {clientProfileForm.avatarUrl ? (
                      <img src={clientProfileForm.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8" />
                    )}
                  </div>
                  <label
                    className={`${clientPanelSecondaryButtonClass} inline-flex cursor-pointer items-center gap-2 ${
                      uploadingClientAvatar ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    {uploadingClientAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {uploadingClientAvatar ? 'Subiendo...' : clientProfileForm.avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingClientAvatar}
                      onChange={handleClientAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">WhatsApp de contacto</label>
                  <input
                    ref={clientProfilePhoneInputRef}
                    value={clientProfileForm.phone}
                    onChange={(event) => setClientProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="+54 9 11 1234-5678"
                    autoComplete="tel"
                    className={clientPanelInputClass}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    La direccion exacta del trabajo va en el paso Ubicacion de la solicitud.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveClientProfile}
                  disabled={savingClientProfile}
                  className={clientPanelPrimaryButtonClass}
                >
                  {savingClientProfile ? 'Guardando...' : 'Guardar WhatsApp'}
                </button>
                {clientProfileError && <span className="text-xs text-rose-600">{clientProfileError}</span>}
                {clientProfileNotice && <span className="text-xs text-emerald-600">{clientProfileNotice}</span>}
              </div>
            </>
          )}
        </section>

        <section className="grid gap-4">
          <article id="nueva-solicitud-cliente" className={activeClientView === 'request' ? 'grid gap-4' : 'hidden'}>
            <div className={clientPanelCardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nueva solicitud</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{requestSteps[requestStep - 1].label}</h2>
                </div>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {requestStep}/3
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                <div className="grid gap-2 sm:grid-cols-3">
                  {requestSteps.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setRequestStep(step.id)}
                      className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                        requestStep === step.id
                          ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em]">Paso {step.id}</span>
                      <span className="mt-0.5 block font-semibold">{step.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-600">{requestSteps[requestStep - 1].guide}</p>
              </div>
            </div>

            <div className={clientPanelCardClass}>
            <div className={`grid gap-3 sm:grid-cols-2 ${requestStep === 1 ? '' : 'hidden'}`}>
              <div>
                <label className="text-xs font-semibold text-slate-600">Título</label>
                <input
                  ref={requestTitleInputRef}
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ej: No enfria el aire del living"
                  className={clientPanelInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Categoría</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Ej: Refrigeracion"
                  className={clientPanelInputClass}
                />
              </div>
            </div>

            <div className={requestStep === 2 ? 'relative mt-3' : 'hidden'}>
                <label className="text-xs font-semibold text-slate-600">Dirección</label>
              <input
                value={form.address}
                onChange={(event) => {
                  const nextAddress = event.target.value;
                  clearConfirmedAddress();
                  setForm((prev) => ({ ...prev, address: nextAddress }));
                  scheduleAddressLookup(nextAddress);
                }}
                onFocus={() => {
                  if (addressCandidates.length > 0 && locationLat === null && locationLng === null) {
                    setAddressDropdownOpen(true);
                  }
                }}
                placeholder="Calle y numero. Ej: Corrientes 1234"
                className={clientPanelInputClass}
              />
              {addressDropdownOpen && addressCandidates.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    Selecciona una direccion
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {addressCandidates.map((candidate) => {
                      const key = getAddressCandidateKey(candidate);
                      const selected = key === selectedAddressCandidateKey;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => applyAddressCandidate(candidate)}
                          className={`block w-full px-3 py-2.5 text-left text-sm transition ${
                            selected
                              ? 'bg-slate-950 text-white'
                              : 'text-slate-800 hover:bg-blue-600 hover:text-white'
                          }`}
                        >
                          <span className="block font-semibold">
                            {candidate.primaryLabel}
                            {candidate.secondaryLabel ? ` - ${candidate.secondaryLabel}` : ''}
                          </span>
                          <span className={`mt-0.5 block text-xs ${selected ? 'text-white/80' : 'text-slate-500'}`}>
                            {candidate.accuracyLabel || (candidate.precision === 'exact' ? 'Altura exacta' : 'Confirmar en mapa')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`mt-3 grid gap-3 sm:grid-cols-3 ${requestStep === 1 ? 'hidden' : ''}`}>
              <div className={requestStep === 2 ? '' : 'hidden'}>
                <label className="text-xs font-semibold text-slate-600">Ciudad</label>
                <input
                  value={form.city}
                  onChange={(event) => {
                    const nextCity = event.target.value;
                    clearConfirmedAddress();
                    setForm((prev) => ({ ...prev, city: nextCity }));
                    scheduleAddressLookup(form.address, nextCity);
                  }}
                  placeholder="Ej: CABA, Palermo, Vicente Lopez"
                  className={clientPanelInputClass}
                />
              </div>
              <div className={requestStep === 3 ? '' : 'hidden'}>
                <label className="text-xs font-semibold text-slate-600">Urgencia</label>
                <select
                  value={form.urgency}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, urgency: event.target.value as CreateRequestForm['urgency'] }))
                  }
                  className={clientPanelInputClass + ' font-semibold'}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className={requestStep === 3 ? '' : 'hidden'}>
                <label className="text-xs font-semibold text-slate-600">Franja horaria (opcional)</label>
                <input
                  value={form.preferredWindow}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredWindow: event.target.value }))}
                  placeholder="Ej: 14:00 - 18:00"
                  className={clientPanelInputClass}
                />
              </div>
            </div>

            <div className={requestStep === 2 ? 'mt-3 space-y-3' : 'hidden'}>
              {validatingAddress && <p className="text-xs text-slate-500">Buscando ubicaciones...</p>}
              {!validatingAddress && addressValidationError && (
                <p className="text-xs font-medium text-rose-600">{addressValidationError}</p>
              )}
              {currentRequestMapLinks && locationLat !== null && locationLng !== null && (
                <div
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                >
                  <p className="font-semibold">Ubicacion confirmada</p>
                  <p className="mt-1">
                    {confirmedAddressLabel || [form.address, form.city].filter(Boolean).join(', ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={currentRequestMapLinks.googleMapsHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Google Maps
                    </a>
                    <a
                      href={currentRequestMapLinks.appleMapsHref}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Apple Maps
                    </a>
                  </div>
                  {currentRequestMapEmbedUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white">
                      <iframe
                        title="Mapa de la solicitud"
                        src={currentRequestMapEmbedUrl}
                        className="h-64 w-full border-0"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              )}
              {!validatingAddress &&
                !addressValidationError &&
                locationLat === null &&
                locationLng === null &&
                !addressDropdownOpen &&
                requestGeoNotice && <p className="text-xs text-slate-500">{requestGeoNotice}</p>}
            </div>

            <div className="hidden">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingRequestGeo || savingRequest}
                  className={clientPanelSecondaryButtonClass + ' text-xs disabled:opacity-60'}
                >
                  {locatingRequestGeo
                    ? 'Detectando ubicación...'
                    : locationLat !== null && locationLng !== null
                      ? 'Actualizar ubicación'
                      : 'Usar mi ubicación'}
                </button>
                <button
                  type="button"
                  onClick={() => handleValidateAddress()}
                  disabled={validatingAddress || savingRequest}
                  className={clientPanelPrimaryButtonClass + ' text-xs disabled:opacity-60'}
                >
                  {validatingAddress ? 'Validando...' : 'Validar direccion'}
                </button>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                  Radio (km)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.radiusKm}
                    onChange={(event) => {
                      const value = Number(event.target.value || 20);
                      if (!Number.isFinite(value)) return;
                      setForm((prev) => ({
                        ...prev,
                        radiusKm: Math.min(100, Math.max(1, Math.round(value))),
                      }));
                    }}
                    className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>
              {locationLat !== null && locationLng !== null ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                  <p className="font-semibold">
                    Punto confirmado: {locationSource === 'gps' ? 'GPS del dispositivo' : 'Direccion validada'}
                  </p>
                  {confirmedAddressLabel && <p className="mt-1">{confirmedAddressLabel}</p>}
                  <p className="mt-1 text-emerald-700">
                    Coordenadas: {locationLat.toFixed(6)}, {locationLng.toFixed(6)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">
                  Si no activas geo, UrbanFix intentará ubicar por dirección + ciudad.
                </p>
              )}
              {addressValidationError && <p className="mt-2 text-[11px] text-rose-600">{addressValidationError}</p>}
              {!addressDropdownOpen && addressCandidates.length > 1 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Otras coincidencias
                  </p>
                  {addressCandidates.slice(1, 4).map((candidate) => (
                    <button
                      key={`${candidate.lat}-${candidate.lng}-${candidate.displayName}`}
                      type="button"
                      onClick={() => applyAddressCandidate(candidate)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <span className="block font-semibold text-slate-800">{candidate.primaryLabel}</span>
                      <span className="mt-0.5 block">{candidate.secondaryLabel || candidate.displayName}</span>
                      {candidate.accuracyLabel && <span className="mt-1 block text-slate-500">{candidate.accuracyLabel}</span>}
                    </button>
                  ))}
                </div>
              )}
              {requestGeoNotice && <p className="mt-1 text-[11px] text-slate-600">{requestGeoNotice}</p>}
            </div>

            <div className={requestStep === 1 ? 'mt-3' : 'hidden'}>
              <label className="text-xs font-semibold text-slate-600">Descripción</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Contanos que pasa, desde cuando y si hay algo urgente."
                className={clientPanelInputClass}
              />
            </div>

            <div className="hidden">
              <p className="text-xs font-semibold text-slate-700">Modo de solicitud</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'marketplace' }))}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    form.mode === 'marketplace'
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'
                  }`}
                >
                  Cotización múltiple
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'direct' }))}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    form.mode === 'direct'
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950'
                  }`}
                >
                  Asignación directa
                </button>
              </div>

              {form.mode === 'direct' && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-slate-600">Selecciona técnico por zona</label>
                    <button
                      type="button"
                      onClick={() => loadNearbyTechnicians(form.radiusKm)}
                      disabled={nearbyLoading}
                      className={clientPanelSecondaryButtonClass + ' px-3 py-1 text-[11px] disabled:opacity-60'}
                    >
                      {nearbyLoading ? 'Actualizando...' : 'Actualizar zona'}
                    </button>
                  </div>
                  <select
                    value={form.targetTechnicianId}
                    onChange={(event) => {
                      const selectedId = event.target.value;
                      const selected = nearbyTechnicians.find((tech) => tech.id === selectedId) || null;
                      setForm((prev) => ({
                        ...prev,
                        targetTechnicianId: selectedId,
                        targetTechnicianName: selected?.name || '',
                        targetTechnicianPhone: selected?.phone || '',
                      }));
                    }}
                    className={clientPanelInputClass.replace('mt-2 ', '')}
                  >
                    <option value="">Seleccionar técnico cercano</option>
                    {nearbyTechnicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} | {tech.city || 'Zona sin ciudad'} | {tech.distanceKm.toFixed(1)} km
                      </option>
                    ))}
                  </select>

                  {selectedNearbyTechnician ? (
                    <div className="rounded-2xl border border-[#e5dcec] bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">{selectedNearbyTechnician.name}</p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {selectedNearbyTechnician.specialty} | {selectedNearbyTechnician.city || 'Zona no informada'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Distancia {selectedNearbyTechnician.distanceKm.toFixed(1)} km
                        {selectedNearbyTechnician.phone ? ` | ${selectedNearbyTechnician.phone}` : ''}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Elige un tecnico de la zona para enviar la solicitud directa.
                    </p>
                  )}

                  {nearbyWarning && <p className="text-[11px] text-amber-700">{nearbyWarning}</p>}
                  {nearbyError && <p className="text-[11px] text-rose-600">{nearbyError}</p>}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setRequestStep((current) => (current === 1 ? 1 : ((current - 1) as 1 | 2 | 3)))}
                disabled={requestStep === 1 || savingRequest}
                className={clientPanelSecondaryButtonClass + ' disabled:cursor-not-allowed disabled:opacity-50'}
              >
                Anterior
              </button>
              {requestStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (requestStep === 2 && locationLat === null && locationLng === null) {
                      void handleValidateAddress();
                      return;
                    }
                    setRequestStep((current) => (current === 3 ? 3 : ((current + 1) as 1 | 2 | 3)));
                  }}
                  disabled={savingRequest || validatingAddress}
                  className={clientPanelPrimaryButtonClass + ' min-w-28'}
                >
                  {validatingAddress ? 'Validando...' : 'Siguiente'}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handlePublishRequest}
              disabled={savingRequest || !isClientProfileComplete}
              className={`${clientPanelPrimaryButtonClass} mt-3 min-h-12 w-full ${requestStep === 3 ? '' : 'hidden'}`}
            >
              {savingRequest
                ? 'Publicando...'
                : isClientProfileComplete
                  ? 'Publicar solicitud'
                  : 'Agrega foto y WhatsApp para publicar'}
            </button>

            {requestError && <p className="mt-3 text-xs text-rose-600">{requestError}</p>}
            {requestNotice && <p className="mt-3 text-xs text-emerald-600">{requestNotice}</p>}
            </div>
          </article>

          <article id="mapa-solicitudes-cliente" className={activeClientView === 'map' ? 'min-h-[calc(100dvh-57px)] bg-slate-100 px-4 py-5 sm:px-6 lg:px-8' : 'hidden'}>
            <div className="rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mapa cliente</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Solicitudes de presupuesto</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Visualiza las direcciones cargadas y las respuestas de tecnicos asociadas a cada solicitud.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshWorkspace}
                    disabled={loadingRequests}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingRequests ? 'Actualizando...' : 'Actualizar solicitudes'}
                  </button>
                  <button
                    type="button"
                    onClick={openRequestSection}
                    className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Nueva solicitud
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:order-1">
                  <div className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                    <p>Solicitudes visibles: {clientMapPoints.length}</p>
                    <p className="mt-1 text-slate-500">Selecciona una solicitud para centrar el mapa.</p>
                  </div>
                  <div className="mt-3 max-h-[360px] space-y-2 overflow-auto pr-1">
                    {requestsWithMap.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                        Todavia no hay solicitudes con punto confirmado.
                      </div>
                    )}
                    {requestsWithMap.map((item, index) => {
                      const responseCount = visibleResponseCount(item.responses);
                      const isSelected = !clientMapShowAll && selectedMapRequest?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientRequestId(item.id);
                            setClientMapShowAll(false);
                          }}
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{item.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSelected ? 'bg-white/20 text-white' : urgencyClass(item.urgency)}`}>
                              {item.urgency}
                            </span>
                          </div>
                          <p className={`mt-1 text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {item.category} · {item.city || 'Sin ciudad'}
                          </p>
                          <p className={`mt-1 text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            {item.address || 'Sin direccion'}
                          </p>
                          <div className={`mt-2 flex flex-wrap gap-2 text-[11px] font-semibold ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                            <span>Pin {index + 1}</span>
                            <span>{responseCount} {responseCount === 1 ? 'respuesta' : 'respuestas'}</span>
                            <span>Estado: {String(item.status || '').toUpperCase()}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:order-2">
                  {clientMapView.url ? (
                    <iframe
                      title="Mapa de solicitudes UrbanFix"
                      src={clientMapView.url}
                      className="h-[360px] w-full border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      No hay puntos geolocalizados todavia. Valida una direccion al cargar tu proxima solicitud.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs">
                    <span className="font-semibold text-slate-700">
                      {!clientMapShowAll && selectedClientMapPoint
                        ? `Solicitud seleccionada: ${selectedClientMapPoint.title}`
                        : clientMapPoints.length > 0
                          ? 'Vista general: todas tus solicitudes visibles'
                          : 'Sin puntos visibles'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {!clientMapShowAll && (
                        <button
                          type="button"
                          onClick={() => setClientMapShowAll(true)}
                          className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-900"
                        >
                          Ver todas
                        </button>
                      )}
                      {selectedClientMapPoint && (
                        <a
                          href={buildOsmLink(selectedClientMapPoint.lat, selectedClientMapPoint.lng, clientMapShowAll ? 12 : 16)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-900"
                        >
                          Abrir zona en mapa
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                  <p>Puntos visibles en mapa: {clientMapPoints.length}</p>
                  {requests.length > requestsWithMap.length && (
                    <p className="mt-1 text-amber-700">
                      Sin coordenadas confirmadas: {requests.length - requestsWithMap.length}
                    </p>
                  )}
                  <p className="mt-1 font-semibold text-emerald-700">
                    Modo actual: {clientMapShowAll ? 'vista general' : 'solicitud seleccionada'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tus solicitudes</p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">Seguimiento por direccion</h3>
              </div>

            {loadingRequests && requests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p>
            ) : requests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Todavia no publicaste solicitudes.
              </div>
            ) : requestsWithMap.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Tus solicitudes todavia no tienen punto confirmado. Valida una direccion al cargar la proxima solicitud.
              </div>
            ) : (
              <>
                {loadingRequests && (
                  <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Actualizando solicitudes...
                  </p>
                )}

                {selectedMapRequest && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Solicitud seleccionada</p>
                        <h3 className="mt-1 text-base font-semibold text-slate-950">{selectedMapRequest.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedMapRequest.address}{selectedMapRequest.city ? `, ${selectedMapRequest.city}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${urgencyClass(selectedMapRequest.urgency)}`}>
                          {selectedMapRequest.urgency}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeByStatus(selectedMapRequest.status)}`}>
                          {selectedMapRequest.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedGoogleMapsHref && (
                        <a
                          href={selectedGoogleMapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className={clientPanelSecondaryButtonClass}
                        >
                          Abrir en Google
                        </a>
                      )}
                      {selectedAppleMapsHref && (
                        <a
                          href={selectedAppleMapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className={clientPanelSecondaryButtonClass}
                        >
                          Abrir en Apple
                        </a>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Postulaciones recibidas</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {selectedMapResponses.length > 0
                              ? 'Revisa disponibilidad, mensaje y contacto antes de elegir.'
                              : 'Todavia no hay tecnicos postulados.'}
                          </p>
                        </div>
                        {selectedMapResponses.length > 0 && (
                          <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                            {selectedMapResponses.length}
                          </span>
                        )}
                      </div>

                      {clientResponseActionError && <p className="mt-3 text-xs text-rose-600">{clientResponseActionError}</p>}
                      {clientResponseActionNotice && <p className="mt-3 text-xs text-emerald-600">{clientResponseActionNotice}</p>}

                      {selectedMapResponses.length > 0 && (
                        <div className="mt-3 grid gap-3">
                          {selectedMapResponses.map((responseItem) => {
                            const statusMeta = responseStatusMeta(responseItem.quoteStatus, responseItem.responseType);
                            const actionBaseId = `${selectedMapRequest.id}:${responseItem.id}`;
                            const isRejected = String(responseItem.quoteStatus).toLowerCase() === 'rejected';
                            const isAccepted = String(responseItem.quoteStatus).toLowerCase() === 'accepted';
                            const isDirectQuote = responseItem.responseType === 'direct_quote';
                            return (
                              <div key={responseItem.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-950">
                                        {responseItem.businessName || responseItem.technicianName}
                                      </p>
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusMeta.className}`}>
                                        {statusMeta.label}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {responseItem.specialty}
                                      {responseItem.city ? ` | ${responseItem.city}` : ''}
                                      {responseItem.rating !== null ? ` | ${responseItem.rating.toFixed(1)} / 5` : ''}
                                    </p>
                                  </div>
                                  <div className="text-left sm:text-right">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {isDirectQuote ? formatArs(responseItem.priceArs) : 'Postulado'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {isDirectQuote
                                        ? `ETA ${Math.round(Number(responseItem.etaHours || 0)) || '-'} h`
                                        : `Disponible en ${Math.round(Number(responseItem.visitEtaHours || 0)) || '-'} h`}
                                    </p>
                                  </div>
                                </div>

                                {responseItem.responseMessage && (
                                  <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                                    {responseItem.responseMessage}
                                  </p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {responseItem.phone && (
                                    <a
                                      href={`https://wa.me/${responseItem.phone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={clientPanelSecondaryButtonClass}
                                    >
                                      WhatsApp
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleClientResponseAction(selectedMapRequest, responseItem, 'select')}
                                    disabled={isRejected || isAccepted || clientResponseActionId.startsWith(actionBaseId)}
                                    className={clientPanelPrimaryButtonClass}
                                  >
                                    {clientResponseActionId === `${actionBaseId}:select` ? 'Guardando...' : isAccepted ? 'Elegida' : 'Elegir tecnico'}
                                  </button>
                                  {!isRejected && !isAccepted && (
                                    <button
                                      type="button"
                                      onClick={() => handleClientResponseAction(selectedMapRequest, responseItem, 'reject')}
                                      disabled={clientResponseActionId.startsWith(actionBaseId)}
                                      className={clientPanelSecondaryButtonClass}
                                    >
                                      {clientResponseActionId === `${actionBaseId}:reject` ? 'Rechazando...' : 'Rechazar'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-2">
                  {requestsWithMap.map((item, index) => {
                    const responseCount = visibleResponseCount(item.responses);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedClientRequestId(item.id)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          selectedMapRequest?.id === item.id
                            ? 'border-[#2a0338] bg-[#fbf7fc] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pin {index + 1}</p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-950">{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {item.address}{item.city ? `, ${item.city}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeByStatus(item.status)}`}>
                              {item.status}
                            </span>
                            {responseCount > 0 && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                {responseCount} {responseCount === 1 ? 'postulacion' : 'postulaciones'}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            </div>
          </article>

          <article id="vidriera-cliente" className={activeClientView === 'showcase' ? clientPanelCardClass : 'hidden'}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Vidriera cliente</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Tecnicos para tu zona</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Vista privada del cliente. Usa tu ciudad, direccion y radio para mostrar perfiles disponibles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadNearbyTechnicians(form.radiusKm)}
                disabled={nearbyLoading}
                className={clientPanelSecondaryButtonClass + ' disabled:cursor-not-allowed disabled:opacity-60'}
              >
                {nearbyLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">{nearbyTechnicians.length} visibles</span>
                {nearbyCenterLabel && <span>Zona: {nearbyCenterLabel}</span>}
                <span>Radio: {form.radiusKm} km</span>
              </div>
              {nearbyWarning && <p className="mt-2 text-xs text-amber-700">{nearbyWarning}</p>}
              {nearbyError && <p className="mt-2 text-xs text-rose-600">{nearbyError}</p>}
            </div>

            {nearbyLoading ? (
              <p className="mt-4 text-sm text-slate-500">Cargando tecnicos...</p>
            ) : nearbyTechnicians.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No hay tecnicos visibles para esta zona. Completa el perfil o amplia el radio desde la solicitud.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {nearbyTechnicians.slice(0, 12).map((tech) => (
                  <div key={tech.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{tech.name}</p>
                        <p className="mt-1 text-xs text-slate-600">{tech.specialty}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-semibold ${
                          tech.availableNow ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tech.availableNow ? 'Disponible' : 'Consultar'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p>{tech.city || 'Zona sin ciudad'}{tech.zoneLabel ? ` | ${tech.zoneLabel}` : ''}</p>
                      <p>{tech.distanceKm.toFixed(1)} km{tech.rating !== null ? ` | ${tech.rating.toFixed(1)} / 5` : ''}</p>
                      {tech.workingHoursLabel && <p>{tech.workingHoursLabel}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          mode: 'direct',
                          targetTechnicianId: tech.id,
                          targetTechnicianName: tech.name,
                          targetTechnicianPhone: tech.phone,
                          category: prev.category || tech.specialty,
                          city: prev.city || tech.city,
                        }));
                        setActiveClientView('request');
                        setRequestStep(1);
                        window.setTimeout(() => {
                          document.getElementById('nueva-solicitud-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          requestTitleInputRef.current?.focus();
                        }, 120);
                      }}
                      className={clientPanelPrimaryButtonClass + ' mt-4 w-full'}
                    >
                      Pedir presupuesto
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>

          <div className="hidden">
            <article id="tecnicos-cercanos" className={clientPanelCardClass}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Técnicos por zona</p>
                  <h2 className="text-lg font-semibold text-slate-950">Cercanos</h2>
                </div>
                <button
                  type="button"
                  onClick={() => loadNearbyTechnicians(form.radiusKm)}
                  disabled={nearbyLoading}
                  className={clientPanelSecondaryButtonClass + ' px-3 py-1.5 text-[11px] disabled:opacity-60'}
                >
                  {nearbyLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
              {nearbyCenterLabel && (
                <p className="mt-2 text-xs text-slate-500">Centro de búsqueda: {nearbyCenterLabel}</p>
              )}
              {nearbyError && <p className="mt-2 text-xs text-rose-600">{nearbyError}</p>}
              {nearbyWarning && <p className="mt-2 text-xs text-amber-700">{nearbyWarning}</p>}

              {nearbyLoading ? (
                <p className="mt-4 text-sm text-slate-500">Buscando técnicos por zona...</p>
              ) : nearbyTechnicians.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  Sin técnicos cercanos visibles con el radio actual.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {nearbyTechnicians.slice(0, 8).map((tech) => (
                    <div key={tech.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-slate-900">{tech.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {tech.specialty} | {tech.city || 'Zona sin ciudad'} | {tech.distanceKm.toFixed(1)} km
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {tech.availableNow ? 'Disponible ahora' : 'Fuera de horario'}
                        {tech.rating !== null ? ` | ${tech.rating.toFixed(1)} / 5` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={clientPanelCardClass}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Tus solicitudes</p>
                  <h2 className="text-lg font-semibold text-slate-950">Historial</h2>
                </div>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {requests.length}
                </span>
              </div>

              {loadingRequests ? (
                <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p>
              ) : requests.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  Aún no publicaste solicitudes.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {requests.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {item.category} {item.city ? `| ${item.city}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${urgencyClass(
                              item.urgency
                            )}`}
                          >
                            {item.urgency}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${badgeByStatus(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs text-slate-600">{item.description}</p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleString('es-AR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
