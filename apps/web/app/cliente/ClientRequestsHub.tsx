'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/supabase';
import Link from 'next/link';

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
  targetTechnicianId: string;
  targetTechnicianName: string;
  targetTechnicianPhone: string;
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
  targetTechnicianId: '',
  targetTechnicianName: '',
  targetTechnicianPhone: '',
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

export default function ClientRequestsHub() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
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
    if (mode === 'register') {
      setAuthMode('register');
    }
    if (params.get('quick') === '1') {
      setAuthMode('register');
      setAuthNotice('Modo rapido activo: puedes continuar con Google.');
    }
  }, []);

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
      setRequests((payload?.requests || []) as ClientRequestRow[]);
    } catch (error: any) {
      setRequestError(error?.message || 'No se pudieron cargar tus solicitudes.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchRequests();
  }, [session?.access_token, session?.user?.id]);

  const handleGoogleAuth = async () => {
    setAuthError('');
    setAuthNotice('');
    const redirectTo = `${window.location.origin}/cliente`;
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
        throw new Error('Ingresa email y contrasena.');
      }
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Cliente UrbanFix',
            },
          },
        });
        if (error) throw error;
        setAuthNotice('Cuenta creada. Si tu proveedor lo pide, confirma desde tu correo.');
      }
    } catch (error: any) {
      setAuthError(error?.message || 'No se pudo iniciar sesion.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePublishRequest = async () => {
    if (!session?.access_token) return;
    setSavingRequest(true);
    setRequestError('');
    setRequestNotice('');
    try {
      if (!form.title.trim() || !form.category.trim() || !form.address.trim() || !form.description.trim()) {
        throw new Error('Completa titulo, categoria, direccion y descripcion.');
      }
      const response = await fetch('/api/client/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo publicar la solicitud.');
      const matchesCount = Array.isArray(payload?.matches) ? payload.matches.length : 0;
      setRequestNotice(
        matchesCount > 0
          ? `Solicitud publicada. Encontramos ${matchesCount} tecnico(s) cercano(s).`
          : 'Solicitud publicada. Aun no hay tecnicos cercanos disponibles.'
      );
      setForm((prev) => ({
        ...defaultForm,
        city: prev.city,
      }));
      await fetchRequests();
    } catch (error: any) {
      setRequestError(error?.message || 'No se pudo publicar la solicitud.');
    } finally {
      setSavingRequest(false);
    }
  };

  const requestsByStatus = useMemo(() => {
    const total = requests.length;
    const matched = requests.filter((item) => String(item.status).toLowerCase() === 'matched').length;
    const published = requests.filter((item) => String(item.status).toLowerCase() === 'published').length;
    return { total, matched, published };
  }, [requests]);

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Cargando acceso de cliente...
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 md:p-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
              UrbanFix clientes
            </p>
            <h1 className="mt-4 text-4xl font-black text-slate-900">Publica tu solicitud y recibe tecnicos cercanos</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Este panel te permite crear solicitudes de trabajo para que UrbanFix busque tecnicos en un radio de 20 km
              segun tu ubicacion y urgencia.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Publicacion en segundos</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Matching por distancia</li>
              <li className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">Solicitud directa opcional</li>
            </ul>
            <Link
              href="/vidriera"
              className="mt-5 inline-flex rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Ver vidriera de tecnicos
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
              Continuar con Google
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
              <label className="text-xs font-semibold text-slate-600">Contrasena</label>
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
              {authLoading ? 'Procesando...' : authMode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>

            {authError && <p className="mt-3 text-xs text-rose-600">{authError}</p>}
            {authNotice && <p className="mt-3 text-xs text-emerald-600">{authNotice}</p>}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Panel cliente</p>
              <h1 className="text-2xl font-semibold text-slate-900">Solicitudes de trabajo</h1>
              <p className="mt-1 text-sm text-slate-600">{session.user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Total: {requestsByStatus.total}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Matcheadas: {requestsByStatus.matched}
              </span>
              <Link
                href="/vidriera"
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Ver vidriera
              </Link>
              <button
                type="button"
                onClick={fetchRequests}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Nueva solicitud</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Publicar trabajo</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Titulo</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Categoria</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="Ej: Electricidad"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600">Direccion</label>
              <input
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Ciudad</label>
                <input
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Urgencia</label>
                <select
                  value={form.urgency}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, urgency: event.target.value as CreateRequestForm['urgency'] }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400"
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600">Descripcion</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">Modo de solicitud</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'marketplace' }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    form.mode === 'marketplace'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  Cotizacion multiple
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'direct' }))}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    form.mode === 'direct'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  Asignacion directa
                </button>
              </div>

              {form.mode === 'direct' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input
                    value={form.targetTechnicianId}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetTechnicianId: event.target.value }))}
                    placeholder="ID tecnico"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <input
                    value={form.targetTechnicianName}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetTechnicianName: event.target.value }))}
                    placeholder="Nombre tecnico"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <input
                    value={form.targetTechnicianPhone}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetTechnicianPhone: event.target.value }))}
                    placeholder="Telefono tecnico"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handlePublishRequest}
              disabled={savingRequest}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {savingRequest ? 'Publicando...' : 'Publicar solicitud'}
            </button>

            {requestError && <p className="mt-3 text-xs text-rose-600">{requestError}</p>}
            {requestNotice && <p className="mt-3 text-xs text-emerald-600">{requestNotice}</p>}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tus solicitudes</p>
                <h2 className="text-xl font-semibold text-slate-900">Historial reciente</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {requests.length}
              </span>
            </div>

            {loadingRequests ? (
              <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p>
            ) : requests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Aun no publicaste solicitudes.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
        </section>
      </div>
    </div>
  );
}
