'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/supabase';
import Link from 'next/link';
import { LogOut, Settings, User } from 'lucide-react';
import PublicTopNav from '../../components/PublicTopNav';

type ClientRequestRow = {
  id: string;
  title: string;
  category: string;
  city: string | null;
  description: string;
  urgency: string;
  status: string;
  mode: string;
  created_at: string;
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
  city: string;
  address: string;
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
  city: '',
  address: '',
};

const CREATE_REQUEST_INTENT = 'create-request';

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

const normalizeClientRequestRow = (raw: any): ClientRequestRow => ({
  id: String(raw?.id || ''),
  title: String(raw?.title || 'Solicitud'),
  category: String(raw?.category || 'General'),
  city: raw?.city ? String(raw.city) : null,
  description: String(raw?.description || ''),
  urgency: String(raw?.urgency || 'media'),
  status: String(raw?.status || 'published'),
  mode: String(raw?.mode || 'marketplace'),
  created_at: String(raw?.created_at || raw?.updated_at || raw?.updatedAt || new Date().toISOString()),
});

const normalizeRadiusKm = (value: unknown, fallback = 20) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, Math.round(parsed)));
};

const clientPanelSurfaceClass =
  'rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,244,237,0.98)_58%,rgba(246,238,248,0.96)_100%)] shadow-[0_28px_80px_-40px_rgba(42,3,56,0.34)]';

const clientPanelCardClass =
  'rounded-[30px] border border-white/80 bg-white/84 p-6 shadow-[0_24px_56px_-42px_rgba(42,3,56,0.34)] backdrop-blur';

const clientPanelMutedCardClass =
  'rounded-[24px] border border-[#e8dff0] bg-[linear-gradient(180deg,rgba(247,239,248,0.9),rgba(255,255,255,0.86))] p-4';

const clientPanelInputClass =
  'mt-2 w-full rounded-2xl border border-[#ddd7ea] bg-white/92 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#ff8f1f] focus:ring-2 focus:ring-[#f8e4cb]';

const clientPanelPrimaryButtonClass =
  'rounded-full bg-[linear-gradient(135deg,#2a0338,#4a1260)] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_32px_-22px_rgba(42,3,56,0.95)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55';

const clientPanelSecondaryButtonClass =
  'rounded-full border border-[#d8cfdf] bg-white/88 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#ff8f1f]/60 hover:text-[#2a0338]';

