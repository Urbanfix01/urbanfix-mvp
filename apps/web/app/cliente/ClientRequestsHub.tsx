'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase, supabaseConfigError } from '../../lib/supabase/supabase';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, FilePlus, ImagePlus, Loader2, LockKeyhole, LogOut, Mail, MapPin, MessageCircle, Settings, ShieldCheck, Store, User } from 'lucide-react';
import GoogleMark from '../../components/GoogleMark';
import PublicTopNav from '../../components/PublicTopNav';
import TechnicianOperationalMap from '../../components/TechnicianOperationalMap';
import {
  clearAuthAccessProfileIntent,
  getAuthUserProfileFromMetadata,
  setAuthAccessProfileIntent,
  syncAuthAccessTokenCookie,
} from '../../lib/auth/post-auth';
import { getPasswordPolicyError, PASSWORD_POLICY_MESSAGE } from '../../lib/auth/password-policy';
import { buildMapLinks, buildOpenStreetMapEmbedUrl } from '../../lib/map-links';
import { gremiosCatalog } from '../../lib/seo/gremios-data';

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
  urgencyLevel: number;
  preferredStartTime: string;
  preferredEndTime: string;
  preferredWindow: string;
  mode: 'marketplace' | 'direct';
  radiusKm: number;
  targetTechnicianId: string;
  targetTechnicianName: string;
  targetTechnicianPhone: string;
};

