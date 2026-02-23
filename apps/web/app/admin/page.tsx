'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
type RoadmapSector = 'interfaz' | 'operativo' | 'clientes' | 'web' | 'app' | 'funcionalidades';
type RoadmapSentiment = 'positive' | 'neutral' | 'negative';
type AdminTabKey =
  | 'resumen'
  | 'usuarios'
  | 'facturacion'
  | 'roadmap'
  | 'mensajes'
  | 'accesos'
  | 'actividad'
  | 'mano_obra'
  | 'flujo';
type FlowDiagramColumnId = 'captacion' | 'operacion' | 'control';
type FlowDiagramNodeShape = 'start' | 'process' | 'decision' | 'end';

type AppWebFlowNode = {
  id: string;
  column: FlowDiagramColumnId;
  shape: FlowDiagramNodeShape;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  description: string;
  flowLabel: string[];
  preview: string;
  highlights: string[];
  target:
    | {
        type: 'admin';
        tab: Exclude<AdminTabKey, 'flujo'>;
      }
    | {
        type: 'web';
        href: string;
      };
};

type FlowNodeSide = 'top' | 'right' | 'bottom' | 'left';

type AppWebFlowEdge = {
  id: string;
  from: string;
  to: string;
  fromSide?: FlowNodeSide;
  toSide?: FlowNodeSide;
  via?: Array<{ x: number; y: number }>;
  label?: 'si' | 'no' | string;
  labelX?: number;
  labelY?: number;
};

type FlowNodePosition = {
  id: string;
  x: number;
  y: number;
};

type FlowLayoutState = {
  nodes: FlowNodePosition[];
  note: string | null;
  updated_at: string;
  updated_by_label: string | null;
};

type FlowCurrentSource = 'remote' | 'local' | 'base';

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
  sector: RoadmapSector;
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

type RoadmapSlaAlertRule = 'blocked_stale' | 'high_overdue' | 'stale_in_progress' | 'overdue_unassigned';