export default function ClientRequestsHub() {
  const requestTitleInputRef = useRef<HTMLInputElement | null>(null);
  const clientProfileNameInputRef = useRef<HTMLInputElement | null>(null);
  const profileIntentHandledRef = useRef(false);
  const requestIntentHandledRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createRequestIntent, setCreateRequestIntent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [form, setForm] = useState<CreateRequestForm>(defaultForm);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestNotice, setRequestNotice] = useState('');
  const [requests, setRequests] = useState<ClientRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locatingRequestGeo, setLocatingRequestGeo] = useState(false);
  const [requestGeoNotice, setRequestGeoNotice] = useState('');
  const [clientProfileForm, setClientProfileForm] = useState<ClientProfileForm>(defaultClientProfileForm);
  const [loadingClientProfile, setLoadingClientProfile] = useState(false);
  const [savingClientProfile, setSavingClientProfile] = useState(false);
  const [clientProfileError, setClientProfileError] = useState('');
  const [clientProfileNotice, setClientProfileNotice] = useState('');
  const [nearbyTechnicians, setNearbyTechnicians] = useState<NearbyTechnician[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyWarning, setNearbyWarning] = useState('');
  const [nearbyCenterLabel, setNearbyCenterLabel] = useState('');
  const [isDesktopNavExpanded, setIsDesktopNavExpanded] = useState(false);

  useEffect(() => {
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
    document.getElementById('perfil-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusField) {
      window.setTimeout(() => {
        clientProfileNameInputRef.current?.focus();
      }, 220);
    }
  };

  const clientSidebarAccountLabel = clientProfileForm.fullName.trim() || session?.user?.email || 'Tu cuenta';

  const fetchRequests = async () => {
    if (!session?.access_token) return;
    setLoadingRequests(true);
    setRequestError('');
    try {
      const response = await fetch('/api/client/requests', {
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
      setRequestError(error?.message || 'No se pudieron cargar tus solicitudes.');
    } finally {
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
        .select('id, full_name, phone, city, address, company_address, email')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;

      let profileRow: any = data || null;
      if (!profileRow) {
        const fallback = {
          id: userId,
          email: session?.user?.email || null,
          full_name: session?.user?.user_metadata?.full_name || '',
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(fallback)
          .select('id, full_name, phone, city, address, company_address, email')
          .single();
        if (createError) throw createError;
        profileRow = created;
      }

      const city = String(profileRow?.city || '').trim();
      const address = String(profileRow?.address || profileRow?.company_address || '').trim();

      setClientProfileForm({
        fullName: String(profileRow?.full_name || '').trim(),
        phone: String(profileRow?.phone || '').trim(),
        city,
        address,
      });
      setForm((prev) => ({ ...prev, city: prev.city || city }));
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
      if ((form.city.trim() || clientProfileForm.city.trim())) {
        params.set('city', form.city.trim() || clientProfileForm.city.trim());
      }
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
    setAuthError('');
    setAuthNotice('');
    const redirectTo = `${window.location.origin}/cliente${window.location.search || ''}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) setAuthError(error.message || 'No se pudo continuar con Google.');
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    setAuthNotice('');
    setAuthLoading(true);
    try {
      const safeEmail = email.trim().toLowerCase();
      if (!safeEmail || !password) {
        throw new Error('Ingresa email y contraseña.');
      }
      if (!safeEmail.includes('@')) {
        throw new Error('Ingresa un email válido.');
      }
      if (password.trim().length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) throw error;
      } else {
        const safeFullName = fullName.trim() || 'Cliente UrbanFix';
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              full_name: safeFullName,
            },
          },
        });
        if (error) throw error;
        setAuthNotice(
          signUpData?.session
            ? 'Cuenta creada. Ya puedes completar tu perfil y publicar tu primera solicitud.'
            : 'Cuenta creada. Revisa tu correo para confirmar y luego entra: el perfil base se completará al iniciar sesión.'
        );
        setPassword('');
      }
    } catch (error: any) {
      setAuthError(error?.message || 'No se pudo iniciar sesión.');
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
      const fullName = clientProfileForm.fullName.trim();
      const phone = clientProfileForm.phone.trim();
      const city = clientProfileForm.city.trim();
      const address = clientProfileForm.address.trim();
      if (!fullName || !phone || !city) {
        throw new Error('Completa nombre, teléfono y ciudad para guardar tu perfil.');
      }

      const payload = {
        id: session.user.id,
        email: session.user.email || null,
        full_name: fullName,
        phone,
        city,
        address: address || null,
      };

      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;

      setClientProfileNotice('Perfil de cliente guardado.');
      setForm((prev) => ({ ...prev, city: prev.city || city }));
      await loadNearbyTechnicians(form.radiusKm);
    } catch (error: any) {
      setClientProfileError(error?.message || 'No se pudo guardar tu perfil.');
    } finally {
      setSavingClientProfile(false);
    }
  };

  const handlePublishRequest = async () => {
    if (!session?.access_token) return;
    setSavingRequest(true);
    setRequestError('');
    setRequestNotice('');
    try {
      if (!isClientProfileComplete) {
        throw new Error('Completa tu perfil de cliente antes de publicar una solicitud.');
      }
      if (!form.title.trim() || !form.category.trim() || !form.address.trim() || !form.description.trim()) {
        throw new Error('Completa título, categoría, dirección y descripción.');
      }
      const response = await fetch('/api/client/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          city: form.city.trim() || clientProfileForm.city.trim(),
          locationLat,
          locationLng,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo publicar la solicitud.');
      const matchesCount = Array.isArray(payload?.matches) ? payload.matches.length : 0;
      const warning = String(payload?.warning || '').trim();
      setRequestNotice(
        matchesCount > 0
          ? `Solicitud publicada. Encontramos ${matchesCount} técnico(s) cercano(s).`
          : 'Solicitud publicada. Aún no hay técnicos cercanos disponibles.'
      );
      setRequestGeoNotice(warning);
      setForm((prev) => ({
        ...defaultForm,
        city: prev.city || clientProfileForm.city.trim(),
        radiusKm: prev.radiusKm || defaultForm.radiusKm,
      }));
      clearCreateRequestIntent();
      await fetchRequests();
      await loadNearbyTechnicians(form.radiusKm);
    } catch (error: any) {
      setRequestError(error?.message || 'No se pudo publicar la solicitud.');
    } finally {
      setSavingRequest(false);
    }
  };

  const clientProfileMissingFields = useMemo(() => {
    const missing: string[] = [];
    if (!clientProfileForm.fullName.trim()) missing.push('Nombre');
    if (!clientProfileForm.phone.trim()) missing.push('Telefono');
    if (!clientProfileForm.city.trim()) missing.push('Ciudad');
    return missing;
  }, [clientProfileForm.city, clientProfileForm.fullName, clientProfileForm.phone]);

  const isClientProfileComplete = clientProfileMissingFields.length === 0;
  const clientSetupSteps = useMemo(
    () => [
      {
        key: 'profile',
        title: 'Completa tu perfil',
        description: 'Nombre, teléfono y ciudad para activar la operativa.',
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

  const handleRefreshWorkspace = async () => {
    await Promise.all([fetchRequests(), loadNearbyTechnicians(form.radiusKm)]);
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
      setClientProfileNotice((current) => current || 'Completa tu perfil para desbloquear la publicación de la solicitud.');
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

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-slate-100">
        <PublicTopNav activeHref="/cliente" sticky />
        <div className="flex items-center justify-center px-6 py-10 md:px-10">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
            Cargando acceso de cliente...
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-100">
        <PublicTopNav activeHref="/cliente" sticky />
        <div className="p-6 md:p-10">
          <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
              {createRequestIntent ? 'Crear solicitud' : 'UrbanFix clientes'}
            </p>
            <h1 className="mt-4 text-4xl font-black text-slate-900">
              {createRequestIntent ? 'Crea tu cuenta y publica tu solicitud' : 'Publica tu solicitud y recibe técnicos cercanos'}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {createRequestIntent
                ? 'Entras, completas tu perfil y publicas el trabajo para que UrbanFix busque técnicos cercanos según tu zona.'
                : 'Este panel te permite crear solicitudes de trabajo para que UrbanFix busque técnicos en un radio de 20 km según tu ubicación y urgencia.'}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Publicación en segundos</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Matching por distancia</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Solicitud directa opcional</li>
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: '1. Crea tu cuenta',
                  description: 'Entras con email o Google y quedas listo para operar sin vueltas.',
                },
                {
                  title: '2. Completa tu perfil',
                  description: 'Con nombre, teléfono y ciudad se activa mejor el matching por zona.',
                },
                {
                  title: '3. Publica y compara',
                  description: 'UrbanFix te muestra técnicos cercanos y deja trazable cada solicitud.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
            <Link
              href="/vidriera"
              className="mt-5 inline-flex rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver vidriera de técnicos
            </Link>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  authMode === 'login' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  authMode === 'register' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              className="mt-5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              {createRequestIntent ? 'Continuar y crear solicitud con Google' : 'Continuar con Google'}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              o
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Nombre y apellido</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-600">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleEmailAuth}
              disabled={authLoading}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {authLoading
                ? 'Procesando...'
                : authMode === 'login'
                  ? createRequestIntent
                    ? 'Ingresar y crear solicitud'
                    : 'Ingresar'
                  : createRequestIntent
                    ? 'Crear cuenta y continuar'
                    : 'Crear cuenta'}
            </button>

            {authError && <p className="mt-3 text-xs text-rose-600">{authError}</p>}
            {authNotice && <p className="mt-3 text-xs text-emerald-600">{authNotice}</p>}
          </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <PublicTopNav activeHref="/cliente" sticky />
      <div className="relative overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(42,3,56,0.08),_transparent_40%),radial-gradient(circle_at_right,_rgba(255,143,31,0.12),_transparent_28%)]" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-16 h-52 w-52 rounded-full bg-[#f5b942]/20 blur-3xl" />
        <div className="pointer-events-none fixed left-0 top-[57px] hidden h-[calc(100vh-57px)] [height:calc(100dvh-57px)] w-[78px] bg-[linear-gradient(180deg,#22062f_0%,#2a0338_48%,#1d0829_100%)] lg:block" />
        <div className="relative z-10 mx-auto flex w-full max-w-none gap-6 lg:pl-[106px]">
          <div className="hidden w-[78px] shrink-0 lg:block">
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
                    <div className="mb-3 px-4">
                      <p className="truncate text-[13px] font-medium text-white/92">{clientSidebarAccountLabel}</p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-white/38">Cuenta cliente</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Perfil' : undefined}
                      onClick={() => openClientProfileSection(false)}
                      className={`group relative flex items-center text-white transition hover:bg-white/8 hover:text-white ${
                        isDesktopNavExpanded
                          ? 'h-10 w-full gap-3 rounded-full px-4 text-left'
                          : 'mx-auto h-10 w-10 justify-center rounded-full'
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current">
                        <User className="h-5 w-5" />
                      </span>
                      {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-medium">Perfil</span>}
                    </button>

                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Configuración' : undefined}
                      onClick={() => openClientProfileSection(true)}
                      className={`group relative flex items-center text-white transition hover:bg-white/8 hover:text-white ${
                        isDesktopNavExpanded
                          ? 'h-10 w-full gap-3 rounded-full px-4 text-left'
                          : 'mx-auto h-10 w-10 justify-center rounded-full'
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current">
                        <Settings className="h-5 w-5" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">Configuración</span>
                      )}
                    </button>

                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Cerrar sesión' : undefined}
                      onClick={handleLogout}
                      className={`group relative flex items-center text-white transition hover:bg-white/8 hover:text-white ${
                        isDesktopNavExpanded
                          ? 'h-10 w-full gap-3 rounded-full px-4 text-left'
                          : 'mx-auto h-10 w-10 justify-center rounded-full'
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#ff9c1a] transition group-hover:brightness-105">
                        <LogOut className="h-5 w-5" />
                      </span>
                      {isDesktopNavExpanded && (
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">Cerrar sesión</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className={`${clientPanelSurfaceClass} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#7a6786]">Panel cliente</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Solicitudes de trabajo</h1>
              <p className="mt-1 text-sm text-slate-600">{session.user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#e6ddea] bg-white/86 px-3 py-1 text-xs font-semibold text-slate-700">
                Total: {requestsByStatus.total}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Matcheadas: {requestsByStatus.matched}
              </span>
              <button
                type="button"
                onClick={() => openClientProfileSection(false)}
                className={clientPanelSecondaryButtonClass + ' lg:hidden'}
              >
                Perfil
              </button>
              <button
                type="button"
                onClick={() => openClientProfileSection(true)}
                className={clientPanelSecondaryButtonClass + ' lg:hidden'}
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
                className={clientPanelPrimaryButtonClass + ' lg:hidden'}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <section className={clientPanelSurfaceClass + ' p-6'}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Primeros pasos</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {isClientProfileComplete
                  ? requests.length > 0
                    ? 'Tu cuenta ya está operando con una base mucho más clara.'
                    : 'Tu cuenta ya está lista. Solo falta publicar tu primera solicitud.'
                  : 'Tu registro ya quedó hecho. Ahora completa el perfil para desbloquear la operativa.'}
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

        <section id="perfil-cliente" className={clientPanelCardClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Perfil cliente</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Completa tu perfil para operar</h2>
              <p className="mt-1 text-sm text-slate-600">
                Este perfil es obligatorio para publicar solicitudes y coordinar con técnicos.
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">Nombre y apellido</label>
                  <input
                    ref={clientProfileNameInputRef}
                    value={clientProfileForm.fullName}
                    onChange={(event) => setClientProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    className={clientPanelInputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Teléfono</label>
                  <input
                    value={clientProfileForm.phone}
                    onChange={(event) => setClientProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className={clientPanelInputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Ciudad</label>
                  <input
                    value={clientProfileForm.city}
                    onChange={(event) => setClientProfileForm((prev) => ({ ...prev, city: event.target.value }))}
                    className={clientPanelInputClass}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600">Dirección base (opcional)</label>
                <input
                  value={clientProfileForm.address}
                  onChange={(event) => setClientProfileForm((prev) => ({ ...prev, address: event.target.value }))}
                  className={clientPanelInputClass}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveClientProfile}
                  disabled={savingClientProfile}
                  className={clientPanelPrimaryButtonClass}
                >
                  {savingClientProfile ? 'Guardando...' : 'Guardar perfil'}
                </button>
                {clientProfileError && <span className="text-xs text-rose-600">{clientProfileError}</span>}
                {clientProfileNotice && <span className="text-xs text-emerald-600">{clientProfileNotice}</span>}
              </div>
            </>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article id="nueva-solicitud-cliente" className={clientPanelCardClass}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Nueva solicitud</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Publicar trabajo</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Título</label>
                <input
                  ref={requestTitleInputRef}
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className={clientPanelInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Categoría</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Ej: Electricidad"
                  className={clientPanelInputClass}
                />
              </div>
            </div>

            <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600">Dirección</label>
              <input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className={clientPanelInputClass}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Ciudad</label>
                <input
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  className={clientPanelInputClass}
                />
              </div>
              <div>
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
              <div>
                <label className="text-xs font-semibold text-slate-600">Franja horaria (opcional)</label>
                <input
                  value={form.preferredWindow}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredWindow: event.target.value }))}
                  placeholder="Ej: 14:00 - 18:00"
                  className={clientPanelInputClass}
                />
              </div>
            </div>

            <div className={clientPanelMutedCardClass + ' mt-3'}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingRequestGeo || savingRequest}
                  className={clientPanelSecondaryButtonClass + ' px-3 py-1.5 text-[11px] disabled:opacity-60'}
                >
                  {locatingRequestGeo
                    ? 'Detectando ubicación...'
                    : locationLat !== null && locationLng !== null
                      ? 'Actualizar ubicación'
                      : 'Usar mi ubicación'}
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
                    className="w-20 rounded-xl border border-[#ddd7ea] bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                  />
                </label>
              </div>
              {locationLat !== null && locationLng !== null ? (
                <p className="mt-2 text-[11px] text-emerald-700">
                  Geo activa: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">
                  Si no activas geo, UrbanFix intentará ubicar por dirección + ciudad.
                </p>
              )}
              {requestGeoNotice && <p className="mt-1 text-[11px] text-slate-600">{requestGeoNotice}</p>}
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600">Descripción</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className={clientPanelInputClass}
              />
            </div>

            <div className={clientPanelMutedCardClass + ' mt-3'}>
              <p className="text-xs font-semibold text-slate-700">Modo de solicitud</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'marketplace' }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    form.mode === 'marketplace'
                      ? 'bg-[linear-gradient(135deg,#2a0338,#4a1260)] text-white shadow-[0_18px_32px_-22px_rgba(42,3,56,0.95)]'
                      : 'border border-[#d8cfdf] bg-white text-slate-700 hover:border-[#ff8f1f]/60 hover:text-[#2a0338]'
                  }`}
                >
                  Cotización múltiple
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'direct' }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    form.mode === 'direct'
                      ? 'bg-[linear-gradient(135deg,#2a0338,#4a1260)] text-white shadow-[0_18px_32px_-22px_rgba(42,3,56,0.95)]'
                      : 'border border-[#d8cfdf] bg-white text-slate-700 hover:border-[#ff8f1f]/60 hover:text-[#2a0338]'
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
                      Elige un técnico de la zona para enviar la solicitud directa.
                    </p>
                  )}

                  {nearbyWarning && <p className="text-[11px] text-amber-700">{nearbyWarning}</p>}
                  {nearbyError && <p className="text-[11px] text-rose-600">{nearbyError}</p>}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handlePublishRequest}
              disabled={savingRequest || !isClientProfileComplete}
              className={`${clientPanelPrimaryButtonClass} mt-5 w-full rounded-2xl py-3 text-sm`}
            >
              {savingRequest
                ? 'Publicando...'
                : isClientProfileComplete
                  ? 'Publicar solicitud'
                  : 'Completa tu perfil para publicar'}
            </button>

            {requestError && <p className="mt-3 text-xs text-rose-600">{requestError}</p>}
            {requestNotice && <p className="mt-3 text-xs text-emerald-600">{requestNotice}</p>}
          </article>

          <div className="space-y-6">
            <article id="tecnicos-cercanos" className={clientPanelCardClass}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a6786]">Técnicos por zona</p>
                  <h2 className="text-xl font-semibold text-slate-900">Disponibles cerca de tu obra</h2>
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
                <div className="mt-4 rounded-2xl border border-dashed border-[#ddd2e5] bg-[#faf5fc] p-4 text-sm text-slate-500">
                  Sin técnicos cercanos visibles con el radio actual.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {nearbyTechnicians.slice(0, 8).map((tech) => (
                    <div key={tech.id} className="rounded-2xl border border-[#e7dff0] bg-[linear-gradient(180deg,rgba(247,239,248,0.84),rgba(255,255,255,0.94))] px-3 py-3">
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
                  <h2 className="text-xl font-semibold text-slate-900">Historial reciente</h2>
                </div>
                <span className="rounded-full border border-[#e6ddea] bg-white/88 px-3 py-1 text-xs font-semibold text-slate-700">
                  {requests.length}
                </span>
              </div>

              {loadingRequests ? (
                <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p>
              ) : requests.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-[#ddd2e5] bg-[#faf5fc] p-4 text-sm text-slate-500">
                  Aún no publicaste solicitudes.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {requests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#e7dff0] bg-[linear-gradient(180deg,rgba(247,239,248,0.84),rgba(255,255,255,0.94))] p-4">
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
