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

type MasterItemAdminRow = {
  id: string;
  name: string;
  type: string;
  suggested_price?: number | null;
  category?: string | null;
  source_ref?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

type IncomeZoneItem = {
  zone: string;
  total_amount: number;
  quotes_amount: number;
  subscriptions_amount: number;
  quotes_count: number;
  payments_count: number;
  users_count: number;
};

type RecentUserItem = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  profile?: AdminProfile | null;
  subscription?: {
    status?: string | null;
    current_period_end?: string | null;
    plan?: {
      name?: string | null;
      period_months?: number | null;
      price_ars?: number | null;
      is_partner?: boolean | null;
    } | null;
  } | null;
};

type ScreenMetric = {
  path: string;
  total_minutes: number;
  avg_seconds: number;
  views: number;
};

type PresenceUser = {
  id: string;
  label: string;
  email?: string | null;
  last_seen_at?: string | null;
  last_seen_path?: string | null;
  is_online: boolean;
};

type PresenceData = {
  onlineCount: number;
  onlineUsers: PresenceUser[];
  recentUsers: PresenceUser[];
  onlineWindowMinutes: number;
};

type PlayMetrics = {
  installs?: {
    series: {
      date: string;
      dailyUserInstalls?: number;
      dailyUserUninstalls?: number;
      dailyDeviceInstalls?: number;
    }[];
    totalUserInstalls: number;
    totalUserUninstalls: number;
  } | null;
  crashes?: {
    crashRate?: number;
    crashRate7d?: number;
    crashRate28d?: number;
    lastDate?: string | null;
  } | null;
  anr?: {
    anrRate?: number;
    anrRate7d?: number;
    anrRate28d?: number;
    lastDate?: string | null;
  } | null;
  errors?: string[];
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
    mrr: number;
    arr: number;
    visitsLast7: number;
    uniqueSessionsLast7: number;
    visitsLast24: number;
    uniqueSessionsLast24: number;
    revenueSince: string;
  };
  lists: {
    supportMessages: SupportMessage[];
    recentSubscriptions: SubscriptionItem[];
    recentPayments: PaymentItem[];
    pendingAccess: PendingAccessItem[];
    recentUsers: RecentUserItem[];
    incomeByZone: IncomeZoneItem[];
    topScreens: ScreenMetric[];
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

const normalizeText = (value?: string | null) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toCsvValue = (value: any) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: Array<Record<string, any>>) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => toCsvValue(row[h])).join(','))].join(
    '\n'
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const formatShortDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-AR');
};

