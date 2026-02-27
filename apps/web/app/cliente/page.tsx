'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthHashHandler from '@/components/AuthHashHandler';
import { supabase } from '@/lib/supabase/supabase';

type ClientQuote = {
  id: string;
  technicianName: string;
  phone: string;
  priceArs: number | null;
  etaHours: number | null;
  quoteStatus: string;
};

type ClientRequestRow = {
  id: string;
  title: string;
  category: string;
  address: string;
  city: string;
  description: string;
  urgency: string;
  mode: string;
  status: string;
  updatedAt: string;
  assignedTechName?: string | null;
  assignedTechPhone?: string | null;
  quotes: ClientQuote[];
};

type KnownTechnician = {
  id: string;
  name: string;
  phone: string;
  specialty?: string | null;
};

type WorkspacePayload = {
  requests: ClientRequestRow[];
  knownTechnicians: KnownTechnician[];
  warning?: string | null;
};

const statusMeta: Record<string, { label: string; className: string }> = {
  published: { label: 'Publicada', className: 'bg-sky-100 text-sky-700' },
  matched: { label: 'Con tecnicos', className: 'bg-indigo-100 text-indigo-700' },
  quoted: { label: 'Con ofertas', className: 'bg-amber-100 text-amber-700' },
  direct_sent: { label: 'Directa enviada', className: 'bg-violet-100 text-violet-700' },
  selected: { label: 'Tecnico seleccionado', className: 'bg-emerald-100 text-emerald-700' },
  scheduled: { label: 'Agendada', className: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'En curso', className: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Finalizada', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', className: 'bg-rose-100 text-rose-700' },
};

const quoteStatusLabel = (value: string) => {
  if (value === 'accepted') return 'Aceptada';
  if (value === 'rejected') return 'Rechazada';
  if (value === 'submitted') return 'Enviada';
  return 'Pendiente';
};

const formatMoney = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('es-AR');
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('es-AR');
};

