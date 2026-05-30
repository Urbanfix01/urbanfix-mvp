'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from '../lib/supabase/supabase';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  Settings,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import PublicTopNav from './PublicTopNav';

type TechnicianRequest = {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: 'baja' | 'media' | 'alta';
  status: string;
  mode: 'marketplace' | 'direct';
  city: string;
  address: string;
  created_at: string;
  location_lat: number;
  location_lng: number;
  my_quote_status: 'pending' | 'submitted' | 'accepted' | 'rejected' | null;
  my_response_type: 'application' | 'direct_quote' | null;
  my_visit_eta_hours: number | null;
  my_price_ars: number | null;
  my_eta_hours: number | null;
};

type TechnicianProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  within_working_hours: boolean;
  working_hours_label: string | null;
  service_lat: number | null;
  service_lng: number | null;
  avatar_url: string | null;
};

type TechnicianStats = {
  pending_count: number;
  responded_count: number;
  total_visible: number;
  completion_rate: number;
  average_rating: number | null;
};

type NearbyRequestsPayload = {
  requests: TechnicianRequest[];
  technician: TechnicianProfile;
  stats: TechnicianStats;
  warning?: string;
};

const urgencyBadgeColor = (urgency: string) => {
  if (urgency === 'alta') return { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Urgente' };
  if (urgency === 'media') return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Media' };
  return { bg: 'bg-slate-50', text: 'text-slate-700', label: 'Baja' };
};

const statusBadgeColor = (status: 'pending' | 'submitted' | 'accepted' | 'rejected' | null) => {
  if (status === 'submitted') return { bg: 'bg-blue-500', text: 'text-white', label: 'Respondida' };
  if (status === 'accepted') return { bg: 'bg-green-500', text: 'text-white', label: 'Aceptada' };
  if (status === 'rejected') return { bg: 'bg-red-500', text: 'text-white', label: 'Rechazada' };
  return { bg: 'bg-slate-200', text: 'text-slate-700', label: 'Pendiente' };
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function TechnicianDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [data, setData] = useState<NearbyRequestsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'marketplace' | 'direct'>('all');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [isDesktopNavExpanded, setIsDesktopNavExpanded] = useState(false);

  // Session management
  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoadingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: authData } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoadingSession(false);
    });

    return () => authData.subscription.unsubscribe();
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/tecnico/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cargar el dashboard');
      }

      setData(payload);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) {
      fetchDashboard();
    }
  }, [session?.access_token, fetchDashboard]);

  const handleLogout = async () => {
    if (!hasSupabaseConfig) return;
    await supabase.auth.signOut();
  };

  const requests = data?.requests || [];
  const technician = data?.technician;
  const stats = data?.stats || { pending_count: 0, responded_count: 0, total_visible: 0, completion_rate: 0, average_rating: null };

  const filteredRequests = useMemo(() => {
    if (modeFilter === 'all') return requests;
    return requests.filter((r) => r.mode === modeFilter);
  }, [modeFilter, requests]);

  const counts = useMemo(
    () => ({
      total: requests.length,
      marketplace: requests.filter((r) => r.mode === 'marketplace').length,
      direct: requests.filter((r) => r.mode === 'direct').length,
      pending: stats.pending_count || 0,
      responded: stats.responded_count || 0,
    }),
    [requests, stats]
  );

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="space-y-4 text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-600">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <PublicTopNav activeHref="/tecnico-panel" sticky />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/80 bg-white/90 p-8 shadow-lg">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
              <p className="mt-2 text-sm text-slate-600">Inicia sesión como técnico para acceder</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = '/tecnicos?mode=login&perfil=tecnico&next=%2Ftecnico-panel')}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition"
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => (window.location.href = '/tecnicos?mode=register&perfil=tecnico&next=%2Ftecnico-panel')}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Crear cuenta
              </button>
              <Link
                href="/tecnicos"
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cambiar perfil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <PublicTopNav activeHref="/tecnico-panel" sticky />

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden w-64 border-r border-slate-200 bg-white/95 p-6 lg:block">
          <div className="mb-8 space-y-3 border-b border-slate-200 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Mi cuenta</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{technician?.full_name || 'Técnico'}</p>
              </div>
              <User size={20} className="text-slate-400" />
            </div>
            <p className="text-xs text-slate-600">{session.user?.email}</p>
          </div>

          <nav className="space-y-2">
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600">📊 Dashboard</div>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">
              ⚙️ Configuración
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">
              📞 Soporte
            </button>
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 w-full flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Panel de Control</h1>
                <p className="mt-1 text-sm text-slate-600">Gestiona tus solicitudes y cotizaciones</p>
              </div>
              <button
                onClick={() => fetchDashboard()}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>

            {/* Status & Warning */}
            {!!technician && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${technician.within_working_hours ? 'bg-green-500' : 'bg-yellow-500'}`}
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    {technician.within_working_hours ? 'Online' : 'Fuera de horario'}
                  </span>
                  {technician.working_hours_label && (
                    <span className="text-xs text-slate-500">• {technician.working_hours_label}</span>
                  )}
                </div>
              </div>
            )}

            {data?.warning && (
              <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Notificación importante</p>
                  <p className="text-sm text-yellow-800">{data.warning}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                icon={<FileText size={24} />}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                label="Pendientes"
                value={counts.pending}
                subtext="Sin responder"
              />
              <KPICard
                icon={<Zap size={24} />}
                iconBg="bg-green-100"
                iconColor="text-green-600"
                label="Respondidas"
                value={counts.responded}
                subtext="En gestión"
              />
              <KPICard
                icon={<TrendingUp size={24} />}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                label="Tasa completado"
                value={`${Math.round(stats.completion_rate || 0)}%`}
                subtext="Este período"
              />
              <KPICard
                icon={<Clock size={24} />}
                iconBg={technician?.within_working_hours ? 'bg-green-100' : 'bg-yellow-100'}
                iconColor={technician?.within_working_hours ? 'text-green-600' : 'text-yellow-600'}
                label="Estado"
                value={technician?.within_working_hours ? 'Online' : 'Offline'}
                subtext="Ahora"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              {[
                { value: 'all', label: `Todo (${counts.total})` },
                { value: 'marketplace', label: `Marketplace (${counts.marketplace})` },
                { value: 'direct', label: `Directa (${counts.direct})` },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setModeFilter(tab.value as any)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
                    modeFilter === tab.value
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Requests List */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Solicitudes</h2>

              {filteredRequests.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                  <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900">Sin solicitudes</h3>
                  <p className="text-sm text-slate-600">No hay solicitudes con este filtro.</p>
                </div>
              ) : (
                <div className="space-y-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {filteredRequests.map((request, idx) => {
                    const expanded = expandedRequestId === request.id;
                    const urgencyInfo = urgencyBadgeColor(request.urgency);
                    const statusInfo = statusBadgeColor(request.my_quote_status);

                    return (
                      <div
                        key={request.id}
                        className={`border-b border-slate-100 transition ${idx === filteredRequests.length - 1 ? 'border-b-0' : ''}`}
                      >
                        {/* Row Header */}
                        <button
                          onClick={() => setExpandedRequestId(expanded ? null : request.id)}
                          className="w-full p-4 text-left hover:bg-slate-50 transition flex items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{request.title}</h3>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                              <MapPin size={14} />
                              <span className="truncate">{request.city}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${urgencyInfo.bg} ${urgencyInfo.text}`}>
                              {urgencyInfo.label}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                              {statusInfo.label}
                            </span>
                            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {expanded && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
                            {/* Description */}
                            <div>
                              <p className="text-xs font-semibold uppercase text-slate-600 mb-2">Descripción</p>
                              <p className="text-sm text-slate-700">{request.description}</p>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <DetailItem label="Tipo" value={request.mode === 'marketplace' ? 'Marketplace' : 'Directa'} />
                              <DetailItem label="Categoría" value={request.category} />
                              <DetailItem label="Ubicación" value={request.city} />
                              <DetailItem
                                label="Fecha"
                                value={new Date(request.created_at).toLocaleDateString('es-AR', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              />
                            </div>

                            {/* Response Info */}
                            {request.my_quote_status && (
                              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-1">
                                  {request.my_response_type === 'application' ? 'Tu postulación' : 'Tu cotización'}
                                </p>
                                <p className="text-sm text-blue-800">
                                  {request.my_response_type === 'application'
                                    ? `Visita: ${request.my_visit_eta_hours || '-'} horas`
                                    : `$${formatCurrency(request.my_price_ars || 0)} • ${request.my_eta_hours || '-'} horas`}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              <button className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition">
                                {request.my_quote_status ? '✏️ Editar' : '📝 Responder'}
                              </button>
                              <button className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                                💰 {request.my_quote_status && request.my_response_type === 'application' ? 'Cotizar' : 'Cotizar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-4 shadow-sm hover:shadow-md transition">
      <div className={`inline-flex rounded-lg ${iconBg} p-2 mb-3`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <p className="text-xs font-semibold uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-600">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