const getDeltaLabel = (current: number, previous: number) => {
  if (!previous) {
    if (!current) {
      return { text: 'Sin cambios', tone: 'text-slate-400' };
    }
    return { text: 'Nuevo', tone: 'text-emerald-600' };
  }
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const text = `${diff >= 0 ? '+' : ''}${pct.toFixed(0)}% vs periodo anterior`;
  return { text, tone: diff >= 0 ? 'text-emerald-600' : 'text-rose-600' };
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
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'usuarios' | 'facturacion' | 'mensajes' | 'accesos' | 'actividad' | 'mano_obra'
  >('resumen');
  const [supportUsers, setSupportUsers] = useState<{ userId: string; label: string; lastMessage?: any }[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [supportDraft, setSupportDraft] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [activityRange, setActivityRange] = useState<7 | 30 | 90>(30);
  const [activityStart, setActivityStart] = useState('');
  const [activityEnd, setActivityEnd] = useState('');
  const [activityPath, setActivityPath] = useState('');
  const [activityUserId, setActivityUserId] = useState('');
  const [activityData, setActivityData] = useState<{
    series: { date: string; views: number; minutes: number }[];
    totals: { views: number; minutes: number; uniqueSessions: number; uniqueUsers: number };
    prevTotals: { views: number; minutes: number; uniqueSessions: number; uniqueUsers: number };
    topScreens: ScreenMetric[];
    topRoutes: { path: string; views: number; total_minutes: number; avg_seconds: number }[];
    topUsers: {
      user_id: string;
      label: string;
      views: number;
      sessions: number;
      total_minutes: number;
      avg_seconds: number;
      last_seen?: string | null;
    }[];
    range?: { start: string; end: string; days: number };
    previousRange?: { start: string; end: string };
  } | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [presenceData, setPresenceData] = useState<PresenceData | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(false);
  const [presenceError, setPresenceError] = useState('');
  const [playMetrics, setPlayMetrics] = useState<PlayMetrics | null>(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState('');
  const [laborItems, setLaborItems] = useState<MasterItemAdminRow[]>([]);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborError, setLaborError] = useState('');
  const [laborSearch, setLaborSearch] = useState('');
  const [laborSourceFilter, setLaborSourceFilter] = useState('all');
  const [laborShowInactive, setLaborShowInactive] = useState(false);
  const [laborPriceDrafts, setLaborPriceDrafts] = useState<Record<string, string>>({});
  const [laborSavingId, setLaborSavingId] = useState<string | null>(null);
  const [laborMessage, setLaborMessage] = useState('');

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

  const loadPlayMetrics = async (token?: string) => {
    if (!token) return;
    setPlayLoading(true);
    setPlayError('');
    try {
      const response = await fetch('/api/admin/play-metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudieron cargar las métricas de Play.');
      }
      const data = await response.json();
      setPlayMetrics(data);
    } catch (error: any) {
      setPlayError(error?.message || 'No se pudieron cargar las métricas de Play.');
    } finally {
      setPlayLoading(false);
    }
  };

  const loadSupportUsers = async (token?: string) => {
    if (!token) return;
    setSupportError('');
    setSupportLoading(true);
    try {
      const response = await fetch('/api/admin/support/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudieron cargar las conversaciones.');
      }
      const data = await response.json();
      const list = data?.users || [];
      setSupportUsers(list);
      if (!activeSupportUserId && list[0]) {
        setActiveSupportUserId(list[0].userId);
      }
    } catch (error: any) {
      setSupportError(error?.message || 'No se pudieron cargar las conversaciones.');
    } finally {
      setSupportLoading(false);
    }
  };

  const loadSupportMessages = async (token?: string, userId?: string | null) => {
    if (!token || !userId) return;
    setSupportError('');
    setSupportLoading(true);
    try {
      const response = await fetch(`/api/admin/support/messages?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudieron cargar los mensajes.');
      }
      const data = await response.json();
      setSupportMessages(data?.messages || []);
    } catch (error: any) {
      setSupportError(error?.message || 'No se pudieron cargar los mensajes.');
    } finally {
      setSupportLoading(false);
    }
  };

  const loadActivity = async () => {
    if (!session?.access_token) return;
    setActivityError('');
    setActivityLoading(true);
    try {
      const params = new URLSearchParams({ days: String(activityRange) });
      if (activityStart) {
        params.set('start', activityStart);
      }
      if (activityEnd) {
        params.set('end', activityEnd);
      }
      if (activityPath.trim()) {
        params.set('path', activityPath.trim());
      }
      if (activityUserId) {
        params.set('userId', activityUserId);
      }
      const response = await fetch(`/api/admin/analytics/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar la actividad.');
      }
      const data = await response.json();
      setActivityData(data);
    } catch (error: any) {
      setActivityError(error?.message || 'No se pudo cargar la actividad.');
    } finally {
      setActivityLoading(false);
    }
  };

  const loadPresence = async () => {
    if (!session?.access_token) return;
    setPresenceError('');
    setPresenceLoading(true);
    try {
      const params = new URLSearchParams({ minutes: '5', limit: '12' });
      const response = await fetch(`/api/admin/analytics/presence?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar la presencia.');
      }
      const data = await response.json();
      setPresenceData(data);
    } catch (error: any) {
      setPresenceError(error?.message || 'No se pudo cargar la presencia.');
    } finally {
      setPresenceLoading(false);
    }
  };

  const loadLaborItems = async (token?: string) => {
    if (!token) return;
    setLaborError('');
    setLaborMessage('');
    setLaborLoading(true);
    try {
      const response = await fetch('/api/admin/master-items?type=labor', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudieron cargar los valores.');
      }
      const data = await response.json();
      const items = (data?.items || []) as MasterItemAdminRow[];
      setLaborItems(items);
      const nextDrafts: Record<string, string> = {};
      items.forEach((item) => {
        nextDrafts[item.id] =
          item.suggested_price === null || item.suggested_price === undefined ? '' : String(item.suggested_price);
      });
      setLaborPriceDrafts(nextDrafts);
    } catch (error: any) {
      setLaborError(error?.message || 'No se pudieron cargar los valores.');
    } finally {
      setLaborLoading(false);
    }
  };

  const patchLaborItem = async (
    itemId: string,
    patch: { active?: boolean; suggested_price?: number | null }
  ) => {
    if (!session?.access_token) return;
    setLaborError('');
    setLaborMessage('');
    setLaborSavingId(itemId);
    try {
      const response = await fetch(`/api/admin/master-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo guardar el cambio.');
      }
      const updated = (data?.item || null) as MasterItemAdminRow | null;
      if (updated) {
        setLaborItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...updated } : item)));
        if (patch.suggested_price !== undefined) {
          setLaborPriceDrafts((prev) => ({
            ...prev,
            [itemId]:
              updated.suggested_price === null || updated.suggested_price === undefined
                ? ''
                : String(updated.suggested_price),
          }));
        }
      }
      setLaborMessage('Guardado.');
    } catch (error: any) {
      setLaborError(error?.message || 'No se pudo guardar el cambio.');
    } finally {
      setLaborSavingId(null);
    }
  };

  const handleSendSupportMessage = async () => {
    if (!session?.access_token || !activeSupportUserId) return;
    const trimmed = supportDraft.trim();
    if (!trimmed) return;
    setSupportSending(true);
    setSupportError('');
    try {
      const response = await fetch('/api/admin/support/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: activeSupportUserId, body: trimmed }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo enviar el mensaje.');
      }
      setSupportDraft('');
      await loadSupportMessages(session.access_token, activeSupportUserId);
      await loadSupportUsers(session.access_token);
    } catch (error: any) {
      setSupportError(error?.message || 'No se pudo enviar el mensaje.');
    } finally {
      setSupportSending(false);
    }
  };

  useEffect(() => {
    if (!session?.access_token) return;
    loadOverview(session.access_token);
    loadPlayMetrics(session.access_token);
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || activeTab !== 'mensajes') return;
    loadSupportUsers(session.access_token);
  }, [activeTab, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || activeTab !== 'mensajes' || !activeSupportUserId) return;
    loadSupportMessages(session.access_token, activeSupportUserId);
  }, [activeTab, session?.access_token, activeSupportUserId]);

  useEffect(() => {
    if (!session?.access_token || activeTab !== 'mano_obra') return;
    loadLaborItems(session.access_token);
  }, [activeTab, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || activeTab !== 'actividad') return;
    loadActivity();
  }, [
    activeTab,
    session?.access_token,
    activityRange,
    activityStart,
    activityEnd,
    activityPath,
    activityUserId,
  ]);

  useEffect(() => {
    if (!session?.access_token || activeTab !== 'actividad') return;
    loadPresence();
    const interval = window.setInterval(loadPresence, 60000);
    return () => {
      window.clearInterval(interval);
    };
  }, [activeTab, session?.access_token]);

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
    setPlayMetrics(null);
    setPlayError('');
    setPlayLoading(false);
    setSupportUsers([]);
    setSupportMessages([]);
    setSupportDraft('');
    setActiveSupportUserId(null);
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
      { label: 'Visitas (24h)', value: formatNumber(overview.kpis.visitsLast24) },
      { label: 'Sesiones únicas (24h)', value: formatNumber(overview.kpis.uniqueSessionsLast24) },
      { label: 'Visitas (7d)', value: formatNumber(overview.kpis.visitsLast7) },
      { label: 'Sesiones únicas (7d)', value: formatNumber(overview.kpis.uniqueSessionsLast7) },
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

  const tabs = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'usuarios', label: 'Usuarios' },
    { key: 'facturacion', label: 'Facturación' },
    { key: 'mano_obra', label: 'Mano de obra' },
    { key: 'mensajes', label: 'Mensajes' },
    { key: 'accesos', label: 'Accesos' },
    { key: 'actividad', label: 'Actividad' },
  ] as const;

  const filteredRecentUsers = useMemo(() => {
    if (!overview) return [];
    const query = normalizeText(userSearch);
    if (!query) return overview.lists.recentUsers;
    return overview.lists.recentUsers.filter((user) => {
      const name = normalizeText(user.profile?.business_name || user.profile?.full_name || user.email);
      const email = normalizeText(user.email);
      const plan = normalizeText(user.subscription?.plan?.name || '');
      return name.includes(query) || email.includes(query) || plan.includes(query);
    });
  }, [overview, userSearch]);

  const filteredPendingAccess = useMemo(() => {
    if (!overview) return [];
    const query = normalizeText(userSearch);
    if (!query) return overview.lists.pendingAccess;
    return overview.lists.pendingAccess.filter((user) => {
      const name = normalizeText(user.profile?.business_name || user.profile?.full_name || user.email);
      const email = normalizeText(user.email || user.profile?.email || '');
      return name.includes(query) || email.includes(query);
    });
  }, [overview, userSearch]);

  const filteredSupportUsers = useMemo(() => {
    const query = normalizeText(messageSearch);
    if (!query) return supportUsers;
    return supportUsers.filter((user) => {
      const label = normalizeText(user.label);
      const lastBody = normalizeText(user.lastMessage?.body || '');
      return label.includes(query) || lastBody.includes(query);
    });
  }, [supportUsers, messageSearch]);

  const laborSources = useMemo(() => {
    const values = new Set<string>();
    laborItems.forEach((item) => {
      const source = (item.source_ref || '').toString().trim() || 'Sin fuente';
      values.add(source);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [laborItems]);

  const laborTotals = useMemo(() => {
    const total = laborItems.length;
    const active = laborItems.filter((item) => item.active !== false).length;
    return { total, active };
  }, [laborItems]);

  const filteredLaborItems = useMemo(() => {
    const query = normalizeText(laborSearch);
    return laborItems.filter((item) => {
      const isActive = item.active !== false;
      if (!laborShowInactive && !isActive) return false;
      const source = (item.source_ref || '').toString().trim() || 'Sin fuente';
      if (laborSourceFilter !== 'all' && source !== laborSourceFilter) return false;
      if (!query) return true;
      const haystack = normalizeText([item.name, item.category, item.source_ref].filter(Boolean).join(' '));
      return haystack.includes(query);
    });
  }, [laborItems, laborSearch, laborShowInactive, laborSourceFilter]);

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
                onClick={() => {
                  loadOverview(session.access_token);
                  loadPlayMetrics(session.access_token);
                }}
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

          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

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
              {activeTab === 'resumen' && (
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

                  <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Google Play (Android)</h3>
                        <span className="text-xs text-slate-400">Últimos 14 días</span>
                      </div>
                      {playLoading && <p className="mt-3 text-sm text-slate-500">Cargando métricas...</p>}
                      {playError && (
                        <p className="mt-3 text-xs text-rose-500">
                          {playError}
                        </p>
                      )}
                      {!playLoading && !playError && !playMetrics && (
                        <p className="mt-3 text-sm text-slate-500">
                          Configura GOOGLE_PLAY_SERVICE_ACCOUNT_B64 y GOOGLE_PLAY_PACKAGE_NAME para ver datos.
                        </p>
                      )}
                      {!playLoading && !playError && playMetrics && (
                        <>
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Instalaciones</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {formatNumber(playMetrics.installs?.totalUserInstalls || 0)}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">Usuarios (14d)</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Desinstalaciones</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {formatNumber(playMetrics.installs?.totalUserUninstalls || 0)}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">Usuarios (14d)</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Crashes / ANR (7d)</p>
                              <p className="mt-2 text-xl font-semibold text-slate-900">
                                {`${((playMetrics.crashes?.crashRate7d ?? 0) * 100).toFixed(2)}% · ${((playMetrics.anr?.anrRate7d ?? 0) * 100).toFixed(2)}%`}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">Crash · ANR</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                              Instalaciones por día
                            </p>
                            <div className="mt-3 grid gap-2">
                              {(playMetrics.installs?.series || []).slice(-14).map((row) => {
                                const installs = Number(row.dailyUserInstalls || 0);
                                const uninstalls = Number(row.dailyUserUninstalls || 0);
                                const max = Math.max(1, installs + uninstalls);
                                return (
                                  <div
                                    key={row.date || `${installs}-${uninstalls}`}
                                    className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                      <span>{row.date || ''}</span>
                                      <span className="text-slate-600">
                                        {installs} / {uninstalls}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-white">
                                      <div
                                        className="bg-emerald-500"
                                        style={{ width: `${(installs / max) * 100}%` }}
                                        title={`${installs} instalaciones`}
                                      />
                                      <div
                                        className="bg-rose-400"
                                        style={{ width: `${(uninstalls / max) * 100}%` }}
                                        title={`${uninstalls} desinstalaciones`}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {!!playMetrics.errors?.length && (
                            <p className="mt-3 text-[11px] text-amber-600">
                              {playMetrics.errors.join(' • ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Crashes y ANR</h3>
                        <span className="text-xs text-slate-400">
                          {playMetrics?.crashes?.lastDate || playMetrics?.anr?.lastDate || 'Últimos 14 días'}
                        </span>
                      </div>
                      {playLoading && <p className="mt-3 text-sm text-slate-500">Cargando...</p>}
                      {!playLoading && !playError && playMetrics && (
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <span>Crash rate 7d</span>
                            <span className="font-semibold text-slate-900">
                              {((playMetrics.crashes?.crashRate7d ?? 0) * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <span>ANR rate 7d</span>
                            <span className="font-semibold text-slate-900">
                              {((playMetrics.anr?.anrRate7d ?? 0) * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Datos de Play Developer Reporting. Puede tardar algunas horas tras publicar una versión.
                          </div>
                        </div>
                      )}
                      {!playLoading && playError && (
                        <p className="mt-3 text-xs text-rose-500">{playError}</p>
                      )}
                    </div>
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

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Pantallas con más tiempo</h3>
                      <span className="text-xs text-slate-400">Últimos 30 días</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {overview.lists.topScreens.length === 0 && (
                        <p className="text-sm text-slate-500">No hay datos de navegación todavía.</p>
                      )}
                      {overview.lists.topScreens.map((screen) => (
                        <div
                          key={screen.path}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{screen.path}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {screen.views} visita(s) • {screen.avg_seconds.toFixed(0)}s promedio
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            {screen.total_minutes.toFixed(1)} min
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
          {activeTab === 'usuarios' && (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Buscar por nombre, email o plan..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:max-w-sm"
                  />
                  <span className="text-xs text-slate-400">
                    {filteredRecentUsers.length} usuarios recientes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      'usuarios_recientes.csv',
                      filteredRecentUsers.map((user) => ({
                        nombre: user.profile?.full_name || '',
                        negocio: user.profile?.business_name || '',
                        email: user.email || '',
                        alta: user.created_at || '',
                        ultimo_ingreso: user.last_sign_in_at || '',
                        suscripcion_estado: user.subscription?.status || '',
                        suscripcion_plan: user.subscription?.plan?.name || '',
                      }))
                    )
                  }
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Exportar CSV
                </button>
              </div>

              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Usuarios totales</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatNumber(overview.kpis.totalUsers)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Accesos habilitados</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatNumber(overview.kpis.accessGranted)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Accesos pendientes</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatNumber(overview.kpis.pendingAccess)}
                  </p>
                </div>
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Nuevos usuarios</h3>
                    <span className="text-xs text-slate-400">Últimos 12</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {filteredRecentUsers.length === 0 && (
                      <p className="text-sm text-slate-500">No hay usuarios recientes.</p>
                    )}
                    {filteredRecentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-700">
                            {getProfileLabel(user.profile || { email: user.email })}
                          </span>
                          <span className="text-slate-400">{formatDateTime(user.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{user.email || 'Sin email'}</p>
                        {(user.subscription?.status || user.subscription?.plan?.name) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            {user.subscription?.status && (
                              <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-600">
                                {user.subscription.status}
                              </span>
                            )}
                            {user.subscription?.plan?.name && (
                              <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-600">
                                {user.subscription.plan.name}
                              </span>
                            )}
                          </div>
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
                    {filteredPendingAccess.length === 0 && (
                      <p className="text-sm text-slate-500">No hay accesos pendientes.</p>
                    )}
                    {filteredPendingAccess.map((user) => (
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
              </section>
            </>
          )}
          {activeTab === 'facturacion' && (
            <>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Ingresos calculados desde {formatDateTime(overview.kpis.revenueSince)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'suscripciones_recientes.csv',
                        overview.lists.recentSubscriptions.map((sub) => ({
                          usuario: getProfileLabel(sub.profile),
                          email: sub.profile?.email || '',
                          estado: sub.status || '',
                          plan: sub.plan?.name || '',
                          periodo_meses: sub.plan?.period_months || '',
                          precio: sub.plan?.price_ars || '',
                          creado: sub.created_at,
                          renueva: sub.current_period_end || '',
                        }))
                      )
                    }
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Exportar suscripciones
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'pagos_recientes.csv',
                        overview.lists.recentPayments.map((payment) => ({
                          usuario: getProfileLabel(payment.profile),
                          email: payment.profile?.email || '',
                          estado: payment.status || '',
                          monto: payment.amount || 0,
                          pagado: payment.paid_at || payment.created_at,
                        }))
                      )
                    }
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Exportar pagos
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'ingresos_por_zona.csv',
                        overview.lists.incomeByZone.map((item) => ({
                          zona: item.zone,
                          total: item.total_amount,
                          presupuestos: item.quotes_amount,
                          suscripciones: item.subscriptions_amount,
                          presupuestos_cobrados: item.quotes_count,
                          pagos: item.payments_count,
                          usuarios: item.users_count,
                        }))
                      )
                    }
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Exportar zonas
                  </button>
                </div>
              </div>

              <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Ingresos suscripciones (12m)
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatCurrency(overview.kpis.revenueTotal)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">MRR estimado</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatCurrency(overview.kpis.mrr)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">ARR estimado</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatCurrency(overview.kpis.arr)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Ingresos por presupuestos
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {formatCurrency(overview.kpis.paidQuotesTotal)}
                  </p>
                </div>
              </section>

              <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Zonas</p>
                    <h3 className="text-lg font-semibold text-slate-900">Ingresos por zona</h3>
                    <p className="text-xs text-slate-500">
                      Basado en ciudad o área de cobertura del perfil.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {overview.lists.incomeByZone.length === 0 && (
                    <p className="text-sm text-slate-500">No hay datos de zona todavía.</p>
                  )}
                  {overview.lists.incomeByZone.map((item) => (
                    <div
                      key={item.zone}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{item.zone}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.users_count} usuario(s) • {item.quotes_count} presupuestos •{' '}
                          {item.payments_count} pagos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-700">
                          {formatCurrency(item.total_amount)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Presupuestos {formatCurrency(item.quotes_amount)} · Suscripciones{' '}
                          {formatCurrency(item.subscriptions_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-2">
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
                          <span className="font-semibold text-slate-700">{getProfileLabel(sub.profile)}</span>
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
              </section>
            </>
          )}
          {activeTab === 'mano_obra' && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Catálogo</p>
                  <h3 className="text-lg font-semibold text-slate-900">Valores de mano de obra</h3>
                  <p className="text-sm text-slate-500">
                    Activa/desactiva items y ajusta el precio sugerido (se usa en el panel de técnicos).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
                    Activos: {laborTotals.active}/{laborTotals.total}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadLaborItems(session.access_token)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Actualizar
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  value={laborSearch}
                  onChange={(event) => setLaborSearch(event.target.value)}
                  placeholder="Buscar por nombre, rubro o fuente..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:max-w-sm"
                />
                <select
                  value={laborSourceFilter}
                  onChange={(event) => setLaborSourceFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                >
                  <option value="all">Todas las fuentes</option>
                  {laborSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={laborShowInactive}
                    onChange={(event) => setLaborShowInactive(event.target.checked)}
                    className="h-4 w-4 rounded border border-slate-300 text-slate-900"
                  />
                  Mostrar inactivos
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setLaborSearch('');
                    setLaborSourceFilter('all');
                    setLaborShowInactive(false);
                  }}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Limpiar filtros
                </button>
              </div>

              {laborError && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {laborError}
                </div>
              )}
              {!laborError && laborMessage && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {laborMessage}
                </div>
              )}

              <div className="mt-5 space-y-3">
                {laborLoading && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Cargando valores...
                  </div>
                )}
                {!laborLoading && filteredLaborItems.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No encontramos items con esos filtros.
                  </div>
                )}
                {filteredLaborItems.map((item) => {
                  const isActive = item.active !== false;
                  const source = (item.source_ref || '').toString().trim() || 'Sin fuente';
                  const draft = laborPriceDrafts[item.id] ?? '';
                  const current =
                    item.suggested_price === null || item.suggested_price === undefined ? '' : String(item.suggested_price);
                  const dirty = draft !== current;
                  const saving = laborSavingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="min-w-[240px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-sm font-semibold ${
                              isActive ? 'text-slate-900' : 'text-slate-400 line-through'
                            }`}
                          >
                            {item.name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                              isActive
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {[item.category, source].filter(Boolean).join(' · ')}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={draft}
                          onChange={(event) =>
                            setLaborPriceDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                          }
                          className="w-36 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                        />
                        <button
                          type="button"
                          disabled={saving || !dirty}
                          onClick={() => {
                            const raw = (laborPriceDrafts[item.id] ?? '').trim();
                            if (raw === '') {
                              patchLaborItem(item.id, { suggested_price: null });
                              return;
                            }

                            const parsed = Number(raw);
                            if (!Number.isFinite(parsed) || parsed < 0) {
                              setLaborError('Precio inválido. Usa un número igual o mayor a 0.');
                              return;
                            }
                            patchLaborItem(item.id, { suggested_price: parsed });
                          }}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => patchLaborItem(item.id, { active: !isActive })}
                          disabled={saving}
                          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {activeTab === 'mensajes' && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Soporte</p>
                  <h3 className="text-lg font-semibold text-slate-900">Mensajes de usuarios</h3>
                  <p className="text-sm text-slate-500">Responde desde aquí al chat beta.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    value={messageSearch}
                    onChange={(event) => setMessageSearch(event.target.value)}
                    placeholder="Buscar conversación..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      loadSupportUsers(session.access_token);
                      if (activeSupportUserId) {
                        loadSupportMessages(session.access_token, activeSupportUserId);
                      }
                    }}
                    className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Actualizar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'mensajes_conversacion.csv',
                        supportMessages.map((msg) => ({
                          usuario: supportUsers.find((item) => item.userId === activeSupportUserId)?.label || '',
                          mensaje: msg.body,
                          fecha: msg.created_at,
                        }))
                      )
                    }
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Exportar conversación
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[280px,1fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Conversaciones</p>
                  {filteredSupportUsers.length === 0 && !supportLoading && (
                    <p className="mt-3 text-sm text-slate-500">Aun no hay mensajes.</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {filteredSupportUsers.map((user) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => setActiveSupportUserId(user.userId)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left text-xs transition ${
                          activeSupportUserId === user.userId
                            ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                            : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <p className="text-sm font-semibold">{user.label}</p>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                          {user.lastMessage?.body || 'Sin mensajes'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">
                    Conversación con:{' '}
                    <span className="font-semibold text-slate-700">
                      {supportUsers.find((user) => user.userId === activeSupportUserId)?.label ||
                        'Selecciona un usuario'}
                    </span>
                  </p>
                  <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    {supportLoading && <p className="text-sm text-slate-500">Cargando mensajes...</p>}
                    {!supportLoading && supportMessages.length === 0 && (
                      <p className="text-sm text-slate-500">Aun no hay mensajes en esta conversación.</p>
                    )}
                    {!supportLoading &&
                      supportMessages.map((msg) => {
                        const isOwn = msg.sender_id === session?.user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                isOwn ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'
                              }`}
                            >
                              {msg.body && <p>{msg.body}</p>}
                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatDateTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <textarea
                      value={supportDraft}
                      onChange={(event) => setSupportDraft(event.target.value)}
                      placeholder="Escribe tu respuesta..."
                      rows={2}
                      className="min-h-[64px] w-full flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleSendSupportMessage}
                      disabled={supportSending || !activeSupportUserId}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {supportSending ? 'Enviando...' : 'Responder'}
                    </button>
                  </div>

                  {supportError && <p className="mt-3 text-xs text-rose-500">{supportError}</p>}
                </div>
              </div>
            </section>
          )}
          {activeTab === 'accesos' && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Accesos pendientes</h3>
                  <p className="text-xs text-slate-400">Últimos 12</p>
                </div>
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:max-w-xs"
                />
              </div>
              <div className="mt-4 space-y-3">
                {filteredPendingAccess.length === 0 && (
                  <p className="text-sm text-slate-500">No hay accesos pendientes.</p>
                )}
                {filteredPendingAccess.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{getProfileLabel(user.profile || user)}</p>
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
            </section>
          )}
          {activeTab === 'actividad' && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Actividad</p>
                  <h3 className="text-lg font-semibold text-slate-900">Uso de la plataforma</h3>
                  <p className="text-sm text-slate-500">Visitas, sesiones únicas y tiempo por pantalla.</p>
                  {activityData?.range && (
                    <p className="mt-1 text-xs text-slate-400">
                      Periodo: {formatShortDate(activityData.range.start)} -{' '}
                      {formatShortDate(activityData.range.end)} • Comparado con{' '}
                      {activityData.previousRange
                        ? `${formatShortDate(activityData.previousRange.start)} - ${formatShortDate(
                            activityData.previousRange.end
                          )}`
                        : 'periodo anterior'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activityRange}
                    onChange={(event) => {
                      setActivityRange(Number(event.target.value) as 7 | 30 | 90);
                      setActivityStart('');
                      setActivityEnd('');
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                  >
                    <option value={7}>Últimos 7 días</option>
                    <option value={30}>Últimos 30 días</option>
                    <option value={90}>Últimos 90 días</option>
                  </select>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Del</span>
                    <input
                      type="date"
                      value={activityStart}
                      onChange={(event) => setActivityStart(event.target.value)}
                      className="border-none bg-transparent text-xs font-semibold text-slate-600 outline-none"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">al</span>
                    <input
                      type="date"
                      value={activityEnd}
                      onChange={(event) => setActivityEnd(event.target.value)}
                      className="border-none bg-transparent text-xs font-semibold text-slate-600 outline-none"
                    />
                  </div>
                  <select
                    value={activityUserId}
                    onChange={(event) => setActivityUserId(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Todos los usuarios</option>
                    {(overview?.lists.recentUsers || []).map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.profile?.business_name || user.profile?.full_name || user.email || user.id}
                      </option>
                    ))}
                  </select>
                  <input
                    value={activityPath}
                    onChange={(event) => setActivityPath(event.target.value)}
                    placeholder="Filtrar ruta (ej: /tecnicos)"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 md:max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      loadActivity();
                      loadPresence();
                    }}
                    className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Actualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivityStart('');
                      setActivityEnd('');
                      setActivityPath('');
                      setActivityUserId('');
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>

              {activityError && <p className="mt-4 text-xs text-rose-500">{activityError}</p>}
              {activityLoading && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Cargando actividad...
                </div>
              )}

              {!activityLoading && activityData && (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          'actividad_series.csv',
                          activityData.series.map((item) => ({
                            fecha: item.date,
                            visitas: item.views,
                            minutos: item.minutes.toFixed(2),
                          }))
                        )
                      }
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Exportar serie
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          'actividad_rutas.csv',
                          activityData.topRoutes.map((item) => ({
                            ruta: item.path,
                            visitas: item.views,
                            minutos: item.total_minutes.toFixed(2),
                            promedio_seg: item.avg_seconds.toFixed(0),
                          }))
                        )
                      }
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Exportar rutas
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          'actividad_usuarios.csv',
                          activityData.topUsers.map((item) => ({
                            usuario: item.label,
                            visitas: item.views,
                            sesiones: item.sessions,
                            minutos: item.total_minutes.toFixed(2),
                            promedio_seg: item.avg_seconds.toFixed(0),
                            ultima_visita: item.last_seen || '',
                          }))
                        )
                      }
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Exportar usuarios
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Visitas</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatNumber(activityData.totals.views)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          getDeltaLabel(activityData.totals.views, activityData.prevTotals.views).tone
                        }`}
                      >
                        {getDeltaLabel(activityData.totals.views, activityData.prevTotals.views).text}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Sesiones únicas</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatNumber(activityData.totals.uniqueSessions)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          getDeltaLabel(
                            activityData.totals.uniqueSessions,
                            activityData.prevTotals.uniqueSessions
                          ).tone
                        }`}
                      >
                        {getDeltaLabel(
                          activityData.totals.uniqueSessions,
                          activityData.prevTotals.uniqueSessions
                        ).text}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Usuarios únicos</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {formatNumber(activityData.totals.uniqueUsers)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          getDeltaLabel(
                            activityData.totals.uniqueUsers,
                            activityData.prevTotals.uniqueUsers
                          ).tone
                        }`}
                      >
                        {getDeltaLabel(
                          activityData.totals.uniqueUsers,
                          activityData.prevTotals.uniqueUsers
                        ).text}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tiempo total</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {activityData.totals.minutes.toFixed(1)} min
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          getDeltaLabel(activityData.totals.minutes, activityData.prevTotals.minutes).tone
                        }`}
                      >
                        {getDeltaLabel(activityData.totals.minutes, activityData.prevTotals.minutes).text}
                      </p>
                    </div>
                  </div>

                  {presenceError && <p className="mt-4 text-xs text-rose-500">{presenceError}</p>}

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-slate-900">Usuarios online</h4>
                        <span className="text-xs text-slate-400">
                          {presenceData
                            ? `${presenceData.onlineCount} online (últimos ${presenceData.onlineWindowMinutes} min)`
                            : 'Online'}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {presenceLoading && (
                          <p className="text-sm text-slate-500">Cargando usuarios online...</p>
                        )}
                        {!presenceLoading && (!presenceData || presenceData.onlineUsers.length === 0) && (
                          <p className="text-sm text-slate-500">No hay usuarios online.</p>
                        )}
                        {!presenceLoading &&
                          presenceData?.onlineUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-700">{user.label}</p>
                                {user.email && <p className="text-[11px] text-slate-400">{user.email}</p>}
                                {user.last_seen_path && (
                                  <p className="text-[10px] text-slate-400">Ruta: {user.last_seen_path}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Online
                                </span>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Visto {formatDateTime(user.last_seen_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-slate-900">Últimas conexiones</h4>
                        <span className="text-xs text-slate-400">Top 12</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {presenceLoading && (
                          <p className="text-sm text-slate-500">Cargando últimas conexiones...</p>
                        )}
                        {!presenceLoading && (!presenceData || presenceData.recentUsers.length === 0) && (
                          <p className="text-sm text-slate-500">No hay datos disponibles.</p>
                        )}
                        {!presenceLoading &&
                          presenceData?.recentUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-700">{user.label}</p>
                                {user.email && <p className="text-[11px] text-slate-400">{user.email}</p>}
                                {user.last_seen_path && (
                                  <p className="text-[10px] text-slate-400">Ruta: {user.last_seen_path}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {user.is_online ? (
                                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-slate-500">Offline</span>
                                )}
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {user.last_seen_at ? `Visto ${formatDateTime(user.last_seen_at)}` : 'Sin datos'}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Visitas por día</p>
                      <div className="mt-4 flex h-32 items-end gap-1">
                        {activityData.series.map((item) => {
                          const maxViews = Math.max(1, ...activityData.series.map((s) => s.views));
                          const height = Math.max(6, Math.round((item.views / maxViews) * 100));
                          return (
                            <div key={item.date} className="flex-1">
                              <div
                                className="w-full rounded-t-lg bg-slate-900/80"
                                style={{ height: `${height}%` }}
                                title={`${item.date}: ${item.views} visitas`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-between text-[10px] text-slate-400">
                        <span>{activityData.series[0]?.date}</span>
                        <span>{activityData.series[activityData.series.length - 1]?.date}</span>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tiempo por día</p>
                      <div className="mt-4 flex h-32 items-end gap-1">
                        {activityData.series.map((item) => {
                          const maxMinutes = Math.max(1, ...activityData.series.map((s) => s.minutes));
                          const height = Math.max(6, Math.round((item.minutes / maxMinutes) * 100));
                          return (
                            <div key={item.date} className="flex-1">
                              <div
                                className="w-full rounded-t-lg bg-slate-600/80"
                                style={{ height: `${height}%` }}
                                title={`${item.date}: ${item.minutes.toFixed(1)} min`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex justify-between text-[10px] text-slate-400">
                        <span>{activityData.series[0]?.date}</span>
                        <span>{activityData.series[activityData.series.length - 1]?.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-slate-900">Pantallas con más tiempo</h4>
                      <span className="text-xs text-slate-400">Top 5</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {activityData.topScreens.length === 0 && (
                        <p className="text-sm text-slate-500">No hay datos disponibles.</p>
                      )}
                      {activityData.topScreens.map((screen) => (
                        <div
                          key={screen.path}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{screen.path}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {screen.views} visita(s) • {screen.avg_seconds.toFixed(0)}s promedio
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            {screen.total_minutes.toFixed(1)} min
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-slate-900">Rutas con más visitas</h4>
                        <span className="text-xs text-slate-400">Top 8</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {activityData.topRoutes.length === 0 && (
                          <p className="text-sm text-slate-500">No hay datos disponibles.</p>
                        )}
                        {activityData.topRoutes.map((route) => (
                          <div
                            key={route.path}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{route.path}</p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {route.views} visita(s) • {route.avg_seconds.toFixed(0)}s promedio
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">
                                {route.total_minutes.toFixed(1)} min
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-slate-900">Usuarios más activos</h4>
                        <span className="text-xs text-slate-400">Top 8</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {activityData.topUsers.length === 0 && (
                          <p className="text-sm text-slate-500">No hay datos disponibles.</p>
                        )}
                        {activityData.topUsers.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{user.label}</p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {user.views} visita(s) • {user.sessions} sesión(es)
                              </p>
                              {user.last_seen && (
                                <p className="mt-1 text-[10px] text-slate-400">
                                  Última visita: {formatDateTime(user.last_seen)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">
                                {user.total_minutes.toFixed(1)} min
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {user.avg_seconds.toFixed(0)}s promedio
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
