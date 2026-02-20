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

type RoadmapStatus = 'planned' | 'in_progress' | 'done' | 'blocked';
type RoadmapArea = 'web' | 'mobile' | 'backend' | 'ops';
type RoadmapPriority = 'high' | 'medium' | 'low';
type RoadmapSentiment = 'positive' | 'neutral' | 'negative';

type RoadmapFeedbackItem = {
  id: string;
  roadmap_id: string;
  body: string;
  sentiment: RoadmapSentiment;
  created_by?: string | null;
  created_by_label?: string | null;
  created_at: string;
};

type RoadmapUpdateItem = {
  id: string;
  title: string;
  description?: string | null;
  status: RoadmapStatus;
  area: RoadmapArea;
  priority: RoadmapPriority;
  owner?: string | null;
  eta_date?: string | null;
  created_by?: string | null;
  created_by_label?: string | null;
  updated_by?: string | null;
  updated_by_label?: string | null;
  created_at: string;
  updated_at: string;
  feedback: RoadmapFeedbackItem[];
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

type ArgentinaZoneAnchor = {
  id: string;
  label: string;
  x: number;
  y: number;
  aliases: string[];
};

type ArgentinaZonePoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  users: number;
  quotes: number;
  payments: number;
  totalAmount: number;
  zones: string[];
  radius: number;
};

const ARGENTINA_SILHOUETTE_PATH =
  'M127 12 L106 24 L95 54 L105 84 L98 114 L111 146 L102 176 L115 206 L108 236 L121 269 L112 302 L129 336 L120 372 L133 406 L149 420 L170 414 L177 392 L172 364 L183 336 L174 301 L186 268 L176 236 L187 206 L177 172 L187 142 L175 108 L183 80 L169 51 L172 26 L153 14 Z';

const ARGENTINA_ZONE_ANCHORS: ArgentinaZoneAnchor[] = [
  { id: 'salta', label: 'Salta', x: 114, y: 108, aliases: ['salta'] },
  { id: 'jujuy', label: 'Jujuy', x: 108, y: 92, aliases: ['jujuy'] },
  { id: 'tucuman', label: 'Tucuman', x: 122, y: 126, aliases: ['tucuman'] },
  { id: 'chaco', label: 'Chaco', x: 152, y: 128, aliases: ['chaco', 'resistencia'] },
  { id: 'corrientes', label: 'Corrientes', x: 164, y: 142, aliases: ['corrientes'] },
  { id: 'misiones', label: 'Misiones', x: 176, y: 122, aliases: ['misiones', 'posadas'] },
  { id: 'santiago', label: 'Santiago del Estero', x: 132, y: 146, aliases: ['santiago del estero'] },
  { id: 'cordoba', label: 'Cordoba', x: 128, y: 188, aliases: ['cordoba'] },
  { id: 'santa_fe', label: 'Santa Fe', x: 146, y: 186, aliases: ['santa fe', 'rosario'] },
  { id: 'mendoza', label: 'Mendoza', x: 92, y: 194, aliases: ['mendoza'] },
  { id: 'san_juan', label: 'San Juan', x: 95, y: 176, aliases: ['san juan'] },
  { id: 'san_luis', label: 'San Luis', x: 112, y: 208, aliases: ['san luis'] },
  { id: 'entre_rios', label: 'Entre Rios', x: 158, y: 200, aliases: ['entre rios', 'parana'] },
  {
    id: 'buenos_aires',
    label: 'Buenos Aires / AMBA',
    x: 162,
    y: 244,
    aliases: ['buenos aires', 'caba', 'capital federal', 'amba', 'la plata'],
  },
  { id: 'la_pampa', label: 'La Pampa', x: 122, y: 246, aliases: ['la pampa', 'santa rosa'] },
  { id: 'neuquen', label: 'Neuquen', x: 102, y: 282, aliases: ['neuquen'] },
  { id: 'rio_negro', label: 'Rio Negro', x: 118, y: 294, aliases: ['rio negro', 'bariloche', 'viedma'] },
  { id: 'chubut', label: 'Chubut', x: 128, y: 334, aliases: ['chubut', 'comodoro'] },
  { id: 'santa_cruz', label: 'Santa Cruz', x: 136, y: 374, aliases: ['santa cruz', 'caleta olivia'] },
  { id: 'tierra_fuego', label: 'Tierra del Fuego', x: 151, y: 410, aliases: ['tierra del fuego', 'ushuaia'] },
];

const getAnchorByZone = (zone: string) => {
  const normalized = normalizeText(zone);
  if (!normalized) return null;
  return (
    ARGENTINA_ZONE_ANCHORS.find((anchor) =>
      anchor.aliases.some((alias) => normalized.includes(normalizeText(alias)))
    ) || null
  );
};

const ROADMAP_STATUS_OPTIONS: { value: RoadmapStatus; label: string }[] = [
  { value: 'planned', label: 'Planificado' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'done', label: 'Resuelto' },
  { value: 'blocked', label: 'Bloqueado' },
];