type RoadmapSlaAlert = {
  id: string;
  roadmapId: string;
  rule: RoadmapSlaAlertRule;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  actionLabel: string;
  score: number;
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

type RegisteredZoneItem = {
  zone: string;
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
    registeredUsersByZone: RegisteredZoneItem[];
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
  intensity: number;
  heatColor: string;
};

const ARGENTINA_SILHOUETTE_PATH =
  'M128.00 419.39 L122.24 420.00 L119.15 415.67 L115.50 415.34 L109.00 415.33 L109.00 387.93 L111.33 393.62 L114.36 402.82 L122.24 410.18 L130.73 413.25 L128.00 419.39 Z M131.25 12.99 L134.81 21.85 L137.18 11.98 L144.10 12.49 L145.08 15.11 L156.22 35.13 L161.18 37.00 L168.59 46.06 L174.84 50.86 L175.71 56.27 L169.74 74.92 L175.85 78.26 L182.67 80.13 L187.46 78.16 L192.96 68.76 L193.95 57.93 L196.96 55.58 L200.00 62.67 L199.88 72.46 L194.77 79.23 L190.70 84.22 L183.85 96.13 L175.76 112.86 L174.25 122.68 L172.62 135.29 L172.68 147.51 L171.37 150.24 L170.90 158.17 L170.48 164.58 L178.18 175.09 L177.35 183.55 L181.14 188.89 L180.84 194.88 L175.01 210.62 L166.02 217.20 L153.85 219.75 L147.19 218.52 L148.47 225.83 L147.23 235.02 L148.34 241.20 L144.71 245.52 L138.49 247.21 L132.66 242.75 L130.32 245.96 L131.17 258.15 L135.26 261.84 L138.58 257.97 L140.39 264.35 L134.80 268.15 L129.93 275.78 L129.04 288.13 L127.61 294.69 L121.88 294.73 L117.13 301.01 L115.39 310.21 L121.35 319.20 L127.15 321.68 L125.06 332.69 L117.90 339.61 L113.96 353.99 L108.42 358.83 L105.94 364.58 L107.90 377.32 L111.93 384.42 L109.38 383.80 L103.76 381.88 L89.10 380.24 L86.59 373.08 L86.70 363.89 L82.67 364.68 L80.53 360.24 L80.00 347.23 L84.65 341.83 L86.58 334.05 L85.87 327.84 L89.09 317.37 L91.30 301.12 L90.65 293.92 L93.30 291.60 L92.65 286.97 L89.84 284.52 L91.83 279.37 L89.10 274.72 L87.68 260.56 L90.12 258.07 L89.10 243.11 L90.52 230.54 L92.14 219.60 L95.77 215.15 L93.93 203.17 L93.91 191.90 L98.50 183.89 L98.36 173.64 L101.82 161.66 L101.84 150.38 L100.26 148.13 L97.47 126.96 L101.20 114.34 L100.63 102.45 L102.80 91.30 L106.77 79.80 L111.05 72.17 L109.24 67.35 L110.50 63.40 L110.31 42.96 L116.91 36.91 L119.00 24.16 L118.26 21.09 L123.31 10.00 L131.25 12.99 Z';

const ARGENTINA_ZONE_ANCHORS: ArgentinaZoneAnchor[] = [
  { id: 'salta', label: 'Salta', x: 114, y: 108, aliases: ['salta'] },
  { id: 'jujuy', label: 'Jujuy', x: 108, y: 92, aliases: ['jujuy'] },
  { id: 'tucuman', label: 'Tucuman', x: 122, y: 126, aliases: ['tucuman'] },
  { id: 'chaco', label: 'Chaco', x: 152, y: 128, aliases: ['chaco', 'resistencia'] },
  { id: 'corrientes', label: 'Corrientes', x: 164, y: 142, aliases: ['corrientes'] },
  { id: 'misiones', label: 'Misiones', x: 176, y: 122, aliases: ['misiones', 'posadas'] },
  { id: 'santiago', label: 'Santiago del Estero', x: 132, y: 146, aliases: ['santiago del estero'] },
  { id: 'cordoba', label: 'Cordoba', x: 128, y: 188, aliases: ['cordoba', 'villa carlos paz', 'rio cuarto'] },
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
    aliases: [
      'buenos aires',
      'caba',
      'capital federal',
      'amba',
      'la plata',
      'sourdeaux',
      'san miguel',
      'tigre',
      'moron',
      'quilmes',
      'lanus',
      'avellaneda',
      'san isidro',
      'vicente lopez',
      'pilar',
      'escobar',
      'belen de escobar',
      'lomas de zamora',
      'almirante brown',
      'ituzaingo',
      'haedo',
      'castelar',
    ],
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

const getHeatColor = (intensity: number) => {
  const clamped = Math.max(0, Math.min(1, intensity));
  const hue = 212 - clamped * 190;
  const saturation = 88;
  const lightness = 58 - clamped * 14;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
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

const ROADMAP_SECTOR_OPTIONS: { value: RoadmapSector; label: string }[] = [
  { value: 'interfaz', label: 'Interfaz' },
  { value: 'operativo', label: 'Operativo' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'web', label: 'Web' },
  { value: 'app', label: 'App' },
  { value: 'funcionalidades', label: 'Funcionalidades' },
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
const getRoadmapSectorLabel = (sector: RoadmapSector) =>
  ROADMAP_SECTOR_OPTIONS.find((item) => item.value === sector)?.label || sector;
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

const toRoadmapSector = (value: unknown): RoadmapSector => {
  const normalized = String(value || '')
    .toLowerCase()
    .trim();
  if (normalized === 'interfaz') return 'interfaz';
  if (normalized === 'operativo') return 'operativo';
  if (normalized === 'clientes') return 'clientes';
  if (normalized === 'web') return 'web';
  if (normalized === 'app') return 'app';
  return 'funcionalidades';
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

const ROADMAP_PRIORITY_SCORE: Record<RoadmapPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const ROADMAP_STATUS_URGENCY: Record<RoadmapStatus, number> = {
  blocked: 3,
  in_progress: 2,
  planned: 1,
  done: 0,
};

const ROADMAP_SLA_BLOCKED_DAYS = 2;
const ROADMAP_SLA_IN_PROGRESS_DAYS = 7;
const ROADMAP_SLA_ALERT_LIMIT = 10;

const FLOW_DIAGRAM_WIDTH = 1160;
const FLOW_DIAGRAM_HEIGHT = 760;

const FLOW_DIAGRAM_COLUMNS: Array<{
  id: FlowDiagramColumnId;
  label: string;
  helper: string;
  x: number;
  width: number;
}> = [
  { id: 'captacion', label: 'Departamento de captacion web', helper: 'Visita, valor y decision', x: 24, width: 350 },
  { id: 'operacion', label: 'Departamento de operacion', helper: 'Trabajo diario y entrega', x: 404, width: 350 },
  { id: 'control', label: 'Departamento de control admin', helper: 'Metricas, soporte y mejora', x: 784, width: 350 },
];

const FLOW_COLUMN_CODE: Record<FlowDiagramColumnId, string> = {
  captacion: 'CAP',
  operacion: 'OPE',
  control: 'ADM',
};

const FLOW_SHAPE_LABEL: Record<FlowDiagramNodeShape, string> = {
  start: 'Inicio',
  process: 'Proceso',
  decision: 'Decision',
  end: 'Fin',
};

const FLOW_MIN_ZOOM = 0.7;
const FLOW_MAX_ZOOM = 2.2;
const FLOW_CLASSIC_Y_SCALE = 1.22;
const FLOW_CLASSIC_BASE_Y = 80;
const FLOW_CLASSIC_COLUMN_SHIFT: Record<FlowDiagramColumnId, number> = {
  captacion: 0,
  operacion: 250,
  control: 520,
};

const FLOW_DIAGRAM_KEY = 'app_web_operativo';
const FLOW_DIAGRAM_LOCAL_STORAGE_KEY = `urbanfix_flow_layout_${FLOW_DIAGRAM_KEY}`;

const sanitizeFlowPositions = (value: unknown): FlowNodePosition[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, FlowNodePosition>();
  value.forEach((entry: any) => {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const x = Number(entry?.x);
    const y = Number(entry?.y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) return;
    unique.set(id, {
      id,
      x: Math.round(Math.max(-5000, Math.min(5000, x))),
      y: Math.round(Math.max(-5000, Math.min(5000, y))),
    });
  });
  return Array.from(unique.values());
};

const getFlowNodePositions = (nodes: AppWebFlowNode[]): FlowNodePosition[] =>
  nodes.map((node) => ({ id: node.id, x: Math.round(node.x), y: Math.round(node.y) }));

const isMissingFlowDiagramTableError = (value: unknown) => {
  const message = String(value || '').toLowerCase();
  return (
    message.includes('flow_diagram_states') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
};

const readFlowLayoutFromLocalStorage = () => {
  if (typeof window === 'undefined') return null as null | FlowLayoutState;
  try {
    const raw = window.localStorage.getItem(FLOW_DIAGRAM_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const nodes = sanitizeFlowPositions(parsed?.nodes);
    if (!nodes.length) return null;
    return {
      nodes,
      note: typeof parsed?.note === 'string' ? parsed.note : null,
      updated_at: typeof parsed?.updated_at === 'string' ? parsed.updated_at : new Date().toISOString(),
      updated_by_label: typeof parsed?.updated_by_label === 'string' ? parsed.updated_by_label : 'Local',
    };
  } catch {
    return null;
  }
};

const writeFlowLayoutToLocalStorage = (payload: {
  nodes: FlowNodePosition[];
  note?: string | null;
  updated_by_label?: string | null;
  updated_at?: string | null;
}) => {
  if (typeof window === 'undefined') return null as null | FlowLayoutState;
  const safeNodes = sanitizeFlowPositions(payload.nodes);
  if (!safeNodes.length) return null;
  const record = {
    nodes: safeNodes,
    note: payload.note ? String(payload.note) : null,
    updated_at: payload.updated_at || new Date().toISOString(),
    updated_by_label: payload.updated_by_label || 'Local',
  };
  try {
    window.localStorage.setItem(FLOW_DIAGRAM_LOCAL_STORAGE_KEY, JSON.stringify(record));
  } catch {
    return null;
  }
  return record;
};

const getFlowLayoutTimestamp = (value: string | null | undefined) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickLatestFlowLayout = (remoteState: FlowLayoutState | null, localState: FlowLayoutState | null) => {
  if (remoteState && localState) {
    const remoteTs = getFlowLayoutTimestamp(remoteState.updated_at);
    const localTs = getFlowLayoutTimestamp(localState.updated_at);
    if (localTs > remoteTs) {
      return { state: localState, source: 'local' as const };
    }
    return { state: remoteState, source: 'remote' as const };
  }

  if (remoteState) {
    return { state: remoteState, source: 'remote' as const };
  }

  if (localState) {
    return { state: localState, source: 'local' as const };
  }

  return { state: null, source: 'base' as const };
};

const mergeFlowNodesWithPositions = (positions: FlowNodePosition[]) => {
  const map = new Map(positions.map((position) => [position.id, position]));
  return APP_WEB_FLOW_NODES.map((node) => {
    const position = map.get(node.id);
    if (!position) return { ...node };
    return {
      ...node,
      x: position.x,
      y: position.y,
    };
  });
};

const APP_WEB_FLOW_NODES: AppWebFlowNode[] = [
  {
    id: 'web_inicio',
    column: 'captacion',
    shape: 'start',
    x: 104,
    y: 96,
    width: 190,
    height: 44,
    title: 'Inicio',
    subtitle: 'Primer contacto',
    description: 'Ingreso del usuario desde búsqueda, anuncio, recomendación o link directo.',
    flowLabel: ['Inicio'],
    preview: '/illustrations/window-tecnicos.svg',
    highlights: ['Entrada pública', 'Carga rápida', 'Primer impacto'],
    target: { type: 'web', href: '/tecnicos' },
  },
  {
    id: 'web_landing',
    column: 'captacion',
    shape: 'process',
    x: 83,
    y: 172,
    width: 232,
    height: 74,
    title: 'Landing por perfil',
    subtitle: 'Técnicos, empresas y clientes',
    description: 'Presenta propuesta y CTA según perfil, sin romper la experiencia en una sola página.',
    flowLabel: ['Landing tecnicos', 'empresas y clientes'],
    preview: '/illustrations/window-negocio.svg',
    highlights: ['Segmentación', 'Propuesta de valor', 'Navegación integrada'],
    target: { type: 'web', href: '/tecnicos' },
  },
  {
    id: 'web_valor',
    column: 'captacion',
    shape: 'decision',
    x: 110,
    y: 282,
    width: 178,
    height: 98,
    title: 'Decision de valor',
    subtitle: 'Filtro de intención',
    description: 'Evalúa si la propuesta es suficiente para avanzar a selección de perfil.',
    flowLabel: ['Encuentra', 'valor?'],
    preview: '/illustrations/window-institucional.svg',
    highlights: ['Mensaje claro', 'Objeción detectada', 'Siguiente acción'],
    target: { type: 'web', href: '/tecnicos' },
  },
  {
    id: 'web_guias',
    column: 'captacion',
    shape: 'process',
    x: 42,
    y: 408,
    width: 220,
    height: 70,
    title: 'Guias y rubros',
    subtitle: 'Refuerzo comercial',
    description: 'Canal secundario para resolver dudas y reforzar confianza antes del acceso.',
    flowLabel: ['Ver guias y', 'rubros'],
    preview: '/illustrations/window-guias.svg',
    highlights: ['FAQ comercial', 'Referencias de precios', 'Retorno al flujo'],
    target: { type: 'web', href: '/guias-precios' },
  },
  {
    id: 'web_perfil',
    column: 'captacion',
    shape: 'decision',
    x: 110,
    y: 520,
    width: 178,
    height: 98,
    title: 'Seleccion de perfil',
    subtitle: 'Segmentación operativa',
    description: 'Define el carril de ingreso correcto para técnico, empresa o cliente.',
    flowLabel: ['Perfil', 'T/E/C?'],
    preview: '/illustrations/window-negocio.svg',
    highlights: ['Técnico', 'Empresa', 'Cliente'],
    target: { type: 'web', href: '/tecnicos' },
  },
  {
    id: 'web_acceso_tecnico',
    column: 'captacion',
    shape: 'process',
    x: 30,
    y: 648,
    width: 220,
    height: 72,
    title: 'Acceso tecnico',
    subtitle: 'Producción diaria',
    description: 'Ingreso técnico para cotizar, enviar propuestas y gestionar estados de obra.',
    flowLabel: ['Acceso', 'tecnico'],
    preview: '/illustrations/window-tecnicos.svg',
    highlights: ['Cotización', 'Agenda', 'Estados'],
    target: { type: 'web', href: '/tecnicos?mode=login&perfil=tecnico' },
  },
  {
    id: 'web_acceso_empresa',
    column: 'captacion',
    shape: 'process',
    x: 268,
    y: 648,
    width: 220,
    height: 72,
    title: 'Acceso empresa',
    subtitle: 'Gestión de negocio',
    description: 'Ingreso empresa para administrar responsables, pipeline comercial y operación.',
    flowLabel: ['Acceso', 'empresa'],
    preview: '/illustrations/window-negocio.svg',
    highlights: ['Responsables', 'Pipeline', 'Rentabilidad'],
    target: { type: 'web', href: '/tecnicos?mode=login&perfil=empresa' },
  },
  {
    id: 'web_acceso_cliente',
    column: 'captacion',
    shape: 'process',
    x: 506,
    y: 648,
    width: 220,
    height: 72,
    title: 'Acceso cliente',
    subtitle: 'Solicitud y aprobación',
    description: 'Ingreso cliente para pedir reparación, revisar cotización y aprobar/rechazar.',
    flowLabel: ['Acceso', 'cliente'],
    preview: '/illustrations/window-institucional.svg',
    highlights: ['Solicitud', 'Cotización', 'Aprobación'],
    target: { type: 'web', href: '/urbanfix?view=personas' },
  },
  {
    id: 'op_login_tec',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 148,
    width: 220,
    height: 70,
    title: 'Login tecnico',
    subtitle: 'Autenticación técnica',
    description: 'Valida identidad y habilita herramientas de trabajo para el técnico.',
    flowLabel: ['Login', 'tecnico'],
    preview: '/illustrations/PANEL DE CONTROL.jpeg',
    highlights: ['Autenticación', 'Panel operativo', 'Inicio inmediato'],
    target: { type: 'web', href: '/tecnicos?mode=login&perfil=tecnico' },
  },
  {
    id: 'op_login_emp',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 240,
    width: 220,
    height: 70,
    title: 'Login empresa',
    subtitle: 'Autenticación empresa',
    description: 'Ingreso del perfil empresa para coordinar equipo, ventas y ejecución.',
    flowLabel: ['Login', 'empresa'],
    preview: '/illustrations/window-negocio.svg',
    highlights: ['Equipo', 'Comercial', 'Operación'],
    target: { type: 'web', href: '/tecnicos?mode=login&perfil=empresa' },
  },
  {
    id: 'op_login_cli',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 332,
    width: 220,
    height: 70,
    title: 'Ingreso cliente',
    subtitle: 'Portal cliente',
    description: 'Entrada del cliente para generar pedido, revisar propuesta y dar respuesta.',
    flowLabel: ['Ingreso', 'cliente'],
    preview: '/illustrations/window-institucional.svg',
    highlights: ['Pedido', 'Revisión', 'Decisión'],
    target: { type: 'web', href: '/urbanfix?view=personas' },
  },
  {
    id: 'op_hub',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 424,
    width: 260,
    height: 74,
    title: 'Hub operativo compartido',
    subtitle: 'Convergencia T/E/C',
    description: 'Técnicos, empresas y clientes convergen en un único motor de presupuesto y estados.',
    flowLabel: ['Hub operativo', 'compartido'],
    preview: '/illustrations/dashboard.svg',
    highlights: ['Motor único', 'Estados comunes', 'Escala'],
    target: { type: 'admin', tab: 'resumen' },
  },
  {
    id: 'op_crear',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 520,
    width: 220,
    height: 70,
    title: 'Crear presupuesto',
    subtitle: 'Carga estructurada',
    description: 'Carga cliente, dirección, mano de obra, materiales y reglas comerciales en un solo flujo.',
    flowLabel: ['Armar', 'presupuesto'],
    preview: '/illustrations/PRESUPUESTADOR.jpeg',
    highlights: ['Formulario integral', 'Items m2/ml', 'Total en vivo'],
    target: { type: 'web', href: '/nueva' },
  },
  {
    id: 'op_compartir',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 616,
    width: 220,
    height: 70,
    title: 'Compartir propuesta',
    subtitle: 'Enlace al cliente',
    description: 'Envía presupuesto por link/WhatsApp para revisión y respuesta del cliente.',
    flowLabel: ['Compartir link', 'de presupuesto'],
    preview: '/illustrations/LINK DEL PRESUPUESTO.jpeg',
    highlights: ['Envío directo', 'Formato claro', 'Trazabilidad'],
    target: { type: 'web', href: '/pagina' },
  },
  {
    id: 'op_confirma',
    column: 'operacion',
    shape: 'decision',
    x: 430,
    y: 722,
    width: 156,
    height: 96,
    title: 'Decision cliente',
    subtitle: 'Decisión final',
    description: 'Valida si el cliente aprueba para ejecutar o rechaza para recotizar.',
    flowLabel: ['Cliente', 'confirma?'],
    preview: '/illustrations/PRESUPUESTO PDF.jpeg',
    highlights: ['Revisión cliente', 'Sí/No', 'Rama automática'],
    target: { type: 'web', href: '/pagina' },
  },
  {
    id: 'op_ajustar',
    column: 'operacion',
    shape: 'process',
    x: 598,
    y: 722,
    width: 156,
    height: 72,
    title: 'Ajustar propuesta',
    subtitle: 'Iteración controlada',
    description: 'Si no confirma, vuelve al armado con contexto de objeciones y nueva versión.',
    flowLabel: ['Ajustar y', 're-cotizar'],
    preview: '/illustrations/window-guias.svg',
    highlights: ['Feedback', 'Revisión rápida', 'Loop controlado'],
    target: { type: 'web', href: '/guias-precios' },
  },
  {
    id: 'op_seguir',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 844,
    width: 220,
    height: 70,
    title: 'Seguimiento y agenda',
    subtitle: 'Ejecución y agenda',
    description: 'Con aprobación, avanza ejecución, agenda de tareas y trazabilidad de estados.',
    flowLabel: ['Seguimiento', 'de obra'],
    preview: '/illustrations/AGENDA.jpeg',
    highlights: ['Agenda', 'Estados', 'Notificaciones'],
    target: { type: 'web', href: '/tecnicos' },
  },
  {
    id: 'op_control',
    column: 'operacion',
    shape: 'process',
    x: 469,
    y: 940,
    width: 220,
    height: 62,
    title: 'Sincronizar con admin',
    subtitle: 'Control del negocio',
    description: 'La operación alimenta métricas y reportes para gestión ejecutiva y mejora continua.',
    flowLabel: ['Sincronizar con', 'panel admin'],
    preview: '/illustrations/dashboard.svg',
    highlights: ['Métricas', 'Ingresos', 'Visibilidad'],
    target: { type: 'admin', tab: 'facturacion' },
  },
  {
    id: 'admin_resumen',
    column: 'control',
    shape: 'process',
    x: 849,
    y: 154,
    width: 220,
    height: 70,
    title: 'Resumen ejecutivo',
    subtitle: 'Monitoreo gerencial',
    description: 'KPIs centrales para lectura rápida de salud operativa y comercial.',
    flowLabel: ['Resumen', 'ejecutivo'],
    preview: '/illustrations/dashboard.svg',
    highlights: ['KPIs', 'Usuarios', 'Salud general'],
    target: { type: 'admin', tab: 'resumen' },
  },
  {
    id: 'admin_fact',
    column: 'control',
    shape: 'process',
    x: 849,
    y: 248,
    width: 220,
    height: 70,
    title: 'Facturacion',
    subtitle: 'Ingresos por zona',
    description: 'Control de ingresos, pagos, zonas activas y tendencia de facturación.',
    flowLabel: ['Facturacion', 'y zonas'],
    preview: '/illustrations/quotes.svg',
    highlights: ['Ingresos', 'Zonas', 'Exportables'],
    target: { type: 'admin', tab: 'facturacion' },
  },
  {
    id: 'admin_roadmap',
    column: 'control',
    shape: 'process',
    x: 849,
    y: 342,
    width: 220,
    height: 70,
    title: 'Roadmap',
    subtitle: 'Plan y feedback',
    description: 'Prioriza mejoras, asigna responsables y coordina ejecución entre equipos y PCs.',
    flowLabel: ['Roadmap', 'operativo'],
    preview: '/illustrations/viewer.svg',
    highlights: ['Prioridades', 'Estado', 'Feedback'],
    target: { type: 'admin', tab: 'roadmap' },
  },
  {
    id: 'admin_msg',
    column: 'control',
    shape: 'process',
    x: 849,
    y: 436,
    width: 220,
    height: 70,
    title: 'Mensajes',
    subtitle: 'Soporte operativo',
    description: 'Gestión de conversaciones para soporte, seguimiento y cierre de dudas.',
    flowLabel: ['Mensajes y', 'soporte'],
    preview: '/illustrations/notifications.svg',
    highlights: ['Inbox', 'Respuesta', 'Seguimiento'],
    target: { type: 'admin', tab: 'mensajes' },
  },
  {
    id: 'admin_act',
    column: 'control',
    shape: 'process',
    x: 849,
    y: 530,
    width: 220,
    height: 70,
    title: 'Actividad',
    subtitle: 'Analítica de uso',
    description: 'Analiza embudo, rutas y comportamiento real para decisiones de producto.',
    flowLabel: ['Actividad', 'y embudo'],
    preview: '/illustrations/dashboard.svg',
    highlights: ['Embudo', 'Rutas', 'Usuarios online'],
    target: { type: 'admin', tab: 'actividad' },
  },
  {
    id: 'admin_fin',
    column: 'control',
    shape: 'end',
    x: 873,
    y: 652,
    width: 172,
    height: 48,
    title: 'Mejora continua',
    subtitle: 'Cierre y relanzamiento',
    description: 'El control cierra ciclo, documenta aprendizaje y relanza nuevas iteraciones.',
    flowLabel: ['Fin / mejora'],
    preview: '/illustrations/window-institucional.svg',
    highlights: ['Decisión', 'Iteración', 'Escala'],
    target: { type: 'admin', tab: 'roadmap' },
  },
];

const APP_WEB_FLOW_EDGES: AppWebFlowEdge[] = [
  { id: 'e1', from: 'web_inicio', to: 'web_landing' },
  { id: 'e2', from: 'web_landing', to: 'web_valor' },
  {
    id: 'e3',
    from: 'web_valor',
    to: 'web_guias',
    fromSide: 'left',
    toSide: 'top',
    via: [{ x: 34, y: 331 }, { x: 34, y: 384 }, { x: 152, y: 384 }],
    label: 'no',
    labelX: 66,
    labelY: 346,
  },
  {
    id: 'e4',
    from: 'web_guias',
    to: 'web_landing',
    fromSide: 'top',
    toSide: 'left',
    via: [{ x: 152, y: 384 }, { x: 72, y: 384 }, { x: 72, y: 209 }],
  },
  { id: 'e5', from: 'web_valor', to: 'web_perfil', label: 'si', labelX: 228, labelY: 498 },
  { id: 'e6', from: 'web_perfil', to: 'web_acceso_tecnico', label: 'tecnico' },
  { id: 'e7', from: 'web_perfil', to: 'web_acceso_empresa', label: 'empresa' },
  { id: 'e8', from: 'web_perfil', to: 'web_acceso_cliente', label: 'cliente' },
  { id: 'e9', from: 'web_acceso_tecnico', to: 'op_login_tec', fromSide: 'right', toSide: 'left' },
  { id: 'e10', from: 'web_acceso_empresa', to: 'op_login_emp', fromSide: 'right', toSide: 'left' },
  { id: 'e11', from: 'web_acceso_cliente', to: 'op_login_cli', fromSide: 'right', toSide: 'left' },
  { id: 'e12', from: 'op_login_tec', to: 'op_hub' },
  { id: 'e13', from: 'op_login_emp', to: 'op_hub' },
  { id: 'e14', from: 'op_login_cli', to: 'op_hub' },
  { id: 'e15', from: 'op_hub', to: 'op_crear' },
  { id: 'e16', from: 'op_crear', to: 'op_compartir' },
  {
    id: 'e17',
    from: 'op_compartir',
    to: 'op_confirma',
    via: [{ x: 579, y: 430 }, { x: 508, y: 430 }],
  },
  { id: 'e18', from: 'op_confirma', to: 'op_ajustar', fromSide: 'right', toSide: 'left', label: 'no' },
  {
    id: 'e19',
    from: 'op_ajustar',
    to: 'op_crear',
    fromSide: 'right',
    toSide: 'right',
    via: [{ x: 770, y: 482 }, { x: 770, y: 279 }],
  },
  {
    id: 'e20',
    from: 'op_confirma',
    to: 'op_seguir',
    via: [{ x: 508, y: 548 }, { x: 579, y: 548 }],
    label: 'si',
    labelX: 546,
    labelY: 548,
  },
  { id: 'e21', from: 'op_seguir', to: 'op_control' },
  {
    id: 'e22',
    from: 'op_control',
    to: 'admin_resumen',
    fromSide: 'right',
    toSide: 'left',
    via: [{ x: 770, y: 695 }, { x: 770, y: 189 }],
  },
  { id: 'e23', from: 'admin_resumen', to: 'admin_fact' },
  { id: 'e24', from: 'admin_fact', to: 'admin_roadmap' },
  { id: 'e25', from: 'admin_roadmap', to: 'admin_msg' },
  { id: 'e26', from: 'admin_msg', to: 'admin_act' },
  { id: 'e27', from: 'admin_act', to: 'admin_fin' },
  {
    id: 'e28',
    from: 'admin_fin',
    to: 'web_landing',
    fromSide: 'left',
    toSide: 'top',
    via: [{ x: 760, y: 676 }, { x: 760, y: 724 }, { x: 199, y: 724 }, { x: 199, y: 172 }],
  },
];

type FlowEdgePoint = { x: number; y: number };

type FlowEdgeNodeRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const FLOW_NODE_SIDES: FlowNodeSide[] = ['top', 'right', 'bottom', 'left'];
const FLOW_EDGE_BREAKOUT = 26;
const FLOW_EDGE_NODE_PADDING = 10;
const FLOW_EDGE_OBSTACLE_PADDING = 14;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isHorizontalFlowNodeSide = (side: FlowNodeSide) => side === 'left' || side === 'right';

const getFlowNodeCenter = (node: FlowEdgeNodeRect): FlowEdgePoint => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
});

const getFlowSideVector = (side: FlowNodeSide): FlowEdgePoint => {
  if (side === 'top') return { x: 0, y: -1 };
  if (side === 'right') return { x: 1, y: 0 };
  if (side === 'left') return { x: -1, y: 0 };
  return { x: 0, y: 1 };
};

const offsetFlowPoint = (point: FlowEdgePoint, side: FlowNodeSide, distance: number): FlowEdgePoint => {
  const vector = getFlowSideVector(side);
  return {
    x: point.x + vector.x * distance,
    y: point.y + vector.y * distance,
  };
};

const getFlowNodeAnchor = (
  node: FlowEdgeNodeRect,
  side: FlowNodeSide,
  toward: FlowEdgePoint
): FlowEdgePoint => {
  const horizontalInset = Math.min(FLOW_EDGE_NODE_PADDING, Math.max(4, node.width * 0.3));
  const verticalInset = Math.min(FLOW_EDGE_NODE_PADDING, Math.max(4, node.height * 0.3));
  if (side === 'top') {
    return {
      x: clamp(toward.x, node.x + horizontalInset, node.x + node.width - horizontalInset),
      y: node.y,
    };
  }
  if (side === 'bottom') {
    return {
      x: clamp(toward.x, node.x + horizontalInset, node.x + node.width - horizontalInset),
      y: node.y + node.height,
    };
  }
  if (side === 'left') {
    return {
      x: node.x,
      y: clamp(toward.y, node.y + verticalInset, node.y + node.height - verticalInset),
    };
  }
  return {
    x: node.x + node.width,
    y: clamp(toward.y, node.y + verticalInset, node.y + node.height - verticalInset),
  };
};

const normalizeFlowPathPoints = (points: FlowEdgePoint[]) => {
  const deduped = points.reduce<FlowEdgePoint[]>((acc, point) => {
    const prev = acc[acc.length - 1];
    if (!prev || Math.abs(prev.x - point.x) > 0.01 || Math.abs(prev.y - point.y) > 0.01) {
      acc.push(point);
    }
    return acc;
  }, []);

  return deduped.reduce<FlowEdgePoint[]>((acc, point) => {
    if (acc.length < 2) {
      acc.push(point);
      return acc;
    }
    const first = acc[acc.length - 2];
    const second = acc[acc.length - 1];
    const sameX = Math.abs(first.x - second.x) < 0.01 && Math.abs(second.x - point.x) < 0.01;
    const sameY = Math.abs(first.y - second.y) < 0.01 && Math.abs(second.y - point.y) < 0.01;
    if (sameX || sameY) {
      acc[acc.length - 1] = point;
    } else {
      acc.push(point);
    }
    return acc;
  }, []);
};

const buildFlowSvgPath = (points: FlowEdgePoint[]) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(point.x)} ${Math.round(point.y)}`).join(' ');

const getFlowEdgeLength = (points: FlowEdgePoint[]) => {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
};

const getFlowEdgeTurns = (points: FlowEdgePoint[]) => {
  let turns = 0;
  for (let index = 2; index < points.length; index += 1) {
    const first = points[index - 2];
    const second = points[index - 1];
    const third = points[index];
    const firstHorizontal = Math.abs(second.y - first.y) < 0.01;
    const secondHorizontal = Math.abs(third.y - second.y) < 0.01;
    if (firstHorizontal !== secondHorizontal) turns += 1;
  }
  return turns;
};

const segmentIntersectsRect = (
  start: FlowEdgePoint,
  end: FlowEdgePoint,
  rect: FlowEdgeNodeRect,
  padding: number
) => {
  const minX = rect.x - padding;
  const maxX = rect.x + rect.width + padding;
  const minY = rect.y - padding;
  const maxY = rect.y + rect.height + padding;

  if (Math.abs(start.x - end.x) < 0.01) {
    const x = start.x;
    if (x < minX || x > maxX) return false;
    const y1 = Math.min(start.y, end.y);
    const y2 = Math.max(start.y, end.y);
    return y2 >= minY && y1 <= maxY;
  }

  if (Math.abs(start.y - end.y) < 0.01) {
    const y = start.y;
    if (y < minY || y > maxY) return false;
    const x1 = Math.min(start.x, end.x);
    const x2 = Math.max(start.x, end.x);
    return x2 >= minX && x1 <= maxX;
  }

  return false;
};

const getFlowObstacleHits = (points: FlowEdgePoint[], nodes: FlowEdgeNodeRect[], skip: Set<string>) => {
  let hits = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    nodes.forEach((node) => {
      if (skip.has(node.id)) return;
      if (segmentIntersectsRect(start, end, node, FLOW_EDGE_OBSTACLE_PADDING)) hits += 1;
    });
  }
  return hits;
};

const getFlowEdgeLabelPoint = (points: FlowEdgePoint[]) => {
  if (points.length <= 1) return points[0] || { x: 0, y: 0 };
  const total = getFlowEdgeLength(points);
  const target = total * 0.5;
  let acc = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segment = Math.hypot(end.x - start.x, end.y - start.y);
    if (acc + segment >= target) {
      const ratio = segment <= 0.01 ? 0 : (target - acc) / segment;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    acc += segment;
  }
  return points[points.length - 1];
};

const buildFlowRouteCandidates = (
  start: FlowEdgePoint,
  end: FlowEdgePoint,
  fromSide: FlowNodeSide,
  toSide: FlowNodeSide
) => {
  const startLead = offsetFlowPoint(start, fromSide, FLOW_EDGE_BREAKOUT);
  const endLead = offsetFlowPoint(end, toSide, FLOW_EDGE_BREAKOUT);
  const candidates: FlowEdgePoint[][] = [];

  if (Math.abs(startLead.x - endLead.x) < 2 || Math.abs(startLead.y - endLead.y) < 2) {
    candidates.push([start, startLead, endLead, end]);
  } else {
    candidates.push([start, startLead, { x: endLead.x, y: startLead.y }, endLead, end]);
    candidates.push([start, startLead, { x: startLead.x, y: endLead.y }, endLead, end]);

    if (isHorizontalFlowNodeSide(fromSide) && isHorizontalFlowNodeSide(toSide)) {
      const midX = Math.round((startLead.x + endLead.x) / 2);
      candidates.push([start, startLead, { x: midX, y: startLead.y }, { x: midX, y: endLead.y }, endLead, end]);
    } else if (!isHorizontalFlowNodeSide(fromSide) && !isHorizontalFlowNodeSide(toSide)) {
      const midY = Math.round((startLead.y + endLead.y) / 2);
      candidates.push([start, startLead, { x: startLead.x, y: midY }, { x: endLead.x, y: midY }, endLead, end]);
    }
  }

  return candidates.map((candidate) => normalizeFlowPathPoints(candidate));
};

const getFlowSideCandidates = (preferred?: FlowNodeSide): FlowNodeSide[] => {
  if (!preferred) return FLOW_NODE_SIDES;
  return [preferred, ...FLOW_NODE_SIDES.filter((side) => side !== preferred)];
};

const getFlowDirectionPenalty = (
  fromCenter: FlowEdgePoint,
  toCenter: FlowEdgePoint,
  fromSide: FlowNodeSide,
  toSide: FlowNodeSide
) => {
  const fromVector = getFlowSideVector(fromSide);
  const toVector = getFlowSideVector(toSide);
  const fromDot = fromVector.x * (toCenter.x - fromCenter.x) + fromVector.y * (toCenter.y - fromCenter.y);
  const toDot = toVector.x * (fromCenter.x - toCenter.x) + toVector.y * (fromCenter.y - toCenter.y);
  let penalty = 0;
  if (fromDot < 0) penalty += 48;
  if (toDot < 0) penalty += 48;
  return penalty;
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

const getIsoDateFromOffset = (offsetDays: number) => {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + offsetDays);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRoadmapOwnerLabel = (value?: string | null) => {
  const label = String(value || '').trim();
  return label || 'Sin responsable';
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

type BillingRange = '7d' | '30d' | '90d' | 'ytd';
type BillingExportType = 'subscriptions' | 'payments' | 'zones';

const BILLING_RANGE_OPTIONS: { value: BillingRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'ytd', label: 'YTD' },
];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [activeTab, setActiveTab] = useState<AdminTabKey>('resumen');
  const [supportUsers, setSupportUsers] = useState<{ userId: string; label: string; lastMessage?: any }[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [supportDraft, setSupportDraft] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [billingRange, setBillingRange] = useState<BillingRange>('30d');
  const [billingExportType, setBillingExportType] = useState<BillingExportType>('subscriptions');
  const [activityRange, setActivityRange] = useState<7 | 30 | 90>(30);
  const [activityStart, setActivityStart] = useState('');
  const [activityEnd, setActivityEnd] = useState('');
  const [activityPath, setActivityPath] = useState('');
  const [activityUserId, setActivityUserId] = useState('');
  const [activityData, setActivityData] = useState<{
    series: { date: string; views: number; minutes: number }[];
    totals: { views: number; minutes: number; uniqueSessions: number; uniqueUsers: number };
    prevTotals: { views: number; minutes: number; uniqueSessions: number; uniqueUsers: number };
    funnel?: {
      totalEvents: number;
      prevTotalEvents: number;
      steps: { key: string; label: string; count: number; prevCount: number; sessions: number }[];
      topEvents: { event_name: string; count: number; sessions: number; prevCount: number }[];
    };
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
  const [roadmapSectorFilter, setRoadmapSectorFilter] = useState<'all' | RoadmapSector>('all');
  const [roadmapPendingOnly, setRoadmapPendingOnly] = useState(false);
  const [roadmapSortMode, setRoadmapSortMode] = useState<'recent' | 'work_priority' | 'eta'>('recent');
  const [roadmapSubmitting, setRoadmapSubmitting] = useState(false);
  const [roadmapUpdatingId, setRoadmapUpdatingId] = useState<string | null>(null);
  const [roadmapBulkUpdating, setRoadmapBulkUpdating] = useState(false);
  const [roadmapSlaBatchApplying, setRoadmapSlaBatchApplying] = useState(false);
  const [selectedRoadmapIds, setSelectedRoadmapIds] = useState<string[]>([]);
  const [roadmapFeedbackSavingId, setRoadmapFeedbackSavingId] = useState<string | null>(null);
  const [roadmapFeedbackDrafts, setRoadmapFeedbackDrafts] = useState<Record<string, string>>({});
  const [roadmapFeedbackSentiments, setRoadmapFeedbackSentiments] = useState<Record<string, RoadmapSentiment>>({});
  const [roadmapForm, setRoadmapForm] = useState<{
    title: string;
    description: string;
    status: RoadmapStatus;
    area: RoadmapArea;
    priority: RoadmapPriority;
    sector: RoadmapSector;
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
    sector: 'funcionalidades',
    owner: '',
    eta_date: '',
    initial_feedback: '',
    initial_feedback_sentiment: 'neutral',
  });
  const [flowNodes, setFlowNodes] = useState<AppWebFlowNode[]>(() => APP_WEB_FLOW_NODES.map((node) => ({ ...node })));
  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState(APP_WEB_FLOW_NODES[0]?.id || '');
  const [flowZoom, setFlowZoom] = useState(1);
  const [flowPan, setFlowPan] = useState({ x: 0, y: 0 });
  const [flowDragStart, setFlowDragStart] = useState<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [flowNodeDragStart, setFlowNodeDragStart] = useState<{
    nodeId: string;
    clientX: number;
    clientY: number;
    nodeX: number;
    nodeY: number;
  } | null>(null);
  const [flowLayoutDirty, setFlowLayoutDirty] = useState(false);
  const [flowRevisionLoading, setFlowRevisionLoading] = useState(false);
  const [flowRevisionSaving, setFlowRevisionSaving] = useState(false);
  const [flowRevisionError, setFlowRevisionError] = useState('');
  const [flowRevisionMessage, setFlowRevisionMessage] = useState('');
  const [flowRevisionNote, setFlowRevisionNote] = useState('');
  const [flowLastSavedAt, setFlowLastSavedAt] = useState<string | null>(null);
  const [flowLastSavedBy, setFlowLastSavedBy] = useState<string | null>(null);
  const [flowCurrentSource, setFlowCurrentSource] = useState<FlowCurrentSource>('base');
  const [isFlowFullscreen, setIsFlowFullscreen] = useState(false);
  const [flowProcessDialogNodeId, setFlowProcessDialogNodeId] = useState<string | null>(null);
  const flowCanvasRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!flowDragStart) return;
    const handleMove = (event: MouseEvent) => {
      const dx = event.clientX - flowDragStart.clientX;
      const dy = event.clientY - flowDragStart.clientY;
      setFlowPan({
        x: flowDragStart.panX + dx,
        y: flowDragStart.panY + dy,
      });
    };
    const handleUp = () => setFlowDragStart(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [flowDragStart]);

  useEffect(() => {
    if (!flowNodeDragStart) return;
    const handleMove = (event: MouseEvent) => {
      const dx = (event.clientX - flowNodeDragStart.clientX) / flowZoom;
      const dy = (event.clientY - flowNodeDragStart.clientY) / flowZoom;
      const nextX = Math.round(flowNodeDragStart.nodeX + dx);
      const nextY = Math.round(flowNodeDragStart.nodeY + dy);
      setFlowNodes((prev) =>
        prev.map((node) =>
          node.id === flowNodeDragStart.nodeId
            ? {
                ...node,
                x: nextX,
                y: nextY,
              }
            : node
        )
      );
      setFlowLayoutDirty(true);
    };
    const handleUp = () => setFlowNodeDragStart(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [flowNodeDragStart, flowZoom]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      setIsFlowFullscreen(Boolean(fullscreenElement && fullscreenElement === flowCanvasRef.current));
      if (!fullscreenElement && flowDragStart) {
        setFlowDragStart(null);
      }
      if (!fullscreenElement && flowNodeDragStart) {
        setFlowNodeDragStart(null);
      }
      if (!fullscreenElement) {
        setFlowProcessDialogNodeId(null);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [flowDragStart, flowNodeDragStart]);

  useEffect(() => {
    if (!isFlowFullscreen) return;
    setFlowProcessDialogNodeId((prev) => prev || selectedFlowNodeId);
  }, [isFlowFullscreen, selectedFlowNodeId]);

  const loadFlowLayout = useCallback(async (token?: string, options?: { silent?: boolean }) => {
    if (!token) return;
    if (!options?.silent) {
      setFlowRevisionError('');
      setFlowRevisionMessage('');
    } else {
      setFlowRevisionError('');
    }
    setFlowRevisionLoading(true);
    try {
      const params = new URLSearchParams({ diagram_key: FLOW_DIAGRAM_KEY });
      const response = await fetch(`/api/admin/flow-diagram?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo cargar la última revisión del flujo.');
      }

      const remoteStateRaw = data?.state || null;
      const remoteNodes = sanitizeFlowPositions(remoteStateRaw?.nodes);
      const remoteState: FlowLayoutState | null = remoteNodes.length
        ? {
            nodes: remoteNodes,
            note: typeof remoteStateRaw?.note === 'string' ? remoteStateRaw.note : null,
            updated_at:
              typeof remoteStateRaw?.updated_at === 'string'
                ? remoteStateRaw.updated_at
                : new Date().toISOString(),
            updated_by_label:
              typeof remoteStateRaw?.updated_by_label === 'string' ? remoteStateRaw.updated_by_label : null,
          }
        : null;

      const localState = readFlowLayoutFromLocalStorage();
      const latest = pickLatestFlowLayout(remoteState, localState);

      if (latest.state?.nodes?.length) {
        setFlowNodes(mergeFlowNodesWithPositions(latest.state.nodes));
        setFlowLayoutDirty(false);
        setFlowLastSavedAt(latest.state.updated_at || null);
        setFlowLastSavedBy(latest.state.updated_by_label || (latest.source === 'local' ? 'Local' : null));
        setFlowCurrentSource(latest.source);
        if (!options?.silent) {
          if (latest.source === 'local' && remoteState) {
            setFlowRevisionMessage('Se cargó la revisión local más reciente (current).');
          } else if (latest.source === 'local') {
            setFlowRevisionMessage('Se cargó una revisión local.');
          } else {
            setFlowRevisionMessage('Se cargó la última revisión guardada.');
          }
        }
      } else {
        setFlowNodes(APP_WEB_FLOW_NODES.map((node) => ({ ...node })));
        setFlowLayoutDirty(false);
        setFlowLastSavedAt(null);
        setFlowLastSavedBy(null);
        setFlowCurrentSource('base');
        if (!options?.silent) {
          setFlowRevisionMessage('No hay revisión guardada todavía.');
        }
      }
    } catch (error: any) {
      const message = error?.message || 'No se pudo cargar la revisión del flujo.';
      if (isMissingFlowDiagramTableError(message)) {
        const localState = readFlowLayoutFromLocalStorage();
        if (localState?.nodes?.length) {
          setFlowNodes(mergeFlowNodesWithPositions(localState.nodes));
          setFlowLayoutDirty(false);
          setFlowLastSavedAt(localState.updated_at || null);
          setFlowLastSavedBy(localState.updated_by_label || 'Local');
          setFlowCurrentSource('local');
          if (!options?.silent) {
            setFlowRevisionMessage(
              'Se cargó revisión local. Falta aplicar migración de base para sincronizar con Supabase.'
            );
          }
        } else {
          setFlowCurrentSource('base');
          if (!options?.silent) {
            setFlowRevisionError('Falta migración de base para guardar/cargar remoto. Mientras tanto, usa guardado local.');
          }
        }
        return;
      }
      if (!options?.silent) {
        setFlowRevisionError(message);
      }
    } finally {
      setFlowRevisionLoading(false);
    }
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
      setOverview({
        ...data,
        lists: {
          ...data?.lists,
          registeredUsersByZone: data?.lists?.registeredUsersByZone || [],
        },
      });
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
        sector: toRoadmapSector(row?.sector),
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
          sector: roadmapForm.sector,
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
            sector: toRoadmapSector(data.update.sector),
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
        sector: 'funcionalidades',
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
    patch: Partial<{
      status: RoadmapStatus;
      area: RoadmapArea;
      priority: RoadmapPriority;
      sector: RoadmapSector;
      owner: string | null;
      eta_date: string | null;
    }>,
    options?: {
      auditMessage?: string;
      auditSentiment?: RoadmapSentiment;
      successMessage?: string;
    }
  ) => {
    if (!session?.access_token) return false;
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
        body: JSON.stringify({
          ...patch,
          ...(options?.auditMessage ? { audit_message: options.auditMessage } : {}),
          ...(options?.auditSentiment ? { audit_sentiment: options.auditSentiment } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el item.');
      }
      const updated = data?.update || null;
      const auditFeedback = data?.audit_feedback
        ? ({
            ...data.audit_feedback,
            sentiment: toRoadmapSentiment(data.audit_feedback.sentiment),
          } as RoadmapFeedbackItem)
        : null;
      const auditError = typeof data?.audit_error === 'string' ? data.audit_error : '';
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
                  sector: toRoadmapSector(updated.sector),
                  feedback:
                    auditFeedback && !(item.feedback || []).some((feedback) => feedback.id === auditFeedback.id)
                      ? [...(item.feedback || []), auditFeedback]
                      : item.feedback || [],
                }
              : item
          )
        );
      }
      const successMessage = options?.successMessage || 'Roadmap actualizado.';
      if (auditError) {
        setRoadmapMessage(`${successMessage} (sin feedback automático: ${auditError})`);
      } else {
        setRoadmapMessage(successMessage);
      }
      return true;
    } catch (error: any) {
      setRoadmapError(error?.message || 'No se pudo actualizar el item.');
      return false;
    } finally {
      setRoadmapUpdatingId(null);
    }
  };

  const toggleRoadmapSelection = (roadmapId: string, selected: boolean) => {
    setSelectedRoadmapIds((prev) => {
      if (selected) {
        if (prev.includes(roadmapId)) return prev;
        return [...prev, roadmapId];
      }
      return prev.filter((id) => id !== roadmapId);
    });
  };

  const toggleSelectAllFilteredPending = () => {
    setSelectedRoadmapIds((prev) => {
      const next = new Set(prev);
      if (roadmapAllFilteredPendingSelected) {
        filteredPendingRoadmapIds.forEach((id) => next.delete(id));
      } else {
        filteredPendingRoadmapIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const runRoadmapBulkAction = async (action: 'start' | 'unblock' | 'block' | 'resolve') => {
    if (!session?.access_token || roadmapBulkUpdating) return;
    if (!selectedRoadmapIds.length) return;

    const selectedSet = new Set(selectedRoadmapIds);
    const selectedItems = roadmapUpdates.filter((item) => selectedSet.has(item.id));
    const eligibleItems = selectedItems.filter((item) => {
      if (action === 'start') return item.status === 'planned';
      if (action === 'unblock') return item.status === 'blocked';
      if (action === 'block') return item.status === 'in_progress';
      return item.status !== 'done';
    });

    if (!eligibleItems.length) {
      setRoadmapError('');
      setRoadmapMessage('No hay items seleccionados compatibles con esa acción.');
      return;
    }

    const statusByAction: Record<'start' | 'unblock' | 'block' | 'resolve', RoadmapStatus> = {
      start: 'in_progress',
      unblock: 'in_progress',
      block: 'blocked',
      resolve: 'done',
    };
    const labelByAction: Record<'start' | 'unblock' | 'block' | 'resolve', string> = {
      start: 'Iniciar',
      unblock: 'Desbloquear',
      block: 'Bloquear',
      resolve: 'Resolver',
    };

    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapBulkUpdating(true);
    try {
      const targetStatus = statusByAction[action];
      const actionLabel = labelByAction[action];
      const actionSentiment: RoadmapSentiment = targetStatus === 'done' ? 'positive' : 'neutral';
      const results = await Promise.allSettled(
        eligibleItems.map(async (item) => {
          const response = await fetch(`/api/admin/roadmap/${item.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: targetStatus,
              audit_message: `Acción masiva (${actionLabel}): estado ${getRoadmapStatusLabel(item.status)} -> ${getRoadmapStatusLabel(targetStatus)}.`,
              audit_sentiment: actionSentiment,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.error || 'No se pudo aplicar la acción masiva.');
          }
          return {
            id: item.id,
            auditWarning: typeof data?.audit_error === 'string' ? data.audit_error : '',
          };
        })
      );

      const successIds: string[] = [];
      let failureCount = 0;
      let auditWarningCount = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successIds.push(result.value.id);
          if (result.value.auditWarning) auditWarningCount += 1;
        } else {
          failureCount += 1;
        }
      });

      if (successIds.length > 0) {
        await loadRoadmap(session.access_token);
        setSelectedRoadmapIds((prev) => prev.filter((id) => !successIds.includes(id)));
      }

      if (failureCount > 0 && successIds.length > 0) {
        setRoadmapError(`Se actualizaron ${successIds.length} item(s), pero ${failureCount} fallaron.`);
      } else if (failureCount > 0) {
        setRoadmapError('No se pudo aplicar la acción masiva.');
      } else if (auditWarningCount > 0) {
        setRoadmapMessage(
          `Acción aplicada a ${successIds.length} item(s). ${auditWarningCount} quedaron sin feedback automático.`
        );
      } else {
        setRoadmapMessage(`Acción aplicada a ${successIds.length} item(s).`);
      }
    } catch (error: any) {
      setRoadmapError(error?.message || 'No se pudo aplicar la acción masiva.');
    } finally {
      setRoadmapBulkUpdating(false);
    }
  };

  const runRoadmapQuickAction = async (
    item: RoadmapUpdateItem,
    action: 'start' | 'unblock' | 'block' | 'resolve',
    options?: {
      contextLabel?: string;
      successMessage?: string;
    }
  ) => {
    if (roadmapUpdatingId === item.id) return false;
    if (action === 'start' && item.status !== 'planned') return false;
    if (action === 'unblock' && item.status !== 'blocked') return false;
    if (action === 'block' && item.status !== 'in_progress') return false;
    if (action === 'resolve' && item.status === 'done') return false;

    const statusByAction: Record<'start' | 'unblock' | 'block' | 'resolve', RoadmapStatus> = {
      start: 'in_progress',
      unblock: 'in_progress',
      block: 'blocked',
      resolve: 'done',
    };
    const labelByAction: Record<'start' | 'unblock' | 'block' | 'resolve', string> = {
      start: 'Iniciar',
      unblock: 'Desbloquear',
      block: 'Bloquear',
      resolve: 'Resolver',
    };
    const status = statusByAction[action];
    const prefix = options?.contextLabel ? `${options.contextLabel}: ` : '';
    const fromLabel = getRoadmapStatusLabel(item.status);
    const toLabel = getRoadmapStatusLabel(status);
    const auditSentiment: RoadmapSentiment = status === 'done' ? 'positive' : 'neutral';
    return patchRoadmapUpdate(
      item.id,
      { status },
      {
        auditMessage: `${prefix}Acción rápida (${labelByAction[action]}): estado ${fromLabel} -> ${toLabel}.`,
        auditSentiment,
        successMessage: options?.successMessage || 'Acción rápida aplicada.',
      }
    );
  };

  const applyRoadmapSlaSuggestion = async (alert: RoadmapSlaAlert) => {
    const target = roadmapUpdates.find((item) => item.id === alert.roadmapId);
    if (!target) return false;
    if (roadmapUpdatingId === target.id) return false;

    if (alert.rule === 'blocked_stale') {
      return runRoadmapQuickAction(target, 'unblock', {
        contextLabel: `SLA ${alert.title}`,
        successMessage: 'Acción SLA aplicada.',
      });
    }

    if (alert.rule === 'high_overdue') {
      if (target.status === 'planned') {
        return runRoadmapQuickAction(target, 'start', {
          contextLabel: `SLA ${alert.title}`,
          successMessage: 'Acción SLA aplicada.',
        });
      }
      return runRoadmapQuickAction(target, 'resolve', {
        contextLabel: `SLA ${alert.title}`,
        successMessage: 'Acción SLA aplicada.',
      });
    }

    if (alert.rule === 'stale_in_progress') {
      const nextEta = getIsoDateFromOffset(3);
      return patchRoadmapUpdate(
        target.id,
        { eta_date: nextEta },
        {
          auditMessage: `SLA ${alert.title}: ETA ajustada a ${formatShortDate(nextEta)} por inactividad en ejecución.`,
          auditSentiment: 'neutral',
          successMessage: 'Acción SLA aplicada.',
        }
      );
    }

    if (alert.rule === 'overdue_unassigned') {
      const owner = session?.user?.email || 'Equipo admin';
      if (target.status === 'planned') {
        return patchRoadmapUpdate(
          target.id,
          { owner, status: 'in_progress' },
          {
            auditMessage: `SLA ${alert.title}: responsable asignado (${owner}) y estado ${getRoadmapStatusLabel(target.status)} -> ${getRoadmapStatusLabel('in_progress')}.`,
            auditSentiment: 'neutral',
            successMessage: 'Acción SLA aplicada.',
          }
        );
      }
      return patchRoadmapUpdate(
        target.id,
        { owner },
        {
          auditMessage: `SLA ${alert.title}: responsable asignado (${owner}).`,
          auditSentiment: 'neutral',
          successMessage: 'Acción SLA aplicada.',
        }
      );
    }

    return false;
  };

  const runRoadmapSlaBatchAction = async (severity: 'critical' | 'warning' | 'all') => {
    if (roadmapSlaBatchApplying) return;
    const filtered = severity === 'all' ? roadmapSlaAlerts : roadmapSlaAlerts.filter((alert) => alert.severity === severity);
    const seenRoadmapIds = new Set<string>();
    const queue = filtered.filter((alert) => {
      if (seenRoadmapIds.has(alert.roadmapId)) return false;
      seenRoadmapIds.add(alert.roadmapId);
      return true;
    });

    const severityLabel =
      severity === 'critical' ? 'críticas' : severity === 'warning' ? 'de advertencia' : 'totales';

    if (!queue.length) {
      setRoadmapError('');
      setRoadmapMessage(`No hay alertas SLA ${severityLabel} para aplicar.`);
      return;
    }

    setRoadmapError('');
    setRoadmapMessage('');
    setRoadmapSlaBatchApplying(true);
    let appliedCount = 0;
    try {
      for (const alert of queue.slice(0, ROADMAP_SLA_ALERT_LIMIT)) {
        const applied = await applyRoadmapSlaSuggestion(alert);
        if (applied) appliedCount += 1;
      }
      if (appliedCount > 0) {
        setRoadmapMessage(`SLA: se aplicaron ${appliedCount} sugerencia(s) ${severityLabel}.`);
      } else {
        setRoadmapMessage('SLA: no se pudieron aplicar sugerencias automáticamente.');
      }
    } finally {
      setRoadmapSlaBatchApplying(false);
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
    setSelectedRoadmapIds((prev) => {
      if (!prev.length) return prev;
      const existingIds = new Set(roadmapUpdates.map((item) => item.id));
      const next = prev.filter((id) => existingIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [roadmapUpdates]);

  useEffect(() => {
    if (!session?.access_token || activeTab !== 'flujo' || flowLayoutDirty) return;
    loadFlowLayout(session.access_token, { silent: true });
  }, [activeTab, flowLayoutDirty, session?.access_token, loadFlowLayout]);

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
    setRoadmapPendingOnly(false);
    setRoadmapSortMode('recent');
    setRoadmapBulkUpdating(false);
    setSelectedRoadmapIds([]);
    setFlowNodes(APP_WEB_FLOW_NODES.map((node) => ({ ...node })));
    setFlowDragStart(null);
    setFlowNodeDragStart(null);
    setFlowLayoutDirty(false);
    setFlowRevisionLoading(false);
    setFlowRevisionSaving(false);
    setFlowRevisionError('');
    setFlowRevisionMessage('');
    setFlowRevisionNote('');
    setFlowLastSavedAt(null);
    setFlowLastSavedBy(null);
    setFlowCurrentSource('base');
  };

  const handleOpenFlowNode = (node: AppWebFlowNode) => {
    if (node.target.type === 'admin') {
      setActiveTab(node.target.tab);
      return;
    }
    if (typeof window !== 'undefined') {
      window.open(node.target.href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFlowNodeSelect = (nodeId: string) => {
    setSelectedFlowNodeId(nodeId);
    if (isFlowFullscreen) {
      setFlowProcessDialogNodeId(nodeId);
    }
  };

  const adjustFlowZoom = (delta: number) => {
    setFlowZoom((prev) => Math.min(FLOW_MAX_ZOOM, Math.max(FLOW_MIN_ZOOM, Number((prev + delta).toFixed(2)))));
  };

  const resetFlowZoom = () => {
    setFlowZoom(1);
    setFlowPan({ x: 0, y: 0 });
    setFlowDragStart(null);
  };

  const handleResetFlowLayout = () => {
    setFlowNodes(APP_WEB_FLOW_NODES.map((node) => ({ ...node })));
    setFlowNodeDragStart(null);
    setFlowLayoutDirty(true);
    setFlowRevisionError('');
    setFlowRevisionMessage('Layout restablecido a la base. Guarda para dejarlo como última revisión.');
  };

  const handleSaveFlowLayout = async () => {
    if (!session?.access_token) return;
    setFlowRevisionSaving(true);
    setFlowRevisionError('');
    setFlowRevisionMessage('');
    const note = flowRevisionNote.trim() || null;
    const positions = getFlowNodePositions(flowNodes);
    try {
      const response = await fetch('/api/admin/flow-diagram', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diagram_key: FLOW_DIAGRAM_KEY,
          note,
          nodes: positions,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo guardar la revisión del flujo.');
      }
      const savedState = data?.state || null;
      const savedPositions = sanitizeFlowPositions(savedState?.nodes);
      if (savedPositions.length) {
        setFlowNodes(mergeFlowNodesWithPositions(savedPositions));
      }
      writeFlowLayoutToLocalStorage({
        nodes: savedPositions.length ? savedPositions : positions,
        note: typeof savedState?.note === 'string' ? savedState.note : note,
        updated_by_label: savedState?.updated_by_label || session?.user?.email || 'Local',
        updated_at: savedState?.updated_at || null,
      });
      setFlowLayoutDirty(false);
      setFlowLastSavedAt(savedState?.updated_at || null);
      setFlowLastSavedBy(savedState?.updated_by_label || null);
      setFlowCurrentSource('remote');
      setFlowRevisionMessage('Revisión guardada correctamente y marcada como current.');
    } catch (error: any) {
      const message = error?.message || 'No se pudo guardar la revisión del flujo.';
      if (isMissingFlowDiagramTableError(message)) {
        const localState = writeFlowLayoutToLocalStorage({
          nodes: positions,
          note,
          updated_by_label: session?.user?.email || 'Local',
        });
        if (localState) {
          setFlowLayoutDirty(false);
          setFlowLastSavedAt(localState.updated_at || null);
          setFlowLastSavedBy(localState.updated_by_label || 'Local');
          setFlowCurrentSource('local');
          setFlowRevisionMessage(
            'Guardado local exitoso. Esta revisión quedó como current en este navegador (falta migración para remoto).'
          );
        } else {
          setFlowRevisionError('No se pudo guardar en Supabase ni en almacenamiento local.');
        }
      } else {
        setFlowRevisionError(message);
      }
    } finally {
      setFlowRevisionSaving(false);
    }
  };

  const handleFlowNodeMouseDown = (event: React.MouseEvent<SVGGElement>, nodeId: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const node = flowNodes.find((item) => item.id === nodeId);
    if (!node) return;
    setFlowNodeDragStart({
      nodeId,
      clientX: event.clientX,
      clientY: event.clientY,
      nodeX: node.x,
      nodeY: node.y,
    });
  };

  const handleFlowMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (flowNodeDragStart) return;
    const target = event.target;
    if (target instanceof Element && target.closest('[data-flow-node="true"]')) return;
    event.preventDefault();
    setFlowDragStart({
      clientX: event.clientX,
      clientY: event.clientY,
      panX: flowPan.x,
      panY: flowPan.y,
    });
  };

  const toggleFlowFullscreen = async () => {
    if (typeof document === 'undefined') return;
    const canvas = flowCanvasRef.current;
    if (!canvas) return;
    try {
      if (document.fullscreenElement === canvas) {
        await document.exitFullscreen();
        return;
      }
      if (document.fullscreenElement && document.fullscreenElement !== canvas) {
        await document.exitFullscreen();
      }
      await canvas.requestFullscreen();
    } catch (error) {
      console.error('No se pudo alternar fullscreen del diagrama.', error);
    }
  };

  const handleExportFlowPdf = () => {
    if (typeof window === 'undefined') return;
    const svg = document.getElementById('admin-flow-classic-svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    let svgMarkup = serializer.serializeToString(svg);
    if (!svgMarkup.includes('xmlns=')) {
      svgMarkup = svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!svgMarkup.includes('xmlns:xlink=')) {
      svgMarkup = svgMarkup.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const printHtml = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>UrbanFix - Diagrama de flujo</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; background: #fff; color: #0f172a; }
            .sheet { width: 100%; padding: 8px; }
            .title { margin: 0 0 6px; font-size: 16px; font-weight: 700; }
            .hint { margin: 0 0 10px; font-size: 12px; color: #475569; }
            .diagram { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 6px; }
            .diagram svg { width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <p class="title">Diagrama de flujo operativo App/Web</p>
            <p class="hint">Usa "Guardar como PDF" en el diálogo de impresión.</p>
            <div class="diagram">${svgMarkup}</div>
          </div>
        </body>
      </html>
    `;

    const openAndPrintPopup = () => {
      const printWindow = window.open('', '_blank', 'width=1280,height=920');
      if (!printWindow) return false;
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error('No se pudo abrir impresion en popup.', error);
        }
      }, 250);
      return true;
    };

    const openAndPrintIframe = () => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const cleanup = () => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      iframe.onload = () => {
        try {
          const frameWindow = iframe.contentWindow;
          if (!frameWindow) {
            cleanup();
            return;
          }
          frameWindow.focus();
          frameWindow.print();
          window.setTimeout(cleanup, 1200);
        } catch (error) {
          console.error('No se pudo abrir impresion en iframe.', error);
          cleanup();
        }
      };

      iframe.srcdoc = printHtml;
    };

    const popupOk = openAndPrintPopup();
    if (!popupOk) {
      openAndPrintIframe();
    }
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

  const handleBillingExport = () => {
    if (!overview) return;
    if (billingExportType === 'subscriptions') {
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
      );
      return;
    }
    if (billingExportType === 'payments') {
      downloadCsv(
        'pagos_recientes.csv',
        overview.lists.recentPayments.map((payment) => ({
          usuario: getProfileLabel(payment.profile),
          email: payment.profile?.email || '',
          estado: payment.status || '',
          monto: payment.amount || 0,
          pagado: payment.paid_at || payment.created_at,
        }))
      );
      return;
    }
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
    );
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

    overview.lists.registeredUsersByZone.forEach((item) => {
      const users = Number(item.users_count || 0);
      if (!users) return;
      totalUsers += users;
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
        intensity: 0,
        heatColor: '#60A5FA',
      };

      current.users += users;
      current.zones.push(item.zone);
      grouped.set(anchor.id, current);
    });

    overview.lists.incomeByZone.forEach((item) => {
      const anchor = getAnchorByZone(item.zone);
      if (!anchor) return;

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
        intensity: 0,
        heatColor: '#60A5FA',
      };

      current.quotes += Number(item.quotes_count || 0);
      current.payments += Number(item.payments_count || 0);
      current.totalAmount += Number(item.total_amount || 0);
      current.users = Math.max(current.users, Number(item.users_count || 0));
      current.zones.push(item.zone);
      grouped.set(anchor.id, current);
    });

    if (!totalUsers) {
      totalUsers = overview.lists.incomeByZone.reduce((sum, item) => sum + Number(item.users_count || 0), 0);
    }

    const basePoints = Array.from(grouped.values()).sort((a, b) => b.users - a.users);
    const maxUsers = Math.max(1, ...basePoints.map((point) => point.users || 0));
    const points: ArgentinaZonePoint[] = basePoints.map((point) => {
      const intensity = Math.max(0.08, Math.min(1, point.users / maxUsers));
      return {
        ...point,
        intensity,
        heatColor: getHeatColor(intensity),
        radius: 7 + Math.round(intensity * 14),
      };
    });

    return {
      points,
      unmappedZones: Array.from(new Set(unmappedZones)).slice(0, 6),
      totalUsers,
    };
  }, [overview]);

  const billingWindow = useMemo(() => {
    const today = startOfDay(new Date());
    const start = new Date(today);
    if (billingRange === '7d') {
      start.setDate(today.getDate() - 6);
    } else if (billingRange === '30d') {
      start.setDate(today.getDate() - 29);
    } else if (billingRange === '90d') {
      start.setDate(today.getDate() - 89);
    } else {
      start.setMonth(0, 1);
    }
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const days = Math.max(1, Math.round((startOfDay(end).getTime() - start.getTime()) / DAY_MS) + 1);
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - (days - 1));
    previousStart.setHours(0, 0, 0, 0);

    return {
      startMs: start.getTime(),
      endMs: end.getTime(),
      previousStartMs: previousStart.getTime(),
      previousEndMs: previousEnd.getTime(),
      label: `${start.toLocaleDateString('es-AR')} - ${today.toLocaleDateString('es-AR')}`,
      shortLabel:
        billingRange === 'ytd'
          ? 'Año actual'
          : billingRange === '7d'
            ? 'Últimos 7 días'
            : billingRange === '30d'
              ? 'Últimos 30 días'
              : 'Últimos 90 días',
      days,
    };
  }, [billingRange]);

  const billingTimeline = useMemo(() => {
    if (!overview) {
      return {
        series: [] as { date: string; payments: number; subscriptions: number; total: number }[],
        totalCurrent: 0,
        totalPrevious: 0,
        paymentsCurrent: 0,
        paymentsPrevious: 0,
        subscriptionsCurrent: 0,
        subscriptionsPrevious: 0,
        paymentsCountCurrent: 0,
        paymentsCountPrevious: 0,
        averageTicketCurrent: 0,
        averageTicketPrevious: 0,
        totalPoints: '',
        paymentsPoints: '',
        subscriptionsPoints: '',
        maxSeriesValue: 1,
        topZones: [] as IncomeZoneItem[],
        maxZoneTotal: 1,
      };
    }

    const buckets = new Map<string, { date: string; payments: number; subscriptions: number; total: number }>();
    const startDate = new Date(billingWindow.startMs);
    for (let dayIndex = 0; dayIndex < billingWindow.days; dayIndex += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + dayIndex);
      const key = toDateKey(day);
      buckets.set(key, { date: key, payments: 0, subscriptions: 0, total: 0 });
    }

    const isWithin = (time: number | null, startMs: number, endMs: number) =>
      time !== null && time >= startMs && time <= endMs;

    let paymentsCurrent = 0;
    let paymentsPrevious = 0;
    let subscriptionsCurrent = 0;
    let subscriptionsPrevious = 0;
    let paymentsCountCurrent = 0;
    let paymentsCountPrevious = 0;

    overview.lists.recentPayments.forEach((payment) => {
      const amount = Number(payment.amount || 0);
      if (!amount) return;
      const time = toTimeMs(payment.paid_at || payment.created_at);
      if (isWithin(time, billingWindow.startMs, billingWindow.endMs)) {
        paymentsCurrent += amount;
        paymentsCountCurrent += 1;
        const key = toDateKey(startOfDay(new Date(time as number)));
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.payments += amount;
          bucket.total += amount;
        }
        return;
      }
      if (isWithin(time, billingWindow.previousStartMs, billingWindow.previousEndMs)) {
        paymentsPrevious += amount;
        paymentsCountPrevious += 1;
      }
    });

    overview.lists.recentSubscriptions.forEach((subscription) => {
      const amount = Number(subscription.plan?.price_ars || 0);
      if (!amount) return;
      const time = toTimeMs(subscription.created_at);
      if (isWithin(time, billingWindow.startMs, billingWindow.endMs)) {
        subscriptionsCurrent += amount;
        const key = toDateKey(startOfDay(new Date(time as number)));
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.subscriptions += amount;
          bucket.total += amount;
        }
        return;
      }
      if (isWithin(time, billingWindow.previousStartMs, billingWindow.previousEndMs)) {
        subscriptionsPrevious += amount;
      }
    });

    const series = Array.from(buckets.values());
    const maxSeriesValue = Math.max(
      1,
      ...series.map((item) => Math.max(item.total, item.payments, item.subscriptions))
    );
    const totalPoints = buildLinePoints(
      series.map((item) => item.total),
      maxSeriesValue
    );
    const paymentsPoints = buildLinePoints(
      series.map((item) => item.payments),
      maxSeriesValue
    );
    const subscriptionsPoints = buildLinePoints(
      series.map((item) => item.subscriptions),
      maxSeriesValue
    );

    const topZones = [...overview.lists.incomeByZone]
      .sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0))
      .slice(0, 5);
    const maxZoneTotal = Math.max(1, ...topZones.map((item) => Number(item.total_amount || 0)));

    const averageTicketCurrent = paymentsCountCurrent ? paymentsCurrent / paymentsCountCurrent : 0;
    const averageTicketPrevious = paymentsCountPrevious ? paymentsPrevious / paymentsCountPrevious : 0;

    return {
      series,
      totalCurrent: paymentsCurrent + subscriptionsCurrent,
      totalPrevious: paymentsPrevious + subscriptionsPrevious,
      paymentsCurrent,
      paymentsPrevious,
      subscriptionsCurrent,
      subscriptionsPrevious,
      paymentsCountCurrent,
      paymentsCountPrevious,
      averageTicketCurrent,
      averageTicketPrevious,
      totalPoints,
      paymentsPoints,
      subscriptionsPoints,
      maxSeriesValue,
      topZones,
      maxZoneTotal,
    };
  }, [overview, billingWindow]);

  const billingKpiCards = useMemo(() => {
    const totalDelta = getDeltaLabel(billingTimeline.totalCurrent, billingTimeline.totalPrevious);
    const paymentsDelta = getDeltaLabel(billingTimeline.paymentsCurrent, billingTimeline.paymentsPrevious);
    const subscriptionsDelta = getDeltaLabel(
      billingTimeline.subscriptionsCurrent,
      billingTimeline.subscriptionsPrevious
    );
    const ticketDelta = getDeltaLabel(billingTimeline.averageTicketCurrent, billingTimeline.averageTicketPrevious);
    return [
      {
        key: 'total',
        label: `Total del periodo (${billingWindow.shortLabel})`,
        value: formatCurrency(billingTimeline.totalCurrent),
        helper: `${billingTimeline.paymentsCountCurrent} pagos registrados`,
        delta: totalDelta,
      },
      {
        key: 'payments',
        label: 'Ingresos por pagos',
        value: formatCurrency(billingTimeline.paymentsCurrent),
        helper: `${billingTimeline.paymentsCountCurrent} pago(s)`,
        delta: paymentsDelta,
      },
      {
        key: 'subscriptions',
        label: 'Ingresos por suscripciones',
        value: formatCurrency(billingTimeline.subscriptionsCurrent),
        helper: `${overview?.lists.recentSubscriptions.length || 0} suscripción(es) recientes`,
        delta: subscriptionsDelta,
      },
      {
        key: 'ticket',
        label: 'Ticket promedio (pagos)',
        value: formatCurrency(billingTimeline.averageTicketCurrent),
        helper: 'Promedio por pago confirmado',
        delta: ticketDelta,
      },
    ];
  }, [billingTimeline, billingWindow.shortLabel, overview?.lists.recentSubscriptions.length]);

  const tabs = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'usuarios', label: 'Usuarios' },
    { key: 'facturacion', label: 'Facturación' },
    { key: 'mano_obra', label: 'Mano de obra' },
    { key: 'flujo', label: 'Flujo App/Web' },
    { key: 'roadmap', label: 'Roadmap' },
    { key: 'mensajes', label: 'Mensajes' },
    { key: 'accesos', label: 'Accesos' },
    { key: 'actividad', label: 'Actividad' },
  ] as const;

  const selectedFlowNode = useMemo<AppWebFlowNode | null>(
    () => flowNodes.find((node) => node.id === selectedFlowNodeId) || flowNodes[0] || null,
    [selectedFlowNodeId, flowNodes]
  );

  const flowProcessDialogNode = useMemo<AppWebFlowNode | null>(
    () => flowNodes.find((node) => node.id === flowProcessDialogNodeId) || null,
    [flowProcessDialogNodeId, flowNodes]
  );

  const selectedFlowEdgeIds = useMemo(() => {
    if (!selectedFlowNode) return new Set<string>();
    return new Set(
      APP_WEB_FLOW_EDGES.filter((edge) => edge.from === selectedFlowNode.id || edge.to === selectedFlowNode.id).map(
        (edge) => edge.id
      )
    );
  }, [selectedFlowNode]);

  const selectedFlowTargetLabel = useMemo(() => {
    if (!selectedFlowNode) return '';
    const target = selectedFlowNode.target;
    if (target.type === 'web') {
      return `Ruta web: ${target.href}`;
    }
    const tabLabel = tabs.find((tab) => tab.key === target.tab)?.label || target.tab;
    return `Tab admin: ${tabLabel}`;
  }, [selectedFlowNode, tabs]);

  const flowProcessDialogTargetLabel = useMemo(() => {
    if (!flowProcessDialogNode) return '';
    const target = flowProcessDialogNode.target;
    if (target.type === 'web') {
      return `Ruta web: ${target.href}`;
    }
    const tabLabel = tabs.find((tab) => tab.key === target.tab)?.label || target.tab;
    return `Tab admin: ${tabLabel}`;
  }, [flowProcessDialogNode, tabs]);

  const flowLaneRows = useMemo(
    () =>
      FLOW_DIAGRAM_COLUMNS.map((column) => ({
        ...column,
        nodes: flowNodes.filter((node) => node.column === column.id).sort((a, b) => a.y - b.y),
      })),
    [flowNodes]
  );

  const flowNodeCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    flowLaneRows.forEach((lane) => {
      const prefix = FLOW_COLUMN_CODE[lane.id];
      lane.nodes.forEach((node, index) => {
        map.set(node.id, `${prefix}-${String(index + 1).padStart(2, '0')}`);
      });
    });
    return map;
  }, [flowLaneRows]);

  const flowBranchNodes = useMemo(
    () =>
      flowNodes.map((node, index) => ({
        node: {
          ...node,
          x: Math.round(node.x + FLOW_CLASSIC_COLUMN_SHIFT[node.column]),
          y: Math.round(FLOW_CLASSIC_BASE_Y + (node.y - FLOW_CLASSIC_BASE_Y) * FLOW_CLASSIC_Y_SCALE),
        },
        index,
        x: Math.round(node.x + FLOW_CLASSIC_COLUMN_SHIFT[node.column]),
        y: Math.round(FLOW_CLASSIC_BASE_Y + (node.y - FLOW_CLASSIC_BASE_Y) * FLOW_CLASSIC_Y_SCALE),
        width: node.width,
        height: node.height,
      })),
    [flowNodes]
  );

  const flowBranchNodeMap = useMemo(
    () => new Map(flowBranchNodes.map((item) => [item.node.id, item] as const)),
    [flowBranchNodes]
  );

  const flowDiagramFrame = useMemo(() => {
    if (!flowBranchNodes.length) {
      return {
        width: 1700,
        height: 1320,
        offsetX: 0,
        offsetY: 0,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    flowBranchNodes.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    APP_WEB_FLOW_EDGES.forEach((edge) => {
      (edge.via || []).forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    const horizontalPadding = 180;
    const verticalPadding = 190;
    const titlePadding = 36;
    const width = Math.max(1700, maxX - minX + horizontalPadding * 2);
    const height = Math.max(1320, maxY - minY + verticalPadding * 2 + titlePadding);
    const offsetX = horizontalPadding - minX;
    const offsetY = verticalPadding + titlePadding - minY;

    return { width, height, offsetX, offsetY };
  }, [flowBranchNodes]);

  const flowBranchEdges = useMemo(() => {
    const nodeRects = Array.from(flowBranchNodeMap.values()).map((item) => ({
      id: item.node.id,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    }));
    const nodeRectMap = new Map(nodeRects.map((node) => [node.id, node] as const));

    return APP_WEB_FLOW_EDGES.flatMap((edge) => {
      const fromNode = nodeRectMap.get(edge.from);
      const toNode = nodeRectMap.get(edge.to);
      if (!fromNode || !toNode) return [];

      const fromCenter = getFlowNodeCenter(fromNode);
      const toCenter = getFlowNodeCenter(toNode);
      const fromSideCandidates = getFlowSideCandidates(edge.fromSide);
      const toSideCandidates = getFlowSideCandidates(edge.toSide);
      const skipNodeIds = new Set<string>([fromNode.id, toNode.id]);

      let bestRoute:
        | {
            score: number;
            points: FlowEdgePoint[];
            fromSide: FlowNodeSide;
            toSide: FlowNodeSide;
          }
        | null = null;

      for (const [fromIndex, fromSide] of fromSideCandidates.entries()) {
        for (const [toIndex, toSide] of toSideCandidates.entries()) {
          const start = getFlowNodeAnchor(fromNode, fromSide, toCenter);
          const end = getFlowNodeAnchor(toNode, toSide, fromCenter);
          const routeCandidates = buildFlowRouteCandidates(start, end, fromSide, toSide);

          for (const [routeIndex, points] of routeCandidates.entries()) {
            const pathPoints = normalizeFlowPathPoints(points);
            const length = getFlowEdgeLength(pathPoints);
            const turns = getFlowEdgeTurns(pathPoints);
            const obstacleHits = getFlowObstacleHits(pathPoints, nodeRects, skipNodeIds);
            const directionPenalty = getFlowDirectionPenalty(fromCenter, toCenter, fromSide, toSide);
            const preferredPenalty =
              (edge.fromSide && edge.fromSide !== fromSide ? 34 : 0) +
              (edge.toSide && edge.toSide !== toSide ? 34 : 0);
            const candidateOrderPenalty = fromIndex * 2 + toIndex * 2 + routeIndex;
            const score =
              length + turns * 18 + obstacleHits * 920 + directionPenalty + preferredPenalty + candidateOrderPenalty;

            if (!bestRoute || score < bestRoute.score) {
              bestRoute = {
                score,
                points: pathPoints,
                fromSide,
                toSide,
              };
            }
          }
        }
      }

      if (!bestRoute) return [];
      const labelPoint = getFlowEdgeLabelPoint(bestRoute.points);

      return [
        {
          ...edge,
          fromSide: bestRoute.fromSide,
          toSide: bestRoute.toSide,
          path: buildFlowSvgPath(bestRoute.points),
          labelX: edge.labelX ?? labelPoint.x,
          labelY: edge.labelY ?? labelPoint.y - 10,
        },
      ];
    });
  }, [flowBranchNodeMap]);

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
      if (roadmapPendingOnly && item.status === 'done') return false;
      if (roadmapStatusFilter !== 'all' && item.status !== roadmapStatusFilter) return false;
      if (roadmapAreaFilter !== 'all' && item.area !== roadmapAreaFilter) return false;
      if (roadmapSectorFilter !== 'all' && item.sector !== roadmapSectorFilter) return false;
      if (!query) return true;
      const feedbackText = (item.feedback || []).map((feedback) => feedback.body).join(' ');
      const haystack = normalizeText([item.title, item.description || '', item.owner || '', feedbackText].join(' '));
      return haystack.includes(query);
    });
  }, [roadmapUpdates, roadmapSearch, roadmapStatusFilter, roadmapAreaFilter, roadmapSectorFilter, roadmapPendingOnly]);

  const roadmapSelectedIdSet = useMemo(() => new Set(selectedRoadmapIds), [selectedRoadmapIds]);

  const filteredPendingRoadmapIds = useMemo(
    () => filteredRoadmapUpdates.filter((item) => item.status !== 'done').map((item) => item.id),
    [filteredRoadmapUpdates]
  );

  const orderedRoadmapUpdates = useMemo(() => {
    const rows = [...filteredRoadmapUpdates];
    const todayMs = startOfDay(new Date()).getTime();
    const nextWeekMs = todayMs + DAY_MS * 7;
    const toCreatedMs = (item: RoadmapUpdateItem) => toTimeMs(item.created_at) || 0;
    const toUpdatedMs = (item: RoadmapUpdateItem) => toTimeMs(item.updated_at) ?? toCreatedMs(item);

    if (roadmapSortMode === 'recent') {
      return rows.sort((a, b) => toCreatedMs(b) - toCreatedMs(a));
    }

    if (roadmapSortMode === 'eta') {
      return rows.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        const etaA = toTimeMs(a.eta_date);
        const etaB = toTimeMs(b.eta_date);
        if (etaA !== null && etaB !== null) return etaA - etaB;
        if (etaA !== null) return -1;
        if (etaB !== null) return 1;
        return toCreatedMs(b) - toCreatedMs(a);
      });
    }

    return rows.sort((a, b) => {
      const score = (item: RoadmapUpdateItem) => {
        const etaMs = toTimeMs(item.eta_date);
        const overdue = etaMs !== null && etaMs < todayMs;
        const dueSoon = etaMs !== null && etaMs >= todayMs && etaMs <= nextWeekMs;
        let value = ROADMAP_PRIORITY_SCORE[item.priority] * 100 + ROADMAP_STATUS_URGENCY[item.status] * 80;
        if (overdue) value += 140;
        if (dueSoon) value += 45;
        return value;
      };

      const scoreDelta = score(b) - score(a);
      if (scoreDelta !== 0) return scoreDelta;
      return toUpdatedMs(a) - toUpdatedMs(b);
    });
  }, [filteredRoadmapUpdates, roadmapSortMode]);

  const roadmapAllFilteredPendingSelected = useMemo(
    () =>
      filteredPendingRoadmapIds.length > 0 &&
      filteredPendingRoadmapIds.every((roadmapId) => roadmapSelectedIdSet.has(roadmapId)),
    [filteredPendingRoadmapIds, roadmapSelectedIdSet]
  );

  const selectedRoadmapItems = useMemo(
    () => roadmapUpdates.filter((item) => roadmapSelectedIdSet.has(item.id)),
    [roadmapUpdates, roadmapSelectedIdSet]
  );

  const roadmapBulkAvailability = useMemo(
    () => ({
      start: selectedRoadmapItems.some((item) => item.status === 'planned'),
      unblock: selectedRoadmapItems.some((item) => item.status === 'blocked'),
      block: selectedRoadmapItems.some((item) => item.status === 'in_progress'),
      resolve: selectedRoadmapItems.some((item) => item.status !== 'done'),
    }),
    [selectedRoadmapItems]
  );

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

  const roadmapPendingQueue = useMemo(() => {
    const todayMs = startOfDay(new Date()).getTime();
    const nextWeekMs = todayMs + DAY_MS * 7;
    return roadmapReportItems
      .filter((item) => item.status !== 'done')
      .map((item) => {
        const etaMs = toTimeMs(item.eta_date);
        const updatedMs = toTimeMs(item.updated_at) ?? toTimeMs(item.created_at) ?? Date.now();
        const ageDays = Math.max(0, Math.round((Date.now() - updatedMs) / DAY_MS));
        const overdue = etaMs !== null && etaMs < todayMs;
        const dueSoon = etaMs !== null && etaMs >= todayMs && etaMs <= nextWeekMs;

        // Prioriza bloqueados y tareas críticas cercanas/vencidas para enfoque diario.
        let score = ROADMAP_PRIORITY_SCORE[item.priority] * 100 + ROADMAP_STATUS_URGENCY[item.status] * 80 + ageDays;
        if (overdue) score += 140;
        if (dueSoon) score += 45;

        return {
          ...item,
          score,
          ageDays,
          overdue,
          dueSoon,
        };
      })
      .sort((a, b) => b.score - a.score || b.ageDays - a.ageDays || a.title.localeCompare(b.title))
      .slice(0, 8);
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

  const roadmapPlannedCount = useMemo(
    () => roadmapStatusSeries.find((item) => item.status === 'planned')?.count || 0,
    [roadmapStatusSeries]
  );

  const roadmapDueSoonItems = useMemo(() => {
    const todayMs = startOfDay(new Date()).getTime();
    const nextWeekMs = todayMs + DAY_MS * 7;
    const dueSoon: Array<{
      id: string;
      title: string;
      owner: string | null;
      status: RoadmapStatus;
      priority: RoadmapPriority;
      etaDate: string | null;
      daysToEta: number;
    }> = [];

    roadmapReportItems.forEach((item) => {
      if (item.status === 'done') return;
      const etaMs = toTimeMs(item.eta_date);
      if (etaMs === null) return;
      if (etaMs < todayMs || etaMs > nextWeekMs) return;
      dueSoon.push({
        id: item.id,
        title: item.title,
        owner: item.owner || null,
        status: item.status,
        priority: item.priority,
        etaDate: item.eta_date || null,
        daysToEta: Math.max(0, Math.round((etaMs - todayMs) / DAY_MS)),
      });
    });

    return dueSoon.sort((a, b) => {
      const aEta = toTimeMs(a.etaDate) || 0;
      const bEta = toTimeMs(b.etaDate) || 0;
      return aEta - bEta;
    });
  }, [roadmapReportItems]);

  const roadmapOverdueHighPriorityCount = useMemo(() => {
    const todayMs = startOfDay(new Date()).getTime();
    return roadmapReportItems.filter((item) => {
      if (item.status === 'done' || item.priority !== 'high') return false;
      const etaMs = toTimeMs(item.eta_date);
      return etaMs !== null && etaMs < todayMs;
    }).length;
  }, [roadmapReportItems]);

  const roadmapStaleInProgressCount = useMemo(() => {
    const staleThresholdMs = Date.now() - DAY_MS * 7;
    return roadmapReportItems.filter((item) => {
      if (item.status !== 'in_progress') return false;
      const referenceMs = toTimeMs(item.updated_at) ?? toTimeMs(item.created_at);
      return referenceMs !== null && referenceMs < staleThresholdMs;
    }).length;
  }, [roadmapReportItems]);

  const roadmapSlaAlerts = useMemo(() => {
    const nowMs = Date.now();
    const todayMs = startOfDay(new Date()).getTime();
    const alerts: RoadmapSlaAlert[] = [];

    roadmapReportItems.forEach((item) => {
      if (item.status === 'done') return;
      const updatedMs = toTimeMs(item.updated_at) ?? toTimeMs(item.created_at) ?? nowMs;
      const staleDays = Math.max(0, Math.round((nowMs - updatedMs) / DAY_MS));
      const etaMs = toTimeMs(item.eta_date);
      const overdueDays = etaMs === null ? 0 : Math.max(0, Math.round((todayMs - etaMs) / DAY_MS));
      const hasOwner = String(item.owner || '').trim().length > 0;

      if (item.status === 'blocked' && staleDays >= ROADMAP_SLA_BLOCKED_DAYS) {
        alerts.push({
          id: `${item.id}-blocked-stale`,
          roadmapId: item.id,
          rule: 'blocked_stale',
          severity: 'critical',
          title: item.title,
          detail: `Bloqueado hace ${staleDays} día(s). Requiere destrabe inmediato.`,
          actionLabel: 'Desbloquear',
          score: 600 + staleDays * 2,
        });
      }

      if (item.priority === 'high' && overdueDays > 0) {
        alerts.push({
          id: `${item.id}-high-overdue`,
          roadmapId: item.id,
          rule: 'high_overdue',
          severity: 'critical',
          title: item.title,
          detail: `Prioridad alta con ETA vencida hace ${overdueDays} día(s).`,
          actionLabel: item.status === 'planned' ? 'Iniciar' : 'Resolver',
          score: 560 + overdueDays * 3,
        });
      }

      if (item.status === 'in_progress' && staleDays >= ROADMAP_SLA_IN_PROGRESS_DAYS) {
        alerts.push({
          id: `${item.id}-stale-progress`,
          roadmapId: item.id,
          rule: 'stale_in_progress',
          severity: 'warning',
          title: item.title,
          detail: `En progreso sin movimiento SLA (${staleDays} día/s).`,
          actionLabel: 'Extender ETA +3d',
          score: 360 + staleDays,
        });
      }

      if (!hasOwner && overdueDays > 0) {
        alerts.push({
          id: `${item.id}-overdue-unassigned`,
          roadmapId: item.id,
          rule: 'overdue_unassigned',
          severity: 'warning',
          title: item.title,
          detail: `Vencida hace ${overdueDays} día(s) y sin responsable asignado.`,
          actionLabel: 'Asignarme',
          score: 340 + overdueDays * 2,
        });
      }
    });

    return alerts
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
        return b.score - a.score;
      })
      .slice(0, ROADMAP_SLA_ALERT_LIMIT);
  }, [roadmapReportItems]);

  const roadmapSlaSummary = useMemo(
    () => ({
      critical: roadmapSlaAlerts.filter((alert) => alert.severity === 'critical').length,
      warning: roadmapSlaAlerts.filter((alert) => alert.severity === 'warning').length,
    }),
    [roadmapSlaAlerts]
  );

  const roadmapOwnerOpenLoad = useMemo(() => {
    const todayMs = startOfDay(new Date()).getTime();
    const groups = new Map<
      string,
      {
        owner: string;
        open: number;
        inProgress: number;
        blocked: number;
        overdue: number;
      }
    >();

    roadmapReportItems.forEach((item) => {
      if (item.status === 'done') return;
      const owner = getRoadmapOwnerLabel(item.owner);
      const etaMs = toTimeMs(item.eta_date);
      const current = groups.get(owner) || {
        owner,
        open: 0,
        inProgress: 0,
        blocked: 0,
        overdue: 0,
      };
      current.open += 1;
      if (item.status === 'in_progress') current.inProgress += 1;
      if (item.status === 'blocked') current.blocked += 1;
      if (etaMs !== null && etaMs < todayMs) current.overdue += 1;
      groups.set(owner, current);
    });

    return Array.from(groups.values())
      .sort((a, b) => b.open - a.open || b.blocked - a.blocked || a.owner.localeCompare(b.owner))
      .slice(0, 8);
  }, [roadmapReportItems]);

  const roadmapOwnerMaxOpen = useMemo(
    () => Math.max(1, ...roadmapOwnerOpenLoad.map((item) => item.open)),
    [roadmapOwnerOpenLoad]
  );

  const roadmapExecutionSignal = useMemo(() => {
    if (roadmapReportTotals.blocked > 0 || roadmapOverdueHighPriorityCount > 0) {
      return {
        label: 'Critico',
        badgeClass: 'border border-rose-200 bg-rose-50 text-rose-700',
        textClass: 'text-rose-700',
        description: 'Hay bloqueos o tareas altas vencidas. Priorizar destrabes hoy.',
      };
    }

    if (roadmapDueSoonItems.length >= 5 || roadmapStaleInProgressCount >= 3) {
      return {
        label: 'Atencion',
        badgeClass: 'border border-amber-200 bg-amber-50 text-amber-700',
        textClass: 'text-amber-700',
        description: 'La carga de la semana subio. Conviene reasignar responsables.',
      };
    }

    return {
      label: 'En control',
      badgeClass: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      textClass: 'text-emerald-700',
      description: 'Sin alertas fuertes en la ventana de ejecucion de 7 dias.',
    };
  }, [
    roadmapDueSoonItems.length,
    roadmapOverdueHighPriorityCount,
    roadmapReportTotals.blocked,
    roadmapStaleInProgressCount,
  ]);

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
                  if (activeTab === 'flujo') {
                    loadFlowLayout(session.access_token);
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
                <div>
                  <p className="text-xs text-slate-400">
                    Ingresos calculados desde {formatDateTime(overview.kpis.revenueSince)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Periodo activo: {billingWindow.label}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1">
                    {BILLING_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setBillingRange(option.value)}
                        className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold transition ${
                          billingRange === option.value
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={billingExportType}
                    onChange={(event) => setBillingExportType(event.target.value as BillingExportType)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                  >
                    <option value="subscriptions">Exportar suscripciones</option>
                    <option value="payments">Exportar pagos</option>
                    <option value="zones">Exportar zonas</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleBillingExport}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Exportar
                  </button>
                </div>
              </div>

              <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {billingKpiCards.map((card, index) => (
                  <div
                    key={card.key}
                    className={`rounded-3xl border bg-white p-5 shadow-sm ${
                      index === 0 ? 'border-slate-300 md:col-span-2 lg:col-span-2' : 'border-slate-200'
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
                    <p className={`mt-2 text-xs font-semibold ${card.delta.tone}`}>{card.delta.text}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{card.helper}</p>
                  </div>
                ))}
              </section>

              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Evolución</p>
                    <h3 className="text-lg font-semibold text-slate-900">Facturación del periodo</h3>
                    <p className="text-xs text-slate-500">Pagos y suscripciones agregados por día.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      Total: {formatCurrency(billingTimeline.totalCurrent)}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
                      Suscripciones: {formatCurrency(billingTimeline.subscriptionsCurrent)}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                      Pagos: {formatCurrency(billingTimeline.paymentsCurrent)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-36 w-full">
                    <polyline points="0,38 100,38" fill="none" stroke="#E2E8F0" strokeWidth="0.7" />
                    <polyline points="0,21 100,21" fill="none" stroke="#E2E8F0" strokeWidth="0.7" />
                    {!!billingTimeline.totalPoints && (
                      <polyline
                        points={billingTimeline.totalPoints}
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {!!billingTimeline.subscriptionsPoints && (
                      <polyline
                        points={billingTimeline.subscriptionsPoints}
                        fill="none"
                        stroke="#0EA5E9"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {!!billingTimeline.paymentsPoints && (
                      <polyline
                        points={billingTimeline.paymentsPoints}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-slate-900" />
                      Total
                    </span>
                    <span className="inline-flex items-center gap-2 text-sky-700">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      Suscripciones
                    </span>
                    <span className="inline-flex items-center gap-2 text-amber-700">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Pagos
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] text-slate-400">
                    <span>{billingTimeline.series[0]?.date || '-'}</span>
                    <span>{billingTimeline.series[billingTimeline.series.length - 1]?.date || '-'}</span>
                  </div>
                </div>
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mapa</p>
                      <h3 className="text-lg font-semibold text-slate-900">Argentina por usuarios registrados</h3>
                      <p className="text-xs text-slate-500">
                        Mapa de calor por zona aproximada, basado en ciudad o cobertura de perfiles registrados.
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
                            r={point.radius * 2.25}
                            fill={point.heatColor}
                            fillOpacity={0.18 + point.intensity * 0.22}
                          />
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={point.radius * 1.35}
                            fill={point.heatColor}
                            fillOpacity={0.45 + point.intensity * 0.25}
                          />
                          <circle cx={point.x} cy={point.y} r={point.radius} fill={point.heatColor} fillOpacity="0.95" />
                          <circle cx={point.x} cy={point.y} r={Math.max(2.2, point.radius * 0.26)} fill="#F8FAFC" />
                        </g>
                      ))}
                    </svg>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-500 via-amber-400 to-rose-600" />
                      <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>Baja densidad</span>
                        <span>Alta densidad</span>
                      </div>
                    </div>
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
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Top 5 zonas</p>
                        <span className="text-[11px] text-slate-400">Ranking por total</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {billingTimeline.topZones.map((zone) => {
                          const total = Number(zone.total_amount || 0);
                          const width = Math.max(
                            8,
                            Math.round((total / Math.max(1, billingTimeline.maxZoneTotal)) * 100)
                          );
                          return (
                            <div key={`top-zone-${zone.zone}`}>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="truncate font-semibold text-slate-700">{zone.zone}</span>
                                <span className="font-semibold text-slate-700">{formatCurrency(total)}</span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {billingTimeline.topZones.length === 0 && (
                          <p className="text-xs text-slate-500">Sin zonas con datos para el periodo actual.</p>
                        )}
                      </div>
                    </div>

                    {overview.lists.incomeByZone.length === 0 && (
                      <p className="text-sm text-slate-500">No hay datos de zona todavía.</p>
                    )}
                    {overview.lists.incomeByZone.slice(0, 8).map((item) => (
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
          {activeTab === 'flujo' && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mapa operativo</p>
                  <h3 className="text-lg font-semibold text-slate-900">Diagrama de flujo interactivo App/Web</h3>
                  <p className="text-sm text-slate-500">
                    Flujo completo desde captacion hasta control admin, con decisiones, ramas y previsualizacion por
                    paso.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
                  {flowNodes.length} nodos activos
                </span>
              </div>

              <div className="mt-6 space-y-6">
                {selectedFlowNode && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Previsualizacion activa</p>
                    <div className="mt-3 grid gap-4 lg:grid-cols-[280px,1fr,220px] lg:items-center">
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <img
                          src={selectedFlowNode.preview}
                          alt={`Preview ${selectedFlowNode.title}`}
                          className="h-44 w-full object-cover"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-slate-900/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                          Preview
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl font-semibold text-slate-900">{selectedFlowNode.title}</h4>
                        <p className="mt-1 text-sm text-slate-600">{selectedFlowNode.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedFlowNode.highlights.map((highlight) => (
                            <span
                              key={highlight}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">{selectedFlowTargetLabel}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenFlowNode(selectedFlowNode)}
                        className="h-fit w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                      >
                        {selectedFlowNode.target.type === 'admin'
                          ? 'Abrir en este panel'
                          : 'Abrir pagina en nueva pestaña'}
                      </button>
                    </div>
                  </div>
                )}

                <div
                  ref={flowCanvasRef}
                  className={`relative rounded-2xl border border-slate-200 bg-slate-50 p-4 ${
                    isFlowFullscreen ? 'h-screen overflow-auto rounded-none border-0 p-5' : ''
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Diagrama de flujo clásico (estilo ingeniería de procesos)
                    </p>
                    <span className="text-[11px] text-slate-500">
                      Inicio → Proceso → Decisión → Fin + ramas de retorno · arrastre activo en cualquier zoom
                    </span>
                  </div>

                  <div className="sticky top-2 z-30 mb-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/95 p-3 backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustFlowZoom(-0.1)}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          Zoom -
                        </button>
                        <button
                          type="button"
                          onClick={resetFlowZoom}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustFlowZoom(0.1)}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          Zoom +
                        </button>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                          Escala {Math.round(flowZoom * 100)}%
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                            flowLayoutDirty
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {flowLayoutDirty ? 'Cambios sin guardar' : 'Layout sincronizado'}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                          Current: {flowCurrentSource === 'remote' ? 'remoto' : flowCurrentSource === 'local' ? 'local' : 'base'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveFlowLayout}
                          disabled={flowRevisionSaving || flowRevisionLoading || !session?.access_token}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {flowRevisionSaving ? 'Guardando...' : 'Guardar revision'}
                        </button>
                        <button
                          type="button"
                          onClick={() => loadFlowLayout(session.access_token)}
                          disabled={flowRevisionSaving || flowRevisionLoading || !session?.access_token}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {flowRevisionLoading ? 'Cargando...' : 'Cargar ultima revision'}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetFlowLayout}
                          disabled={flowRevisionSaving}
                          className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Restablecer base
                        </button>
                        <button
                          type="button"
                          onClick={handleExportFlowPdf}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={toggleFlowFullscreen}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          {isFlowFullscreen ? 'Salir fullscreen' : 'Fullscreen'}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={flowRevisionNote}
                        onChange={(event) => setFlowRevisionNote(event.target.value)}
                        placeholder="Nota de revision (opcional)"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400 md:max-w-sm"
                      />
                      {flowLastSavedAt && (
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                          Ultima guardada: {formatDateTime(flowLastSavedAt)}
                          {flowLastSavedBy ? ` · ${flowLastSavedBy}` : ''}
                        </span>
                      )}
                    </div>

                    {flowRevisionError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {flowRevisionError}
                      </div>
                    )}
                    {!flowRevisionError && flowRevisionMessage && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        {flowRevisionMessage}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <div style={{ minWidth: `${Math.round(flowDiagramFrame.width)}px` }}>
                      <div
                        onMouseDown={handleFlowMouseDown}
                        className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white select-none ${
                          flowDragStart || flowNodeDragStart ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                      >
                        <div
                          style={{
                            transform: `translate(${flowPan.x}px, ${flowPan.y}px) scale(${flowZoom})`,
                            transformOrigin: 'top left',
                            width: '100%',
                          }}
                        >
                          <svg
                            id="admin-flow-classic-svg"
                            viewBox={`0 0 ${flowDiagramFrame.width} ${flowDiagramFrame.height}`}
                            style={{ height: `${Math.round(flowDiagramFrame.height)}px` }}
                            className="w-full bg-white"
                            role="img"
                            aria-label="Diagrama de flujo ramificado App/Web"
                          >
                            <defs>
                              <marker id="flow-classic-arrow" markerWidth="10" markerHeight="10" refX="8.5" refY="5" orient="auto">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                              </marker>
                              <marker
                                id="flow-classic-arrow-active"
                                markerWidth="10"
                                markerHeight="10"
                                refX="8.5"
                                refY="5"
                                orient="auto"
                              >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#1D4ED8" />
                              </marker>
                            </defs>

                            <text
                              x={flowDiagramFrame.width / 2}
                              y={32}
                              textAnchor="middle"
                              fontSize={18}
                              fontWeight={800}
                              fill="#0F172A"
                            >
                              Diagrama de flujo operativo App/Web
                            </text>
                            <text
                              x={flowDiagramFrame.width / 2}
                              y={52}
                              textAnchor="middle"
                              fontSize={12}
                              fontWeight={600}
                              fill="#64748B"
                            >
                              Ramificación por perfil con convergencia operativa y control admin
                            </text>

                            <g transform={`translate(${flowDiagramFrame.offsetX} ${flowDiagramFrame.offsetY})`}>
                              {flowBranchEdges.map((edge) => {
                                const isActive = selectedFlowEdgeIds.has(edge.id);
                                return (
                                  <g key={edge.id}>
                                    <path
                                      d={edge.path}
                                      fill="none"
                                      stroke={isActive ? '#1D4ED8' : '#334155'}
                                      strokeWidth={isActive ? 2.5 : 1.7}
                                      markerEnd={isActive ? 'url(#flow-classic-arrow-active)' : 'url(#flow-classic-arrow)'}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity={isActive ? 0.97 : 0.86}
                                    />
                                    {edge.label && (
                                      <text
                                        x={edge.labelX}
                                        y={edge.labelY}
                                        textAnchor="middle"
                                        fontSize={12}
                                        fontWeight={700}
                                        fill={edge.label === 'no' ? '#B91C1C' : '#0F172A'}
                                      >
                                        {edge.label}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}

                              {flowBranchNodes.map((item) => {
                                const { node, x, y, width, height } = item;
                                const isSelected = selectedFlowNode?.id === node.id;
                                const centerX = x + width / 2;
                                const centerY = y + height / 2;
                                const fillColor = isSelected
                                  ? '#0F172A'
                                  : node.shape === 'decision'
                                    ? '#1D4ED8'
                                    : node.shape === 'start' || node.shape === 'end'
                                      ? '#1E40AF'
                                      : '#2563EB';
                                const strokeColor = isSelected ? '#020617' : '#1E3A8A';
                                const code = flowNodeCodeMap.get(node.id) || node.id;
                                return (
                                  <g
                                    key={node.id}
                                    data-flow-node="true"
                                    onMouseDown={(event) => handleFlowNodeMouseDown(event, node.id)}
                                    onClick={() => handleFlowNodeSelect(node.id)}
                                    style={{ cursor: flowNodeDragStart?.nodeId === node.id ? 'grabbing' : 'grab' }}
                                    aria-label={`Paso ${code} - ${node.title}`}
                                  >
                                    <text x={x + 2} y={Math.max(18, y - 8)} fontSize={11} fontWeight={700} fill="#475569">
                                      {code} • {FLOW_SHAPE_LABEL[node.shape]}
                                    </text>
                                    {node.shape === 'decision' ? (
                                      <polygon
                                        points={`${centerX},${y} ${x + width},${centerY} ${centerX},${y + height} ${x},${centerY}`}
                                        fill={fillColor}
                                        stroke={strokeColor}
                                        strokeWidth={isSelected ? 2.8 : 2}
                                      />
                                    ) : (
                                      <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        rx={node.shape === 'start' || node.shape === 'end' ? 24 : 8}
                                        fill={fillColor}
                                        stroke={strokeColor}
                                        strokeWidth={isSelected ? 2.8 : 2}
                                      />
                                    )}
                                    <text
                                      x={centerX}
                                      y={centerY - (node.flowLabel.length > 1 ? 8 : 0)}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fontSize={node.shape === 'start' || node.shape === 'end' ? 21 : 16}
                                      fontWeight={800}
                                      fill="#FFFFFF"
                                    >
                                      {node.flowLabel.map((line, index) => (
                                        <tspan key={`${node.id}-${line}`} x={centerX} dy={index === 0 ? 0 : 16}>
                                          {line}
                                        </tspan>
                                      ))}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isFlowFullscreen && flowProcessDialogNode && (
                    <div className="pointer-events-none absolute right-5 top-20 z-40 max-w-sm">
                      <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/40">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Proceso seleccionado</p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-900">{flowProcessDialogNode.title}</h4>
                            <p className="text-xs text-slate-500">{flowProcessDialogNode.subtitle}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFlowProcessDialogNodeId(null)}
                            className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                          >
                            Cerrar
                          </button>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{flowProcessDialogNode.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {flowProcessDialogNode.highlights.slice(0, 3).map((highlight) => (
                            <span
                              key={`${flowProcessDialogNode.id}-${highlight}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] text-slate-500">{flowProcessDialogTargetLabel}</p>
                        <button
                          type="button"
                          onClick={() => handleOpenFlowNode(flowProcessDialogNode)}
                          className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Ir a este paso
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Ventana de ejecución</p>
                      <p className="text-sm font-semibold text-slate-900">Próximos 7 días</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roadmapExecutionSignal.badgeClass}`}>
                      {roadmapExecutionSignal.label}
                    </span>
                  </div>

                  <p className={`mt-2 text-xs ${roadmapExecutionSignal.textClass}`}>{roadmapExecutionSignal.description}</p>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Alertas SLA</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                          Críticas: {roadmapSlaSummary.critical}
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                          Advertencias: {roadmapSlaSummary.warning}
                        </span>
                        <button
                          type="button"
                          onClick={() => void runRoadmapSlaBatchAction('critical')}
                          disabled={roadmapSlaBatchApplying || roadmapSlaSummary.critical === 0}
                          className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {roadmapSlaBatchApplying ? 'Aplicando...' : 'Aplicar críticas'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runRoadmapSlaBatchAction('warning')}
                          disabled={roadmapSlaBatchApplying || roadmapSlaSummary.warning === 0}
                          className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {roadmapSlaBatchApplying ? 'Aplicando...' : 'Aplicar advertencias'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void runRoadmapSlaBatchAction('all')}
                          disabled={roadmapSlaBatchApplying || roadmapSlaAlerts.length === 0}
                          className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          {roadmapSlaBatchApplying ? 'Aplicando...' : 'Aplicar todo'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadCsv(
                              'roadmap_sla_alertas.csv',
                              roadmapSlaAlerts.map((alert) => {
                                const item = roadmapUpdates.find((entry) => entry.id === alert.roadmapId);
                                return {
                                  severidad: alert.severity === 'critical' ? 'Crítica' : 'Advertencia',
                                  regla: alert.rule,
                                  titulo: alert.title,
                                  detalle: alert.detail,
                                  accion_sugerida: alert.actionLabel,
                                  roadmap_id: alert.roadmapId,
                                  estado_actual: item ? getRoadmapStatusLabel(item.status) : '',
                                  prioridad: item ? getRoadmapPriorityLabel(item.priority) : '',
                                  responsable: item ? getRoadmapOwnerLabel(item.owner) : '',
                                  eta: item?.eta_date || '',
                                };
                              })
                            )
                          }
                          disabled={roadmapSlaAlerts.length === 0}
                          className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                        >
                          Exportar SLA
                        </button>
                      </div>
                    </div>
                    {roadmapSlaAlerts.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">Sin alertas SLA para los filtros actuales.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {roadmapSlaAlerts.slice(0, 6).map((alert) => {
                          const isUpdating = roadmapUpdatingId === alert.roadmapId;
                          return (
                            <div
                              key={alert.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="min-w-[220px] flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                      alert.severity === 'critical'
                                        ? 'border border-rose-200 bg-rose-50 text-rose-700'
                                        : 'border border-amber-200 bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {alert.severity === 'critical' ? 'Crítica' : 'Advertencia'}
                                  </span>
                                  <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">{alert.detail}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void applyRoadmapSlaSuggestion(alert)}
                                disabled={isUpdating}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {isUpdating ? 'Aplicando...' : alert.actionLabel}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Planificados</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{roadmapPlannedCount}</p>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600">Vencen en 7 días</p>
                      <p className="mt-1 text-lg font-semibold text-sky-700">{roadmapDueSoonItems.length}</p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-rose-600">Alta vencida</p>
                      <p className="mt-1 text-lg font-semibold text-rose-700">{roadmapOverdueHighPriorityCount}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">En progreso +7d</p>
                      <p className="mt-1 text-lg font-semibold text-amber-700">{roadmapStaleInProgressCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {roadmapDueSoonItems.length === 0 && (
                      <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                        No hay vencimientos en la próxima semana para los filtros activos.
                      </p>
                    )}
                    {roadmapDueSoonItems.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <div className="min-w-[180px] flex-1">
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {getRoadmapOwnerLabel(item.owner)} • {getRoadmapStatusLabel(item.status)} •{' '}
                            {getRoadmapPriorityLabel(item.priority)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-700">{formatShortDate(item.etaDate)}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.daysToEta === 0 ? 'Hoy' : `${item.daysToEta} día(s)`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Carga por responsable</p>
                    <span className="text-xs text-slate-500">Top 8 abiertos</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {roadmapOwnerOpenLoad.length === 0 && (
                      <p className="text-sm text-slate-500">No hay carga abierta para mostrar.</p>
                    )}
                    {roadmapOwnerOpenLoad.map((owner) => {
                      const width = Math.max(8, Math.round((owner.open / roadmapOwnerMaxOpen) * 100));
                      return (
                        <div key={owner.owner} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">{owner.owner}</p>
                            <p className="text-xs font-semibold text-slate-600">{owner.open} abierto(s)</p>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-slate-900" style={{ width: `${width}%` }} />
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">
                            En progreso {owner.inProgress} • Bloqueados {owner.blocked} • Vencidos {owner.overdue}
                          </p>
                        </div>
                      );
                    })}
                  </div>
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
                      <select
                        value={roadmapForm.sector}
                        onChange={(event) =>
                          setRoadmapForm((prev) => ({ ...prev, sector: event.target.value as RoadmapSector }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        {ROADMAP_SECTOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            Sector: {option.label}
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
                      <select
                        value={roadmapSectorFilter}
                        onChange={(event) => setRoadmapSectorFilter(event.target.value as 'all' | RoadmapSector)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        <option value="all">Todos los sectores</option>
                        {ROADMAP_SECTOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={roadmapSortMode}
                        onChange={(event) =>
                          setRoadmapSortMode(event.target.value as 'recent' | 'work_priority' | 'eta')
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                      >
                        <option value="recent">Orden: recientes</option>
                        <option value="work_priority">Orden: prioridad de trabajo</option>
                        <option value="eta">Orden: ETA</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setRoadmapPendingOnly((prev) => !prev)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          roadmapPendingOnly
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                      >
                        {roadmapPendingOnly ? 'Solo pendientes: ON' : 'Solo pendientes'}
                      </button>
                      <button
                        type="button"
                        onClick={toggleSelectAllFilteredPending}
                        disabled={!filteredPendingRoadmapIds.length}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {roadmapAllFilteredPendingSelected
                          ? 'Quitar visibles'
                          : `Seleccionar visibles (${filteredPendingRoadmapIds.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadCsv(
                            'roadmap_pendientes.csv',
                            orderedRoadmapUpdates
                              .filter((item) => item.status !== 'done')
                              .map((item) => ({
                                id: item.id,
                                titulo: item.title,
                                estado: getRoadmapStatusLabel(item.status),
                                prioridad: getRoadmapPriorityLabel(item.priority),
                                area: getRoadmapAreaLabel(item.area),
                                sector: getRoadmapSectorLabel(item.sector),
                                responsable: getRoadmapOwnerLabel(item.owner),
                                eta: item.eta_date || '',
                                actualizado: item.updated_at,
                                feedback: item.feedback?.length || 0,
                              }))
                          )
                        }
                        disabled={!orderedRoadmapUpdates.some((item) => item.status !== 'done')}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        Exportar pendientes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRoadmapSearch('');
                          setRoadmapStatusFilter('all');
                          setRoadmapAreaFilter('all');
                          setRoadmapSectorFilter('all');
                          setRoadmapPendingOnly(false);
                          setRoadmapSortMode('recent');
                        }}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {selectedRoadmapIds.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-700">
                          Seleccionados: {selectedRoadmapIds.length}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => runRoadmapBulkAction('start')}
                            disabled={roadmapBulkUpdating || !roadmapBulkAvailability.start}
                            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            Iniciar
                          </button>
                          <button
                            type="button"
                            onClick={() => runRoadmapBulkAction('unblock')}
                            disabled={roadmapBulkUpdating || !roadmapBulkAvailability.unblock}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            Desbloquear
                          </button>
                          <button
                            type="button"
                            onClick={() => runRoadmapBulkAction('block')}
                            disabled={roadmapBulkUpdating || !roadmapBulkAvailability.block}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            Bloquear
                          </button>
                          <button
                            type="button"
                            onClick={() => runRoadmapBulkAction('resolve')}
                            disabled={roadmapBulkUpdating || !roadmapBulkAvailability.resolve}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            Resolver
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRoadmapIds([])}
                            disabled={roadmapBulkUpdating}
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            Limpiar selección
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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

                  {!roadmapLoading && orderedRoadmapUpdates.length === 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No hay items para los filtros actuales.
                    </div>
                  )}

                  {!roadmapLoading && roadmapPendingQueue.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700">Pendientes para trabajar ahora</p>
                        <span className="text-xs font-semibold text-amber-700">{roadmapPendingQueue.length} sugeridos</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {roadmapPendingQueue.slice(0, 5).map((item) => {
                          const isUpdating = roadmapUpdatingId === item.id;
                          return (
                            <div
                              key={`queue-${item.id}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-[240px] flex-1">
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {getRoadmapStatusLabel(item.status)} • {getRoadmapPriorityLabel(item.priority)} •{' '}
                                  {item.owner ? getRoadmapOwnerLabel(item.owner) : 'Sin owner'}
                                  {item.overdue ? ' • ETA vencida' : item.dueSoon ? ' • ETA <= 7d' : ''}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.status === 'planned' && (
                                  <button
                                    type="button"
                                    onClick={() => runRoadmapQuickAction(item, 'start')}
                                    disabled={isUpdating}
                                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Iniciar
                                  </button>
                                )}
                                {item.status === 'blocked' && (
                                  <button
                                    type="button"
                                    onClick={() => runRoadmapQuickAction(item, 'unblock')}
                                    disabled={isUpdating}
                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Desbloquear
                                  </button>
                                )}
                                {item.status === 'in_progress' && (
                                  <button
                                    type="button"
                                    onClick={() => runRoadmapQuickAction(item, 'block')}
                                    disabled={isUpdating}
                                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  >
                                    Bloquear
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => runRoadmapQuickAction(item, 'resolve')}
                                  disabled={isUpdating}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Resolver
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    {orderedRoadmapUpdates.map((item) => {
                      const feedbackDraft = roadmapFeedbackDrafts[item.id] || '';
                      const feedbackSentiment = roadmapFeedbackSentiments[item.id] || 'neutral';
                      const savingUpdate = roadmapUpdatingId === item.id;
                      const savingFeedback = roadmapFeedbackSavingId === item.id;
                      const isSelected = roadmapSelectedIdSet.has(item.id);
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
                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">
                                  Sector {getRoadmapSectorLabel(item.sector)}
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
                              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(event) => toggleRoadmapSelection(item.id, event.target.checked)}
                                  className="h-4 w-4 rounded border border-slate-300 text-slate-900"
                                />
                                Sel
                              </label>
                              <select
                                value={item.status}
                                onChange={(event) => {
                                  const status = event.target.value as RoadmapStatus;
                                  if (status === item.status) return;
                                  patchRoadmapUpdate(item.id, { status }, {
                                    auditMessage: `Cambio manual: estado ${getRoadmapStatusLabel(item.status)} -> ${getRoadmapStatusLabel(status)}.`,
                                    auditSentiment: status === 'done' ? 'positive' : 'neutral',
                                    successMessage: 'Estado actualizado.',
                                  });
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
                                  patchRoadmapUpdate(item.id, { area }, {
                                    auditMessage: `Cambio manual: área ${getRoadmapAreaLabel(item.area)} -> ${getRoadmapAreaLabel(area)}.`,
                                    auditSentiment: 'neutral',
                                    successMessage: 'Área actualizada.',
                                  });
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
                                  patchRoadmapUpdate(item.id, { priority }, {
                                    auditMessage: `Cambio manual: prioridad ${getRoadmapPriorityLabel(item.priority)} -> ${getRoadmapPriorityLabel(priority)}.`,
                                    auditSentiment: priority === 'high' ? 'negative' : 'neutral',
                                    successMessage: 'Prioridad actualizada.',
                                  });
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
                              <select
                                value={item.sector}
                                onChange={(event) => {
                                  const sector = event.target.value as RoadmapSector;
                                  if (sector === item.sector) return;
                                  patchRoadmapUpdate(item.id, { sector }, {
                                    auditMessage: `Cambio manual: sector ${getRoadmapSectorLabel(item.sector)} -> ${getRoadmapSectorLabel(sector)}.`,
                                    auditSentiment: 'neutral',
                                    successMessage: 'Sector actualizado.',
                                  });
                                }}
                                disabled={savingUpdate}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                {ROADMAP_SECTOR_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    Sector: {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                key={`owner-${item.id}-${item.updated_at}`}
                                defaultValue={item.owner || ''}
                                onBlur={(event) => {
                                  const nextOwner = event.target.value.trim() || null;
                                  const currentOwner = item.owner?.trim() || null;
                                  if (nextOwner === currentOwner) return;
                                  patchRoadmapUpdate(item.id, { owner: nextOwner }, {
                                    auditMessage: `Cambio manual: responsable ${currentOwner || 'Sin asignar'} -> ${nextOwner || 'Sin asignar'}.`,
                                    auditSentiment: 'neutral',
                                    successMessage: 'Responsable actualizado.',
                                  });
                                }}
                                disabled={savingUpdate}
                                placeholder="Responsable"
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                              <input
                                key={`eta-${item.id}-${item.updated_at}`}
                                type="date"
                                defaultValue={item.eta_date || ''}
                                onChange={(event) => {
                                  const nextEta = event.target.value || null;
                                  const currentEta = item.eta_date || null;
                                  if (nextEta === currentEta) return;
                                  patchRoadmapUpdate(item.id, { eta_date: nextEta }, {
                                    auditMessage: `Cambio manual: ETA ${currentEta ? formatShortDate(currentEta) : 'Sin fecha'} -> ${nextEta ? formatShortDate(nextEta) : 'Sin fecha'}.`,
                                    auditSentiment: 'neutral',
                                    successMessage: 'ETA actualizada.',
                                  });
                                }}
                                disabled={savingUpdate}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                              {item.status === 'planned' && (
                                <button
                                  type="button"
                                  onClick={() => runRoadmapQuickAction(item, 'start')}
                                  disabled={savingUpdate}
                                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Iniciar
                                </button>
                              )}
                              {item.status === 'blocked' && (
                                <button
                                  type="button"
                                  onClick={() => runRoadmapQuickAction(item, 'unblock')}
                                  disabled={savingUpdate}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Desbloquear
                                </button>
                              )}
                              {item.status === 'in_progress' && (
                                <button
                                  type="button"
                                  onClick={() => runRoadmapQuickAction(item, 'block')}
                                  disabled={savingUpdate}
                                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Bloquear
                                </button>
                              )}
                              {item.status !== 'done' && (
                                <button
                                  type="button"
                                  onClick={() => runRoadmapQuickAction(item, 'resolve')}
                                  disabled={savingUpdate}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  Resolver
                                </button>
                              )}
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
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          'actividad_embudo.csv',
                          (activityData.funnel?.topEvents || []).map((item) => ({
                            evento: item.event_name,
                            eventos: item.count,
                            sesiones: item.sessions,
                            periodo_anterior: item.prevCount,
                          }))
                        )
                      }
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Exportar embudo
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

                  {activityData.funnel && (
                    <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">Embudo de conversion web</h4>
                          <p className="text-xs text-slate-500">Eventos clave de conversion y cambio de audiencia.</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Total eventos</p>
                          <p className="text-xl font-semibold text-slate-900">{formatNumber(activityData.funnel.totalEvents)}</p>
                          <p className={`text-xs ${getDeltaLabel(activityData.funnel.totalEvents, activityData.funnel.prevTotalEvents).tone}`}>
                            {getDeltaLabel(activityData.funnel.totalEvents, activityData.funnel.prevTotalEvents).text}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {activityData.funnel.steps.map((step) => (
                          <article key={step.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{step.label}</p>
                            <p className="mt-2 text-xl font-semibold text-slate-900">{formatNumber(step.count)}</p>
                            <p className="text-xs text-slate-500">{formatNumber(step.sessions)} sesion(es)</p>
                            <p className={`mt-1 text-xs ${getDeltaLabel(step.count, step.prevCount).tone}`}>
                              {getDeltaLabel(step.count, step.prevCount).text}
                            </p>
                          </article>
                        ))}
                      </div>

                      <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-semibold text-slate-800">Eventos mas frecuentes</h5>
                          <span className="text-xs text-slate-400">Top 12</span>
                        </div>
                        {activityData.funnel.topEvents.length === 0 && (
                          <p className="text-sm text-slate-500">Todavia no hay eventos de embudo registrados.</p>
                        )}
                        {activityData.funnel.topEvents.map((item) => (
                          <div
                            key={item.event_name}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{item.event_name}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{item.sessions} sesion(es) unicas</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-700">{formatNumber(item.count)} eventos</p>
                              <p className={`text-[11px] ${getDeltaLabel(item.count, item.prevCount).tone}`}>
                                {getDeltaLabel(item.count, item.prevCount).text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
