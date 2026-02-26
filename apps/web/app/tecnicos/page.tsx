'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Manrope } from 'next/font/google';
import {
  Bell,
  Calendar,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Home,
  ImagePlus,
  MessageCircle,
  Moon,
  Search,
  Sun,
  Tag,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/supabase';
import AuthHashHandler from '../../components/AuthHashHandler';
import type {
  AccessProfile,
  AttachmentRow,
  GeoResult,
  ItemForm,
  MasterItemRow,
  NavItem,
  NotificationRow,
  QuoteRow,
  QuoteItemRow,
} from './types';

const TAX_RATE = 0.21;
const SUPPORT_BUCKET = 'beta-support';
const SUPPORT_MAX_IMAGES = 4;
const SUPPORT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_PUBLIC_WEB_URL = 'https://www.urbanfix.com.ar';
const UI_THEME_STORAGE_KEY = 'urbanfix_ui_theme';
const ACCESS_VIDEO_URL = (process.env.NEXT_PUBLIC_ACCESS_VIDEO_URL || '/videos/vid-logout-mobile.mp4').trim();
const POST_LOGIN_VIDEO_URL = (process.env.NEXT_PUBLIC_POST_LOGIN_VIDEO_URL || '/videos/vid-login-mobile.mp4').trim();
const RESUME_STATIC_IMAGE_URL = (
  process.env.NEXT_PUBLIC_RESUME_STATIC_IMAGE_URL || '/videos/image-static-mobile.jpeg'
).trim();
const ACCESS_VIDEO_POSTER_URL = (
  process.env.NEXT_PUBLIC_ACCESS_VIDEO_POSTER_URL || RESUME_STATIC_IMAGE_URL || '/playstore/feature-graphic.png'
).trim();
const DASHBOARD_VIDEO_URL = (process.env.NEXT_PUBLIC_DASHBOARD_VIDEO_URL || POST_LOGIN_VIDEO_URL || ACCESS_VIDEO_URL).trim();
const ACCESS_ANDROID_URL = 'https://play.google.com/apps/testing/com.urbanfix.app';
const POST_LOGIN_VIDEO_MAX_MS = 10000;
const RESUME_STATIC_IMAGE_MS = 1200;
const COVERAGE_RADIUS_KM = 20;
const POST_LOGIN_VIDEO_SEEN_STORAGE_KEY = 'urbanfix_post_login_video_seen';

type WorkingHoursConfig = {
  weekdayFrom: string;
  weekdayTo: string;
  saturdayEnabled: boolean;
  saturdayFrom: string;
  saturdayTo: string;
  sundayEnabled: boolean;
  sundayFrom: string;
  sundayTo: string;
};

const DEFAULT_WORKING_HOURS_CONFIG: WorkingHoursConfig = {
  weekdayFrom: '09:00',
  weekdayTo: '18:00',
  saturdayEnabled: false,
  saturdayFrom: '09:00',
  saturdayTo: '13:00',
  sundayEnabled: false,
  sundayFrom: '09:00',
  sundayTo: '13:00',
};

const normalizeTimeValue = (value: string | null | undefined, fallback: string) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const normalizeTextForParsing = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const extractTimeRange = (value: string, pattern: RegExp): [string, string] | null => {
  const match = value.match(pattern);
  if (!match) return null;
  return [match[1], match[2]];
};

const parseWorkingHoursConfig = (rawValue: string | null | undefined): WorkingHoursConfig => {
  const safe = (rawValue || '').trim();
  const base: WorkingHoursConfig = { ...DEFAULT_WORKING_HOURS_CONFIG };
  if (!safe) return base;

  try {
    const parsed = JSON.parse(safe);
    if (parsed && typeof parsed === 'object') {
      const weekday = (parsed as any).weekday || {};
      const saturday = (parsed as any).saturday || {};
      const sunday = (parsed as any).sunday || {};
      return {
        weekdayFrom: normalizeTimeValue(weekday.from, base.weekdayFrom),
        weekdayTo: normalizeTimeValue(weekday.to, base.weekdayTo),
        saturdayEnabled: Boolean(saturday.enabled),
        saturdayFrom: normalizeTimeValue(saturday.from, base.saturdayFrom),
        saturdayTo: normalizeTimeValue(saturday.to, base.saturdayTo),
        sundayEnabled: Boolean(sunday.enabled),
        sundayFrom: normalizeTimeValue(sunday.from, base.sundayFrom),
        sundayTo: normalizeTimeValue(sunday.to, base.sundayTo),
      };
    }
  } catch {
    // Legacy plain-text value.
  }

  const normalized = normalizeTextForParsing(safe);
  const weekdayRange =
    extractTimeRange(
      normalized,
      /lun(?:es)?\s*(?:a|-|al)\s*vie(?:rnes)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
    ) || extractTimeRange(normalized, /(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/);
  const saturdayRange = extractTimeRange(
    normalized,
    /sab(?:ado)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
  );
  const sundayRange = extractTimeRange(
    normalized,
    /dom(?:ingo)?[^0-9]*(\d{1,2}:\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}:\d{2})/
  );

  if (weekdayRange) {
    base.weekdayFrom = normalizeTimeValue(weekdayRange[0], base.weekdayFrom);
    base.weekdayTo = normalizeTimeValue(weekdayRange[1], base.weekdayTo);
  }
  if (saturdayRange) {
    base.saturdayEnabled = true;
    base.saturdayFrom = normalizeTimeValue(saturdayRange[0], base.saturdayFrom);
    base.saturdayTo = normalizeTimeValue(saturdayRange[1], base.saturdayTo);
  }
  if (sundayRange) {
    base.sundayEnabled = true;
    base.sundayFrom = normalizeTimeValue(sundayRange[0], base.sundayFrom);
    base.sundayTo = normalizeTimeValue(sundayRange[1], base.sundayTo);
  }

  return base;
};

const formatWorkingHoursLabel = (config: WorkingHoursConfig) => {
  const chunks = [`Lun a Vie ${config.weekdayFrom} - ${config.weekdayTo}`];
  if (config.saturdayEnabled) {
    chunks.push(`Sab ${config.saturdayFrom} - ${config.saturdayTo}`);
  }
  if (config.sundayEnabled) {
    chunks.push(`Dom ${config.sundayFrom} - ${config.sundayTo}`);
  }
  return chunks.join(' | ');
};

const buildWorkingHoursPayload = (config: WorkingHoursConfig) =>
  JSON.stringify({
    version: 1,
    weekday: { from: config.weekdayFrom, to: config.weekdayTo },
    saturday: { enabled: config.saturdayEnabled, from: config.saturdayFrom, to: config.saturdayTo },
    sunday: { enabled: config.sundayEnabled, from: config.sundayFrom, to: config.sundayTo },
    label: formatWorkingHoursLabel(config),
  });

const buildCoverageAreaLabel = (city: string) => {
  const normalizedCity = city.trim();
  return normalizedCity
    ? `Radio de ${COVERAGE_RADIUS_KM} km desde ${normalizedCity}`
    : `Radio de ${COVERAGE_RADIUS_KM} km desde tu ciudad base`;
};

const TECH_SPECIALTY_OPTIONS = [
  'Electricidad',
  'Plomeria',
  'Gas',
  'Albanileria',
  'Pintura',
  'Herreria',
  'Carpinteria',
  'Aire acondicionado',
  'Refrigeracion',
  'Cerrajeria',
  'Impermeabilizacion',
  'Techos',
  'Jardineria',
  'Limpieza',
];

const TAX_STATUS_OPTIONS = [
  'Monotributista',
  'Responsable inscripto',
  'Exento',
  'Consumidor final',
  'No alcanzado',
];

const PAYMENT_METHOD_OPTIONS = [
  'Transferencia bancaria',
  'Efectivo',
  'Mercado Pago',
  'Tarjeta de debito',
  'Tarjeta de credito',
  'Cuenta corriente',
  'Cheque',
];

const parseDelimitedValues = (value: string | null | undefined) => {
  const parts = String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  parts.forEach((item) => {
    const key = normalizeTextForParsing(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique;
};

const serializeDelimitedValues = (values: string[]) => values.join(', ');

const normalizeSocialUrl = (value: string) => {
  const raw = value.trim();
  if (!raw) return '';
  const prefixed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(prefixed).toString();
  } catch {
    return raw;
  }
};

const toSafeUrl = (value: string) => {
  const normalized = normalizeSocialUrl(value);
  if (!normalized) return '';
  try {
    return new URL(normalized).toString();
  } catch {
    return '';
  }
};

const buildFacebookTimelineEmbedUrl = (value: string) => {
  const url = toSafeUrl(value);
  if (!url) return '';
  return `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
    url
  )}&tabs=timeline&width=500&height=460&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
};

const buildInstagramEmbedUrl = (value: string) => {
  const normalized = toSafeUrl(value);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('instagram.com')) return '';
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/') return '';
    if (/\/(p|reel|tv)\//i.test(cleanPath)) {
      return `https://www.instagram.com${cleanPath}/embed`;
    }
    const handle = cleanPath.split('/').filter(Boolean)[0];
    if (!handle) return '';
    return `https://www.instagram.com/${handle}/embed`;
  } catch {
    return '';
  }
};

const normalizeTaxId = (value: string) => value.replace(/\D/g, '').slice(0, 11);

const formatTaxId = (value: string) => {
  const digits = normalizeTaxId(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
};

const isValidCuit = (value: string) => {
  const digits = normalizeTaxId(value);
  if (digits.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const base = digits
    .slice(0, 10)
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const mod = 11 - (base % 11);
  const checkDigit = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return checkDigit === Number(digits[10]);
};

const normalizeAlias = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 20);

const isValidAlias = (value: string) => /^[a-z0-9][a-z0-9._-]{5,19}$/i.test(value);

const normalizeCbu = (value: string) => value.replace(/\D/g, '').slice(0, 22);

const isValidCbu = (value: string) => {
  const cbu = normalizeCbu(value);
  if (cbu.length !== 22) return false;
  const bankBlock = cbu.slice(0, 8);
  const accountBlock = cbu.slice(8);

  const bankWeights = [7, 1, 3, 9, 7, 1, 3];
  const bankSum = bankWeights.reduce((acc, weight, index) => acc + weight * Number(bankBlock[index]), 0);
  const bankCheck = (10 - (bankSum % 10)) % 10;
  if (bankCheck !== Number(bankBlock[7])) return false;

  const accountWeights = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];
  const accountSum = accountWeights.reduce(
    (acc, weight, index) => acc + weight * Number(accountBlock[index]),
    0
  );
  const accountCheck = (10 - (accountSum % 10)) % 10;
  return accountCheck === Number(accountBlock[13]);
};

const parseSpecialties = (value: string | null | undefined) => {
  const parts = String(value || '')
    .split(/[\n,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  parts.forEach((item) => {
    const key = normalizeTextForParsing(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique;
};

const serializeSpecialties = (specialties: string[]) => specialties.join(', ');

const upsertSpecialty = (currentValue: string, specialty: string) => {
  const normalizedSpecialty = specialty.trim();
  if (!normalizedSpecialty) return currentValue;
  const current = parseSpecialties(currentValue);
  const currentKeys = new Set(current.map((item) => normalizeTextForParsing(item)));
  const nextKey = normalizeTextForParsing(normalizedSpecialty);
  if (currentKeys.has(nextKey)) return currentValue;
  return serializeSpecialties([...current, normalizedSpecialty]);
};

const toggleSpecialty = (currentValue: string, specialty: string) => {
  const normalizedSpecialty = specialty.trim();
  if (!normalizedSpecialty) return currentValue;
  const nextKey = normalizeTextForParsing(normalizedSpecialty);
  const current = parseSpecialties(currentValue);
  const filtered = current.filter((item) => normalizeTextForParsing(item) !== nextKey);
  if (filtered.length !== current.length) {
    return serializeSpecialties(filtered);
  }
  return serializeSpecialties([...current, normalizedSpecialty]);
};

type NearbyRequestRow = {
  id: string;
  title: string;
  category: string;
  city: string;
  address: string;
  description: string;
  urgency: string;
  preferred_window: string | null;
  status: string;
  mode: string;
  created_at: string;
  distance_km: number;
  match_radius_km: number;
  location_lat?: number | null;
  location_lng?: number | null;
  my_quote_status?: string | null;
  my_price_ars?: number | null;
  my_eta_hours?: number | null;
  my_quote_updated_at?: string | null;
};

type RequestOfferDraft = {
  priceArs: string;
  etaHours: string;
};

type DashboardMapPoint = {
  id: string;
  kind: 'job' | 'request';
  title: string;
  subtitle: string;
  meta: string;
  lat: number;
  lon: number;
  createdAt: string;
};

const geocodeAddressFirstResult = async (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    trimmed
  )}&addressdetails=1&email=info@urbanfix.com.ar`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  const first = rows[0];
  if (!first) return null;
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    display_name: first.display_name,
    lat,
    lon,
  };
};

const urgencyBadgeClass = (urgency: string) => {
  const normalized = urgency.toLowerCase();
  if (normalized === 'alta') return 'bg-rose-100 text-rose-700';
  if (normalized === 'media') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const urgencyPriority = (urgency: string | null | undefined) => {
  const normalized = String(urgency || '').toLowerCase();
  if (normalized === 'alta') return 0;
  if (normalized === 'media') return 1;
  return 2;
};

const requestQuoteStatusLabel = (status: string | null | undefined) => {
  const normalized = String(status || '').toLowerCase().trim();
  if (!normalized || normalized === 'pending') return 'Sin oferta';
  if (normalized === 'submitted') return 'Oferta enviada';
  if (normalized === 'accepted') return 'Oferta aceptada';
  if (normalized === 'rejected') return 'Oferta rechazada';
  return normalized.toUpperCase();
};

const requestQuoteStatusClass = (status: string | null | undefined) => {
  const normalized = String(status || '').toLowerCase().trim();
  if (!normalized || normalized === 'pending') return 'bg-slate-100 text-slate-700';
  if (normalized === 'submitted') return 'bg-sky-100 text-sky-700';
  if (normalized === 'accepted') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const themeStyles = {
  '--ui-bg': '#F5F4F0',
  '--ui-card': '#FFFFFF',
  '--ui-border': '#E2E8F0',
  '--ui-ink': '#0F172A',
  '--ui-muted': '#64748B',
  '--ui-accent': '#111827',
  '--ui-accent-soft': '#F5B942',
} as React.CSSProperties;

const darkThemeStyles = {
  '--ui-bg': '#0B1220',
  '--ui-card': '#0F172A',
  '--ui-border': '#334155',
  '--ui-ink': '#E2E8F0',
  '--ui-muted': '#94A3B8',
  '--ui-accent': '#1F2937',
  '--ui-accent-soft': '#F5B942',
} as React.CSSProperties;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const getPublicBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_PUBLIC_WEB_URL;
  if (envUrl && envUrl.trim()) {
    return normalizeBaseUrl(envUrl.trim());
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_WEB_URL;
};

const buildQuoteLink = (quoteId: string) => `${getPublicBaseUrl()}/p/${quoteId}`;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());

const extractQuoteId = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (match) return match[0];
  if (trimmed.includes('/p/')) {
    const [, tail] = trimmed.split('/p/');
    const clean = tail?.split(/[?#]/)[0] || '';
    return clean;
  }
  return trimmed;
};

const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: 'Computo', className: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Presentado', className: 'bg-sky-100 text-sky-700' },
  presented: { label: 'Presentado', className: 'bg-sky-100 text-sky-700' },
  approved: { label: 'Aprobado', className: 'bg-emerald-100 text-emerald-700' },
  accepted: { label: 'Aceptado', className: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Cobrado', className: 'bg-emerald-50 text-emerald-700' },
  cobrado: { label: 'Cobrado', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rechazado', className: 'bg-rose-100 text-rose-700' },
  locked: { label: 'Bloqueado', className: 'bg-slate-200 text-slate-600' },
  completed: { label: 'Finalizado', className: 'bg-indigo-100 text-indigo-700' },
  finalizado: { label: 'Finalizado', className: 'bg-indigo-100 text-indigo-700' },
};

const pendingStatuses = new Set(['pending', 'sent', 'presented']);
const approvedStatuses = new Set(['approved', 'accepted']);
const draftStatuses = new Set(['draft', 'borrador']);
const completedStatuses = new Set(['completed', 'completado', 'finalizado', 'finalizados']);
const paidStatuses = new Set(['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged']);
const readyToScheduleStatuses = new Set(['approved', 'accepted']);
const billingStatuses = new Set([
  'approved',
  'accepted',
  'paid',
  'cobrado',
  'cobrados',
  'pagado',
  'pagados',
  'completed',
  'completado',
  'finalizado',
]);

const normalizeStatusValue = (status?: string | null) => {
  const normalized = (status || '').toLowerCase();
  if (!normalized) return 'draft';
  if (normalized === 'accepted') return 'approved';
  if (normalized === 'sent') return 'presented';
  if (normalized === 'finalizado') return 'completed';
  if (normalized === 'cobrado' || normalized === 'cobrados' || normalized === 'pagado' || normalized === 'pagados')
    return 'paid';
  if (normalized === 'presented' || normalized === 'pending') return normalized;
  if (normalized === 'approved' || normalized === 'completed' || normalized === 'paid' || normalized === 'draft')
    return normalized;
  if (draftStatuses.has(normalized)) return 'draft';
  if (pendingStatuses.has(normalized)) return 'pending';
  if (approvedStatuses.has(normalized)) return 'approved';
  if (completedStatuses.has(normalized)) return 'completed';
  if (paidStatuses.has(normalized)) return 'paid';
  return 'draft';
};

const toNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseArsInput = (value: string) => {
  const normalized = String(value || '').trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseEtaInput = (value: string) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildRequestOfferDraft = (request: NearbyRequestRow): RequestOfferDraft => ({
  priceArs:
    request.my_price_ars === null || request.my_price_ars === undefined ? '' : String(Math.round(request.my_price_ars)),
  etaHours:
    request.my_eta_hours === null || request.my_eta_hours === undefined ? '' : String(Math.round(request.my_eta_hours)),
});

const toFiniteCoordinate = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toAmountValue = (value: any) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeQuoteItemType = (metadata: any) => {
  const raw = metadata?.type;
  if (!raw) return 'labor';
  const value = String(raw).toLowerCase().trim();
  if (value === 'material') return 'material';
  return 'labor';
};

const getLaborAmount = (quote: QuoteRow) => {
  const items = Array.isArray(quote.quote_items) ? quote.quote_items : [];
  const laborSubtotal = items.reduce((acc, item) => {
    const type = normalizeQuoteItemType(item?.metadata);
    if (type === 'material') return acc;
    const unitPrice = toAmountValue(item?.unit_price);
    const quantity = toAmountValue(item?.quantity);
    return acc + unitPrice * quantity;
  }, 0);
  const discountPercent = Math.min(100, Math.max(0, toAmountValue(quote.discount_percent ?? 0)));
  return laborSubtotal * (1 - discountPercent / 100);
};

const normalizeQuoteRow = (quote: QuoteRow) => ({
  ...quote,
  total_amount: toAmountValue(quote.total_amount),
  tax_rate:
    quote.tax_rate === null || quote.tax_rate === undefined
      ? null
      : toAmountValue(quote.tax_rate),
  discount_percent:
    quote.discount_percent === null || quote.discount_percent === undefined
      ? null
      : toAmountValue(quote.discount_percent),
});

const formatCurrency = (value: number) =>
  `$${Number(value || 0).toLocaleString('es-AR')}`;

const getQuoteAddress = (quote: QuoteRow) =>
  quote.client_address || quote.address || quote.location_address || '';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const buildAttachmentPath = (userId: string, quoteId: string, fileName: string) =>
  `${userId}/quotes/${quoteId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFileName(fileName)}`;

const isEmailLike = (value: string) => /.+@.+\..+/.test(value);

const resolveLogoPresentation = (ratio: number, shape?: string | null) => {
  const normalized = (shape || 'auto').toLowerCase();
  let mode = normalized;
  if (mode === 'auto') {
    mode = ratio >= 1.3 || ratio <= 0.75 ? 'rect' : 'square';
  }
  if (mode === 'round') {
    return { frame: 'rounded-full', img: 'object-cover', padding: '' };
  }
  if (mode === 'rect') {
    return { frame: 'rounded-xl', img: 'object-contain', padding: 'p-1' };
  }
  return { frame: 'rounded-2xl', img: 'object-contain', padding: 'p-0.5' };
};

const resolveLogoAspect = (ratio: number, shape?: string | null) => {
  const normalized = (shape || 'auto').toLowerCase();
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  if (normalized === 'round' || normalized === 'square') return 1;
  return ratio;
};

const isImageAttachment = (attachment: AttachmentRow) => {
  if (attachment.file_type && attachment.file_type.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment.file_url || '');
};

const getAttachmentStoragePath = (publicUrl?: string | null) => {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/urbanfix-assets/';
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
};

type CertificationFileRow = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  storagePath: string | null;
  uploadedAt: string;
};

const CERT_FILES_TAG_START = '<!-- UFX_CERT_FILES ';
const CERT_FILES_TAG_END = ' -->';
const CERT_ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx']);
const CERT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const CERT_MAX_FILES = 12;

const parseCertificationFilesTag = (rawValue: string | null | undefined) => {
  const text = String(rawValue || '');
  const startIndex = text.lastIndexOf(CERT_FILES_TAG_START);
  if (startIndex === -1) {
    return {
      notes: text.trim(),
      files: [] as CertificationFileRow[],
    };
  }
  const endIndex = text.indexOf(CERT_FILES_TAG_END, startIndex + CERT_FILES_TAG_START.length);
  if (endIndex === -1) {
    return {
      notes: text.trim(),
      files: [] as CertificationFileRow[],
    };
  }

  const notes = text.slice(0, startIndex).trim();
  const payloadRaw = text.slice(startIndex + CERT_FILES_TAG_START.length, endIndex).trim();
  try {
    const parsed = JSON.parse(payloadRaw);
    const rows = Array.isArray(parsed) ? parsed : [];
    const files = rows
      .map((item: any) => ({
        id: String(item?.id || ''),
        name: String(item?.name || ''),
        url: String(item?.url || ''),
        fileType: String(item?.fileType || ''),
        storagePath: item?.storagePath ? String(item.storagePath) : null,
        uploadedAt: String(item?.uploadedAt || ''),
      }))
      .filter((item) => item.url && item.name)
      .map((item) => ({
        id: item.id || Math.random().toString(36).slice(2),
        name: item.name,
        url: item.url,
        fileType: item.fileType || '',
        storagePath: item.storagePath,
        uploadedAt: item.uploadedAt || new Date().toISOString(),
      }));

    return { notes, files };
  } catch {
    return {
      notes,
      files: [] as CertificationFileRow[],
    };
  }
};

const buildCertificationsField = (notes: string, files: CertificationFileRow[]) => {
  const trimmedNotes = notes.trim();
  if (!files.length) return trimmedNotes;
  const payload = JSON.stringify(
    files.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      fileType: item.fileType || '',
      storagePath: item.storagePath || null,
      uploadedAt: item.uploadedAt,
    }))
  );
  return trimmedNotes
    ? `${trimmedNotes}\n\n${CERT_FILES_TAG_START}${payload}${CERT_FILES_TAG_END}`
    : `${CERT_FILES_TAG_START}${payload}${CERT_FILES_TAG_END}`;
};

const buildCertificationStoragePath = (userId: string, fileName: string) =>
  `${userId}/certifications/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFileName(fileName)}`;

const isAllowedCertificationFile = (file: File) => {
  const fileName = file.name || '';
  const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  if (CERT_ALLOWED_EXTENSIONS.has(extension)) return true;
  const mime = file.type || '';
  if (mime === 'application/pdf') return true;
  if (mime.startsWith('image/')) return true;
  if (mime === 'application/msword') return true;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;
  return false;
};

const buildItemsSignature = (items: ItemForm[]) =>
  JSON.stringify(
    items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      type: item.type,
    }))
  );

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const buildOsmEmbedUrl = (lat: number, lon: number) => {
  const delta = 0.004;
  const left = lon - delta;
  const right = lon + delta;
  const bottom = lat - delta;
  const top = lat + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
};

const buildOsmLink = (lat: number, lon: number, zoom = 16) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;

const clampLatitude = (value: number) => Math.max(-85, Math.min(85, value));

const clampLongitude = (value: number) => {
  if (value > 180) return 180;
  if (value < -180) return -180;
  return value;
};

const buildOsmStaticMultiMarkerUrl = (points: DashboardMapPoint[]) => {
  if (!points.length) return '';
  const maxMarkers = 40;
  const limitedPoints = points.slice(0, maxMarkers);
  const lats = limitedPoints.map((point) => point.lat);
  const lons = limitedPoints.map((point) => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.015);
  const lonSpan = Math.max(maxLon - minLon, 0.015);
  const marginLat = Math.max(latSpan * 0.25, 0.01);
  const marginLon = Math.max(lonSpan * 0.25, 0.01);
  const left = clampLongitude(minLon - marginLon);
  const right = clampLongitude(maxLon + marginLon);
  const bottom = clampLatitude(minLat - marginLat);
  const top = clampLatitude(maxLat + marginLat);
  const markerParams = limitedPoints
    .map((point) => {
      const markerStyle = point.kind === 'request' ? 'orange-pushpin' : 'green-pushpin';
      return `markers=${encodeURIComponent(`${point.lat},${point.lon},${markerStyle}`)}`;
    })
    .join('&');
  return `https://staticmap.openstreetmap.de/staticmap.php?bbox=${left.toFixed(6)},${bottom.toFixed(
    6
  )},${right.toFixed(6)},${top.toFixed(6)}&size=1280x720&maptype=mapnik&${markerParams}`;
};

const RUBRO_ORDER = ['gas', 'sanitario', 'electricidad', 'albanileria'];
const RUBRO_LABELS: Record<string, string> = {
  gas: 'Gas',
  sanitario: 'Sanitario',
  electricidad: 'Electricidad',
  albanileria: 'AlbaÃ±ileria',
};

const resolveMasterRubro = (item: MasterItemRow) => {
  const raw = [item.category, item.source_ref, item.name].filter(Boolean).join(' ');
  const normalized = normalizeText(raw);
  if (normalized.includes('gas')) return 'gas';
  if (
    normalized.includes('electric') ||
    normalized.includes('electrico') ||
    normalized.includes('tablero') ||
    normalized.includes('cableado') ||
    normalized.includes('luminaria') ||
    normalized.includes('tomacorriente')
  ) {
    return 'electricidad';
  }
  if (
    normalized.includes('albanil') ||
    normalized.includes('albaniler') ||
    normalized.includes('mamposter') ||
    normalized.includes('revoque') ||
    normalized.includes('cemento') ||
    normalized.includes('ladrillo')
  ) {
    return 'albanileria';
  }
  return 'sanitario';
};

const formatRubroLabel = (value: string) => {
  if (value === 'albanileria') return 'Albanileria';
  return RUBRO_LABELS[value] || value;
};

const parseDateLocal = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const translateProfileError = (message: string) => {
  if (!message) return 'No pudimos guardar los cambios.';
  const lower = message.toLowerCase();
  if (
    lower.includes('profile_published') ||
    lower.includes('profile_published_at') ||
    lower.includes('facebook_url') ||
    lower.includes('instagram_url')
  ) {
    return 'Falta la migracion de perfil publico/redes en Supabase. Ejecutala y reintenta.';
  }
  if (lower.includes('cuit/cuil')) {
    return 'El CUIT/CUIL ingresado no es valido.';
  }
  if (lower.includes('cbu')) {
    return 'El CBU ingresado no es valido.';
  }
  if (lower.includes('alias')) {
    return 'El alias ingresado no es valido.';
  }
  if (lower.includes("could not find the 'email' column")) {
    return "No se encontro la columna 'email' en perfiles. Ejecuta la migracion y reintenta.";
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'No se pudo guardar. Revisa permisos o politicas de seguridad.';
  }
  if (lower.includes('duplicate key')) {
    return 'Ya existe un perfil con esos datos.';
  }
  if (lower.includes('not null')) {
    return 'Faltan campos obligatorios en el perfil.';
  }
  return 'No pudimos guardar los cambios.';
};

const getSupportUploadExtension = (file: File) => {
  const name = file.name || '';
  const fromName = name.includes('.') ? name.split('.').pop() : '';
  if (fromName) {
    return fromName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  const mime = file.type || '';
  if (mime.includes('/')) {
    return mime.split('/')[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  return 'jpg';
};

const isAccessProfile = (value: string | null): value is AccessProfile =>
  value === 'tecnico' || value === 'empresa' || value === 'cliente';

const getPostLoginVideoSeenKey = (userId: string) => `${POST_LOGIN_VIDEO_SEEN_STORAGE_KEY}:${userId}`;

const hasSeenPostLoginVideo = (userId: string) => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(getPostLoginVideoSeenKey(userId)) === '1';
  } catch {
    return false;
  }
};

const markPostLoginVideoAsSeen = (userId: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getPostLoginVideoSeenKey(userId), '1');
  } catch {
    // Ignore storage errors (private mode / quota), fallback keeps current behavior.
  }
};

export default function TechniciansPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [quickRegisterMode, setQuickRegisterMode] = useState(false);
  const [autoGoogleStarted, setAutoGoogleStarted] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [selectedAccessProfile, setSelectedAccessProfile] = useState<AccessProfile | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [updatingRecovery, setUpdatingRecovery] = useState(false);
  const [isBetaAdmin, setIsBetaAdmin] = useState(false);
  const [adminGateStatus, setAdminGateStatus] = useState<'idle' | 'checking' | 'done'>('idle');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoSelected, setGeoSelected] = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [supportDraft, setSupportDraft] = useState('');
  const [supportAttachments, setSupportAttachments] = useState<{ file: File; previewUrl: string }[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const supportFileInputRef = useRef<HTMLInputElement | null>(null);
  const supportAttachmentsRef = useRef<{ previewUrl: string }[]>([]);
  const [accessVideoMuted, setAccessVideoMuted] = useState(true);
  const [accessVideoAvailable, setAccessVideoAvailable] = useState(Boolean(ACCESS_VIDEO_URL));
  const [dashboardVideoAvailable, setDashboardVideoAvailable] = useState(Boolean(DASHBOARD_VIDEO_URL));
  const [postLoginVideoAvailable, setPostLoginVideoAvailable] = useState(Boolean(POST_LOGIN_VIDEO_URL));
  const [postLoginVideoVisible, setPostLoginVideoVisible] = useState(false);
  const [postLoginVideoPending, setPostLoginVideoPending] = useState(false);
  const [resumeStaticVisible, setResumeStaticVisible] = useState(false);
  const resumeStaticTimerRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const accessVideoRef = useRef<HTMLVideoElement | null>(null);
  const dashboardVideoRef = useRef<HTMLVideoElement | null>(null);
  const postLoginVideoRef = useRef<HTMLVideoElement | null>(null);
  const [nearbyRequests, setNearbyRequests] = useState<NearbyRequestRow[]>([]);
  const [loadingNearbyRequests, setLoadingNearbyRequests] = useState(false);
  const [nearbyRequestsError, setNearbyRequestsError] = useState('');
  const [nearbyRequestsWarning, setNearbyRequestsWarning] = useState('');
  const [technicianWithinWorkingHours, setTechnicianWithinWorkingHours] = useState<boolean | null>(null);
  const [technicianWorkingHoursLabel, setTechnicianWorkingHoursLabel] = useState('');
  const [technicianRadiusKm, setTechnicianRadiusKm] = useState(COVERAGE_RADIUS_KM);
  const [requestBoardCategoryFilter, setRequestBoardCategoryFilter] = useState('all');
  const [requestBoardCityFilter, setRequestBoardCityFilter] = useState('all');
  const [requestBoardModeFilter, setRequestBoardModeFilter] = useState<'all' | 'marketplace' | 'direct'>('all');
  const [requestBoardUrgencyFilter, setRequestBoardUrgencyFilter] = useState<'all' | 'alta' | 'media' | 'baja'>('all');
  const [requestBoardSort, setRequestBoardSort] = useState<'recent' | 'distance' | 'urgency'>('recent');
  const [dashboardMapFilter, setDashboardMapFilter] = useState<'all' | 'jobs' | 'requests'>('all');
  const [dashboardMapSelectedId, setDashboardMapSelectedId] = useState('');
  const [offerEditorRequestId, setOfferEditorRequestId] = useState('');
  const [offerDraftByRequestId, setOfferDraftByRequestId] = useState<Record<string, RequestOfferDraft>>({});
  const [submittingOfferRequestId, setSubmittingOfferRequestId] = useState('');
  const [offerSuccessByRequestId, setOfferSuccessByRequestId] = useState<Record<string, string>>({});
  const [offerErrorByRequestId, setOfferErrorByRequestId] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState<any>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    coverageArea: '',
    workingHours: '',
    weekdayFrom: DEFAULT_WORKING_HOURS_CONFIG.weekdayFrom,
    weekdayTo: DEFAULT_WORKING_HOURS_CONFIG.weekdayTo,
    saturdayEnabled: DEFAULT_WORKING_HOURS_CONFIG.saturdayEnabled,
    saturdayFrom: DEFAULT_WORKING_HOURS_CONFIG.saturdayFrom,
    saturdayTo: DEFAULT_WORKING_HOURS_CONFIG.saturdayTo,
    sundayEnabled: DEFAULT_WORKING_HOURS_CONFIG.sundayEnabled,
    sundayFrom: DEFAULT_WORKING_HOURS_CONFIG.sundayFrom,
    sundayTo: DEFAULT_WORKING_HOURS_CONFIG.sundayTo,
    specialties: '',
    certifications: '',
    facebookUrl: '',
    instagramUrl: '',
    profilePublished: false,
    taxId: '',
    taxStatus: '',
    paymentMethod: '',
    bankAlias: '',
    defaultCurrency: 'ARS',
    defaultTaxRate: 0.21,
    defaultDiscount: 0,
    companyLogoUrl: '',
    avatarUrl: '',
    logoShape: 'auto',
  });
  const [customSpecialtyDraft, setCustomSpecialtyDraft] = useState('');
  const [customPaymentMethodDraft, setCustomPaymentMethodDraft] = useState('');
  const [bankAccountType, setBankAccountType] = useState<'alias' | 'cbu'>('alias');
  const [certificationFiles, setCertificationFiles] = useState<CertificationFileRow[]>([]);
  const [uploadingCertificationFiles, setUploadingCertificationFiles] = useState(false);
  const [certificationFilesError, setCertificationFilesError] = useState('');
  const certificationFileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [autoSaveBootstrapped, setAutoSaveBootstrapped] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [profilePersistTick, setProfilePersistTick] = useState(0);
  const lastPersistedProfileSignatureRef = useRef('');
  const profilePersistInFlightRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveMessageTimerRef = useRef<number | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoRatio, setLogoRatio] = useState(1);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [masterItems, setMasterItems] = useState<MasterItemRow[]>([]);
  const [loadingMasterItems, setLoadingMasterItems] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterCategory, setMasterCategory] = useState('all');
  const [navSearch, setNavSearch] = useState('');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>('light');
  const savingRef = useRef(false);
  const lastSavedItemsSignatureRef = useRef('');
  const lastSavedItemsCountRef = useRef(0);
  const [activeTab, setActiveTab] = useState<
    | 'lobby'
    | 'nuevo'
    | 'presupuestos'
    | 'visualizador'
    | 'soporte'
    | 'agenda'
    | 'perfil'
    | 'precios'
    | 'historial'
    | 'notificaciones'
  >('lobby');
  const [profilePanelTab, setProfilePanelTab] = useState<'editor' | 'preview'>('editor');
  const [viewerInput, setViewerInput] = useState('');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<'all' | 'pending' | 'approved' | 'draft' | 'completed' | 'paid'>(
    'all'
  );
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [scheduleSavingId, setScheduleSavingId] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'pending' | 'scheduled'>('all');
  const activeThemeStyles = uiTheme === 'dark' ? darkThemeStyles : themeStyles;
  const toggleUiTheme = () => setUiTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const incomingProfile = (params.get('perfil') || params.get('audience') || '').toLowerCase();
    if (incomingProfile === 'cliente') {
      const nextParams = new URLSearchParams();
      const mode = params.get('mode');
      if (mode === 'login' || mode === 'register') {
        nextParams.set('mode', mode);
      }
      if (params.get('quick') === '1') {
        nextParams.set('quick', '1');
      }
      const query = nextParams.toString();
      window.location.replace(query ? `/cliente?${query}` : '/cliente');
      return;
    }
    if (isAccessProfile(incomingProfile)) {
      setSelectedAccessProfile(incomingProfile);
    }
    if (params.get('mode') === 'register') {
      setAuthMode('register');
    }
    if (params.get('quick') === '1') {
      setQuickRegisterMode(true);
      setAuthMode('register');
      setAuthNotice('Modo rapido activo: recomendamos continuar con Google.');
      if (!incomingProfile) {
        setSelectedAccessProfile('tecnico');
      }
    }
    if (params.get('recovery') === '1') {
      setRecoveryMode(true);
      setAuthError('');
      setAuthNotice('');
    }
  }, []);

  useEffect(() => {
    if (!quickRegisterMode || recoveryMode || session || loadingSession || autoGoogleStarted || !selectedAccessProfile)
      return;
    setAutoGoogleStarted(true);
    const timer = window.setTimeout(() => {
      handleGoogleLogin();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [autoGoogleStarted, loadingSession, quickRegisterMode, recoveryMode, selectedAccessProfile, session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      setUiTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    setUiTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, uiTheme);
    document.documentElement.style.colorScheme = uiTheme;
  }, [uiTheme]);

  const setAccessProfileInUrl = (profile: AccessProfile | null) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (profile) {
      params.set('perfil', profile);
    } else {
      params.delete('perfil');
      params.delete('audience');
    }
    if (!params.get('recovery')) {
      params.set('mode', authMode);
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  };

  const handleAccessProfileSelect = (profile: AccessProfile) => {
    if (profile === 'cliente') {
      if (typeof window !== 'undefined') {
        window.location.href = '/cliente';
      }
      return;
    }
    setSelectedAccessProfile(profile);
    setAuthError('');
    setAuthNotice('');
    setAccessProfileInUrl(profile);
  };

  const handleBackToProfileSelector = () => {
    setSelectedAccessProfile(null);
    setAutoGoogleStarted(false);
    setQuickRegisterMode(false);
    setAuthError('');
    setAuthNotice('');
    setAccessProfileInUrl(null);
  };

  const handleAccessVideoSoundToggle = () => {
    const nextMuted = !accessVideoMuted;
    setAccessVideoMuted(nextMuted);
    const videos = [accessVideoRef.current, dashboardVideoRef.current].filter(
      (video): video is HTMLVideoElement => Boolean(video)
    );
    videos.forEach((video) => {
      video.muted = nextMuted;
    });
    if (!nextMuted) {
      videos.forEach((video) => {
        video.play().catch(() => {
          setAccessVideoMuted(true);
          video.muted = true;
        });
      });
    }
  };

  const geoMapUrl = useMemo(() => {
    if (!geoSelected) return '';
    return buildOsmEmbedUrl(geoSelected.lat, geoSelected.lon);
  }, [geoSelected]);

  const navItems: NavItem[] = [
    { key: 'lobby', label: 'Panel de control', hint: 'Resumen general', short: 'PC', icon: Home },
    { key: 'presupuestos', label: 'Presupuestos', hint: 'Ver estado', short: 'PR', icon: FileText },
    { key: 'visualizador', label: 'Visualizador', hint: 'Ver presupuesto', short: 'VI', icon: Eye },
    { key: 'agenda', label: 'Agenda', hint: 'Proximamente', short: 'AG', icon: Calendar },
    { key: 'notificaciones', label: 'Notificaciones', hint: 'Alertas', short: 'NO', icon: Bell },
    { key: 'soporte', label: 'Soporte', hint: 'Chat beta', short: 'CH', icon: MessageCircle },
    { key: 'historial', label: 'Historial', hint: 'Facturacion', short: 'HI', icon: Clock },
    { key: 'perfil', label: 'Perfil', hint: 'Datos del negocio', short: 'PF', icon: User },
    { key: 'precios', label: 'Precios', hint: 'Mano de obra', short: 'PM', icon: Tag },
  ];

  const isNavExpanded = !isNavCollapsed || isNavHovered;

  const activeNavKey = activeTab === 'nuevo' ? 'presupuestos' : activeTab;
  const filteredNavItems = useMemo(() => {
    const query = navSearch.trim().toLowerCase();
    if (!query) return navItems;
    return navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.hint.toLowerCase().includes(query) ||
        item.short.toLowerCase().includes(query)
    );
  }, [navItems, navSearch]);
  const activeSupportLabel = useMemo(() => {
    if (isBetaAdmin) {
      return (
        supportUsers.find((user) => user.userId === activeSupportUserId)?.label || 'Selecciona un usuario'
      );
    }
    return profile?.business_name || session?.user?.email || 'Tu cuenta';
  }, [activeSupportUserId, isBetaAdmin, profile?.business_name, session?.user?.email, supportUsers]);

  const statusOptions = [
    { value: 'draft', label: 'Computo' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'presented', label: 'Presentado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'completed', label: 'Finalizado' },
    { value: 'paid', label: 'Cobrado' },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      if (event === 'SIGNED_IN' && nextSession?.user) {
        setPostLoginVideoPending(true);
      }
      if (event === 'SIGNED_OUT') {
        setPostLoginVideoPending(false);
        setPostLoginVideoVisible(false);
        setResumeStaticVisible(false);
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !postLoginVideoPending) return;
    setPostLoginVideoPending(false);
    if (!postLoginVideoAvailable) return;
    if (hasSeenPostLoginVideo(userId)) return;
    markPostLoginVideoAsSeen(userId);
    setPostLoginVideoVisible(true);
  }, [postLoginVideoAvailable, postLoginVideoPending, session?.user?.id]);

  useEffect(() => {
    if (!postLoginVideoVisible || typeof window === 'undefined') return;
    const video = postLoginVideoRef.current;
    if (!video) return;

    let cancelled = false;
    video.currentTime = 0;
    video.muted = false;
    video.play().catch(async () => {
      if (cancelled) return;
      video.muted = true;
      try {
        await video.play();
      } catch {
        if (!cancelled) setPostLoginVideoVisible(false);
      }
    });

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setPostLoginVideoVisible(false);
    }, POST_LOGIN_VIDEO_MAX_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [postLoginVideoVisible]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const clearResumeTimer = () => {
      if (resumeStaticTimerRef.current !== null) {
        window.clearTimeout(resumeStaticTimerRef.current);
        resumeStaticTimerRef.current = null;
      }
    };

    if (!session?.user?.id) {
      clearResumeTimer();
      hiddenAtRef.current = null;
      setResumeStaticVisible(false);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        clearResumeTimer();
        return;
      }
      if (!RESUME_STATIC_IMAGE_URL) return;
      if (hiddenAtRef.current === null) return;
      hiddenAtRef.current = null;
      setResumeStaticVisible(true);
      clearResumeTimer();
      resumeStaticTimerRef.current = window.setTimeout(() => {
        setResumeStaticVisible(false);
      }, RESUME_STATIC_IMAGE_MS);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearResumeTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) {
      setIsBetaAdmin(false);
      setAdminGateStatus('idle');
      return;
    }
    const loadAdmin = async () => {
      setAdminGateStatus('checking');
      const { data, error } = await supabase
        .from('beta_admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();
      if (error || !data) {
        setIsBetaAdmin(false);
        setAdminGateStatus('done');
        return;
      }
      setIsBetaAdmin(true);
      setAdminGateStatus('done');
    };
    loadAdmin();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user || !isBetaAdmin) return;
    if (typeof window === 'undefined') return;
    window.location.replace('/admin');
  }, [session?.user, isBetaAdmin]);

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    const load = async () => {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let resolvedProfile = profileData || null;
      if (error || !profileData) {
        const fallback = {
          id: session.user.id,
          email: session.user.email || null,
          full_name: session.user.user_metadata?.full_name || '',
          business_name: session.user.user_metadata?.business_name || '',
        };
        const { data: createdProfile } = await supabase.from('profiles').upsert(fallback).select().single();
        resolvedProfile = createdProfile || fallback;
      }

      setProfile(resolvedProfile);
      await fetchQuotes(session.user.id);
      await fetchNotifications(session.user.id);
      await fetchMasterItems();
    };
    load();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!profile) return;
    const hasLegacyLogo = !profile.company_logo_url && profile.avatar_url && profile.logo_shape;
    const legacyLogoUrl = hasLegacyLogo ? profile.avatar_url : '';
    const workingHoursConfig = parseWorkingHoursConfig(profile.working_hours || '');
    const coverageArea = profile.coverage_area || buildCoverageAreaLabel(profile.city || '');
    const parsedCertifications = parseCertificationFilesTag(profile.certifications || '');
    const rawBankValue = String(profile.bank_alias || '').trim();
    const detectedBankType: 'alias' | 'cbu' = normalizeCbu(rawBankValue).length === 22 ? 'cbu' : 'alias';
    setProfileForm({
      fullName: profile.full_name || '',
      businessName: profile.business_name || '',
      email: profile.email || session?.user?.email || '',
      phone: profile.phone || '',
      address: profile.company_address || profile.address || '',
      city: profile.city || '',
      coverageArea,
      workingHours: formatWorkingHoursLabel(workingHoursConfig),
      weekdayFrom: workingHoursConfig.weekdayFrom,
      weekdayTo: workingHoursConfig.weekdayTo,
      saturdayEnabled: workingHoursConfig.saturdayEnabled,
      saturdayFrom: workingHoursConfig.saturdayFrom,
      saturdayTo: workingHoursConfig.saturdayTo,
      sundayEnabled: workingHoursConfig.sundayEnabled,
      sundayFrom: workingHoursConfig.sundayFrom,
      sundayTo: workingHoursConfig.sundayTo,
      specialties: profile.specialties || '',
      certifications: parsedCertifications.notes,
      facebookUrl: profile.facebook_url || '',
      instagramUrl: profile.instagram_url || '',
      profilePublished: Boolean(profile.profile_published),
      taxId: profile.tax_id || '',
      taxStatus: profile.tax_status || '',
      paymentMethod: profile.payment_method || '',
      bankAlias: rawBankValue,
      defaultCurrency: profile.default_currency || 'ARS',
      defaultTaxRate: Number(profile.default_tax_rate ?? 0.21),
      defaultDiscount: Number(profile.default_discount ?? 0),
      companyLogoUrl: profile.company_logo_url || legacyLogoUrl || '',
      avatarUrl: hasLegacyLogo ? '' : profile.avatar_url || '',
      logoShape: profile.logo_shape || 'auto',
    });
    setBankAccountType(detectedBankType);
    setCustomPaymentMethodDraft('');
    setCertificationFiles(parsedCertifications.files);
    setCertificationFilesError('');
    setProfileHydrated(true);
  }, [profile, session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfileHydrated(false);
      setAutoSaveBootstrapped(false);
      setAutoSaveState('idle');
      setAutoSaveMessage('');
      lastPersistedProfileSignatureRef.current = '';
      return;
    }
    setAutoSaveBootstrapped(false);
    setAutoSaveState('idle');
    setAutoSaveMessage('');
    lastPersistedProfileSignatureRef.current = '';
  }, [session?.user?.id]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (autoSaveMessageTimerRef.current !== null) {
        window.clearTimeout(autoSaveMessageTimerRef.current);
        autoSaveMessageTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!session?.user || activeTab !== 'lobby') return;
    fetchNearbyRequests();
  }, [activeTab, session?.access_token, session?.user?.id]);

  useEffect(() => {
    if (!(profile?.company_logo_url || (profile?.logo_shape && profile?.avatar_url))) return;
    setLogoRatio(1);
  }, [profile?.avatar_url, profile?.company_logo_url, profile?.logo_shape]);

  useEffect(() => {
    supportAttachmentsRef.current = supportAttachments;
  }, [supportAttachments]);

  useEffect(() => {
    return () => {
      supportAttachmentsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isBetaAdmin) return;
    if (!activeSupportUserId) return;
    clearSupportAttachments();
    setSupportDraft('');
  }, [activeSupportUserId, isBetaAdmin]);

  const fetchQuotes = async (userId?: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('quotes')
      .select('*, quote_items(unit_price, quantity, metadata)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      setInfoMessage('No pudimos cargar los presupuestos.');
      return;
    }
    const normalizedQuotes = ((data as QuoteRow[]) || []).map(normalizeQuoteRow);
    setQuotes(normalizedQuotes);
  };

  const fetchNotifications = async (userId?: string) => {
    if (!userId) return;
    setLoadingNotifications(true);
    setNotificationsError('');
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      setNotificationsError('No pudimos cargar las notificaciones.');
      setLoadingNotifications(false);
      return;
    }
    setNotifications((data as NotificationRow[]) || []);
    setLoadingNotifications(false);
  };

  const fetchNearbyRequests = async () => {
    if (!session?.access_token) return;
    setLoadingNearbyRequests(true);
    setNearbyRequestsError('');
    setNearbyRequestsWarning('');
    try {
      const response = await fetch('/api/tecnico/requests/nearby', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron cargar las solicitudes cercanas.');
      }
      setNearbyRequests((payload?.requests || []) as NearbyRequestRow[]);
      setTechnicianRadiusKm(Number(payload?.technician?.radius_km || COVERAGE_RADIUS_KM));
      setTechnicianWithinWorkingHours(
        typeof payload?.technician?.within_working_hours === 'boolean'
          ? payload.technician.within_working_hours
          : null
      );
      setTechnicianWorkingHoursLabel(String(payload?.technician?.working_hours_label || ''));
      setNearbyRequestsWarning(String(payload?.warning || ''));
    } catch (error: any) {
      setNearbyRequests([]);
      setNearbyRequestsError(error?.message || 'No se pudieron cargar las solicitudes cercanas.');
    } finally {
      setLoadingNearbyRequests(false);
    }
  };

  const getRequestOfferDraft = (request: NearbyRequestRow) =>
    offerDraftByRequestId[request.id] || buildRequestOfferDraft(request);

  const handleRequestOfferDraftChange = (
    request: NearbyRequestRow,
    field: keyof RequestOfferDraft,
    value: string
  ) => {
    setOfferDraftByRequestId((prev) => ({
      ...prev,
      [request.id]: {
        ...(prev[request.id] || buildRequestOfferDraft(request)),
        [field]: value,
      },
    }));
  };

  const handleToggleRequestOfferEditor = (request: NearbyRequestRow) => {
    setOfferErrorByRequestId((prev) => ({ ...prev, [request.id]: '' }));
    setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
    setOfferDraftByRequestId((prev) => ({
      ...prev,
      [request.id]: prev[request.id] || buildRequestOfferDraft(request),
    }));
    setOfferEditorRequestId((prev) => (prev === request.id ? '' : request.id));
  };

  const handleSubmitRequestOffer = async (request: NearbyRequestRow) => {
    if (!session?.access_token) return;
    const draft = getRequestOfferDraft(request);
    const priceArs = parseArsInput(draft.priceArs);
    if (priceArs === null || priceArs <= 0) {
      setOfferErrorByRequestId((prev) => ({ ...prev, [request.id]: 'Ingresa un precio valido en ARS.' }));
      setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
      return;
    }
    const etaValue = parseEtaInput(draft.etaHours);
    if (etaValue === null || etaValue <= 0) {
      setOfferErrorByRequestId((prev) => ({ ...prev, [request.id]: 'Ingresa una ETA valida en horas.' }));
      setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
      return;
    }

    const etaHours = Math.max(1, Math.min(720, Math.round(etaValue)));
    const normalizedPrice = Math.round(priceArs * 100) / 100;
    setSubmittingOfferRequestId(request.id);
    setOfferErrorByRequestId((prev) => ({ ...prev, [request.id]: '' }));
    setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
    try {
      const response = await fetch(`/api/tecnico/requests/${request.id}/offer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_ars: normalizedPrice,
          eta_hours: etaHours,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo enviar la oferta.');
      }

      setNearbyRequests((prev) =>
        prev.map((row) =>
          row.id === request.id
            ? {
                ...row,
                status: String(payload?.request?.status || row.status || 'quoted'),
                my_quote_status: String(payload?.request?.my_quote_status || 'submitted'),
                my_price_ars:
                  payload?.request?.my_price_ars === null || payload?.request?.my_price_ars === undefined
                    ? normalizedPrice
                    : Number(payload.request.my_price_ars),
                my_eta_hours:
                  payload?.request?.my_eta_hours === null || payload?.request?.my_eta_hours === undefined
                    ? etaHours
                    : Number(payload.request.my_eta_hours),
                my_quote_updated_at: String(payload?.request?.my_quote_updated_at || new Date().toISOString()),
              }
            : row
        )
      );
      setOfferDraftByRequestId((prev) => ({
        ...prev,
        [request.id]: {
          priceArs: String(Math.round(normalizedPrice)),
          etaHours: String(etaHours),
        },
      }));
      setOfferSuccessByRequestId((prev) => ({
        ...prev,
        [request.id]: String(payload?.message || 'Oferta enviada correctamente.'),
      }));
      setOfferErrorByRequestId((prev) => ({ ...prev, [request.id]: '' }));
      setOfferEditorRequestId('');
    } catch (error: any) {
      setOfferErrorByRequestId((prev) => ({
        ...prev,
        [request.id]: error?.message || 'No se pudo enviar la oferta.',
      }));
      setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
    } finally {
      setSubmittingOfferRequestId('');
    }
  };

  const fetchSupportUsers = async () => {
    if (!isBetaAdmin) return;
    setSupportError('');
    const { data, error } = await supabase
      .from('beta_support_messages')
      .select('user_id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      setSupportError('No pudimos cargar las conversaciones.');
      return;
    }
    const latestByUser = new Map<string, any>();
    (data || []).forEach((msg: any) => {
      if (!latestByUser.has(msg.user_id)) {
        latestByUser.set(msg.user_id, msg);
      }
    });
    const userIds = Array.from(latestByUser.keys());
    let profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, email')
        .in('id', userIds);
      (profilesData || []).forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });
    }
    const list = userIds.map((id) => {
      const profile = profilesMap.get(id);
      const label = profile?.business_name || profile?.full_name || profile?.email || id;
      return { userId: id, label, lastMessage: latestByUser.get(id) };
    });
    setSupportUsers(list);
    if (!activeSupportUserId && list[0]) {
      setActiveSupportUserId(list[0].userId);
    }
  };

  const fetchSupportMessages = async () => {
    if (!session?.user) return;
    setSupportLoading(true);
    setSupportError('');
    const targetUserId = isBetaAdmin ? activeSupportUserId : session.user.id;
    if (!targetUserId) {
      setSupportMessages([]);
      setSupportLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('beta_support_messages')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: true });
    if (error) {
      setSupportError('No pudimos cargar los mensajes.');
      setSupportMessages([]);
      setSupportLoading(false);
      return;
    }
    setSupportMessages((data as any[]) || []);
    setSupportLoading(false);
  };

  const clearSupportAttachments = () => {
    supportAttachments.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setSupportAttachments([]);
  };

  const handleSupportImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setSupportError('');
    let next = [...supportAttachments];
    let message = '';

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        message = 'Solo se permiten imagenes.';
        return;
      }
      if (file.size > SUPPORT_MAX_IMAGE_BYTES) {
        message = 'Cada imagen debe pesar menos de 5 MB.';
        return;
      }
      if (next.length >= SUPPORT_MAX_IMAGES) {
        message = `Maximo ${SUPPORT_MAX_IMAGES} imagenes por mensaje.`;
        return;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    });

    if (message) {
      setSupportError(message);
    }
    setSupportAttachments(next);
  };

  const handleRemoveSupportImage = (index: number) => {
    setSupportAttachments((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1);
      removed.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return copy;
    });
  };

  const handleSendSupportMessage = async () => {
    if (!session?.user) return;
    const trimmed = supportDraft.trim();
    const hasImages = supportAttachments.length > 0;
    if (!trimmed && !hasImages) return;
    const targetUserId = isBetaAdmin ? activeSupportUserId : session.user.id;
    if (!targetUserId) return;
    setSupportLoading(true);
    setSupportError('');
    let imageUrls: string[] = [];
    if (hasImages) {
      try {
        const uploads = await Promise.all(
          supportAttachments.map(async (item) => {
            const ext = getSupportUploadExtension(item.file);
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext || 'jpg'}`;
            const path = `${targetUserId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from(SUPPORT_BUCKET)
              .upload(path, item.file, { contentType: item.file.type, upsert: false });
            if (uploadError) {
              throw uploadError;
            }
            const { data } = supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(path);
            return data.publicUrl;
          })
        );
        imageUrls = uploads.filter(Boolean);
      } catch (error: any) {
        setSupportError(error?.message || 'No pudimos subir las imagenes.');
        setSupportLoading(false);
        return;
      }
    }

    const messageBody = trimmed || (imageUrls.length ? 'Imagen adjunta' : '');
    const { error } = await supabase.from('beta_support_messages').insert({
      user_id: targetUserId,
      sender_id: session.user.id,
      body: messageBody,
      image_urls: imageUrls.length ? imageUrls : null,
    });
    if (error) {
      setSupportError(error.message || 'No pudimos enviar el mensaje.');
      setSupportLoading(false);
      return;
    }
    setSupportDraft('');
    clearSupportAttachments();
    await fetchSupportMessages();
    if (isBetaAdmin) {
      await fetchSupportUsers();
    }
  };

  const handleScheduleUpdate = async (quoteId: string, startDate: string, endDate: string) => {
    setScheduleSavingId(quoteId);
    setScheduleMessage('');
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .eq('id', quoteId)
        .select();
      if (error) throw error;
      const updated = data && data.length > 0 ? data[0] : null;
      if (!updated) {
        setScheduleMessage('No se pudo actualizar el trabajo. Revisa permisos.');
        return;
      }
      const normalized = normalizeQuoteRow(updated as QuoteRow);
      setQuotes((prev) => prev.map((quote) => (quote.id === quoteId ? { ...quote, ...normalized } : quote)));
      setScheduleMessage('Fecha guardada.');
    } catch (error: any) {
      console.error('Error guardando fechas:', error);
      setScheduleMessage(error?.message || 'No pudimos guardar las fechas.');
    } finally {
      setScheduleSavingId(null);
    }
  };

  const fetchMasterItems = async () => {
    setLoadingMasterItems(true);
    const selectFields = 'id,name,type,suggested_price,category,source_ref';

    const isMissingActiveColumn = (error: any) => {
      const message = String(error?.message || '').toLowerCase();
      return message.includes('column') && message.includes('active') && message.includes('does not exist');
    };

    try {
      const { data, error } = await supabase
        .from('master_items')
        .select(selectFields)
        .eq('type', 'labor')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        if (!isMissingActiveColumn(error)) {
          throw error;
        }

        const fallback = await supabase
          .from('master_items')
          .select(selectFields)
          .eq('type', 'labor')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (fallback.error) {
          throw fallback.error;
        }

        setMasterItems((fallback.data as MasterItemRow[]) || []);
        return;
      }

      setMasterItems((data as MasterItemRow[]) || []);
    } catch (error) {
      console.error('Error cargando master items:', error);
    } finally {
      setLoadingMasterItems(false);
    }
  };

  const fetchAttachments = async (quoteId: string) => {
    const { data, error } = await supabase
      .from('quote_attachments')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    if (error) {
      setInfoMessage('No pudimos cargar los archivos adjuntos.');
      return;
    }
    setAttachments((data as AttachmentRow[]) || []);
  };

  const resetForm = () => {
    setActiveQuoteId(null);
    setClientName('');
    setClientAddress('');
    setGeoResults([]);
    setGeoSelected(null);
    setGeoLoading(false);
    setGeoError('');
    setDiscount(
      Math.min(
        100,
        Math.max(0, toAmountValue(profile?.default_discount ?? profileForm.defaultDiscount ?? 0))
      )
    );
    setApplyTax(false);
    setItems([]);
    setAttachments([]);
    setFormError('');
    setInfoMessage('');
    lastSavedItemsSignatureRef.current = '';
    lastSavedItemsCountRef.current = 0;
  };

  const startNewQuote = () => {
    resetForm();
    setItems([
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        type: 'labor',
      },
    ]);
    setActiveTab('nuevo');
  };

  const startEditQuote = async (quote: QuoteRow) => {
    await loadQuote(quote, 'nuevo');
  };

  const loadQuote = async (quote: QuoteRow, targetTab: 'presupuestos' | 'nuevo' = 'presupuestos') => {
    setActiveTab(targetTab);
    setActiveQuoteId(quote.id);
    setClientName(quote.client_name || '');
    setClientAddress(getQuoteAddress(quote));
    if (quote.location_lat && quote.location_lng) {
      setGeoSelected({
        display_name: quote.location_address || getQuoteAddress(quote) || 'Ubicacion',
        lat: Number(quote.location_lat),
        lon: Number(quote.location_lng),
      });
    } else {
      setGeoSelected(null);
    }
    setApplyTax((quote.tax_rate || 0) > 0);
    setDiscount(
      Math.min(
        100,
        Math.max(
          0,
          toAmountValue(
            quote.discount_percent ?? profile?.default_discount ?? profileForm.defaultDiscount ?? 0
          )
        )
      )
    );
    setFormError('');
    setInfoMessage('');
    const { data: itemsData } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id);
    const mapped = (itemsData || []).map((item: QuoteItemRow) => {
      const rawType = (item?.metadata?.type || item?.metadata?.category || 'labor').toString().toLowerCase();
      const normalizedType = rawType === 'material' || rawType === 'consumable' ? 'material' : 'labor';
      return {
        id: item.id?.toString() || `item-${Math.random().toString(36).slice(2)}`,
        description: item.description || '',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unit_price || 0),
        type: normalizedType as 'labor' | 'material',
      };
    });
    setItems(mapped);
    lastSavedItemsSignatureRef.current = buildItemsSignature(
      mapped.filter((item) => item.description.trim())
    );
    lastSavedItemsCountRef.current = mapped.filter((item) => item.description.trim()).length;
    await fetchAttachments(quote.id);
  };

  const addMasterItemToQuote = (item: MasterItemRow) => {
    setActiveTab('nuevo');
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: item.name,
        quantity: 1,
        unitPrice: Number(item.suggested_price || 0),
        type: item.type === 'material' ? 'material' : 'labor',
      },
    ]);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        type: 'labor',
      },
    ]);
  };

  const laborMasterItems = useMemo(() => masterItems.filter((item) => item.type === 'labor'), [masterItems]);
  const laborMasterMap = useMemo(() => {
    const map = new Map<string, MasterItemRow>();
    laborMasterItems.forEach((item) => {
      map.set(normalizeText(item.name), item);
    });
    return map;
  }, [laborMasterItems]);

  const handleItemUpdate = (id: string, patch: Partial<ItemForm>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if ((patch.description !== undefined || patch.type !== undefined) && next.type === 'labor') {
          const normalized = normalizeText(next.description || '');
          if (normalized) {
            const match = laborMasterMap.get(normalized);
            if (match) {
              next.unitPrice = Number(match.suggested_price || 0);
            }
          }
        }
        return next;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGeocodeSearch = async () => {
    const query = clientAddress.trim();
    if (!query) {
      setGeoError('Ingresa una direccion para buscar en el mapa.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    setGeoResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
        query
      )}&addressdetails=1&email=info@urbanfix.com.ar`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('No se pudo geocodificar la direccion.');
      const data = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
      const mapped = data
        .map((item) => ({
          display_name: item.display_name,
          lat: Number(item.lat),
          lon: Number(item.lon),
        }))
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));
      if (mapped.length === 0) {
        setGeoError('No encontramos esa direccion. Prueba con mas detalles.');
      }
      setGeoResults(mapped);
    } catch (error) {
      console.error('Error geocodificando direccion:', error);
      setGeoError('No pudimos buscar la direccion. Intenta nuevamente.');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSelectGeo = (result: GeoResult) => {
    setGeoSelected(result);
    setGeoResults([]);
    setGeoError('');
    setClientAddress(result.display_name);
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (!activeQuoteId) {
      setFormError('Guarda el presupuesto antes de adjuntar archivos.');
      return;
    }
    if (!session?.user?.id) {
      setFormError('Inicia sesion para subir archivos.');
      return;
    }
    const imageFiles = files.filter(
      (file) => (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name)
    );
    if (!imageFiles.length) {
      setFormError('Solo se permiten imagenes.');
      return;
    }

    setUploadingAttachments(true);
    setFormError('');
    try {
      const uploads = [];
      for (const file of imageFiles) {
        const storagePath = buildAttachmentPath(session.user.id, activeQuoteId, file.name);
        const { error: uploadError } = await supabase.storage
          .from('urbanfix-assets')
          .upload(storagePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
        uploads.push({
          quote_id: activeQuoteId,
          user_id: session.user.id,
          file_url: publicData.publicUrl,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size || null,
        });
      }
      const { error: insertError } = await supabase.from('quote_attachments').insert(uploads);
      if (insertError) throw insertError;
      await fetchAttachments(activeQuoteId);
      setInfoMessage('Archivos adjuntados.');
    } catch (error) {
      console.error('Error subiendo archivos:', error);
      setFormError('No pudimos subir los archivos.');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleAttachmentRemove = async (attachment: AttachmentRow) => {
    if (!session?.user?.id) return;
    setDeletingAttachmentId(attachment.id);
    setFormError('');
    try {
      const storagePath = getAttachmentStoragePath(attachment.file_url);
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from('urbanfix-assets').remove([storagePath]);
        if (storageError) {
          console.error('Error eliminando archivo:', storageError);
        }
      }
      const { error: deleteError } = await supabase.from('quote_attachments').delete().eq('id', attachment.id);
      if (deleteError) throw deleteError;
      setAttachments((prev) => prev.filter((file) => file.id !== attachment.id));
    } catch (error) {
      console.error('Error eliminando adjunto:', error);
      setFormError('No pudimos eliminar el adjunto.');
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const laborSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + (item.type === 'labor' ? item.quantity * item.unitPrice : 0), 0),
    [items]
  );
  const materialSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + (item.type === 'material' ? item.quantity * item.unitPrice : 0), 0),
    [items]
  );
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
    [items]
  );
  const discountPercent = Math.min(100, Math.max(0, discount));
  const discountAmount = subtotal * (discountPercent / 100);
  const totalBeforeTax = Math.max(0, subtotal - discountAmount);
  const taxAmount = applyTax ? totalBeforeTax * TAX_RATE : 0;
  const total = totalBeforeTax + taxAmount;
  const quoteLink = activeQuoteId ? buildQuoteLink(activeQuoteId) : '';
  const quoteStats = useMemo(() => {
    const totals = quotes.reduce(
      (acc, quote) => {
        const status = normalizeStatusValue(quote.status);
        const amount = toAmountValue(quote.total_amount);
        if (status === 'draft') acc.draft += 1;
        if (pendingStatuses.has(status)) acc.pending += 1;
        if (approvedStatuses.has(status)) acc.approved += 1;
        if (paidStatuses.has(status)) {
          acc.paid += 1;
          acc.paidAmount += amount;
          acc.profitAmount += getLaborAmount(quote);
        }
        acc.amount += amount;
        return acc;
      },
      { draft: 0, pending: 0, approved: 0, paid: 0, amount: 0, paidAmount: 0, profitAmount: 0 }
    );
    return {
      total: quotes.length,
      ...totals,
    };
  }, [quotes]);
  const recentQuotes = useMemo(() => quotes.slice(0, 3), [quotes]);
  const activeQuote = useMemo(
    () => (activeQuoteId ? quotes.find((quote) => quote.id === activeQuoteId) || null : null),
    [quotes, activeQuoteId]
  );
  const financeSeries = useMemo(() => {
    const now = new Date();
    const points: { key: string; label: string; quotes: number; paid: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const point = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${point.getFullYear()}-${point.getMonth() + 1}`;
      const label = point.toLocaleDateString('es-AR', { month: 'short' });
      points.push({ key, label, quotes: 0, paid: 0, profit: 0 });
    }
    quotes.forEach((quote) => {
      const created = new Date(quote.created_at);
      const key = `${created.getFullYear()}-${created.getMonth() + 1}`;
      const bucket = points.find((item) => item.key === key);
      if (!bucket) return;
      const amount = toAmountValue(quote.total_amount);
      const status = normalizeStatusValue(quote.status);
      bucket.quotes += amount;
      if (paidStatuses.has(status)) {
        bucket.paid += amount;
        bucket.profit += getLaborAmount(quote);
      }
    });
    return points;
  }, [quotes]);
  const maxFinanceValue = useMemo(
    () =>
      Math.max(
        1,
        ...financeSeries.map((item) => Math.max(item.quotes || 0, item.paid || 0, item.profit || 0))
      ),
    [financeSeries]
  );
  const financeChart = useMemo(() => {
    const width = 240;
    const height = 80;
    const padding = 6;
    const step = financeSeries.length > 1 ? (width - padding * 2) / (financeSeries.length - 1) : 0;
    const buildPath = (key: 'quotes' | 'paid' | 'profit') =>
      financeSeries
        .map((item, index) => {
          const value = item[key] || 0;
          const x = padding + index * step;
          const y = height - padding - (value / maxFinanceValue) * (height - padding * 2);
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    const buildPoints = (key: 'quotes' | 'paid' | 'profit') =>
      financeSeries.map((item, index) => {
        const value = item[key] || 0;
        return {
          x: padding + index * step,
          y: height - padding - (value / maxFinanceValue) * (height - padding * 2),
        };
      });
    return {
      width,
      height,
      quotesPath: buildPath('quotes'),
      paidPath: buildPath('paid'),
      profitPath: buildPath('profit'),
      quotesPoints: buildPoints('quotes'),
      paidPoints: buildPoints('paid'),
      profitPoints: buildPoints('profit'),
    };
  }, [financeSeries, maxFinanceValue]);
  const billingMonthlySeries = useMemo(() => {
    const now = new Date();
    const points: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const point = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${point.getFullYear()}-${point.getMonth() + 1}`;
      const label = point.toLocaleDateString('es-AR', { month: 'short' });
      points.push({ key, label, total: 0 });
    }
    quotes.forEach((quote) => {
      const status = normalizeStatusValue(quote.status);
      if (!billingStatuses.has(status)) return;
      const created = new Date(quote.created_at);
      const key = `${created.getFullYear()}-${created.getMonth() + 1}`;
      const bucket = points.find((item) => item.key === key);
      if (!bucket) return;
      bucket.total += toAmountValue(quote.total_amount);
    });
    return points;
  }, [quotes]);
  const billingYearSeries = useMemo(() => {
    const map = new Map<number, number>();
    quotes.forEach((quote) => {
      const status = normalizeStatusValue(quote.status);
      if (!billingStatuses.has(status)) return;
      const year = new Date(quote.created_at).getFullYear();
      map.set(year, (map.get(year) || 0) + toAmountValue(quote.total_amount));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, total]) => ({ year, total }));
  }, [quotes]);
  const maxMonthlyBilling = useMemo(
    () => Math.max(1, ...billingMonthlySeries.map((item) => item.total || 0)),
    [billingMonthlySeries]
  );
  const billingTotals = useMemo(() => {
    const total = billingMonthlySeries.reduce((sum, item) => sum + (item.total || 0), 0);
    const average = billingMonthlySeries.length ? total / billingMonthlySeries.length : 0;
    return { total, average };
  }, [billingMonthlySeries]);
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );
  const masterCategories = useMemo(() => {
    const set = new Set<string>();
    masterItems.forEach((item) => {
      set.add(resolveMasterRubro(item));
    });
    return Array.from(set).sort((a, b) => {
      const aIndex = RUBRO_ORDER.indexOf(a);
      const bIndex = RUBRO_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [masterItems]);
  const filteredMasterItems = useMemo(() => {
    const search = masterSearch.trim().toLowerCase();
    return masterItems.filter((item) => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search);
      const rubro = resolveMasterRubro(item);
      const matchesCategory = masterCategory === 'all' || rubro === masterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [masterItems, masterSearch, masterCategory]);
  const approvedJobs = useMemo(
    () => quotes.filter((quote) => readyToScheduleStatuses.has(normalizeStatusValue(quote.status))),
    [quotes]
  );
  const dashboardJobPoints = useMemo(() => {
    const operationalStatuses = new Set(['approved', 'completed', 'paid']);
    const points: DashboardMapPoint[] = [];
    quotes.forEach((quote) => {
      if (!operationalStatuses.has(normalizeStatusValue(quote.status))) return;
      const lat = toFiniteCoordinate(quote.location_lat);
      const lon = toFiniteCoordinate(quote.location_lng);
      if (lat === null || lon === null) return;
      const status = normalizeStatusValue(quote.status);
      const statusLabel = statusMap[status]?.label || 'Trabajo';
      const addressLabel = getQuoteAddress(quote) || 'Ubicacion sin direccion';
      points.push({
        id: `job:${quote.id}`,
        kind: 'job',
        title: quote.client_name || 'Trabajo sin cliente',
        subtitle: addressLabel,
        meta: `${statusLabel} · ${new Date(quote.created_at).toLocaleDateString('es-AR')}`,
        lat,
        lon,
        createdAt: quote.created_at,
      });
    });
    return points.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes]);
  const requestBoardCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          nearbyRequests
            .map((request) => String(request.category || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [nearbyRequests]
  );
  const requestBoardCityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          nearbyRequests
            .map((request) => String(request.city || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [nearbyRequests]
  );
  const filteredNearbyRequests = useMemo(() => {
    const rows = nearbyRequests.filter((request) => {
      if (requestBoardCategoryFilter !== 'all' && request.category !== requestBoardCategoryFilter) return false;
      if (requestBoardCityFilter !== 'all' && request.city !== requestBoardCityFilter) return false;
      if (requestBoardModeFilter !== 'all' && request.mode !== requestBoardModeFilter) return false;
      if (requestBoardUrgencyFilter !== 'all' && request.urgency !== requestBoardUrgencyFilter) return false;
      return true;
    });

    const sorted = [...rows];
    if (requestBoardSort === 'distance') {
      sorted.sort((a, b) => a.distance_km - b.distance_km || String(b.created_at).localeCompare(String(a.created_at)));
      return sorted;
    }
    if (requestBoardSort === 'urgency') {
      sorted.sort((a, b) => {
        const urgencyDiff = urgencyPriority(a.urgency) - urgencyPriority(b.urgency);
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.distance_km - b.distance_km;
      });
      return sorted;
    }
    sorted.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return sorted;
  }, [
    nearbyRequests,
    requestBoardCategoryFilter,
    requestBoardCityFilter,
    requestBoardModeFilter,
    requestBoardSort,
    requestBoardUrgencyFilter,
  ]);
  useEffect(() => {
    const validIds = new Set(nearbyRequests.map((request) => request.id));
    setOfferDraftByRequestId((prev) => {
      const next: Record<string, RequestOfferDraft> = {};
      Object.entries(prev).forEach(([id, draft]) => {
        if (validIds.has(id)) next[id] = draft;
      });
      nearbyRequests.forEach((request) => {
        if (!next[request.id]) {
          next[request.id] = buildRequestOfferDraft(request);
        }
      });
      return next;
    });
    setOfferSuccessByRequestId((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([id, value]) => {
        if (validIds.has(id) && value) next[id] = value;
      });
      return next;
    });
    setOfferErrorByRequestId((prev) => {
      const next: Record<string, string> = {};
      Object.entries(prev).forEach(([id, value]) => {
        if (validIds.has(id) && value) next[id] = value;
      });
      return next;
    });
    setOfferEditorRequestId((prev) => (prev && validIds.has(prev) ? prev : ''));
  }, [nearbyRequests]);
  const dashboardRequestPoints = useMemo(() => {
    const points: DashboardMapPoint[] = [];
    filteredNearbyRequests.forEach((request) => {
      const lat = toFiniteCoordinate(request.location_lat);
      const lon = toFiniteCoordinate(request.location_lng);
      if (lat === null || lon === null) return;
      const cityAddress = [request.city, request.address].filter(Boolean).join(' · ');
      points.push({
        id: `request:${request.id}`,
        kind: 'request',
        title: request.title || 'Solicitud',
        subtitle: cityAddress || 'Zona sin detalle',
        meta: `${request.urgency.toUpperCase()} · ${request.distance_km.toFixed(1)} km`,
        lat,
        lon,
        createdAt: request.created_at,
      });
    });
    return points.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredNearbyRequests]);
  const dashboardMapPoints = useMemo(() => {
    if (dashboardMapFilter === 'jobs') return dashboardJobPoints;
    if (dashboardMapFilter === 'requests') return dashboardRequestPoints;
    return [...dashboardRequestPoints, ...dashboardJobPoints].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [dashboardJobPoints, dashboardMapFilter, dashboardRequestPoints]);
  const dashboardSelectedMapPoint = useMemo(() => {
    if (!dashboardMapPoints.length) return null;
    if (!dashboardMapSelectedId) return null;
    return dashboardMapPoints.find((point) => point.id === dashboardMapSelectedId) || null;
  }, [dashboardMapPoints, dashboardMapSelectedId]);
  const dashboardMapCenterPoint = useMemo(() => {
    if (dashboardSelectedMapPoint) {
      return { lat: dashboardSelectedMapPoint.lat, lon: dashboardSelectedMapPoint.lon };
    }
    if (dashboardMapPoints.length > 0) {
      const lats = dashboardMapPoints.map((point) => point.lat);
      const lons = dashboardMapPoints.map((point) => point.lon);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
      return { lat: centerLat, lon: centerLon };
    }
    const technicianLat = toFiniteCoordinate(profile?.service_lat);
    const technicianLon = toFiniteCoordinate(profile?.service_lng);
    if (technicianLat === null || technicianLon === null) return null;
    return { lat: technicianLat, lon: technicianLon };
  }, [dashboardMapPoints, dashboardSelectedMapPoint, profile?.service_lat, profile?.service_lng]);
  const dashboardMapView = useMemo(() => {
    if (dashboardSelectedMapPoint) {
      return {
        mode: 'single' as const,
        url: buildOsmEmbedUrl(dashboardSelectedMapPoint.lat, dashboardSelectedMapPoint.lon),
      };
    }
    if (dashboardMapPoints.length > 0) {
      return {
        mode: 'all' as const,
        url: buildOsmStaticMultiMarkerUrl(dashboardMapPoints),
      };
    }
    const technicianLat = toFiniteCoordinate(profile?.service_lat);
    const technicianLon = toFiniteCoordinate(profile?.service_lng);
    if (technicianLat !== null && technicianLon !== null) {
      return {
        mode: 'single' as const,
        url: buildOsmEmbedUrl(technicianLat, technicianLon),
      };
    }
    return {
      mode: 'none' as const,
      url: '',
    };
  }, [dashboardMapPoints, dashboardSelectedMapPoint, profile?.service_lat, profile?.service_lng]);
  const jobsWithoutCoordinatesCount = useMemo(() => {
    const operationalStatuses = new Set(['approved', 'completed', 'paid']);
    return quotes.filter((quote) => {
      if (!operationalStatuses.has(normalizeStatusValue(quote.status))) return false;
      return toFiniteCoordinate(quote.location_lat) === null || toFiniteCoordinate(quote.location_lng) === null;
    }).length;
  }, [quotes]);
  const requestsWithoutCoordinatesCount = useMemo(
    () =>
      nearbyRequests.filter(
        (request) => toFiniteCoordinate(request.location_lat) === null || toFiniteCoordinate(request.location_lng) === null
      ).length,
    [nearbyRequests]
  );
  useEffect(() => {
    if (!dashboardMapPoints.length) {
      if (dashboardMapSelectedId) setDashboardMapSelectedId('');
      return;
    }
    if (!dashboardMapSelectedId) return;
    const exists = dashboardMapPoints.some((point) => point.id === dashboardMapSelectedId);
    if (!exists) {
      setDashboardMapSelectedId('');
    }
  }, [dashboardMapPoints, dashboardMapSelectedId]);
  const logoPresentation = useMemo(
    () => resolveLogoPresentation(logoRatio, profile?.logo_shape),
    [logoRatio, profile?.logo_shape]
  );
  const logoPreviewPresentation = useMemo(
    () => resolveLogoPresentation(logoRatio, profileForm.logoShape),
    [logoRatio, profileForm.logoShape]
  );
  const logoAspect = useMemo(
    () => resolveLogoAspect(logoRatio, profile?.logo_shape),
    [logoRatio, profile?.logo_shape]
  );
  const brandLogoUrl = useMemo(() => {
    if (profile?.company_logo_url) return profile.company_logo_url as string;
    if (profile?.logo_shape && profile?.avatar_url) return profile.avatar_url as string;
    return '';
  }, [profile?.avatar_url, profile?.company_logo_url, profile?.logo_shape]);
  const accessProfileCopy = useMemo(() => {
    if (selectedAccessProfile === 'empresa') {
      return {
        panelLabel: 'Panel empresa',
        heading: 'Acceso para empresas',
        description:
          'Centraliza presupuestos, responsables y seguimiento comercial desde la web en una sola cuenta.',
      };
    }
    return {
      panelLabel: 'Panel tecnico',
      heading: 'Acceso para tecnicos',
      description: 'Gestiona presupuestos, materiales y estados desde la web. Todo sincronizado con tu cuenta.',
    };
  }, [selectedAccessProfile]);
  const agendaCounts = useMemo(() => {
    const scheduled = approvedJobs.filter((quote) => Boolean(quote.start_date)).length;
    const pending = approvedJobs.length - scheduled;
    return { all: approvedJobs.length, pending, scheduled };
  }, [approvedJobs]);
  const agendaJobs = useMemo(() => {
    const search = agendaSearch.trim().toLowerCase();
    const filtered = approvedJobs.filter((quote) => {
      const isScheduled = Boolean(quote.start_date);
      if (agendaFilter === 'pending' && isScheduled) return false;
      if (agendaFilter === 'scheduled' && !isScheduled) return false;
      if (!search) return true;
      const address = (getQuoteAddress(quote) || '').toLowerCase();
      const clientName = (quote.client_name || '').toLowerCase();
      return clientName.includes(search) || address.includes(search);
    });

    return filtered.sort((a, b) => {
      const aScheduled = Boolean(a.start_date);
      const bScheduled = Boolean(b.start_date);
      if (aScheduled !== bScheduled) return aScheduled ? 1 : -1;

      const aDate = parseDateLocal(a.start_date ? a.start_date.slice(0, 10) : '');
      const bDate = parseDateLocal(b.start_date ? b.start_date.slice(0, 10) : '');
      if (aDate && bDate && aDate.getTime() !== bDate.getTime()) {
        return aDate.getTime() - bDate.getTime();
      }

      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    });
  }, [approvedJobs, agendaFilter, agendaSearch]);
  const filteredQuotes = useMemo(() => {
    if (quoteFilter === 'pending') {
      return quotes.filter((quote) => pendingStatuses.has(normalizeStatusValue(quote.status)));
    }
    if (quoteFilter === 'approved') {
      return quotes.filter((quote) => approvedStatuses.has(normalizeStatusValue(quote.status)));
    }
    if (quoteFilter === 'draft') {
      return quotes.filter((quote) => draftStatuses.has(normalizeStatusValue(quote.status)));
    }
    if (quoteFilter === 'completed') {
      return quotes.filter((quote) => completedStatuses.has(normalizeStatusValue(quote.status)));
    }
    if (quoteFilter === 'paid') {
      return quotes.filter((quote) => paidStatuses.has(normalizeStatusValue(quote.status)));
    }
    return quotes;
  }, [quotes, quoteFilter]);

  const handleOpenViewer = () => {
    const id = extractQuoteId(viewerInput);
    if (!id || !isUuid(id)) {
      setViewerError('Ingresa un ID valido o pega un link correcto.');
      setViewerUrl(null);
      return;
    }
    setViewerError('');
    setViewerUrl(buildQuoteLink(id));
    setActiveQuoteId(id);
  };

  const handleViewQuote = (quote: QuoteRow) => {
    const nextUrl = buildQuoteLink(quote.id);
    setActiveQuoteId(quote.id);
    setViewerInput(nextUrl);
    setViewerUrl(nextUrl);
    setViewerError('');
    setActiveTab('visualizador');
  };

  const handleShowQuotes = (filter: 'all' | 'pending' | 'approved' | 'draft' | 'completed' | 'paid') => {
    setQuoteFilter(filter);
    setActiveTab('presupuestos');
  };

  const handleStatusChange = async (quoteId: string, nextStatus: string) => {
    try {
      const { data, error } = await supabase.rpc('update_quote_status', {
        quote_id: quoteId,
        next_status: nextStatus,
      });
      if (error) throw error;
      if (!data || !data.id) {
        throw new Error('No se pudo actualizar el estado. Revisa permisos o polÃ­ticas de seguridad.');
      }
      setQuotes((prev) =>
        prev.map((quote) => (quote.id === quoteId ? { ...quote, status: data.status } : quote))
      );
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      alert(error?.message || 'No pudimos actualizar el estado.');
    }
  };

  const persistProfile = async ({
    silent = false,
    refreshNearby = false,
    publishProfile,
  }: {
    silent?: boolean;
    refreshNearby?: boolean;
    publishProfile?: boolean;
  } = {}) => {
    if (!session?.user?.id) return false;
    if (profilePersistInFlightRef.current) return false;
    profilePersistInFlightRef.current = true;

    if (!silent) {
      setProfileSaving(true);
      setProfileMessage('');
    } else {
      setAutoSaveState('saving');
      setAutoSaveMessage('Autoguardando...');
    }

    try {
      const safeTaxId = normalizeTaxId(profileForm.taxId);
      if (safeTaxId && !isValidCuit(safeTaxId)) {
        throw new Error('El CUIT/CUIL ingresado no es valido.');
      }
      const safeBankAlias =
        bankAccountType === 'cbu' ? normalizeCbu(profileForm.bankAlias) : normalizeAlias(profileForm.bankAlias);
      if (safeBankAlias) {
        const isValidBankValue =
          bankAccountType === 'cbu' ? isValidCbu(safeBankAlias) : isValidAlias(safeBankAlias);
        if (!isValidBankValue) {
          throw new Error(
            bankAccountType === 'cbu'
              ? 'El CBU debe tener 22 digitos validos.'
              : 'El alias debe tener entre 6 y 20 caracteres validos.'
          );
        }
      }

      const serializedWorkingHours = buildWorkingHoursPayload(workingHoursConfig);
      const serializedCertifications = buildCertificationsField(profileForm.certifications, certificationFiles);
      const serializedPaymentMethods = serializeDelimitedValues(parseDelimitedValues(profileForm.paymentMethod));
      const normalizedFacebookUrl = toSafeUrl(profileForm.facebookUrl);
      const normalizedInstagramUrl = toSafeUrl(profileForm.instagramUrl);
      const effectiveProfilePublished =
        typeof publishProfile === 'boolean' ? publishProfile : Boolean(profileForm.profilePublished);
      const existingPublishedAt = String(profile?.profile_published_at || '').trim();
      const profilePublishedAt = effectiveProfilePublished ? existingPublishedAt || new Date().toISOString() : null;
      const geocodeQuery = [profileForm.address, profileForm.city].filter(Boolean).join(', ');
      const geocoded = await geocodeAddressFirstResult(geocodeQuery);
      const currentServiceLat = Number(profile?.service_lat);
      const currentServiceLng = Number(profile?.service_lng);
      const serviceLat = geocoded?.lat ?? (Number.isFinite(currentServiceLat) ? currentServiceLat : null);
      const serviceLng = geocoded?.lon ?? (Number.isFinite(currentServiceLng) ? currentServiceLng : null);

      const basePayload = {
        id: session.user.id,
        full_name: profileForm.fullName,
        business_name: profileForm.businessName,
        email: profileForm.email || session.user.email,
        phone: profileForm.phone,
        company_address: profileForm.address,
        address: profileForm.address,
        city: profileForm.city,
        coverage_area: coverageAreaLabel,
        working_hours: serializedWorkingHours,
        specialties: profileForm.specialties,
        certifications: serializedCertifications,
        facebook_url: normalizedFacebookUrl || null,
        instagram_url: normalizedInstagramUrl || null,
        profile_published: effectiveProfilePublished,
        profile_published_at: profilePublishedAt,
        tax_id: safeTaxId,
        tax_status: profileForm.taxStatus,
        payment_method: serializedPaymentMethods,
        bank_alias: safeBankAlias,
        default_currency: profileForm.defaultCurrency,
        default_tax_rate: toNumber(String(profileForm.defaultTaxRate)),
        default_discount: toNumber(String(profileForm.defaultDiscount)),
        company_logo_url: profileForm.companyLogoUrl,
        avatar_url: profileForm.avatarUrl,
        logo_shape: profileForm.logoShape,
      };
      const payloadWithGeo = {
        ...basePayload,
        service_lat: serviceLat,
        service_lng: serviceLng,
        service_radius_km: COVERAGE_RADIUS_KM,
      };

      let { data, error } = await supabase.from('profiles').upsert(payloadWithGeo).select().single();
      if (error) {
        const message = String(error?.message || '').toLowerCase();
        const hasMissingGeoColumn =
          message.includes('service_lat') || message.includes('service_lng') || message.includes('service_radius_km');
        const hasMissingSocialColumn =
          message.includes('facebook_url') ||
          message.includes('instagram_url') ||
          message.includes('profile_published') ||
          message.includes('profile_published_at');
        if (!hasMissingGeoColumn && !hasMissingSocialColumn) throw error;
        if (hasMissingSocialColumn) {
          const tryingSocialOrPublish =
            Boolean(publishProfile) ||
            Boolean(normalizedFacebookUrl) ||
            Boolean(normalizedInstagramUrl) ||
            Boolean(profileForm.profilePublished);
          if (tryingSocialOrPublish) {
            throw new Error('Missing profile_published/profile social columns migration on profiles table.');
          }
        }
        const fallbackPayload = { ...basePayload } as Record<string, any>;
        if (hasMissingSocialColumn) {
          delete fallbackPayload.facebook_url;
          delete fallbackPayload.instagram_url;
          delete fallbackPayload.profile_published;
          delete fallbackPayload.profile_published_at;
        }
        const fallback = await supabase.from('profiles').upsert(fallbackPayload).select().single();
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;

      setProfile(data);
      lastPersistedProfileSignatureRef.current = autoSaveSignature;
      setAutoSaveState('saved');
      if (autoSaveMessageTimerRef.current !== null) {
        window.clearTimeout(autoSaveMessageTimerRef.current);
        autoSaveMessageTimerRef.current = null;
      }

      if (!silent) {
        setProfileMessage(geocoded ? 'Perfil actualizado con geolocalizacion.' : 'Perfil actualizado.');
      } else {
        setAutoSaveMessage('Guardado automatico.');
        autoSaveMessageTimerRef.current = window.setTimeout(() => {
          setAutoSaveMessage('');
          setAutoSaveState('idle');
        }, 1800);
      }

      if (refreshNearby) {
        await fetchNearbyRequests();
      }
      return true;
    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      const translated = translateProfileError(error?.message || '');
      if (!silent) {
        setProfileMessage(translated);
      } else {
        setAutoSaveState('error');
        setAutoSaveMessage(translated);
      }
      return false;
    } finally {
      profilePersistInFlightRef.current = false;
      setProfilePersistTick((value) => value + 1);
      if (!silent) {
        setProfileSaving(false);
      }
    }
  };

  const handleProfileSave = async () => {
    await persistProfile({ silent: false, refreshNearby: true });
  };

  const handleCompanyLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!session?.user?.id) {
      setProfileMessage('Inicia sesion para subir un logo.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Solo se permiten imagenes.');
      return;
    }
    setUploadingCompanyLogo(true);
    setProfileMessage('');
    try {
      const storagePath = `${session.user.id}/profile/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;
      const { data, error } = await supabase
        .from('profiles')
        .update({ company_logo_url: publicUrl })
        .eq('id', session.user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      setProfileForm((prev) => ({ ...prev, companyLogoUrl: publicUrl }));
      setProfileMessage('Logo actualizado.');
    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      setProfileMessage('No pudimos subir el logo.');
    } finally {
      setUploadingCompanyLogo(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!session?.user?.id) {
      setProfileMessage('Inicia sesion para subir una foto.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Solo se permiten imagenes.');
      return;
    }
    setUploadingAvatar(true);
    setProfileMessage('');
    try {
      const storagePath = `${session.user.id}/profile/avatar-${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      setProfileForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      setProfileMessage('Foto actualizada.');
    } catch (error: any) {
      console.error('Error subiendo foto:', error);
      setProfileMessage('No pudimos subir la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCertificationFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    if (!session?.user?.id) {
      setCertificationFilesError('Inicia sesion para adjuntar certificados.');
      return;
    }

    const availableSlots = Math.max(0, CERT_MAX_FILES - certificationFiles.length);
    if (availableSlots <= 0) {
      setCertificationFilesError(`Ya alcanzaste el maximo de ${CERT_MAX_FILES} archivos.`);
      return;
    }

    setUploadingCertificationFiles(true);
    setCertificationFilesError('');
    setProfileMessage('');

    try {
      const uploadQueue = selectedFiles.slice(0, availableSlots);
      const errors: string[] = [];
      const uploadedRows: CertificationFileRow[] = [];

      for (const file of uploadQueue) {
        if (!isAllowedCertificationFile(file)) {
          errors.push(`${file.name}: formato no permitido.`);
          continue;
        }
        if (file.size > CERT_MAX_FILE_BYTES) {
          errors.push(`${file.name}: supera 10 MB.`);
          continue;
        }

        const storagePath = buildCertificationStoragePath(session.user.id, file.name);
        const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

        if (uploadError) {
          errors.push(`${file.name}: no se pudo subir.`);
          continue;
        }

        const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
        uploadedRows.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          url: publicData.publicUrl,
          fileType: file.type || '',
          storagePath,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (uploadedRows.length) {
        setCertificationFiles((prev) => [...prev, ...uploadedRows]);
        setProfileMessage('Archivos cargados.');
      }

      if (selectedFiles.length > availableSlots) {
        errors.push(`Solo se cargaron ${availableSlots} archivo(s) por limite.`);
      }

      if (errors.length) {
        setCertificationFilesError(errors.slice(0, 3).join(' '));
      }
    } catch (error: any) {
      console.error('Error subiendo certificados:', error);
      setCertificationFilesError('No pudimos cargar los archivos de certificaciones.');
    } finally {
      setUploadingCertificationFiles(false);
    }
  };

  const handleRemoveCertificationFile = async (fileId: string) => {
    const target = certificationFiles.find((item) => item.id === fileId);
    if (!target) return;

    setCertificationFiles((prev) => prev.filter((item) => item.id !== fileId));
    setCertificationFilesError('');
    setProfileMessage('Archivo removido.');

    const storagePath = target.storagePath || getAttachmentStoragePath(target.url);
    if (!storagePath) return;

    const { error } = await supabase.storage.from('urbanfix-assets').remove([storagePath]);
    if (error) {
      setCertificationFilesError('El archivo se quito del perfil, pero no pudimos eliminarlo del storage.');
    }
  };

  const handleLogoLoaded = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (!img?.naturalWidth || !img?.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    if (!Number.isFinite(ratio)) return;
    setLogoRatio(ratio);
  };

  const handleDeleteQuote = async (quote: QuoteRow) => {
    if (!confirm(`Â¿Eliminar el presupuesto de ${quote.client_name || 'este cliente'}? Esta acciÃ³n no se puede deshacer.`)) {
      return;
    }
      try {
        setDeletingQuoteId(quote.id);
        const { error } = await supabase.rpc('delete_quote', { p_quote_id: quote.id });
        if (error) throw error;

        setQuotes((prev) => prev.filter((item) => item.id !== quote.id));
        if (activeQuoteId === quote.id) {
        setActiveQuoteId(null);
        setViewerUrl(null);
        setViewerInput('');
        setViewerError('');
      }
    } catch (error: any) {
      console.error('Error eliminando presupuesto:', error);
      alert(error?.message || 'No pudimos eliminar el presupuesto.');
    } finally {
      setDeletingQuoteId(null);
    }
  };

  const handleMarkNotificationRead = async (notif: NotificationRow) => {
    if (!session?.user?.id || notif.read_at) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notif.id)
        .select()
        .single();
      if (error) throw error;
      setNotifications((prev) => prev.map((item) => (item.id === notif.id ? { ...item, ...data } : item)));
    } catch (error) {
      console.error('Error marcando notificacion:', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!session?.user?.id) return;
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (unreadIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .select();
      if (error) throw error;
      const updated = (data as NotificationRow[]) || [];
      setNotifications((prev) =>
        prev.map((item) => updated.find((u) => u.id === item.id) || item)
      );
    } catch (error) {
      console.error('Error marcando notificaciones:', error);
    }
  };

  const handleOpenNotification = async (notif: NotificationRow) => {
    await handleMarkNotificationRead(notif);
    const quoteId = notif?.data?.quote_id;
    if (!quoteId) return;
    try {
      const { data, error } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
      if (error || !data) {
        const nextUrl = buildQuoteLink(quoteId);
        setViewerInput(nextUrl);
        setViewerUrl(nextUrl);
        setViewerError('');
        setActiveTab('visualizador');
        return;
      }
      await loadQuote(data as QuoteRow);
      setActiveTab('presupuestos');
    } catch (error) {
      console.error('Error abriendo presupuesto:', error);
    }
  };

  const copyQuoteLink = async (quoteId?: string) => {
    const targetId = quoteId || activeQuoteId;
    if (!targetId) return { ok: false, url: '' };
    const url = buildQuoteLink(targetId);
    try {
      if (!navigator?.clipboard?.writeText) throw new Error('Clipboard no disponible');
      await navigator.clipboard.writeText(url);
      return { ok: true, url };
    } catch (error) {
      return { ok: false, url };
    }
  };

  const handleSave = async (nextStatus: 'draft' | 'sent') => {
    if (savingRef.current || isSaving) return;
    savingRef.current = true;
    if (!session?.user?.id) {
      setFormError('Inicia sesion para guardar el presupuesto.');
      savingRef.current = false;
      return;
    }
    if (!clientName.trim()) {
      setFormError('Ingresa el nombre del cliente.');
      savingRef.current = false;
      return;
    }
    if (!clientAddress.trim()) {
      setFormError('Ingresa la direccion del trabajo.');
      savingRef.current = false;
      return;
    }
    const cleanedItems = items.filter((item) => item.description.trim());
    if (cleanedItems.length === 0) {
      setFormError('Agrega al menos un item.');
      savingRef.current = false;
      return;
    }
    const itemsSignature = buildItemsSignature(cleanedItems);
    const shouldSyncItems = !activeQuoteId || itemsSignature !== lastSavedItemsSignatureRef.current;

    setIsSaving(true);
    setFormError('');
    setInfoMessage('');
    try {
      const quotePayload = {
        client_name: clientName,
        client_address: clientAddress,
        location_address: geoSelected?.display_name || null,
        location_lat: geoSelected?.lat ?? null,
        location_lng: geoSelected?.lon ?? null,
        total_amount: total,
        tax_rate: applyTax ? TAX_RATE : 0,
        discount_percent: discountPercent,
        status: nextStatus,
        user_id: session.user.id,
      };

      const isEditing = Boolean(activeQuoteId);
      let quoteId = activeQuoteId;
      if (quoteId) {
        const { data: updatedRows, error: updateError } = await supabase
          .from('quotes')
          .update(quotePayload)
          .eq('id', quoteId)
          .select('id');
        if (updateError) throw updateError;
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error('No pudimos actualizar el presupuesto. Revisa permisos o politicas de seguridad.');
        }
      } else {
        const { data, error } = await supabase.from('quotes').insert(quotePayload).select().single();
        if (error) throw error;
        quoteId = data.id;
        setActiveQuoteId(quoteId);
      }

      if (shouldSyncItems && quoteId) {
        if (isEditing) {
          const { data: deletedRows, error: deleteError } = await supabase
            .from('quote_items')
            .delete()
            .eq('quote_id', quoteId)
            .select('id');
          if (deleteError) throw deleteError;
          if (lastSavedItemsCountRef.current > 0 && (deletedRows?.length || 0) === 0) {
            throw new Error(
              'No pudimos reemplazar los items del presupuesto. Revisa permisos o politicas de seguridad.'
            );
          }
        }

        const itemsPayload = cleanedItems.map((item) => ({
          quote_id: quoteId,
          description: item.description,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          metadata: { type: item.type },
        }));
        const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      let postSaveMessage = nextStatus === 'sent' ? 'Presupuesto enviado.' : 'Borrador guardado.';
      if (nextStatus === 'sent') {
        const copyResult = await copyQuoteLink(quoteId || undefined);
        if (copyResult.url) {
          postSaveMessage = copyResult.ok
            ? 'Tu link fue copiado, podes enviarlo.'
            : `No pudimos copiar el link. Copialo manualmente: ${copyResult.url}`;
        }
      }

      await fetchQuotes(session?.user?.id);
      setInfoMessage(postSaveMessage);
      lastSavedItemsSignatureRef.current = itemsSignature;
      lastSavedItemsCountRef.current = cleanedItems.length;
    } catch (error: any) {
      setFormError(error?.message || 'No pudimos guardar el presupuesto.');
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleCopyLink = async (quoteId?: string) => {
    const result = await copyQuoteLink(quoteId);
    if (!result.url) return;
    setInfoMessage(result.ok ? 'Link copiado al portapapeles.' : `Link: ${result.url}`);
  };

  const handleOpenQuoteWindow = (quoteId?: string) => {
    const targetId = quoteId || activeQuoteId;
    if (!targetId) return;
    const url = buildQuoteLink(targetId);
    const windowRef = window.open(
      url,
      'quoteWindow',
      'popup=yes,width=1200,height=800,noopener,noreferrer'
    );
    if (windowRef) {
      windowRef.focus();
    } else {
      setInfoMessage(`Link: ${url}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    resetForm();
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthNotice('');
    const redirectTo = `${window.location.origin}/tecnicos`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const exitRecoveryMode = () => {
    setRecoveryMode(false);
    setRecoveryError('');
    setRecoveryMessage('');
    setRecoveryPassword('');
    setRecoveryConfirm('');
    setAuthMode('login');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/tecnicos');
    }
  };

  const handlePasswordRecovery = async () => {
    setAuthError('');
    setAuthNotice('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Ingresa tu correo para recuperar la contraseÃ±a.');
      return;
    }
    setSendingRecovery(true);
    try {
      const redirectTo = `${window.location.origin}/tecnicos`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) throw error;
      setAuthNotice('Te enviamos un correo para recuperar tu contraseÃ±a.');
    } catch (error: any) {
      setAuthError(error?.message || 'No pudimos enviar el correo de recuperaciÃ³n.');
    } finally {
      setSendingRecovery(false);
    }
  };

  const handleUpdatePassword = async () => {
    setRecoveryError('');
    setRecoveryMessage('');
    if (!session?.user) {
      setRecoveryError('La sesiÃ³n de recuperaciÃ³n no estÃ¡ activa. Abre el enlace del correo nuevamente.');
      return;
    }
    const nextPassword = recoveryPassword.trim();
    const confirmPassword = recoveryConfirm.trim();
    if (!nextPassword) {
      setRecoveryError('Ingresa una nueva contraseÃ±a.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setRecoveryError('Las contraseÃ±as no coinciden.');
      return;
    }
    setUpdatingRecovery(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;
      setRecoveryMessage('Listo. Tu contraseÃ±a fue actualizada.');
      setRecoveryPassword('');
      setRecoveryConfirm('');
    } catch (error: any) {
      setRecoveryError(error?.message || 'No pudimos actualizar la contraseÃ±a.');
    } finally {
      setUpdatingRecovery(false);
    }
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    setAuthNotice('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
          const normalizedFullName = fullName.trim() || 'Tecnico UrbanFix';
          const normalizedBusinessName = businessName.trim() || normalizedFullName;
          const { data: signUpData, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: normalizedFullName, business_name: normalizedBusinessName } },
          });
          if (error) throw error;
          if (signUpData?.user?.id) {
            const { error: profileError } = await supabase.from('profiles').upsert({
              id: signUpData.user.id,
              full_name: normalizedFullName,
              business_name: normalizedBusinessName,
              email,
            });
            if (profileError) throw profileError;
          }
        }
      } catch (error: any) {
        setAuthError(error?.message || 'No pudimos iniciar sesion.');
      }
  };

  useEffect(() => {
    if (!session?.user || activeTab !== 'soporte') return;
    if (isBetaAdmin) {
      fetchSupportUsers();
    }
    fetchSupportMessages();
  }, [activeTab, session?.user?.id, isBetaAdmin, activeSupportUserId]);

  const profileRequiredMissing = useMemo(() => {
    const missing: string[] = [];
    const full = String(profile?.full_name || '').trim();
    const business = String(profile?.business_name || '').trim();
    const phone = String(profile?.phone || '').trim();
    const address = String(profile?.company_address || profile?.address || '').trim();
    if (!full) missing.push('Nombre y apellido');
    if (!business) missing.push('Nombre del negocio');
    if (!phone) missing.push('Telefono / WhatsApp');
    if (!address) missing.push('Direccion base');
    return missing;
  }, [profile?.address, profile?.business_name, profile?.company_address, profile?.full_name, profile?.phone]);

  const formRequiredMissing = useMemo(() => {
    const missing: string[] = [];
    if (!profileForm.fullName.trim()) missing.push('Nombre y apellido');
    if (!profileForm.businessName.trim()) missing.push('Nombre del negocio');
    if (!profileForm.phone.trim()) missing.push('Telefono / WhatsApp');
    if (!profileForm.address.trim()) missing.push('Direccion base');
    return missing;
  }, [profileForm.address, profileForm.businessName, profileForm.fullName, profileForm.phone]);

  const canSaveRequiredProfile =
    Boolean(profileForm.fullName.trim()) &&
    Boolean(profileForm.businessName.trim()) &&
    Boolean(profileForm.phone.trim()) &&
    Boolean(profileForm.address.trim());

  const selectedSpecialties = useMemo(() => parseSpecialties(profileForm.specialties), [profileForm.specialties]);
  const selectedSpecialtiesSet = useMemo(
    () => new Set(selectedSpecialties.map((item) => normalizeTextForParsing(item))),
    [selectedSpecialties]
  );

  const handleSpecialtyToggle = (specialty: string) => {
    setProfileForm((prev) => ({
      ...prev,
      specialties: toggleSpecialty(prev.specialties, specialty),
    }));
  };

  const handleAddCustomSpecialty = () => {
    const customValue = customSpecialtyDraft.trim();
    if (!customValue) return;
    setProfileForm((prev) => ({
      ...prev,
      specialties: upsertSpecialty(prev.specialties, customValue),
    }));
    setCustomSpecialtyDraft('');
  };

  const selectedPaymentMethods = useMemo(
    () => parseDelimitedValues(profileForm.paymentMethod),
    [profileForm.paymentMethod]
  );
  const selectedPaymentMethodsSet = useMemo(
    () => new Set(selectedPaymentMethods.map((item) => normalizeTextForParsing(item))),
    [selectedPaymentMethods]
  );

  const handlePaymentMethodToggle = (method: string) => {
    const key = normalizeTextForParsing(method);
    const filtered = selectedPaymentMethods.filter((item) => normalizeTextForParsing(item) !== key);
    if (filtered.length !== selectedPaymentMethods.length) {
      setProfileForm((prev) => ({ ...prev, paymentMethod: serializeDelimitedValues(filtered) }));
      return;
    }
    setProfileForm((prev) => ({
      ...prev,
      paymentMethod: serializeDelimitedValues([...selectedPaymentMethods, method]),
    }));
  };

  const handleAddCustomPaymentMethod = () => {
    const customValue = customPaymentMethodDraft.trim();
    if (!customValue) return;
    const key = normalizeTextForParsing(customValue);
    if (selectedPaymentMethodsSet.has(key)) {
      setCustomPaymentMethodDraft('');
      return;
    }
    setProfileForm((prev) => ({
      ...prev,
      paymentMethod: serializeDelimitedValues([...selectedPaymentMethods, customValue]),
    }));
    setCustomPaymentMethodDraft('');
  };

  const handleCopyPublicProfileLink = async () => {
    if (!publicProfileUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicProfileUrl);
        setProfileMessage('Link publico copiado.');
        return;
      }
    } catch {
      // Fallback below.
    }
    setProfileMessage(`Link publico: ${publicProfileUrl}`);
  };

  const handlePublishProfile = async () => {
    if (!session?.user?.id) {
      setProfileMessage('Inicia sesion para publicar tu perfil.');
      return;
    }
    if (!profileForm.profilePublished) {
      setProfileForm((prev) => ({ ...prev, profilePublished: true }));
      const published = await persistProfile({ silent: false, refreshNearby: false, publishProfile: true });
      if (!published) {
        setProfileForm((prev) => ({ ...prev, profilePublished: false }));
        return;
      }
      setProfileMessage('Perfil publicado.');
      return;
    }
    await handleCopyPublicProfileLink();
  };

  const handleSharePublicProfileWhatsApp = () => {
    if (!profileForm.profilePublished || !publicProfileUrl) {
      setProfileMessage('Publica tu perfil antes de compartir.');
      return;
    }
    if (typeof window === 'undefined') return;
    const text = encodeURIComponent(
      `Mira mi perfil profesional en UrbanFix: ${publicProfileUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleSharePublicProfileFacebook = () => {
    if (!profileForm.profilePublished || !publicProfileUrl) {
      setProfileMessage('Publica tu perfil antes de compartir.');
      return;
    }
    if (typeof window === 'undefined') return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicProfileUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const normalizedTaxIdValue = useMemo(() => normalizeTaxId(profileForm.taxId), [profileForm.taxId]);
  const taxIdIsComplete = normalizedTaxIdValue.length === 11;
  const taxIdIsValid = taxIdIsComplete && isValidCuit(normalizedTaxIdValue);
  const taxIdHelper = !normalizedTaxIdValue
    ? 'Ingresa 11 digitos de CUIT/CUIL.'
    : taxIdIsValid
      ? 'CUIT/CUIL valido.'
      : 'CUIT/CUIL incompleto o invalido.';

  const normalizedBankValue = useMemo(
    () => (bankAccountType === 'cbu' ? normalizeCbu(profileForm.bankAlias) : normalizeAlias(profileForm.bankAlias)),
    [bankAccountType, profileForm.bankAlias]
  );
  const bankValueIsValid = !normalizedBankValue
    ? true
    : bankAccountType === 'cbu'
      ? isValidCbu(normalizedBankValue)
      : isValidAlias(normalizedBankValue);
  const bankValueHelper = bankAccountType === 'cbu'
    ? 'CBU de 22 digitos.'
    : 'Alias entre 6 y 20 caracteres (letras, numeros, punto o guion).';

  const workingHoursConfig = useMemo<WorkingHoursConfig>(
    () => ({
      weekdayFrom: normalizeTimeValue(profileForm.weekdayFrom, DEFAULT_WORKING_HOURS_CONFIG.weekdayFrom),
      weekdayTo: normalizeTimeValue(profileForm.weekdayTo, DEFAULT_WORKING_HOURS_CONFIG.weekdayTo),
      saturdayEnabled: Boolean(profileForm.saturdayEnabled),
      saturdayFrom: normalizeTimeValue(profileForm.saturdayFrom, DEFAULT_WORKING_HOURS_CONFIG.saturdayFrom),
      saturdayTo: normalizeTimeValue(profileForm.saturdayTo, DEFAULT_WORKING_HOURS_CONFIG.saturdayTo),
      sundayEnabled: Boolean(profileForm.sundayEnabled),
      sundayFrom: normalizeTimeValue(profileForm.sundayFrom, DEFAULT_WORKING_HOURS_CONFIG.sundayFrom),
      sundayTo: normalizeTimeValue(profileForm.sundayTo, DEFAULT_WORKING_HOURS_CONFIG.sundayTo),
    }),
    [
      profileForm.weekdayFrom,
      profileForm.weekdayTo,
      profileForm.saturdayEnabled,
      profileForm.saturdayFrom,
      profileForm.saturdayTo,
      profileForm.sundayEnabled,
      profileForm.sundayFrom,
      profileForm.sundayTo,
    ]
  );

  const workingHoursLabel = useMemo(() => formatWorkingHoursLabel(workingHoursConfig), [workingHoursConfig]);
  const coverageAreaLabel = useMemo(() => buildCoverageAreaLabel(profileForm.city || ''), [profileForm.city]);
  const facebookPreviewEmbedUrl = useMemo(
    () => buildFacebookTimelineEmbedUrl(profileForm.facebookUrl),
    [profileForm.facebookUrl]
  );
  const instagramPreviewEmbedUrl = useMemo(
    () => buildInstagramEmbedUrl(profileForm.instagramUrl),
    [profileForm.instagramUrl]
  );
  const publicProfileUrl = useMemo(() => {
    if (typeof window === 'undefined' || !session?.user?.id) return '';
    return `${window.location.origin}/tecnico/${session.user.id}`;
  }, [session?.user?.id]);
  const publicShowcaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/vidriera`;
  }, []);
  const autoSaveSignature = useMemo(
    () =>
      JSON.stringify({
        fullName: profileForm.fullName.trim(),
        businessName: profileForm.businessName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        coverageArea: coverageAreaLabel,
        workingHours: buildWorkingHoursPayload(workingHoursConfig),
        specialties: serializeDelimitedValues(parseSpecialties(profileForm.specialties)),
        certifications: profileForm.certifications.trim(),
        facebookUrl: toSafeUrl(profileForm.facebookUrl),
        instagramUrl: toSafeUrl(profileForm.instagramUrl),
        profilePublished: Boolean(profileForm.profilePublished),
        certificationFiles: certificationFiles.map((file) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          fileType: file.fileType,
          storagePath: file.storagePath || null,
        })),
        taxId: normalizeTaxId(profileForm.taxId),
        taxStatus: profileForm.taxStatus.trim(),
        paymentMethod: serializeDelimitedValues(parseDelimitedValues(profileForm.paymentMethod)),
        bankAlias: bankAccountType === 'cbu' ? normalizeCbu(profileForm.bankAlias) : normalizeAlias(profileForm.bankAlias),
        defaultCurrency: profileForm.defaultCurrency,
        defaultTaxRate: toNumber(String(profileForm.defaultTaxRate)),
        defaultDiscount: toNumber(String(profileForm.defaultDiscount)),
        companyLogoUrl: profileForm.companyLogoUrl.trim(),
        avatarUrl: profileForm.avatarUrl.trim(),
        logoShape: profileForm.logoShape,
      }),
    [
      bankAccountType,
      certificationFiles,
      coverageAreaLabel,
      profileForm.address,
      profileForm.avatarUrl,
      profileForm.bankAlias,
      profileForm.businessName,
      profileForm.certifications,
      profileForm.city,
      profileForm.companyLogoUrl,
      profileForm.defaultCurrency,
      profileForm.defaultDiscount,
      profileForm.defaultTaxRate,
      profileForm.email,
      profileForm.fullName,
      profileForm.facebookUrl,
      profileForm.instagramUrl,
      profileForm.logoShape,
      profileForm.paymentMethod,
      profileForm.phone,
      profileForm.profilePublished,
      profileForm.specialties,
      profileForm.taxId,
      profileForm.taxStatus,
      workingHoursConfig,
    ]
  );

  useEffect(() => {
    if (!session?.user?.id || !profileHydrated || autoSaveBootstrapped) return;
    lastPersistedProfileSignatureRef.current = autoSaveSignature;
    setAutoSaveBootstrapped(true);
    setAutoSaveState('idle');
    setAutoSaveMessage('');
  }, [autoSaveBootstrapped, autoSaveSignature, profileHydrated, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || !autoSaveBootstrapped) return;
    if (profilePersistInFlightRef.current) return;
    if (autoSaveSignature === lastPersistedProfileSignatureRef.current) return;

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      persistProfile({ silent: true, refreshNearby: false });
    }, 900);

    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSaveBootstrapped, autoSaveSignature, profilePersistTick, session?.user?.id]);

  const sessionMediaOverlays = session?.user ? (
    <>
      {resumeStaticVisible && RESUME_STATIC_IMAGE_URL && !postLoginVideoVisible && (
        <div className="fixed inset-0 z-[120] bg-black" aria-hidden="true">
          <img src={RESUME_STATIC_IMAGE_URL} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      {postLoginVideoVisible && postLoginVideoAvailable && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black" aria-hidden="true">
          <video
            ref={postLoginVideoRef}
            src={POST_LOGIN_VIDEO_URL}
            poster={RESUME_STATIC_IMAGE_URL || ACCESS_VIDEO_POSTER_URL}
            autoPlay
            playsInline
            preload="auto"
            muted={false}
            onEnded={() => setPostLoginVideoVisible(false)}
            onError={() => {
              setPostLoginVideoAvailable(false);
              setPostLoginVideoVisible(false);
            }}
            className="h-auto w-[60vw] max-w-[360px] min-w-[220px] object-contain"
          />
        </div>
      )}
    </>
  ) : null;

  if (loadingSession) {
    return (
      <>
        <AuthHashHandler />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-muted)] flex items-center justify-center`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-sm text-slate-500 shadow-sm">
            Cargando...
          </div>
        </div>
      </>
    );
  }

  if (session?.user && adminGateStatus === 'checking') {
    return (
      <>
        <AuthHashHandler />
        {sessionMediaOverlays}
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-muted)] flex items-center justify-center`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-sm text-slate-500 shadow-sm">
            Validando acceso...
          </div>
        </div>
      </>
    );
  }

  if (session?.user && isBetaAdmin) {
    return (
      <>
        <AuthHashHandler />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)] flex items-center justify-center`}
        >
          <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
            <h1 className="text-2xl font-bold text-slate-900">Acceso administrativo</h1>
            <p className="mt-3 text-sm text-slate-600">
              Tu cuenta estÃ¡ configurada como admin. Te llevamos al panel de control.
            </p>
            <a
              href="/admin"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800"
            >
              Ir al panel admin
            </a>
          </div>
        </div>
      </>
    );
  }

  if (recoveryMode) {
    return (
      <>
        <AuthHashHandler />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
        >
          <div className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_55%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0F172A]/10 blur-3xl"
            />

            <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6 text-center md:text-left">
                <div className="flex items-center justify-center gap-3 md:justify-start">
                  <div
                    style={brandLogoUrl ? ({ aspectRatio: logoAspect } as React.CSSProperties) : undefined}
                    className={`flex h-14 w-auto min-w-14 max-w-[112px] items-center justify-center ring-1 ring-slate-200 shadow-lg shadow-slate-200/60 overflow-hidden ${logoPresentation.frame} ${logoPresentation.padding} ${
                      brandLogoUrl ? 'bg-white' : 'bg-white'
                    }`}
                  >
                    {brandLogoUrl ? (
                      <img
                        src={brandLogoUrl}
                        alt="Logo de empresa"
                        onLoad={handleLogoLoaded}
                        className={`h-full w-full ${logoPresentation.img}`}
                      />
                    ) : (
                      <img src="/icon.png" alt="UrbanFix logo" className="h-10 w-10" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">UrbanFix</p>
                    <p className="text-sm font-semibold text-slate-700">Panel tecnico</p>
                  </div>
                </div>
                <h1 className="text-5xl font-black text-slate-900 md:text-6xl">Restablecer contraseÃ±a</h1>
                <p className="text-base text-slate-600 md:text-lg">
                  Define una nueva contraseÃ±a para volver a acceder a tu cuenta.
                </p>
                <button
                  type="button"
                  onClick={exitRecoveryMode}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Volver al inicio
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-slate-900">Nueva contraseÃ±a</h2>
                  <p className="text-sm text-slate-600">Ingresa tu nueva contraseÃ±a para finalizar.</p>
                </div>

                {!session?.user && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    La sesiÃ³n de recuperaciÃ³n no estÃ¡ activa. Abre el enlace del correo nuevamente.
                  </div>
                )}

                {session?.user && (
                  <>
                    <div className="mt-6 space-y-3">
                      <input
                        value={recoveryPassword}
                        onChange={(event) => setRecoveryPassword(event.target.value)}
                        type="password"
                        placeholder="Nueva contraseÃ±a"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <input
                        value={recoveryConfirm}
                        onChange={(event) => setRecoveryConfirm(event.target.value)}
                        type="password"
                        placeholder="Repetir contraseÃ±a"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>

                    {recoveryError && <p className="mt-4 text-xs text-amber-600">{recoveryError}</p>}
                    {recoveryMessage && <p className="mt-4 text-xs text-emerald-600">{recoveryMessage}</p>}

                    {!recoveryMessage && (
                      <button
                        type="button"
                        onClick={handleUpdatePassword}
                        disabled={updatingRecovery}
                        className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {updatingRecovery ? 'Actualizando...' : 'Guardar nueva contraseÃ±a'}
                      </button>
                    )}

                    {recoveryMessage && (
                      <button
                        type="button"
                        onClick={exitRecoveryMode}
                        className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800"
                      >
                        Ir al panel
                      </button>
                    )}
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (session?.user && profile && profileRequiredMissing.length > 0) {
    return (
      <>
        <AuthHashHandler />
        {sessionMediaOverlays}
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
        >
          <div className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_55%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0F172A]/10 blur-3xl"
            />

            <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                  Primer ingreso
                </div>
                <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">Configura tu perfil</h1>
                <p className="text-base text-slate-600 md:text-lg">
                  Antes de crear presupuestos necesitamos tus datos basicos. Esto se muestra en el link publico y en el
                  PDF que recibe tu cliente.
                </p>

                <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/60">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Por que te lo pedimos</p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-slate-900" />
                      Tu cliente identifica rapido tu negocio y confia mas en el presupuesto.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-slate-900" />
                      Evitas preguntas repetidas (telefono, direccion, horarios) y aceleras la aprobacion.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-slate-900" />
                      Tu marca (logo + foto) hace que el documento se vea profesional y memorizable.
                    </li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Consejo de marca</p>
                  <p className="mt-3 text-sm text-slate-600">
                    Logo recomendado: fondo transparente o claro, alto contraste y version horizontal si es posible.
                    Foto recomendada: rostro visible, luz natural y fondo simple.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                    {profileForm.companyLogoUrl ? (
                      <img
                        src={profileForm.companyLogoUrl}
                        alt="Logo"
                        onLoad={handleLogoLoaded}
                        className="h-full w-full object-contain p-6"
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">Tu logo / banner</p>
                        <p className="mt-1 text-xs text-white/70">Recomendado: 1200x675 (16:9)</p>
                      </div>
                    )}
                    <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-white">
                      {uploadingCompanyLogo ? 'Subiendo...' : 'Subir logo'}
                      <input type="file" accept="image/*" onChange={handleCompanyLogoUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="relative flex flex-wrap items-end gap-4 px-6 pb-6 pt-0">
                    <div className="-mt-8 flex items-end gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">
                        {profileForm.avatarUrl ? (
                          <img src={profileForm.avatarUrl} alt="Foto" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                            {(profileForm.fullName || profileForm.businessName || 'U')[0]?.toUpperCase()}
                          </div>
                        )}
                        <label className="absolute bottom-1 right-1 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 p-2 text-white shadow-sm transition hover:bg-slate-800">
                          {uploadingAvatar ? (
                            <span className="text-[10px] font-semibold">...</span>
                          ) : (
                            <User className="h-3.5 w-3.5" />
                          )}
                          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                        </label>
                      </div>

                      <div className="pb-1">
                        <p className="text-base font-semibold text-slate-900">
                          {profileForm.businessName || 'Tu negocio'}
                        </p>
                        <p className="text-sm text-slate-500">{profileForm.fullName || 'Tu nombre'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Nombre y apellido</label>
                      <input
                        value={profileForm.fullName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Nombre del negocio</label>
                      <input
                        value={profileForm.businessName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, businessName: event.target.value }))
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Telefono / WhatsApp</label>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="+54 9 ..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Email</label>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Direccion base</label>
                    <input
                      value={profileForm.address}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="Calle y ciudad"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  {!canSaveRequiredProfile && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                      Falta completar: {formRequiredMissing.join(', ')}.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={profileSaving || !canSaveRequiredProfile}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {profileSaving ? 'Guardando...' : 'Guardar y entrar'}
                  </button>

                  {profileMessage && <p className="text-xs text-slate-600">{profileMessage}</p>}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (!session?.user) {
    return (
      <>
        <AuthHashHandler />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
        >
          <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_55%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0F172A]/10 blur-3xl"
          />

          <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 text-center md:text-left">
              <div className="flex items-center justify-center gap-3 md:justify-start">
                <div
                  style={brandLogoUrl ? ({ aspectRatio: logoAspect } as React.CSSProperties) : undefined}
                  className={`flex h-14 w-auto min-w-14 max-w-[112px] items-center justify-center ring-1 ring-slate-200 shadow-lg shadow-slate-200/60 overflow-hidden ${logoPresentation.frame} ${logoPresentation.padding} ${
                    brandLogoUrl ? 'bg-white' : 'bg-white'
                  }`}
                >
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt="Logo de empresa"
                      onLoad={handleLogoLoaded}
                      className={`h-full w-full ${logoPresentation.img}`}
                    />
                  ) : (
                    <img src="/icon.png" alt="UrbanFix logo" className="h-10 w-10" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">UrbanFix</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {!selectedAccessProfile ? 'Acceso inicial' : accessProfileCopy.panelLabel}
                  </p>
                </div>
              </div>
              <h1 className="text-5xl font-black text-slate-900 md:text-6xl">
                {!selectedAccessProfile ? 'Elige como quieres ingresar' : accessProfileCopy.heading}
              </h1>
              <p className="text-base text-slate-600 md:text-lg">
                {!selectedAccessProfile
                  ? 'Antes de entrar, selecciona si eres tecnico, empresa o cliente para ir al flujo correcto.'
                  : accessProfileCopy.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {selectedAccessProfile && (
                  <button
                    type="button"
                    onClick={handleBackToProfileSelector}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Cambiar perfil
                  </button>
                )}
                <a
                  href="https://www.urbanfix.com.ar"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Volver al inicio
                </a>
              </div>
            </div>

            {!selectedAccessProfile ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-slate-900">Selecciona tu perfil</h2>
                  <p className="text-sm text-slate-600">Esto define a quÃ© panel o vista te llevamos.</p>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => handleAccessProfileSelect('tecnico')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400"
                  >
                    <p className="text-sm font-bold text-slate-900">Tecnico</p>
                    <p className="mt-1 text-xs text-slate-600">Crear presupuestos y hacer seguimiento de obras.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccessProfileSelect('empresa')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400"
                  >
                    <p className="text-sm font-bold text-slate-900">Empresa</p>
                    <p className="mt-1 text-xs text-slate-600">Gestion comercial, responsables y operacion.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccessProfileSelect('cliente')}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400"
                  >
                    <p className="text-sm font-bold text-slate-900">Cliente</p>
                    <p className="mt-1 text-xs text-slate-600">Quiero pedir y revisar una cotizacion de reparacion.</p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {quickRegisterMode ? 'Registro en 2 segundos' : 'Ingresa a tu cuenta'}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {quickRegisterMode
                      ? 'Entra con Google o crea tu cuenta con correo en un paso.'
                      : 'Accede con Google o con tu correo.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    quickRegisterMode
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-400/40 hover:bg-slate-800'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  {quickRegisterMode ? 'Continuar con Google (recomendado)' : 'Continuar con Google'}
                </button>

                {quickRegisterMode && (
                  <p className="mt-2 text-xs text-emerald-600">
                    Acceso rapido activo. Completas tu perfil despues de entrar.
                  </p>
                )}

                <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                  <div className="h-px flex-1 bg-slate-200" />
                  o
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setQuickRegisterMode(false);
                      setAuthError('');
                      setAuthNotice('');
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      authMode === 'login'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    Iniciar sesion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                      setAuthNotice('');
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      authMode === 'register'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                {authMode === 'register' && !quickRegisterMode && (
                  <div className="space-y-3">
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Nombre completo"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                    <input
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder={selectedAccessProfile === 'empresa' ? 'Nombre de la empresa' : 'Nombre del negocio'}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>
                )}

                {authMode === 'register' && quickRegisterMode && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                    Alta rapida por correo habilitada. Nombre y negocio se completan luego en perfil.
                    <button
                      type="button"
                      onClick={() => setQuickRegisterMode(false)}
                      className="ml-2 font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
                    >
                      Cargar datos ahora
                    </button>
                  </div>
                )}

                <div className="mt-4 space-y-3">
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
                    placeholder="Contrasena"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                </div>

                {authMode === 'login' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasswordRecovery}
                      disabled={sendingRecovery}
                      className="text-xs font-semibold text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {sendingRecovery ? 'Enviando correo...' : 'Olvidaste tu contraseÃ±a?'}
                    </button>
                  </div>
                )}

                {authNotice && <p className="mt-4 text-xs text-emerald-600">{authNotice}</p>}
                {authError && <p className="mt-4 text-xs text-amber-600">{authError}</p>}

                <button
                  type="button"
                  onClick={handleEmailAuth}
                  className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-400/40 transition hover:bg-slate-800"
                >
                  {authMode === 'login' ? 'Iniciar sesion' : quickRegisterMode ? 'Crear cuenta en 1 paso' : 'Crear cuenta'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                    setAuthNotice('');
                  }}
                  className="mt-4 w-full text-sm text-slate-500 hover:text-slate-800"
                >
                  {authMode === 'login' ? 'No tienes cuenta? Registrate' : 'Ya tienes cuenta? Ingresa'}
                </button>
              </div>
            )}
          </main>
        </div>
        </div>
      </>
    );
  }

  return (
    <div
      style={activeThemeStyles}
      data-ui-theme={uiTheme}
      className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
    >
      <AuthHashHandler />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_55%)]" />
        <div className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-[#F5B942]/15 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#0EA5E9]/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-none gap-6 px-4 pb-28 pt-8 md:px-6">
          <aside
            onMouseEnter={() => setIsNavHovered(true)}
            onMouseLeave={() => setIsNavHovered(false)}
            className={`hidden lg:flex flex-col self-start overflow-hidden rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/90 shadow-lg shadow-slate-200/50 backdrop-blur transition-all lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] ${
              isNavExpanded ? 'w-72' : 'w-20'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div
                  style={brandLogoUrl ? ({ aspectRatio: logoAspect } as React.CSSProperties) : undefined}
                  className={`flex h-11 w-auto min-w-11 max-w-[88px] items-center justify-center ring-1 ring-slate-200 shadow-lg shadow-slate-200/30 overflow-hidden ${logoPresentation.frame} ${logoPresentation.padding} ${
                    brandLogoUrl ? 'bg-white' : 'bg-slate-900'
                  }`}
                >
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt="Logo de empresa"
                      onLoad={handleLogoLoaded}
                      className={`h-full w-full ${logoPresentation.img}`}
                    />
                  ) : (
                    <img src="/icon.png" alt="UrbanFix logo" className="h-7 w-7" />
                  )}
                </div>
                {isNavExpanded && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">UrbanFix</p>
                    <p className="text-sm font-semibold text-[color:var(--ui-ink)]">
                      {profile?.business_name || 'Panel tecnico'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {isNavExpanded && (
              <div className="px-4">
                <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-3 py-2 text-xs text-[color:var(--ui-muted)]">
                  <Search className="h-4 w-4" />
                  <input
                    value={navSearch}
                    onChange={(event) => setNavSearch(event.target.value)}
                    placeholder="Buscar seccion..."
                    className="w-full bg-transparent text-xs font-semibold text-[color:var(--ui-ink)] outline-none placeholder:text-[color:var(--ui-muted)]/70"
                  />
                </div>
              </div>
            )}

            {isNavExpanded && (
              <p className="px-4 pt-4 text-[11px] uppercase tracking-[0.3em] text-slate-400">Menu</p>
            )}

            <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-0 pb-3">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNavKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    title={!isNavExpanded ? item.label : undefined}
                    onClick={() => {
                      setActiveTab(item.key);
                      if (item.key === 'presupuestos') setQuoteFilter('all');
                    }}
                    className={`group flex w-full items-center rounded-2xl py-2 text-sm font-semibold transition ${
                      isNavExpanded ? 'gap-3 px-6' : 'justify-center px-0'
                    } ${
                      isActive
                        ? 'bg-[color:var(--ui-accent)] text-white shadow-sm'
                        : 'text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-accent)]/10 hover:text-[color:var(--ui-ink)]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-white' : 'text-[color:var(--ui-muted)] group-hover:text-[color:var(--ui-ink)]'
                      }`}
                    />
                    {isNavExpanded && <span className="flex-1 text-left">{item.label}</span>}
                    {isNavExpanded && item.key === 'notificaciones' && unreadNotifications > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-[color:var(--ui-border)]/80 px-4 py-4">
              <button
                type="button"
                title={!isNavExpanded ? (uiTheme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
                onClick={toggleUiTheme}
                className={`flex w-full items-center rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-3 py-2 text-xs font-semibold text-[color:var(--ui-muted)] transition hover:bg-[color:var(--ui-accent)]/10 hover:text-[color:var(--ui-ink)] ${
                  isNavExpanded ? 'gap-3' : 'justify-center'
                }`}
              >
                {uiTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isNavExpanded && (
                  <span className="flex-1 text-left">{uiTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
                )}
                {isNavExpanded && (
                  <span className="rounded-full bg-[color:var(--ui-accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--ui-muted)]">
                    {uiTheme === 'dark' ? 'Oscuro' : 'Claro'}
                  </span>
                )}
              </button>

              <div className={`mt-3 flex items-center gap-3 ${isNavExpanded ? '' : 'justify-center'}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-xs font-semibold text-[color:var(--ui-muted)]">
                  {(profile?.business_name || 'U')[0]}
                </div>
                {isNavExpanded && (
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[color:var(--ui-ink)]">
                      {profile?.business_name || 'UrbanFix'}
                    </p>
                    <p className="truncate text-[10px] text-[color:var(--ui-muted)]">
                      {session?.user?.email || 'Cuenta demo'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/70 p-2 shadow-sm backdrop-blur lg:hidden">
              <div className="flex items-center gap-2 overflow-x-auto">
                {navItems.map((item) => {
                  const isActive = activeNavKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.key);
                        if (item.key === 'presupuestos') setQuoteFilter('all');
                      }}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                        isActive
                          ? 'bg-[color:var(--ui-accent)] text-white shadow-sm'
                          : 'bg-[color:var(--ui-card)] text-[color:var(--ui-muted)] hover:bg-[color:var(--ui-accent)]/10 hover:text-[color:var(--ui-ink)]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.label}
                        {item.key === 'notificaciones' && unreadNotifications > 0 && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {unreadNotifications}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <span className="ml-auto hidden shrink-0 rounded-full bg-[color:var(--ui-card)] px-3 py-1 text-[10px] font-semibold text-[color:var(--ui-muted)] sm:inline-flex">
                  {quotes.length} activos
                </span>
              </div>
            </div>

            <main className="relative pt-6">
          <section className="space-y-6">
            {activeTab === 'lobby' && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Total presupuestos</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('all')}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{quoteStats.total}</p>
                    <p className="mt-1 text-xs text-slate-500">Activos en tu cuenta</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Pendientes</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('pending')}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-amber-600">{quoteStats.pending}</p>
                    <p className="mt-1 text-xs text-slate-500">En espera de respuesta</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Aprobados</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('approved')}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{quoteStats.approved}</p>
                    <p className="mt-1 text-xs text-slate-500">Listos para ejecutar</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cobrados</p>
                      <button
                        type="button"
                        onClick={() => handleShowQuotes('paid')}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200"
                      >
                        Ver
                      </button>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-emerald-600">{quoteStats.paid}</p>
                    <p className="mt-1 text-xs text-slate-500">Pagos confirmados</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Facturacion estimada</p>
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-slate-900" />
                            Total
                          </div>
                          <p className="mt-3 text-xl font-semibold text-slate-900">
                            ${quoteStats.amount.toLocaleString('es-AR')}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Presupuestos activos.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Cobrado
                          </div>
                          <p className="mt-3 text-xl font-semibold text-amber-600">
                            ${quoteStats.paidAmount.toLocaleString('es-AR')}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Monto cobrado.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Mano de obra
                          </div>
                          <p className="mt-3 text-xl font-semibold text-emerald-600">
                            ${quoteStats.profitAmount.toLocaleString('es-AR')}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">Total de mano de obra cobrada.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Tendencia 6 meses</p>
                          <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-slate-900" />
                              Presupuestos
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              Cobrados
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Mano de obra
                            </span>
                          </div>
                        </div>
                        <svg
                          viewBox={`0 0 ${financeChart.width} ${financeChart.height}`}
                          className="mt-3 h-24 w-full"
                          role="img"
                          aria-label="Grafico de presupuestos y mano de obra"
                        >
                          <path
                            d={financeChart.quotesPath}
                            fill="none"
                            stroke="#0F172A"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={financeChart.paidPath}
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={financeChart.profitPath}
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {financeChart.quotesPoints.map((point, index) => (
                            <circle key={`q-${index}`} cx={point.x} cy={point.y} r="2" fill="#0F172A" />
                          ))}
                          {financeChart.paidPoints.map((point, index) => (
                            <circle key={`a-${index}`} cx={point.x} cy={point.y} r="2" fill="#F59E0B" />
                          ))}
                          {financeChart.profitPoints.map((point, index) => (
                            <circle key={`p-${index}`} cx={point.x} cy={point.y} r="2" fill="#10B981" />
                          ))}
                        </svg>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          {financeSeries.map((item) => (
                            <span key={item.key} className="uppercase">
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Ultimos presupuestos</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('presupuestos')}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Ver todos
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {recentQuotes.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                          Todavia no hay presupuestos cargados.
                        </div>
                      )}
                      {recentQuotes.map((quote) => (
                        <button
                          key={quote.id}
                          type="button"
                          onClick={() => loadQuote(quote)}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{quote.client_name || 'Presupuesto'}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(quote.created_at).toLocaleDateString('es-AR')}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            ${(quote.total_amount || 0).toLocaleString('es-AR')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mapa operativo</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        Trabajos propios + solicitudes por zona
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Visualiza tus trabajos con ubicacion y las nuevas solicitudes cercanas dentro del radio activo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchNearbyRequests}
                      disabled={loadingNearbyRequests}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingNearbyRequests ? 'Actualizando...' : 'Actualizar solicitudes'}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDashboardMapFilter('all')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        dashboardMapFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Todo ({dashboardRequestPoints.length + dashboardJobPoints.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardMapFilter('jobs')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        dashboardMapFilter === 'jobs'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Mis trabajos ({dashboardJobPoints.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardMapFilter('requests')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        dashboardMapFilter === 'requests'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Solicitudes ({dashboardRequestPoints.length})
                    </button>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      Radio: {technicianRadiusKm} km
                    </span>
                    {technicianWithinWorkingHours !== null && (
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          technicianWithinWorkingHours
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {technicianWithinWorkingHours ? 'Dentro de horario' : 'Fuera de horario'}
                      </span>
                    )}
                  </div>
                  {technicianWorkingHoursLabel && (
                    <p className="mt-2 text-xs text-slate-500">Horario activo: {technicianWorkingHoursLabel}</p>
                  )}
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Rubro
                        <select
                          value={requestBoardCategoryFilter}
                          onChange={(event) => setRequestBoardCategoryFilter(event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                        >
                          <option value="all">Ver todo</option>
                          {requestBoardCategoryOptions.map((option) => (
                            <option key={`request-category-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11px] font-semibold text-slate-600">
                        Ciudad
                        <select
                          value={requestBoardCityFilter}
                          onChange={(event) => setRequestBoardCityFilter(event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                        >
                          <option value="all">Ver todo</option>
                          {requestBoardCityOptions.map((option) => (
                            <option key={`request-city-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11px] font-semibold text-slate-600">
                        Tipo
                        <select
                          value={requestBoardModeFilter}
                          onChange={(event) =>
                            setRequestBoardModeFilter(event.target.value as 'all' | 'marketplace' | 'direct')
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                        >
                          <option value="all">Ver todo</option>
                          <option value="marketplace">Cotizacion multiple</option>
                          <option value="direct">Asignacion directa</option>
                        </select>
                      </label>
                      <label className="text-[11px] font-semibold text-slate-600">
                        Urgencia
                        <select
                          value={requestBoardUrgencyFilter}
                          onChange={(event) =>
                            setRequestBoardUrgencyFilter(event.target.value as 'all' | 'alta' | 'media' | 'baja')
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                        >
                          <option value="all">Ver todo</option>
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                      </label>
                      <label className="text-[11px] font-semibold text-slate-600">
                        Ordenar
                        <select
                          value={requestBoardSort}
                          onChange={(event) =>
                            setRequestBoardSort(event.target.value as 'recent' | 'distance' | 'urgency')
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                        >
                          <option value="recent">Fecha de carga</option>
                          <option value="distance">Distancia</option>
                          <option value="urgency">Urgencia</option>
                        </select>
                      </label>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Mostrando {filteredNearbyRequests.length} de {nearbyRequests.length} solicitudes
                    </p>
                  </div>
                  {nearbyRequestsWarning && <p className="mt-2 text-xs font-semibold text-amber-700">{nearbyRequestsWarning}</p>}
                  {nearbyRequestsError && <p className="mt-2 text-xs font-semibold text-rose-600">{nearbyRequestsError}</p>}

                  <div className="mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:order-1">
                      <div className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                        <p>Solicitudes visibles: {filteredNearbyRequests.length}</p>
                        <p className="mt-1 text-slate-500">Selecciona una solicitud para centrar el mapa.</p>
                      </div>
                      <div className="mt-3 max-h-[360px] space-y-2 overflow-auto pr-1">
                        {filteredNearbyRequests.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                            No hay solicitudes para mostrar con estos filtros.
                          </div>
                        )}
                        {filteredNearbyRequests.map((request) => {
                          const selectedRequestId = dashboardSelectedMapPoint?.kind === 'request'
                            ? dashboardSelectedMapPoint.id.replace('request:', '')
                            : '';
                          const isSelected = selectedRequestId === request.id;
                          const offerDraft = getRequestOfferDraft(request);
                          const isOfferEditorOpen = offerEditorRequestId === request.id;
                          const isSubmittingOffer = submittingOfferRequestId === request.id;
                          const offerStatus = String(request.my_quote_status || 'pending').toLowerCase();
                          const offerStatusLabel = requestQuoteStatusLabel(offerStatus);
                          const offerStatusBadgeClass = requestQuoteStatusClass(offerStatus);
                          const offerSuccess = offerSuccessByRequestId[request.id] || '';
                          const offerError = offerErrorByRequestId[request.id] || '';
                          const hasOfferValues =
                            request.my_price_ars !== null &&
                            request.my_price_ars !== undefined &&
                            request.my_eta_hours !== null &&
                            request.my_eta_hours !== undefined;
                          return (
                            <div
                              key={request.id}
                              className={`w-full rounded-xl border px-3 py-2 transition ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDashboardMapFilter('requests');
                                  setDashboardMapSelectedId(`request:${request.id}`);
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="truncate text-sm font-semibold">{request.title}</p>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      isSelected ? 'bg-white/20 text-white' : urgencyBadgeClass(request.urgency)
                                    }`}
                                  >
                                    {request.urgency}
                                  </span>
                                </div>
                                <p className={`mt-1 text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                  {request.category} · {request.city || 'Sin ciudad'}
                                </p>
                                <p className={`mt-1 text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                  {request.address || 'Sin direccion'}
                                </p>
                                <div className={`mt-2 flex flex-wrap gap-2 text-[11px] font-semibold ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                                  <span>Distancia: {request.distance_km.toFixed(1)} km</span>
                                  <span>Fecha: {new Date(request.created_at).toLocaleDateString('es-AR')}</span>
                                  <span>Estado: {String(request.status || '').toUpperCase()}</span>
                                </div>
                              </button>

                              <div className={`mt-2 rounded-xl border px-2.5 py-2 ${isSelected ? 'border-white/20 bg-black/10' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${offerStatusBadgeClass}`}>
                                      {offerStatusLabel}
                                    </span>
                                    {hasOfferValues && (
                                      <span className={`text-[11px] font-semibold ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                                        Tu oferta: {formatCurrency(Number(request.my_price_ars || 0))} · ETA {Math.round(Number(request.my_eta_hours || 0))} h
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRequestOfferEditor(request)}
                                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                      isSelected
                                        ? 'border-white/30 text-white hover:border-white/50'
                                        : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                                    }`}
                                  >
                                    {isOfferEditorOpen ? 'Cancelar' : offerStatus === 'pending' ? 'Ofertar' : 'Editar oferta'}
                                  </button>
                                </div>

                                {request.my_quote_updated_at && hasOfferValues && (
                                  <p className={`mt-1 text-[11px] ${isSelected ? 'text-white/75' : 'text-slate-500'}`}>
                                    Ultima oferta: {new Date(request.my_quote_updated_at).toLocaleString('es-AR')}
                                  </p>
                                )}
                                {offerSuccess && <p className="mt-1 text-[11px] font-semibold text-emerald-600">{offerSuccess}</p>}
                                {offerError && <p className="mt-1 text-[11px] font-semibold text-rose-600">{offerError}</p>}

                                {isOfferEditorOpen && (
                                  <>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                      <label className={`text-[11px] font-semibold ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                                        Precio ARS
                                        <input
                                          value={offerDraft.priceArs}
                                          onChange={(event) =>
                                            handleRequestOfferDraftChange(request, 'priceArs', event.target.value)
                                          }
                                          inputMode="decimal"
                                          placeholder="Ej: 85000"
                                          className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${
                                            isSelected
                                              ? 'border-white/30 bg-black/20 text-white placeholder:text-white/50 focus:border-white/60'
                                              : 'border-slate-200 bg-white text-slate-700 focus:border-slate-400'
                                          }`}
                                        />
                                      </label>
                                      <label className={`text-[11px] font-semibold ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>
                                        ETA (horas)
                                        <input
                                          value={offerDraft.etaHours}
                                          onChange={(event) =>
                                            handleRequestOfferDraftChange(request, 'etaHours', event.target.value)
                                          }
                                          inputMode="numeric"
                                          placeholder="Ej: 24"
                                          className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${
                                            isSelected
                                              ? 'border-white/30 bg-black/20 text-white placeholder:text-white/50 focus:border-white/60'
                                              : 'border-slate-200 bg-white text-slate-700 focus:border-slate-400'
                                          }`}
                                        />
                                      </label>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSubmitRequestOffer(request)}
                                        disabled={isSubmittingOffer}
                                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                          isSelected
                                            ? 'bg-white text-slate-900 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
                                        }`}
                                      >
                                        {isSubmittingOffer ? 'Enviando...' : 'Enviar oferta'}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 lg:order-2">
                      {dashboardMapView.url ? (
                        dashboardMapView.mode === 'all' ? (
                          <img
                            src={dashboardMapView.url}
                            alt="Mapa operativo UrbanFix con todos los puntos visibles"
                            className="h-[360px] w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <iframe
                            title="Mapa operativo UrbanFix"
                            src={dashboardMapView.url}
                            className="h-[360px] w-full border-0"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-slate-500">
                          No hay puntos geolocalizados todavia. Carga ubicaciones en tus trabajos o actualiza solicitudes.
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs">
                        <span className="font-semibold text-slate-700">
                          {dashboardSelectedMapPoint
                            ? `${dashboardSelectedMapPoint.kind === 'request' ? 'Solicitud' : 'Trabajo'} seleccionado: ${dashboardSelectedMapPoint.title}`
                            : dashboardMapPoints.length > 0
                              ? 'Vista general: todos los puntos visibles'
                              : 'Centro de mapa basado en tu zona'}
                        </span>
                        {dashboardMapCenterPoint && (
                          <a
                            href={buildOsmLink(
                              dashboardMapCenterPoint.lat,
                              dashboardMapCenterPoint.lon,
                              dashboardSelectedMapPoint ? 16 : 12
                            )}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-900"
                          >
                            {dashboardSelectedMapPoint ? 'Abrir en mapa' : 'Abrir zona en mapa'}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="rounded-xl bg-white px-3 py-2 text-[11px] text-slate-600">
                      <p>Puntos visibles en mapa: {dashboardMapPoints.length}</p>
                      {(jobsWithoutCoordinatesCount > 0 || requestsWithoutCoordinatesCount > 0) && (
                        <p className="mt-1 text-amber-700">
                          Sin coordenadas: trabajos {jobsWithoutCoordinatesCount} | solicitudes {requestsWithoutCoordinatesCount}
                        </p>
                      )}
                      <div className="mt-2">
                        {dashboardSelectedMapPoint ? (
                          <button
                            type="button"
                            onClick={() => setDashboardMapSelectedId('')}
                            className="rounded-full border border-slate-300 px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Ver todos en mapa
                          </button>
                        ) : (
                          <p className="text-[10px] font-semibold text-emerald-700">Modo actual: vista general</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {navItems
                    .filter((item) => item.key !== 'lobby')
                    .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveTab(item.key)}
                        className="rounded-3xl border border-slate-200 bg-white px-4 py-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.hint}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'nuevo' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Job config</p>
                    <h2 className="text-xl font-semibold text-slate-900">Nuevo presupuesto</h2>
                    <p className="text-sm text-slate-500">Completa los datos para crear un presupuesto nuevo.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('presupuestos')}
                      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Volver
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cliente</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Nombre del cliente</label>
                      <input
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        placeholder="Nombre y apellido"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Direccion del trabajo</label>
                      <input
                        value={clientAddress}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setClientAddress(nextValue);
                          if (geoSelected && nextValue !== geoSelected.display_name) {
                            setGeoSelected(null);
                          }
                          if (geoResults.length) setGeoResults([]);
                          if (geoError) setGeoError('');
                        }}
                        placeholder="Direccion completa"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGeocodeSearch}
                          disabled={geoLoading}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100/60 disabled:text-slate-400"
                        >
                          {geoLoading ? 'Buscando...' : 'Buscar en mapa'}
                        </button>
                        {geoSelected && (
                          <span className="text-[11px] font-semibold text-emerald-600">Ubicacion seleccionada</span>
                        )}
                      </div>
                      {geoError && <p className="mt-2 text-xs text-rose-500">{geoError}</p>}
                      {geoResults.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {geoResults.map((result) => (
                            <button
                              key={`${result.lat}-${result.lon}`}
                              type="button"
                              onClick={() => handleSelectGeo(result)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                            >
                              {result.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                      {geoSelected && geoMapUrl && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <iframe
                            title="Mapa de ubicacion"
                            src={geoMapUrl}
                            className="h-64 w-full border-0"
                            loading="lazy"
                          />
                          <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
                            <span>Vista previa de la ubicacion</span>
                            <a
                              href={buildOsmLink(geoSelected.lat, geoSelected.lon)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-slate-700 transition hover:text-slate-900"
                            >
                              Abrir mapa
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Items</p>
                          <p className="text-xs text-slate-500">Detalle de materiales y mano de obra.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                          + Agregar item
                        </button>
                      </div>
                      {items.length === 0 && (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500">
                          Agrega el primer item para armar el presupuesto.
                        </div>
                      )}
                      <div className="mt-4 space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[2fr_0.7fr_0.9fr_1fr_auto]"
                          >
                            <input
                              value={item.description}
                              onChange={(event) => handleItemUpdate(item.id, { description: event.target.value })}
                              placeholder="Descripcion"
                              list={item.type === 'labor' ? 'labor-master-items' : undefined}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                            />
                            <input
                              type="number"
                              min={0}
                              step="1"
                              value={item.quantity}
                              onFocus={(event) => event.currentTarget.select()}
                              onClick={(event) => event.currentTarget.select()}
                              onChange={(event) =>
                                handleItemUpdate(item.id, { quantity: Math.max(0, toNumber(event.target.value)) })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                            />
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unitPrice}
                              onFocus={(event) => event.currentTarget.select()}
                              onClick={(event) => event.currentTarget.select()}
                              onChange={(event) =>
                                handleItemUpdate(item.id, { unitPrice: Math.max(0, toNumber(event.target.value)) })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-400"
                            />
                            <select
                              value={item.type}
                              onChange={(event) =>
                                handleItemUpdate(item.id, { type: event.target.value as 'labor' | 'material' })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-slate-400"
                            >
                              <option value="labor">Mano de obra</option>
                              <option value="material">Material</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                        <datalist id="labor-master-items">
                          {laborMasterItems.map((laborItem) => (
                            <option key={laborItem.id} value={laborItem.name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Resumen</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Mano de obra</span>
                          <span className="font-semibold text-slate-900">
                            ${laborSubtotal.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Materiales</span>
                          <span className="font-semibold text-slate-900">
                            ${materialSubtotal.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Descuento ({discountPercent.toFixed(0)}%)</span>
                          <span className="font-semibold text-slate-900">
                            -${discountAmount.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>IVA 21%</span>
                          <span className="font-semibold text-slate-900">${taxAmount.toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between text-lg font-semibold text-slate-900">
                          <span>Total</span>
                          <span>${total.toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Ajustes</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Descuento (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={discount}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          setDiscount(Math.min(100, Math.max(0, toNumber(event.target.value))))
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={applyTax}
                          onChange={(event) => setApplyTax(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                        Aplicar IVA 21%
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Acciones</p>
                      <div className="mt-3 grid gap-2">
                        <button
                          type="button"
                          onClick={() => handleSave('draft')}
                          disabled={isSaving}
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          Guardar borrador
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave('sent')}
                          disabled={isSaving}
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          Enviar al cliente
                        </button>
                      </div>
                      {formError && <p className="mt-3 text-xs text-rose-500">{formError}</p>}
                      {infoMessage && <p className="mt-3 text-xs text-emerald-600">{infoMessage}</p>}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Adjuntos</p>
                      {!activeQuoteId && (
                        <p className="mt-2 text-xs text-slate-500">
                          Guarda el presupuesto para adjuntar fotos o documentos.
                        </p>
                      )}
                      {activeQuoteId && (
                        <div className="mt-3 space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAttachmentUpload}
                            disabled={uploadingAttachments}
                            className="w-full text-xs text-slate-500"
                          />
                          {attachments.length === 0 && (
                            <p className="text-xs text-slate-500">Aun no hay fotos adjuntas.</p>
                          )}
                          {attachments.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {attachments.map((file) => {
                                const isImage = isImageAttachment(file);
                                return (
                                  <div
                                    key={file.id}
                                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                  >
                                    <a href={file.file_url} target="_blank" rel="noreferrer">
                                      {isImage ? (
                                        <img
                                          src={file.file_url}
                                          alt={file.file_name || 'Adjunto'}
                                          className="h-28 w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-28 items-center justify-center bg-slate-50 text-xs text-slate-500">
                                          Ver archivo
                                        </div>
                                      )}
                                    </a>
                                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                                      <span className="truncate text-[11px] text-slate-600">
                                        {file.file_name || 'Adjunto'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAttachmentRemove(file)}
                                        disabled={deletingAttachmentId === file.id}
                                        className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {deletingAttachmentId === file.id ? 'Eliminando' : 'Eliminar'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'presupuestos' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Presupuestos</h2>
                    <p className="text-xs text-slate-500">Listado y estado actual de tus presupuestos.</p>
                  </div>
                <div className="flex items-center gap-2">
                  {quoteFilter !== 'all' && (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                      {quoteFilter === 'pending'
                        ? 'Pendientes'
                        : quoteFilter === 'approved'
                          ? 'Aprobados'
                          : quoteFilter === 'draft'
                              ? 'Computo'
                              : quoteFilter === 'completed'
                                ? 'Finalizados'
                                : 'Cobrados'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={startNewQuote}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    title="Nuevo presupuesto"
                  >
                    +
                  </button>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
                    {filteredQuotes.length} activos
                  </span>
                </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'draft', label: 'Computo' },
                    { key: 'pending', label: 'Pendientes' },
                    { key: 'approved', label: 'Aprobados' },
                    { key: 'completed', label: 'Finalizados' },
                    { key: 'paid', label: 'Cobrados' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() =>
                        setQuoteFilter(
                          filter.key as 'all' | 'draft' | 'pending' | 'approved' | 'completed' | 'paid'
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                        quoteFilter === filter.key
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5 space-y-3">
                  {filteredQuotes.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Aun no tienes presupuestos. Crea el primero desde el panel.
                    </div>
                  )}
                  {filteredQuotes.map((quote) => {
                    const info = statusMap[quote.status || ''] || {
                      label: (quote.status || 'N/A').toUpperCase(),
                      className: 'bg-slate-100 text-slate-600',
                    };
                      return (
                        <button
                          key={quote.id}
                          type="button"
                          onClick={() => handleViewQuote(quote)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            activeQuoteId === quote.id
                              ? 'border-slate-300 bg-slate-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {quote.client_name || 'Presupuesto'}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${info.className}`}>
                                {info.label}
                              </span>
                              <select
                                value={normalizeStatusValue(quote.status)}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => handleStatusChange(quote.id, event.target.value)}
                                className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 outline-none hover:bg-slate-200"
                              >
                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startEditQuote(quote);
                                }}
                                className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteQuote(quote);
                                }}
                                disabled={deletingQuoteId === quote.id}
                                className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                                  deletingQuoteId === quote.id
                                    ? 'bg-rose-50 text-rose-300 cursor-not-allowed'
                                    : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                }`}
                              >
                                {deletingQuoteId === quote.id ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </div>
                          </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {getQuoteAddress(quote) || 'Sin direccion'} Â·{' '}
                          {new Date(quote.created_at).toLocaleDateString('es-AR')}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          ${(quote.total_amount || 0).toLocaleString('es-AR')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === 'visualizador' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Visualizador</p>
                    <h2 className="text-xl font-semibold text-slate-900">Presupuesto publico</h2>
                    <p className="text-sm text-slate-500">
                      Pega el link o el ID para ver el presupuesto tal como lo ve el cliente.
                    </p>
                  </div>
                  {activeQuoteId && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextUrl = buildQuoteLink(activeQuoteId);
                        setViewerInput(nextUrl);
                        setViewerUrl(nextUrl);
                        setViewerError('');
                      }}
                      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Usar presupuesto activo
                    </button>
                  )}
                  {activeQuote && (
                    <button
                      type="button"
                      onClick={() => startEditQuote(activeQuote)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Editar presupuesto
                    </button>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    value={viewerInput}
                    onChange={(event) => {
                      setViewerInput(event.target.value);
                      if (viewerError) setViewerError('');
                    }}
                    placeholder="Pega el link o ID del presupuesto"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleOpenViewer}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Visualizar
                  </button>
                  {viewerUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(viewerUrl, '_blank', 'noopener,noreferrer')}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Abrir en pestaÃ±a
                    </button>
                  )}
                </div>
                {viewerError && <p className="mt-3 text-xs text-amber-600">{viewerError}</p>}
                {viewerUrl && (
                  <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    <iframe title="Visualizador de presupuesto" src={viewerUrl} className="h-[720px] w-full" />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Agenda</p>
                <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Trabajos aprobados</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      En esta vista ves todos los trabajos aprobados. Solo elegi una fecha y se guarda automaticamente.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Tip: si el trabajo ya tenia duracion (varios dias), la mantenemos al mover la fecha.
                    </p>
                  </div>

                  <div className="w-full lg:w-[360px]">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={agendaSearch}
                        onChange={(event) => setAgendaSearch(event.target.value)}
                        placeholder="Buscar por cliente o direccion..."
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAgendaFilter('all')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      agendaFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({agendaCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaFilter('pending')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      agendaFilter === 'pending'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Pendientes ({agendaCounts.pending})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgendaFilter('scheduled')}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      agendaFilter === 'scheduled'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Programados ({agendaCounts.scheduled})
                  </button>
                </div>

                {scheduleMessage && <p className="mt-3 text-xs text-slate-600">{scheduleMessage}</p>}

                <div className="mt-6 space-y-3">
                  {approvedJobs.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      No hay trabajos aprobados para coordinar.
                    </div>
                  )}

                  {approvedJobs.length > 0 && agendaJobs.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      No encontramos trabajos con esos filtros.
                    </div>
                  )}

                  {agendaJobs.map((quote) => {
                    const startValue = quote.start_date ? quote.start_date.slice(0, 10) : '';
                    const endValue = quote.end_date ? quote.end_date.slice(0, 10) : '';
                    const start = parseDateLocal(startValue);
                    const end = parseDateLocal(endValue);
                    const durationDays =
                      start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000)) : 0;
                    const isSaving = scheduleSavingId === quote.id;

                    return (
                      <div
                        key={quote.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {quote.client_name || 'Presupuesto'}
                            </p>
                            {startValue ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                                Programado
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">
                                Sin fecha
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {getQuoteAddress(quote) || 'Sin direccion'} Â·{' '}
                            {new Date(quote.created_at).toLocaleDateString('es-AR')}
                          </p>
                          {durationDays > 0 && (
                            <p className="mt-1 text-[11px] text-slate-400">
                              Duracion actual: {durationDays + 1} dias
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Fecha
                            </label>
                            <input
                              type="date"
                              value={startValue}
                              disabled={isSaving}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (!value) {
                                  setQuotes((prev) =>
                                    prev.map((item) =>
                                      item.id === quote.id
                                        ? { ...item, start_date: null, end_date: null }
                                        : item
                                    )
                                  );
                                  handleScheduleUpdate(quote.id, '', '');
                                  return;
                                }

                                const prevStart = quote.start_date ? quote.start_date.slice(0, 10) : '';
                                const prevEnd = quote.end_date ? quote.end_date.slice(0, 10) : '';
                                const prevStartDate = parseDateLocal(prevStart);
                                const prevEndDate = parseDateLocal(prevEnd);
                                const nextStartDate = parseDateLocal(value);
                                if (!nextStartDate) return;

                                const diffDays =
                                  prevStartDate && prevEndDate
                                    ? Math.max(
                                        0,
                                        Math.round(
                                          (prevEndDate.getTime() - prevStartDate.getTime()) / 86400000
                                        )
                                      )
                                    : 0;
                                const nextEndDate = addDays(nextStartDate, diffDays);
                                const nextStart = formatDateLocal(nextStartDate);
                                const nextEnd = formatDateLocal(nextEndDate);

                                setQuotes((prev) =>
                                  prev.map((item) =>
                                    item.id === quote.id
                                      ? { ...item, start_date: nextStart, end_date: nextEnd }
                                      : item
                                  )
                                );
                                handleScheduleUpdate(quote.id, nextStart, nextEnd);
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setQuotes((prev) =>
                                prev.map((item) =>
                                  item.id === quote.id ? { ...item, start_date: null, end_date: null } : item
                                )
                              );
                              handleScheduleUpdate(quote.id, '', '');
                            }}
                            disabled={isSaving || (!quote.start_date && !quote.end_date)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Limpiar
                          </button>

                          {isSaving && <span className="text-xs font-semibold text-slate-400">Guardando...</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === 'historial' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Historial</p>
                <h2 className="text-xl font-semibold text-slate-900">Historico de facturacion</h2>
                <p className="text-sm text-slate-500">
                  Resumen anual y mensual de los presupuestos cobrados o aprobados.
                </p>

                <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Facturacion mensual</p>
                        <p className="text-xs text-slate-500">Ultimos 12 meses</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total 12 meses</p>
                        <p className="text-lg font-semibold text-slate-900">
                          ${billingTotals.total.toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-2">
                      {billingMonthlySeries.map((item) => {
                        const height = Math.min(
                          100,
                          Math.max(8, Math.round((item.total / maxMonthlyBilling) * 100))
                        );
                        return (
                          <div key={item.key} className="flex min-w-[48px] flex-col items-center gap-2">
                            <div className="flex h-32 w-4 items-end rounded-full bg-white shadow-sm">
                              <div
                                className="w-full rounded-full bg-emerald-500"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-white px-3 py-1">
                        Promedio mensual: ${billingTotals.average.toLocaleString('es-AR')}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        Ultimo mes: $
                        {(billingMonthlySeries[billingMonthlySeries.length - 1]?.total || 0).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Resumen anual</p>
                    <p className="mt-2 text-xs text-slate-500">Total facturado por ano.</p>
                    <div className="mt-4 space-y-3">
                      {billingYearSeries.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                          Aun no hay facturacion registrada.
                        </div>
                      )}
                      {billingYearSeries.map((item) => (
                        <div
                          key={item.year}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <span className="text-sm font-semibold text-slate-800">{item.year}</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ${item.total.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Detalle mensual</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {billingMonthlySeries.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          ${item.total.toLocaleString('es-AR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notificaciones' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Notificaciones</p>
                    <h2 className="text-xl font-semibold text-slate-900">Alertas y movimientos</h2>
                    <p className="text-sm text-slate-500">Actualizaciones de presupuestos, agenda y revisiones.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Marcar todo como leido
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {loadingNotifications && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Cargando notificaciones...
                    </div>
                  )}
                  {!loadingNotifications && notificationsError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      {notificationsError}
                    </div>
                  )}
                  {!loadingNotifications && !notificationsError && notifications.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No hay notificaciones por ahora.
                    </div>
                  )}
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleOpenNotification(notif)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        notif.read_at
                          ? 'border-slate-200 bg-white hover:border-slate-300'
                          : 'border-amber-200 bg-amber-50 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{notif.body}</p>
                        </div>
                        <div className="text-xs text-slate-400">
                          {notif.created_at ? new Date(notif.created_at).toLocaleDateString('es-AR') : ''}
                        </div>
                      </div>
                      {!notif.read_at && (
                        <span className="mt-3 inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700">
                          Nueva
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'soporte' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Soporte beta</p>
                    <h2 className="text-xl font-semibold text-slate-900">Chat interno</h2>
                    <p className="text-sm text-slate-500">
                      Usa este canal para reportar problemas o pedir ayuda durante la beta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isBetaAdmin) fetchSupportUsers();
                      fetchSupportMessages();
                    }}
                    className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Actualizar
                  </button>
                </div>

                <div
                  className={`mt-6 grid gap-6 ${
                    isBetaAdmin ? 'lg:grid-cols-[280px,1fr]' : 'grid-cols-1'
                  }`}
                >
                  {isBetaAdmin && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Conversaciones</p>
                      {supportUsers.length === 0 && (
                        <p className="mt-3 text-sm text-slate-500">Aun no hay mensajes.</p>
                      )}
                      <div className="mt-3 space-y-2">
                        {supportUsers.map((user) => (
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
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    {isBetaAdmin && (
                      <p className="text-xs text-slate-500">
                        Conversacion con:{' '}
                        <span className="font-semibold text-slate-700">
                          {supportUsers.find((user) => user.userId === activeSupportUserId)?.label ||
                            'Selecciona un usuario'}
                        </span>
                      </p>
                    )}
                    <div className="mt-4 min-h-[320px] max-h-[60vh] space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      {supportLoading && <p className="text-sm text-slate-500">Cargando mensajes...</p>}
                      {!supportLoading && supportMessages.length === 0 && (
                        <p className="text-sm text-slate-500">Todavia no hay mensajes en este chat.</p>
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
                                {Array.isArray(msg.image_urls) && msg.image_urls.length > 0 && (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {msg.image_urls.map((url: string, index: number) => (
                                      <a
                                        key={`${msg.id}-img-${index}`}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-xl border border-white/20 bg-white/5"
                                      >
                                        <img
                                          src={url}
                                          alt="Adjunto"
                                          className="h-28 w-full object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <p className={`mt-1 text-[10px] ${isOwn ? 'text-slate-300' : 'text-slate-400'}`}>
                                  {msg.created_at ? new Date(msg.created_at).toLocaleString('es-AR') : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                      <div className="flex-1 space-y-3">
                        <textarea
                          value={supportDraft}
                          onChange={(event) => setSupportDraft(event.target.value)}
                          placeholder="Escribe tu mensaje..."
                          className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                        {supportAttachments.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {supportAttachments.map((item, index) => (
                              <div
                                key={`${item.previewUrl}-${index}`}
                                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                              >
                                <img src={item.previewUrl} alt="Adjunto" className="h-28 w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSupportImage(index)}
                                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm transition hover:bg-white"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Puedes adjuntar hasta {SUPPORT_MAX_IMAGES} imagenes (max 5 MB c/u).
                        </p>
                      </div>
                      <div className="flex flex-row gap-2 lg:flex-col">
                        <button
                          type="button"
                          onClick={() => supportFileInputRef.current?.click()}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        >
                          <ImagePlus className="h-4 w-4" />
                          Adjuntar
                        </button>
                        <button
                          type="button"
                          onClick={handleSendSupportMessage}
                          disabled={supportLoading}
                          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                    <input
                      ref={supportFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSupportImageSelect}
                      className="hidden"
                    />
                    {supportError && <p className="mt-3 text-xs text-rose-500">{supportError}</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'perfil' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Perfil</p>
                <h2 className="text-xl font-semibold text-slate-900">Perfil del tecnico</h2>
                <p className="text-sm text-slate-500">Completa la informacion para que tus presupuestos sean mas claros.</p>
                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setProfilePanelTab('editor')}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      profilePanelTab === 'editor' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Editor de perfil
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfilePanelTab('preview')}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      profilePanelTab === 'preview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Vista publica
                  </button>
                </div>

                {profilePanelTab === 'preview' ? (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Preview</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">Asi veran tu perfil los clientes</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Esta vista replica la informacion publica de tu perfil. Puedes volver al editor para ajustar datos.
                      </p>

                      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-start gap-4">
                          <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            {profileForm.avatarUrl ? (
                              <img src={profileForm.avatarUrl} alt="Foto tecnico" className="h-full w-full object-cover" />
                            ) : profileForm.companyLogoUrl ? (
                              <img src={profileForm.companyLogoUrl} alt="Logo tecnico" className="h-full w-full object-contain p-2" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-500">
                                {(profileForm.businessName || profileForm.fullName || 'U').slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-semibold text-slate-900">
                              {profileForm.businessName || profileForm.fullName || 'Tecnico UrbanFix'}
                            </p>
                            <p className="truncate text-sm text-slate-600">{profileForm.fullName || 'Profesional'}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {profileForm.city && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                  {profileForm.city}
                                </span>
                              )}
                              <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">
                                Likes: {Math.max(0, Number(profile?.public_likes_count || 0))}
                              </span>
                              {profileForm.profilePublished && (
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                  Publicado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            {coverageAreaLabel || 'Sin zona de cobertura definida'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedSpecialties.length > 0 ? (
                              selectedSpecialties.map((specialty) => (
                                <span
                                  key={`preview-specialty-${specialty}`}
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700"
                                >
                                  {specialty}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
                                Sin rubros cargados
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {publicProfileUrl && profileForm.profilePublished && (
                            <a
                              href={publicProfileUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              Ver perfil publico real
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={handleCopyPublicProfileLink}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Copiar link
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfilePanelTab('editor')}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Volver a editar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Marca</p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">Tu identidad profesional</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Tu logo y tu foto aparecen en el link publico del presupuesto y en el PDF.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            Basico: {Math.max(0, 4 - formRequiredMissing.length)}/4
                          </span>
                          {formRequiredMissing.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                              Falta: {formRequiredMissing.length}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                            {profileForm.companyLogoUrl ? (
                              <img
                                src={profileForm.companyLogoUrl}
                                alt="Logo"
                                onLoad={handleLogoLoaded}
                                className="h-full w-full object-contain p-8"
                              />
                            ) : (
                              <div className="text-center">
                                <p className="text-sm font-semibold text-white">Logo / banner de tu empresa</p>
                                <p className="mt-1 text-xs text-white/70">Recomendado: horizontal, alto contraste</p>
                              </div>
                            )}
                            <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-white">
                              <ImagePlus className="h-4 w-4" />
                              {uploadingCompanyLogo ? 'Subiendo...' : 'Subir logo'}
                              <input type="file" accept="image/*" onChange={handleCompanyLogoUpload} className="hidden" />
                            </label>
                          </div>

                          <div className="relative -mt-10 flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
                            <div className="flex items-end gap-4">
                              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">
                                {profileForm.avatarUrl ? (
                                  <img src={profileForm.avatarUrl} alt="Foto" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                                    {(profileForm.fullName || profileForm.businessName || 'U')[0]?.toUpperCase()}
                                  </div>
                                )}
                                <label className="absolute bottom-1 right-1 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 p-2 text-white shadow-sm transition hover:bg-slate-800">
                                  <ImagePlus className="h-3.5 w-3.5" />
                                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                                </label>
                              </div>

                              <div className="pb-1">
                                <p className="text-base font-semibold text-slate-900">
                                  {profileForm.businessName || 'Tu negocio'}
                                </p>
                                <p className="text-sm text-slate-500">{profileForm.fullName || 'Tu nombre'}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                                    <FileText className="h-3.5 w-3.5" />
                                    Se ve en PDF
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
                                    Link publico
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={profileForm.logoShape}
                                onChange={(event) =>
                                  setProfileForm((prev) => ({ ...prev, logoShape: event.target.value }))
                                }
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                              >
                                <option value="auto">Auto</option>
                                <option value="round">Redondo</option>
                                <option value="square">Cuadrado</option>
                                <option value="rect">Rectangular</option>
                              </select>
                              <span className="text-[11px] font-semibold text-slate-400">Forma del logo</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Consejos de imagen</p>
                            <ul className="mt-3 space-y-2 text-xs text-slate-600">
                              <li className="flex gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-900" />
                                Usa un logo simple y legible (ideal: fondo transparente o claro).
                              </li>
                              <li className="flex gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-900" />
                                Foto: rostro visible, buena luz, fondo limpio (genera confianza).
                              </li>
                              <li className="flex gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-900" />
                                Mantene el mismo nombre y logo en todos tus canales.
                              </li>
                            </ul>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Por que completar</p>
                            <ul className="mt-3 space-y-2 text-xs text-slate-600">
                              <li className="flex gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-900" />
                                Aumenta la tasa de aprobacion: tu presupuesto se ve profesional.
                              </li>
                              <li className="flex gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-900" />
                                Reduce idas y vueltas: el cliente tiene tus datos a mano.
                              </li>
                              <li className="flex gap-2">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-slate-900" />
                                Mejora recordacion: el cliente vuelve a contactarte mas facil.
                              </li>
                            </ul>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">URLs (opcional)</p>
                            <label className="mt-3 block text-xs font-semibold text-slate-600">URL logo/banner</label>
                            <input
                              value={profileForm.companyLogoUrl}
                              onChange={(event) =>
                                setProfileForm((prev) => ({ ...prev, companyLogoUrl: event.target.value }))
                              }
                              placeholder="https://..."
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                            <label className="mt-4 block text-xs font-semibold text-slate-600">URL foto</label>
                            <input
                              value={profileForm.avatarUrl}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                              placeholder="https://..."
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Informacion del perfil</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">ID de usuario</p>
                          <p className="mt-2 text-xs font-semibold text-slate-700 break-all">
                            {session?.user?.id || 'No disponible'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Email autenticado</p>
                          <p className="mt-2 text-xs font-semibold text-slate-700 break-all">
                            {session?.user?.email || 'No disponible'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Datos basicos</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Nombre y apellido</label>
                      <input
                        value={profileForm.fullName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Nombre del negocio</label>
                      <input
                        value={profileForm.businessName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, businessName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Email</label>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Telefono</label>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <p className="mt-4 text-xs text-slate-500">
                        Tu logo y tu foto se gestionan en la seccion &quot;Marca&quot; de arriba.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Cobertura y horarios</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Direccion base</label>
                      <input
                        value={profileForm.address}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Ciudad</label>
                      <input
                        value={profileForm.city}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Zona de cobertura</label>
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Solicitudes en radio de {COVERAGE_RADIUS_KM} km</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Mostramos trabajos cercanos a tu ubicacion base sin exponer tu direccion exacta.
                        </p>
                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          {coverageAreaLabel}
                        </p>
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Horarios de atencion</label>
                      <div className="mt-2 space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Lunes a viernes</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <input
                              type="time"
                              value={profileForm.weekdayFrom}
                              onChange={(event) =>
                                setProfileForm((prev) => ({ ...prev, weekdayFrom: event.target.value }))
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                            <input
                              type="time"
                              value={profileForm.weekdayTo}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, weekdayTo: event.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={profileForm.saturdayEnabled}
                              onChange={(event) =>
                                setProfileForm((prev) => ({ ...prev, saturdayEnabled: event.target.checked }))
                              }
                            />
                            Sabado (opcional)
                          </label>
                          {profileForm.saturdayEnabled && (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <input
                                type="time"
                                value={profileForm.saturdayFrom}
                                onChange={(event) =>
                                  setProfileForm((prev) => ({ ...prev, saturdayFrom: event.target.value }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                              />
                              <input
                                type="time"
                                value={profileForm.saturdayTo}
                                onChange={(event) =>
                                  setProfileForm((prev) => ({ ...prev, saturdayTo: event.target.value }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={profileForm.sundayEnabled}
                              onChange={(event) =>
                                setProfileForm((prev) => ({ ...prev, sundayEnabled: event.target.checked }))
                              }
                            />
                            Domingo (opcional)
                          </label>
                          {profileForm.sundayEnabled && (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <input
                                type="time"
                                value={profileForm.sundayFrom}
                                onChange={(event) =>
                                  setProfileForm((prev) => ({ ...prev, sundayFrom: event.target.value }))
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                              />
                              <input
                                type="time"
                                value={profileForm.sundayTo}
                                onChange={(event) => setProfileForm((prev) => ({ ...prev, sundayTo: event.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                              />
                            </div>
                          )}
                        </div>

                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          Resumen: {workingHoursLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Especialidades</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Rubros</label>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Selecciona uno o mas rubros para mostrarte mejor frente a clientes.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {TECH_SPECIALTY_OPTIONS.map((specialty) => {
                          const isSelected = selectedSpecialtiesSet.has(normalizeTextForParsing(specialty));
                          return (
                            <button
                              key={specialty}
                              type="button"
                              onClick={() => handleSpecialtyToggle(specialty)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                              }`}
                            >
                              {specialty}
                            </button>
                          );
                        })}
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Agregar rubro personalizado</label>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={customSpecialtyDraft}
                          onChange={(event) => setCustomSpecialtyDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            handleAddCustomSpecialty();
                          }}
                          placeholder="Ej: Durlock"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomSpecialty}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Agregar
                        </button>
                      </div>
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[11px] font-semibold text-slate-600">
                          Rubros seleccionados ({selectedSpecialties.length})
                        </p>
                        {selectedSpecialties.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">Aun no seleccionaste rubros.</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedSpecialties.map((specialty) => (
                              <button
                                key={specialty}
                                type="button"
                                onClick={() => handleSpecialtyToggle(specialty)}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                              >
                                {specialty}
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Certificaciones</label>
                      <textarea
                        value={profileForm.certifications}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, certifications: event.target.value }))}
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => certificationFileInputRef.current?.click()}
                          disabled={uploadingCertificationFiles || certificationFiles.length >= CERT_MAX_FILES}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FileText className="h-4 w-4" />
                          {uploadingCertificationFiles ? 'Subiendo...' : 'Adjuntar certificados'}
                        </button>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          {certificationFiles.length}/{CERT_MAX_FILES}
                        </span>
                        <span className="text-[11px] text-slate-500">PDF, imagen, DOC o DOCX (max 10 MB)</span>
                        <input
                          ref={certificationFileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleCertificationFilesUpload}
                          className="hidden"
                        />
                      </div>

                      {certificationFilesError && (
                        <p className="mt-2 text-xs font-semibold text-rose-600">{certificationFilesError}</p>
                      )}

                      {certificationFiles.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-semibold text-slate-600">Archivos adjuntos</p>
                          {certificationFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                            >
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="truncate text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-900"
                                title={file.name}
                              >
                                {file.name}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveCertificationFile(file.id)}
                                className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Redes y visibilidad</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Facebook (pagina)</label>
                      <input
                        value={profileForm.facebookUrl}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, facebookUrl: event.target.value }))}
                        placeholder="https://www.facebook.com/tu.pagina"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Instagram (perfil o post)</label>
                      <input
                        value={profileForm.instagramUrl}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, instagramUrl: event.target.value }))}
                        placeholder="https://www.instagram.com/tuusuario o /p/..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePublishProfile}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          {profileForm.profilePublished ? 'Perfil publicado - copiar link' : 'PUBLICAR MI PERFIL'}
                        </button>
                        {profileForm.profilePublished && publicProfileUrl && (
                          <a
                            href={publicProfileUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Ver perfil publico
                          </a>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyPublicProfileLink}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                        >
                          Copiar link
                        </button>
                        <button
                          type="button"
                          onClick={handleSharePublicProfileWhatsApp}
                          className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800"
                        >
                          Compartir por WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={handleSharePublicProfileFacebook}
                          className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:border-blue-400 hover:text-blue-800"
                        >
                          Compartir en Facebook
                        </button>
                        {publicShowcaseUrl && (
                          <a
                            href={publicShowcaseUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Ver vidriera publica
                          </a>
                        )}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {profileForm.profilePublished
                          ? 'Tu perfil ya esta visible para clientes.'
                          : 'Publica tu perfil para que clientes puedan verlo por link.'}
                      </p>

                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-semibold text-slate-600">Feed Facebook</p>
                          {facebookPreviewEmbedUrl ? (
                            <iframe
                              title="Vista previa Facebook"
                              src={facebookPreviewEmbedUrl}
                              className="mt-2 h-64 w-full rounded-xl border-0"
                              loading="lazy"
                              allow="encrypted-media"
                            />
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">
                              Carga el link de tu pagina de Facebook para mostrar posteos.
                            </p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[11px] font-semibold text-slate-600">Post Instagram</p>
                          {instagramPreviewEmbedUrl ? (
                            <iframe
                              title="Vista previa Instagram"
                              src={instagramPreviewEmbedUrl}
                              className="mt-2 h-64 w-full rounded-xl border-0"
                              loading="lazy"
                              allow="encrypted-media"
                            />
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">
                              Pega un link de Instagram (idealmente un post o reel) para mostrarlo en tu perfil.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Datos comerciales</p>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">CUIT / CUIL</label>
                      <input
                        value={formatTaxId(profileForm.taxId)}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, taxId: normalizeTaxId(event.target.value) }))
                        }
                        placeholder="20-12345678-3"
                        inputMode="numeric"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <p
                        className={`mt-2 text-[11px] font-semibold ${
                          !normalizedTaxIdValue
                            ? 'text-slate-500'
                            : taxIdIsValid
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                        }`}
                      >
                        {taxIdHelper}
                      </p>

                      <label className="mt-4 block text-xs font-semibold text-slate-600">Condicion IVA</label>
                      <select
                        value={profileForm.taxStatus}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, taxStatus: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400"
                      >
                        <option value="">Seleccionar condicion</option>
                        {TAX_STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <label className="mt-4 block text-xs font-semibold text-slate-600">Metodo de pago</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PAYMENT_METHOD_OPTIONS.map((method) => {
                          const isSelected = selectedPaymentMethodsSet.has(normalizeTextForParsing(method));
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => handlePaymentMethodToggle(method)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                              }`}
                            >
                              {method}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={customPaymentMethodDraft}
                          onChange={(event) => setCustomPaymentMethodDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            handleAddCustomPaymentMethod();
                          }}
                          placeholder="Agregar metodo personalizado"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomPaymentMethod}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Agregar
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Seleccionados: {selectedPaymentMethods.length > 0 ? selectedPaymentMethods.join(', ') : 'ninguno'}
                      </p>

                      <label className="mt-4 block text-xs font-semibold text-slate-600">CBU / Alias</label>
                      <div className="mt-2 inline-flex rounded-full border border-slate-300 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (bankAccountType === 'alias') return;
                            setBankAccountType('alias');
                            setProfileForm((prev) => ({ ...prev, bankAlias: '' }));
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            bankAccountType === 'alias' ? 'bg-slate-900 text-white' : 'text-slate-600'
                          }`}
                        >
                          Alias
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (bankAccountType === 'cbu') return;
                            setBankAccountType('cbu');
                            setProfileForm((prev) => ({ ...prev, bankAlias: '' }));
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            bankAccountType === 'cbu' ? 'bg-slate-900 text-white' : 'text-slate-600'
                          }`}
                        >
                          CBU
                        </button>
                      </div>
                      <input
                        value={profileForm.bankAlias}
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            bankAlias: bankAccountType === 'cbu' ? normalizeCbu(event.target.value) : normalizeAlias(event.target.value),
                          }))
                        }
                        inputMode={bankAccountType === 'cbu' ? 'numeric' : 'text'}
                        placeholder={bankAccountType === 'cbu' ? '22 digitos de CBU' : 'alias.cuenta'}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                      />
                      <p
                        className={`mt-2 text-[11px] font-semibold ${
                          !normalizedBankValue
                            ? 'text-slate-500'
                            : bankValueIsValid
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                        }`}
                      >
                        {bankValueIsValid ? bankValueHelper : 'Dato bancario invalido.'}
                      </p>
                    </div>

                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePublishProfile}
                    className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    {profileForm.profilePublished ? 'Copiar link publico' : 'PUBLICAR MI PERFIL'}
                  </button>
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  {autoSaveBootstrapped && (
                    <span
                      className={`text-xs font-semibold ${
                        autoSaveState === 'error'
                          ? 'text-rose-600'
                          : autoSaveState === 'saving'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                      }`}
                    >
                      {autoSaveState === 'saving'
                        ? 'Autoguardando...'
                        : autoSaveMessage || 'Autoguardado activo'}
                    </span>
                  )}
                  {profileMessage && <span className="text-xs text-slate-600">{profileMessage}</span>}
                </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'precios' && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Precios</p>
                <h2 className="text-xl font-semibold text-slate-900">Mano de obra</h2>
                <p className="text-sm text-slate-500">
                  Valores de mano de obra cargados en tu base. Selecciona un item para usarlo en el presupuesto.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <input
                    value={masterSearch}
                    onChange={(event) => setMasterSearch(event.target.value)}
                    placeholder="Buscar item..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 sm:max-w-xs"
                  />
                  <select
                    value={masterCategory}
                    onChange={(event) => setMasterCategory(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                  >
                    <option value="all">Todos los rubros</option>
                    {masterCategories.map((category) => (
                      <option key={category} value={category}>
                        {formatRubroLabel(category)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setMasterSearch('');
                      setMasterCategory('all');
                    }}
                    className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    Limpiar filtros
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {loadingMasterItems && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Cargando valores...
                    </div>
                  )}
                  {!loadingMasterItems && filteredMasterItems.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No encontramos items con esos filtros.
                    </div>
                  )}
                  {filteredMasterItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatRubroLabel(resolveMasterRubro(item))}
                          {item.source_ref ? ` | ${item.source_ref}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          ${Number(item.suggested_price || 0).toLocaleString('es-AR')}
                        </span>
                        <button
                          type="button"
                          onClick={() => addMasterItemToQuote(item)}
                          className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
          </div>
        </div>
        {sessionMediaOverlays}
        {session && (
          <footer className="fixed inset-x-0 bottom-0 z-[95] border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="mx-auto flex w-full max-w-none flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500 md:px-6 supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">UrbanFix</span> (c) {new Date().getFullYear()}{' '}
                UrbanFix
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={startNewQuote}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Nuevo presupuesto
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Cerrar sesion
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <a
                  href="mailto:info@urbanfix.com.ar"
                  className="font-semibold text-slate-600 transition hover:text-slate-900"
                >
                  Soporte
                </a>
                <a href="/terminos" className="font-semibold text-slate-600 transition hover:text-slate-900">
                  Terminos y condiciones
                </a>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}