const ROADMAP_AREA_OPTIONS: { value: RoadmapArea; label: string }[] = [
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'backend', label: 'Backend' },
  { value: 'ops', label: 'Ops' },
];

const ROADMAP_PRIORITY_OPTIONS: { value: RoadmapPriority; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const ROADMAP_SENTIMENT_OPTIONS: { value: RoadmapSentiment; label: string }[] = [
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
];

const getRoadmapStatusLabel = (status: RoadmapStatus) =>
  ROADMAP_STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
const getRoadmapAreaLabel = (area: RoadmapArea) =>
  ROADMAP_AREA_OPTIONS.find((item) => item.value === area)?.label || area;
const getRoadmapPriorityLabel = (priority: RoadmapPriority) =>
  ROADMAP_PRIORITY_OPTIONS.find((item) => item.value === priority)?.label || priority;
const getRoadmapSentimentLabel = (sentiment: RoadmapSentiment) =>
  ROADMAP_SENTIMENT_OPTIONS.find((item) => item.value === sentiment)?.label || sentiment;

const toRoadmapStatus = (value: unknown): RoadmapStatus => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'done') return 'done';
  if (normalized === 'blocked') return 'blocked';
  return 'planned';
};

const toRoadmapArea = (value: unknown): RoadmapArea => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (normalized === 'mobile') return 'mobile';
  if (normalized === 'backend') return 'backend';
  if (normalized === 'ops') return 'ops';
  return 'web';
};

const toRoadmapPriority = (value: unknown): RoadmapPriority => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
};

const toRoadmapSentiment = (value: unknown): RoadmapSentiment => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (normalized === 'positive') return 'positive';
  if (normalized === 'negative') return 'negative';
  return 'neutral';
};

const ROADMAP_STATUS_BADGE_CLASS: Record<RoadmapStatus, string> = {
  planned: 'border border-slate-200 bg-slate-100 text-slate-700',
  in_progress: 'border border-sky-200 bg-sky-50 text-sky-700',
  done: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  blocked: 'border border-rose-200 bg-rose-50 text-rose-700',
};

const ROADMAP_PRIORITY_BADGE_CLASS: Record<RoadmapPriority, string> = {
  high: 'border border-rose-200 bg-rose-50 text-rose-700',
  medium: 'border border-amber-200 bg-amber-50 text-amber-700',
  low: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
};

const ROADMAP_SENTIMENT_BADGE_CLASS: Record<RoadmapSentiment, string> = {
  positive: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border border-slate-200 bg-slate-100 text-slate-700',
  negative: 'border border-rose-200 bg-rose-50 text-rose-700',
};

const ROADMAP_STATUS_ORDER: RoadmapStatus[] = ['planned', 'in_progress', 'blocked', 'done'];

const ROADMAP_STATUS_CHART_COLOR: Record<RoadmapStatus, string> = {
  planned: '#94A3B8',
  in_progress: '#0EA5E9',
  blocked: '#F43F5E',
  done: '#10B981',
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toTimeMs = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatWeekLabel = (value: Date) =>
  value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });

