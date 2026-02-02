'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Manrope } from 'next/font/google';
import { supabase } from '../../lib/supabase/supabase';
import AuthHashHandler from '../../components/AuthHashHandler';

type AdminProfile = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  access_granted?: boolean | null;
};

type SupportMessage = {
  id: string;
  user_id: string;
  sender_id?: string | null;
  body: string;
  created_at: string;
  image_urls?: string[] | null;
  profile?: AdminProfile | null;
  sender?: AdminProfile | null;
};

type SubscriptionItem = {
  id: string;
  user_id: string;
  status?: string | null;
  current_period_end?: string | null;
  created_at: string;
  plan?: {
    name?: string | null;
    period_months?: number | null;
    price_ars?: number | null;
    is_partner?: boolean | null;
  } | null;
  profile?: AdminProfile | null;
};

type PaymentItem = {
  id: string;
  user_id: string;
  status?: string | null;
  amount?: number | null;
  paid_at?: string | null;
  created_at: string;
  profile?: AdminProfile | null;
};

type PendingAccessItem = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  access_granted?: boolean | null;
  profile?: AdminProfile | null;
};

type AdminOverview = {
  kpis: {
    totalUsers: number;
    accessGranted: number;
    pendingAccess: number;
    totalQuotes: number;
    paidQuotesCount: number;
    paidQuotesTotal: number;
    activeSubscribers: number;
    supportMessagesLast7: number;
    revenueTotal: number;
    revenueSince: string;
  };
  lists: {
    supportMessages: SupportMessage[];
    recentSubscriptions: SubscriptionItem[];
    recentPayments: PaymentItem[];
    pendingAccess: PendingAccessItem[];
  };
};

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const themeStyles = {
  '--ui-bg': '#F5F4F0',
  '--ui-card': '#FFFFFF',
  '--ui-ink': '#0F172A',
  '--ui-muted': '#64748B',
  '--ui-accent': '#111827',
  '--ui-accent-soft': '#F5B942',
} as React.CSSProperties;

const formatNumber = (value?: number | null) => `${Number(value || 0).toLocaleString('es-AR')}`;
const formatCurrency = (value?: number | null) => `$${Number(value || 0).toLocaleString('es-AR')}`;
const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-AR');
};

type ProfileLike = {
  business_name?: string | null;
  full_name?: string | null;
  email?: string | null;
};