type ClientRequestDraftPayload = {
  form: CreateRequestForm;
  requestStep: 1 | 2 | 3;
  locationLat: number | null;
  locationLng: number | null;
  locationSource: 'gps' | 'address' | null;
  confirmedAddressLabel: string;
  confirmedAddressProvince: string;
  savedAt: string;
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
  mapLat: number | null;
  mapLng: number | null;
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

type ClientWorkspaceView = 'request' | 'profile' | 'messages' | 'showcase' | 'map';

const defaultForm: CreateRequestForm = {
  title: '',
  category: '',
  address: '',
  city: '',
  description: '',
  urgency: 'media',
  urgencyLevel: 62,
  preferredStartTime: '',
  preferredEndTime: '',
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

const getClientAuthProfileSeed = (session: Session | null) => {
  const metadata = (session?.user?.user_metadata || {}) as Record<string, any>;
  const fullName =
    String(metadata.full_name || '').trim() ||
    String(metadata.name || '').trim() ||
    String(metadata.user_name || '').trim() ||
    String(session?.user?.email || '')
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim();
  const avatarUrl =
    String(metadata.avatar_url || '').trim() ||
    String(metadata.picture || '').trim() ||
    String(metadata.photo_url || '').trim();
  const phone = String(metadata.phone || metadata.whatsapp || '').trim();

  return {
    fullName,
    avatarUrl,
    phone,
  };
};

const requestSteps = [
  {
    id: 1,
    label: 'Problema',
    guide: 'Rubro, título corto y detalle del problema.',
  },
  {
    id: 2,
    label: 'Ubicación',
    guide: 'Calle, altura, ciudad y punto confirmado en el mapa.',
  },
  {
    id: 3,
    label: 'Envío',
    guide: 'Revisa la solicitud y define urgencia u horario preferido.',
  },
] as const;

const CLIENT_REQUEST_EXTRA_CATEGORY_OPTIONS = [
  'Plomeria',
  'Albanileria',
  'Sanitario',
  'Gas',
  'Herreria',
  'Carpinteria',
  'Aire acondicionado',
  'Refrigeracion',
  'Cerrajeria',
  'Impermeabilizacion',
  'Techos',
  'Durlock y yeseria',
  'Pisos y revestimientos',
  'Vidrieria y aberturas',
  'Soldadura',
  'Portones automaticos',
  'Alarmas y camaras',
  'Redes y datos',
  'Calefaccion',
  'Energia solar',
  'Jardineria y poda',
  'Limpieza',
  'Limpieza post obra',
  'Control de plagas',
  'Mantenimiento de piletas',
  'Mantenimiento de consorcios',
  'Mantenimiento comercial',
  'Banos y cocinas',
  'Demolicion',
  'Excavaciones',
  'Hormigon armado',
  'Estructuras metalicas',
  'Reformas integrales',
  'Electrodomesticos',
  'Heladeras y freezers',
  'Lavarropas y lavavajillas',
  'Cocinas y hornos',
  'Calefones y termotanques',
  'Bombas de agua',
  'Tanques de agua',
  'Destapaciones',
  'Humedad y filtraciones',
  'Persianas y cortinas',
  'Muebles a medida',
  'Porteros electricos',
  'Domotica',
  'Otro',
] as const;

const REQUEST_CATEGORY_OPTIONS = Array.from(
  new Set([...gremiosCatalog.map((item) => item.title), ...CLIENT_REQUEST_EXTRA_CATEGORY_OPTIONS])
).sort((current, next) => {
  if (current === 'Otro') return 1;
  if (next === 'Otro') return -1;
  return current.localeCompare(next, 'es', { sensitivity: 'base' });
});
const REQUEST_TIME_OPTIONS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
] as const;

const urgencySliderMeta = {
  baja: {
    label: 'Baja',
    percent: 32,
    fillClass: 'from-emerald-500 via-lime-400 to-lime-300',
    bubbleClass: 'border-emerald-200 bg-emerald-400 text-white shadow-emerald-200',
  },
  media: {
    label: 'Media',
    percent: 62,
    fillClass: 'from-emerald-500 via-lime-400 to-amber-300',
    bubbleClass: 'border-amber-200 bg-amber-400 text-white shadow-amber-200',
  },
  alta: {
    label: 'Alta',
    percent: 91,
    fillClass: 'from-orange-500 via-amber-400 to-yellow-300',
    bubbleClass: 'border-orange-200 bg-[#ff8f1f] text-white shadow-orange-200',
  },
} as const satisfies Record<CreateRequestForm['urgency'], {
  label: string;
  percent: number;
  fillClass: string;
  bubbleClass: string;
}>;
const clampUrgencyLevel = (value: number) => Math.min(100, Math.max(1, Math.round(value)));

const getUrgencyFromLevel = (value: number): CreateRequestForm['urgency'] => {
  const safeValue = clampUrgencyLevel(value);
  if (safeValue <= 33) return 'baja';
  if (safeValue <= 66) return 'media';
  return 'alta';
};

const getFlipTimeParts = (value: string) => {
  if (!value) return { hour: '--', minute: '--' };
  const [hour = '--', minute = '--'] = value.split(':');
  return { hour, minute };
};

const REQUEST_EXAMPLES = [
  {
    title: 'Pierde agua el inodoro',
    description: 'Pierde agua constantemente desde la mochila. Necesito revisar si hay que cambiar mecanismo o flotante.',
  },
  {
    title: 'No enfría el aire del living',
    description: 'El equipo prende pero no enfría bien. Hace ruido y hace más de un año que no tiene service.',
  },
  {
    title: 'Necesito revisar una llave térmica',
    description: 'Salta la térmica cuando uso varios artefactos. Quiero revisar tablero y circuito.',
  },
  {
    title: 'Filtración en el techo',
    description: 'Apareció humedad después de la lluvia. Necesito ubicar la filtración y sellar la zona.',
  },
  {
    title: 'Instalar un tomacorriente',
    description: 'Necesito agregar un tomacorriente nuevo en una pared del ambiente y revisar la carga.',
  },
  {
    title: 'Pintar una habitación',
    description: 'Quiero pintar paredes y techo de una habitación. Hay algunos detalles para lijar y emprolijar.',
  },
  {
    title: 'Cambiar una cerradura',
    description: 'La cerradura está dura y cuesta abrir. Necesito cambiarla o repararla según convenga.',
  },
  {
    title: 'Destapar la pileta de cocina',
    description: 'El agua baja muy lento y vuelve olor. Necesito destapar y revisar el sifón.',
  },
] as const;

const CLIENT_AVATAR_PRESETS = [
  { label: 'Naranja', src: '/avatars/client-amber.svg' },
  { label: 'Verde', src: '/avatars/client-green.svg' },
  { label: 'Azul', src: '/avatars/client-blue.svg' },
  { label: 'Violeta', src: '/avatars/client-violet.svg' },
  { label: 'Rosa', src: '/avatars/client-rose.svg' },
  { label: 'Teal', src: '/avatars/client-teal.svg' },
  { label: 'Dorado', src: '/avatars/client-gold.svg' },
  { label: 'Gris', src: '/avatars/client-slate.svg' },
] as const;

const CREATE_REQUEST_INTENT = 'create-request';
const CLIENT_REQUEST_DRAFT_STORAGE_PREFIX = 'urbanfix:client-request-draft:';

const getClientRequestDraftStorageKey = (userId: string) => `${CLIENT_REQUEST_DRAFT_STORAGE_PREFIX}${userId}`;

const getClientRequestDraftStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readClientRequestDraft = (key: string) => {
  const storage = getClientRequestDraftStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const storeClientRequestDraft = (key: string, value: string) => {
  const storage = getClientRequestDraftStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const removeClientRequestDraft = (key: string) => {
  const storage = getClientRequestDraftStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage errors in embedded browsers.
  }
};

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
  'Ingresa correo y contraseña.',
  'Ingresa un correo válido.',
  'Ingresa un correo real para crear la cuenta.',
  'No pudimos validar el dominio del correo. Usa una cuenta real.',
  PASSWORD_POLICY_MESSAGE,
  'Ingresa tu WhatsApp para crear tu perfil de cliente.',
  'Ingresa un WhatsApp argentino válido.',
] as const;

const getArgentinaWhatsappValidation = (value: string) => {
  const raw = String(value || '').trim();
  const rawDigits = raw.replace(/\D/g, '');
  let digits = rawDigits;

  if (digits.startsWith('00')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');

  if (digits.startsWith('549')) {
    digits = `549${digits.slice(3).replace(/^0+/, '')}`;
  } else if (digits.startsWith('54')) {
    const national = digits.slice(2).replace(/^0+/, '');
    digits = national.startsWith('9') ? `54${national}` : `549${national}`;
  } else if (/^11(15)\d{8}$/.test(digits)) {
    digits = `54911${digits.slice(4)}`;
  } else if (digits.length === 8) {
    digits = `54911${digits}`;
  } else {
    digits = `549${digits}`;
  }

  const nationalDigits = digits.startsWith('549') ? digits.slice(3) : '';
  const isValid = digits.length === 13 && digits.startsWith('549') && nationalDigits.length === 10;
  const area = nationalDigits.slice(0, 2);
  const blockA = nationalDigits.slice(2, 6);
  const blockB = nationalDigits.slice(6);
  const display = isValid ? `+54 9 ${area} ${blockA}-${blockB}` : raw;
  const href = isValid ? `https://wa.me/${digits}` : '';

  let message = '';
  if (!rawDigits) {
    message = 'Agrega un WhatsApp.';
  } else if (!isValid) {
    message = rawDigits.length < 10 ? 'Falta código de área.' : 'Revisa el número.';
  } else {
    message = display;
  }

  return {
    raw,
    digits,
    display,
    href,
    isEmpty: rawDigits.length === 0,
    isValid,
    message,
  };
};

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
    return 'Correo o contraseña incorrectos.';
  }
  if (normalizedMessage.includes('email not confirmed')) {
    return 'Confirma tu correo antes de ingresar.';
  }
  if (normalizedMessage.includes('already registered') || normalizedMessage.includes('user already exists')) {
    return 'Ese correo ya tiene cuenta. Ingresa o recupera la contraseña.';
  }
  if (normalizedMessage.includes('password should be at least') || normalizedMessage.includes('weak password')) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many')) {
    return 'Hay demasiados intentos. Espera un momento y vuelve a probar.';
  }
  if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return 'No pudimos conectar. Revisa tu conexión e intenta nuevamente.';
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
  technicianName: String(raw?.technicianName || raw?.technician_name || 'Técnico UrbanFix'),
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
  const addressLookupSequenceRef = useRef(0);
  const authClientMetadataSyncedRef = useRef('');
  const welcomeWhatsAppNoticeInFlightRef = useRef(false);
  const requestDraftRestoredKeyRef = useRef('');
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
  const [requestTitleExampleIndex, setRequestTitleExampleIndex] = useState(0);
  const [requestExampleCursor, setRequestExampleCursor] = useState(0);
  const [requestExampleDeleting, setRequestExampleDeleting] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestNotice, setRequestNotice] = useState('');
  const [requests, setRequests] = useState<ClientRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsLoadError, setRequestsLoadError] = useState('');
  const [selectedClientRequestId, setSelectedClientRequestId] = useState('');
  const [selectedClientMessageRequestId, setSelectedClientMessageRequestId] = useState('');
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
  const [savedClientProfilePhone, setSavedClientProfilePhone] = useState('');
  const [nearbyTechnicians, setNearbyTechnicians] = useState<NearbyTechnician[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyWarning, setNearbyWarning] = useState('');
  const [nearbyCenterLabel, setNearbyCenterLabel] = useState('');
  const [nearbyCenter, setNearbyCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedNearbyTechnicianId, setSelectedNearbyTechnicianId] = useState('');
  const [isDesktopNavExpanded, setIsDesktopNavExpanded] = useState(false);
  const clientRequestDraftStorageKey = session?.user?.id ? getClientRequestDraftStorageKey(session.user.id) : '';
  const clientWhatsappValidation = useMemo(
    () => getArgentinaWhatsappValidation(clientProfileForm.phone),
    [clientProfileForm.phone]
  );
  const clientWhatsappControlToneClass = !clientProfileForm.phone.trim()
    ? 'border-slate-300 bg-white text-slate-800 focus-within:border-[#2a0338] focus-within:ring-[#2a0338]/10'
    : clientWhatsappValidation.isValid
      ? 'border-emerald-300 bg-emerald-50/80 text-emerald-950 focus-within:border-emerald-500 focus-within:ring-emerald-100'
      : 'border-amber-300 bg-amber-50/80 text-amber-950 focus-within:border-amber-500 focus-within:ring-amber-100';
  const clientWhatsappInputStatusClass = !clientProfileForm.phone.trim()
    ? 'text-slate-400'
    : clientWhatsappValidation.isValid
      ? 'text-emerald-600'
      : 'text-amber-600';
  const savedClientWhatsappValidation = useMemo(
    () => getArgentinaWhatsappValidation(savedClientProfilePhone),
    [savedClientProfilePhone]
  );
  const comparableClientWhatsapp = clientWhatsappValidation.isValid
    ? clientWhatsappValidation.digits
    : clientProfileForm.phone.trim();
  const comparableSavedClientWhatsapp = savedClientWhatsappValidation.isValid
    ? savedClientWhatsappValidation.digits
    : savedClientProfilePhone.trim();
  const hasClientWhatsappChanges = comparableClientWhatsapp !== comparableSavedClientWhatsapp;
  const requestExamplePlaceholder = useMemo(
    () => ({
      title: REQUEST_EXAMPLES[requestTitleExampleIndex].title.slice(0, requestExampleCursor),
      description: REQUEST_EXAMPLES[requestTitleExampleIndex].description.slice(0, requestExampleCursor),
    }),
    [requestExampleCursor, requestTitleExampleIndex]
  );
  const preferredStartTimeParts = useMemo(
    () => getFlipTimeParts(form.preferredStartTime),
    [form.preferredStartTime]
  );
  const preferredEndTimeParts = useMemo(
    () => getFlipTimeParts(form.preferredEndTime),
    [form.preferredEndTime]
  );
  const selectedUrgencyLevel = clampUrgencyLevel(form.urgencyLevel || urgencySliderMeta[form.urgency].percent);
  const selectedUrgencyMeta = urgencySliderMeta[getUrgencyFromLevel(selectedUrgencyLevel)];
  const requestPreviewClientName =
    clientProfileForm.fullName.trim() ||
    String(session?.user?.email || '')
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim() ||
    'Cliente UrbanFix';
  const requestPreviewInitial = requestPreviewClientName.slice(0, 1).toUpperCase() || 'C';
  const requestPreviewZone =
    form.city.trim() ||
    confirmedAddressProvince.trim() ||
    (confirmedAddressLabel.split(',').slice(-3, -1).join(', ').trim() || 'Zona protegida');
  const requestPreviewWindow =
    form.preferredStartTime && form.preferredEndTime ? `${form.preferredStartTime} - ${form.preferredEndTime}` : '';
  const requestPreviewDate = new Intl.DateTimeFormat('es-AR').format(new Date());
  const hasRequestDraftContent = useMemo(
    () =>
      Boolean(
        form.title.trim() ||
          form.category.trim() ||
          form.address.trim() ||
          form.city.trim() ||
          form.description.trim() ||
          form.preferredStartTime ||
          form.preferredEndTime ||
          form.preferredWindow ||
          form.urgencyLevel !== defaultForm.urgencyLevel ||
          locationLat !== null ||
          locationLng !== null ||
          confirmedAddressLabel.trim()
      ),
    [confirmedAddressLabel, form, locationLat, locationLng]
  );

  const setUrgencyLevel = (level: number) => {
    const nextLevel = clampUrgencyLevel(level);
    const nextUrgency = getUrgencyFromLevel(nextLevel);
    setForm((prev) =>
      prev.urgencyLevel === nextLevel && prev.urgency === nextUrgency
        ? prev
        : { ...prev, urgency: nextUrgency, urgencyLevel: nextLevel }
    );
  };

  const setUrgencyFromSliderPosition = (clientX: number, sliderElement: HTMLDivElement) => {
    const sliderRect = sliderElement.getBoundingClientRect();
    if (!sliderRect.width) return;
    const ratio = Math.min(1, Math.max(0, (clientX - sliderRect.left) / sliderRect.width));
    setUrgencyLevel(1 + ratio * 99);
  };

  const handleClientPhoneChange = (value: string) => {
    setClientProfileForm((prev) => ({ ...prev, phone: value }));
    setClientProfileError('');
    setClientProfileNotice('');
  };

  const setPreferredTimeRange = (field: 'preferredStartTime' | 'preferredEndTime', value: string) => {
    setForm((prev) => {
      const nextStart = field === 'preferredStartTime' ? value : prev.preferredStartTime;
      const nextEnd = field === 'preferredEndTime' ? value : prev.preferredEndTime;
      return {
        ...prev,
        preferredStartTime: nextStart,
        preferredEndTime: nextEnd,
        preferredWindow: nextStart && nextEnd ? `${nextStart} - ${nextEnd}` : '',
      };
    });
  };

  const showNearbyTechnicianAt = (index: number) => {
    if (!nearbyTechnicians.length) return;
    const normalizedIndex = ((index % nearbyTechnicians.length) + nearbyTechnicians.length) % nearbyTechnicians.length;
    setSelectedNearbyTechnicianId(nearbyTechnicians[normalizedIndex].id);
  };

  const normalizeClientPhoneField = () => {
    const validation = getArgentinaWhatsappValidation(clientProfileForm.phone);
    if (!validation.isValid) return;
    setClientProfileForm((prev) => ({ ...prev, phone: validation.display }));
  };

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      setLoadingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthAccessTokenCookie(session?.access_token);
      setSession(session);
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthAccessTokenCookie(nextSession?.access_token);
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
    if (typeof window === 'undefined') return;
    if (requestStep !== 1 || (form.title.trim() && form.description.trim())) return;

    const example = REQUEST_EXAMPLES[requestTitleExampleIndex];
    const maxLength = Math.max(example.title.length, example.description.length);
    let delay = 55;

    if (!requestExampleDeleting && requestExampleCursor >= maxLength) {
      delay = 3200;
    } else if (requestExampleDeleting && requestExampleCursor > 0) {
      delay = 24;
    } else if (requestExampleDeleting && requestExampleCursor === 0) {
      delay = 650;
    }

    const timer = window.setTimeout(() => {
      if (!requestExampleDeleting && requestExampleCursor < maxLength) {
        setRequestExampleCursor((current) => Math.min(current + 1, maxLength));
        return;
      }
      if (!requestExampleDeleting) {
        setRequestExampleDeleting(true);
        return;
      }
      if (requestExampleCursor > 0) {
        setRequestExampleCursor((current) => Math.max(current - 1, 0));
        return;
      }
      setRequestExampleDeleting(false);
      setRequestTitleExampleIndex((current) => (current + 1) % REQUEST_EXAMPLES.length);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [form.description, form.title, requestExampleCursor, requestExampleDeleting, requestStep, requestTitleExampleIndex]);

  useEffect(() => {
    const user = session?.user;
    if (!user?.id) {
      authClientMetadataSyncedRef.current = '';
      return;
    }

    const metadata = (user.user_metadata || {}) as Record<string, any>;
    const accountProfile = getAuthUserProfileFromMetadata(metadata);
    if (accountProfile === 'tecnico' || accountProfile === 'empresa') {
      clearAuthAccessProfileIntent();
      window.location.replace(`/tecnicos?perfil=${accountProfile}`);
      return;
    }

    const seed = getClientAuthProfileSeed(session);
    const nextData: Record<string, string> = {
      user_type: 'cliente',
      profile: 'cliente',
    };

    if (!String(metadata.full_name || '').trim() && seed.fullName) {
      nextData.full_name = seed.fullName;
    }
    if (!String(metadata.avatar_url || '').trim() && seed.avatarUrl) {
      nextData.avatar_url = seed.avatarUrl;
    }
    if (!String(metadata.phone || '').trim() && seed.phone) {
      nextData.phone = seed.phone;
    }

    const alreadyClient =
      String(metadata.user_type || '').toLowerCase() === 'cliente' &&
      String(metadata.profile || '').toLowerCase() === 'cliente';
    const needsSeed =
      Boolean(nextData.full_name || nextData.avatar_url || nextData.phone) ||
      !alreadyClient;
    const syncKey = `${user.id}:${JSON.stringify(nextData)}`;
    if (!needsSeed || authClientMetadataSyncedRef.current === syncKey) return;

    authClientMetadataSyncedRef.current = syncKey;
    supabase.auth.updateUser({ data: nextData }).catch(() => {
      authClientMetadataSyncedRef.current = '';
    });
  }, [session?.user?.id, session?.user?.user_metadata]);

  useEffect(() => {
    if (!session?.user?.id) return;
    clearAuthAccessProfileIntent();
  }, [session?.user?.id]);

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

  const clearClientRequestDraft = () => {
    if (!clientRequestDraftStorageKey || typeof window === 'undefined') return;
    removeClientRequestDraft(clientRequestDraftStorageKey);
  };

  const handleSaveRequestDraft = () => {
    if (!clientRequestDraftStorageKey || typeof window === 'undefined') return;
    setRequestError('');
    setRequestNotice('');
    if (!hasRequestDraftContent) {
      setRequestError('Carga al menos un dato para guardar el borrador.');
      return;
    }
    const draft: ClientRequestDraftPayload = {
      form,
      requestStep,
      locationLat,
      locationLng,
      locationSource,
      confirmedAddressLabel,
      confirmedAddressProvince,
      savedAt: new Date().toISOString(),
    };
    if (!storeClientRequestDraft(clientRequestDraftStorageKey, JSON.stringify(draft))) {
      setRequestError('Este navegador no permite guardar borradores. Puedes publicar la solicitud directamente.');
      return;
    }
    setRequestNotice('Borrador guardado.');
  };

  const handleLogout = async () => {
    clearAuthAccessProfileIntent();
    await supabase.auth.signOut();
    void syncAuthAccessTokenCookie(null);
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

  const openClientMessages = () => {
    if (typeof window === 'undefined') return;
    const firstWithResponses = requests.find((item) => visibleResponseCount(item.responses) > 0);
    setSelectedClientMessageRequestId((current) => current || firstWithResponses?.id || requests[0]?.id || '');
    setActiveClientView('messages');
    document.getElementById('mensajes-solicitudes-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clientSidebarAccountLabel = clientProfileForm.fullName.trim() || session?.user?.email || 'Tu cuenta';

  const fetchRequests = async () => {
    if (!session?.access_token) return;
    setLoadingRequests(true);
    setRequestsLoadError('');
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
      setRequestsLoadError(
        error?.name === 'AbortError'
          ? 'La carga de solicitudes tardó demasiado. Intenta actualizar.'
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
      const seed = getClientAuthProfileSeed(session);
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
          full_name: seed.fullName || '',
          phone: seed.phone || '',
          avatar_url: seed.avatarUrl || null,
        };
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert(fallback)
          .select('id, full_name, phone, avatar_url, email')
          .single();
        if (createError) throw createError;
        profileRow = created;
      } else {
        const profilePatch: Record<string, string | null> = {};
        if (!String(profileRow.full_name || '').trim() && seed.fullName) {
          profilePatch.full_name = seed.fullName;
        }
        if (!String(profileRow.avatar_url || '').trim() && seed.avatarUrl) {
          profilePatch.avatar_url = seed.avatarUrl;
        }
        if (!String(profileRow.phone || '').trim() && seed.phone) {
          profilePatch.phone = seed.phone;
        }
        if (!String(profileRow.email || '').trim() && session?.user?.email) {
          profilePatch.email = session.user.email;
        }

        if (Object.keys(profilePatch).length > 0) {
          const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update(profilePatch)
            .eq('id', userId)
            .select('id, full_name, phone, avatar_url, email')
            .maybeSingle();
          if (updateError) throw updateError;
          profileRow = updated || { ...profileRow, ...profilePatch };
        }
      }

      const profilePhone = String(profileRow?.phone || '').trim();
      setClientProfileForm({
        fullName: String(profileRow?.full_name || '').trim(),
        phone: profilePhone,
        avatarUrl: String(profileRow?.avatar_url || '').trim(),
      });
      setSavedClientProfilePhone(profilePhone);
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
      } else {
        const requestCenter =
          requests.find((item) => item.id === selectedClientRequestId && item.locationLat !== null && item.locationLng !== null) ||
          requests.find((item) => item.locationLat !== null && item.locationLng !== null);
        if (requestCenter && requestCenter.locationLat !== null && requestCenter.locationLng !== null) {
          params.set('locationLat', String(requestCenter.locationLat));
          params.set('locationLng', String(requestCenter.locationLng));
          if (!params.has('address') && requestCenter.address) params.set('address', requestCenter.address);
          if (!params.has('city') && requestCenter.city) params.set('city', requestCenter.city);
        }
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
            mapLat: Number.isFinite(Number(row?.map_lat)) ? Number(row.map_lat) : null,
            mapLng: Number.isFinite(Number(row?.map_lng)) ? Number(row.map_lng) : null,
            availableNow: Boolean(row?.available_now),
            workingHoursLabel: String(row?.working_hours_label || ''),
          }))
        : [];
      setNearbyTechnicians(normalized);
      setSelectedNearbyTechnicianId((current) =>
        current && normalized.some((tech) => tech.id === current) ? current : normalized[0]?.id || ''
      );
      setNearbyCenterLabel(String(payload?.center_label || '').trim());
      setNearbyCenter(
        Number.isFinite(Number(payload?.center?.lat)) && Number.isFinite(Number(payload?.center?.lng))
          ? { lat: Number(payload.center.lat), lng: Number(payload.center.lng) }
          : null
      );
      setNearbyWarning(String(payload?.warning || '').trim());
    } catch (error: any) {
      setNearbyTechnicians([]);
      setNearbyCenterLabel('');
      setNearbyCenter(null);
      setSelectedNearbyTechnicianId('');
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
      setSavedClientProfilePhone('');
      setClientProfileError('');
      setClientProfileNotice('');
      setNearbyTechnicians([]);
      setRequestsLoadError('');
      setNearbyError('');
      setNearbyWarning('');
      setNearbyCenterLabel('');
      setNearbyCenter(null);
      setSelectedNearbyTechnicianId('');
      return;
    }
    fetchClientProfile(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!clientRequestDraftStorageKey || typeof window === 'undefined') {
      requestDraftRestoredKeyRef.current = '';
      return;
    }
    if (requestDraftRestoredKeyRef.current === clientRequestDraftStorageKey) return;
    requestDraftRestoredKeyRef.current = clientRequestDraftStorageKey;

    const rawDraft = readClientRequestDraft(clientRequestDraftStorageKey);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as Partial<ClientRequestDraftPayload>;
      if (!draft || typeof draft !== 'object' || !draft.form) return;

      const rawForm = draft.form as Partial<CreateRequestForm>;
      const rawUrgency =
        rawForm.urgency === 'baja' || rawForm.urgency === 'media' || rawForm.urgency === 'alta'
          ? rawForm.urgency
          : defaultForm.urgency;
      const restoredUrgencyLevel = clampUrgencyLevel(
        Number(rawForm.urgencyLevel || urgencySliderMeta[rawUrgency].percent)
      );
      const restoredLat =
        draft.locationLat !== null && draft.locationLat !== undefined && Number.isFinite(Number(draft.locationLat))
          ? Number(draft.locationLat)
          : null;
      const restoredLng =
        draft.locationLng !== null && draft.locationLng !== undefined && Number.isFinite(Number(draft.locationLng))
          ? Number(draft.locationLng)
          : null;
      const restoredLocationSource =
        draft.locationSource === 'gps' || draft.locationSource === 'address' ? draft.locationSource : null;

      setForm({
        ...defaultForm,
        ...rawForm,
        urgency: getUrgencyFromLevel(restoredUrgencyLevel),
        urgencyLevel: restoredUrgencyLevel,
        radiusKm: normalizeRadiusKm(rawForm.radiusKm, defaultForm.radiusKm),
        mode: rawForm.mode === 'direct' ? 'direct' : 'marketplace',
      });
      setRequestStep(draft.requestStep === 2 || draft.requestStep === 3 ? draft.requestStep : 1);
      setLocationLat(restoredLat);
      setLocationLng(restoredLng);
      setLocationSource(restoredLat !== null && restoredLng !== null ? restoredLocationSource || 'address' : null);
      setConfirmedAddressLabel(String(draft.confirmedAddressLabel || ''));
      setConfirmedAddressProvince(String(draft.confirmedAddressProvince || ''));
      setAddressCandidates([]);
      setAddressDropdownOpen(false);
      setSelectedAddressCandidateKey('');
      setAddressValidationError('');
      setRequestError('');
      setRequestNotice('Borrador recuperado.');
    } catch {
      removeClientRequestDraft(clientRequestDraftStorageKey);
    }
  }, [clientRequestDraftStorageKey]);

  const handleGoogleAuth = async () => {
    if (googleAuthLoading) return;
    setAuthError('');
    setAuthNotice('');
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      return;
    }
    setGoogleAuthLoading(true);
    setAuthAccessProfileIntent('cliente');
    const redirectTo = `${window.location.origin}/cliente${window.location.search || ''}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      clearAuthAccessProfileIntent();
      setAuthError(getFriendlyClientAuthErrorMessage(error, 'google'));
      setGoogleAuthLoading(false);
    }
  };

  const notifyAccountWelcomeWhatsapp = async (accessToken?: string | null, source = 'client_profile_save') => {
    const token = accessToken || session?.access_token;
    if (!token) return false;
    if (welcomeWhatsAppNoticeInFlightRef.current) return false;
    welcomeWhatsAppNoticeInFlightRef.current = true;

    try {
      const response = await fetch('/api/account/welcome-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ audience: 'cliente', source }),
      });
      if (!response.ok) return false;
      const payload = (await response.json().catch(() => null)) as { sent?: boolean } | null;
      return payload?.sent === true;
    } catch (error) {
      console.warn('No se pudo enviar el WhatsApp de bienvenida al cliente.', error);
      return false;
    } finally {
      welcomeWhatsAppNoticeInFlightRef.current = false;
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
      setAuthError('Ingresa tu correo para recuperar la contraseña.');
      return;
    }
    setSendingRecovery(true);
    try {
      const redirectTo = `${window.location.origin}/cliente`;
      const { error } = await supabase.auth.resetPasswordForEmail(safeEmail, { redirectTo });
      if (error) throw error;
      setAuthNotice('Te enviamos un correo para recuperar tu contraseña.');
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
        throw new Error('Ingresa correo y contraseña.');
      }
      if (!safeEmail.includes('@')) {
        throw new Error('Ingresa un correo válido.');
      }
      const passwordPolicyError = authMode === 'register' ? getPasswordPolicyError(password) : '';
      if (passwordPolicyError) {
        throw new Error(passwordPolicyError);
      }
      setAuthAccessProfileIntent('cliente');
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) throw error;
      } else {
        const emailValidationResponse = await fetch('/api/auth/validate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: safeEmail }),
        });
        const emailValidationPayload = await emailValidationResponse.json();
        if (!emailValidationResponse.ok || emailValidationPayload?.valid !== true) {
          throw new Error(emailValidationPayload?.error || 'Ingresa un correo real para crear la cuenta.');
        }
        const phoneValidation = getArgentinaWhatsappValidation(clientProfileForm.phone);
        if (phoneValidation.isEmpty) {
          throw new Error('Ingresa tu WhatsApp para crear tu perfil de cliente.');
        }
        if (!phoneValidation.isValid) {
          throw new Error('Ingresa un WhatsApp argentino válido.');
        }
        const safePhone = phoneValidation.display;
        const fallbackFullName = getClientAuthProfileSeed({
          user: {
            email: safeEmail,
            user_metadata: {},
          },
        } as Session).fullName;
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              full_name: fallbackFullName,
              phone: safePhone,
              user_type: 'cliente',
              profile: 'cliente',
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
            full_name: fallbackFullName,
            phone: safePhone,
          });
          if (profileError) throw profileError;
        }
        const welcomeSent = signUpData?.session?.access_token
          ? await notifyAccountWelcomeWhatsapp(signUpData.session.access_token, 'client_register')
          : false;
        setAuthNotice(
          signUpData?.session
            ? welcomeSent
              ? 'Cuenta creada. Tu perfil de cliente ya quedó guardado y te enviamos un WhatsApp de bienvenida.'
              : 'Cuenta creada. Tu perfil de cliente ya quedó guardado.'
            : 'Cuenta creada. Revisa tu correo para confirmar y luego entra: el perfil base se completará al iniciar sesión.'
        );
        setPassword('');
      }
    } catch (error: any) {
      clearAuthAccessProfileIntent();
      setAuthError(getFriendlyClientAuthErrorMessage(error, authMode));
    } finally {
      setAuthLoading(false);
    }
  };

  const saveClientProfilePhone = async () => {
    if (!session?.user?.id) {
      throw new Error('Inicia sesion para guardar tu perfil.');
    }

    const phoneValidation = getArgentinaWhatsappValidation(clientProfileForm.phone);
    if (phoneValidation.isEmpty) {
      throw new Error('Ingresa tu WhatsApp para guardar tu perfil.');
    }
    if (!phoneValidation.isValid) {
      throw new Error('Ingresa un WhatsApp argentino valido.');
    }

    const phone = phoneValidation.display;
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      email: session.user.email || null,
      phone,
    });
    if (error) throw error;

    setClientProfileForm((prev) => ({ ...prev, phone }));
    setSavedClientProfilePhone(phone);
    return { phone };
  };

  const handleSaveClientProfile = async () => {
    if (!session?.user?.id) return;
    setSavingClientProfile(true);
    setClientProfileError('');
    setClientProfileNotice('');
    try {
      await saveClientProfilePhone();
      const welcomeSent = await notifyAccountWelcomeWhatsapp(session.access_token, 'client_profile_save');
      setClientProfileNotice(
        welcomeSent ? 'WhatsApp guardado. Te enviamos un mensaje de bienvenida.' : 'WhatsApp guardado.'
      );
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
      setClientProfileError('Inicia sesión para subir una foto.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setClientProfileError('Solo se permiten imágenes.');
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

  const handleClientAvatarPresetSelect = async (avatarUrl: string) => {
    if (!session?.user?.id) return;
    setSavingClientProfile(true);
    setClientProfileError('');
    setClientProfileNotice('');
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email || null,
          avatar_url: avatarUrl,
        });
      if (error) throw error;
      setClientProfileForm((prev) => ({ ...prev, avatarUrl }));
      setClientProfileNotice('Imagen de perfil seleccionada.');
    } catch (error: any) {
      setClientProfileError(error?.message || 'No pudimos guardar la imagen.');
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
        throw new Error(
          clientWhatsappValidation.isEmpty
            ? 'Agrega tu WhatsApp antes de publicar una solicitud.'
            : 'Corrige tu WhatsApp antes de publicar una solicitud.'
        );
      }
      if (!form.title.trim() || !form.category.trim() || !form.address.trim() || !form.description.trim()) {
        throw new Error('Completa título, categoría, dirección y descripción.');
      }
      if (locationLat === null || locationLng === null) {
        setRequestStep(2);
        throw new Error('Valida la dirección o usa GPS antes de publicar.');
      }
      const { phone: clientPhone } = await saveClientProfilePhone();
      const response = await fetch('/api/client/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          city: form.city.trim() || confirmedAddressProvince.trim() || 'Sin localidad',
          province: confirmedAddressProvince.trim(),
          locationLat,
          locationLng,
          clientPhone,
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
      clearClientRequestDraft();
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
    if (clientWhatsappValidation.isEmpty) missing.push('WhatsApp');
    else if (!clientWhatsappValidation.isValid) missing.push('WhatsApp válido');
    return missing;
  }, [clientWhatsappValidation.isEmpty, clientWhatsappValidation.isValid]);

  const isClientProfileComplete = clientProfileMissingFields.length === 0;
  const clientSetupSteps = useMemo(
    () => [
      {
        key: 'profile',
        title: 'Completa tu perfil',
        description: 'WhatsApp obligatorio e imagen opcional para identificar tus solicitudes.',
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
  const selectedShowcaseTechnician = useMemo(
    () =>
      nearbyTechnicians.find((item) => item.id === selectedNearbyTechnicianId) ||
      nearbyTechnicians[0] ||
      null,
    [nearbyTechnicians, selectedNearbyTechnicianId]
  );
  const activeNearbyTechnicianIndex = useMemo(() => {
    if (!nearbyTechnicians.length) return -1;
    const index = nearbyTechnicians.findIndex((item) => item.id === (selectedShowcaseTechnician?.id || ''));
    return index >= 0 ? index : 0;
  }, [nearbyTechnicians, selectedShowcaseTechnician?.id]);
  const nearbyTechnicianMapPoints = useMemo(
    () =>
      nearbyTechnicians
        .filter((tech) => tech.mapLat !== null && tech.mapLng !== null)
        .map((tech) => ({
          id: tech.id,
          kind: 'technician' as const,
          title: tech.name,
          subtitle: `${tech.specialty} · ${tech.city || 'Zona sin ciudad'}`,
          meta: `${tech.distanceKm.toFixed(1)} km · ${tech.availableNow ? 'Disponible' : 'Consultar'}`,
          lat: tech.mapLat as number,
          lon: tech.mapLng as number,
        })),
    [nearbyTechnicians]
  );
  const nearbyTechnicianMapCenter = useMemo(() => {
    if (
      selectedShowcaseTechnician &&
      selectedShowcaseTechnician.mapLat !== null &&
      selectedShowcaseTechnician.mapLng !== null
    ) {
      return { lat: selectedShowcaseTechnician.mapLat, lon: selectedShowcaseTechnician.mapLng };
    }
    return nearbyCenter ? { lat: nearbyCenter.lat, lon: nearbyCenter.lng } : null;
  }, [nearbyCenter, selectedShowcaseTechnician]);
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
  const clientVisibleResponseTotal = useMemo(
    () => requests.reduce((total, item) => total + visibleResponseCount(item.responses), 0),
    [requests]
  );
  const clientSubmittedResponseTotal = useMemo(
    () =>
      requests.reduce(
        (total, item) =>
          total + item.responses.filter((responseItem) => String(responseItem.quoteStatus || '').toLowerCase() === 'submitted').length,
        0
      ),
    [requests]
  );
  const clientAcceptedResponseTotal = useMemo(
    () =>
      requests.reduce(
        (total, item) =>
          total + item.responses.filter((responseItem) => String(responseItem.quoteStatus || '').toLowerCase() === 'accepted').length,
        0
      ),
    [requests]
  );
  const clientRequestsWithoutMapCount = requests.length - requestsWithMap.length;
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
  const clientMessageRequests = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const responseDiff = visibleResponseCount(b.responses) - visibleResponseCount(a.responses);
        if (responseDiff !== 0) return responseDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [requests]
  );
  const selectedMessageRequest = useMemo(
    () =>
      clientMessageRequests.find((item) => item.id === selectedClientMessageRequestId) ||
      clientMessageRequests[0] ||
      null,
    [clientMessageRequests, selectedClientMessageRequestId]
  );
  const selectedMessageResponses = useMemo(
    () =>
      (selectedMessageRequest?.responses || [])
        .filter((item) => String(item.quoteStatus || '').toLowerCase() !== 'pending')
        .sort((a, b) => {
          const weight = (status: string) => (status === 'accepted' ? 0 : status === 'submitted' ? 1 : 2);
          return weight(String(a.quoteStatus).toLowerCase()) - weight(String(b.quoteStatus).toLowerCase());
        }),
    [selectedMessageRequest]
  );
  const selectedMessageSubmittedCount = selectedMessageResponses.filter(
    (item) => String(item.quoteStatus || '').toLowerCase() === 'submitted'
  ).length;
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
  const selectedMapRequestIndex = useMemo(
    () => (selectedMapRequest ? requestsWithMap.findIndex((item) => item.id === selectedMapRequest.id) : -1),
    [requestsWithMap, selectedMapRequest]
  );
  const clientOperationalMapPoints = useMemo(
    () =>
      clientMapPoints.map((point) => ({
        id: point.id,
        kind: 'request' as const,
        title: point.title,
        subtitle: point.subtitle,
        meta: point.meta,
        lat: point.lat,
        lon: point.lng,
      })),
    [clientMapPoints]
  );
  const clientMapFallbackCenter = useMemo(() => {
    if (selectedClientMapPoint) return { lat: selectedClientMapPoint.lat, lon: selectedClientMapPoint.lng };
    const firstPoint = clientMapPoints[0];
    return firstPoint ? { lat: firstPoint.lat, lon: firstPoint.lng } : null;
  }, [clientMapPoints, selectedClientMapPoint]);
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

  useEffect(() => {
    if (clientMessageRequests.length === 0) {
      setSelectedClientMessageRequestId('');
      return;
    }

    setSelectedClientMessageRequestId((current) =>
      current && clientMessageRequests.some((item) => item.id === current)
        ? current
        : clientMessageRequests[0].id
    );
  }, [clientMessageRequests]);

  const showClientMapRequestAt = (index: number) => {
    if (requestsWithMap.length === 0) return;
    const nextIndex = (index + requestsWithMap.length) % requestsWithMap.length;
    const nextRequest = requestsWithMap[nextIndex];
    if (!nextRequest) return;
    setSelectedClientRequestId(nextRequest.id);
    setClientMapShowAll(false);
  };

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
      setSelectedClientMessageRequestId(requestItem.id);
      setClientResponseActionNotice(
        intent === 'reject'
          ? 'Respuesta rechazada.'
          : `${responseItem.technicianName || 'Técnico'} seleccionado para esta solicitud.`
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
      setClientProfileNotice((current) => current || 'Agrega tu WhatsApp para publicar tu solicitud.');
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
    addressLookupSequenceRef.current += 1;
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
        ? 'Dirección validada con altura exacta.'
        : 'Dirección ubicada de forma aproximada. Revisa que calle, número y ciudad estén completos.'
    );
    setForm((prev) => ({
      ...prev,
      address: candidate.primaryLabel || prev.address,
      city: candidate.locality || candidate.province || prev.city,
    }));
  };

  const handleValidateAddress = async (options: { auto?: boolean; address?: string; city?: string } = {}) => {
    const lookupSequence = addressLookupSequenceRef.current + 1;
    addressLookupSequenceRef.current = lookupSequence;
    const isAuto = Boolean(options.auto);
    const address = (options.address ?? form.address).trim();
    const city = (options.city ?? form.city).trim();
    setAddressValidationError('');
    setRequestError('');
    if (!address) {
      if (!isAuto) setAddressValidationError('Completa dirección para validar el punto.');
      return;
    }
    if (isAuto && (!/\d/.test(address) || address.length < 5)) {
      return;
    }

    if (!isAuto) setValidatingAddress(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), isAuto ? 5500 : 8500);
    try {
      const province = inferAddressProvince(city);
      const params = new URLSearchParams({ query: address, country: 'Argentina', limit: '6' });
      if (isAuto) params.set('quick', '1');
      if (city) params.set('city', city);
      if (province) params.set('province', province);
      const response = await fetch(`/api/geocode/search?${params.toString()}`, { signal: controller.signal });
      const payload = await response.json();
      if (lookupSequence !== addressLookupSequenceRef.current) return;
      if (!response.ok) throw new Error(payload?.error || 'No pudimos validar la dirección.');
      const rawCandidates: AddressCandidate[] = Array.isArray(payload?.results)
        ? payload.results
            .map((item: any) => {
              const lat = Number(item?.lat);
              const lng = Number(item?.lon);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
              const displayName = String(item?.full_display_name || item?.display_name || '').trim();
              const primaryLabel = String(item?.primary_label || item?.display_name || displayName).trim();
              if (!primaryLabel) return null;
              return {
                displayName,
                primaryLabel,
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
      const seenCandidateLabels = new Set<string>();
      const candidates = rawCandidates
        .filter((candidate) => {
          const key = `${candidate.primaryLabel}|${candidate.secondaryLabel}`.toLowerCase();
          if (seenCandidateLabels.has(key)) return false;
          seenCandidateLabels.add(key);
          return true;
        })
        .slice(0, 6);

      setAddressCandidates(candidates);
      if (!candidates.length) {
        setLocationLat(null);
        setLocationLng(null);
        setLocationSource(null);
        setSelectedAddressCandidateKey('');
        setConfirmedAddressLabel('');
        setConfirmedAddressProvince('');
        setAddressDropdownOpen(false);
        if (!isAuto) setAddressValidationError('No encontramos esa dirección. Revisa calle, número y ciudad.');
        return;
      }

      setAddressDropdownOpen(true);
      setRequestGeoNotice('');
    } catch (error: any) {
      if (lookupSequence !== addressLookupSequenceRef.current) return;
      if (!isAuto) {
        setAddressValidationError(
          error?.name === 'AbortError'
            ? 'La búsqueda tardó demasiado. Intenta con calle, número y localidad.'
            : error?.message || 'No pudimos validar la dirección.'
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (lookupSequence === addressLookupSequenceRef.current && !isAuto) {
        setValidatingAddress(false);
      }
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
    }, 320);
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
        setConfirmedAddressLabel('Ubicación actual del dispositivo');
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

  const getRequestStepMissingMessage = () => {
    if (requestStep === 1) {
      if (!form.category.trim()) return 'Selecciona el gremio del trabajo.';
      if (!form.title.trim()) return 'Escribe un título corto para la solicitud.';
      if (!form.description.trim()) return 'Agrega una descripción breve del problema.';
    }
    if (requestStep === 2) {
      if (!form.address.trim()) return 'Escribe calle y altura.';
      if (locationLat === null || locationLng === null) {
        return addressCandidates.length > 0
          ? 'Confirma la dirección sugerida para ubicar la solicitud.'
          : 'Confirma la dirección para ubicar la solicitud en el mapa.';
      }
    }
    if (requestStep === 3) {
      if ((form.preferredStartTime && !form.preferredEndTime) || (!form.preferredStartTime && form.preferredEndTime)) {
        return 'Completa desde y hasta, o deja la franja vacía.';
      }
      if (form.preferredStartTime && form.preferredEndTime && form.preferredStartTime >= form.preferredEndTime) {
        return 'La hora de inicio debe ser anterior a la hora de fin.';
      }
    }
    return '';
  };

  const handleNextRequestStep = () => {
    const message = getRequestStepMissingMessage();
    if (message) {
      setRequestError(message);
      if (
        requestStep === 2 &&
        form.address.trim() &&
        form.city.trim() &&
        locationLat === null &&
        locationLng === null &&
        addressCandidates.length === 0
      ) {
        void handleValidateAddress();
      }
      return;
    }
    setRequestError('');
    setRequestStep((current) => (current === 3 ? 3 : ((current + 1) as 1 | 2 | 3)));
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
                  onClick={() => clearAuthAccessProfileIntent()}
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
                    <div
                      className={`flex min-h-[48px] items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition focus-within:ring-2 ${clientWhatsappControlToneClass}`}
                    >
                      <span className={clientWhatsappInputStatusClass}>
                        {clientProfileForm.phone.trim() && clientWhatsappValidation.isValid ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </span>
                      <input
                        value={clientProfileForm.phone}
                        onChange={(event) => handleClientPhoneChange(event.target.value)}
                        onBlur={normalizeClientPhoneField}
                        placeholder="WhatsApp de contacto"
                        autoComplete="tel"
                        className="min-h-8 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                      {clientWhatsappValidation.isValid && (
                        <a
                          href={clientWhatsappValidation.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2a0338] ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Probar
                        </a>
                      )}
                    </div>
                    {clientProfileForm.phone.trim() && !clientWhatsappValidation.isValid && (
                      <p className="text-[11px] font-semibold text-amber-700">{clientWhatsappValidation.message}</p>
                    )}
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
                      placeholder="Contraseña"
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      className="min-h-[48px] w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#2a0338] focus:ring-2 focus:ring-[#2a0338]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((current) => !current)}
                      aria-label={showAuthPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
                      {sendingRecovery ? 'Enviando correo...' : '¿Olvidaste tu contraseña?'}
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
                    isDesktopNavExpanded ? 'gap-3 rounded-[18px] px-2.5 py-2' : 'h-10 w-10 justify-center rounded-[14px]'
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
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'h-10 w-10 justify-center rounded-[14px]'
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
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'h-10 w-10 justify-center rounded-[14px]'
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
                    title={!isDesktopNavExpanded ? 'Mensajes' : undefined}
                    onClick={openClientMessages}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'h-10 w-10 justify-center rounded-[14px]'
                    } ${activeClientView === 'messages' ? 'text-white' : 'text-white/[0.72]'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition group-hover:bg-white/[0.09] ${
                      activeClientView === 'messages' ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.055]'
                    }`}>
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && (
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Mensajes</span>
                    )}
                  </button>

                  <button
                    type="button"
                    title={!isDesktopNavExpanded ? 'Técnicos' : undefined}
                    onClick={openClientShowcase}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'h-10 w-10 justify-center rounded-[14px]'
                    } ${activeClientView === 'showcase' ? 'text-white' : 'text-white/[0.72]'}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition group-hover:bg-white/[0.09] ${
                      activeClientView === 'showcase' ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.055]'
                    }`}>
                      <Store className="h-4 w-4" />
                    </span>
                    {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Técnicos</span>}
                  </button>

                  <button
                    type="button"
                    title={!isDesktopNavExpanded ? 'Perfil' : undefined}
                    onClick={() => openClientProfileSection(false)}
                    className={`group relative flex items-center transition hover:bg-white/[0.075] hover:text-white ${
                      isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'h-10 w-10 justify-center rounded-[14px]'
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
                  title={!isDesktopNavExpanded ? 'Cerrar sesión' : undefined}
                  onClick={handleLogout}
                  className={`group relative flex items-center text-white/[0.76] transition hover:bg-white/[0.075] hover:text-white ${
                    isDesktopNavExpanded ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left' : 'h-10 w-10 justify-center rounded-[14px]'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#ff8f1f] text-[#2a0338] transition group-hover:brightness-105">
                    <LogOut className="h-4 w-4" />
                  </span>
                  {isDesktopNavExpanded && <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">Cerrar sesión</span>}
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
                          : 'h-9 w-9 justify-center rounded-[14px]'
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
                          : 'h-9 w-9 justify-center rounded-[14px]'
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
                          : 'h-9 w-9 justify-center rounded-[14px]'
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
            <div
              className={
                activeClientView === 'map' || activeClientView === 'showcase'
                  ? 'w-full space-y-0'
                  : activeClientView === 'messages'
                    ? 'mx-auto w-full max-w-6xl space-y-4'
                    : 'mx-auto w-full max-w-2xl space-y-4'
              }
            >
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
                  : 'Tu registro ya quedó hecho. Ahora agrega WhatsApp para publicar.'}
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
                  Ir a esta sección
                </p>
              </a>
            ))}
          </div>
        </section>

        <section
          id="perfil-cliente"
          className={
            !isClientProfileComplete || activeClientView === 'profile'
              ? `${clientPanelCardClass} overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]`
              : 'hidden'
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Perfil cliente</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Contacto</h2>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isClientProfileComplete
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
              }`}
            >
              {isClientProfileComplete ? 'Completo' : 'WhatsApp pendiente'}
            </span>
          </div>

          {loadingClientProfile ? (
            <p className="mt-5 text-sm text-slate-500">Cargando perfil...</p>
          ) : (
            <>
              <div className="mt-5 grid gap-5 lg:grid-cols-[128px_minmax(0,1fr)] lg:items-start">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[32px] border border-white bg-white text-slate-400 shadow-[0_22px_45px_-28px_rgba(15,23,42,0.9)] ring-1 ring-slate-200">
                    {clientProfileForm.avatarUrl ? (
                      <img src={clientProfileForm.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-11 w-11" />
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    Foto opcional
                  </span>
                </div>

                <div className="min-w-0">
                  <label className="text-xs font-semibold text-slate-600">WhatsApp</label>
                  <div className="mt-1.5">
                    <div
                      className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition focus-within:ring-2 ${clientWhatsappControlToneClass}`}
                    >
                      <span className={clientWhatsappInputStatusClass}>
                        {clientProfileForm.phone.trim() && clientWhatsappValidation.isValid ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </span>
                      <input
                        ref={clientProfilePhoneInputRef}
                        value={clientProfileForm.phone}
                        onChange={(event) => handleClientPhoneChange(event.target.value)}
                        onBlur={normalizeClientPhoneField}
                        placeholder="+54 9 11 1234-5678"
                        autoComplete="tel"
                        className="min-h-8 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                      {clientWhatsappValidation.isValid && (
                        <a
                          href={clientWhatsappValidation.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#2a0338] ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Probar chat
                        </a>
                      )}
                    </div>
                  </div>
                  {clientProfileForm.phone.trim() && !clientWhatsappValidation.isValid && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">{clientWhatsappValidation.message}</p>
                  )}
                  {hasClientWhatsappChanges && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveClientProfile}
                        disabled={savingClientProfile || !clientWhatsappValidation.isValid}
                        className={`${clientPanelPrimaryButtonClass} min-h-11 px-6 disabled:cursor-not-allowed disabled:opacity-55`}
                      >
                        {savingClientProfile ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  )}

                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Avatar</p>
                      <label
                        className={`${clientPanelSecondaryButtonClass} inline-flex cursor-pointer items-center justify-center gap-2 px-3 py-1.5 text-xs ${
                          uploadingClientAvatar ? 'pointer-events-none opacity-60' : ''
                        }`}
                      >
                        {uploadingClientAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        {uploadingClientAvatar ? 'Subiendo...' : 'Subir foto'}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingClientAvatar}
                          onChange={handleClientAvatarUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {CLIENT_AVATAR_PRESETS.map((avatar) => {
                        const selected = clientProfileForm.avatarUrl === avatar.src;
                        return (
                          <button
                            key={avatar.src}
                            type="button"
                            onClick={() => handleClientAvatarPresetSelect(avatar.src)}
                            disabled={savingClientProfile}
                            aria-label={`Usar avatar ${avatar.label}`}
                            title={avatar.label}
                            className={`aspect-square overflow-hidden rounded-2xl border bg-white p-1.5 shadow-sm transition ${
                              selected
                                ? 'border-[#ff8f1f] ring-2 ring-[#ff8f1f]/25'
                                : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md'
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <img src={avatar.src} alt="" className="h-full w-full rounded-xl object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(clientProfileError || clientProfileNotice) && (
                    <div className="mt-3">
                      {clientProfileError && <span className="text-xs text-rose-600">{clientProfileError}</span>}
                      {clientProfileNotice && <span className="text-xs text-emerald-600">{clientProfileNotice}</span>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="grid gap-4">
          <article id="nueva-solicitud-cliente" className={activeClientView === 'request' ? 'grid gap-4' : 'hidden'}>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              {requestSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id <= requestStep) {
                      setRequestError('');
                      setRequestStep(step.id);
                      return;
                    }
                    if (step.id === requestStep + 1) {
                      handleNextRequestStep();
                      return;
                    }
                    setRequestError('Completa el paso actual antes de avanzar.');
                  }}
                  className={`min-h-12 rounded-xl px-2 py-1.5 text-center text-xs transition ${
                    requestStep === step.id
                      ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em]">Paso {step.id}</span>
                  <span className="mt-0.5 block truncate font-semibold">{step.label}</span>
                </button>
              ))}
            </div>

            <div className={clientPanelCardClass}>
            <div className={`grid gap-3 sm:grid-cols-2 ${requestStep === 1 ? '' : 'hidden'}`}>
              <div>
                <label className="text-xs font-semibold text-slate-600">Título</label>
                <input
                  ref={requestTitleInputRef}
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder={requestExamplePlaceholder.title}
                  className={clientPanelInputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Gremio</label>
                <select
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className={`${clientPanelInputClass} font-semibold`}
                >
                  <option value="">Selecciona un gremio</option>
                  {REQUEST_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={requestStep === 2 ? 'relative mt-3' : 'hidden'}>
              <label className="text-xs font-semibold text-slate-600">Dirección</label>
              <input
                value={form.address}
                onChange={(event) => {
                  const nextAddress = event.target.value;
                  clearConfirmedAddress();
                  setForm((prev) => ({ ...prev, address: nextAddress, city: '' }));
                  scheduleAddressLookup(nextAddress, '');
                }}
                onFocus={() => {
                  if (addressCandidates.length > 0 && locationLat === null && locationLng === null) {
                    setAddressDropdownOpen(true);
                  }
                }}
                placeholder="Calle, número y localidad. Ej: Coronel Bogado 2556, Malvinas Argentinas"
                className={clientPanelInputClass}
              />
              {addressDropdownOpen && addressCandidates.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {addressCandidates.map((candidate) => (
                    <button
                      key={getAddressCandidateKey(candidate)}
                      type="button"
                      onClick={() => applyAddressCandidate(candidate)}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left text-sm text-slate-800 transition last:border-b-0 hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{candidate.primaryLabel}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {candidate.secondaryLabel || candidate.displayName}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Usar
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`mt-3 grid gap-4 ${requestStep === 3 ? '' : 'hidden'}`}>
              <div className={requestStep === 3 ? '' : 'hidden'}>
                <label className="text-xs font-semibold text-slate-600">Urgencia</label>
                <div className="mt-3 px-3 pb-1 pt-8">
                  <div
                    className="relative mx-auto h-10 max-w-xl cursor-grab touch-none select-none active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setUrgencyFromSliderPosition(event.clientX, event.currentTarget);
                    }}
                    onPointerMove={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      setUrgencyFromSliderPosition(event.clientX, event.currentTarget);
                    }}
                    onPointerUp={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                    onPointerCancel={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                  >
                    <div className="absolute left-0 right-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-slate-200 shadow-inner" />
                    <div
                      className={`absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-gradient-to-r ${selectedUrgencyMeta.fillClass}`}
                      style={{ width: `${selectedUrgencyLevel}%` }}
                    >
                      <span className="absolute inset-0 rounded-full bg-[length:18px_18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.18)_75%,transparent_75%,transparent)]" />
                    </div>
                    <div
                      className="absolute -top-8 -translate-x-1/2"
                      style={{ left: `${selectedUrgencyLevel}%` }}
                    >
                      <span
                        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-xs font-black shadow-lg ${selectedUrgencyMeta.bubbleClass}`}
                      >
                        {selectedUrgencyLevel}
                        <span className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-current" />
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={selectedUrgencyLevel}
                      onChange={(event) => {
                        setUrgencyLevel(Number(event.target.value));
                      }}
                      aria-label="Nivel de urgencia de 1 a 100"
                      className="absolute inset-x-0 top-1/2 h-10 w-full -translate-y-1/2 cursor-grab opacity-0 active:cursor-grabbing"
                    />
                  </div>
                  <div className="mx-auto mt-1 grid max-w-xl grid-cols-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <span>Baja</span>
                    <span className="text-center">Media</span>
                    <span className="text-right">Alta</span>
                  </div>
                </div>
              </div>
              <div className={requestStep === 3 ? '' : 'hidden'}>
                <label className="text-xs font-semibold text-slate-600">Franja horaria (opcional)</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Desde',
                      field: 'preferredStartTime' as const,
                      value: form.preferredStartTime,
                      parts: preferredStartTimeParts,
                    },
                    {
                      label: 'Hasta',
                      field: 'preferredEndTime' as const,
                      value: form.preferredEndTime,
                      parts: preferredEndTimeParts,
                    },
                  ].map((timeControl) => (
                    <label
                      key={timeControl.field}
                      className="relative block cursor-pointer rounded-xl transition focus-within:ring-2 focus-within:ring-[#ff8f1f]/20"
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {[timeControl.parts.hour, timeControl.parts.minute].map((part, index) => (
                          <React.Fragment key={`${timeControl.field}-${index}`}>
                            {index === 1 && <span className="text-2xl font-black text-slate-700 sm:text-3xl">:</span>}
                            <span className="relative flex h-14 min-w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#111827] px-2.5 text-3xl font-black leading-none text-white shadow-inner sm:h-16 sm:min-w-16 sm:text-4xl">
                              <span className="absolute inset-x-0 top-1/2 h-px bg-white/18" />
                              <span className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.06]" />
                              {part}
                            </span>
                          </React.Fragment>
                        ))}
                      </span>
                      <select
                        aria-label={`${timeControl.label} franja horaria`}
                        value={timeControl.value}
                        onChange={(event) => setPreferredTimeRange(timeControl.field, event.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      >
                        <option value="">{timeControl.label}</option>
                        {REQUEST_TIME_OPTIONS.map((time) => (
                          <option key={`${timeControl.field}-${time}`} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={requestStep === 3 ? 'mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4' : 'hidden'}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Así lo verá el técnico
              </p>
              <article className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-black text-slate-600">
                      {clientProfileForm.avatarUrl ? (
                        <img src={clientProfileForm.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        requestPreviewInitial
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{requestPreviewClientName}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Cliente</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${urgencyClass(form.urgency)}`}>
                    {form.urgency}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-950">{form.title || 'Título pendiente'}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {form.category || 'Rubro pendiente'} · Zona: {requestPreviewZone} · Distancia según técnico
                  </p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-700">
                    {form.description || 'Descripción pendiente para que el técnico entienda el trabajo.'}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                  <span>Ubicación protegida</span>
                  <span>Fecha: {requestPreviewDate}</span>
                  {requestPreviewWindow && <span>Preferencia: {requestPreviewWindow}</span>}
                </div>
              </article>
            </div>

            <div className={requestStep === 2 ? 'mt-3 space-y-3' : 'hidden'}>
              {validatingAddress && <p className="text-xs text-slate-500">Buscando ubicaciones...</p>}
              {!validatingAddress && addressValidationError && (
                <p className="text-xs font-medium text-rose-600">{addressValidationError}</p>
              )}
              {currentRequestMapLinks && locationLat !== null && locationLng !== null && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#16031f] shadow-sm">
                  {currentRequestMapEmbedUrl && (
                    <div className="relative h-40 overflow-hidden bg-slate-900 sm:h-44">
                      <iframe
                        title="Mapa de la solicitud"
                        src={currentRequestMapEmbedUrl}
                        className="h-full w-full border-0"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(22,3,31,0.22),rgba(22,3,31,0.05)_42%,rgba(22,3,31,0.72))]" />
                      <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm">
                        <MapPin className="h-3.5 w-3.5 text-[#ff8f1f]" />
                        Mapa operativo
                      </div>
                      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
                        <div className="min-w-0 rounded-2xl bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-sm">
                          <p className="truncate font-semibold text-slate-950">Punto confirmado</p>
                          <p className="mt-0.5 truncate">
                            {confirmedAddressLabel || [form.address, form.city].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <a
                          href={currentRequestMapLinks.googleMapsHref}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="pointer-events-auto shrink-0 rounded-full bg-[#ff8f1f] px-3 py-2 text-[11px] font-semibold text-[#2a0338] shadow-sm transition hover:bg-[#ffa748]"
                        >
                          Abrir
                        </a>
                      </div>
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
                  {validatingAddress ? 'Validando...' : 'Validar dirección'}
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
                    Punto confirmado: {locationSource === 'gps' ? 'GPS del dispositivo' : 'Dirección validada'}
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
              {requestGeoNotice && <p className="mt-1 text-[11px] text-slate-600">{requestGeoNotice}</p>}
            </div>

            <div className={requestStep === 1 ? 'mt-3' : 'hidden'}>
              <label className="text-xs font-semibold text-slate-600">Descripción</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={requestExamplePlaceholder.description}
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
                      Elige un técnico de la zona para enviar la solicitud directa.
                    </p>
                  )}

                  {nearbyWarning && <p className="text-[11px] text-amber-700">{nearbyWarning}</p>}
                  {nearbyError && <p className="text-[11px] text-rose-600">{nearbyError}</p>}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setRequestStep((current) => (current === 1 ? 1 : ((current - 1) as 1 | 2 | 3)))}
                disabled={requestStep === 1 || savingRequest}
                className={clientPanelSecondaryButtonClass + ' disabled:cursor-not-allowed disabled:opacity-50'}
              >
                Anterior
              </button>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveRequestDraft}
                  disabled={savingRequest || !hasRequestDraftContent}
                  className={clientPanelSecondaryButtonClass + ' disabled:cursor-not-allowed disabled:opacity-50'}
                >
                  Guardar borrador
                </button>
                {requestStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextRequestStep}
                  disabled={savingRequest || validatingAddress}
                  className={clientPanelPrimaryButtonClass + ' min-w-28'}
                >
                  {validatingAddress ? 'Validando...' : 'Siguiente'}
                </button>
                ) : null}
              </div>
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
                  : 'Agrega WhatsApp para publicar'}
            </button>

            {requestError && <p className="mt-3 text-xs text-rose-600">{requestError}</p>}
            {requestNotice && <p className="mt-3 text-xs text-emerald-600">{requestNotice}</p>}
            </div>
          </article>

          <article id="mapa-solicitudes-cliente" className={activeClientView === 'map' ? 'relative min-h-[calc(100dvh-57px)] overflow-hidden bg-slate-950' : 'hidden'}>
            <div className="relative h-[calc(100dvh-57px)] min-h-[680px]">
              <div className="absolute inset-0 overflow-hidden bg-slate-900">
                {clientOperationalMapPoints.length > 0 || clientMapFallbackCenter ? (
                  <TechnicianOperationalMap
                    points={clientOperationalMapPoints}
                    selectedPointId={!clientMapShowAll ? selectedMapRequest?.id || '' : ''}
                    fallbackCenter={clientMapFallbackCenter}
                    onSelectPoint={(pointId) => {
                      setSelectedClientRequestId(pointId);
                      setClientMapShowAll(false);
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
                    Todavia no hay solicitudes con punto confirmado. Valida una direccion al cargar tu proxima solicitud.
                  </div>
                )}
              </div>

              <div className="absolute left-3 right-3 top-3 z-30 rounded-[20px] border border-white/80 bg-white/92 px-3 py-2 shadow-[0_22px_58px_-42px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:left-5 sm:right-5 sm:top-5 sm:px-4 xl:left-6 xl:right-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="mr-auto min-w-[11rem]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mapa cliente</p>
                    <p className="text-sm font-bold text-slate-900">{clientMapPoints.length} solicitudes en mapa</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      Total {requests.length}
                    </span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600">
                      Respuestas {clientVisibleResponseTotal}
                    </span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600">
                      Sin punto {clientRequestsWithoutMapCount}
                    </span>
                  </div>
                  {!clientMapShowAll && (
                    <button
                      type="button"
                      onClick={() => setClientMapShowAll(true)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      Ver todas
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshWorkspace}
                    disabled={loadingRequests}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingRequests ? 'Actualizando...' : 'Actualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={openRequestSection}
                    className="rounded-full bg-[#ff8f1f] px-3 py-1.5 text-xs font-semibold text-[#2a0338] transition hover:bg-[#ffa748]"
                  >
                    Nueva solicitud
                  </button>
                </div>
                {requestsLoadError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{requestsLoadError}</p>}
              </div>

              <div className="absolute bottom-4 left-3 right-3 z-40 max-h-[58dvh] overflow-y-auto rounded-[24px] border border-white/80 bg-white/92 p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.78)] backdrop-blur-xl sm:left-5 sm:right-5 xl:bottom-5 xl:left-6 xl:right-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Solicitud</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedMapRequest && selectedMapRequestIndex >= 0
                        ? `${selectedMapRequestIndex + 1} de ${requestsWithMap.length}`
                        : 'Sin solicitudes'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Solicitud anterior"
                      onClick={() => showClientMapRequestAt(selectedMapRequestIndex - 1)}
                      disabled={requestsWithMap.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Solicitud siguiente"
                      onClick={() => showClientMapRequestAt(selectedMapRequestIndex + 1)}
                      disabled={requestsWithMap.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedMapRequest ? (
                  <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientRequestId(selectedMapRequest.id);
                        setClientMapShowAll(false);
                      }}
                      className="w-full min-w-0 text-left"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tu solicitud</p>
                          <h3 className="mt-1 text-base font-bold leading-5 text-slate-900">{selectedMapRequest.title}</h3>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${urgencyClass(selectedMapRequest.urgency)}`}>
                            {selectedMapRequest.urgency}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeByStatus(selectedMapRequest.status)}`}>
                            {selectedMapRequest.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {selectedMapRequest.category} · {selectedMapRequest.city || 'Zona sin ciudad'}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                        {selectedMapRequest.description || 'Sin descripcion cargada.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                        <span>Direccion cargada</span>
                        <span>Fecha: {new Date(selectedMapRequest.created_at).toLocaleDateString('es-AR')}</span>
                        <span>
                          {visibleResponseCount(selectedMapRequest.responses)}{' '}
                          {visibleResponseCount(selectedMapRequest.responses) === 1 ? 'respuesta' : 'respuestas'}
                        </span>
                      </div>
                    </button>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Postulaciones</p>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {selectedMapResponses.length > 0
                              ? `${selectedMapResponses.length} respuesta(s) para revisar`
                              : 'Todavia sin respuestas visibles'}
                          </p>
                        </div>
                        {selectedGoogleMapsHref && (
                          <a
                            href={selectedGoogleMapsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                          >
                            Abrir mapa
                          </a>
                        )}
                      </div>

                      {selectedMapResponses.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {selectedMapResponses.slice(0, 2).map((responseItem) => {
                            const statusMeta = responseStatusMeta(responseItem.quoteStatus, responseItem.responseType);
                            return (
                              <div key={responseItem.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="min-w-0 truncate font-semibold text-slate-950">
                                    {responseItem.businessName || responseItem.technicianName}
                                  </p>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}>
                                    {statusMeta.label}
                                  </span>
                                </div>
                                <p className="mt-1 truncate">{responseItem.specialty}</p>
                                {responseItem.responseMessage && (
                                  <p className="mt-1 line-clamp-2 leading-5">{responseItem.responseMessage}</p>
                                )}
                              </div>
                            );
                          })}
                          {selectedMapResponses.length > 2 && (
                            <p className="px-1 text-[11px] font-semibold text-slate-500">
                              +{selectedMapResponses.length - 2} respuesta(s) mas en seguimiento.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                          Cuando un tecnico se postule, lo vas a ver aca para elegir o rechazar.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                    Todavia no hay solicitudes geolocalizadas para mostrar en el mapa.
                  </div>
                )}
              </div>
            </div>

            <div className="hidden">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Mapa cliente</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Solicitudes de presupuesto</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Visualiza las direcciones cargadas y las respuestas de técnicos asociadas a cada solicitud.
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
              {requestsLoadError && <p className="mt-3 text-xs text-rose-600">{requestsLoadError}</p>}

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
                            {item.address || 'Sin dirección'}
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
                  {false && clientMapView.url ? (
                    <iframe
                      title="Mapa de solicitudes UrbanFix"
                      src={clientMapView.url}
                      className="h-[360px] w-full border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-slate-500">
                      No hay puntos geolocalizados todavía. Valida una dirección al cargar tu próxima solicitud.
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
                <h3 className="mt-1 text-base font-semibold text-slate-950">Seguimiento por dirección</h3>
              </div>

            {loadingRequests && requests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Cargando solicitudes...</p>
            ) : requests.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Todavia no publicaste solicitudes.
              </div>
            ) : requestsWithMap.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Tus solicitudes todavía no tienen punto confirmado. Valida una dirección al cargar la próxima solicitud.
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
                              : 'Todavía no hay técnicos postulados.'}
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
                                    {clientResponseActionId === `${actionBaseId}:select` ? 'Guardando...' : isAccepted ? 'Elegida' : 'Elegir técnico'}
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

          <article
            id="mensajes-solicitudes-cliente"
            className={activeClientView === 'messages' ? 'space-y-5' : 'hidden'}
          >
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_80px_-56px_rgba(15,23,42,0.62)]">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Centro de propuestas</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">Mensajes por solicitud</h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    Bandeja para comparar técnicos, revisar mensajes y elegir con claridad.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshWorkspace}
                    disabled={loadingRequests}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingRequests ? 'Actualizando...' : 'Actualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={openRequestSection}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)] transition hover:bg-slate-800"
                  >
                    Nueva solicitud
                  </button>
                </div>
              </div>
              <div className="grid gap-2 bg-slate-50/80 p-3 sm:grid-cols-3 sm:p-4">
                <div className="rounded-[22px] border border-white bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total propuestas</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{clientVisibleResponseTotal}</p>
                </div>
                <div className="rounded-[22px] border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-500">Sin revisar</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">{clientSubmittedResponseTotal}</p>
                </div>
                <div className="rounded-[22px] border border-orange-100 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">Elegidas</p>
                  <p className="mt-1 text-2xl font-semibold text-orange-700">{clientAcceptedResponseTotal}</p>
                </div>
              </div>
              {requestsLoadError && <p className="mt-3 text-xs text-rose-600">{requestsLoadError}</p>}
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.39fr_0.61fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.6)] sm:p-3">
                <div className="flex items-center justify-between gap-3 px-2 py-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Solicitudes</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">Tus trabajos</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {requests.length}
                  </span>
                </div>

                <div className="mt-2 max-h-[68dvh] space-y-2 overflow-y-auto pr-1">
                  {loadingRequests && requests.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Cargando solicitudes...
                    </div>
                  ) : clientMessageRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      Todavía no publicaste solicitudes.
                    </div>
                  ) : (
                    clientMessageRequests.map((item) => {
                      const responseCount = visibleResponseCount(item.responses);
                      const pendingCount = item.responses.filter(
                        (responseItem) => String(responseItem.quoteStatus || '').toLowerCase() === 'submitted'
                      ).length;
                      const acceptedCount = item.responses.filter(
                        (responseItem) => String(responseItem.quoteStatus || '').toLowerCase() === 'accepted'
                      ).length;
                      const isSelected = selectedMessageRequest?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedClientMessageRequestId(item.id)}
                          className={`relative w-full overflow-hidden rounded-[22px] border p-3 text-left transition ${
                            isSelected
                              ? 'border-slate-950 bg-slate-950 text-white shadow-[0_22px_42px_-28px_rgba(15,23,42,0.9)]'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected && <span className="absolute bottom-0 left-0 top-0 w-1 bg-[#ff8f1f]" />}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-950'}`}>{item.title}</p>
                              <p className={`mt-1 text-xs ${isSelected ? 'text-white/66' : 'text-slate-600'}`}>
                                {item.category} · {item.city || 'Sin ciudad'}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                              isSelected ? 'bg-white/10 text-white' : badgeByStatus(item.status)
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <p className={`mt-2 line-clamp-2 text-xs leading-5 ${isSelected ? 'text-white/64' : 'text-slate-500'}`}>
                            {item.description || item.address || 'Solicitud sin detalle cargado.'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {responseCount} {responseCount === 1 ? 'propuesta' : 'propuestas'}
                            </span>
                            {pendingCount > 0 && (
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                isSelected ? 'bg-emerald-400/18 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {pendingCount} nuevas
                              </span>
                            )}
                            {acceptedCount > 0 && (
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                isSelected ? 'bg-orange-400/18 text-orange-100' : 'bg-orange-50 text-orange-700'
                              }`}>
                                Técnico elegido
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.6)] sm:p-3">
                {selectedMessageRequest ? (
                  <>
                    <div className="rounded-[26px] bg-slate-950 p-4 text-white shadow-[0_24px_58px_-38px_rgba(15,23,42,0.95)] sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">Solicitud activa</p>
                        <h3 className="mt-1 text-xl font-semibold text-white">{selectedMessageRequest.title}</h3>
                        <p className="mt-1 text-sm text-white/68">
                          {selectedMessageRequest.category} · {selectedMessageRequest.city || 'Zona sin ciudad'}
                        </p>
                        <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-white/62">
                          {selectedMessageRequest.description || 'Sin descripción cargada.'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          {selectedMessageRequest.urgency}
                        </span>
                        <span className="rounded-full bg-[#ff8f1f] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1b0a24]">
                          {selectedMessageRequest.status}
                        </span>
                      </div>
                    </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Propuestas recibidas</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedMessageResponses.length > 0
                            ? `${selectedMessageResponses.length} para revisar · ${selectedMessageSubmittedCount} nuevas`
                            : 'Todavía no hay técnicos postulados para este trabajo.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMessageRequest.locationLat !== null && selectedMessageRequest.locationLng !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientRequestId(selectedMessageRequest.id);
                              setClientMapShowAll(false);
                              setActiveClientView('map');
                              document.getElementById('mapa-solicitudes-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={clientPanelSecondaryButtonClass}
                          >
                            Ver en mapa
                          </button>
                        )}
                      </div>
                    </div>

                    {clientResponseActionError && <p className="mt-3 text-xs text-rose-600">{clientResponseActionError}</p>}
                    {clientResponseActionNotice && <p className="mt-3 text-xs text-emerald-600">{clientResponseActionNotice}</p>}

                    {selectedMessageResponses.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                        Cuando un técnico se postule o mande una cotización, aparecerá acá con su mensaje, disponibilidad y contacto.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {selectedMessageResponses.map((responseItem) => {
                          const statusMeta = responseStatusMeta(responseItem.quoteStatus, responseItem.responseType);
                          const actionBaseId = `${selectedMessageRequest.id}:${responseItem.id}`;
                          const isRejected = String(responseItem.quoteStatus).toLowerCase() === 'rejected';
                          const isAccepted = String(responseItem.quoteStatus).toLowerCase() === 'accepted';
                          const isDirectQuote = responseItem.responseType === 'direct_quote';
                          const phoneDigits = responseItem.phone.replace(/\D/g, '');
                          const initials =
                            (responseItem.businessName || responseItem.technicianName)
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part.slice(0, 1).toUpperCase())
                              .join('') || 'UF';
                          return (
                            <div key={responseItem.id} className="rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.72)]">
                              <div className="rounded-[22px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3">
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                  <div className="flex min-w-0 gap-3">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-bold text-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.9)] ring-4 ring-white">
                                      {initials}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-base font-semibold text-slate-950">
                                          {responseItem.businessName || responseItem.technicianName}
                                        </p>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusMeta.className}`}>
                                          {statusMeta.label}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-slate-600">
                                        {responseItem.specialty}
                                        {responseItem.city ? ` · ${responseItem.city}` : ''}
                                        {responseItem.rating !== null ? ` · ${responseItem.rating.toFixed(1)} / 5` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm sm:min-w-[12rem] sm:text-right">
                                    <p className="text-base font-semibold text-slate-950">
                                      {isDirectQuote ? formatArs(responseItem.priceArs) : 'Postulación'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {isDirectQuote
                                        ? `ETA ${Math.round(Number(responseItem.etaHours || 0)) || '-'} h`
                                        : `Puede coordinar en ${Math.round(Number(responseItem.visitEtaHours || 0)) || '-'} h`}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-slate-400" />
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mensaje</p>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-slate-700">
                                    {responseItem.responseMessage || 'El técnico todavía no dejó un mensaje.'}
                                  </p>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {phoneDigits && (
                                    <a
                                      href={`https://wa.me/${phoneDigits}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                                    >
                                      WhatsApp
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleClientResponseAction(selectedMessageRequest, responseItem, 'select')}
                                    disabled={isRejected || isAccepted || clientResponseActionId.startsWith(actionBaseId)}
                                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_36px_-24px_rgba(15,23,42,0.9)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {clientResponseActionId === `${actionBaseId}:select` ? 'Guardando...' : isAccepted ? 'Elegida' : 'Elegir técnico'}
                                  </button>
                                  {!isRejected && !isAccepted && (
                                    <button
                                      type="button"
                                      onClick={() => handleClientResponseAction(selectedMessageRequest, responseItem, 'reject')}
                                      disabled={clientResponseActionId.startsWith(actionBaseId)}
                                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {clientResponseActionId === `${actionBaseId}:reject` ? 'Rechazando...' : 'Rechazar'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    Todavía no hay solicitudes para administrar.
                  </div>
                )}
              </div>
            </div>
          </article>

          <article id="vidriera-cliente" className={activeClientView === 'showcase' ? 'relative min-h-[calc(100dvh-57px)] overflow-hidden bg-slate-950' : 'hidden'}>
            <div className="absolute left-3 right-3 top-3 z-30 rounded-[20px] border border-white/80 bg-white/92 px-3 py-2 shadow-[0_22px_58px_-42px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:left-5 sm:right-5 sm:top-5 sm:px-4 xl:left-6 xl:right-6">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="mr-auto min-w-[10rem]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mapa cliente</p>
                  <p className="text-sm font-bold text-slate-900">{nearbyTechnicians.length} técnicos visibles</p>
                </div>
                <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Técnicos {nearbyTechnicians.length}
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600">
                    Radio {form.radiusKm} km
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => loadNearbyTechnicians(form.radiusKm)}
                  disabled={nearbyLoading}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {nearbyLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveClientView('request');
                    setRequestStep(1);
                    window.setTimeout(() => {
                      document.getElementById('nueva-solicitud-cliente')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      requestTitleInputRef.current?.focus();
                    }, 120);
                  }}
                  className="rounded-full bg-[#ff8f1f] px-3 py-1.5 text-xs font-semibold text-[#1b0a24] transition hover:bg-[#ff9d35]"
                >
                  Nueva solicitud
                </button>
              </div>
              {nearbyCenterLabel && (
                <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-slate-500">Referencia: {nearbyCenterLabel}</p>
              )}
              {nearbyWarning && <p className="mt-2 text-[11px] font-semibold text-amber-700">{nearbyWarning}</p>}
              {nearbyError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{nearbyError}</p>}
            </div>

            <div className="relative h-[calc(100dvh-57px)] min-h-[680px]">
              <div className="absolute inset-0 overflow-hidden bg-slate-900">
                {nearbyTechnicianMapPoints.length > 0 || nearbyTechnicianMapCenter ? (
                  <TechnicianOperationalMap
                    points={nearbyTechnicianMapPoints}
                    selectedPointId={selectedShowcaseTechnician?.id || ''}
                    fallbackCenter={nearbyTechnicianMapCenter}
                    onSelectPoint={setSelectedNearbyTechnicianId}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
                    Publica una solicitud con ubicación confirmada para ver técnicos cercanos en el mapa.
                  </div>
                )}
              </div>

              {nearbyLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 text-sm font-semibold text-white backdrop-blur-[2px]">
                  Buscando técnicos...
                </div>
              )}

              <div className="absolute bottom-4 left-3 right-3 z-40 max-h-[54dvh] overflow-y-auto rounded-[24px] border border-white/80 bg-white/92 p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.78)] backdrop-blur-xl sm:left-5 sm:right-5 xl:bottom-5 xl:left-6 xl:right-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Técnico</p>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedShowcaseTechnician ? `${activeNearbyTechnicianIndex + 1} de ${nearbyTechnicians.length}` : 'Sin técnicos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Técnico anterior"
                      onClick={() => showNearbyTechnicianAt(activeNearbyTechnicianIndex - 1)}
                      disabled={nearbyTechnicians.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Técnico siguiente"
                      onClick={() => showNearbyTechnicianAt(activeNearbyTechnicianIndex + 1)}
                      disabled={nearbyTechnicians.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedShowcaseTechnician ? (
                  (() => {
                    const tech = selectedShowcaseTechnician;
                    const phoneDigits = tech.phone.replace(/\D/g, '');
                    const initials = tech.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part.slice(0, 1).toUpperCase())
                      .join('') || 'UF';

                    return (
                      <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 transition xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                        <div className="min-w-0">
                          <div className="mb-3 flex items-center gap-2.5">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-xs font-bold text-white ring-2 ring-white shadow-sm">
                              {initials}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-slate-900">{tech.name}</span>
                              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Técnico UrbanFix
                              </span>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 text-base font-bold leading-5 text-slate-900">{tech.specialty}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                tech.availableNow ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {tech.availableNow ? 'Disponible' : 'Consultar'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            {tech.city || 'Zona sin ciudad'}{tech.zoneLabel ? ` · ${tech.zoneLabel}` : ''} · {tech.distanceKm.toFixed(1)} km aprox.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                            <span>Ubicación de trabajo aproximada</span>
                            {tech.rating !== null && <span>Valoración: {tech.rating.toFixed(1)} / 5</span>}
                            {tech.workingHoursLabel && <span>{tech.workingHoursLabel}</span>}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Acciones
                          </p>
                          <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold leading-5 text-slate-700">
                            Podés enviar una solicitud directa a este técnico o abrir WhatsApp si tiene contacto cargado.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
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
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                            >
                              Pedir presupuesto
                            </button>
                            {phoneDigits && (
                              <a
                                href={`https://wa.me/${phoneDigits}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                    No hay técnicos cercanos para mostrar. Probá publicar una solicitud con dirección validada o actualizar el mapa.
                  </div>
                )}
              </div>
            </div>
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
              ) : requestsLoadError ? (
                <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                  {requestsLoadError}
                </div>
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