const buildLinePoints = (values: number[], maxValue: number) => {
  if (!values.length) return '';
  if (values.length === 1) {
    const y = 38 - Math.round((values[0] / Math.max(1, maxValue)) * 30);
    return `50,${Math.max(4, Math.min(38, y))}`;
  }
  return values
    .map((value, index) => {
      const x = Math.round((index / (values.length - 1)) * 100);
      const y = 38 - Math.round((value / Math.max(1, maxValue)) * 30);
      return `${x},${Math.max(4, Math.min(38, y))}`;
    })
    .join(' ');
};

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
    'resumen' | 'usuarios' | 'facturacion' | 'roadmap' | 'mensajes' | 'accesos' | 'actividad' | 'mano_obra'
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
  const [roadmapUpdates, setRoadmapUpdates] = useState<RoadmapUpdateItem[]>([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState('');
  const [roadmapMessage, setRoadmapMessage] = useState('');
  const [roadmapSearch, setRoadmapSearch] = useState('');
  const [roadmapStatusFilter, setRoadmapStatusFilter] = useState<'all' | RoadmapStatus>('all');
  const [roadmapAreaFilter, setRoadmapAreaFilter] = useState<'all' | RoadmapArea>('all');
  const [roadmapSubmitting, setRoadmapSubmitting] = useState(false);
  const [roadmapUpdatingId, setRoadmapUpdatingId] = useState<string | null>(null);
  const [roadmapFeedbackSavingId, setRoadmapFeedbackSavingId] = useState<string | null>(null);
  const [roadmapFeedbackDrafts, setRoadmapFeedbackDrafts] = useState<Record<string, string>>({});
  const [roadmapFeedbackSentiments, setRoadmapFeedbackSentiments] = useState<Record<string, RoadmapSentiment>>({});
  const [roadmapForm, setRoadmapForm] = useState<{
    title: string;
    description: string;
    status: RoadmapStatus;
    area: RoadmapArea;
    priority: RoadmapPriority;
    owner: string;
    eta_date: string;
    initial_feedback: string;
    initial_feedback_sentiment: RoadmapSentiment;
  }>({
    title: '',
    description: '',
    status: 'planned',
    area: 'web',
    priority: 'medium',
    owner: '',
    eta_date: '',
    initial_feedback: '',
    initial_feedback_sentiment: 'neutral',
  });

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

  const loadRoadmap = async (token?: string) => {
    if (!token) return;
    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapLoading(true);
    try {
      const response = await fetch('/api/admin/roadmap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo cargar el roadmap.');
      }

      const data = await response.json();
      const rows = Array.isArray(data?.updates) ? data.updates : [];
      const mapped = rows.map((row: any) => ({
        ...row,
        status: toRoadmapStatus(row?.status),
        area: toRoadmapArea(row?.area),
        priority: toRoadmapPriority(row?.priority),
        feedback: Array.isArray(row?.feedback)
          ? row.feedback.map((feedback: any) => ({
              ...feedback,
              sentiment: toRoadmapSentiment(feedback?.sentiment),
            }))
          : [],
      })) as RoadmapUpdateItem[];

      setRoadmapUpdates(mapped);
    } catch (error: any) {
      setRoadmapError(error?.message || 'No se pudo cargar el roadmap.');
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleRoadmapCreate = async () => {
    if (!session?.access_token) return;
    const title = roadmapForm.title.trim();
    if (title.length < 3) {
      setRoadmapError('Escribe un título de al menos 3 caracteres.');
      return;
    }
    const initialFeedback = roadmapForm.initial_feedback.trim();
    if (initialFeedback.length < 2) {
      setRoadmapError('Cada tarea nueva debe incluir feedback inicial.');
      return;
    }

    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapSubmitting(true);
    try {
      const response = await fetch('/api/admin/roadmap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: roadmapForm.description.trim() || null,
          status: roadmapForm.status,
          area: roadmapForm.area,
          priority: roadmapForm.priority,
          owner: roadmapForm.owner.trim() || null,
          eta_date: roadmapForm.eta_date || null,
          feedback_body: initialFeedback,
          feedback_sentiment: roadmapForm.initial_feedback_sentiment,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo crear el item.');
      }

      const created = data?.update
        ? ({
            ...data.update,
            status: toRoadmapStatus(data.update.status),
            area: toRoadmapArea(data.update.area),
            priority: toRoadmapPriority(data.update.priority),
            feedback: Array.isArray(data.update.feedback)
              ? data.update.feedback.map((feedback: any) => ({
                  ...feedback,
                  sentiment: toRoadmapSentiment(feedback?.sentiment),
                }))
              : [],
          } as RoadmapUpdateItem)
        : null;
      if (created) {
        setRoadmapUpdates((prev) => [created, ...prev]);
      } else {
        await loadRoadmap(session.access_token);
      }

      setRoadmapForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        owner: '',
        eta_date: '',
        initial_feedback: '',
        initial_feedback_sentiment: 'neutral',
      }));
      setRoadmapMessage('Actualización agregada.');
    } catch (error: any) {
      setRoadmapError(error?.message || 'No se pudo crear el item.');
    } finally {
      setRoadmapSubmitting(false);
    }
  };

  const patchRoadmapUpdate = async (
    roadmapId: string,
    patch: Partial<{ status: RoadmapStatus; area: RoadmapArea; priority: RoadmapPriority; owner: string | null }>
  ) => {
    if (!session?.access_token) return;
    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapUpdatingId(roadmapId);
    try {
      const response = await fetch(`/api/admin/roadmap/${roadmapId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el item.');
      }
      const updated = data?.update || null;
      if (updated) {
        setRoadmapUpdates((prev) =>
          prev.map((item) =>
            item.id === roadmapId
              ? {
                  ...item,
                  ...updated,
                  status: toRoadmapStatus(updated.status),
                  area: toRoadmapArea(updated.area),
                  priority: toRoadmapPriority(updated.priority),
                }
              : item
          )
        );
      }
      setRoadmapMessage('Roadmap actualizado.');
    } catch (error: any) {
      setRoadmapError(error?.message || 'No se pudo actualizar el item.');
    } finally {
      setRoadmapUpdatingId(null);
    }
  };

  const addRoadmapFeedback = async (roadmapId: string) => {
    if (!session?.access_token) return;
    const body = (roadmapFeedbackDrafts[roadmapId] || '').trim();
    if (body.length < 2) {
      setRoadmapError('El feedback debe tener al menos 2 caracteres.');
      return;
    }

    const sentiment = roadmapFeedbackSentiments[roadmapId] || 'neutral';
    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapFeedbackSavingId(roadmapId);
    try {
      const response = await fetch(`/api/admin/roadmap/${roadmapId}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body, sentiment }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo guardar el feedback.');
      }
      const feedback = data?.feedback
        ? ({
            ...data.feedback,
            sentiment: toRoadmapSentiment(data.feedback.sentiment),
          } as RoadmapFeedbackItem)
        : null;
      if (feedback) {
        setRoadmapUpdates((prev) =>
          prev.map((item) =>
            item.id === roadmapId
              ? {
                  ...item,
                  feedback: [...(item.feedback || []), feedback],
                }
              : item
          )
        );
      } else {
        await loadRoadmap(session.access_token);
      }

      setRoadmapFeedbackDrafts((prev) => ({ ...prev, [roadmapId]: '' }));
      setRoadmapMessage('Feedback agregado.');
    } catch (error: any) {
      setRoadmapError(error?.message || 'No se pudo guardar el feedback.');
    } finally {
      setRoadmapFeedbackSavingId(null);
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
    if (!session?.access_token || activeTab !== 'roadmap') return;
    loadRoadmap(session.access_token);
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
    setRoadmapUpdates([]);
    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapSearch('');
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

  const argentinaZoneHeatmap = useMemo(() => {
    if (!overview) {
      return {
        points: [] as ArgentinaZonePoint[],
        unmappedZones: [] as string[],
        totalUsers: 0,
      };
    }

    const grouped = new Map<string, Omit<ArgentinaZonePoint, 'radius'>>();
    const unmappedZones: string[] = [];
    let totalUsers = 0;

    overview.lists.incomeByZone.forEach((item) => {
      totalUsers += Number(item.users_count || 0);
      const anchor = getAnchorByZone(item.zone);
      if (!anchor) {
        unmappedZones.push(item.zone);
        return;
      }

      const current = grouped.get(anchor.id) || {
        id: anchor.id,
        label: anchor.label,
        x: anchor.x,
        y: anchor.y,
        users: 0,
        quotes: 0,
        payments: 0,
        totalAmount: 0,
        zones: [],
      };

      current.users += Number(item.users_count || 0);
      current.quotes += Number(item.quotes_count || 0);
      current.payments += Number(item.payments_count || 0);
      current.totalAmount += Number(item.total_amount || 0);
      current.zones.push(item.zone);
      grouped.set(anchor.id, current);
    });

    const basePoints = Array.from(grouped.values()).sort((a, b) => b.users - a.users);
    const maxUsers = Math.max(1, ...basePoints.map((point) => point.users || 0));
    const points: ArgentinaZonePoint[] = basePoints.map((point) => ({
      ...point,
      radius: 6 + Math.round((Math.max(1, point.users) / maxUsers) * 10),
    }));

    return {
      points,
      unmappedZones: Array.from(new Set(unmappedZones)).slice(0, 6),
      totalUsers,
    };
  }, [overview]);

  const tabs = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'usuarios', label: 'Usuarios' },
    { key: 'facturacion', label: 'Facturación' },
    { key: 'mano_obra', label: 'Mano de obra' },
    { key: 'roadmap', label: 'Roadmap' },
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

  const filteredRoadmapUpdates = useMemo(() => {
    const query = normalizeText(roadmapSearch);
    return roadmapUpdates.filter((item) => {
      if (roadmapStatusFilter !== 'all' && item.status !== roadmapStatusFilter) return false;
      if (roadmapAreaFilter !== 'all' && item.area !== roadmapAreaFilter) return false;
      if (!query) return true;
      const feedbackText = (item.feedback || []).map((feedback) => feedback.body).join(' ');
      const haystack = normalizeText([item.title, item.description || '', item.owner || '', feedbackText].join(' '));
      return haystack.includes(query);
    });
  }, [roadmapUpdates, roadmapSearch, roadmapStatusFilter, roadmapAreaFilter]);

  const roadmapTotals = useMemo(() => {
    const total = roadmapUpdates.length;
    const done = roadmapUpdates.filter((item) => item.status === 'done').length;
    const inProgress = roadmapUpdates.filter((item) => item.status === 'in_progress').length;
    const blocked = roadmapUpdates.filter((item) => item.status === 'blocked').length;
    return { total, done, inProgress, blocked };
  }, [roadmapUpdates]);

  const roadmapReportItems = filteredRoadmapUpdates;

  const roadmapReportTotals = useMemo(() => {
    const total = roadmapReportItems.length;
    const done = roadmapReportItems.filter((item) => item.status === 'done').length;
    const inProgress = roadmapReportItems.filter((item) => item.status === 'in_progress').length;
    const blocked = roadmapReportItems.filter((item) => item.status === 'blocked').length;
    const open = total - done;
    const todayMs = startOfDay(new Date()).getTime();
    const overdue = roadmapReportItems.filter((item) => {
      if (item.status === 'done') return false;
      const etaMs = toTimeMs(item.eta_date);
      return etaMs !== null && etaMs < todayMs;
    }).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, blocked, open, overdue, completionRate };
  }, [roadmapReportItems]);

  const roadmapStatusSeries = useMemo(
    () =>
      ROADMAP_STATUS_ORDER.map((status) => ({
        status,
        label: getRoadmapStatusLabel(status),
        color: ROADMAP_STATUS_CHART_COLOR[status],
        count: roadmapReportItems.filter((item) => item.status === status).length,
      })),
    [roadmapReportItems]
  );

  const roadmapDonutBackground = useMemo(() => {
    const total = roadmapStatusSeries.reduce((sum, item) => sum + item.count, 0);
    if (!total) {
      return 'conic-gradient(#E2E8F0 0deg, #E2E8F0 360deg)';
    }
    let cursor = 0;
    const segments = roadmapStatusSeries
      .filter((item) => item.count > 0)
      .map((item) => {
        const start = (cursor / total) * 360;
        cursor += item.count;
        const end = (cursor / total) * 360;
        return `${item.color} ${start}deg ${end}deg`;
      });
    return `conic-gradient(${segments.join(', ')})`;
  }, [roadmapStatusSeries]);

  const roadmapBurnupSeries = useMemo(() => {
    const now = startOfDay(new Date());
    const points: { label: string; total: number; done: number }[] = [];
    for (let step = 7; step >= 0; step -= 1) {
      const checkpoint = new Date(now);
      checkpoint.setDate(now.getDate() - step * 7);
      const checkpointMs = checkpoint.getTime();

      const total = roadmapReportItems.filter((item) => {
        const createdMs = toTimeMs(item.created_at);
        return createdMs !== null && createdMs <= checkpointMs;
      }).length;

      const done = roadmapReportItems.filter((item) => {
        if (item.status !== 'done') return false;
        const updatedMs = toTimeMs(item.updated_at) ?? toTimeMs(item.created_at);
        return updatedMs !== null && updatedMs <= checkpointMs;
      }).length;

      points.push({
        label: formatWeekLabel(checkpoint),
        total,
        done,
      });
    }
    return points;
  }, [roadmapReportItems]);

  const roadmapBurnupMax = useMemo(
    () => Math.max(1, ...roadmapBurnupSeries.map((item) => Math.max(item.total, item.done))),
    [roadmapBurnupSeries]
  );

  const roadmapBurnupTotalPoints = useMemo(
    () => buildLinePoints(roadmapBurnupSeries.map((item) => item.total), roadmapBurnupMax),
    [roadmapBurnupSeries, roadmapBurnupMax]
  );

  const roadmapBurnupDonePoints = useMemo(
    () => buildLinePoints(roadmapBurnupSeries.map((item) => item.done), roadmapBurnupMax),
    [roadmapBurnupSeries, roadmapBurnupMax]
  );

  const roadmapFlowSeries = useMemo(() => {
    const now = startOfDay(new Date());
    const weeks = 6;
    return Array.from({ length: weeks }).map((_, index) => {
      const offset = weeks - index - 1;
      const end = new Date(now);
      end.setDate(now.getDate() - offset * 7);
      end.setHours(23, 59, 59, 999);

      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const counts: Record<RoadmapStatus, number> = {
        planned: 0,
        in_progress: 0,
        blocked: 0,
        done: 0,
      };

      roadmapReportItems.forEach((item) => {
        const createdMs = toTimeMs(item.created_at);
        if (createdMs === null) return;
        if (createdMs >= start.getTime() && createdMs <= end.getTime()) {
          counts[item.status] += 1;
        }
      });

      const total = ROADMAP_STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);

      return {
        label: `${formatWeekLabel(start)} - ${formatWeekLabel(end)}`,
        counts,
        total,
      };
    });
  }, [roadmapReportItems]);

  const roadmapAgingItems = useMemo(() => {
    const nowMs = Date.now();
    return roadmapReportItems
      .filter((item) => item.status === 'in_progress' || item.status === 'blocked')
      .map((item) => {
        const createdMs = toTimeMs(item.created_at) ?? nowMs;
        return {
          id: item.id,
          title: item.title,
          owner: item.owner,
          status: item.status,
          priority: item.priority,
          daysOpen: Math.max(0, Math.round((nowMs - createdMs) / DAY_MS)),
        };
      })
      .sort((a, b) => b.daysOpen - a.daysOpen)
      .slice(0, 10);
  }, [roadmapReportItems]);

  const roadmapAgingMaxDays = useMemo(
    () => Math.max(1, ...roadmapAgingItems.map((item) => item.daysOpen)),
    [roadmapAgingItems]
  );

  const roadmapHeatmap = useMemo(
    () =>
      ROADMAP_AREA_OPTIONS.map((areaOption) => ({
        area: areaOption.value,
        label: areaOption.label,
        values: ROADMAP_PRIORITY_OPTIONS.map((priorityOption) => ({
          priority: priorityOption.value,
          label: priorityOption.label,
          count: roadmapReportItems.filter(
            (item) =>
              item.status !== 'done' && item.area === areaOption.value && item.priority === priorityOption.value
          ).length,
        })),
      })),
    [roadmapReportItems]
  );

  const roadmapHeatmapMax = useMemo(
    () => Math.max(1, ...roadmapHeatmap.flatMap((row) => row.values.map((cell) => cell.count))),
    [roadmapHeatmap]
  );

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
                  if (activeTab === 'roadmap') {
                    loadRoadmap(session.access_token);
                  }
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

              <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mapa</p>
                      <h3 className="text-lg font-semibold text-slate-900">Argentina por zonas activas</h3>
                      <p className="text-xs text-slate-500">
                        Usuarios que ya se conectaron a presupuestar, agrupados por zona aproximada.
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      {formatNumber(argentinaZoneHeatmap.totalUsers)} usuarios
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
                    <svg viewBox="70 0 140 430" className="h-[360px] w-full">
                      <path d={ARGENTINA_SILHOUETTE_PATH} fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
                      {argentinaZoneHeatmap.points.map((point) => (
                        <g key={point.id}>
                          <title>
                            {`${point.label}: ${point.users} usuario(s), ${point.quotes} presupuesto(s), ${point.payments} pago(s)`}
                          </title>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={point.radius + 2}
                            fill="#FFFFFF"
                            fillOpacity="0.75"
                          />
                          <circle cx={point.x} cy={point.y} r={point.radius} fill="#0F172A" fillOpacity="0.85" />
                          <circle cx={point.x} cy={point.y} r={Math.max(2, point.radius - 6)} fill="#F5B942" />
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {argentinaZoneHeatmap.points.slice(0, 6).map((point) => (
                      <div
                        key={`legend-${point.id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-slate-700">{point.label}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {point.users} usuario(s) • {point.quotes} presup.
                        </p>
                      </div>
                    ))}
                  </div>

                  {argentinaZoneHeatmap.unmappedZones.length > 0 && (
                    <p className="mt-3 text-[11px] text-slate-400">
                      Zonas sin ubicar en el mapa: {argentinaZoneHeatmap.unmappedZones.join(', ')}
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Detalle</p>
                    <h3 className="text-lg font-semibold text-slate-900">Ingresos por zona</h3>
                    <p className="text-xs text-slate-500">Basado en ciudad o área de cobertura del perfil.</p>
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
          {activeTab === 'roadmap' && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Producto</p>
                  <h3 className="text-lg font-semibold text-slate-900">Roadmap de actualizaciones</h3>
                  <p className="text-sm text-slate-500">
                    Carga mejoras, estado y feedback interno para coordinar trabajo entre equipos.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    Total: {roadmapTotals.total}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Resueltos: {roadmapTotals.done}
                  </span>
                  <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                    En curso: {roadmapTotals.inProgress}
                  </span>
                  {roadmapTotals.blocked > 0 && (
                    <span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      Bloqueados: {roadmapTotals.blocked}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => loadRoadmap(session.access_token)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Actualizar
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Reportes calculados con filtros activos. Ideal para status semanal y seguimiento de bloqueos.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Avance</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{roadmapReportTotals.completionRate}%</p>
                  <p className="text-xs text-slate-500">Done / Total filtrado</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Pendientes</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{roadmapReportTotals.open}</p>
                  <p className="text-xs text-slate-500">No resueltos</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-rose-500">Bloqueados</p>
                  <p className="mt-1 text-2xl font-semibold text-rose-700">{roadmapReportTotals.blocked}</p>
                  <p className="text-xs text-rose-600">Necesitan destrabe</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600">Vencidos</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-700">{roadmapReportTotals.overdue}</p>
                  <p className="text-xs text-amber-700">ETA pasada</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-sky-600">En progreso</p>
                  <p className="mt-1 text-2xl font-semibold text-sky-700">{roadmapReportTotals.inProgress}</p>
                  <p className="text-xs text-sky-700">Ejecución activa</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600">Resueltos</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">{roadmapReportTotals.done}</p>
                  <p className="text-xs text-emerald-700">Cerrados</p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Estado actual</p>
                    <span className="text-xs text-slate-500">{roadmapReportTotals.total} items</span>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div
                      className="relative h-32 w-32 rounded-full border border-slate-200"
                      style={{ background: roadmapDonutBackground }}
                    >
                      <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-center">
                        <div>
                          <p className="text-xl font-semibold text-slate-900">{roadmapReportTotals.completionRate}%</p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Done</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {roadmapStatusSeries.map((item) => (
                        <div key={item.status} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                            <span className="font-medium text-slate-600">{item.label}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Burnup semanal</p>
                    <span className="text-xs text-slate-500">Total vs done</span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-36 w-full">
                      <polyline points="0,38 100,38" fill="none" stroke="#E2E8F0" strokeWidth="0.7" />
                      <polyline points="0,21 100,21" fill="none" stroke="#E2E8F0" strokeWidth="0.7" />
                      {!!roadmapBurnupTotalPoints && (
                        <polyline
                          points={roadmapBurnupTotalPoints}
                          fill="none"
                          stroke="#0F172A"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {!!roadmapBurnupDonePoints && (
                        <polyline
                          points={roadmapBurnupDonePoints}
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-slate-900" />
                        Total acumulado
                      </span>
                      <span className="inline-flex items-center gap-2 text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Done acumulado
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-[10px] text-slate-400">
                      <span>{roadmapBurnupSeries[0]?.label || '-'}</span>
                      <span>{roadmapBurnupSeries[roadmapBurnupSeries.length - 1]?.label || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Flujo semanal</p>
                    <span className="text-xs text-slate-500">Items creados por estado actual</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {roadmapFlowSeries.map((week) => (
                      <div key={week.label}>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{week.label}</span>
                          <span>{week.total} item(s)</span>
                        </div>
                        <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200">
                          {week.total === 0 ? (
                            <div className="h-full w-full bg-slate-100" />
                          ) : (
                            <div className="flex h-full w-full">
                              {ROADMAP_STATUS_ORDER.map((status) => {
                                const count = week.counts[status];
                                if (!count) return null;
                                const width = Math.max(4, Math.round((count / week.total) * 100));
                                return (
                                  <div
                                    key={`${week.label}-${status}`}
                                    className="h-full"
                                    style={{
                                      width: `${width}%`,
                                      background: ROADMAP_STATUS_CHART_COLOR[status],
                                    }}
                                    title={`${getRoadmapStatusLabel(status)}: ${count}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Aging pendientes</p>
                    <span className="text-xs text-slate-500">Top 10 in_progress + blocked</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {roadmapAgingItems.length === 0 && (
                      <p className="text-sm text-slate-500">No hay pendientes activos para mostrar.</p>
                    )}
                    {roadmapAgingItems.map((item) => {
                      const pct = Math.max(8, Math.round((item.daysOpen / roadmapAgingMaxDays) * 100));
                      return (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="line-clamp-1 text-xs font-semibold text-slate-700">{item.title}</p>
                            <span className="text-xs font-semibold text-slate-900">{item.daysOpen}d</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                item.status === 'blocked' ? 'bg-rose-500' : 'bg-sky-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{item.owner || 'Sin owner'}</span>
                            <span>{getRoadmapStatusLabel(item.status)} • {getRoadmapPriorityLabel(item.priority)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Heatmap prioridad x área</p>
                  <span className="text-xs text-slate-500">Solo pendientes (sin done)</span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-2 text-xs">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left font-semibold text-slate-500">Área</th>
                        {ROADMAP_PRIORITY_OPTIONS.map((priorityOption) => (
                          <th key={priorityOption.value} className="px-2 py-1 text-left font-semibold text-slate-500">
                            {priorityOption.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roadmapHeatmap.map((row) => (
                        <tr key={row.area}>
                          <td className="px-2 py-1 font-semibold text-slate-700">{row.label}</td>
                          {row.values.map((cell) => {
                            const ratio = cell.count / roadmapHeatmapMax;
                            const alpha = cell.count === 0 ? 0.06 : 0.12 + ratio * 0.58;
                            return (
                              <td key={`${row.area}-${cell.priority}`} className="px-2 py-1">
                                <div
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-center font-semibold"
                                  style={{
                                    backgroundColor: `rgba(15, 23, 42, ${alpha})`,
                                    color: cell.count > 0 ? '#FFFFFF' : '#64748B',
                                  }}
                                >
                                  {cell.count}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[360px,1fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Nueva actualización</p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={roadmapForm.title}
                      onChange={(event) => setRoadmapForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Ej: Mejorar autocomplete de direcciones"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                    <textarea
                      value={roadmapForm.description}
                      onChange={(event) => setRoadmapForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Detalle técnico / criterio de aceptación..."
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={roadmapForm.status}
                        onChange={(event) =>
                          setRoadmapForm((prev) => ({ ...prev, status: event.target.value as RoadmapStatus }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        {ROADMAP_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={roadmapForm.area}
                        onChange={(event) =>
                          setRoadmapForm((prev) => ({ ...prev, area: event.target.value as RoadmapArea }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        {ROADMAP_AREA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={roadmapForm.priority}
                        onChange={(event) =>
                          setRoadmapForm((prev) => ({ ...prev, priority: event.target.value as RoadmapPriority }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        {ROADMAP_PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={roadmapForm.owner}
                        onChange={(event) => setRoadmapForm((prev) => ({ ...prev, owner: event.target.value }))}
                        placeholder="Responsable (opcional)"
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">ETA</label>
                      <input
                        type="date"
                        value={roadmapForm.eta_date}
                        onChange={(event) => setRoadmapForm((prev) => ({ ...prev, eta_date: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        Feedback inicial (obligatorio)
                      </label>
                      <textarea
                        value={roadmapForm.initial_feedback}
                        onChange={(event) =>
                          setRoadmapForm((prev) => ({ ...prev, initial_feedback: event.target.value }))
                        }
                        placeholder="Contexto inicial, riesgo o validacion pendiente..."
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <div className="mt-2">
                        <select
                          value={roadmapForm.initial_feedback_sentiment}
                          onChange={(event) =>
                            setRoadmapForm((prev) => ({
                              ...prev,
                              initial_feedback_sentiment: event.target.value as RoadmapSentiment,
                            }))
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                        >
                          {ROADMAP_SENTIMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              Sentimiento inicial: {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRoadmapCreate}
                      disabled={roadmapSubmitting}
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {roadmapSubmitting ? 'Guardando...' : 'Agregar actualización'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={roadmapSearch}
                        onChange={(event) => setRoadmapSearch(event.target.value)}
                        placeholder="Buscar por título, descripción o feedback..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 md:max-w-sm"
                      />
                      <select
                        value={roadmapStatusFilter}
                        onChange={(event) =>
                          setRoadmapStatusFilter(event.target.value as 'all' | RoadmapStatus)
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        <option value="all">Todos los estados</option>
                        {ROADMAP_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={roadmapAreaFilter}
                        onChange={(event) => setRoadmapAreaFilter(event.target.value as 'all' | RoadmapArea)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        <option value="all">Todas las áreas</option>
                        {ROADMAP_AREA_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setRoadmapSearch('');
                          setRoadmapStatusFilter('all');
                          setRoadmapAreaFilter('all');
                        }}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {roadmapError && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {roadmapError}
                    </div>
                  )}
                  {!roadmapError && roadmapMessage && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {roadmapMessage}
                    </div>
                  )}

                  {roadmapLoading && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Cargando roadmap...
                    </div>
                  )}

                  {!roadmapLoading && filteredRoadmapUpdates.length === 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No hay items para los filtros actuales.
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    {filteredRoadmapUpdates.map((item) => {
                      const feedbackDraft = roadmapFeedbackDrafts[item.id] || '';
                      const feedbackSentiment = roadmapFeedbackSentiments[item.id] || 'neutral';
                      const savingUpdate = roadmapUpdatingId === item.id;
                      const savingFeedback = roadmapFeedbackSavingId === item.id;
                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-[260px] flex-1">
                              <h4 className="text-base font-semibold text-slate-900">{item.title}</h4>
                              {item.description && (
                                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                    ROADMAP_STATUS_BADGE_CLASS[item.status]
                                  }`}
                                >
                                  {getRoadmapStatusLabel(item.status)}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                                  {getRoadmapAreaLabel(item.area)}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                    ROADMAP_PRIORITY_BADGE_CLASS[item.priority]
                                  }`}
                                >
                                  Prioridad {getRoadmapPriorityLabel(item.priority)}
                                </span>
                              </div>
                              <p className="mt-2 text-[11px] text-slate-400">
                                Creado: {formatDateTime(item.created_at)} • Actualizado: {formatDateTime(item.updated_at)}
                              </p>
                              {(item.owner || item.eta_date) && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {item.owner ? `Responsable: ${item.owner}` : 'Responsable sin asignar'}
                                  {item.eta_date ? ` • ETA: ${formatShortDate(item.eta_date)}` : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                              <select
                                value={item.status}
                                onChange={(event) => {
                                  const status = event.target.value as RoadmapStatus;
                                  if (status === item.status) return;
                                  patchRoadmapUpdate(item.id, { status });
                                }}
                                disabled={savingUpdate}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                {ROADMAP_STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={item.area}
                                onChange={(event) => {
                                  const area = event.target.value as RoadmapArea;
                                  if (area === item.area) return;
                                  patchRoadmapUpdate(item.id, { area });
                                }}
                                disabled={savingUpdate}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                {ROADMAP_AREA_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={item.priority}
                                onChange={(event) => {
                                  const priority = event.target.value as RoadmapPriority;
                                  if (priority === item.priority) return;
                                  patchRoadmapUpdate(item.id, { priority });
                                }}
                                disabled={savingUpdate}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                {ROADMAP_PRIORITY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                              Feedback interno ({item.feedback?.length || 0})
                            </p>
                            <div className="mt-3 max-h-[180px] space-y-2 overflow-y-auto pr-1">
                              {(!item.feedback || item.feedback.length === 0) && (
                                <p className="text-xs text-slate-500">Aun no hay feedback.</p>
                              )}
                              {(item.feedback || []).map((feedback) => (
                                <div
                                  key={feedback.id}
                                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span
                                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                        ROADMAP_SENTIMENT_BADGE_CLASS[feedback.sentiment]
                                      }`}
                                    >
                                      {getRoadmapSentimentLabel(feedback.sentiment)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {feedback.created_by_label || 'Sistema'} • {formatDateTime(feedback.created_at)}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-700">{feedback.body}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                              <textarea
                                value={feedbackDraft}
                                onChange={(event) =>
                                  setRoadmapFeedbackDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                                }
                                rows={2}
                                placeholder="Agregar feedback..."
                                className="min-h-[70px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                              />
                              <div className="flex flex-col gap-2">
                                <select
                                  value={feedbackSentiment}
                                  onChange={(event) =>
                                    setRoadmapFeedbackSentiments((prev) => ({
                                      ...prev,
                                      [item.id]: event.target.value as RoadmapSentiment,
                                    }))
                                  }
                                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                                >
                                  {ROADMAP_SENTIMENT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => addRoadmapFeedback(item.id)}
                                  disabled={savingFeedback}
                                  className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                  {savingFeedback ? 'Guardando...' : 'Comentar'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
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