const getProfileLabel = (profile?: ProfileLike | null) => {
  if (!profile) return 'Sin perfil';
  return profile.business_name || profile.full_name || profile.email || 'Sin nombre';
};

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [grantingId, setGrantingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const loadOverview = async (token?: string) => {
    if (!token) return;
    setLoadingOverview(true);
    setOverviewError('');
    try {
      const response = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 403) {
        setIsAdmin(false);
        setOverview(null);
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar el panel.');
      }
      const data = await response.json();
      setIsAdmin(true);
      setOverview(data);
    } catch (error: any) {
      setOverviewError(error?.message || 'No se pudo cargar el panel.');
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (!session?.access_token) return;
    loadOverview(session.access_token);
  }, [session?.access_token]);

  const handleEmailLogin = async () => {
    setAuthError('');
    setAuthNotice('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthNotice('');
    const redirectTo = `${window.location.origin}/admin`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setOverview(null);
    setIsAdmin(null);
  };

  const handleGrantAccess = async (userId: string) => {
    if (!session?.access_token) return;
    setGrantingId(userId);
    try {
      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo habilitar el acceso.');
      }
      await loadOverview(session.access_token);
    } catch (error: any) {
      setOverviewError(error?.message || 'No se pudo habilitar el acceso.');
    } finally {
      setGrantingId(null);
    }
  };

  const kpis = useMemo(() => {
    if (!overview) return [];
    return [
      { label: 'Usuarios totales', value: formatNumber(overview.kpis.totalUsers) },
      { label: 'Accesos habilitados', value: formatNumber(overview.kpis.accessGranted) },
      { label: 'Accesos pendientes', value: formatNumber(overview.kpis.pendingAccess) },
      { label: 'Suscriptores activos', value: formatNumber(overview.kpis.activeSubscribers) },
      { label: 'Presupuestos totales', value: formatNumber(overview.kpis.totalQuotes) },
      { label: 'Presupuestos cobrados', value: formatNumber(overview.kpis.paidQuotesCount) },
      { label: 'Ingresos por presupuestos', value: formatCurrency(overview.kpis.paidQuotesTotal) },
      { label: 'Ingresos por suscripciones (12m)', value: formatCurrency(overview.kpis.revenueTotal) },
      { label: 'Mensajes soporte (7d)', value: formatNumber(overview.kpis.supportMessagesLast7) },
    ];
  }, [overview]);

  if (loadingSession) {
    return (
      <div style={themeStyles} className={`${manrope.className} min-h-screen bg-[color:var(--ui-bg)]`}>
        <AuthHashHandler />
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div
        style={themeStyles}
        className={`${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
      >
        <AuthHashHandler />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)]" />
          <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/15 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/10 blur-3xl" />

          <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 text-center md:text-left">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-slate-200/60">
                  <img src="/icon.png" alt="UrbanFix logo" className="h-10 w-10" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">Panel admin</p>
                </div>
              </div>
              <h1 className="text-4xl font-black text-slate-900 md:text-5xl">Acceso administrativo</h1>
              <p className="text-base text-slate-600">
                Ingresa con tu cuenta para ver métricas, suscripciones y soporte.
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Volver al inicio
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
                <p className="text-sm text-slate-600">Solo administradores autorizados.</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Continuar con Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                o
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-3">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Correo"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="Contraseña"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>

              {authNotice && <p className="mt-4 text-xs text-emerald-600">{authNotice}</p>}
              {authError && <p className="mt-4 text-xs text-amber-600">{authError}</p>}

              <button
                type="button"
                onClick={handleEmailLogin}
                className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800"
              >
                Ingresar
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div
        style={themeStyles}
        className={`${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
      >
        <AuthHashHandler />
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
            <h1 className="text-2xl font-bold text-slate-900">Acceso restringido</h1>
            <p className="mt-3 text-sm text-slate-600">
              Tu cuenta no tiene permisos de administrador. Si necesitas acceso, solicita el alta en
              beta_admins.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={themeStyles}
      className={`${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
    >
      <AuthHashHandler />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/15 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 px-6 py-5 shadow-lg shadow-slate-200/50 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-300/60">
                <img src="/icon.png" alt="UrbanFix logo" className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">UrbanFix</p>
                <p className="text-sm font-semibold text-slate-700">Panel admin</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => loadOverview(session.access_token)}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Cerrar sesión
              </button>
            </div>
          </header>

          {overviewError && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {overviewError}
            </div>
          )}

          {loadingOverview && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Cargando métricas...
            </div>
          )}

          {!loadingOverview && overview && (
            <>
              <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {kpis.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
                  </div>
                ))}
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Mensajes recientes</h3>
                      <span className="text-xs text-slate-400">Últimos 10</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {overview.lists.supportMessages.length === 0 && (
                        <p className="text-sm text-slate-500">No hay mensajes todavía.</p>
                      )}
                      {overview.lists.supportMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-700">
                              {getProfileLabel(msg.profile)}
                            </span>
                            <span className="text-slate-400">{formatDateTime(msg.created_at)}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{msg.body}</p>
                          {!!msg.image_urls?.length && (
                            <p className="mt-2 text-xs text-slate-400">
                              {msg.image_urls.length} adjunto(s)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Accesos pendientes</h3>
                      <span className="text-xs text-slate-400">Últimos 12</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {overview.lists.pendingAccess.length === 0 && (
                        <p className="text-sm text-slate-500">No hay accesos pendientes.</p>
                      )}
                      {overview.lists.pendingAccess.map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {getProfileLabel(user.profile || user)}
                            </p>
                            <p className="text-xs text-slate-500">{user.email || user.profile?.email || ''}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleGrantAccess(user.id)}
                            disabled={grantingId === user.id}
                            className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {grantingId === user.id ? 'Habilitando...' : 'Habilitar acceso'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Suscripciones recientes</h3>
                      <span className="text-xs text-slate-400">Últimas 10</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {overview.lists.recentSubscriptions.length === 0 && (
                        <p className="text-sm text-slate-500">No hay suscripciones nuevas.</p>
                      )}
                      {overview.lists.recentSubscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-700">
                              {getProfileLabel(sub.profile)}
                            </span>
                            <span className="text-slate-400">{formatDateTime(sub.created_at)}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                              {sub.status || 'sin estado'}
                            </span>
                            {sub.plan?.name && (
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                                {sub.plan.name}
                              </span>
                            )}
                            {sub.current_period_end && (
                              <span className="text-[10px] text-slate-400">
                                Renueva: {formatDateTime(sub.current_period_end)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Pagos recientes</h3>
                      <span className="text-xs text-slate-400">Últimos 10</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {overview.lists.recentPayments.length === 0 && (
                        <p className="text-sm text-slate-500">No hay pagos registrados.</p>
                      )}
                      {overview.lists.recentPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-700">
                              {getProfileLabel(payment.profile)}
                            </span>
                            <span className="text-slate-400">
                              {formatDateTime(payment.paid_at || payment.created_at)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                              {payment.status || 'sin estado'}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