export default function ClientePage() {
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceWarning, setWorkspaceWarning] = useState('');
  const [requests, setRequests] = useState<ClientRequestRow[]>([]);
  const [knownTechnicians, setKnownTechnicians] = useState<KnownTechnician[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'baja' | 'media' | 'alta'>('media');
  const [preferredWindow, setPreferredWindow] = useState('');
  const [mode, setMode] = useState<'marketplace' | 'direct'>('marketplace');
  const [radiusKm, setRadiusKm] = useState('20');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const selectedTechnician = useMemo(
    () => knownTechnicians.find((item) => item.id === selectedTechnicianId) || null,
    [knownTechnicians, selectedTechnicianId]
  );

  const profileReady = useMemo(
    () => Boolean(fullName.trim() && phone.trim() && city.trim()),
    [fullName, phone, city]
  );

  const resetRequestForm = () => {
    setTitle('');
    setCategory('');
    setAddress('');
    setDescription('');
    setUrgency('media');
    setPreferredWindow('');
    setMode('marketplace');
    setRadiusKm('20');
    setSelectedTechnicianId('');
  };

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone, city')
      .eq('id', session.user.id)
      .maybeSingle();
    if (error) {
      setProfileMessage(error.message || 'No pudimos cargar tu perfil.');
      return;
    }
    if (data) {
      setFullName(String(data.full_name || ''));
      setPhone(String(data.phone || ''));
      setCity(String(data.city || ''));
    } else {
      setFullName(String(session.user.user_metadata?.full_name || ''));
      setPhone('');
      setCity('');
    }
  }, [session?.user?.id, session?.user?.user_metadata?.full_name]);

  const loadWorkspace = useCallback(async () => {
    if (!session?.access_token) return;
    setWorkspaceLoading(true);
    setWorkspaceError('');
    setWorkspaceWarning('');
    try {
      const response = await fetch('/api/client/requests', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json()) as WorkspacePayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar tu panel de cliente.');
      }
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
      setKnownTechnicians(Array.isArray(payload.knownTechnicians) ? payload.knownTechnicians : []);
      if (payload.warning) setWorkspaceWarning(String(payload.warning));
    } catch (error: any) {
      setWorkspaceError(error?.message || 'No se pudo cargar tu panel de cliente.');
    } finally {
      setWorkspaceLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.user?.id) return;
    loadProfile();
    loadWorkspace();
  }, [loadProfile, loadWorkspace, session?.user?.id]);

  const handleGoogleAuth = async () => {
    setAuthError('');
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/cliente` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) setAuthError(error.message || 'No pudimos iniciar con Google.');
  };

  const handleEmailAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const safeEmail = email.trim();
      if (!safeEmail || !password) {
        throw new Error('Completa email y contrasena.');
      }

      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) throw error;
      } else {
        if (!fullName.trim()) {
          throw new Error('Ingresa tu nombre completo para crear la cuenta.');
        }
        const redirectTo =
          typeof window !== 'undefined' ? `${window.location.origin}/cliente` : undefined;
        const { error, data } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setProfileMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.');
        }
      }
    } catch (error: any) {
      setAuthError(error?.message || 'No pudimos iniciar sesion.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setRequests([]);
    setKnownTechnicians([]);
    setWorkspaceError('');
    setWorkspaceWarning('');
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      if (!fullName.trim() || !phone.trim() || !city.trim()) {
        throw new Error('Completa nombre, telefono y ciudad.');
      }
      const payload = {
        id: session.user.id,
        email: session.user.email || null,
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      setProfileMessage('Perfil cliente actualizado.');
    } catch (error: any) {
      setProfileMessage(error?.message || 'No pudimos guardar tu perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!session?.access_token) return;
    setRequestLoading(true);
    setWorkspaceError('');
    setWorkspaceWarning('');
    try {
      if (!profileReady) {
        throw new Error('Completa tu perfil cliente antes de publicar.');
      }
      if (!title.trim() || !category.trim() || !address.trim() || !description.trim()) {
        throw new Error('Completa titulo, categoria, direccion y descripcion.');
      }
      if (mode === 'direct' && !selectedTechnician) {
        throw new Error('Selecciona un tecnico para solicitud directa.');
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        category: category.trim(),
        address: address.trim(),
        city: city.trim(),
        description: description.trim(),
        urgency,
        preferredWindow: preferredWindow.trim(),
        mode,
        radiusKm: Number(radiusKm || 20),
      };

      if (mode === 'direct' && selectedTechnician) {
        payload.targetTechnicianId = selectedTechnician.id;
        payload.targetTechnicianName = selectedTechnician.name;
        payload.targetTechnicianPhone = selectedTechnician.phone;
      }

      const response = await fetch('/api/client/requests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responseBody = (await response.json()) as WorkspacePayload & { error?: string; warning?: string };
      if (!response.ok) {
        throw new Error(responseBody?.error || 'No se pudo crear la solicitud.');
      }

      setRequests(Array.isArray(responseBody.requests) ? responseBody.requests : []);
      setKnownTechnicians(
        Array.isArray(responseBody.knownTechnicians) ? responseBody.knownTechnicians : knownTechnicians
      );
      if (responseBody.warning) setWorkspaceWarning(String(responseBody.warning));
      resetRequestForm();
    } catch (error: any) {
      setWorkspaceError(error?.message || 'No se pudo crear la solicitud.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900">
      <AuthHashHandler />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Acceso clientes</h1>
              <p className="mt-2 text-sm text-slate-600">
                Publica solicitudes y revisa ofertas de tecnicos cercanos.
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/tecnicos"
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Acceso tecnico
              </a>
              <a
                href="/"
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Inicio
              </a>
            </div>
          </div>
        </header>

        {!session ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Ingreso simple</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Entra como cliente en 1 minuto
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Crea tu cuenta, publica una solicitud y recibe cotizaciones con precio y ETA.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                <li>1. Publicas tu necesidad.</li>
                <li>2. Tecnicos cercanos te envian oferta.</li>
                <li>3. Eliges y coordinas directo.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${
                    authMode === 'login' ? 'bg-slate-900 text-white' : 'text-slate-500'
                  }`}
                >
                  Ingresar
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${
                    authMode === 'register' ? 'bg-slate-900 text-white' : 'text-slate-500'
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {authMode === 'register' && (
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nombre y apellido"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                )}
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Contrasena"
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>

              {authError && <p className="mt-3 text-xs text-rose-600">{authError}</p>}
              {profileMessage && <p className="mt-3 text-xs text-emerald-700">{profileMessage}</p>}

              <button
                onClick={handleEmailAuth}
                disabled={authLoading}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {authLoading ? 'Procesando...' : authMode === 'login' ? 'Ingresar' : 'Crear cuenta'}
              </button>
              <button
                onClick={handleGoogleAuth}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Continuar con Google
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cuenta</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {session.user?.email || 'Cliente'}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Perfil cliente</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Datos para publicar solicitudes</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nombre completo"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="Telefono / WhatsApp"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Ciudad"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 sm:col-span-2"
                  />
                </div>
                {profileMessage && (
                  <p className="mt-3 text-xs text-slate-600">{profileMessage}</p>
                )}
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {profileSaving ? 'Guardando...' : 'Guardar perfil'}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Nueva solicitud</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Publicar trabajo</h2>
                <div className="mt-4 grid gap-3">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Titulo del trabajo"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="Rubro (ej: Plomeria, Electricidad)"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Direccion de referencia"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe el trabajo"
                    rows={4}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={urgency}
                      onChange={(event) => setUrgency(event.target.value as 'baja' | 'media' | 'alta')}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="baja">Urgencia baja</option>
                      <option value="media">Urgencia media</option>
                      <option value="alta">Urgencia alta</option>
                    </select>
                    <input
                      value={preferredWindow}
                      onChange={(event) => setPreferredWindow(event.target.value)}
                      placeholder="Horario preferido (opcional)"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={mode}
                      onChange={(event) => setMode(event.target.value as 'marketplace' | 'direct')}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="marketplace">Marketplace (multiples tecnicos)</option>
                      <option value="direct">Asignacion directa</option>
                    </select>
                    <input
                      value={radiusKm}
                      onChange={(event) => setRadiusKm(event.target.value)}
                      placeholder="Radio km (ej 20)"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  {mode === 'direct' && (
                    <select
                      value={selectedTechnicianId}
                      onChange={(event) => setSelectedTechnicianId(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">Selecciona tecnico conocido</option>
                      {knownTechnicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} {tech.specialty ? `- ${tech.specialty}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  onClick={handleCreateRequest}
                  disabled={requestLoading}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {requestLoading ? 'Publicando...' : 'Publicar solicitud'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Panel cliente</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Solicitudes y ofertas</h2>
                </div>
                <button
                  onClick={loadWorkspace}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Actualizar
                </button>
              </div>

              {workspaceLoading && <p className="mt-4 text-sm text-slate-500">Cargando panel...</p>}
              {workspaceError && <p className="mt-4 text-xs text-rose-600">{workspaceError}</p>}
              {workspaceWarning && <p className="mt-4 text-xs text-amber-600">{workspaceWarning}</p>}

              {!workspaceLoading && requests.length === 0 && (
                <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Aun no tienes solicitudes publicadas.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {requests.map((request) => {
                  const meta = statusMeta[request.status] || {
                    label: request.status || 'Sin estado',
                    className: 'bg-slate-100 text-slate-600',
                  };
                  return (
                    <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{request.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {request.category} | {request.city} | {request.mode === 'direct' ? 'Directa' : 'Marketplace'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Actualizada: {formatDate(request.updatedAt)}</p>

                      {request.assignedTechName && (
                        <p className="mt-2 text-xs font-semibold text-emerald-700">
                          Tecnico asignado: {request.assignedTechName}
                          {request.assignedTechPhone ? ` (${request.assignedTechPhone})` : ''}
                        </p>
                      )}

                      {Array.isArray(request.quotes) && request.quotes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {request.quotes.slice(0, 3).map((quote) => (
                            <div
                              key={quote.id}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                            >
                              <p className="font-semibold text-slate-800">{quote.technicianName}</p>
                              <p>
                                Oferta: ${formatMoney(quote.priceArs)} | ETA {quote.etaHours || '-'} hs |{' '}
                                {quoteStatusLabel(quote.quoteStatus)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

