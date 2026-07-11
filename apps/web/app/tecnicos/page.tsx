'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FilePlus,
  FileText,
  Home,
  ImagePlus,
  Info,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Store,
  Tag,
  User,
  UserCog,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase, supabaseConfigError } from '../../lib/supabase/supabase';
import AuthHashHandler from '../../components/AuthHashHandler';
import GoogleMark from '../../components/GoogleMark';
import PublicTopNav from '../../components/PublicTopNav';
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  WhatsAppBrandIcon,
} from '../../components/profile/SocialContactIcons';
import ProfileLikeButton from '../../components/profile/ProfileLikeButton';
import ProfileReviewComments from '../../components/profile/ProfileReviewComments';
import ProfileShareActions from '../../components/profile/ProfileShareActions';
import ProfileVisitCounter from '../../components/profile/ProfileVisitCounter';
import TechnicianOperationalMap from '../../components/TechnicianOperationalMap';
import UrbanFixBrandLoader from '../../components/UrbanFixBrandLoader';
import {
  clearAuthAccessProfileIntent,
  getAuthUserProfileFromMetadata,
  getAuthAccessProfileIntent,
  POST_AUTH_REDIRECT_KEY,
  PRICE_ACCESS_INTENT,
  sanitizeNextPath,
  setAuthAccessProfileIntent,
  syncAuthAccessTokenCookie,
} from '../../lib/auth/post-auth';
import { getPasswordPolicyError, PASSWORD_POLICY_MESSAGE } from '../../lib/auth/password-policy';
import {
  buildMasterItemChoiceLabel,
  canonicalizeMasterItemUnit,
  compactTechnicalNotesText,
  normalizeTechnicalNotesText,
} from '../../lib/master-items';
import {
  COUNTRY_NAMES,
  DEFAULT_COUNTRY_NAME,
  extractProvinceHintForCountry,
  getCountryConfig,
  getProvinceLabel,
  getProvinceOptions,
  inferCountryFromCandidates,
  isKnownProvinceName,
} from '../../lib/location-catalog';
import { buildTechnicianPath } from '../../lib/seo/technician-profile';
import LocalitySelect from '../../components/LocalitySelect';
import TechnicianLocationPicker, { type LocationPickerResult } from '../../components/TechnicianLocationPicker';
import TechnicianClientHistoryMap from '../../components/TechnicianClientHistoryMap';
import {
  getLaborPriceUpdatePercentLabel,
  getUpdatedLaborPrice,
  laborPriceIndex,
} from '../../lib/labor-price-index';
import { parseTechnicianLocation } from '../../lib/technician-location';
import { rubroCatalog } from '../../lib/seo/rubro-catalog';
import type {
  AccessProfile,
  AttachmentRow,
  GeoResult,
  ItemForm,
  ItemImageForm,
  MasterItemRow,
  NavItem,
  NotificationRow,
  QuoteItemSyncSource,
  QuoteRow,
  QuoteItemRow,
} from './types';

const TAX_RATE = 0.21;
const SUPPORT_BUCKET = 'beta-support';
const SUPPORT_MAX_IMAGES = 4;
const SUPPORT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const QUOTE_ITEM_MAX_IMAGES = 6;
const QUOTE_ITEM_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const DEFAULT_PUBLIC_WEB_URL = 'https://www.urbanfix.com.ar';
const UI_THEME = 'light';
const LEGACY_UI_THEME_STORAGE_KEY = 'urbanfix_ui_theme';
const ACCESS_VIDEO_URL = (process.env.NEXT_PUBLIC_ACCESS_VIDEO_URL || '/videos/video-inicio-app.mp4').trim();
const POST_LOGIN_VIDEO_URL = (process.env.NEXT_PUBLIC_POST_LOGIN_VIDEO_URL || '/videos/video-inicio-app.mp4').trim();
const ACCESS_VIDEO_POSTER_URL = (process.env.NEXT_PUBLIC_ACCESS_VIDEO_POSTER_URL || '/playstore/feature-graphic.png').trim();
const DASHBOARD_VIDEO_URL = (process.env.NEXT_PUBLIC_DASHBOARD_VIDEO_URL || POST_LOGIN_VIDEO_URL || ACCESS_VIDEO_URL).trim();
const ACCESS_ANDROID_URL = 'https://play.google.com/apps/testing/com.urbanfix.app';
const POST_LOGIN_VIDEO_MAX_MS = 10000;
const COVERAGE_RADIUS_KM = 20;
const POST_LOGIN_VIDEO_SEEN_STORAGE_KEY = 'urbanfix_post_login_video_seen';
const POST_LOGIN_VIDEO_ENABLED = false;

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

type QuoteWorkEstimatorMode = 'manual' | 'revoques' | 'mamposteria' | 'pisos' | 'pintura';
type QuoteLaborLoadMode = 'calculator' | 'catalog';
type RevoqueWorkTypeKey = 'grueso' | 'fino' | 'grueso-fino' | 'exterior';
type MamposteriaWorkTypeKey = 'ladrillo-hueco-8' | 'ladrillo-hueco-12' | 'ladrillo-hueco-18' | 'ladrillo-comun' | 'bloque-cemento';
type PisoWorkTypeKey = 'ceramico' | 'porcelanato' | 'revestimiento';
type PinturaWorkTypeKey = 'interior' | 'exterior' | 'cielorraso';

type RevoqueEstimatorForm = {
  workType: RevoqueWorkTypeKey;
  surfaceM2: string;
  linearMeters: string;
  heightMeters: string;
  openingsM2: string;
  laborPrice: string;
  materialPrice: string;
  materialWastePercent: string;
  cementBagPrice: string;
  limeBagPrice: string;
  sandM3Price: string;
  waterproofLiterPrice: string;
};

type MamposteriaEstimatorForm = {
  workType: MamposteriaWorkTypeKey;
  surfaceM2: string;
  linearMeters: string;
  heightMeters: string;
  openingsM2: string;
  laborPrice: string;
  materialPrice: string;
  materialWastePercent: string;
  brickUnitPrice: string;
  cementBagPrice: string;
  limeBagPrice: string;
  sandM3Price: string;
};

type PisoEstimatorForm = {
  workType: PisoWorkTypeKey;
  surfaceM2: string;
  laborPrice: string;
  materialPrice: string;
  materialWastePercent: string;
  tileM2Price: string;
  adhesiveBagPrice: string;
  groutKgPrice: string;
};

type PinturaEstimatorForm = {
  workType: PinturaWorkTypeKey;
  surfaceM2: string;
  coats: string;
  laborPrice: string;
  materialPrice: string;
  materialWastePercent: string;
  paintLiterPrice: string;
  primerLiterPrice: string;
  puttyKgPrice: string;
  includePrimer: boolean;
  includePutty: boolean;
};

const REVOQUE_TEMPLATE_SOURCE = 'template:revoques';
const MAMPOSTERIA_TEMPLATE_SOURCE = 'template:mamposteria';
const PISO_TEMPLATE_SOURCE = 'template:pisos';
const PINTURA_TEMPLATE_SOURCE = 'template:pintura';

type RevoqueMaterialPriceField =
  | 'cementBagPrice'
  | 'limeBagPrice'
  | 'sandM3Price'
  | 'waterproofLiterPrice';

type MamposteriaMaterialPriceField =
  | 'brickUnitPrice'
  | 'cementBagPrice'
  | 'limeBagPrice'
  | 'sandM3Price';

type PisoMaterialPriceField =
  | 'tileM2Price'
  | 'adhesiveBagPrice'
  | 'groutKgPrice';

type PinturaMaterialPriceField =
  | 'paintLiterPrice'
  | 'primerLiterPrice'
  | 'puttyKgPrice';

type MaterialCoefficient<TPriceField extends string> = {
  key: string;
  label: string;
  unit: string;
  perM2: number;
  priceField: TPriceField;
};

type EstimatorCatalogCheckField = {
  label: string;
  kind: 'labor' | 'material';
  item: MasterItemRow | null | undefined;
  value: string;
};

type EstimatorCatalogCheck = {
  status: 'loading' | 'ready' | 'partial' | 'manual' | 'missing';
  label: string;
  detail: string;
  sourceLabel: string;
  updatedAtLabel: string;
  manualCount: number;
  missingCount: number;
  totalCount: number;
};

type LaborTemplateLookup = {
  categories: string[];
  termGroups: string[][];
  preferredUnit: string;
};

type MaterialTemplateLookup = LaborTemplateLookup;

const QUOTE_ESTIMATOR_OPTIONS: Array<{ key: QuoteWorkEstimatorMode; label: string }> = [
  { key: 'revoques', label: 'Cómputo: Revoques' },
  { key: 'mamposteria', label: 'Cómputo: Mampostería' },
  { key: 'pisos', label: 'Cómputo: Pisos' },
  { key: 'pintura', label: 'Cómputo: Pintura' },
];

const DEFAULT_QUOTE_ESTIMATOR_MODE: QuoteWorkEstimatorMode = QUOTE_ESTIMATOR_OPTIONS[0]?.key || 'manual';

const REVOQUE_MATERIAL_PRICE_FIELDS: RevoqueMaterialPriceField[] = [
  'cementBagPrice',
  'limeBagPrice',
  'sandM3Price',
  'waterproofLiterPrice',
];

const MAMPOSTERIA_MATERIAL_PRICE_FIELDS: MamposteriaMaterialPriceField[] = [
  'brickUnitPrice',
  'cementBagPrice',
  'limeBagPrice',
  'sandM3Price',
];

const PISO_MATERIAL_PRICE_FIELDS: PisoMaterialPriceField[] = [
  'tileM2Price',
  'adhesiveBagPrice',
  'groutKgPrice',
];

const PINTURA_MATERIAL_PRICE_FIELDS: PinturaMaterialPriceField[] = [
  'paintLiterPrice',
  'primerLiterPrice',
  'puttyKgPrice',
];

const SHARED_MATERIAL_LOOKUPS: Record<
  'cementBagPrice' | 'limeBagPrice' | 'sandM3Price',
  MaterialTemplateLookup
> = {
  cementBagPrice: {
    categories: ['Materiales', 'Construccion', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['cemento', '50'],
      ['cemento', 'portland'],
      ['cemento'],
    ],
    preferredUnit: 'bolsa',
  },
  limeBagPrice: {
    categories: ['Materiales', 'Construccion', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['cal', 'hidratada'],
      ['cal', 'aerea'],
      ['cal'],
    ],
    preferredUnit: 'bolsa',
  },
  sandM3Price: {
    categories: ['Materiales', 'Construccion', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['arena', 'm3'],
      ['arena', 'gruesa'],
      ['arena'],
    ],
    preferredUnit: 'm3',
  },
};

const REVOQUE_MATERIAL_PRICE_LOOKUPS: Record<RevoqueMaterialPriceField, MaterialTemplateLookup> = {
  ...SHARED_MATERIAL_LOOKUPS,
  waterproofLiterPrice: {
    categories: ['Materiales', 'Construccion', 'Revoques', 'Impermeabilizacion'],
    termGroups: [
      ['hidrofugo'],
      ['impermeabilizante'],
    ],
    preferredUnit: 'litro',
  },
};

const MAMPOSTERIA_BRICK_PRICE_LOOKUPS: Record<MamposteriaWorkTypeKey, MaterialTemplateLookup> = {
  'ladrillo-hueco-8': {
    categories: ['Materiales', 'Mamposteria', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'ceramico', 'hueco', '8'],
      ['ladrillo', 'hueco', '8'],
      ['hueco', '8'],
      ['ladrillo', 'hueco'],
    ],
    preferredUnit: 'unidad',
  },
  'ladrillo-hueco-12': {
    categories: ['Materiales', 'Mamposteria', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'ceramico', 'hueco', '12'],
      ['ladrillo', 'hueco', '12'],
      ['hueco', '12'],
      ['ladrillo', 'hueco'],
    ],
    preferredUnit: 'unidad',
  },
  'ladrillo-hueco-18': {
    categories: ['Materiales', 'Mamposteria', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'ceramico', 'hueco', '18'],
      ['ladrillo', 'hueco', '18'],
      ['hueco', '18'],
      ['ladrillo', 'hueco'],
    ],
    preferredUnit: 'unidad',
  },
  'ladrillo-comun': {
    categories: ['Materiales', 'Mamposteria', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'comun'],
      ['ladrillo'],
    ],
    preferredUnit: 'unidad',
  },
  'bloque-cemento': {
    categories: ['Materiales', 'Mamposteria', 'Albanileria', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['bloque', 'cemento'],
      ['bloque'],
    ],
    preferredUnit: 'unidad',
  },
};

const REVOQUE_WORK_TYPES: Array<{
  key: RevoqueWorkTypeKey;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  {
    key: 'grueso-fino',
    label: 'Revoque grueso y fino',
    shortLabel: 'Grueso + fino',
    detail: 'Para terminar pared lista para pintura.',
  },
  {
    key: 'grueso',
    label: 'Revoque grueso',
    shortLabel: 'Grueso',
    detail: 'Base, carga y nivelacion.',
  },
  {
    key: 'fino',
    label: 'Revoque fino',
    shortLabel: 'Fino',
    detail: 'Terminacion sobre base existente.',
  },
  {
    key: 'exterior',
    label: 'Revoque exterior',
    shortLabel: 'Exterior',
    detail: 'Trabajo exterior con mayor preparacion.',
  },
];

const REVOQUE_MATERIAL_COEFFICIENTS: Record<
  RevoqueWorkTypeKey,
  Array<MaterialCoefficient<RevoqueMaterialPriceField>>
> = {
  grueso: [
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.09, priceField: 'cementBagPrice' },
    { key: 'lime', label: 'Cal', unit: 'bolsa', perM2: 0.13, priceField: 'limeBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.035, priceField: 'sandM3Price' },
  ],
  fino: [
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.04, priceField: 'cementBagPrice' },
    { key: 'lime', label: 'Cal', unit: 'bolsa', perM2: 0.08, priceField: 'limeBagPrice' },
    { key: 'sand', label: 'Arena fina', unit: 'm3', perM2: 0.015, priceField: 'sandM3Price' },
  ],
  'grueso-fino': [
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.13, priceField: 'cementBagPrice' },
    { key: 'lime', label: 'Cal', unit: 'bolsa', perM2: 0.21, priceField: 'limeBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.05, priceField: 'sandM3Price' },
  ],
  exterior: [
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.15, priceField: 'cementBagPrice' },
    { key: 'lime', label: 'Cal', unit: 'bolsa', perM2: 0.16, priceField: 'limeBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.045, priceField: 'sandM3Price' },
    { key: 'waterproof', label: 'Hidrofugo', unit: 'litro', perM2: 0.08, priceField: 'waterproofLiterPrice' },
  ],
};

const REVOQUE_LABOR_LOOKUPS: Record<RevoqueWorkTypeKey, LaborTemplateLookup> = {
  grueso: {
    categories: ['Revoques (Trad.)', 'Revoques', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['grueso', 'comun'],
    ],
    preferredUnit: 'm2',
  },
  fino: {
    categories: ['Revoques (Trad.)', 'Revoques', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['fino', 'cal'],
    ],
    preferredUnit: 'm2',
  },
  'grueso-fino': {
    categories: ['Revoques (Trad.)', 'Revoques', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['interior', 'cal', 'comun', 'completo'],
    ],
    preferredUnit: 'm2',
  },
  exterior: {
    categories: ['Revoques (Trad.)', 'Revoques', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['exterior', 'cal', 'comun', 'completo'],
      ['exterior', 'completo'],
    ],
    preferredUnit: 'm2',
  },
};

const DEFAULT_REVOQUE_FORM: RevoqueEstimatorForm = {
  workType: 'grueso-fino',
  surfaceM2: '',
  linearMeters: '',
  heightMeters: '',
  openingsM2: '',
  laborPrice: '',
  materialPrice: '',
  materialWastePercent: '10',
  cementBagPrice: '',
  limeBagPrice: '',
  sandM3Price: '',
  waterproofLiterPrice: '',
};

const MAMPOSTERIA_WORK_TYPES: Array<{
  key: MamposteriaWorkTypeKey;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  {
    key: 'ladrillo-hueco-12',
    label: 'Muro ladrillo hueco 12',
    shortLabel: 'Hueco 12',
    detail: 'Muro interior habitual, buena base para calcular por m2.',
  },
  {
    key: 'ladrillo-hueco-8',
    label: 'Tabique ladrillo hueco 8',
    shortLabel: 'Hueco 8',
    detail: 'Tabique liviano interior.',
  },
  {
    key: 'ladrillo-hueco-18',
    label: 'Muro ladrillo hueco 18',
    shortLabel: 'Hueco 18',
    detail: 'Muro mas robusto, con mayor consumo de material.',
  },
  {
    key: 'ladrillo-comun',
    label: 'Mamposteria ladrillo comun',
    shortLabel: 'Ladrillo comun',
    detail: 'Muro tradicional con mas mano de obra.',
  },
  {
    key: 'bloque-cemento',
    label: 'Mamposteria bloque de cemento',
    shortLabel: 'Bloque cemento',
    detail: 'Muro de bloque, util para cierres y obras exteriores.',
  },
];

const MAMPOSTERIA_MATERIAL_COEFFICIENTS: Record<
  MamposteriaWorkTypeKey,
  Array<MaterialCoefficient<MamposteriaMaterialPriceField>>
> = {
  'ladrillo-hueco-8': [
    { key: 'brick', label: 'Ladrillo hueco 8', unit: 'unidad', perM2: 16.5, priceField: 'brickUnitPrice' },
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.08, priceField: 'cementBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.025, priceField: 'sandM3Price' },
  ],
  'ladrillo-hueco-12': [
    { key: 'brick', label: 'Ladrillo hueco 12', unit: 'unidad', perM2: 16.5, priceField: 'brickUnitPrice' },
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.09, priceField: 'cementBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.03, priceField: 'sandM3Price' },
  ],
  'ladrillo-hueco-18': [
    { key: 'brick', label: 'Ladrillo hueco 18', unit: 'unidad', perM2: 16.5, priceField: 'brickUnitPrice' },
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.11, priceField: 'cementBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.035, priceField: 'sandM3Price' },
  ],
  'ladrillo-comun': [
    { key: 'brick', label: 'Ladrillo comun', unit: 'unidad', perM2: 60, priceField: 'brickUnitPrice' },
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.11, priceField: 'cementBagPrice' },
    { key: 'lime', label: 'Cal', unit: 'bolsa', perM2: 0.13, priceField: 'limeBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.04, priceField: 'sandM3Price' },
  ],
  'bloque-cemento': [
    { key: 'block', label: 'Bloque de cemento', unit: 'unidad', perM2: 12.5, priceField: 'brickUnitPrice' },
    { key: 'cement', label: 'Cemento 50 kg', unit: 'bolsa', perM2: 0.1, priceField: 'cementBagPrice' },
    { key: 'sand', label: 'Arena', unit: 'm3', perM2: 0.035, priceField: 'sandM3Price' },
  ],
};

const MAMPOSTERIA_LABOR_LOOKUPS: Record<MamposteriaWorkTypeKey, LaborTemplateLookup> = {
  'ladrillo-hueco-8': {
    categories: ['Mamposteria', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'hueco', '8'],
      ['tabique', 'hueco', '8'],
    ],
    preferredUnit: 'm2',
  },
  'ladrillo-hueco-12': {
    categories: ['Mamposteria', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'hueco', '12'],
      ['muro', 'hueco', '12'],
    ],
    preferredUnit: 'm2',
  },
  'ladrillo-hueco-18': {
    categories: ['Mamposteria', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'hueco', '18'],
      ['muro', 'hueco', '18'],
    ],
    preferredUnit: 'm2',
  },
  'ladrillo-comun': {
    categories: ['Mamposteria', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['ladrillo', 'comun'],
      ['mamposteria', 'comun'],
    ],
    preferredUnit: 'm2',
  },
  'bloque-cemento': {
    categories: ['Mamposteria', 'Albanileria', 'Construccion', 'Estructura y Obra Gruesa'],
    termGroups: [
      ['bloque', 'cemento'],
      ['mamposteria', 'bloque'],
    ],
    preferredUnit: 'm2',
  },
};

const DEFAULT_MAMPOSTERIA_FORM: MamposteriaEstimatorForm = {
  workType: 'ladrillo-hueco-12',
  surfaceM2: '',
  linearMeters: '',
  heightMeters: '',
  openingsM2: '',
  laborPrice: '',
  materialPrice: '',
  materialWastePercent: '10',
  brickUnitPrice: '',
  cementBagPrice: '',
  limeBagPrice: '',
  sandM3Price: '',
};

const PISO_WORK_TYPES: Array<{
  key: PisoWorkTypeKey;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  {
    key: 'ceramico',
    label: 'Colocacion de piso ceramico',
    shortLabel: 'Ceramico',
    detail: 'Calcula piezas por m2, adhesivo, pastina y colocacion.',
  },
  {
    key: 'porcelanato',
    label: 'Colocacion de porcelanato',
    shortLabel: 'Porcelanato',
    detail: 'Mayor cuidado de nivelacion y terminacion.',
  },
  {
    key: 'revestimiento',
    label: 'Colocacion de revestimiento',
    shortLabel: 'Revestimiento',
    detail: 'Para paredes de bano, cocina o frentes interiores.',
  },
];

const PISO_LABOR_LOOKUPS: Record<PisoWorkTypeKey, LaborTemplateLookup> = {
  ceramico: {
    categories: ['Pisos y revestimientos', 'Revestimientos y Pisos', 'Albanileria'],
    termGroups: [
      ['colocacion', 'ceramico'],
      ['piso', 'ceramico'],
    ],
    preferredUnit: 'm2',
  },
  porcelanato: {
    categories: ['Pisos y revestimientos', 'Revestimientos y Pisos', 'Albanileria'],
    termGroups: [
      ['colocacion', 'porcelanato'],
      ['piso', 'porcelanato'],
    ],
    preferredUnit: 'm2',
  },
  revestimiento: {
    categories: ['Pisos y revestimientos', 'Revestimientos y Pisos', 'Albanileria'],
    termGroups: [
      ['colocacion', 'revestimiento'],
      ['revestimiento'],
    ],
    preferredUnit: 'm2',
  },
};

const PISO_MATERIAL_PRICE_LOOKUPS: Record<PisoMaterialPriceField, MaterialTemplateLookup> = {
  tileM2Price: {
    categories: ['Materiales', 'Pisos y revestimientos', 'Revestimientos y Pisos'],
    termGroups: [
      ['ceramico'],
      ['porcelanato'],
      ['revestimiento'],
    ],
    preferredUnit: 'm2',
  },
  adhesiveBagPrice: {
    categories: ['Materiales', 'Pisos y revestimientos', 'Revestimientos y Pisos'],
    termGroups: [
      ['adhesivo', 'cementicio'],
      ['pegamento'],
      ['adhesivo'],
    ],
    preferredUnit: 'bolsa',
  },
  groutKgPrice: {
    categories: ['Materiales', 'Pisos y revestimientos', 'Revestimientos y Pisos'],
    termGroups: [
      ['pastina'],
      ['fragua'],
      ['fragüe'],
      ['frague'],
    ],
    preferredUnit: 'kg',
  },
};

const PISO_MATERIAL_COEFFICIENTS: Record<PisoWorkTypeKey, Array<MaterialCoefficient<PisoMaterialPriceField>>> = {
  ceramico: [
    { key: 'tile', label: 'Piso ceramico', unit: 'm2', perM2: 1, priceField: 'tileM2Price' },
    { key: 'adhesive', label: 'Pegamento', unit: 'bolsa', perM2: 0.2, priceField: 'adhesiveBagPrice' },
    { key: 'grout', label: 'Pastina', unit: 'kg', perM2: 0.25, priceField: 'groutKgPrice' },
  ],
  porcelanato: [
    { key: 'tile', label: 'Porcelanato', unit: 'm2', perM2: 1, priceField: 'tileM2Price' },
    { key: 'adhesive', label: 'Pegamento porcelanato', unit: 'bolsa', perM2: 0.25, priceField: 'adhesiveBagPrice' },
    { key: 'grout', label: 'Pastina', unit: 'kg', perM2: 0.28, priceField: 'groutKgPrice' },
  ],
  revestimiento: [
    { key: 'tile', label: 'Revestimiento', unit: 'm2', perM2: 1, priceField: 'tileM2Price' },
    { key: 'adhesive', label: 'Pegamento', unit: 'bolsa', perM2: 0.18, priceField: 'adhesiveBagPrice' },
    { key: 'grout', label: 'Pastina', unit: 'kg', perM2: 0.22, priceField: 'groutKgPrice' },
  ],
};

const DEFAULT_PISO_FORM: PisoEstimatorForm = {
  workType: 'ceramico',
  surfaceM2: '',
  laborPrice: '',
  materialPrice: '',
  materialWastePercent: '10',
  tileM2Price: '',
  adhesiveBagPrice: '',
  groutKgPrice: '',
};

const PINTURA_WORK_TYPES: Array<{
  key: PinturaWorkTypeKey;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  {
    key: 'interior',
    label: 'Pintura interior',
    shortLabel: 'Interior',
    detail: 'Paredes interiores, calculo por m2 y cantidad de manos.',
  },
  {
    key: 'exterior',
    label: 'Pintura exterior',
    shortLabel: 'Exterior',
    detail: 'Incluye mayor preparacion y consumo por superficie.',
  },
  {
    key: 'cielorraso',
    label: 'Pintura de cielorraso',
    shortLabel: 'Cielorraso',
    detail: 'Para techos interiores y superficies horizontales.',
  },
];

const PINTURA_LABOR_LOOKUPS: Record<PinturaWorkTypeKey, LaborTemplateLookup> = {
  interior: {
    categories: ['Pintura', 'Terminaciones'],
    termGroups: [
      ['pintura', 'interior'],
      ['pintura'],
    ],
    preferredUnit: 'm2',
  },
  exterior: {
    categories: ['Pintura', 'Terminaciones'],
    termGroups: [
      ['pintura', 'exterior'],
      ['exterior'],
    ],
    preferredUnit: 'm2',
  },
  cielorraso: {
    categories: ['Pintura', 'Terminaciones'],
    termGroups: [
      ['pintura', 'cielorraso'],
      ['cielorraso'],
    ],
    preferredUnit: 'm2',
  },
};

const PINTURA_MATERIAL_PRICE_LOOKUPS: Record<PinturaMaterialPriceField, MaterialTemplateLookup> = {
  paintLiterPrice: {
    categories: ['Materiales', 'Pintura', 'Terminaciones'],
    termGroups: [
      ['latex', 'interior'],
      ['latex', 'exterior'],
      ['pintura', 'latex'],
      ['latex'],
      ['pintura'],
    ],
    preferredUnit: 'litro',
  },
  primerLiterPrice: {
    categories: ['Materiales', 'Pintura', 'Terminaciones'],
    termGroups: [
      ['fijador'],
      ['sellador'],
    ],
    preferredUnit: 'litro',
  },
  puttyKgPrice: {
    categories: ['Materiales', 'Pintura', 'Terminaciones'],
    termGroups: [
      ['enduido'],
      ['masilla'],
    ],
    preferredUnit: 'kg',
  },
};

const DEFAULT_PINTURA_FORM: PinturaEstimatorForm = {
  workType: 'interior',
  surfaceM2: '',
  coats: '2',
  laborPrice: '',
  materialPrice: '',
  materialWastePercent: '10',
  paintLiterPrice: '',
  primerLiterPrice: '',
  puttyKgPrice: '',
  includePrimer: true,
  includePutty: false,
};

const isTechnicianDashboardTab = (
  value: string
): value is
  | 'lobby'
  | 'operativo'
  | 'nuevo'
  | 'presupuestos'
  | 'visualizador'
  | 'soporte'
  | 'agenda'
  | 'perfil'
  | 'precios'
  | 'historial'
  | 'notificaciones' =>
  [
    'lobby',
    'operativo',
    'nuevo',
    'presupuestos',
    'visualizador',
    'soporte',
    'agenda',
    'perfil',
    'precios',
    'historial',
    'notificaciones',
  ].includes(value);

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

const extractProvinceHint = (...candidates: Array<string | null | undefined>) => {
  return extractProvinceHintForCountry(DEFAULT_COUNTRY_NAME, ...candidates);
};

const LOCALITY_CONTAINER_PREFIXES = ['partido de ', 'departamento de ', 'comuna ', 'provincia de '];
const GENERIC_MAP_LOCATION_LABEL = 'Ubicación seleccionada en mapa';

const isLikelyPostalSegment = (value: string) => /^[a-z]{0,3}\d{4,}[a-z0-9-]*$/i.test(value.replace(/\s+/g, ''));

const isLocalityCandidate = (value: string) => {
  const trimmed = String(value || '').trim();
  const normalized = normalizeTextForParsing(trimmed);
  if (!trimmed || !normalized || normalized === 'argentina') return false;
  if (isKnownProvinceName(trimmed)) return false;
  if (LOCALITY_CONTAINER_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  if (isLikelyPostalSegment(normalized)) return false;
  return true;
};

const extractLocalityHint = (...candidates: Array<string | null | undefined>) => {
  for (const candidate of candidates) {
    const parts = String(candidate || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;

    const partsToCheck = parts.length > 1 ? parts.slice(1) : parts;

    for (let index = 0; index < partsToCheck.length; index += 1) {
      const current = partsToCheck[index];
      const nextNormalized = normalizeTextForParsing(partsToCheck[index + 1] || '');
      if (
        isLocalityCandidate(current) &&
        LOCALITY_CONTAINER_PREFIXES.some((prefix) => nextNormalized.startsWith(prefix))
      ) {
        return current;
      }
    }

    const fallback = partsToCheck.find((part) => isLocalityCandidate(part));
    if (fallback) {
      return fallback;
    }
  }
  return '';
};

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
  'Sanitario',
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
  'Movimiento de suelo',
  'Hormigon armado',
  'Estructuras metalicas',
  'Reformas integrales',
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

const parseProfileBadges = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

const buildProfileWhatsappLink = (phone: string | null | undefined) => {
  const raw = String(phone || '').replace(/\D/g, '');
  if (!raw) return '';
  let normalized = raw;
  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (!normalized.startsWith('54')) {
    if (normalized.startsWith('0')) normalized = normalized.slice(1);
    if (normalized.length === 11 && normalized.slice(2, 4) === '15') {
      normalized = `${normalized.slice(0, 2)}${normalized.slice(4)}`;
    }
    normalized = `54${normalized}`;
  }
  return `https://wa.me/${normalized}`;
};

const formatArgentinaTimeLabel = (now = new Date()) =>
  new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(now);

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
  client_id?: string | null;
  client_name?: string | null;
  client_avatar_url?: string | null;
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
  google_maps_href?: string | null;
  apple_maps_href?: string | null;
  photo_urls?: string[];
  my_quote_status?: string | null;
  my_response_type?: string | null;
  my_response_message?: string | null;
  my_visit_eta_hours?: number | null;
  my_price_ars?: number | null;
  my_eta_hours?: number | null;
  my_quote_updated_at?: string | null;
};

type RequestResponseType = 'direct_quote' | 'application';

type RequestOfferDraft = {
  responseType: RequestResponseType;
  priceArs: string;
  etaHours: string;
  visitEtaHours: string;
  message: string;
};

const DEFAULT_REQUEST_APPLICATION_MESSAGE = 'Estoy disponible para realizar este trabajo.';

type FinanceTimelineMode = 'weekly' | 'monthly' | 'yearly';
type NotificationFilter = 'all' | 'unread' | 'quote' | 'agenda';
type QuoteFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'rejected'
  | 'discarded'
  | 'cancelled'
  | 'expired';

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
  if (!normalized || normalized === 'pending') return 'Sin respuesta';
  if (normalized === 'submitted') return 'Postulacion enviada';
  if (normalized === 'accepted') return 'Aceptada';
  if (normalized === 'rejected') return 'Rechazada';
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

const normalizeRequestResponseType = (value: string | null | undefined): RequestResponseType =>
  String(value || '').toLowerCase().trim() === 'application' ? 'application' : 'direct_quote';

const requestResponseTypeLabel = (value: string | null | undefined) => {
  const normalized = normalizeRequestResponseType(value);
  return normalized === 'application' ? 'Postulacion' : 'Cotizacion';
};

const requestPublicZoneLabel = (request: Pick<NearbyRequestRow, 'city' | 'distance_km'>) => {
  const city = String(request.city || '').trim();
  const distance = Number(request.distance_km);
  const distanceLabel = Number.isFinite(distance) ? `${distance.toFixed(1)} km aprox.` : 'Distancia aproximada';
  return city ? `${city} · ${distanceLabel}` : distanceLabel;
};

const getClientInitials = (name: string) => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return 'C';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
});

const themeStyles = {
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

const authSurfaceClass =
  'rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/96 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur';

const authSurfaceMutedClass =
  'rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/84 p-6 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.32)] backdrop-blur';

const authSurfaceSoftClass =
  'rounded-3xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/72 p-6 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.28)] backdrop-blur';

const authPillClass =
  'inline-flex items-center gap-2 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/76 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-muted)] shadow-sm';

const authLogoFrameClass =
  'flex h-14 w-auto min-w-14 max-w-[112px] items-center justify-center overflow-hidden ring-1 ring-[color:var(--ui-border)] shadow-lg shadow-black/10';

const authInputClass =
  'mt-2 w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-4 py-3 text-base text-[color:var(--ui-ink)] outline-none transition placeholder:text-[color:var(--ui-muted)]/70 focus:border-[#ff8f1f] focus:ring-4 focus:ring-[#ff8f1f]/[0.10] sm:text-sm';

const authIconInputClass = authInputClass.replace('px-4', 'pl-11 pr-4');

const authPrimaryButtonClass =
  'w-full rounded-2xl bg-[color:var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50';

const authSecondaryButtonClass =
  'inline-flex items-center justify-center rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/72 px-5 py-2 text-sm font-semibold text-[color:var(--ui-ink)] transition hover:border-[color:var(--ui-accent-soft)] hover:text-[color:var(--ui-ink)]';

const authSecondaryButtonBlockClass =
  'w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/72 px-4 py-3 text-xs font-semibold text-[color:var(--ui-muted)] transition hover:border-[color:var(--ui-accent-soft)] hover:text-[color:var(--ui-ink)]';

const authOptionButtonClass =
  'w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-4 py-3 text-left transition hover:border-[color:var(--ui-accent-soft)]';

const AUTH_FORM_VALIDATION_MESSAGES = [
  'Ingresa correo y contraseña.',
  'Ingresa un correo válido.',
  'Ingresa un correo real para crear la cuenta.',
  'No pudimos validar el dominio del correo. Usa una cuenta real.',
  PASSWORD_POLICY_MESSAGE,
  'Ingresa al menos tu nombre para crear la cuenta.',
] as const;

const getFriendlyAuthErrorMessage = (
  error: unknown,
  mode: 'login' | 'register' | 'recovery' | 'google'
) => {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  if (AUTH_FORM_VALIDATION_MESSAGES.includes(rawMessage as (typeof AUTH_FORM_VALIDATION_MESSAGES)[number])) {
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
    return 'No pudimos enviar el correo de recuperación.';
  }
  return mode === 'register'
    ? 'No pudimos crear la cuenta. Revisa los datos e intenta de nuevo.'
    : 'No pudimos ingresar. Revisa los datos e intenta de nuevo.';
};

const AUTH_ROLE_SELECTOR_OPTIONS: Array<{
  profile: AccessProfile;
  title: string;
  badge: string;
  description: string;
  info: string;
  note: string;
  icon: LucideIcon;
  iconShellClassName: string;
  iconClassName: string;
}> = [
  {
    profile: 'tecnico',
    title: 'Técnico',
    badge: 'Operativo',
    description: 'Presupuestos, solicitudes cercanas, seguimiento de trabajos y perfil público desde un mismo panel.',
    info: 'Para profesionales que cotizan, responden solicitudes, organizan agenda y muestran su perfil publico.',
    note: 'Ideal para operar y cotizar sin salir de la web.',
    icon: Wrench,
    iconShellClassName: 'border-[#ff8f1f]/[0.25] bg-[#ff8f1f]/[0.12]',
    iconClassName: 'text-[#ff8f1f]',
  },
  {
    profile: 'empresa',
    title: 'Empresa',
    badge: 'Comercial',
    description: 'Centraliza marca, responsables, presupuestos y flujo comercial en una única cuenta operativa.',
    info: 'Para empresas, marcas o equipos que necesitan gestionar responsables, presupuestos y datos comerciales.',
    note: 'Pensado para equipos, marcas y gestión comercial.',
    icon: Building2,
    iconShellClassName: 'border-[#2a0338]/[0.18] bg-[#2a0338]/[0.08]',
    iconClassName: 'text-[#2a0338]',
  },
  {
    profile: 'cliente',
    title: 'Cliente',
    badge: 'Solicitudes',
    description: 'Publica pedidos, recibe cotizaciones y encuentra técnicos en el flujo específico para clientes.',
    info: 'Para personas que quieren publicar una solicitud, seguir respuestas y contactar tecnicos desde su portal.',
    note: 'Te llevamos directo al portal cliente.',
    icon: Home,
    iconShellClassName: 'border-sky-200 bg-sky-50',
    iconClassName: 'text-sky-700',
  },
];

const AUTH_PROFILE_META = {
  tecnico: {
    panelLabel: 'Panel técnico',
    heading: 'Ingresa a tu operación técnica con una entrada más clara.',
    description:
      'Accede a presupuestos, solicitudes cercanas, facturación y presencia pública sin pasar por una pantalla genérica.',
    heroCards: [
      {
        eyebrow: 'Cotización',
        title: 'Presupuestos listos para compartir',
        body: 'Armá links y PDFs claros con identidad propia y seguimiento desde la web.',
      },
      {
        eyebrow: 'Cobertura',
        title: 'Solicitudes, agenda y vidriera',
        body: 'Concentrá operación, disponibilidad y visibilidad pública desde un solo panel.',
      },
    ],
    accessBullets: [
      'Responder solicitudes y cotizar sin fricción.',
      'Administrar precios, agenda, notificaciones y seguimiento.',
      'Publicar tu perfil en vidriera y mapa cuando estés listo.',
    ],
    afterSteps: [
      'Entrás al panel y completas tu perfil operativo.',
      'Cargas rubros, zona de trabajo y tu primer presupuesto.',
      'Si quieres, publicas tu perfil para aparecer en la vidriera y el mapa.',
    ],
  },
  empresa: {
    panelLabel: 'Panel empresa',
    heading: 'Acceso para marcas y equipos que necesitan orden comercial.',
    description:
      'Entra a una vista enfocada en marca, responsables, presupuestos y seguimiento comercial con una estética alineada al sitio actual.',
    heroCards: [
      {
        eyebrow: 'Control',
        title: 'Gestión comercial centralizada',
        body: 'Unifica responsables, presupuestos y estado de avance con una sola cuenta web.',
      },
      {
        eyebrow: 'Marca',
        title: 'Presentación más sólida',
        body: 'Tus propuestas, datos comerciales y presencia pública quedan mejor alineados con la identidad de empresa.',
      },
    ],
    accessBullets: [
      'Centralizar presupuestos, responsables y seguimiento.',
      'Mantener branding, datos comerciales y contacto en una sola capa.',
      'Escalar la operación con un acceso menos improvisado.',
    ],
    afterSteps: [
      'Ingresas al panel y validas tu información comercial.',
      'Configuras marca, responsables, rubros y flujo de trabajo.',
      'Publicas presencia y compartes presupuestos desde una base más sólida.',
    ],
  },
} as const;

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

const buildQuotePreviewLink = (quoteId: string) => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/p/${quoteId}`;
  }
  return buildQuoteLink(quoteId);
};

const canShareQuoteFeedback = (status?: string | null) => {
  const normalized = normalizeStatusValue(status);
  return normalized === 'completed' || normalized === 'paid';
};

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
  draft: { label: 'Cómputo', className: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Presentado', className: 'bg-sky-100 text-sky-700' },
  presented: { label: 'Presentado', className: 'bg-sky-100 text-sky-700' },
  approved: { label: 'Aprobado', className: 'bg-emerald-100 text-emerald-700' },
  accepted: { label: 'Aceptado', className: 'bg-emerald-100 text-emerald-700' },
  scheduled: { label: 'Programado', className: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'En curso', className: 'bg-blue-100 text-blue-700' },
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Cobrado', className: 'bg-emerald-50 text-emerald-700' },
  cobrado: { label: 'Cobrado', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rechazado', className: 'bg-rose-100 text-rose-700' },
  discarded: { label: 'Desestimado', className: 'bg-zinc-100 text-zinc-700' },
  cancelled: { label: 'Cancelado', className: 'bg-orange-100 text-orange-700' },
  expired: { label: 'Vencido', className: 'bg-stone-100 text-stone-700' },
  locked: { label: 'Bloqueado', className: 'bg-slate-200 text-slate-600' },
  completed: { label: 'Finalizado', className: 'bg-indigo-100 text-indigo-700' },
  finalizado: { label: 'Finalizado', className: 'bg-indigo-100 text-indigo-700' },
};

const pendingStatuses = new Set(['pending', 'sent', 'presented']);
const approvedStatuses = new Set(['approved', 'accepted']);
const scheduledStatuses = new Set(['scheduled', 'programado', 'agendado']);
const inProgressStatuses = new Set(['in_progress', 'in-progress', 'en_curso', 'en curso', 'enproceso', 'en_proceso']);
const draftStatuses = new Set(['draft', 'borrador']);
const completedStatuses = new Set(['completed', 'completado', 'finalizado', 'finalizados']);
const paidStatuses = new Set(['paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged']);
const rejectedStatuses = new Set(['rejected', 'rechazado', 'rechazada']);
const discardedStatuses = new Set(['discarded', 'desestimado', 'desestimada']);
const cancelledStatuses = new Set(['cancelled', 'canceled', 'cancelado', 'cancelada']);
const expiredStatuses = new Set(['expired', 'vencido', 'vencida']);

const normalizeStatusValue = (status?: string | null) => {
  const normalized = (status || '').toLowerCase();
  if (!normalized) return 'draft';
  if (normalized === 'accepted') return 'approved';
  if (normalized === 'sent') return 'presented';
  if (normalized === 'finalizado') return 'completed';
  if (normalized === 'cobrado' || normalized === 'cobrados' || normalized === 'pagado' || normalized === 'pagados')
    return 'paid';
  if (normalized === 'presented' || normalized === 'pending') return normalized;
  if (
    normalized === 'approved' ||
    normalized === 'scheduled' ||
    normalized === 'in_progress' ||
    normalized === 'completed' ||
    normalized === 'paid' ||
    normalized === 'rejected' ||
    normalized === 'discarded' ||
    normalized === 'cancelled' ||
    normalized === 'expired' ||
    normalized === 'draft'
  )
    return normalized;
  if (draftStatuses.has(normalized)) return 'draft';
  if (pendingStatuses.has(normalized)) return 'pending';
  if (approvedStatuses.has(normalized)) return 'approved';
  if (scheduledStatuses.has(normalized)) return 'scheduled';
  if (inProgressStatuses.has(normalized)) return 'in_progress';
  if (completedStatuses.has(normalized)) return 'completed';
  if (paidStatuses.has(normalized)) return 'paid';
  if (rejectedStatuses.has(normalized)) return 'rejected';
  if (discardedStatuses.has(normalized)) return 'discarded';
  if (cancelledStatuses.has(normalized)) return 'cancelled';
  if (expiredStatuses.has(normalized)) return 'expired';
  return 'draft';
};

type QuoteStatusGroup =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'rejected'
  | 'discarded'
  | 'cancelled'
  | 'expired';

const canonicalQuoteStatusGroups: Record<QuoteStatusGroup, Set<string>> = {
  draft: new Set(['draft']),
  pending: new Set(['pending', 'presented']),
  approved: new Set(['approved']),
  scheduled: new Set(['scheduled']),
  in_progress: new Set(['in_progress']),
  completed: new Set(['completed']),
  paid: new Set(['paid']),
  rejected: new Set(['rejected']),
  discarded: new Set(['discarded']),
  cancelled: new Set(['cancelled']),
  expired: new Set(['expired']),
};

const quoteHasStatusGroup = (status: string | null | undefined, group: QuoteStatusGroup) =>
  canonicalQuoteStatusGroups[group].has(normalizeStatusValue(status));

const quoteNeedsFollowUp = (status: string | null | undefined) =>
  quoteHasStatusGroup(status, 'pending') || quoteHasStatusGroup(status, 'approved');

const quoteIsBillable = (status: string | null | undefined) =>
  quoteHasStatusGroup(status, 'approved') ||
  quoteHasStatusGroup(status, 'scheduled') ||
  quoteHasStatusGroup(status, 'in_progress') ||
  quoteHasStatusGroup(status, 'completed') ||
  quoteHasStatusGroup(status, 'paid');

const quoteIsOperational = quoteIsBillable;

const getQuoteStatusInfo = (status?: string | null) => {
  const normalized = normalizeStatusValue(status);
  return (
    statusMap[normalized] || {
      label: normalized ? normalized.toUpperCase() : 'N/A',
      className: 'bg-slate-100 text-slate-600',
    }
  );
};

const toNumber = (value: string) => {
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMeasure = (value: number) => Math.round(value * 100) / 100;
const formatMeasureValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toLocaleString('es-AR', { maximumFractionDigits: 2 });

const buildMaterialEstimateLines = <TPriceField extends string>(
  surfaceM2: number,
  wastePercent: number,
  coefficients: Array<MaterialCoefficient<TPriceField>>,
  getUnitPrice: (field: TPriceField) => number
) => {
  const wasteMultiplier = 1 + Math.max(0, wastePercent) / 100;
  return coefficients
    .map((material) => {
      const quantity = roundMeasure(surfaceM2 * material.perM2 * wasteMultiplier);
      const unitPrice = getUnitPrice(material.priceField);
      return {
        ...material,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    })
    .filter((material) => material.quantity > 0);
};

const summarizeMaterialEstimateLines = (
  lines: Array<{ label: string; quantity: number; unit: string; unitPrice: number; total: number }>
) =>
  lines
    .map(
      (line) =>
        line.unitPrice > 0
          ? `${line.label}: ${formatMeasureValue(line.quantity)} ${line.unit} x ${formatCurrency(line.unitPrice)} = ${formatCurrency(line.total)}`
          : `${line.label}: ${formatMeasureValue(line.quantity)} ${line.unit} (precio pendiente)`
    )
    .join('\n');

const normalizeLaborLookupText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getMasterItemBasePrice = (item: MasterItemRow | null | undefined) => {
  const price = Number(item?.suggested_price || 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
};

const getMasterItemSuggestedPrice = (item: MasterItemRow | null | undefined) => {
  const basePrice = getMasterItemBasePrice(item);
  if (!basePrice) return 0;
  return item?.type === 'labor' ? getUpdatedLaborPrice(basePrice) : basePrice;
};

const formatSuggestedPriceInput = (price: number) => {
  if (!Number.isFinite(price) || price <= 0) return '';
  return Number.isInteger(price) ? String(price) : String(Math.round(price * 100) / 100).replace('.', ',');
};

const pricesAreEquivalent = (left: number, right: number) => Math.abs(left - right) < 0.01;

const formatCatalogSourceLabel = (source: string | null | undefined) => {
  const value = String(source || '').trim();
  if (!value) return 'sin fuente';
  const knownLabels: Record<string, string> = {
    mo_rubro_mamposteria_tabiqueria: 'MO mamposteria',
    mo_rubro_revoques: 'MO revoques',
  };
  return knownLabels[value] || value.replace(/^mo[_-]?rubro?s?[_-]?/i, 'MO ').replace(/[_-]+/g, ' ').trim();
};

const formatCatalogDateLabel = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const buildEstimatorCatalogCheck = (
  fields: EstimatorCatalogCheckField[],
  loading: boolean
): EstimatorCatalogCheck => {
  const activeFields = fields.filter((field) => field.item);
  const laborFields = fields.filter((field) => field.kind === 'labor');
  if (loading) {
    return {
      status: 'loading',
      label: 'Validando catalogo',
      detail: 'Buscando la base de precios activa.',
      sourceLabel: '',
      updatedAtLabel: '',
      manualCount: 0,
      missingCount: 0,
      totalCount: fields.length,
    };
  }

  const sourceCounts = new Map<string, number>();
  let newestCreatedAt = '';
  let manualCount = 0;
  let missingCount = 0;
  let missingLaborCount = 0;
  let missingMaterialCount = 0;

  fields.forEach((field) => {
    const suggestedPrice = getMasterItemSuggestedPrice(field.item);
    if (!field.item || suggestedPrice <= 0) {
      missingCount += 1;
      if (field.kind === 'labor') missingLaborCount += 1;
      if (field.kind === 'material') missingMaterialCount += 1;
      return;
    }

    const source = String(field.item.source_ref || '').trim() || 'sin fuente';
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);

    const createdAt = String(field.item.created_at || '');
    if (createdAt && (!newestCreatedAt || new Date(createdAt).getTime() > new Date(newestCreatedAt).getTime())) {
      newestCreatedAt = createdAt;
    }

    const currentPrice = toNumber(field.value);
    if (field.value.trim() && currentPrice > 0 && !pricesAreEquivalent(currentPrice, suggestedPrice)) {
      manualCount += 1;
    }
  });

  const sources = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]);
  const sourceLabel =
    sources.length === 0
      ? 'sin fuente'
      : sources.length === 1
        ? formatCatalogSourceLabel(sources[0][0])
        : `${formatCatalogSourceLabel(sources[0][0])} + ${sources.length - 1} fuente${sources.length > 2 ? 's' : ''}`;
  const updatedAtLabel = formatCatalogDateLabel(newestCreatedAt);

  if (missingLaborCount > 0) {
    return {
      status: 'missing',
      label: 'Falta mano de obra',
      detail: 'No encontramos el valor principal en el catalogo activo.',
      sourceLabel,
      updatedAtLabel,
      manualCount,
      missingCount,
      totalCount: fields.length,
    };
  }

  if (missingMaterialCount > 0) {
    const laborReadyCount = laborFields.length - missingLaborCount;
    return {
      status: 'partial',
      label: laborReadyCount > 0 ? 'Mano de obra al dia' : 'Materiales pendientes',
      detail: `${missingMaterialCount} material${missingMaterialCount === 1 ? '' : 'es'} quedan con precio pendiente.`,
      sourceLabel,
      updatedAtLabel,
      manualCount,
      missingCount,
      totalCount: fields.length,
    };
  }

  if (manualCount > 0) {
    return {
      status: 'manual',
      label: 'Valores modificados',
      detail: `${manualCount} de ${fields.length} valores no coinciden con el catalogo vigente.`,
      sourceLabel,
      updatedAtLabel,
      manualCount,
      missingCount,
      totalCount: fields.length,
    };
  }

  return {
    status: 'ready',
    label: 'Catalogo al dia',
    detail: `${activeFields.length} valores tomados de la base vigente.`,
    sourceLabel,
    updatedAtLabel,
    manualCount,
    missingCount,
    totalCount: fields.length,
  };
};

const getEstimatorCatalogCheckClass = (status: EstimatorCatalogCheck['status']) => {
  if (status === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (status === 'partial') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'manual') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'missing') return 'border-rose-200 bg-rose-50 text-rose-900';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const lookupTextHasTerm = (text: string, term: string) => {
  if (!term) return true;
  if (/^\d+$/.test(term)) {
    return new RegExp(`(^|\\s)${term}(\\s|$)`).test(text);
  }
  return text.includes(term);
};

const lookupTextHasEveryTerm = (text: string, terms: string[]) =>
  terms.every((term) => lookupTextHasTerm(text, term));

const shouldReplaceSuggestedPriceInput = (
  currentValue: string,
  previousSuggestedValue: string,
  sourceItem?: MasterItemRow | null
) => {
  const trimmedValue = String(currentValue || '').trim();
  if (!trimmedValue) return true;

  const currentPrice = toNumber(trimmedValue);
  const suggestedPrice = toNumber(previousSuggestedValue);
  if (suggestedPrice > 0 && pricesAreEquivalent(currentPrice, suggestedPrice)) return true;

  const basePrice = getMasterItemBasePrice(sourceItem);
  return basePrice > 0 && pricesAreEquivalent(currentPrice, basePrice);
};

const shouldSyncMasterItemPrice = (item: ItemForm, match: MasterItemRow) => {
  const suggestedPrice = getMasterItemSuggestedPrice(match);
  if (suggestedPrice <= 0) return false;

  const currentPrice = Number(item.unitPrice || 0);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return true;
  if (pricesAreEquivalent(currentPrice, suggestedPrice)) return true;

  const basePrice = getMasterItemBasePrice(match);
  return match.type === 'labor' && basePrice > 0 && pricesAreEquivalent(currentPrice, basePrice);
};

const resolveTemplateLaborMasterItem = (items: MasterItemRow[], lookup: LaborTemplateLookup) => {
  const categoryTerms = lookup.categories.map(normalizeLaborLookupText).filter(Boolean);
  const termGroups = lookup.termGroups
    .map((group) => group.map(normalizeLaborLookupText).filter(Boolean))
    .filter((group) => group.length > 0);
  const preferredUnit = canonicalizeMasterItemUnit(lookup.preferredUnit);

  return items
    .map((item) => {
      const suggestedPrice = getMasterItemSuggestedPrice(item);
      if (!suggestedPrice) return null;

      const name = normalizeLaborLookupText(item.name);
      const category = normalizeLaborLookupText(item.category);
      const notes = normalizeLaborLookupText(item.technical_notes);
      const source = normalizeLaborLookupText(item.source_ref);
      const combined = `${name} ${category} ${notes} ${source}`.trim();
      const matchedGroupIndex = termGroups.findIndex((terms) => lookupTextHasEveryTerm(combined, terms));
      if (matchedGroupIndex < 0) return null;

      const itemUnit = canonicalizeMasterItemUnit(item.unit || '');
      if (preferredUnit && itemUnit && itemUnit !== preferredUnit) return null;

      let score = 100 - matchedGroupIndex * 6;
      if (preferredUnit && itemUnit === preferredUnit) score += 35;
      else if (!itemUnit) score += 5;
      else score -= 30;

      if (categoryTerms.some((term) => category.includes(term))) score += 18;
      if (lookupTextHasEveryTerm(name, termGroups[matchedGroupIndex] || [])) score += 14;
      if (notes) score += 2;

      return { item, score };
    })
    .filter((entry): entry is { item: MasterItemRow; score: number } => Boolean(entry))
    .sort(
      (a, b) =>
        b.score - a.score ||
        getMasterItemSuggestedPrice(b.item) - getMasterItemSuggestedPrice(a.item) ||
        String(a.item.name || '').localeCompare(String(b.item.name || ''))
    )[0]?.item || null;
};

const resolveTemplateMaterialMasterItem = (items: MasterItemRow[], lookup: MaterialTemplateLookup) => {
  const categoryTerms = lookup.categories.map(normalizeLaborLookupText).filter(Boolean);
  const termGroups = lookup.termGroups
    .map((group) => group.map(normalizeLaborLookupText).filter(Boolean))
    .filter((group) => group.length > 0);
  const preferredUnit = canonicalizeMasterItemUnit(lookup.preferredUnit);

  return (
    items
      .map((item) => {
        const suggestedPrice = getMasterItemSuggestedPrice(item);
        if (!suggestedPrice) return null;

        const name = normalizeLaborLookupText(item.name);
        const category = normalizeLaborLookupText(item.category);
        const notes = normalizeLaborLookupText(item.technical_notes);
        const source = normalizeLaborLookupText(item.source_ref);
        const combined = `${name} ${category} ${notes} ${source}`.trim();
        const matchedGroupIndex = termGroups.findIndex((terms) => lookupTextHasEveryTerm(combined, terms));
        if (matchedGroupIndex < 0) return null;

        const itemUnit = canonicalizeMasterItemUnit(item.unit || '');
        if (preferredUnit && itemUnit && itemUnit !== preferredUnit) return null;

        let score = 100 - matchedGroupIndex * 8;
        if (preferredUnit && itemUnit === preferredUnit) score += 40;
        else if (!itemUnit) score += 4;
        else score -= 24;

        if (categoryTerms.some((term) => category.includes(term))) score += 16;
        if (lookupTextHasEveryTerm(name, termGroups[matchedGroupIndex] || [])) score += 18;
        if (notes) score += 2;

        return { item, score };
      })
      .filter((entry): entry is { item: MasterItemRow; score: number } => Boolean(entry))
      .sort(
        (a, b) =>
          b.score - a.score ||
          getMasterItemSuggestedPrice(b.item) - getMasterItemSuggestedPrice(a.item) ||
          String(a.item.name || '').localeCompare(String(b.item.name || ''))
      )[0]?.item || null
  );
};

const parseEtaInput = (value: string) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildRequestOfferDraft = (request: NearbyRequestRow): RequestOfferDraft => ({
  responseType: request.my_response_type ? normalizeRequestResponseType(request.my_response_type) : 'application',
  priceArs:
    request.my_price_ars === null || request.my_price_ars === undefined ? '' : String(Math.round(request.my_price_ars)),
  etaHours:
    request.my_eta_hours === null || request.my_eta_hours === undefined ? '' : String(Math.round(request.my_eta_hours)),
  visitEtaHours:
    request.my_visit_eta_hours === null || request.my_visit_eta_hours === undefined
      ? ''
      : String(Math.round(request.my_visit_eta_hours)),
  message: request.my_response_message || DEFAULT_REQUEST_APPLICATION_MESSAGE,
});

const toFiniteCoordinate = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isArgentinaCoordinate = (lat: number, lon: number) =>
  lat >= -56 && lat <= -21 && lon >= -75 && lon <= -53;

const resolveQuoteMapCoordinate = (quote: Pick<QuoteRow, 'location_lat' | 'location_lng'>) => {
  const rawLat = toFiniteCoordinate(quote.location_lat);
  const rawLon = toFiniteCoordinate(quote.location_lng);
  if (rawLat === null || rawLon === null) return null;
  if (isArgentinaCoordinate(rawLat, rawLon)) return { lat: rawLat, lon: rawLon };
  if (isArgentinaCoordinate(rawLon, rawLat)) return { lat: rawLon, lon: rawLat };
  return null;
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

const PREVIEW_TECHNICIAN_QUOTES: QuoteRow[] = [
  {
    id: 'preview-quote-daniel-001',
    client_name: 'DANIEL',
    client_address: 'Av. Corrientes 820, San Nicolas, CABA',
    location_address: 'Av. Corrientes 820, San Nicolas, Buenos Aires',
    location_lat: -34.603722,
    location_lng: -58.381592,
    total_amount: 434526.88,
    tax_rate: 0,
    discount_percent: 0,
    status: 'presented',
    created_at: '2026-05-26T14:30:00.000Z',
    quote_items: [
      {
        id: 'preview-item-daniel-001',
        description: 'Revision electrica y tablero',
        unit_price: 434526.88,
        quantity: 1,
        metadata: { type: 'labor', unit: 'trabajo' },
      },
    ],
  },
  {
    id: 'preview-quote-cristina-001',
    client_name: 'CRISTINA',
    client_address: 'Av. Santa Fe 1860, Recoleta, CABA',
    location_address: 'Av. Santa Fe 1860, Recoleta, Buenos Aires',
    location_lat: -34.59471,
    location_lng: -58.39337,
    total_amount: 196000,
    tax_rate: 0,
    discount_percent: 0,
    status: 'paid',
    created_at: '2026-05-23T12:00:00.000Z',
    quote_items: [
      {
        id: 'preview-item-cristina-001',
        description: 'Reparacion sanitaria y sellado',
        unit_price: 196000,
        quantity: 1,
        metadata: { type: 'labor', unit: 'trabajo' },
      },
    ],
  },
  {
    id: 'preview-quote-hernan-001',
    client_name: 'HERNAN',
    client_address: 'Av. Rivadavia 3050, Balvanera, CABA',
    location_address: 'Av. Rivadavia 3050, Balvanera, Buenos Aires',
    location_lat: -34.61021,
    location_lng: -58.41062,
    total_amount: 78988.7,
    tax_rate: 0,
    discount_percent: 0,
    status: 'approved',
    created_at: '2026-05-20T16:45:00.000Z',
    quote_items: [
      {
        id: 'preview-item-hernan-001',
        description: 'Mano de obra de pintura',
        unit_price: 78988.7,
        quantity: 1,
        metadata: { type: 'labor', unit: 'jornada' },
      },
    ],
  },
  {
    id: 'preview-quote-laura-001',
    client_name: 'LAURA',
    client_address: 'Scalabrini Ortiz 1440, Palermo, CABA',
    location_address: 'Scalabrini Ortiz 1440, Palermo, Buenos Aires',
    location_lat: -34.58932,
    location_lng: -58.42404,
    total_amount: 224331.72,
    tax_rate: 0,
    discount_percent: 0,
    status: 'pending',
    created_at: '2026-05-18T10:15:00.000Z',
    quote_items: [
      {
        id: 'preview-item-laura-001',
        description: 'Instalacion y ajuste de aberturas',
        unit_price: 224331.72,
        quantity: 1,
        metadata: { type: 'labor', unit: 'trabajo' },
      },
    ],
  },
];

const formatCurrency = (value: number) =>
  `$${Number(value || 0).toLocaleString('es-AR')}`;

const buildLaborPriceUpdateNote = (item: MasterItemRow | null | undefined) => {
  if (item?.type !== 'labor') return '';
  const basePrice = getMasterItemBasePrice(item);
  const updatedPrice = getMasterItemSuggestedPrice(item);
  if (!basePrice || !updatedPrice || pricesAreEquivalent(basePrice, updatedPrice)) return '';
  return [
    `Precio de mano de obra actualizado: ${formatCurrency(basePrice)} (${laborPriceIndex.baseLabel})`,
    `${getLaborPriceUpdatePercentLabel()} ${laborPriceIndex.sourceLabel}`,
    `= ${formatCurrency(updatedPrice)} (${laborPriceIndex.activeLabel}).`,
  ].join(' ');
};

const formatDashboardMoney = (value: number) => {
  const amount = Number(value || 0);
  const hasCents = Math.abs(amount % 1) > 0.005;
  return `$${amount.toLocaleString('es-AR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatCompactDashboardMoney = (value: number) => {
  const amount = Math.abs(Number(value || 0));
  if (amount >= 1000000) {
    return `$${(Number(value || 0) / 1000000).toLocaleString('es-AR', {
      maximumFractionDigits: 1,
    })} M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(Number(value || 0) / 1000).toLocaleString('es-AR')} mil`;
  }
  return formatDashboardMoney(value);
};

const getQuoteDisplayNumber = (quote: Pick<QuoteRow, 'id' | 'client_name' | 'created_at'>) => {
  const id = String(quote.id || '').trim();
  const previewMatch = id.match(/^preview-quote-([a-z]+)-(\d+)$/i);
  if (previewMatch) return `${previewMatch[1].slice(0, 3).toUpperCase()}-${previewMatch[2]}`;
  const compact = id.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (compact.length >= 6) return compact.slice(-6);
  const clientPrefix = String(quote.client_name || 'UF').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase();
  const created = new Date(quote.created_at);
  const dateSuffix = Number.isFinite(created.getTime())
    ? `${String(created.getDate()).padStart(2, '0')}${String(created.getMonth() + 1).padStart(2, '0')}`
    : '0000';
  return `${clientPrefix || 'UF'}-${compact || dateSuffix}`;
};

const getNiceChartMax = (value: number) => {
  const safeValue = Math.max(1, Number(value || 0));
  const exponent = Math.floor(Math.log10(safeValue));
  const magnitude = 10 ** exponent;
  const normalized = safeValue / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
};

const startOfFinanceWeek = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const offset = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - offset);
  return next;
};

const startOfFinancePeriod = (date: Date, mode: FinanceTimelineMode) => {
  if (mode === 'weekly') return startOfFinanceWeek(date);
  if (mode === 'yearly') return new Date(date.getFullYear(), 0, 1);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const addFinancePeriods = (date: Date, offset: number, mode: FinanceTimelineMode) => {
  if (mode === 'weekly') {
    const next = new Date(date);
    next.setDate(next.getDate() + offset * 7);
    return startOfFinanceWeek(next);
  }
  if (mode === 'yearly') {
    return new Date(date.getFullYear() + offset, 0, 1);
  }
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
};

const getFinancePeriodKey = (date: Date, mode: FinanceTimelineMode) => {
  const period = startOfFinancePeriod(date, mode);
  if (mode === 'weekly') {
    return `w-${period.getFullYear()}-${period.getMonth() + 1}-${period.getDate()}`;
  }
  if (mode === 'yearly') return `${period.getFullYear()}`;
  return `${period.getFullYear()}-${period.getMonth() + 1}`;
};

const getFinancePeriodLabel = (date: Date, mode: FinanceTimelineMode) => {
  if (mode === 'weekly') {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }
  if (mode === 'yearly') return String(date.getFullYear());
  return date.toLocaleDateString('es-AR', { month: 'short' });
};

const getFinanceTimelineUnit = (mode: FinanceTimelineMode, amount: number) => {
  if (mode === 'weekly') return amount === 1 ? 'semana' : 'semanas';
  if (mode === 'yearly') return amount === 1 ? 'año' : 'años';
  return amount === 1 ? 'mes' : 'meses';
};

const financeTimelineModeOptions: Array<{ id: FinanceTimelineMode; label: string }> = [
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'yearly', label: 'Anual' },
];

const getQuoteAddress = (quote: QuoteRow) =>
  quote.client_address || quote.address || quote.location_address || '';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const buildAttachmentPath = (userId: string, quoteId: string, fileName: string) =>
  `${userId}/quotes/${quoteId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFileName(fileName)}`;

const buildQuoteItemImagePath = (userId: string, itemId: string, fileName: string) =>
  `${userId}/quote-items/${sanitizeFileName(itemId)}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${sanitizeFileName(fileName)}`;

const isEmailLike = (value: string) => /.+@.+\..+/.test(value);
const isWhatsappLike = (value: string) => value.replace(/\D/g, '').length >= 8;

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

const normalizeQuoteItemImages = (value: unknown): ItemImageForm[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): ItemImageForm | null => {
      if (typeof item === 'string') {
        return {
          id: item,
          url: item,
          name: 'Imagen del sector',
          fileType: '',
          storagePath: getAttachmentStoragePath(item),
          uploadedAt: '',
          source: 'item-upload',
          sourceAttachmentId: null,
        };
      }
      if (!item || typeof item !== 'object') return null;
      const image = item as Record<string, any>;
      const url = String(image.url || image.file_url || image.src || '').trim();
      if (!url) return null;
      return {
        id: String(image.id || url),
        url,
        name: String(image.name || image.file_name || 'Imagen del sector'),
        fileType: String(image.fileType || image.file_type || ''),
        storagePath: image.storagePath || image.storage_path || getAttachmentStoragePath(url),
        uploadedAt: String(image.uploadedAt || image.uploaded_at || ''),
        source:
          image.source === 'quote-attachment' || image.source === 'item-upload'
            ? image.source
            : image.source_attachment_id || image.sourceAttachmentId
              ? 'quote-attachment'
              : 'item-upload',
        sourceAttachmentId: image.sourceAttachmentId || image.source_attachment_id || null,
      };
    })
    .filter((item): item is ItemImageForm => item !== null);
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
      workArea: (item.workArea || '').trim(),
      itemImages: (item.itemImages || []).map((image) => ({
        id: image.id,
        url: image.url,
        name: image.name,
        storagePath: image.storagePath || '',
        source: image.source || '',
        sourceAttachmentId: image.sourceAttachmentId || '',
      })),
      technicalNotes: (item.technicalNotes || '').trim(),
      masterItemId: item.masterItemId || '',
      masterItemCategory: item.masterItemCategory || '',
      masterItemSourceRef: item.masterItemSourceRef || '',
      syncGroupId: item.syncGroupId || '',
      syncRole: item.syncRole || '',
      syncDriverId: item.syncDriverId || '',
      syncQuantityPerUnit: Number(item.syncQuantityPerUnit) || 0,
      syncSources: normalizeQuoteItemSyncSources(item.syncSources || []).map((source) => ({
        syncGroupId: source.syncGroupId || '',
        syncDriverId: source.syncDriverId,
        syncQuantityPerUnit: Number(source.syncQuantityPerUnit) || 0,
      })),
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

const getQuoteMaterialBaseDescription = (value: string) => {
  const description = value.trim();
  if (!description) return '';
  return description.replace(/\s+para\s+.+$/i, '').trim() || description;
};

const getQuoteMaterialMergeKey = (item: ItemForm) => {
  if (item.type !== 'material') return '';
  const baseDescription = getQuoteMaterialBaseDescription(item.description);
  const descriptionKey = normalizeText(baseDescription).trim();
  if (!descriptionKey) return '';
  const identityKey = item.masterItemId ? `master:${item.masterItemId}` : `label:${descriptionKey}`;
  const unitKey = canonicalizeMasterItemUnit(item.unit || '') || normalizeText(item.unit || '').trim();
  return `${identityKey}|unit:${unitKey}`;
};

const mergeUniqueItemImages = (base: ItemImageForm[] = [], extra: ItemImageForm[] = []) => {
  const seen = new Set<string>();
  return [...base, ...extra].filter((image) => {
    const key = image.sourceAttachmentId || image.url || image.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeUniqueText = (values: Array<string | undefined>, separator: string) => {
  const seen = new Set<string>();
  return values
    .map((value) => (value || '').trim())
    .filter((value) => {
      if (!value) return false;
      const key = normalizeText(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(separator);
};

const normalizeQuoteItemSyncSources = (sources: unknown): QuoteItemSyncSource[] => {
  if (!Array.isArray(sources)) return [];
  const merged = new Map<string, QuoteItemSyncSource>();
  sources.forEach((source) => {
    if (!source || typeof source !== 'object') return;
    const item = source as Record<string, any>;
    const syncDriverId = String(item.syncDriverId || item.sync_driver_id || '').trim();
    const syncGroupId = String(item.syncGroupId || item.sync_group_id || '').trim();
    const syncQuantityPerUnit = toAmountValue(item.syncQuantityPerUnit ?? item.sync_quantity_per_unit ?? 0);
    if (!syncDriverId || syncQuantityPerUnit <= 0) return;
    const key = `${syncGroupId || 'no-group'}:${syncDriverId}`;
    const current = merged.get(key);
    merged.set(key, {
      syncGroupId,
      syncDriverId,
      syncQuantityPerUnit: roundMeasure((current?.syncQuantityPerUnit || 0) + syncQuantityPerUnit),
    });
  });
  return Array.from(merged.values());
};

const getQuoteItemSyncSources = (item: ItemForm): QuoteItemSyncSource[] => {
  const existingSources = normalizeQuoteItemSyncSources(item.syncSources || []);
  if (existingSources.length > 0) return existingSources;
  if (item.syncRole !== 'dependent' || !item.syncDriverId || !item.syncQuantityPerUnit) return [];
  return [
    {
      syncGroupId: item.syncGroupId || '',
      syncDriverId: item.syncDriverId,
      syncQuantityPerUnit: item.syncQuantityPerUnit,
    },
  ];
};

const mergeQuoteItemSyncSources = (...items: ItemForm[]) =>
  normalizeQuoteItemSyncSources(items.flatMap((item) => getQuoteItemSyncSources(item)));

const mergeQuoteMaterialItems = (quoteItems: ItemForm[]) => {
  const mergedItems: ItemForm[] = [];
  const materialIndexByKey = new Map<string, number>();

  for (const item of quoteItems) {
    const mergeKey = getQuoteMaterialMergeKey(item);
    if (!mergeKey) {
      mergedItems.push(item);
      continue;
    }

    const existingIndex = materialIndexByKey.get(mergeKey);
    if (existingIndex === undefined) {
      const syncSources = getQuoteItemSyncSources(item);
      materialIndexByKey.set(mergeKey, mergedItems.length);
      mergedItems.push({
        ...item,
        description: getQuoteMaterialBaseDescription(item.description) || item.description,
        syncSources,
      });
      continue;
    }

    const existing = mergedItems[existingIndex];
    const nextQuantity = roundMeasure((Number(existing.quantity) || 0) + (Number(item.quantity) || 0));
    const existingTotal = (Number(existing.quantity) || 0) * (Number(existing.unitPrice) || 0);
    const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    const nextUnitPrice = nextQuantity > 0 ? Math.round(((existingTotal + itemTotal) / nextQuantity) * 100) / 100 : 0;
    const nextSyncSources = mergeQuoteItemSyncSources(existing, item);
    const nextSyncQuantityPerUnit =
      nextSyncSources.length > 0
        ? roundMeasure(nextSyncSources.reduce((sum, source) => sum + source.syncQuantityPerUnit, 0))
        : undefined;

    mergedItems[existingIndex] = {
      ...existing,
      description: getQuoteMaterialBaseDescription(existing.description) || existing.description,
      quantity: nextQuantity,
      unitPrice: nextUnitPrice,
      unit: existing.unit || item.unit || '',
      workArea: mergeUniqueText([existing.workArea, item.workArea], ' / '),
      itemImages: mergeUniqueItemImages(existing.itemImages, item.itemImages),
      technicalNotes: mergeUniqueText([existing.technicalNotes, item.technicalNotes], '\n\n'),
      masterItemId: existing.masterItemId === item.masterItemId ? existing.masterItemId : existing.masterItemId || '',
      masterItemCategory:
        existing.masterItemCategory === item.masterItemCategory
          ? existing.masterItemCategory
          : existing.masterItemCategory || item.masterItemCategory || '',
      masterItemSourceRef:
        existing.masterItemSourceRef === item.masterItemSourceRef
          ? existing.masterItemSourceRef
          : existing.masterItemSourceRef || item.masterItemSourceRef || '',
      syncGroupId: existing.syncGroupId || item.syncGroupId || '',
      syncRole: nextSyncSources.length > 0 ? 'dependent' : existing.syncRole || item.syncRole,
      syncDriverId:
        nextSyncSources.length === 1
          ? nextSyncSources[0].syncDriverId
          : existing.syncDriverId === item.syncDriverId
            ? existing.syncDriverId
            : '',
      syncQuantityPerUnit: nextSyncQuantityPerUnit,
      syncSources: nextSyncSources,
    };
  }

  return mergedItems;
};

const normalizeTechnicalNotes = (value: string | null | undefined) => normalizeTechnicalNotesText(value);

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

const RUBRO_ORDER = [
  'electricidad',
  'plomeria',
  'sanitario',
  'gas',
  'albanileria',
  'pintura',
  'aire acondicionado',
  'refrigeracion',
  'cerrajeria',
  'impermeabilizacion',
  'techos',
  'durlock y yeseria',
  'pisos y revestimientos',
  'carpinteria',
  'herreria',
  'vidrieria y aberturas',
  'soldadura',
  'portones automaticos',
  'alarmas y camaras',
  'redes y datos',
  'calefaccion',
  'energia solar',
  'jardineria y poda',
  'limpieza post obra',
  'control de plagas',
  'mantenimiento de piletas',
  'mantenimiento de consorcios',
  'mantenimiento comercial',
  'banos y cocinas',
  'demolicion',
  'excavaciones',
  'movimiento de suelo',
  'hormigon armado',
  'estructuras metalicas',
  'general',
];
const RUBRO_LABELS: Record<string, string> = {
  electricidad: 'Electricidad',
  plomeria: 'Plomeria',
  sanitario: 'Sanitario',
  gas: 'Gas',
  albanileria: 'Albanileria',
  pintura: 'Pintura',
  'aire acondicionado': 'Aire acondicionado',
  refrigeracion: 'Refrigeracion',
  cerrajeria: 'Cerrajeria',
  impermeabilizacion: 'Impermeabilizacion',
  techos: 'Techos',
  'durlock y yeseria': 'Durlock y yeseria',
  'pisos y revestimientos': 'Pisos y revestimientos',
  carpinteria: 'Carpinteria',
  herreria: 'Herreria',
  'vidrieria y aberturas': 'Vidrieria y aberturas',
  soldadura: 'Soldadura',
  'portones automaticos': 'Portones automaticos',
  'alarmas y camaras': 'Alarmas y camaras',
  'redes y datos': 'Redes y datos',
  calefaccion: 'Calefaccion',
  'energia solar': 'Energia solar',
  'jardineria y poda': 'Jardineria y poda',
  'limpieza post obra': 'Limpieza post obra',
  'control de plagas': 'Control de plagas',
  'mantenimiento de piletas': 'Mantenimiento de piletas',
  'mantenimiento de consorcios': 'Mantenimiento de consorcios',
  'mantenimiento comercial': 'Mantenimiento comercial',
  'banos y cocinas': 'Banos y cocinas',
  demolicion: 'Demolicion',
  excavaciones: 'Excavaciones',
  'movimiento de suelo': 'Movimiento de suelo',
  'hormigon armado': 'Hormigon armado',
  'estructuras metalicas': 'Estructuras metalicas',
  general: 'General',
};
const RUBRO_TOKEN_RULES: Array<{ key: string; tokens: string[] }> = [
  {
    key: 'electricidad',
    tokens: ['electric', 'electrico', 'electrica', 'tablero', 'cableado', 'luminaria', 'tomacorriente', 'enchufe'],
  },
  { key: 'plomeria', tokens: ['plomer', 'griferia', 'agua fria', 'agua caliente', 'destapacion'] },
  { key: 'sanitario', tokens: ['sanitar', 'cloaca', 'desague', 'caneria', 'pluvial'] },
  { key: 'gas', tokens: ['gas', 'calefon', 'termotanque'] },
  { key: 'albanileria', tokens: ['albanil', 'mamposter', 'revoque', 'ladrillo', 'cemento'] },
  { key: 'pintura', tokens: ['pintur', 'enduido', 'esmalte'] },
  { key: 'aire acondicionado', tokens: ['aire acond', 'split'] },
  { key: 'refrigeracion', tokens: ['refriger', 'camara de frio'] },
  { key: 'cerrajeria', tokens: ['cerrajer', 'cerradura', 'llave'] },
  { key: 'impermeabilizacion', tokens: ['impermeab', 'membrana', 'filtracion', 'hidrofugo'] },
  { key: 'techos', tokens: ['techo', 'cubierta', 'chapa', 'canaleta', 'zingueria'] },
  { key: 'durlock y yeseria', tokens: ['durlock', 'yeseria', 'yeso', 'drywall', 'placa de yeso'] },
  { key: 'pisos y revestimientos', tokens: ['piso', 'revest', 'ceram', 'porcelanato', 'baldosa', 'mosaico'] },
  { key: 'carpinteria', tokens: ['carpinter', 'placard', 'mueble de melamina'] },
  { key: 'herreria', tokens: ['herrer', 'reja'] },
  { key: 'vidrieria y aberturas', tokens: ['vidri', 'abertura', 'aluminio'] },
  { key: 'soldadura', tokens: ['soldadur'] },
  { key: 'portones automaticos', tokens: ['porton automatic', 'motor de porton'] },
  { key: 'alarmas y camaras', tokens: ['alarma', 'camara', 'cctv', 'seguridad electronica'] },
  { key: 'redes y datos', tokens: ['red de datos', 'cableado estructurado', 'wifi', 'fibra optica'] },
  { key: 'calefaccion', tokens: ['calefaccion', 'caldera', 'radiador', 'piso radiante'] },
  { key: 'energia solar', tokens: ['energia solar', 'panel solar', 'fotovoltaic', 'termotanque solar'] },
  { key: 'jardineria y poda', tokens: ['jardiner', 'poda', 'parquiz'] },
  { key: 'limpieza post obra', tokens: ['limpieza post obra', 'limpieza final de obra'] },
  { key: 'control de plagas', tokens: ['plaga', 'fumig', 'desratiz', 'desinfeccion'] },
  { key: 'mantenimiento de piletas', tokens: ['pileta', 'piscina'] },
  { key: 'mantenimiento de consorcios', tokens: ['consorcio', 'edificio'] },
  { key: 'mantenimiento comercial', tokens: ['mantenimiento comercial', 'local comercial'] },
  { key: 'banos y cocinas', tokens: ['bano', 'cocina'] },
  { key: 'demolicion', tokens: ['demolic', 'picado'] },
  { key: 'excavaciones', tokens: ['excavacion', 'zanjeo'] },
  { key: 'movimiento de suelo', tokens: ['movimiento de suelo', 'nivelacion', 'compactacion', 'relleno'] },
  { key: 'hormigon armado', tokens: ['hormigon', 'losa', 'viga', 'columna', 'encadenado', 'encofrado'] },
  { key: 'estructuras metalicas', tokens: ['estructura metal', 'perfil metal', 'ipn', 'upn'] },
];

const CATALOG_RUBRO_SOURCE_MAP = new Map<string, string>();
const CATALOG_RUBRO_LABELS = new Map<string, string>();
const CATALOG_RUBRO_ORDER = new Map<string, number>();

rubroCatalog.forEach((rubro, index) => {
  CATALOG_RUBRO_LABELS.set(rubro.slug, rubro.label);
  CATALOG_RUBRO_ORDER.set(rubro.slug, index);
  rubro.sources.forEach((source) => {
    CATALOG_RUBRO_SOURCE_MAP.set(String(source || '').trim().toLowerCase(), rubro.slug);
  });
});

const resolveCatalogRubroFromSource = (sourceRef: string | null | undefined) => {
  const source = String(sourceRef || '').trim().toLowerCase();
  return CATALOG_RUBRO_SOURCE_MAP.get(source) || '';
};

const compareRubroValues = (left: string, right: string) => {
  const leftOrder = CATALOG_RUBRO_ORDER.has(left) ? CATALOG_RUBRO_ORDER.get(left)! : Number.MAX_SAFE_INTEGER;
  const rightOrder = CATALOG_RUBRO_ORDER.has(right) ? CATALOG_RUBRO_ORDER.get(right)! : Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return formatRubroLabel(left).localeCompare(formatRubroLabel(right));
};

const resolveKnownRubro = (normalized: string) => {
  for (const rule of RUBRO_TOKEN_RULES) {
    if (rule.tokens.some((token) => normalized.includes(token))) return rule.key;
  }
  return '';
};

const normalizeRawRubro = (value: string | null | undefined) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const resolveMasterRubro = (item: MasterItemRow) => {
  const catalogRubro = resolveCatalogRubroFromSource(item.source_ref);
  if (catalogRubro) return catalogRubro;

  const primaryRaw = normalizeRawRubro(item.category || item.source_ref);
  const primaryNormalized = normalizeText(primaryRaw);
  const knownFromPrimary = resolveKnownRubro(primaryNormalized);
  if (knownFromPrimary) return knownFromPrimary;
  if (primaryRaw) return primaryRaw;

  const fallbackNormalized = normalizeText(item.name || '');
  const knownFromName = resolveKnownRubro(fallbackNormalized);
  if (knownFromName) return knownFromName;

  return 'general';
};

const formatRubroLabel = (value: string) => {
  const trimmed = value.trim();
  const catalogLabel = CATALOG_RUBRO_LABELS.get(trimmed);
  if (catalogLabel) return catalogLabel;
  return RUBRO_LABELS[trimmed] || trimmed;
};

const getMasterItemChoiceValue = (item: Pick<MasterItemRow, 'name' | 'technical_notes' | 'unit'>) =>
  buildMasterItemChoiceLabel(item);

const getMasterItemTechnicalBadge = (
  item: Pick<MasterItemRow, 'technical_notes'>,
  options?: { maxLength?: number }
) => compactTechnicalNotesText(item.technical_notes, { maxLength: options?.maxLength || 96 });

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

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfAgendaWeek = (date: Date) => {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, diffToMonday));
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const diffCalendarDays = (start: Date, end: Date) =>
  Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000);

const getDatePart = (value?: string | null) => (value ? value.slice(0, 10) : '');

const formatAgendaDateLabel = (value?: string | null) => {
  const date = parseDateLocal(getDatePart(value));
  if (!date) return 'Sin fecha';
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatAgendaRangeLabel = (startValue?: string | null, endValue?: string | null) => {
  const start = parseDateLocal(getDatePart(startValue));
  const end = parseDateLocal(getDatePart(endValue));
  if (!start) return 'Sin fecha definida';
  if (!end) return `${formatAgendaDateLabel(startValue)} · cierre a confirmar`;
  if (isSameDay(start, end)) return formatAgendaDateLabel(startValue);
  return `${formatAgendaDateLabel(startValue)} al ${formatAgendaDateLabel(endValue)}`;
};

const getNotificationGroup = (notification: Pick<NotificationRow, 'type'>): Exclude<NotificationFilter, 'all' | 'unread'> | 'general' => {
  const type = String(notification.type || '').toLowerCase();
  if (type.includes('agenda') || type.includes('schedule')) return 'agenda';
  if (type.includes('quote') || type.includes('presupuesto')) return 'quote';
  return 'general';
};

const formatNotificationDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const buildClientAccessRedirect = (params: URLSearchParams) => {
  const nextParams = new URLSearchParams();
  const mode = params.get('mode');
  if (mode === 'login' || mode === 'register') {
    nextParams.set('mode', mode);
  }
  if (params.get('quick') === '1') {
    nextParams.set('quick', '1');
  }
  const intent = params.get('intent');
  if (intent) {
    nextParams.set('intent', intent);
  }
  const query = nextParams.toString();
  return query ? `/cliente?${query}` : '/cliente';
};

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
  const [loadingProfile, setLoadingProfile] = useState(false);
  const sessionUserIdRef = useRef<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [authWhatsapp, setAuthWhatsapp] = useState('');
  const [quickRegisterMode, setQuickRegisterMode] = useState(false);
  const [autoGoogleStarted, setAutoGoogleStarted] = useState(false);
  const [entryPrompt, setEntryPrompt] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [selectedAccessProfile, setSelectedAccessProfile] = useState<AccessProfile | null>(null);
  const [isDesignPreview, setIsDesignPreview] = useState(false);
  const [accessTransitionProfile, setAccessTransitionProfile] = useState<AccessProfile | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [updatingRecovery, setUpdatingRecovery] = useState(false);
  const authProfileMetadataSyncedRef = useRef('');
  const [isBetaAdmin, setIsBetaAdmin] = useState(false);
  const [adminGateStatus, setAdminGateStatus] = useState<'idle' | 'checking' | 'done'>('idle');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoSelected, setGeoSelected] = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const quoteAddressLookupTimerRef = useRef<number | null>(null);
  const quoteAddressLookupSequenceRef = useRef(0);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportUsers, setSupportUsers] = useState<any[]>([]);
  const [activeSupportUserId, setActiveSupportUserId] = useState<string | null>(null);
  const [supportDraft, setSupportDraft] = useState('');
  const [supportAttachments, setSupportAttachments] = useState<{ file: File; previewUrl: string }[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState('');
  const supportFileInputRef = useRef<HTMLInputElement | null>(null);
  const supportAttachmentsRef = useRef<{ previewUrl: string }[]>([]);
  const supportMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const accessTransitionTimerRef = useRef<number | null>(null);
  const quoteItemsEditorRef = useRef<HTMLDivElement | null>(null);
  const [accessVideoMuted, setAccessVideoMuted] = useState(true);
  const [accessVideoAvailable, setAccessVideoAvailable] = useState(Boolean(ACCESS_VIDEO_URL));
  const [dashboardVideoAvailable, setDashboardVideoAvailable] = useState(Boolean(DASHBOARD_VIDEO_URL));
  const [postLoginVideoAvailable, setPostLoginVideoAvailable] = useState(
    POST_LOGIN_VIDEO_ENABLED && Boolean(POST_LOGIN_VIDEO_URL)
  );
  const [postLoginVideoVisible, setPostLoginVideoVisible] = useState(false);
  const [postLoginVideoPending, setPostLoginVideoPending] = useState(false);
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
  const [dashboardMapFilter, setDashboardMapFilter] = useState<'all' | 'jobs' | 'requests'>('all');
  const [dashboardMapSelectedId, setDashboardMapSelectedId] = useState('');
  const [offerEditorRequestId, setOfferEditorRequestId] = useState('');
  const [offerDraftByRequestId, setOfferDraftByRequestId] = useState<Record<string, RequestOfferDraft>>({});
  const [submittingOfferRequestId, setSubmittingOfferRequestId] = useState('');
  const [offerSuccessByRequestId, setOfferSuccessByRequestId] = useState<Record<string, string>>({});
  const [offerErrorByRequestId, setOfferErrorByRequestId] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState<any>(null);
  const [profileLoadError, setProfileLoadError] = useState('');
  const [technicianLocationResult, setTechnicianLocationResult] = useState<LocationPickerResult | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [uploadingItemImageId, setUploadingItemImageId] = useState<string | null>(null);
  const [deletingItemImageId, setDeletingItemImageId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [quoteActionsOpen, setQuoteActionsOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    country: DEFAULT_COUNTRY_NAME,
    address: '',
    city: '',
    province: '',
    coverageArea: '',
    workingHours: '',
    bio: '',
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
    bannerUrl: '',
    companyLogoUrl: '',
    avatarUrl: '',
    logoShape: 'auto',
    locationPickerResult: null as any,
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
  const lastAttemptedProfileSignatureRef = useRef('');
  const profilePersistInFlightRef = useRef(false);
  const registrationWhatsAppNoticeInFlightRef = useRef(false);
  const welcomeWhatsAppNoticeInFlightRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveMessageTimerRef = useRef<number | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoRatio, setLogoRatio] = useState(1);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [masterItems, setMasterItems] = useState<MasterItemRow[]>([]);
  const [loadingMasterItems, setLoadingMasterItems] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterCategory, setMasterCategory] = useState('all');
  const [quoteCatalogSearch, setQuoteCatalogSearch] = useState('');
  const [quoteCatalogCategory, setQuoteCatalogCategory] = useState('all');
  const [isDesktopNavExpanded, setIsDesktopNavExpanded] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [isMobileFloatingMenuOpen, setIsMobileFloatingMenuOpen] = useState(false);
  const [isMobileDockVisible, setIsMobileDockVisible] = useState(true);
  const mobileScrollYRef = useRef(0);
  const mobileScrollTickingRef = useRef(false);
  const uiTheme = UI_THEME;
  const savingRef = useRef(false);
  const lastSavedItemsSignatureRef = useRef('');
  const lastSavedItemsCountRef = useRef(0);
  const [activeTab, setActiveTab] = useState<
    | 'lobby'
    | 'operativo'
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
  const [profilePanelTab, setProfilePanelTab] = useState<'editor' | 'preview'>('preview');
  const [publicProfileReviewStats, setPublicProfileReviewStats] = useState({
    rating: null as number | null,
    reviewsCount: 0,
    commentsCount: 0,
  });
  const [viewerInput, setViewerInput] = useState('');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all');
  const [openQuoteStep, setOpenQuoteStep] = useState<'client' | 'items' | 'materials' | 'settings'>('client');
  const [editingQuoteItemId, setEditingQuoteItemId] = useState('');
  const [showQuoteDraftPrompt, setShowQuoteDraftPrompt] = useState(false);
  const [quoteLaborLoadMode, setQuoteLaborLoadMode] = useState<QuoteLaborLoadMode>('catalog');
  const [quoteWorkEstimatorMode, setQuoteWorkEstimatorMode] = useState<QuoteWorkEstimatorMode>(
    DEFAULT_QUOTE_ESTIMATOR_MODE
  );
  const [revoqueForm, setRevoqueForm] = useState<RevoqueEstimatorForm>(DEFAULT_REVOQUE_FORM);
  const [mamposteriaForm, setMamposteriaForm] = useState<MamposteriaEstimatorForm>(DEFAULT_MAMPOSTERIA_FORM);
  const [pisoForm, setPisoForm] = useState<PisoEstimatorForm>(DEFAULT_PISO_FORM);
  const [pinturaForm, setPinturaForm] = useState<PinturaEstimatorForm>(DEFAULT_PINTURA_FORM);
  const [clientHistoryFilter, setClientHistoryFilter] = useState<'all' | 'located' | 'pending' | 'paid'>('all');
  const [selectedClientKey, setSelectedClientKey] = useState('');
  const [financeTimelineMode, setFinanceTimelineMode] = useState<FinanceTimelineMode>('monthly');
  const [financeTimelineOffset, setFinanceTimelineOffset] = useState(0);
  const [activeFinancePointKey, setActiveFinancePointKey] = useState<string | null>(null);
  const financeTimelineDragRef = useRef<{ lastX: number } | null>(null);
  const provinceOptions = useMemo(() => getProvinceOptions(profileForm.country), [profileForm.country]);
  const provinceFieldLabel = useMemo(() => getProvinceLabel(profileForm.country), [profileForm.country]);
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);
  const [scheduleSavingId, setScheduleSavingId] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'pending' | 'scheduled'>('all');
  const [agendaWeekOffset, setAgendaWeekOffset] = useState(0);
  const activeThemeStyles = themeStyles;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const initialMode = params.get('mode');
    const designPreviewEnabled =
      process.env.NODE_ENV !== 'production' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      params.get('preview') === 'panel';
    setIsDesignPreview(designPreviewEnabled);
    if (designPreviewEnabled) {
      setSelectedAccessProfile('tecnico');
      setAuthMode('login');
      setQuickRegisterMode(false);
      setProfileHydrated(true);
      setLoadingProfile(false);
      setAdminGateStatus('done');
      setIsBetaAdmin(false);
      setProfileForm((prev) => ({
        ...prev,
        fullName: prev.fullName || 'UrbanFix QA',
        businessName: prev.businessName || 'UrbanFix QA Técnica',
        email: prev.email || 'preview@urbanfix.local',
        phone: prev.phone || '+54 9 11 0000-0000',
        city: prev.city || 'Buenos Aires',
        address: prev.address || 'Vista previa local',
        profilePublished: true,
      }));
      setQuotes(PREVIEW_TECHNICIAN_QUOTES.map(normalizeQuoteRow));
    }
    const nextPath = sanitizeNextPath(params.get('next'));
    const intent = params.get('intent');
    if (nextPath) {
      window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, nextPath);
    }
    if (intent === PRICE_ACCESS_INTENT) {
      setEntryPrompt('Para ver los precios de mano de obra actualizados, inicia sesión o crea tu cuenta.');
      setAuthMode('login');
      setQuickRegisterMode(false);
    } else {
      setEntryPrompt('');
    }
    const incomingProfile = (params.get('perfil') || params.get('audience') || '').toLowerCase();
    const explicitTechnicianAccess = incomingProfile === 'tecnico' || incomingProfile === 'empresa';
    if (explicitTechnicianAccess) {
      clearAuthAccessProfileIntent();
    }
    if (incomingProfile === 'cliente') {
      setAuthAccessProfileIntent('cliente');
      window.location.replace(buildClientAccessRedirect(params));
      return;
    }
    if (
      getAuthAccessProfileIntent() === 'cliente' &&
      !explicitTechnicianAccess &&
      params.get('recovery') !== '1'
    ) {
      window.location.replace(buildClientAccessRedirect(params));
      return;
    }
    if (isAccessProfile(incomingProfile)) {
      setSelectedAccessProfile(incomingProfile);
    }
    if (initialMode === 'register') {
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
    const incomingTab = (params.get('tab') || params.get('view') || '').toLowerCase();
    if (isTechnicianDashboardTab(incomingTab)) {
      setActiveTab(incomingTab);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (quoteAddressLookupTimerRef.current) {
        window.clearTimeout(quoteAddressLookupTimerRef.current);
        quoteAddressLookupTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user) return;
    const params = new URLSearchParams(window.location.search);
    const nextPath = sanitizeNextPath(params.get('next'));
    if (!nextPath) return;
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    window.location.replace(nextPath);
  }, [session?.user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user) return;
    const accountType = getAuthUserProfileFromMetadata(session.user.user_metadata);
    if (accountType !== 'cliente') return;
    clearAuthAccessProfileIntent();
    window.location.replace('/cliente');
  }, [session?.user?.id, session?.user?.user_metadata?.profile, session?.user?.user_metadata?.user_type]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const user = session?.user;
    if (!user?.id) {
      authProfileMetadataSyncedRef.current = '';
      return;
    }

    const currentProfile = getAuthUserProfileFromMetadata(user.user_metadata);
    if (currentProfile === 'cliente') return;

    const intendedProfile = getAuthAccessProfileIntent();
    const nextProfile =
      currentProfile === 'tecnico' || currentProfile === 'empresa'
        ? currentProfile
        : intendedProfile === 'tecnico' || intendedProfile === 'empresa'
          ? intendedProfile
          : selectedAccessProfile === 'tecnico' || selectedAccessProfile === 'empresa'
            ? selectedAccessProfile
            : null;

    if (!nextProfile) return;

    setSelectedAccessProfile(nextProfile);
    if (currentProfile === nextProfile) {
      clearAuthAccessProfileIntent();
      authProfileMetadataSyncedRef.current = '';
      return;
    }

    const syncKey = `${user.id}:${nextProfile}`;
    if (authProfileMetadataSyncedRef.current === syncKey) return;
    authProfileMetadataSyncedRef.current = syncKey;

    supabase.auth
      .updateUser({
        data: {
          user_type: nextProfile,
          profile: nextProfile,
        },
      })
      .then(({ error }) => {
        if (error) {
          authProfileMetadataSyncedRef.current = '';
          return;
        }
        clearAuthAccessProfileIntent();
      });
  }, [
    selectedAccessProfile,
    session?.user?.id,
    session?.user?.user_metadata,
    session?.user?.user_metadata?.profile,
    session?.user?.user_metadata?.user_type,
  ]);

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
    window.localStorage.removeItem(LEGACY_UI_THEME_STORAGE_KEY);
    document.documentElement.style.colorScheme = UI_THEME;
  }, []);

  useEffect(() => {
    return () => {
      if (accessTransitionTimerRef.current) {
        window.clearTimeout(accessTransitionTimerRef.current);
      }
    };
  }, []);

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
    if (accessTransitionTimerRef.current) {
      window.clearTimeout(accessTransitionTimerRef.current);
      accessTransitionTimerRef.current = null;
    }
    setAccessTransitionProfile(profile);
    setAuthError('');
    setAuthNotice('');
    setShowAuthPassword(false);

    accessTransitionTimerRef.current = window.setTimeout(() => {
      accessTransitionTimerRef.current = null;
      setAccessTransitionProfile(null);

      if (profile === 'cliente') {
        if (typeof window !== 'undefined') {
          setAuthAccessProfileIntent('cliente');
          const clientParams = new URLSearchParams();
          clientParams.set('mode', authMode);
          const currentParams = new URLSearchParams(window.location.search);
          const nextPath = sanitizeNextPath(currentParams.get('next'));
          if (nextPath) {
            clientParams.set('next', nextPath);
          }
          const intent = currentParams.get('intent');
          if (intent) {
            clientParams.set('intent', intent);
          }
          window.location.href = `/cliente?${clientParams.toString()}`;
        }
        return;
      }
      clearAuthAccessProfileIntent();
      setSelectedAccessProfile(profile);
      setAccessProfileInUrl(profile);
    }, 240);
  };

  const handleBackToProfileSelector = () => {
    if (accessTransitionTimerRef.current) {
      window.clearTimeout(accessTransitionTimerRef.current);
      accessTransitionTimerRef.current = null;
    }
    setAccessTransitionProfile(null);
    setSelectedAccessProfile(null);
    setAutoGoogleStarted(false);
    setQuickRegisterMode(false);
    setAuthError('');
    setAuthNotice('');
    setGoogleAuthLoading(false);
    setShowAuthPassword(false);
    clearAuthAccessProfileIntent();
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
    { key: 'operativo', label: 'Mapa operativo', hint: 'Solicitudes por zona', short: 'MP', icon: Search },
    { key: 'presupuestos', label: 'Presupuestos', hint: 'Ver estado', short: 'PR', icon: FileText },
    { key: 'visualizador', label: 'Visualizador', hint: 'Ver presupuesto', short: 'VI', icon: Eye },
    { key: 'agenda', label: 'Agenda', hint: 'Planificacion', short: 'AG', icon: Calendar },
    { key: 'notificaciones', label: 'Notificaciones', hint: 'Alertas', short: 'NO', icon: Bell },
    { key: 'soporte', label: 'Soporte', hint: 'Chat beta', short: 'CH', icon: MessageCircle },
    { key: 'historial', label: 'Facturación', hint: 'Cobros', short: 'FA', icon: Clock },
    { key: 'perfil', label: 'Perfil', hint: 'Datos del negocio', short: 'PF', icon: User },
    { key: 'precios', label: 'Precios', hint: 'Mano de obra', short: 'PM', icon: Tag },
  ];
  const technicianSidebarAccountLabel =
    profile?.business_name || profile?.full_name || session?.user?.email || 'Tu cuenta';

  const activeNavKey = activeTab === 'nuevo' ? 'presupuestos' : activeTab;
  const isFullBleedContent =
    activeTab === 'operativo' || (activeTab === 'perfil' && profilePanelTab === 'preview');
  const mobilePrimaryNavItems = navItems.filter(
    (item) =>
      item.key === 'lobby' ||
      item.key === 'operativo' ||
      item.key === 'presupuestos' ||
      item.key === 'agenda' ||
      item.key === 'perfil'
  );
  const mobileSecondaryNavItems = navItems.filter(
    (item) => !mobilePrimaryNavItems.some((primaryItem) => primaryItem.key === item.key)
  );
  const isMobileSecondaryActive = mobileSecondaryNavItems.some((item) => item.key === activeNavKey);
  const isMobileDockShown = isMobileDockVisible || isMobileToolsOpen;
  const isProfileUnderReview = Boolean(session?.user && profileHydrated && profile && profile.access_granted !== true);
  const activeSupportLabel = useMemo(() => {
    if (isBetaAdmin) {
      return (
        supportUsers.find((user) => user.userId === activeSupportUserId)?.label || 'Selecciona un usuario'
      );
    }
    return profile?.business_name || session?.user?.email || 'Tu cuenta';
  }, [activeSupportUserId, isBetaAdmin, profile?.business_name, session?.user?.email, supportUsers]);

  const statusOptions = [
    { value: 'draft', label: 'Cómputo' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'presented', label: 'Presentado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'scheduled', label: 'Programado' },
    { value: 'in_progress', label: 'En curso' },
    { value: 'completed', label: 'Finalizado' },
    { value: 'paid', label: 'Cobrado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'discarded', label: 'Desestimado' },
    { value: 'cancelled', label: 'Cancelado' },
    { value: 'expired', label: 'Vencido' },
  ];
  const quoteFilterOptions: Array<{ key: QuoteFilter; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'draft', label: 'Cómputo' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'scheduled', label: 'Programados' },
    { key: 'in_progress', label: 'En curso' },
    { key: 'completed', label: 'Finalizados' },
    { key: 'paid', label: 'Cobrados' },
    { key: 'rejected', label: 'Rechazados' },
    { key: 'discarded', label: 'Desestimados' },
    { key: 'cancelled', label: 'Cancelados' },
    { key: 'expired', label: 'Vencidos' },
  ];
  const activeQuoteFilterLabel = quoteFilterOptions.find((option) => option.key === quoteFilter)?.label || 'Todos';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    mobileScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (mobileScrollTickingRef.current) return;
      mobileScrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - mobileScrollYRef.current;

        if (Math.abs(delta) > 10) {
          const scrollingUp = delta < 0;
          setIsMobileDockVisible(scrollingUp || currentY < 80);
          if (!scrollingUp && currentY > 80) {
            setIsMobileToolsOpen(false);
          }
          mobileScrollYRef.current = currentY;
        }

        mobileScrollTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const designPreviewEnabled =
        typeof window !== 'undefined' &&
        process.env.NODE_ENV !== 'production' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        params?.get('preview') === 'panel';
      if (!designPreviewEnabled) {
        setAuthError(supabaseConfigError);
      }
      setLoadingSession(false);
      setLoadingProfile(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionUserIdRef.current = session?.user?.id ?? null;
      void syncAuthAccessTokenCookie(session?.access_token);
      setSession(session);
      setLoadingProfile(Boolean(session?.user));
      setLoadingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
      const previousUserId = sessionUserIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;
      sessionUserIdRef.current = nextUserId;
      void syncAuthAccessTokenCookie(nextSession?.access_token);
      setSession(nextSession);
      if (previousUserId !== nextUserId) {
        setLoadingProfile(Boolean(nextSession?.user));
      } else if (!nextUserId) {
        setLoadingProfile(false);
      }
      if (POST_LOGIN_VIDEO_ENABLED && event === 'SIGNED_IN' && nextSession?.user) {
        setPostLoginVideoPending(true);
      }
      if (event === 'SIGNED_OUT') {
        setPostLoginVideoPending(false);
        setPostLoginVideoVisible(false);
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
    if (!session?.user) {
      setLoadingProfile(false);
      setProfile(null);
      setProfileLoadError('');
      setTechnicianLocationResult(null);
      setProfileHydrated(false);
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
        .maybeSingle();
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
      setLoadingProfile(false);
      return;
    }
    const load = async () => {
      setLoadingProfile(true);
      setProfileHydrated(false);
      setProfileLoadError('');

      const fallback = {
        id: session.user.id,
        email: session.user.email || null,
        full_name: session.user.user_metadata?.full_name || '',
        business_name: session.user.user_metadata?.business_name || '',
        phone: session.user.user_metadata?.phone || '',
        profile_published: false,
        profile_published_at: null,
      };

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      let resolvedProfile = profileData || null;
      if (error) {
        setProfile(null);
        setProfileLoadError(error.message || 'No pudimos cargar tu perfil técnico.');
        setLoadingProfile(false);
        return;
      }

      if (!profileData) {
        const { data: createdProfile, error: createProfileError } = await supabase
          .from('profiles')
          .upsert(fallback)
          .select()
          .single();

        if (createProfileError) {
          setProfile(null);
          setProfileLoadError(createProfileError.message || 'No pudimos preparar tu perfil inicial.');
          setLoadingProfile(false);
          return;
        }

        resolvedProfile = createdProfile || fallback;
      }

      const sessionEmail = String(session.user.email || '').trim().toLowerCase();
      if (resolvedProfile && sessionEmail && !String(resolvedProfile.email || '').trim()) {
        const profileEmailPatch = {
          email: sessionEmail,
        };
        resolvedProfile = { ...resolvedProfile, ...profileEmailPatch };
        void supabase.from('profiles').update(profileEmailPatch).eq('id', session.user.id);
      }

      setProfile(resolvedProfile);
      setProfileLoadError('');
      await fetchQuotes(session.user.id);
      await fetchNotifications(session.user.id);
      await fetchMasterItems();
      setLoadingProfile(false);
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
    const countryHint = inferCountryFromCandidates(
      profile.country,
      profile.service_location_name,
      profile.company_address,
      profile.address
    );
    const provinceHint = extractProvinceHintForCountry(
      countryHint,
      profile.service_location_name,
      profile.company_address,
      profile.address,
      profile.coverage_area,
      profile.city
    );
    const localityHint = extractLocalityHint(
      profile.city,
      profile.service_location_name,
      profile.company_address,
      profile.address,
      profile.coverage_area
    );
    
    // Parse location from profile
    const locationResult = parseTechnicianLocation(profile);
    setTechnicianLocationResult(locationResult);
    
    setProfileForm({
      fullName: profile.full_name || '',
      businessName: profile.business_name || '',
      email: profile.email || session?.user?.email || '',
      phone: profile.phone || '',
      country: countryHint,
      address: profile.company_address || profile.address || '',
      city: localityHint || profile.city || '',
      province: provinceHint,
      coverageArea,
      workingHours: formatWorkingHoursLabel(workingHoursConfig),
      bio: profile.references_summary || '',
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
      bannerUrl: profile.banner_url || profile.company_logo_url || '',
      companyLogoUrl: profile.company_logo_url || legacyLogoUrl || '',
      avatarUrl: hasLegacyLogo ? '' : profile.avatar_url || '',
      logoShape: profile.logo_shape || 'auto',
      locationPickerResult: locationResult,
    });
    setBankAccountType(detectedBankType);
    setCustomPaymentMethodDraft('');
    setCertificationFiles(parsedCertifications.files);
    setCertificationFilesError('');
    setProfileHydrated(true);
  }, [profile, session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoadingProfile(false);
      setProfileHydrated(false);
      setAutoSaveBootstrapped(false);
      setAutoSaveState('idle');
      setAutoSaveMessage('');
      lastPersistedProfileSignatureRef.current = '';
      lastAttemptedProfileSignatureRef.current = '';
      return;
    }
    setAutoSaveBootstrapped(false);
    setAutoSaveState('idle');
    setAutoSaveMessage('');
    lastPersistedProfileSignatureRef.current = '';
    lastAttemptedProfileSignatureRef.current = '';
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
    const hasNearbyContext =
      Boolean(technicianLocationResult?.isValid) ||
      Boolean(String(profile?.company_address || profile?.address || '').trim()) ||
      Boolean(String(profile?.city || '').trim());
    if (
      !session?.user ||
      !profileHydrated ||
      profile?.access_granted !== true ||
      !hasNearbyContext ||
      (activeTab !== 'lobby' && activeTab !== 'operativo')
    )
      return;
    fetchNearbyRequests();
  }, [
    activeTab,
    profile?.access_granted,
    profile?.address,
    profile?.city,
    profile?.company_address,
    profileHydrated,
    session?.access_token,
    session?.user?.id,
    technicianLocationResult?.isValid,
  ]);

  useEffect(() => {
    const hasNearbyContext =
      Boolean(technicianLocationResult?.isValid) ||
      Boolean(String(profile?.company_address || profile?.address || '').trim()) ||
      Boolean(String(profile?.city || '').trim());
    if (
      !session?.user ||
      !profileHydrated ||
      profile?.access_granted !== true ||
      !hasNearbyContext ||
      (activeTab !== 'lobby' && activeTab !== 'operativo')
    )
      return;
    const timer = window.setInterval(() => {
      fetchNearbyRequests();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [
    activeTab,
    profile?.access_granted,
    profile?.address,
    profile?.city,
    profile?.company_address,
    profileHydrated,
    session?.access_token,
    session?.user?.id,
    technicianLocationResult?.isValid,
  ]);

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
    if (isDesignPreview) {
      setQuotes(PREVIEW_TECHNICIAN_QUOTES.map(normalizeQuoteRow));
      return;
    }
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
    const hasNearbyContext =
      Boolean(technicianLocationResult?.isValid) ||
      Boolean(String(profile?.company_address || profile?.address || '').trim()) ||
      Boolean(String(profile?.city || '').trim());
    if (!session?.access_token || !profileHydrated || profile?.access_granted !== true || !hasNearbyContext) {
      setNearbyRequests([]);
      setNearbyRequestsError('');
      setNearbyRequestsWarning('');
      return;
    }
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

  const handleRequestOfferDraftChange = <Field extends keyof RequestOfferDraft>(
    request: NearbyRequestRow,
    field: Field,
    value: RequestOfferDraft[Field]
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
      [request.id]: {
        ...(prev[request.id] || buildRequestOfferDraft(request)),
        responseType: 'application',
      },
    }));
    setOfferEditorRequestId((prev) => (prev === request.id ? '' : request.id));
  };

  const handleSubmitRequestOffer = async (request: NearbyRequestRow) => {
    if (!session?.access_token) return;
    const draft = getRequestOfferDraft(request);
    const responseType: RequestResponseType = 'application';
    const responseMessage = String(draft.message || '').trim() || DEFAULT_REQUEST_APPLICATION_MESSAGE;
    const visitEtaValue = parseEtaInput(draft.visitEtaHours);
    if (visitEtaValue === null || visitEtaValue <= 0) {
      setOfferErrorByRequestId((prev) => ({
        ...prev,
        [request.id]: 'Indica en cuantas horas puedes coordinar.',
      }));
      setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
      return;
    }
    if (responseMessage.length < 12) {
      setOfferErrorByRequestId((prev) => ({
        ...prev,
        [request.id]: 'Escribe un mensaje breve para el cliente.',
      }));
      setOfferSuccessByRequestId((prev) => ({ ...prev, [request.id]: '' }));
      return;
    }

    const visitEtaHours = Math.max(1, Math.min(720, Math.round(visitEtaValue)));
    const requestBody: Record<string, unknown> = {
      response_type: responseType,
      visit_eta_hours: visitEtaHours,
      message: responseMessage,
    };

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
        body: JSON.stringify(requestBody),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo enviar la respuesta.');
      }

      setNearbyRequests((prev) =>
        prev.map((row) =>
          row.id === request.id
            ? {
                ...row,
                status: String(payload?.request?.status || row.status || 'quoted'),
                my_quote_status: String(payload?.request?.my_quote_status || 'submitted'),
                my_response_type: String(payload?.request?.my_response_type || responseType),
                my_response_message: String(payload?.request?.my_response_message || responseMessage),
                my_visit_eta_hours:
                  payload?.request?.my_visit_eta_hours === null || payload?.request?.my_visit_eta_hours === undefined
                    ? visitEtaHours
                    : Number(payload.request.my_visit_eta_hours),
                my_price_ars: null,
                my_eta_hours: null,
                my_quote_updated_at: String(payload?.request?.my_quote_updated_at || new Date().toISOString()),
              }
            : row
        )
      );
      setOfferDraftByRequestId((prev) => ({
        ...prev,
        [request.id]: {
          responseType,
          priceArs: '',
          etaHours: '',
          visitEtaHours: String(visitEtaHours),
          message: responseMessage,
        },
      }));
      setOfferSuccessByRequestId((prev) => ({
        ...prev,
        [request.id]: String(payload?.message || 'Respuesta enviada correctamente.'),
      }));
      setOfferErrorByRequestId((prev) => ({ ...prev, [request.id]: '' }));
      setOfferEditorRequestId('');
    } catch (error: any) {
      setOfferErrorByRequestId((prev) => ({
        ...prev,
        [request.id]: error?.message || 'No se pudo enviar la respuesta.',
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

  const applyQuoteScheduleLocally = (quoteId: string, startDate: string | null, endDate: string | null) => {
    setQuotes((prev) =>
      prev.map((item) => (item.id === quoteId ? { ...item, start_date: startDate, end_date: endDate } : item))
    );
  };

  const commitQuoteSchedule = (quoteId: string, startDate: string | null, endDate: string | null) => {
    applyQuoteScheduleLocally(quoteId, startDate, endDate);
    void handleScheduleUpdate(quoteId, startDate || '', endDate || '');
  };

  const fetchMasterItems = async () => {
    setLoadingMasterItems(true);
    const buildSelectFields = (includeActive: boolean, includeTechnicalNotes: boolean, includeUnit: boolean) =>
      [
        'id',
        'name',
        'type',
        'suggested_price',
        'category',
        'source_ref',
        includeTechnicalNotes ? 'technical_notes' : null,
        includeUnit ? 'unit' : null,
        includeActive ? 'active' : null,
        'created_at',
      ]
        .filter(Boolean)
        .join(',');

    const variants = [
      { includeActive: true, includeTechnicalNotes: true, includeUnit: true },
      { includeActive: true, includeTechnicalNotes: true, includeUnit: false },
      { includeActive: true, includeTechnicalNotes: false, includeUnit: false },
      { includeActive: false, includeTechnicalNotes: true, includeUnit: true },
      { includeActive: false, includeTechnicalNotes: true, includeUnit: false },
      { includeActive: false, includeTechnicalNotes: false, includeUnit: false },
    ];

    try {
      let lastError: any = null;
      for (const variant of variants) {
        let query = supabase
          .from('master_items')
          .select(buildSelectFields(variant.includeActive, variant.includeTechnicalNotes, variant.includeUnit))
          .in('type', ['labor', 'material', 'consumable']);
        if (variant.includeActive) {
          query = query.eq('active', true).order('active', { ascending: false });
        }
        const { data, error } = await query.order('category', { ascending: true }).order('name', { ascending: true });
        if (!error) {
          const rows = ((data as unknown) as MasterItemRow[]) || [];
          setMasterItems(rows);
          return rows;
        }
        lastError = error;
      }

      throw lastError || new Error('No se pudo cargar master_items.');
    } catch (error) {
      console.error('Error cargando master items:', error);
      return [];
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
    setOpenQuoteStep('client');
    setShowQuoteDraftPrompt(false);
    setQuoteLaborLoadMode('catalog');
    setQuoteWorkEstimatorMode(DEFAULT_QUOTE_ESTIMATOR_MODE);
    setRevoqueForm(DEFAULT_REVOQUE_FORM);
    setMamposteriaForm(DEFAULT_MAMPOSTERIA_FORM);
    setPisoForm(DEFAULT_PISO_FORM);
    setPinturaForm(DEFAULT_PINTURA_FORM);
    lastSavedItemsSignatureRef.current = '';
    lastSavedItemsCountRef.current = 0;
  };

  const startNewQuote = () => {
    resetForm();
    setShowQuoteDraftPrompt(draftQuotes.length > 0);
    setActiveTab('nuevo');
  };

  const startEditQuote = async (quote: QuoteRow) => {
    await loadQuote(quote, 'nuevo');
  };

  const loadQuote = async (quote: QuoteRow, targetTab: 'presupuestos' | 'nuevo' = 'presupuestos') => {
    setActiveTab(targetTab);
    setShowQuoteDraftPrompt(false);
    if (targetTab === 'nuevo') {
      setOpenQuoteStep('client');
      setQuoteLaborLoadMode('catalog');
      setQuoteWorkEstimatorMode(DEFAULT_QUOTE_ESTIMATOR_MODE);
      setRevoqueForm(DEFAULT_REVOQUE_FORM);
      setMamposteriaForm(DEFAULT_MAMPOSTERIA_FORM);
      setPisoForm(DEFAULT_PISO_FORM);
      setPinturaForm(DEFAULT_PINTURA_FORM);
    }
    setActiveQuoteId(quote.id);
    setClientName(quote.client_name || '');
    setClientAddress(getQuoteAddress(quote));
    const quoteCoordinate = resolveQuoteMapCoordinate(quote);
    if (quoteCoordinate) {
      setGeoSelected({
        display_name: quote.location_address || getQuoteAddress(quote) || 'Ubicacion',
        lat: quoteCoordinate.lat,
        lon: quoteCoordinate.lon,
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
      const syncRole: ItemForm['syncRole'] =
        item?.metadata?.sync_role === 'driver' || item?.metadata?.syncRole === 'driver'
          ? 'driver'
          : item?.metadata?.sync_role === 'dependent' || item?.metadata?.syncRole === 'dependent'
            ? 'dependent'
            : undefined;
      return {
        id: item.id?.toString() || `item-${Math.random().toString(36).slice(2)}`,
        description: item.description || '',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unit_price || 0),
        unit: String(item?.metadata?.unit || ''),
        workArea: String(item?.metadata?.work_area || item?.metadata?.workArea || ''),
        itemImages: normalizeQuoteItemImages(item?.metadata?.item_images || item?.metadata?.itemImages),
        technicalNotes: normalizeTechnicalNotes(item?.metadata?.technical_notes || item?.metadata?.technicalNotes || ''),
        masterItemId: String(item?.metadata?.master_item_id || ''),
        masterItemCategory: String(item?.metadata?.master_item_category || ''),
        masterItemSourceRef: String(item?.metadata?.master_item_source_ref || ''),
        syncGroupId: String(item?.metadata?.sync_group_id || item?.metadata?.syncGroupId || ''),
        syncRole,
        syncDriverId: String(item?.metadata?.sync_driver_id || item?.metadata?.syncDriverId || ''),
        syncQuantityPerUnit: toAmountValue(
          item?.metadata?.sync_quantity_per_unit ?? item?.metadata?.syncQuantityPerUnit ?? 0
        ),
        syncSources: normalizeQuoteItemSyncSources(item?.metadata?.sync_sources || item?.metadata?.syncSources || []),
        type: normalizedType as 'labor' | 'material',
      };
    });
    const hydratedItems = mergeQuoteMaterialItems(
      mapped.map((item) => mergeItemWithMasterItem(item, { fillNotesFromMaster: true }))
    );
    setItems(hydratedItems);
    setEditingQuoteItemId('');
    lastSavedItemsSignatureRef.current = buildItemsSignature(
      hydratedItems.filter((item) => item.description.trim())
    );
    lastSavedItemsCountRef.current = hydratedItems.filter((item) => item.description.trim()).length;
    await fetchAttachments(quote.id);
  };

  const addMasterItemToQuote = (item: MasterItemRow) => {
    const nextItemId = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setActiveTab('nuevo');
    setOpenQuoteStep(item.type === 'labor' ? 'items' : 'materials');
    setItems((prev) =>
      mergeQuoteMaterialItems([
        ...prev,
        {
          id: nextItemId,
          description: item.name,
          quantity: 1,
          unitPrice: getMasterItemSuggestedPrice(item),
          unit: item.unit || '',
          workArea: '',
          itemImages: [],
          technicalNotes: mergeUniqueText(
            [normalizeTechnicalNotes(item.technical_notes), buildLaborPriceUpdateNote(item)],
            '\n\n'
          ),
          masterItemId: item.id,
          masterItemCategory: item.category || '',
          masterItemSourceRef: item.source_ref || '',
          type: item.type === 'labor' ? 'labor' : 'material',
        },
      ])
    );
    setEditingQuoteItemId(nextItemId);
    focusQuoteItemsEditor();
  };

  const handleAddItem = (type: 'labor' | 'material' = 'labor') => {
    const nextItemId = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOpenQuoteStep(type === 'material' ? 'materials' : 'items');
    setItems((prev) => [
      ...prev,
      {
        id: nextItemId,
        description: '',
        quantity: 1,
        unitPrice: 0,
        unit: type === 'labor' ? 'm2' : '',
        workArea: '',
        itemImages: [],
        technicalNotes: '',
        masterItemId: '',
        masterItemCategory: '',
        masterItemSourceRef: '',
        type,
      },
    ]);
    setEditingQuoteItemId(nextItemId);
  };

  const focusQuoteItemsEditor = () => {
    window.setTimeout(() => {
      quoteItemsEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const materialMasterItems = useMemo(
    () => masterItems.filter((item) => ['material', 'consumable'].includes(String(item.type))),
    [masterItems]
  );
  const revoqueMaterialMasterItems = useMemo<Record<RevoqueMaterialPriceField, MasterItemRow | null>>(
    () => ({
      cementBagPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        REVOQUE_MATERIAL_PRICE_LOOKUPS.cementBagPrice
      ),
      limeBagPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        REVOQUE_MATERIAL_PRICE_LOOKUPS.limeBagPrice
      ),
      sandM3Price: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        REVOQUE_MATERIAL_PRICE_LOOKUPS.sandM3Price
      ),
      waterproofLiterPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        REVOQUE_MATERIAL_PRICE_LOOKUPS.waterproofLiterPrice
      ),
    }),
    [materialMasterItems]
  );
  const mamposteriaMaterialMasterItems = useMemo<Record<MamposteriaMaterialPriceField, MasterItemRow | null>>(
    () => ({
      brickUnitPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        MAMPOSTERIA_BRICK_PRICE_LOOKUPS[mamposteriaForm.workType]
      ),
      cementBagPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        SHARED_MATERIAL_LOOKUPS.cementBagPrice
      ),
      limeBagPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        SHARED_MATERIAL_LOOKUPS.limeBagPrice
      ),
      sandM3Price: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        SHARED_MATERIAL_LOOKUPS.sandM3Price
      ),
    }),
    [materialMasterItems, mamposteriaForm.workType]
  );
  const pisoMaterialMasterItems = useMemo<Record<PisoMaterialPriceField, MasterItemRow | null>>(
    () => ({
      tileM2Price: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        PISO_MATERIAL_PRICE_LOOKUPS.tileM2Price
      ),
      adhesiveBagPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        PISO_MATERIAL_PRICE_LOOKUPS.adhesiveBagPrice
      ),
      groutKgPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        PISO_MATERIAL_PRICE_LOOKUPS.groutKgPrice
      ),
    }),
    [materialMasterItems]
  );
  const pinturaMaterialMasterItems = useMemo<Record<PinturaMaterialPriceField, MasterItemRow | null>>(
    () => ({
      paintLiterPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        PINTURA_MATERIAL_PRICE_LOOKUPS.paintLiterPrice
      ),
      primerLiterPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        PINTURA_MATERIAL_PRICE_LOOKUPS.primerLiterPrice
      ),
      puttyKgPrice: resolveTemplateMaterialMasterItem(
        materialMasterItems,
        PINTURA_MATERIAL_PRICE_LOOKUPS.puttyKgPrice
      ),
    }),
    [materialMasterItems]
  );
  const revoqueSuggestedMaterialInputs = useMemo<Record<RevoqueMaterialPriceField, string>>(
    () => ({
      cementBagPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(revoqueMaterialMasterItems.cementBagPrice)),
      limeBagPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(revoqueMaterialMasterItems.limeBagPrice)),
      sandM3Price: formatSuggestedPriceInput(getMasterItemSuggestedPrice(revoqueMaterialMasterItems.sandM3Price)),
      waterproofLiterPrice: formatSuggestedPriceInput(
        getMasterItemSuggestedPrice(revoqueMaterialMasterItems.waterproofLiterPrice)
      ),
    }),
    [revoqueMaterialMasterItems]
  );
  const mamposteriaSuggestedMaterialInputs = useMemo<Record<MamposteriaMaterialPriceField, string>>(
    () => ({
      brickUnitPrice: formatSuggestedPriceInput(
        getMasterItemSuggestedPrice(mamposteriaMaterialMasterItems.brickUnitPrice)
      ),
      cementBagPrice: formatSuggestedPriceInput(
        getMasterItemSuggestedPrice(mamposteriaMaterialMasterItems.cementBagPrice)
      ),
      limeBagPrice: formatSuggestedPriceInput(
        getMasterItemSuggestedPrice(mamposteriaMaterialMasterItems.limeBagPrice)
      ),
      sandM3Price: formatSuggestedPriceInput(
        getMasterItemSuggestedPrice(mamposteriaMaterialMasterItems.sandM3Price)
      ),
    }),
    [mamposteriaMaterialMasterItems]
  );
  const pisoSuggestedMaterialInputs = useMemo<Record<PisoMaterialPriceField, string>>(
    () => ({
      tileM2Price: formatSuggestedPriceInput(getMasterItemSuggestedPrice(pisoMaterialMasterItems.tileM2Price)),
      adhesiveBagPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(pisoMaterialMasterItems.adhesiveBagPrice)),
      groutKgPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(pisoMaterialMasterItems.groutKgPrice)),
    }),
    [pisoMaterialMasterItems]
  );
  const pinturaSuggestedMaterialInputs = useMemo<Record<PinturaMaterialPriceField, string>>(
    () => ({
      paintLiterPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(pinturaMaterialMasterItems.paintLiterPrice)),
      primerLiterPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(pinturaMaterialMasterItems.primerLiterPrice)),
      puttyKgPrice: formatSuggestedPriceInput(getMasterItemSuggestedPrice(pinturaMaterialMasterItems.puttyKgPrice)),
    }),
    [pinturaMaterialMasterItems]
  );
  const getRevoqueMaterialUnitPrice = (field: RevoqueMaterialPriceField) =>
    toNumber(revoqueForm[field]) || getMasterItemSuggestedPrice(revoqueMaterialMasterItems[field]);
  const getMamposteriaMaterialUnitPrice = (field: MamposteriaMaterialPriceField) =>
    toNumber(mamposteriaForm[field]) || getMasterItemSuggestedPrice(mamposteriaMaterialMasterItems[field]);
  const getPisoMaterialUnitPrice = (field: PisoMaterialPriceField) =>
    toNumber(pisoForm[field]) || getMasterItemSuggestedPrice(pisoMaterialMasterItems[field]);
  const getPinturaMaterialUnitPrice = (field: PinturaMaterialPriceField) =>
    toNumber(pinturaForm[field]) || getMasterItemSuggestedPrice(pinturaMaterialMasterItems[field]);

  const selectedRevoqueType =
    REVOQUE_WORK_TYPES.find((option) => option.key === revoqueForm.workType) || REVOQUE_WORK_TYPES[0];
  const revoqueManualSurface = toNumber(revoqueForm.surfaceM2);
  const revoqueLinearMeters = toNumber(revoqueForm.linearMeters);
  const revoqueHeightMeters = toNumber(revoqueForm.heightMeters);
  const revoqueOpeningsM2 = toNumber(revoqueForm.openingsM2);
  const revoqueMeasuredSurface = Math.max(0, revoqueLinearMeters * revoqueHeightMeters - revoqueOpeningsM2);
  const revoqueNetSurface = roundMeasure(revoqueManualSurface > 0 ? revoqueManualSurface : revoqueMeasuredSurface);
  const revoqueLaborPrice = toNumber(revoqueForm.laborPrice);
  const revoqueMaterialPrice = toNumber(revoqueForm.materialPrice);
  const revoqueMaterialWastePercent = toNumber(revoqueForm.materialWastePercent);
  const revoqueMaterialLines = buildMaterialEstimateLines(
    revoqueNetSurface,
    revoqueMaterialWastePercent,
    REVOQUE_MATERIAL_COEFFICIENTS[revoqueForm.workType],
    getRevoqueMaterialUnitPrice
  );
  const revoqueHasAutoMaterialQuantities = revoqueMaterialLines.some((material) => material.quantity > 0);
  const revoqueAutoMaterialTotal = revoqueMaterialLines.reduce((sum, material) => sum + material.total, 0);
  const revoqueUsesAutoMaterials =
    revoqueMaterialPrice <= 0 && revoqueNetSurface > 0 && revoqueHasAutoMaterialQuantities;
  const revoqueEffectiveMaterialPrice =
    revoqueMaterialPrice > 0
      ? revoqueMaterialPrice
      : revoqueNetSurface > 0
        ? revoqueAutoMaterialTotal / revoqueNetSurface
        : 0;
  const revoqueLaborTotal = revoqueNetSurface * revoqueLaborPrice;
  const revoqueMaterialTotal =
    revoqueMaterialPrice > 0 ? revoqueNetSurface * revoqueMaterialPrice : revoqueAutoMaterialTotal;
  const revoqueEstimatedTotal = revoqueLaborTotal + revoqueMaterialTotal;
  const revoqueReady =
    revoqueNetSurface > 0 &&
    (revoqueLaborPrice > 0 || revoqueEffectiveMaterialPrice > 0 || revoqueHasAutoMaterialQuantities);
  const revoqueSurfaceSource = revoqueManualSurface > 0 ? 'superficie directa' : 'medidas cargadas';

  const updateRevoqueForm = (patch: Partial<RevoqueEstimatorForm>) => {
    setRevoqueForm((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyRevoqueTemplate = () => {
    if (!revoqueReady) {
      setFormError('Completa la superficie o las medidas del trabajo.');
      setInfoMessage('');
      return;
    }

    const sourceBase = `${REVOQUE_TEMPLATE_SOURCE}:${selectedRevoqueType.key}`;
    const syncGroupId = `${sourceBase}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const laborItemId = `item-${Date.now()}-${Math.random().toString(36).slice(2)}-labor`;
    const measureNotes = [
      `${selectedRevoqueType.label}.`,
      `Superficie neta: ${revoqueNetSurface} m2 (${revoqueSurfaceSource}).`,
      revoqueManualSurface > 0
        ? ''
        : `Medidas: ${revoqueLinearMeters || 0} ml x ${revoqueHeightMeters || 0} m - ${revoqueOpeningsM2 || 0} m2 de aberturas.`,
      revoqueUsesAutoMaterials ? `Desperdicio de materiales: ${revoqueMaterialWastePercent || 0}%.` : '',
      revoqueUsesAutoMaterials ? `Materiales calculados:\n${summarizeMaterialEstimateLines(revoqueMaterialLines)}` : '',
      revoqueLaborMasterItem
        ? `Mano de obra tomada de base de precios: ${revoqueLaborMasterItem.name}.`
        : '',
      selectedRevoqueType.detail,
    ]
      .filter(Boolean)
      .join('\n');

    const generatedItems: ItemForm[] = [];

    if (revoqueLaborPrice > 0) {
      generatedItems.push({
        id: laborItemId,
        description: `${selectedRevoqueType.label} - mano de obra`,
        quantity: revoqueNetSurface,
        unitPrice: revoqueLaborPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: revoqueLaborMasterItem?.id || '',
        masterItemCategory: revoqueLaborMasterItem?.category || 'Revoques',
        masterItemSourceRef: revoqueLaborMasterItem?.source_ref || `${sourceBase}:labor`,
        syncGroupId,
        syncRole: 'driver',
        type: 'labor',
      });
    }

    if (revoqueUsesAutoMaterials) {
      revoqueMaterialLines
        .filter((material) => material.quantity > 0)
        .forEach((material) => {
          const materialMasterItem = revoqueMaterialMasterItems[material.priceField];
          generatedItems.push({
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-${material.key}`,
            description: `${material.label} para ${selectedRevoqueType.shortLabel.toLowerCase()}`,
            quantity: material.quantity,
            unitPrice: material.unitPrice,
            unit: material.unit,
            technicalNotes: measureNotes,
            masterItemId: materialMasterItem?.id || '',
            masterItemCategory: materialMasterItem?.category || 'Revoques',
            masterItemSourceRef: materialMasterItem?.source_ref || `${sourceBase}:material:${material.key}`,
            syncGroupId,
            syncRole: 'dependent',
            syncDriverId: laborItemId,
            syncQuantityPerUnit:
              revoqueNetSurface > 0
                ? material.quantity / revoqueNetSurface
                : material.perM2 * (1 + Math.max(0, revoqueMaterialWastePercent) / 100),
            syncSources: [
              {
                syncGroupId,
                syncDriverId: laborItemId,
                syncQuantityPerUnit:
                  revoqueNetSurface > 0
                    ? material.quantity / revoqueNetSurface
                    : material.perM2 * (1 + Math.max(0, revoqueMaterialWastePercent) / 100),
              },
            ],
            type: 'material',
          });
        });
    } else if (revoqueMaterialPrice > 0) {
      generatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-material`,
        description: `Materiales para ${selectedRevoqueType.shortLabel.toLowerCase()}`,
        quantity: revoqueNetSurface,
        unitPrice: revoqueMaterialPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: '',
        masterItemCategory: 'Revoques',
        masterItemSourceRef: `${sourceBase}:material`,
        syncGroupId,
        syncRole: 'dependent',
        syncDriverId: laborItemId,
        syncQuantityPerUnit: 1,
        syncSources: [
          {
            syncGroupId,
            syncDriverId: laborItemId,
            syncQuantityPerUnit: 1,
          },
        ],
        type: 'material',
      });
    }

    setItems((prev) => {
      const keptItems = prev.filter(
        (item) =>
          item.description.trim() &&
          !String(item.masterItemSourceRef || '').startsWith(REVOQUE_TEMPLATE_SOURCE)
      );
      return mergeQuoteMaterialItems([...keptItems, ...generatedItems]);
    });
    setOpenQuoteStep('items');
    focusQuoteItemsEditor();
    setFormError('');
    setInfoMessage(
      `Revoque agregado al detalle con ${generatedItems.length} items. Puedes ajustar precios y cantidades antes de enviar.`
    );
  };

  const selectedMamposteriaType =
    MAMPOSTERIA_WORK_TYPES.find((option) => option.key === mamposteriaForm.workType) || MAMPOSTERIA_WORK_TYPES[0];
  const mamposteriaManualSurface = toNumber(mamposteriaForm.surfaceM2);
  const mamposteriaLinearMeters = toNumber(mamposteriaForm.linearMeters);
  const mamposteriaHeightMeters = toNumber(mamposteriaForm.heightMeters);
  const mamposteriaOpeningsM2 = toNumber(mamposteriaForm.openingsM2);
  const mamposteriaMeasuredSurface = Math.max(
    0,
    mamposteriaLinearMeters * mamposteriaHeightMeters - mamposteriaOpeningsM2
  );
  const mamposteriaNetSurface = roundMeasure(
    mamposteriaManualSurface > 0 ? mamposteriaManualSurface : mamposteriaMeasuredSurface
  );
  const mamposteriaLaborPrice = toNumber(mamposteriaForm.laborPrice);
  const mamposteriaMaterialPrice = toNumber(mamposteriaForm.materialPrice);
  const mamposteriaMaterialWastePercent = toNumber(mamposteriaForm.materialWastePercent);
  const mamposteriaMaterialLines = buildMaterialEstimateLines(
    mamposteriaNetSurface,
    mamposteriaMaterialWastePercent,
    MAMPOSTERIA_MATERIAL_COEFFICIENTS[mamposteriaForm.workType],
    getMamposteriaMaterialUnitPrice
  );
  const mamposteriaHasAutoMaterialQuantities = mamposteriaMaterialLines.some((material) => material.quantity > 0);
  const mamposteriaAutoMaterialTotal = mamposteriaMaterialLines.reduce((sum, material) => sum + material.total, 0);
  const mamposteriaUsesAutoMaterials =
    mamposteriaMaterialPrice <= 0 && mamposteriaNetSurface > 0 && mamposteriaHasAutoMaterialQuantities;
  const mamposteriaEffectiveMaterialPrice =
    mamposteriaMaterialPrice > 0
      ? mamposteriaMaterialPrice
      : mamposteriaNetSurface > 0
        ? mamposteriaAutoMaterialTotal / mamposteriaNetSurface
        : 0;
  const mamposteriaLaborTotal = mamposteriaNetSurface * mamposteriaLaborPrice;
  const mamposteriaMaterialTotal =
    mamposteriaMaterialPrice > 0
      ? mamposteriaNetSurface * mamposteriaMaterialPrice
      : mamposteriaAutoMaterialTotal;
  const mamposteriaEstimatedTotal = mamposteriaLaborTotal + mamposteriaMaterialTotal;
  const mamposteriaReady =
    mamposteriaNetSurface > 0 &&
    (mamposteriaLaborPrice > 0 ||
      mamposteriaEffectiveMaterialPrice > 0 ||
      mamposteriaHasAutoMaterialQuantities);
  const mamposteriaSurfaceSource = mamposteriaManualSurface > 0 ? 'superficie directa' : 'medidas cargadas';

  const updateMamposteriaForm = (patch: Partial<MamposteriaEstimatorForm>) => {
    setMamposteriaForm((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyMamposteriaTemplate = () => {
    if (!mamposteriaReady) {
      setFormError('Completa la superficie o las medidas del trabajo.');
      setInfoMessage('');
      return;
    }

    const sourceBase = `${MAMPOSTERIA_TEMPLATE_SOURCE}:${selectedMamposteriaType.key}`;
    const syncGroupId = `${sourceBase}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const laborItemId = `item-${Date.now()}-${Math.random().toString(36).slice(2)}-mamposteria-labor`;
    const measureNotes = [
      `${selectedMamposteriaType.label}.`,
      `Superficie neta: ${mamposteriaNetSurface} m2 (${mamposteriaSurfaceSource}).`,
      mamposteriaManualSurface > 0
        ? ''
        : `Medidas: ${mamposteriaLinearMeters || 0} ml x ${mamposteriaHeightMeters || 0} m - ${mamposteriaOpeningsM2 || 0} m2 de aberturas.`,
      mamposteriaUsesAutoMaterials
        ? `Desperdicio de materiales: ${mamposteriaMaterialWastePercent || 0}%.`
        : '',
      mamposteriaUsesAutoMaterials
        ? `Materiales calculados:\n${summarizeMaterialEstimateLines(mamposteriaMaterialLines)}`
        : '',
      mamposteriaLaborMasterItem
        ? `Mano de obra tomada de base de precios: ${mamposteriaLaborMasterItem.name}.`
        : '',
      selectedMamposteriaType.detail,
    ]
      .filter(Boolean)
      .join('\n');

    const generatedItems: ItemForm[] = [];

    if (mamposteriaLaborPrice > 0) {
      generatedItems.push({
        id: laborItemId,
        description: `${selectedMamposteriaType.label} - mano de obra`,
        quantity: mamposteriaNetSurface,
        unitPrice: mamposteriaLaborPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: mamposteriaLaborMasterItem?.id || '',
        masterItemCategory: mamposteriaLaborMasterItem?.category || 'Mamposteria',
        masterItemSourceRef: mamposteriaLaborMasterItem?.source_ref || `${sourceBase}:labor`,
        syncGroupId,
        syncRole: 'driver',
        type: 'labor',
      });
    }

    if (mamposteriaUsesAutoMaterials) {
      mamposteriaMaterialLines
        .filter((material) => material.quantity > 0)
        .forEach((material) => {
          const materialMasterItem = mamposteriaMaterialMasterItems[material.priceField];
          generatedItems.push({
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-mamposteria-${material.key}`,
            description: `${material.label} para ${selectedMamposteriaType.shortLabel.toLowerCase()}`,
            quantity: material.quantity,
            unitPrice: material.unitPrice,
            unit: material.unit,
            technicalNotes: measureNotes,
            masterItemId: materialMasterItem?.id || '',
            masterItemCategory: materialMasterItem?.category || 'Mamposteria',
            masterItemSourceRef: materialMasterItem?.source_ref || `${sourceBase}:material:${material.key}`,
            syncGroupId,
            syncRole: 'dependent',
            syncDriverId: laborItemId,
            syncQuantityPerUnit:
              mamposteriaNetSurface > 0
                ? material.quantity / mamposteriaNetSurface
                : material.perM2 * (1 + Math.max(0, mamposteriaMaterialWastePercent) / 100),
            syncSources: [
              {
                syncGroupId,
                syncDriverId: laborItemId,
                syncQuantityPerUnit:
                  mamposteriaNetSurface > 0
                    ? material.quantity / mamposteriaNetSurface
                    : material.perM2 * (1 + Math.max(0, mamposteriaMaterialWastePercent) / 100),
              },
            ],
            type: 'material',
          });
        });
    } else if (mamposteriaMaterialPrice > 0) {
      generatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-mamposteria-material`,
        description: `Materiales para ${selectedMamposteriaType.shortLabel.toLowerCase()}`,
        quantity: mamposteriaNetSurface,
        unitPrice: mamposteriaMaterialPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: '',
        masterItemCategory: 'Mamposteria',
        masterItemSourceRef: `${sourceBase}:material`,
        syncGroupId,
        syncRole: 'dependent',
        syncDriverId: laborItemId,
        syncQuantityPerUnit: 1,
        syncSources: [
          {
            syncGroupId,
            syncDriverId: laborItemId,
            syncQuantityPerUnit: 1,
          },
        ],
        type: 'material',
      });
    }

    setItems((prev) => {
      const keptItems = prev.filter(
        (item) =>
          item.description.trim() &&
          !String(item.masterItemSourceRef || '').startsWith(MAMPOSTERIA_TEMPLATE_SOURCE)
      );
      return mergeQuoteMaterialItems([...keptItems, ...generatedItems]);
    });
    setOpenQuoteStep('items');
    focusQuoteItemsEditor();
    setFormError('');
    setInfoMessage(
      `Mamposteria agregada al detalle con ${generatedItems.length} items. Puedes ajustar precios y cantidades antes de enviar.`
    );
  };

  const selectedPisoType =
    PISO_WORK_TYPES.find((option) => option.key === pisoForm.workType) || PISO_WORK_TYPES[0];
  const pisoSurface = roundMeasure(toNumber(pisoForm.surfaceM2));
  const pisoLaborPrice = toNumber(pisoForm.laborPrice);
  const pisoMaterialPrice = toNumber(pisoForm.materialPrice);
  const pisoMaterialWastePercent = toNumber(pisoForm.materialWastePercent);
  const pisoMaterialLines = buildMaterialEstimateLines(
    pisoSurface,
    pisoMaterialWastePercent,
    PISO_MATERIAL_COEFFICIENTS[pisoForm.workType],
    getPisoMaterialUnitPrice
  );
  const pisoHasAutoMaterialQuantities = pisoMaterialLines.some((material) => material.quantity > 0);
  const pisoAutoMaterialTotal = pisoMaterialLines.reduce((sum, material) => sum + material.total, 0);
  const pisoUsesAutoMaterials =
    pisoMaterialPrice <= 0 && pisoSurface > 0 && pisoHasAutoMaterialQuantities;
  const pisoEffectiveMaterialPrice =
    pisoMaterialPrice > 0 ? pisoMaterialPrice : pisoSurface > 0 ? pisoAutoMaterialTotal / pisoSurface : 0;
  const pisoLaborTotal = pisoSurface * pisoLaborPrice;
  const pisoMaterialTotal = pisoMaterialPrice > 0 ? pisoSurface * pisoMaterialPrice : pisoAutoMaterialTotal;
  const pisoEstimatedTotal = pisoLaborTotal + pisoMaterialTotal;
  const pisoReady =
    pisoSurface > 0 && (pisoLaborPrice > 0 || pisoEffectiveMaterialPrice > 0 || pisoHasAutoMaterialQuantities);

  const updatePisoForm = (patch: Partial<PisoEstimatorForm>) => {
    setPisoForm((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyPisoTemplate = () => {
    if (!pisoReady) {
      setFormError('Completa la superficie del trabajo.');
      setInfoMessage('');
      return;
    }

    const sourceBase = `${PISO_TEMPLATE_SOURCE}:${selectedPisoType.key}`;
    const syncGroupId = `${sourceBase}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const laborItemId = `item-${Date.now()}-${Math.random().toString(36).slice(2)}-piso-labor`;
    const measureNotes = [
      `${selectedPisoType.label}.`,
      `Superficie: ${pisoSurface} m2.`,
      pisoUsesAutoMaterials ? `Desperdicio de materiales: ${pisoMaterialWastePercent || 0}%.` : '',
      pisoUsesAutoMaterials ? `Materiales calculados:\n${summarizeMaterialEstimateLines(pisoMaterialLines)}` : '',
      pisoLaborMasterItem ? `Mano de obra tomada de base de precios: ${pisoLaborMasterItem.name}.` : '',
      selectedPisoType.detail,
    ]
      .filter(Boolean)
      .join('\n');

    const generatedItems: ItemForm[] = [];

    if (pisoLaborPrice > 0) {
      generatedItems.push({
        id: laborItemId,
        description: `${selectedPisoType.label} - mano de obra`,
        quantity: pisoSurface,
        unitPrice: pisoLaborPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: pisoLaborMasterItem?.id || '',
        masterItemCategory: pisoLaborMasterItem?.category || 'Pisos y revestimientos',
        masterItemSourceRef: pisoLaborMasterItem?.source_ref || `${sourceBase}:labor`,
        syncGroupId,
        syncRole: 'driver',
        type: 'labor',
      });
    }

    if (pisoUsesAutoMaterials) {
      pisoMaterialLines
        .filter((material) => material.quantity > 0)
        .forEach((material) => {
          const materialMasterItem = pisoMaterialMasterItems[material.priceField];
          generatedItems.push({
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-piso-${material.key}`,
            description: `${material.label} para ${selectedPisoType.shortLabel.toLowerCase()}`,
            quantity: material.quantity,
            unitPrice: material.unitPrice,
            unit: material.unit,
            technicalNotes: measureNotes,
            masterItemId: materialMasterItem?.id || '',
            masterItemCategory: materialMasterItem?.category || 'Pisos y revestimientos',
            masterItemSourceRef: materialMasterItem?.source_ref || `${sourceBase}:material:${material.key}`,
            syncGroupId,
            syncRole: 'dependent',
            syncDriverId: laborItemId,
            syncQuantityPerUnit:
              pisoSurface > 0
                ? material.quantity / pisoSurface
                : material.perM2 * (1 + Math.max(0, pisoMaterialWastePercent) / 100),
            syncSources: [
              {
                syncGroupId,
                syncDriverId: laborItemId,
                syncQuantityPerUnit:
                  pisoSurface > 0
                    ? material.quantity / pisoSurface
                    : material.perM2 * (1 + Math.max(0, pisoMaterialWastePercent) / 100),
              },
            ],
            type: 'material',
          });
        });
    } else if (pisoMaterialPrice > 0) {
      generatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-piso-material`,
        description: `Materiales para ${selectedPisoType.shortLabel.toLowerCase()}`,
        quantity: pisoSurface,
        unitPrice: pisoMaterialPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: '',
        masterItemCategory: 'Pisos y revestimientos',
        masterItemSourceRef: `${sourceBase}:material`,
        syncGroupId,
        syncRole: 'dependent',
        syncDriverId: laborItemId,
        syncQuantityPerUnit: 1,
        syncSources: [{ syncGroupId, syncDriverId: laborItemId, syncQuantityPerUnit: 1 }],
        type: 'material',
      });
    }

    setItems((prev) => {
      const keptItems = prev.filter(
        (item) =>
          item.description.trim() &&
          !String(item.masterItemSourceRef || '').startsWith(PISO_TEMPLATE_SOURCE)
      );
      return mergeQuoteMaterialItems([...keptItems, ...generatedItems]);
    });
    setOpenQuoteStep('items');
    focusQuoteItemsEditor();
    setFormError('');
    setInfoMessage(`Pisos agregados al detalle con ${generatedItems.length} items.`);
  };

  const selectedPinturaType =
    PINTURA_WORK_TYPES.find((option) => option.key === pinturaForm.workType) || PINTURA_WORK_TYPES[0];
  const pinturaSurface = roundMeasure(toNumber(pinturaForm.surfaceM2));
  const pinturaCoats = Math.max(1, toNumber(pinturaForm.coats) || 1);
  const pinturaLaborPrice = toNumber(pinturaForm.laborPrice);
  const pinturaMaterialPrice = toNumber(pinturaForm.materialPrice);
  const pinturaMaterialWastePercent = toNumber(pinturaForm.materialWastePercent);
  const pinturaMaterialCoefficients: Array<MaterialCoefficient<PinturaMaterialPriceField>> = [
    {
      key: 'paint',
      label: `Pintura ${selectedPinturaType.shortLabel.toLowerCase()}`,
      unit: 'litro',
      perM2: pinturaCoats / (selectedPinturaType.key === 'exterior' ? 8 : 10),
      priceField: 'paintLiterPrice',
    },
    ...(pinturaForm.includePrimer
      ? [
          {
            key: 'primer',
            label: 'Fijador / sellador',
            unit: 'litro',
            perM2: 0.1,
            priceField: 'primerLiterPrice' as const,
          },
        ]
      : []),
    ...(pinturaForm.includePutty
      ? [
          {
            key: 'putty',
            label: 'Enduido',
            unit: 'kg',
            perM2: 0.25,
            priceField: 'puttyKgPrice' as const,
          },
        ]
      : []),
  ];
  const pinturaMaterialLines = buildMaterialEstimateLines(
    pinturaSurface,
    pinturaMaterialWastePercent,
    pinturaMaterialCoefficients,
    getPinturaMaterialUnitPrice
  );
  const pinturaHasAutoMaterialQuantities = pinturaMaterialLines.some((material) => material.quantity > 0);
  const pinturaAutoMaterialTotal = pinturaMaterialLines.reduce((sum, material) => sum + material.total, 0);
  const pinturaUsesAutoMaterials =
    pinturaMaterialPrice <= 0 && pinturaSurface > 0 && pinturaHasAutoMaterialQuantities;
  const pinturaEffectiveMaterialPrice =
    pinturaMaterialPrice > 0 ? pinturaMaterialPrice : pinturaSurface > 0 ? pinturaAutoMaterialTotal / pinturaSurface : 0;
  const pinturaLaborTotal = pinturaSurface * pinturaLaborPrice;
  const pinturaMaterialTotal =
    pinturaMaterialPrice > 0 ? pinturaSurface * pinturaMaterialPrice : pinturaAutoMaterialTotal;
  const pinturaEstimatedTotal = pinturaLaborTotal + pinturaMaterialTotal;
  const pinturaReady =
    pinturaSurface > 0 &&
    (pinturaLaborPrice > 0 || pinturaEffectiveMaterialPrice > 0 || pinturaHasAutoMaterialQuantities);

  const updatePinturaForm = (patch: Partial<PinturaEstimatorForm>) => {
    setPinturaForm((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyPinturaTemplate = () => {
    if (!pinturaReady) {
      setFormError('Completa la superficie del trabajo.');
      setInfoMessage('');
      return;
    }

    const sourceBase = `${PINTURA_TEMPLATE_SOURCE}:${selectedPinturaType.key}`;
    const syncGroupId = `${sourceBase}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const laborItemId = `item-${Date.now()}-${Math.random().toString(36).slice(2)}-pintura-labor`;
    const measureNotes = [
      `${selectedPinturaType.label}.`,
      `Superficie: ${pinturaSurface} m2.`,
      `Manos: ${formatMeasureValue(pinturaCoats)}.`,
      pinturaUsesAutoMaterials ? `Desperdicio de materiales: ${pinturaMaterialWastePercent || 0}%.` : '',
      pinturaUsesAutoMaterials ? `Materiales calculados:\n${summarizeMaterialEstimateLines(pinturaMaterialLines)}` : '',
      pinturaLaborMasterItem ? `Mano de obra tomada de base de precios: ${pinturaLaborMasterItem.name}.` : '',
      selectedPinturaType.detail,
    ]
      .filter(Boolean)
      .join('\n');

    const generatedItems: ItemForm[] = [];

    if (pinturaLaborPrice > 0) {
      generatedItems.push({
        id: laborItemId,
        description: `${selectedPinturaType.label} - mano de obra`,
        quantity: pinturaSurface,
        unitPrice: pinturaLaborPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: pinturaLaborMasterItem?.id || '',
        masterItemCategory: pinturaLaborMasterItem?.category || 'Pintura',
        masterItemSourceRef: pinturaLaborMasterItem?.source_ref || `${sourceBase}:labor`,
        syncGroupId,
        syncRole: 'driver',
        type: 'labor',
      });
    }

    if (pinturaUsesAutoMaterials) {
      pinturaMaterialLines
        .filter((material) => material.quantity > 0)
        .forEach((material) => {
          const materialMasterItem = pinturaMaterialMasterItems[material.priceField];
          generatedItems.push({
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-pintura-${material.key}`,
            description: `${material.label} para ${selectedPinturaType.shortLabel.toLowerCase()}`,
            quantity: material.quantity,
            unitPrice: material.unitPrice,
            unit: material.unit,
            technicalNotes: measureNotes,
            masterItemId: materialMasterItem?.id || '',
            masterItemCategory: materialMasterItem?.category || 'Pintura',
            masterItemSourceRef: materialMasterItem?.source_ref || `${sourceBase}:material:${material.key}`,
            syncGroupId,
            syncRole: 'dependent',
            syncDriverId: laborItemId,
            syncQuantityPerUnit:
              pinturaSurface > 0
                ? material.quantity / pinturaSurface
                : material.perM2 * (1 + Math.max(0, pinturaMaterialWastePercent) / 100),
            syncSources: [
              {
                syncGroupId,
                syncDriverId: laborItemId,
                syncQuantityPerUnit:
                  pinturaSurface > 0
                    ? material.quantity / pinturaSurface
                    : material.perM2 * (1 + Math.max(0, pinturaMaterialWastePercent) / 100),
              },
            ],
            type: 'material',
          });
        });
    } else if (pinturaMaterialPrice > 0) {
      generatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}-pintura-material`,
        description: `Materiales para ${selectedPinturaType.shortLabel.toLowerCase()}`,
        quantity: pinturaSurface,
        unitPrice: pinturaMaterialPrice,
        unit: 'm2',
        technicalNotes: measureNotes,
        masterItemId: '',
        masterItemCategory: 'Pintura',
        masterItemSourceRef: `${sourceBase}:material`,
        syncGroupId,
        syncRole: 'dependent',
        syncDriverId: laborItemId,
        syncQuantityPerUnit: 1,
        syncSources: [{ syncGroupId, syncDriverId: laborItemId, syncQuantityPerUnit: 1 }],
        type: 'material',
      });
    }

    setItems((prev) => {
      const keptItems = prev.filter(
        (item) =>
          item.description.trim() &&
          !String(item.masterItemSourceRef || '').startsWith(PINTURA_TEMPLATE_SOURCE)
      );
      return mergeQuoteMaterialItems([...keptItems, ...generatedItems]);
    });
    setOpenQuoteStep('items');
    focusQuoteItemsEditor();
    setFormError('');
    setInfoMessage(`Pintura agregada al detalle con ${generatedItems.length} items.`);
  };

  const laborMasterItems = useMemo(() => masterItems.filter((item) => item.type === 'labor'), [masterItems]);
  const quoteLaborCatalogCategories = useMemo(() => {
    const categories = new Set<string>();
    laborMasterItems.forEach((item) => {
      categories.add(resolveMasterRubro(item));
    });
    return Array.from(categories).sort(compareRubroValues);
  }, [laborMasterItems]);
  const filteredQuoteLaborCatalogItems = useMemo(() => {
    const search = normalizeLaborLookupText(quoteCatalogSearch);
    return laborMasterItems
      .filter((item) => {
        const rubro = resolveMasterRubro(item);
        if (quoteCatalogCategory !== 'all' && rubro !== quoteCatalogCategory) return false;
        if (!search) return true;

        const text = normalizeLaborLookupText(
          [
            item.name,
            item.category,
            item.source_ref,
            item.technical_notes,
            formatRubroLabel(rubro),
          ]
            .filter(Boolean)
            .join(' ')
        );
        return search.split(' ').every((term) => lookupTextHasTerm(text, term));
      })
      .sort((a, b) => {
        const categoryCompare = compareRubroValues(resolveMasterRubro(a), resolveMasterRubro(b));
        if (categoryCompare !== 0) return categoryCompare;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [laborMasterItems, quoteCatalogCategory, quoteCatalogSearch]);
  const laborMasterById = useMemo(() => {
    const map = new Map<string, MasterItemRow>();
    laborMasterItems.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [laborMasterItems]);
  const laborMasterChoiceMap = useMemo(() => {
    const map = new Map<string, MasterItemRow>();
    laborMasterItems.forEach((item) => {
      map.set(normalizeText(getMasterItemChoiceValue(item)), item);
    });
    return map;
  }, [laborMasterItems]);
  const laborMasterNameMap = useMemo(() => {
    const map = new Map<string, MasterItemRow[]>();
    laborMasterItems.forEach((item) => {
      const key = normalizeText(item.name);
      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });
    return map;
  }, [laborMasterItems]);
  const revoqueLaborMasterItem = useMemo(
    () => resolveTemplateLaborMasterItem(laborMasterItems, REVOQUE_LABOR_LOOKUPS[revoqueForm.workType]),
    [laborMasterItems, revoqueForm.workType]
  );
  const mamposteriaLaborMasterItem = useMemo(
    () =>
      resolveTemplateLaborMasterItem(
        laborMasterItems,
        MAMPOSTERIA_LABOR_LOOKUPS[mamposteriaForm.workType]
      ),
    [laborMasterItems, mamposteriaForm.workType]
  );
  const pisoLaborMasterItem = useMemo(
    () => resolveTemplateLaborMasterItem(laborMasterItems, PISO_LABOR_LOOKUPS[pisoForm.workType]),
    [laborMasterItems, pisoForm.workType]
  );
  const pinturaLaborMasterItem = useMemo(
    () => resolveTemplateLaborMasterItem(laborMasterItems, PINTURA_LABOR_LOOKUPS[pinturaForm.workType]),
    [laborMasterItems, pinturaForm.workType]
  );
  const revoqueSuggestedLaborPrice = getMasterItemSuggestedPrice(revoqueLaborMasterItem);
  const mamposteriaSuggestedLaborPrice = getMasterItemSuggestedPrice(mamposteriaLaborMasterItem);
  const pisoSuggestedLaborPrice = getMasterItemSuggestedPrice(pisoLaborMasterItem);
  const pinturaSuggestedLaborPrice = getMasterItemSuggestedPrice(pinturaLaborMasterItem);
  const revoqueSuggestedLaborInput = formatSuggestedPriceInput(revoqueSuggestedLaborPrice);
  const mamposteriaSuggestedLaborInput = formatSuggestedPriceInput(mamposteriaSuggestedLaborPrice);
  const pisoSuggestedLaborInput = formatSuggestedPriceInput(pisoSuggestedLaborPrice);
  const pinturaSuggestedLaborInput = formatSuggestedPriceInput(pinturaSuggestedLaborPrice);

  const revoqueCatalogCheck = useMemo(
    () =>
      buildEstimatorCatalogCheck(
        [
          { label: 'Mano de obra', kind: 'labor', item: revoqueLaborMasterItem, value: revoqueForm.laborPrice },
          {
            label: 'Cemento',
            kind: 'material',
            item: revoqueMaterialMasterItems.cementBagPrice,
            value: revoqueForm.cementBagPrice,
          },
          { label: 'Cal', kind: 'material', item: revoqueMaterialMasterItems.limeBagPrice, value: revoqueForm.limeBagPrice },
          { label: 'Arena', kind: 'material', item: revoqueMaterialMasterItems.sandM3Price, value: revoqueForm.sandM3Price },
          {
            label: 'Hidrofugo',
            kind: 'material',
            item: revoqueMaterialMasterItems.waterproofLiterPrice,
            value: revoqueForm.waterproofLiterPrice,
          },
        ],
        loadingMasterItems
      ),
    [
      loadingMasterItems,
      revoqueForm.cementBagPrice,
      revoqueForm.laborPrice,
      revoqueForm.limeBagPrice,
      revoqueForm.sandM3Price,
      revoqueForm.waterproofLiterPrice,
      revoqueLaborMasterItem,
      revoqueMaterialMasterItems,
    ]
  );
  const mamposteriaCatalogCheck = useMemo(
    () =>
      buildEstimatorCatalogCheck(
        [
          { label: 'Mano de obra', kind: 'labor', item: mamposteriaLaborMasterItem, value: mamposteriaForm.laborPrice },
          {
            label: 'Ladrillo / bloque',
            kind: 'material',
            item: mamposteriaMaterialMasterItems.brickUnitPrice,
            value: mamposteriaForm.brickUnitPrice,
          },
          {
            label: 'Cemento',
            kind: 'material',
            item: mamposteriaMaterialMasterItems.cementBagPrice,
            value: mamposteriaForm.cementBagPrice,
          },
          { label: 'Cal', kind: 'material', item: mamposteriaMaterialMasterItems.limeBagPrice, value: mamposteriaForm.limeBagPrice },
          { label: 'Arena', kind: 'material', item: mamposteriaMaterialMasterItems.sandM3Price, value: mamposteriaForm.sandM3Price },
        ],
        loadingMasterItems
      ),
    [
      loadingMasterItems,
      mamposteriaForm.brickUnitPrice,
      mamposteriaForm.cementBagPrice,
      mamposteriaForm.laborPrice,
      mamposteriaForm.limeBagPrice,
      mamposteriaForm.sandM3Price,
      mamposteriaLaborMasterItem,
      mamposteriaMaterialMasterItems,
    ]
  );
  const pisoCatalogCheck = useMemo(
    () =>
      buildEstimatorCatalogCheck(
        [
          { label: 'Mano de obra', kind: 'labor', item: pisoLaborMasterItem, value: pisoForm.laborPrice },
          { label: 'Piso / revestimiento', kind: 'material', item: pisoMaterialMasterItems.tileM2Price, value: pisoForm.tileM2Price },
          { label: 'Pegamento', kind: 'material', item: pisoMaterialMasterItems.adhesiveBagPrice, value: pisoForm.adhesiveBagPrice },
          { label: 'Pastina', kind: 'material', item: pisoMaterialMasterItems.groutKgPrice, value: pisoForm.groutKgPrice },
        ],
        loadingMasterItems
      ),
    [
      loadingMasterItems,
      pisoForm.adhesiveBagPrice,
      pisoForm.groutKgPrice,
      pisoForm.laborPrice,
      pisoForm.tileM2Price,
      pisoLaborMasterItem,
      pisoMaterialMasterItems,
    ]
  );
  const pinturaCatalogCheck = useMemo(
    () =>
      buildEstimatorCatalogCheck(
        [
          { label: 'Mano de obra', kind: 'labor', item: pinturaLaborMasterItem, value: pinturaForm.laborPrice },
          { label: 'Pintura', kind: 'material', item: pinturaMaterialMasterItems.paintLiterPrice, value: pinturaForm.paintLiterPrice },
          { label: 'Fijador', kind: 'material', item: pinturaMaterialMasterItems.primerLiterPrice, value: pinturaForm.primerLiterPrice },
          { label: 'Enduido', kind: 'material', item: pinturaMaterialMasterItems.puttyKgPrice, value: pinturaForm.puttyKgPrice },
        ],
        loadingMasterItems
      ),
    [
      loadingMasterItems,
      pinturaForm.laborPrice,
      pinturaForm.paintLiterPrice,
      pinturaForm.primerLiterPrice,
      pinturaForm.puttyKgPrice,
      pinturaLaborMasterItem,
      pinturaMaterialMasterItems,
    ]
  );

  const applySuggestedRevoqueEstimatorPrices = (form: RevoqueEstimatorForm, force = false) => {
    let changed = false;
    const next: RevoqueEstimatorForm = { ...form };
    if (
      (force || shouldReplaceSuggestedPriceInput(next.laborPrice, revoqueSuggestedLaborInput, revoqueLaborMasterItem)) &&
      revoqueSuggestedLaborInput
    ) {
      next.laborPrice = revoqueSuggestedLaborInput;
      changed = true;
    }
    REVOQUE_MATERIAL_PRICE_FIELDS.forEach((field) => {
      const suggested = revoqueSuggestedMaterialInputs[field];
      if (
        (force || shouldReplaceSuggestedPriceInput(next[field], suggested, revoqueMaterialMasterItems[field])) &&
        suggested
      ) {
        next[field] = suggested;
        changed = true;
      }
    });
    return changed ? next : form;
  };

  const applySuggestedMamposteriaEstimatorPrices = (form: MamposteriaEstimatorForm, force = false) => {
    let changed = false;
    const next: MamposteriaEstimatorForm = { ...form };
    if (
      (force ||
        shouldReplaceSuggestedPriceInput(
          next.laborPrice,
          mamposteriaSuggestedLaborInput,
          mamposteriaLaborMasterItem
        )) &&
      mamposteriaSuggestedLaborInput
    ) {
      next.laborPrice = mamposteriaSuggestedLaborInput;
      changed = true;
    }
    MAMPOSTERIA_MATERIAL_PRICE_FIELDS.forEach((field) => {
      const suggested = mamposteriaSuggestedMaterialInputs[field];
      if (
        (force || shouldReplaceSuggestedPriceInput(next[field], suggested, mamposteriaMaterialMasterItems[field])) &&
        suggested
      ) {
        next[field] = suggested;
        changed = true;
      }
    });
    return changed ? next : form;
  };

  const applySuggestedPisoEstimatorPrices = (form: PisoEstimatorForm, force = false) => {
    let changed = false;
    const next: PisoEstimatorForm = { ...form };
    if (
      (force || shouldReplaceSuggestedPriceInput(next.laborPrice, pisoSuggestedLaborInput, pisoLaborMasterItem)) &&
      pisoSuggestedLaborInput
    ) {
      next.laborPrice = pisoSuggestedLaborInput;
      changed = true;
    }
    PISO_MATERIAL_PRICE_FIELDS.forEach((field) => {
      const suggested = pisoSuggestedMaterialInputs[field];
      if (
        (force || shouldReplaceSuggestedPriceInput(next[field], suggested, pisoMaterialMasterItems[field])) &&
        suggested
      ) {
        next[field] = suggested;
        changed = true;
      }
    });
    return changed ? next : form;
  };

  const applySuggestedPinturaEstimatorPrices = (form: PinturaEstimatorForm, force = false) => {
    let changed = false;
    const next: PinturaEstimatorForm = { ...form };
    if (
      (force || shouldReplaceSuggestedPriceInput(next.laborPrice, pinturaSuggestedLaborInput, pinturaLaborMasterItem)) &&
      pinturaSuggestedLaborInput
    ) {
      next.laborPrice = pinturaSuggestedLaborInput;
      changed = true;
    }
    PINTURA_MATERIAL_PRICE_FIELDS.forEach((field) => {
      const suggested = pinturaSuggestedMaterialInputs[field];
      if (
        (force || shouldReplaceSuggestedPriceInput(next[field], suggested, pinturaMaterialMasterItems[field])) &&
        suggested
      ) {
        next[field] = suggested;
        changed = true;
      }
    });
    return changed ? next : form;
  };

  const handleQuoteWorkEstimatorModeChange = (mode: QuoteWorkEstimatorMode) => {
    setQuoteWorkEstimatorMode(mode);
    if (mode === 'revoques') {
      setRevoqueForm((prev) => applySuggestedRevoqueEstimatorPrices(prev, true));
    }
    if (mode === 'mamposteria') {
      setMamposteriaForm((prev) => applySuggestedMamposteriaEstimatorPrices(prev, true));
    }
    if (mode === 'pisos') {
      setPisoForm((prev) => applySuggestedPisoEstimatorPrices(prev, true));
    }
    if (mode === 'pintura') {
      setPinturaForm((prev) => applySuggestedPinturaEstimatorPrices(prev, true));
    }
  };

  const handleRefreshRevoqueCatalogPrices = () => {
    setRevoqueForm((prev) => applySuggestedRevoqueEstimatorPrices(prev, true));
  };

  const handleRefreshMamposteriaCatalogPrices = () => {
    setMamposteriaForm((prev) => applySuggestedMamposteriaEstimatorPrices(prev, true));
  };

  const handleRefreshPisoCatalogPrices = () => {
    setPisoForm((prev) => applySuggestedPisoEstimatorPrices(prev, true));
  };

  const handleRefreshPinturaCatalogPrices = () => {
    setPinturaForm((prev) => applySuggestedPinturaEstimatorPrices(prev, true));
  };

  useEffect(() => {
    if (quoteWorkEstimatorMode !== 'revoques') return;
    setRevoqueForm((prev) => applySuggestedRevoqueEstimatorPrices(prev));
  }, [quoteWorkEstimatorMode, revoqueSuggestedLaborInput, revoqueSuggestedMaterialInputs]);

  useEffect(() => {
    if (quoteWorkEstimatorMode !== 'mamposteria') return;
    setMamposteriaForm((prev) => applySuggestedMamposteriaEstimatorPrices(prev));
  }, [quoteWorkEstimatorMode, mamposteriaSuggestedLaborInput, mamposteriaSuggestedMaterialInputs]);

  useEffect(() => {
    if (quoteWorkEstimatorMode !== 'pisos') return;
    setPisoForm((prev) => applySuggestedPisoEstimatorPrices(prev));
  }, [quoteWorkEstimatorMode, pisoSuggestedLaborInput, pisoSuggestedMaterialInputs]);

  useEffect(() => {
    if (quoteWorkEstimatorMode !== 'pintura') return;
    setPinturaForm((prev) => applySuggestedPinturaEstimatorPrices(prev));
  }, [quoteWorkEstimatorMode, pinturaSuggestedLaborInput, pinturaSuggestedMaterialInputs]);

  const isSameLaborSelection = (description: string, item: MasterItemRow) => {
    const normalizedDescription = normalizeText(description || '').trim();
    if (!normalizedDescription) return true;
    return (
      normalizedDescription === normalizeText(item.name || '') ||
      normalizedDescription === normalizeText(getMasterItemChoiceValue(item))
    );
  };

  const resolveLaborMasterItem = (item: {
    type?: 'labor' | 'material';
    description?: string;
    masterItemId?: string;
    unit?: string;
    technicalNotes?: string;
    masterItemSourceRef?: string;
  }) => {
    if (item.type !== 'labor') return null;
    const byId = item.masterItemId ? laborMasterById.get(item.masterItemId) || null : null;
    if (byId && isSameLaborSelection(item.description || '', byId)) return byId;
    const normalized = normalizeText(item.description || '').trim();
    if (!normalized) return null;
    const byChoice = laborMasterChoiceMap.get(normalized) || null;
    if (byChoice) return byChoice;

    const candidates = laborMasterNameMap.get(normalized) || [];
    if (candidates.length === 1) return candidates[0] || null;

    const unitKey = canonicalizeMasterItemUnit(item.unit || '') || '';
    if (unitKey) {
      const byUnit =
        candidates.find((candidate) => (canonicalizeMasterItemUnit(candidate.unit || '') || '') === unitKey) || null;
      if (byUnit) return byUnit;
    }

    const noteKey = normalizeText(normalizeTechnicalNotes(item.technicalNotes));
    if (noteKey) {
      const byNotes =
        candidates.find((candidate) => normalizeText(normalizeTechnicalNotes(candidate.technical_notes)) === noteKey) ||
        null;
      if (byNotes) return byNotes;
    }

    const sourceKey = normalizeText(item.masterItemSourceRef || '');
    if (sourceKey) {
      const bySource =
        candidates.find((candidate) => normalizeText(candidate.source_ref || '') === sourceKey) || null;
      if (bySource) return bySource;
    }

    return null;
  };

  const mergeItemWithMasterItem = (item: ItemForm, options?: { fillNotesFromMaster?: boolean }) => {
    if (item.type !== 'labor') {
      return item;
    }

    const match = resolveLaborMasterItem(item);
    if (!match) {
      return {
        ...item,
        unit: '',
        masterItemId: '',
        masterItemCategory: '',
        masterItemSourceRef: '',
      };
    }

    const nextTechnicalNotes =
      options?.fillNotesFromMaster && !normalizeTechnicalNotes(item.technicalNotes)
        ? mergeUniqueText([normalizeTechnicalNotes(match.technical_notes), buildLaborPriceUpdateNote(match)], '\n\n')
        : normalizeTechnicalNotes(item.technicalNotes);

    return {
      ...item,
      unitPrice: shouldSyncMasterItemPrice(item, match) ? getMasterItemSuggestedPrice(match) : item.unitPrice,
      unit: match.unit || '',
      masterItemId: match.id,
      masterItemCategory: match.category || '',
      masterItemSourceRef: match.source_ref || '',
      technicalNotes: nextTechnicalNotes,
    };
  };

  const resolveLinkedMasterItemFromCatalog = (item: ItemForm, catalogItems: MasterItemRow[]) => {
    if (!item.masterItemId && !item.masterItemSourceRef) return null;
    const allowedTypes =
      item.type === 'labor'
        ? new Set(['labor'])
        : new Set(['material', 'consumable']);
    const candidates = catalogItems.filter((candidate) => allowedTypes.has(String(candidate.type)));

    if (item.masterItemId) {
      const byId = candidates.find((candidate) => candidate.id === item.masterItemId) || null;
      if (byId) return byId;
    }

    const sourceKey = normalizeText(item.masterItemSourceRef || '');
    if (sourceKey) {
      const bySource =
        candidates.find((candidate) => normalizeText(candidate.source_ref || '') === sourceKey) || null;
      if (bySource) return bySource;
    }

    return null;
  };

  const applyCatalogValueToQuoteItem = (item: ItemForm, catalogItems: MasterItemRow[]) => {
    const match = resolveLinkedMasterItemFromCatalog(item, catalogItems);
    if (!match) return { item, changed: false, linked: false };

    const suggestedPrice = getMasterItemSuggestedPrice(match);
    if (suggestedPrice <= 0) return { item, changed: false, linked: true };

    const nextItem: ItemForm = {
      ...item,
      unitPrice: suggestedPrice,
      unit: match.unit || item.unit || '',
      masterItemId: match.id,
      masterItemCategory: match.category || item.masterItemCategory || '',
      masterItemSourceRef: match.source_ref || item.masterItemSourceRef || '',
    };

    const changed =
      !pricesAreEquivalent(item.unitPrice, nextItem.unitPrice) ||
      item.unit !== nextItem.unit ||
      item.masterItemId !== nextItem.masterItemId ||
      item.masterItemCategory !== nextItem.masterItemCategory ||
      item.masterItemSourceRef !== nextItem.masterItemSourceRef;

    return { item: nextItem, changed, linked: true };
  };

  const handleRefreshQuoteValues = async () => {
    if (loadingMasterItems) return;
    setQuoteActionsOpen(false);
    setFormError('');
    setInfoMessage('Actualizando valores...');

    const latestMasterItems = await fetchMasterItems();
    const catalogItems = latestMasterItems.length > 0 ? latestMasterItems : masterItems;
    if (catalogItems.length === 0) {
      setInfoMessage('');
      setFormError('No pudimos cargar los valores del catalogo.');
      return;
    }

    let linkedCount = 0;
    let updatedCount = 0;
    const nextItems = mergeQuoteMaterialItems(
      items.map((item) => {
        const result = applyCatalogValueToQuoteItem(item, catalogItems);
        if (result.linked) linkedCount += 1;
        if (result.changed) updatedCount += 1;
        return result.item;
      })
    );

    if (linkedCount === 0) {
      setInfoMessage('');
      setFormError('No hay items vinculados al catalogo para actualizar.');
      return;
    }

    if (updatedCount === 0) {
      setInfoMessage('Los valores ya estaban actualizados.');
      return;
    }

    setItems(nextItems);
    setInfoMessage(`${updatedCount} valor${updatedCount === 1 ? '' : 'es'} actualizado${updatedCount === 1 ? '' : 's'} desde catalogo.`);
  };

  const handleItemUpdate = (id: string, patch: Partial<ItemForm>) => {
    setItems((prev) => {
      const originalItem = prev.find((item) => item.id === id) || null;
      const originalQuantity = Math.max(0, Number(originalItem?.quantity || 0));
      const shouldSyncMaterials =
        patch.quantity !== undefined && originalItem?.type === 'labor' && originalQuantity > 0;
      const targetIndex = prev.findIndex((item) => item.id === id);
      const legacySyncGroupId =
        shouldSyncMaterials && !originalItem?.syncGroupId
          ? `legacy-sync-${id}`
          : originalItem?.syncGroupId || '';
      const legacyDependentIds = new Set<string>();

      if (shouldSyncMaterials && targetIndex >= 0 && !originalItem?.syncGroupId) {
        for (let index = targetIndex + 1; index < prev.length; index += 1) {
          const candidate = prev[index];
          if (candidate.type === 'labor') break;
          if (candidate.type === 'material' && !candidate.syncRole) {
            legacyDependentIds.add(candidate.id);
          }
        }
      }

      const nextItems = prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if ((patch.description !== undefined || patch.type !== undefined) && next.type === 'labor') {
          const match = resolveLaborMasterItem(next);
          if (match) {
            if (patch.description !== undefined) {
              next.description = match.name;
            }
            next.unitPrice = getMasterItemSuggestedPrice(match);
            next.unit = match.unit || '';
            next.technicalNotes = mergeUniqueText(
              [normalizeTechnicalNotes(match.technical_notes), buildLaborPriceUpdateNote(match)],
              '\n\n'
            );
            next.masterItemId = match.id;
            next.masterItemCategory = match.category || '';
            next.masterItemSourceRef = match.source_ref || '';
          } else if (patch.description !== undefined) {
            next.unit = '';
            next.technicalNotes = '';
            next.masterItemId = '';
            next.masterItemCategory = '';
            next.masterItemSourceRef = '';
          }
        }
        if (patch.type === 'material') {
          next.unit = '';
          next.technicalNotes = '';
          next.masterItemId = '';
          next.masterItemCategory = '';
          next.masterItemSourceRef = '';
          next.syncGroupId = '';
          next.syncRole = undefined;
          next.syncDriverId = '';
          next.syncQuantityPerUnit = undefined;
        }
        if (shouldSyncMaterials && legacyDependentIds.size > 0) {
          next.syncGroupId = legacySyncGroupId;
          next.syncRole = 'driver';
        }
        return next;
      });

      if (!shouldSyncMaterials) return mergeQuoteMaterialItems(nextItems);

      const updatedDriver = nextItems.find((item) => item.id === id);
      const nextQuantity = Math.max(0, Number(updatedDriver?.quantity || 0));
      if (!updatedDriver || nextQuantity === originalQuantity) return mergeQuoteMaterialItems(nextItems);
      const driverQuantityById = new Map(
        nextItems
          .filter((item) => item.type === 'labor')
          .map((item) => [item.id, Math.max(0, Number(item.quantity || 0))])
      );

      return mergeQuoteMaterialItems(nextItems.map((item) => {
        if (item.id === id) return item;

        const currentSources = getQuoteItemSyncSources(item);
        const sourceMatchesDriver = currentSources.some(
          (source) =>
            source.syncDriverId === id ||
            (!!updatedDriver.syncGroupId && source.syncGroupId === updatedDriver.syncGroupId)
        );
        const isSyncedDependent =
          item.type === 'material' &&
          item.syncRole === 'dependent' &&
          (sourceMatchesDriver ||
            item.syncDriverId === id ||
            (!!updatedDriver.syncGroupId && item.syncGroupId === updatedDriver.syncGroupId));
        const isLegacyDependent = legacyDependentIds.has(item.id);

        if (!isSyncedDependent && !isLegacyDependent) return item;

        const nextSources =
          currentSources.length > 0
            ? currentSources
            : [
                {
                  syncGroupId: item.syncGroupId || updatedDriver.syncGroupId || legacySyncGroupId,
                  syncDriverId: item.syncDriverId || id,
                  syncQuantityPerUnit:
                    item.syncQuantityPerUnit && item.syncQuantityPerUnit > 0
                      ? item.syncQuantityPerUnit
                      : originalQuantity > 0
                        ? item.quantity / originalQuantity
                        : 0,
                },
              ];
        const normalizedSources = normalizeQuoteItemSyncSources(nextSources);
        if (normalizedSources.length === 0) return item;
        const nextMaterialQuantity = roundMeasure(
          normalizedSources.reduce((sum, source) => {
            const driverQuantity =
              source.syncDriverId === id ? nextQuantity : driverQuantityById.get(source.syncDriverId) || 0;
            return sum + driverQuantity * source.syncQuantityPerUnit;
          }, 0)
        );

        return {
          ...item,
          quantity: nextMaterialQuantity,
          syncGroupId: item.syncGroupId || updatedDriver.syncGroupId || legacySyncGroupId,
          syncRole: 'dependent',
          syncDriverId: normalizedSources.length === 1 ? normalizedSources[0].syncDriverId : '',
          syncQuantityPerUnit: roundMeasure(
            normalizedSources.reduce((sum, source) => sum + source.syncQuantityPerUnit, 0)
          ),
          syncSources: normalizedSources,
        };
      }));
    });
  };

  useEffect(() => {
    if (laborMasterItems.length === 0) return;
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const merged = mergeItemWithMasterItem(item, { fillNotesFromMaster: true });
        if (
          merged.technicalNotes !== item.technicalNotes ||
          merged.unitPrice !== item.unitPrice ||
          merged.masterItemId !== item.masterItemId ||
          merged.masterItemCategory !== item.masterItemCategory ||
          merged.masterItemSourceRef !== item.masterItemSourceRef
        ) {
          changed = true;
          return merged;
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [laborMasterItems, laborMasterById, laborMasterChoiceMap, laborMasterNameMap]);

  const handleRemoveItem = (id: string) => {
    setEditingQuoteItemId((currentId) => (currentId === id ? '' : currentId));
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleTechnicianAddressQueryChange = (address: string) => {
    setProfileForm((prev) => ({ ...prev, address }));
  };

  const handleCountryChange = (country: string) => {
    const normalizedCountry = getCountryConfig(country).name;
    setTechnicianLocationResult(null);
    setProfileForm((prev) => ({
      ...prev,
      country: normalizedCountry,
      province: '',
      city: '',
      address: '',
      locationPickerResult: null,
    }));
  };

  const handleProvinceChange = (province: string) => {
    if (profileForm.province !== province) {
      setTechnicianLocationResult(null);
    }
    setProfileForm((prev) => ({
      ...prev,
      province,
      city: prev.province === province ? prev.city : '',
      address: prev.province === province ? prev.address : '',
      locationPickerResult: prev.province === province ? prev.locationPickerResult : null,
    }));
  };

  const handleCityChange = (city: string) => {
    if (profileForm.city !== city) {
      setTechnicianLocationResult(null);
    }
    setProfileForm((prev) => ({
      ...prev,
      city,
      address: prev.city === city ? prev.address : '',
      locationPickerResult: prev.city === city ? prev.locationPickerResult : null,
    }));
  };

  const handleTechnicianLocationChange = (result: LocationPickerResult | null) => {
    const countryHint = result ? inferCountryFromCandidates(result.displayName, profileForm.country) : profileForm.country;
    const provinceHint = result ? extractProvinceHintForCountry(countryHint, result.displayName) : '';
    const localityHint = result ? extractLocalityHint(result.displayName) : '';
    const normalizedLocationLabel = String(result?.displayName || '').trim();
    setTechnicianLocationResult(result);
    setProfileForm((prev) => ({
      ...prev,
      country: countryHint || prev.country,
      address:
        result && prev.address.trim()
          ? prev.address
          : result && normalizedLocationLabel && normalizedLocationLabel !== GENERIC_MAP_LOCATION_LABEL
          ? normalizedLocationLabel
          : prev.address,
      city: prev.city || localityHint,
      province: prev.province || provinceHint,
      locationPickerResult: result,
    }));
    setProfilePersistTick((prev) => prev + 1);
  };

  const handleGeocodeSearch = async (options: { auto?: boolean; query?: string } = {}) => {
    const isAuto = Boolean(options.auto);
    const query = (options.query ?? clientAddress).trim();
    const lookupSequence = quoteAddressLookupSequenceRef.current + 1;
    quoteAddressLookupSequenceRef.current = lookupSequence;
    if (!query) {
      if (!isAuto) setGeoError('Ingresa una direccion para buscar en el mapa.');
      return;
    }
    if (isAuto && query.length < 3) {
      setGeoLoading(false);
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    if (!isAuto) setGeoResults([]);
    try {
      const fetchGeocodePayload = async (quickSearch: boolean) => {
        const params = new URLSearchParams({
          query,
          limit: quickSearch ? '6' : '10',
          country: profileForm.country || DEFAULT_COUNTRY_NAME,
        });
        if (quickSearch) params.set('quick', '1');
        const response = await fetch(`/api/geocode/search?${params.toString()}`, {
          cache: 'no-store',
        });
        return (await response.json()) as {
          results?: Array<GeoResult>;
          error?: string;
        };
      };

      let payload = await fetchGeocodePayload(isAuto);
      if (lookupSequence !== quoteAddressLookupSequenceRef.current) return;
      let data = Array.isArray(payload.results) ? payload.results : [];
      if (isAuto && data.length === 0) {
        payload = await fetchGeocodePayload(false);
        if (lookupSequence !== quoteAddressLookupSequenceRef.current) return;
        data = Array.isArray(payload.results) ? payload.results : [];
      }
      const seen = new Set<string>();
      const mapped = data
        .map((item) => ({
          display_name: String(item.display_name || '').trim(),
          full_display_name: String(item.full_display_name || '').trim(),
          primary_label: String(item.primary_label || item.display_name || '').trim(),
          secondary_label: String(item.secondary_label || '').trim(),
          detail_label: String(item.detail_label || '').trim(),
          accuracy_label: String(item.accuracy_label || '').trim(),
          locality: String(item.locality || '').trim(),
          province: String(item.province || '').trim(),
          precision: item.precision === 'exact' ? 'exact' as const : 'approx' as const,
          lat: Number(item.lat),
          lon: Number(item.lon),
        }))
        .filter((item) => {
          if (!item.display_name || !Number.isFinite(item.lat) || !Number.isFinite(item.lon)) return false;
          const key = `${item.primary_label || item.display_name}|${item.secondary_label}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      if (mapped.length === 0) {
        if (!isAuto) setGeoError(payload.error || 'No encontramos esa direccion. Prueba con mas detalles.');
      }
      setGeoResults(mapped);
    } catch {
      if (lookupSequence !== quoteAddressLookupSequenceRef.current) return;
      if (!isAuto) setGeoError('No pudimos buscar la direccion. Intenta nuevamente.');
    } finally {
      if (lookupSequence === quoteAddressLookupSequenceRef.current) {
        setGeoLoading(false);
      }
    }
  };

  const scheduleQuoteAddressLookup = (address: string) => {
    if (quoteAddressLookupTimerRef.current) {
      window.clearTimeout(quoteAddressLookupTimerRef.current);
      quoteAddressLookupTimerRef.current = null;
    }
    quoteAddressLookupSequenceRef.current += 1;
    const query = address.trim();
    setGeoError('');
    if (query.length < 3) {
      setGeoResults([]);
      setGeoLoading(false);
      return;
    }
    setGeoResults([]);
    setGeoLoading(true);
    quoteAddressLookupTimerRef.current = window.setTimeout(() => {
      void handleGeocodeSearch({ auto: true, query });
    }, 280);
  };

  const handleQuoteAddressChange = (nextValue: string) => {
    setClientAddress(nextValue);
    if (geoSelected && nextValue !== geoSelected.display_name) {
      setGeoSelected(null);
    }
    scheduleQuoteAddressLookup(nextValue);
  };

  const handleSelectGeo = (result: GeoResult) => {
    if (quoteAddressLookupTimerRef.current) {
      window.clearTimeout(quoteAddressLookupTimerRef.current);
      quoteAddressLookupTimerRef.current = null;
    }
    quoteAddressLookupSequenceRef.current += 1;
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
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          itemImages: (item.itemImages || []).filter(
            (image) => image.sourceAttachmentId !== attachment.id && image.url !== attachment.file_url
          ),
        }))
      );
    } catch (error) {
      console.error('Error eliminando adjunto:', error);
      setFormError('No pudimos eliminar el adjunto.');
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleItemImageUpload = async (itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (!session?.user?.id) {
      setFormError('Inicia sesion para subir imagenes.');
      return;
    }

    const targetItem = items.find((item) => item.id === itemId);
    if (!targetItem) return;

    const currentImages = targetItem.itemImages || [];
    const availableSlots = Math.max(0, QUOTE_ITEM_MAX_IMAGES - currentImages.length);
    if (availableSlots <= 0) {
      setFormError(`Cada item puede tener hasta ${QUOTE_ITEM_MAX_IMAGES} imagenes.`);
      return;
    }

    const selectedImages = files
      .filter((file) => (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name))
      .slice(0, availableSlots);

    if (!selectedImages.length) {
      setFormError('Solo se permiten imagenes.');
      return;
    }

    const oversized = selectedImages.find((file) => file.size > QUOTE_ITEM_MAX_IMAGE_BYTES);
    if (oversized) {
      setFormError('Cada imagen debe pesar menos de 8 MB.');
      return;
    }

    setUploadingItemImageId(itemId);
    setFormError('');
    try {
      const uploadedImages: ItemImageForm[] = [];
      for (const file of selectedImages) {
        const storagePath = buildQuoteItemImagePath(session.user.id, itemId, file.name);
        const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
        uploadedImages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: publicData.publicUrl,
          name: file.name,
          fileType: file.type || '',
          storagePath,
          uploadedAt: new Date().toISOString(),
        });
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                itemImages: [...(item.itemImages || []), ...uploadedImages],
              }
            : item
        )
      );
      setInfoMessage('Imagen asignada al item.');
    } catch (error) {
      console.error('Error subiendo imagen del item:', error);
      setFormError('No pudimos subir la imagen del item.');
    } finally {
      setUploadingItemImageId(null);
    }
  };

  const handleAssignAttachmentToItem = (itemId: string, attachment: AttachmentRow) => {
    const targetItem = items.find((item) => item.id === itemId);
    if (!targetItem) return;

    const currentImages = targetItem.itemImages || [];
    if (currentImages.length >= QUOTE_ITEM_MAX_IMAGES) {
      setFormError(`Cada item puede tener hasta ${QUOTE_ITEM_MAX_IMAGES} imagenes.`);
      return;
    }

    const alreadyAssigned = currentImages.some(
      (image) => image.sourceAttachmentId === attachment.id || image.url === attachment.file_url
    );
    if (alreadyAssigned) {
      setInfoMessage('Esa foto ya esta asignada al item.');
      return;
    }

    const linkedImage: ItemImageForm = {
      id: `attachment-${attachment.id}`,
      url: attachment.file_url,
      name: attachment.file_name || 'Foto adjunta',
      fileType: attachment.file_type || '',
      storagePath: null,
      uploadedAt: attachment.created_at || new Date().toISOString(),
      source: 'quote-attachment',
      sourceAttachmentId: attachment.id,
    };

    setFormError('');
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              itemImages: [...(item.itemImages || []), linkedImage],
            }
          : item
      )
    );
    setInfoMessage('Foto adjunta asignada al item.');
  };

  const handleItemImageRemove = async (itemId: string, image: ItemImageForm) => {
    const deleteKey = `${itemId}:${image.id}`;
    setDeletingItemImageId(deleteKey);
    setFormError('');
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              itemImages: (item.itemImages || []).filter((candidate) => candidate.id !== image.id),
            }
          : item
      )
    );

    const shouldDeleteStorage = image.source !== 'quote-attachment' && !image.sourceAttachmentId;
    const storagePath = shouldDeleteStorage ? image.storagePath || getAttachmentStoragePath(image.url) : null;
    if (storagePath) {
      const { error } = await supabase.storage.from('urbanfix-assets').remove([storagePath]);
      if (error) {
        setFormError('La imagen se quito del item, pero no pudimos eliminarla del storage.');
      }
    }
    setDeletingItemImageId(null);
  };

  const laborSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + (item.type === 'labor' ? item.quantity * item.unitPrice : 0), 0),
    [items]
  );
  const materialSubtotal = useMemo(
    () => items.reduce((acc, item) => acc + (item.type === 'material' ? item.quantity * item.unitPrice : 0), 0),
    [items]
  );
  const laborItems = useMemo(() => items.filter((item) => item.type === 'labor'), [items]);
  const materialItems = useMemo(() => items.filter((item) => item.type === 'material'), [items]);
  const quoteImageAttachments = useMemo(() => attachments.filter(isImageAttachment), [attachments]);
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0),
    [items]
  );
  const discountPercent = Math.min(100, Math.max(0, discount));
  const discountAmount = subtotal * (discountPercent / 100);
  const totalBeforeTax = Math.max(0, subtotal - discountAmount);
  const taxAmount = applyTax ? totalBeforeTax * TAX_RATE : 0;
  const total = totalBeforeTax + taxAmount;
  const validQuoteItems = useMemo(() => items.filter((item) => item.description.trim()), [items]);
  const quoteClientReady = Boolean(clientName.trim() && geoSelected);
  const quoteItemsReady = validQuoteItems.length > 0;
  const quoteMaterialsReady = materialItems.length > 0 || quoteItemsReady;
  const quoteSettingsReady = total > 0;
  const completedQuoteSteps = [quoteClientReady, quoteItemsReady, quoteMaterialsReady, quoteSettingsReady].filter(Boolean).length;
  const quoteReadyToSend = quoteClientReady && quoteItemsReady && total > 0;
  const quoteStats = useMemo(() => {
    const totals = quotes.reduce(
      (acc, quote) => {
        const status = normalizeStatusValue(quote.status);
        const amount = toAmountValue(quote.total_amount);
        if (status === 'draft') acc.draft += 1;
        if (quoteHasStatusGroup(status, 'pending')) acc.pending += 1;
        if (quoteHasStatusGroup(status, 'approved')) acc.approved += 1;
        if (quoteHasStatusGroup(status, 'scheduled')) acc.scheduled += 1;
        if (quoteHasStatusGroup(status, 'in_progress')) acc.in_progress += 1;
        if (quoteHasStatusGroup(status, 'completed')) acc.completed += 1;
        if (quoteHasStatusGroup(status, 'paid')) {
          acc.paid += 1;
          acc.paidAmount += amount;
          acc.profitAmount += getLaborAmount(quote);
        }
        if (quoteHasStatusGroup(status, 'rejected')) acc.rejected += 1;
        if (quoteHasStatusGroup(status, 'discarded')) acc.discarded += 1;
        if (quoteHasStatusGroup(status, 'cancelled')) acc.cancelled += 1;
        if (quoteHasStatusGroup(status, 'expired')) acc.expired += 1;
        acc.amount += amount;
        return acc;
      },
      {
        draft: 0,
        pending: 0,
        approved: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        paid: 0,
        rejected: 0,
        discarded: 0,
        cancelled: 0,
        expired: 0,
        amount: 0,
        paidAmount: 0,
        profitAmount: 0,
      }
    );
    return {
      total: quotes.length,
      ...totals,
    };
  }, [quotes]);
  const draftQuotes = useMemo(
    () =>
      quotes
        .filter((quote) => normalizeStatusValue(quote.status) === 'draft')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [quotes]
  );
  const getQuoteFilterCount = (key: QuoteFilter) => {
    if (key === 'all') return quoteStats.total;
    return quoteStats[key];
  };
  const clientHistory = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        name: string;
        quotes: QuoteRow[];
        totalAmount: number;
        paidAmount: number;
        firstDateMs: number;
        lastDateMs: number;
        pendingCount: number;
        approvedCount: number;
        paidCount: number;
        locationCount: number;
      }
    >();

    quotes.forEach((quote) => {
      const name = (quote.client_name || 'Cliente sin nombre').trim() || 'Cliente sin nombre';
      const key = normalizeText(name) || quote.id;
      const createdMs = new Date(quote.created_at).getTime();
      const createdTime = Number.isFinite(createdMs) ? createdMs : 0;
      const amount = toAmountValue(quote.total_amount);
      const status = normalizeStatusValue(quote.status);
      const current =
        grouped.get(key) ||
        ({
          key,
          name,
          quotes: [],
          totalAmount: 0,
          paidAmount: 0,
          firstDateMs: createdTime,
          lastDateMs: createdTime,
          pendingCount: 0,
          approvedCount: 0,
          paidCount: 0,
          locationCount: 0,
        } satisfies {
          key: string;
          name: string;
          quotes: QuoteRow[];
          totalAmount: number;
          paidAmount: number;
          firstDateMs: number;
          lastDateMs: number;
          pendingCount: number;
          approvedCount: number;
          paidCount: number;
          locationCount: number;
        });

      current.quotes.push(quote);
      current.totalAmount += amount;
      if (quoteHasStatusGroup(status, 'paid')) current.paidAmount += amount;
      if (quoteHasStatusGroup(status, 'pending')) current.pendingCount += 1;
      if (quoteHasStatusGroup(status, 'approved')) current.approvedCount += 1;
      if (quoteHasStatusGroup(status, 'paid')) current.paidCount += 1;
      if (resolveQuoteMapCoordinate(quote)) {
        current.locationCount += 1;
      }
      current.firstDateMs = Math.min(current.firstDateMs, createdTime);
      current.lastDateMs = Math.max(current.lastDateMs, createdTime);
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .map((client) => {
        const sortedQuotes = [...client.quotes].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latestQuote = sortedQuotes[0] || client.quotes[0];
        const latestStatus = normalizeStatusValue(latestQuote?.status);
        const latestStatusLabel = getQuoteStatusInfo(latestStatus).label || 'Presupuesto';
        const lastDate = new Date(client.lastDateMs);
        const firstDate = new Date(client.firstDateMs);
        return {
          ...client,
          latestQuote,
          latestStatusLabel,
          lastDateLabel: lastDate.toLocaleDateString('es-AR'),
          firstDateLabel: firstDate.toLocaleDateString('es-AR'),
        };
      })
      .sort((a, b) => b.lastDateMs - a.lastDateMs);
  }, [quotes]);
  const clientZoneMap = useMemo(() => {
    const locatedClients = clientHistory
      .map((client) => {
        const locatedQuote = [...client.quotes]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .find((quote) => resolveQuoteMapCoordinate(quote) !== null);
        if (!locatedQuote) return null;
        const coordinate = resolveQuoteMapCoordinate(locatedQuote);
        if (!coordinate) return null;
        return {
          id: client.key,
          name: client.name,
          totalAmount: client.totalAmount,
          movements: client.quotes.length,
          lastDateLabel: client.lastDateLabel,
          address: getQuoteAddress(locatedQuote) || 'Zona sin dirección',
          lat: coordinate.lat,
          lon: coordinate.lon,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      totalAmount: number;
      movements: number;
      lastDateLabel: string;
      address: string;
      lat: number;
      lon: number;
    }>;

    const points =
      locatedClients.length > 0 || !isDesignPreview
        ? locatedClients
        : [
            {
              id: 'preview-daniel',
              name: 'DANIEL',
              totalAmount: 658858.6,
              movements: 2,
              lastDateLabel: '26/2/2026',
              address: 'San Nicolás',
              lat: -34.6037,
              lon: -58.3816,
            },
            {
              id: 'preview-cristina',
              name: 'CRISTINA',
              totalAmount: 196000,
              movements: 1,
              lastDateLabel: '9/2/2026',
              address: 'Recoleta',
              lat: -34.5889,
              lon: -58.3974,
            },
            {
              id: 'preview-zona-sur',
              name: 'Cliente zona sur',
              totalAmount: 156000,
              movements: 1,
              lastDateLabel: '5/2/2026',
              address: 'Balvanera',
              lat: -34.6098,
              lon: -58.4071,
            },
          ];

    return { points };
  }, [clientHistory, isDesignPreview]);
  const clientHistorySummary = useMemo(
    () => ({
      clients: clientHistory.length,
      movements: quoteStats.total,
      located: clientHistory.filter((client) => client.locationCount > 0).length,
      pending: clientHistory.filter((client) => client.quotes.some((quote) => quoteNeedsFollowUp(quote.status))).length,
      paid: clientHistory.filter((client) => client.paidCount > 0).length,
    }),
    [clientHistory, quoteStats.total]
  );
  const clientHistoryFilterOptions = useMemo(
    () => [
      { id: 'all' as const, label: 'Todos', count: clientHistorySummary.clients },
      { id: 'located' as const, label: 'Con ubicación', count: clientHistorySummary.located },
      { id: 'pending' as const, label: 'Seguimiento', count: clientHistorySummary.pending },
      { id: 'paid' as const, label: 'Cobrados', count: clientHistorySummary.paid },
    ],
    [clientHistorySummary]
  );
  const filteredClientHistory = useMemo(() => {
    if (clientHistoryFilter === 'located') return clientHistory.filter((client) => client.locationCount > 0);
    if (clientHistoryFilter === 'pending') {
      return clientHistory.filter((client) => client.quotes.some((quote) => quoteNeedsFollowUp(quote.status)));
    }
    if (clientHistoryFilter === 'paid') return clientHistory.filter((client) => client.paidCount > 0);
    return clientHistory;
  }, [clientHistory, clientHistoryFilter]);
  const visibleClientZonePoints = useMemo(() => {
    const visibleKeys = new Set(filteredClientHistory.map((client) => client.key));
    return clientZoneMap.points.filter((point) => visibleKeys.has(point.id));
  }, [clientZoneMap.points, filteredClientHistory]);
  useEffect(() => {
    if (!selectedClientKey) return;
    if (!filteredClientHistory.some((client) => client.key === selectedClientKey)) {
      setSelectedClientKey('');
    }
  }, [filteredClientHistory, selectedClientKey]);
  const activeQuote = useMemo(
    () => (activeQuoteId ? quotes.find((quote) => quote.id === activeQuoteId) || null : null),
    [quotes, activeQuoteId]
  );
  const activeQuoteIndex = useMemo(
    () => (activeQuoteId ? quotes.findIndex((quote) => quote.id === activeQuoteId) : -1),
    [quotes, activeQuoteId]
  );
  const previousViewerQuote = activeQuoteIndex > 0 ? quotes[activeQuoteIndex - 1] : null;
  const nextViewerQuote =
    activeQuoteIndex >= 0 && activeQuoteIndex < quotes.length - 1 ? quotes[activeQuoteIndex + 1] : null;
  const financeSeries = useMemo(() => {
    const now = new Date();
    const currentPeriod = startOfFinancePeriod(now, financeTimelineMode);
    const basePeriod = addFinancePeriods(currentPeriod, financeTimelineOffset, financeTimelineMode);
    const points: {
      key: string;
      label: string;
      quotes: number;
      paid: number;
      profit: number;
      isFuture: boolean;
      quoteRefs: Array<{
        id: string;
        number: string;
        clientName: string;
        amount: number;
        paid: number;
        profit: number;
        status: string;
        statusLabel: string;
        dateLabel: string;
      }>;
    }[] = [];
    for (let i = 5; i >= -2; i -= 1) {
      const point = addFinancePeriods(basePeriod, -i, financeTimelineMode);
      const key = getFinancePeriodKey(point, financeTimelineMode);
      const label = getFinancePeriodLabel(point, financeTimelineMode);
      points.push({ key, label, quotes: 0, paid: 0, profit: 0, isFuture: point > currentPeriod, quoteRefs: [] });
    }
    quotes.forEach((quote) => {
      const created = new Date(quote.created_at);
      const key = getFinancePeriodKey(created, financeTimelineMode);
      const bucket = points.find((item) => item.key === key);
      if (!bucket) return;
      const amount = toAmountValue(quote.total_amount);
      const status = normalizeStatusValue(quote.status);
      bucket.quotes += amount;
      const paidAmount = quoteHasStatusGroup(status, 'paid') ? amount : 0;
      const profitAmount = quoteHasStatusGroup(status, 'paid') ? getLaborAmount(quote) : 0;
      if (quoteHasStatusGroup(status, 'paid')) {
        bucket.paid += paidAmount;
        bucket.profit += profitAmount;
      }
      bucket.quoteRefs.push({
        id: quote.id,
        number: getQuoteDisplayNumber(quote),
        clientName: quote.client_name || 'Cliente',
        amount,
        paid: paidAmount,
        profit: profitAmount,
        status,
        statusLabel: getQuoteStatusInfo(status).label,
        dateLabel: Number.isFinite(created.getTime()) ? created.toLocaleDateString('es-AR') : '',
      });
    });
    points.forEach((point) => {
      point.quoteRefs.sort((a, b) => b.amount - a.amount);
    });
    return points;
  }, [financeTimelineMode, financeTimelineOffset, quotes]);
  const financeTimelinePositionLabel =
    financeTimelineOffset === 0
      ? 'Actual'
      : financeTimelineOffset < 0
        ? `${Math.abs(financeTimelineOffset)} ${getFinanceTimelineUnit(
            financeTimelineMode,
            Math.abs(financeTimelineOffset)
          )} atrás`
        : `${financeTimelineOffset} ${getFinanceTimelineUnit(financeTimelineMode, financeTimelineOffset)} adelante`;
  const financeTimelineTitle =
    financeTimelineMode === 'weekly'
      ? 'Tendencia semanal + próximas 2'
      : financeTimelineMode === 'yearly'
        ? 'Tendencia anual + próximos 2'
        : 'Tendencia mensual + próximos 2';
  const moveFinanceTimeline = (delta: number) => {
    setActiveFinancePointKey(null);
    setFinanceTimelineOffset((value) => Math.max(-12, Math.min(6, value + delta)));
  };
  const handleFinanceTimelinePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button')) return;
    financeTimelineDragRef.current = { lastX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleFinanceTimelinePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = financeTimelineDragRef.current;
    if (!drag) return;
    const delta = event.clientX - drag.lastX;
    if (Math.abs(delta) < 72) return;
    moveFinanceTimeline(delta < 0 ? 1 : -1);
    drag.lastX = event.clientX;
  };
  const handleFinanceTimelinePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    financeTimelineDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const financeOverview = useMemo(() => {
    const bestMonth = financeSeries.reduce(
      (best, item) => (item.quotes > best.quotes ? item : best),
      financeSeries[0] || { key: '', label: '-', quotes: 0, paid: 0, profit: 0 }
    );
    const currentKey = getFinancePeriodKey(new Date(), financeTimelineMode);
    const currentMonth = financeSeries.find((item) => !item.isFuture && item.key === currentKey);
    const latestActiveMonth =
      [...financeSeries].reverse().find((item) => item.quotes > 0 || item.paid > 0 || item.profit > 0) ||
      financeSeries[financeSeries.length - 1] ||
      bestMonth;
    const futureMonths = financeSeries.filter((item) => item.isFuture).map((item) => item.label.toUpperCase());
    const collectionRate = quoteStats.amount > 0 ? Math.round((quoteStats.paidAmount / quoteStats.amount) * 100) : 0;
    const laborRate = quoteStats.paidAmount > 0 ? Math.round((quoteStats.profitAmount / quoteStats.paidAmount) * 100) : 0;
    return {
      bestMonth,
      currentMonth,
      futureMonths,
      latestActiveMonth,
      collectionRate,
      laborRate,
    };
  }, [financeSeries, financeTimelineMode, quoteStats.amount, quoteStats.paidAmount, quoteStats.profitAmount]);
  const financeChart = useMemo(() => {
    const width = 1480;
    const height = 250;
    const padding = { top: 22, right: 22, bottom: 38, left: 58 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxRawValue = Math.max(
      1,
      ...financeSeries
        .filter((item) => !item.isFuture)
        .map((item) => Math.max(item.quotes || 0, item.paid || 0, item.profit || 0))
    );
    const maxValue = getNiceChartMax(maxRawValue * 1.12);
    const step = financeSeries.length > 1 ? plotWidth / (financeSeries.length - 1) : 0;
    const getX = (index: number) => padding.left + index * step;
    const getY = (value: number) => padding.top + ((maxValue - value) / maxValue) * plotHeight;
    const buildPoints = (key: 'quotes' | 'paid' | 'profit') =>
      financeSeries.map((item, index) => ({
        key: item.key,
        x: getX(index),
        y: getY(item[key] || 0),
        value: item[key] || 0,
        label: item.label,
        hasValue: !item.isFuture,
        quoteRefs: item.quoteRefs,
      }));
    const buildPath = (points: ReturnType<typeof buildPoints>) =>
      points
        .filter((point) => point.hasValue)
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');
    const buildAreaPath = (points: ReturnType<typeof buildPoints>) => {
      const visiblePoints = points.filter((point) => point.hasValue);
      if (!visiblePoints.length) return '';
      const bottomY = getY(0);
      return `${buildPath(visiblePoints)} L ${visiblePoints[visiblePoints.length - 1].x.toFixed(
        2
      )} ${bottomY.toFixed(2)} L ${visiblePoints[0].x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
    };
    const quotesPoints = buildPoints('quotes');
    const paidPoints = buildPoints('paid');
    const profitPoints = buildPoints('profit');
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = maxValue * ratio;
      return {
        value,
        y: getY(value),
        label: formatCompactDashboardMoney(value),
      };
    });
    return {
      width,
      height,
      padding,
      plotLeft: padding.left,
      plotRight: width - padding.right,
      plotBottom: height - padding.bottom,
      gridLines,
      quotesAreaPath: buildAreaPath(quotesPoints),
      quotesPath: buildPath(quotesPoints),
      paidPath: buildPath(paidPoints),
      profitPath: buildPath(profitPoints),
      quotesPoints,
      paidPoints,
      profitPoints,
    };
  }, [financeSeries]);
  const activeFinancePoint = useMemo(() => {
    if (!activeFinancePointKey) return null;
    const index = financeSeries.findIndex((item) => item.key === activeFinancePointKey);
    if (index < 0) return null;
    const seriesPoint = financeSeries[index];
    const chartPoint = financeChart.quotesPoints[index];
    if (!seriesPoint || !chartPoint || seriesPoint.isFuture || seriesPoint.quoteRefs.length === 0) return null;
    const pendingAmount = Math.max(0, seriesPoint.quotes - seriesPoint.paid);
    return {
      ...seriesPoint,
      pendingAmount,
      xPercent: (chartPoint.x / financeChart.width) * 100,
      yPercent: (chartPoint.y / financeChart.height) * 100,
    };
  }, [activeFinancePointKey, financeChart, financeSeries]);
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
      if (!quoteIsBillable(status)) return;
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
      if (!quoteIsBillable(status)) return;
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
  const billingBestMonth = useMemo(
    () =>
      billingMonthlySeries.reduce(
        (best, item) => (item.total > best.total ? item : best),
        billingMonthlySeries[0] || { key: '', label: '-', total: 0 }
      ),
    [billingMonthlySeries]
  );
  const billingLastMonth = billingMonthlySeries[billingMonthlySeries.length - 1] || {
    key: '',
    label: '-',
    total: 0,
  };
  const billingOpenQuotes = useMemo(
    () =>
      quotes.filter((quote) => {
        const status = normalizeStatusValue(quote.status);
        return quoteIsBillable(status) && !quoteHasStatusGroup(status, 'paid');
      }),
    [quotes]
  );
  const billingOpenAmount = useMemo(
    () => billingOpenQuotes.reduce((sum, quote) => sum + toAmountValue(quote.total_amount), 0),
    [billingOpenQuotes]
  );
  const billingRecentQuotes = useMemo(
    () =>
      quotes
        .filter((quote) => quoteIsBillable(quote.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [quotes]
  );
  const billingProgress = useMemo(() => {
    const billableTotal = quoteStats.paidAmount + billingOpenAmount;
    const paidPercent = billableTotal > 0 ? Math.round((quoteStats.paidAmount / billableTotal) * 100) : 0;
    const openPercent = billableTotal > 0 ? Math.round((billingOpenAmount / billableTotal) * 100) : 0;
    return { billableTotal, paidPercent, openPercent };
  }, [billingOpenAmount, quoteStats.paidAmount]);
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );
  const notificationStats = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((item) => !item.read_at).length,
      quote: notifications.filter((item) => getNotificationGroup(item) === 'quote').length,
      agenda: notifications.filter((item) => getNotificationGroup(item) === 'agenda').length,
    }),
    [notifications]
  );
  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'all') return notifications;
    if (notificationFilter === 'unread') return notifications.filter((item) => !item.read_at);
    return notifications.filter((item) => getNotificationGroup(item) === notificationFilter);
  }, [notificationFilter, notifications]);
  const masterCategories = useMemo(() => {
    const set = new Set<string>();
    masterItems.forEach((item) => {
      set.add(resolveMasterRubro(item));
    });
    return Array.from(set).sort(compareRubroValues);
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
    () =>
      quotes.filter(
        (quote) =>
          quoteHasStatusGroup(quote.status, 'approved') ||
          quoteHasStatusGroup(quote.status, 'scheduled') ||
          quoteHasStatusGroup(quote.status, 'in_progress')
      ),
    [quotes]
  );
  const dashboardJobPoints = useMemo(() => {
    const points: DashboardMapPoint[] = [];
    quotes.forEach((quote) => {
      if (!quoteIsOperational(quote.status)) return;
      const coordinate = resolveQuoteMapCoordinate(quote);
      if (!coordinate) return;
      const status = normalizeStatusValue(quote.status);
      const statusLabel = getQuoteStatusInfo(status).label || 'Trabajo';
      const addressLabel = getQuoteAddress(quote) || 'Ubicacion sin direccion';
      points.push({
        id: `job:${quote.id}`,
        kind: 'job',
        title: quote.client_name || 'Trabajo sin cliente',
        subtitle: addressLabel,
        meta: `${statusLabel} · ${new Date(quote.created_at).toLocaleDateString('es-AR')}`,
        lat: coordinate.lat,
        lon: coordinate.lon,
        createdAt: quote.created_at,
      });
    });
    return points.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes]);
  const filteredNearbyRequests = useMemo(() => {
    return [...nearbyRequests].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [nearbyRequests]);
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
      points.push({
        id: `request:${request.id}`,
        kind: 'request',
        title: request.title || 'Solicitud',
        subtitle: requestPublicZoneLabel(request),
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
  const activeNearbyRequestIndex = useMemo(() => {
    if (filteredNearbyRequests.length === 0) return -1;
    const selectedRequestId =
      dashboardSelectedMapPoint?.kind === 'request' ? dashboardSelectedMapPoint.id.replace('request:', '') : '';
    const selectedIndex = selectedRequestId
      ? filteredNearbyRequests.findIndex((request) => request.id === selectedRequestId)
      : -1;
    return selectedIndex >= 0 ? selectedIndex : 0;
  }, [dashboardSelectedMapPoint?.id, dashboardSelectedMapPoint?.kind, filteredNearbyRequests]);
  const activeNearbyRequest = activeNearbyRequestIndex >= 0 ? filteredNearbyRequests[activeNearbyRequestIndex] : null;
  const showNearbyRequestAt = (nextIndex: number) => {
    if (filteredNearbyRequests.length === 0) return;
    const normalizedIndex = (nextIndex + filteredNearbyRequests.length) % filteredNearbyRequests.length;
    const request = filteredNearbyRequests[normalizedIndex];
    setDashboardMapFilter('requests');
    setDashboardMapSelectedId(`request:${request.id}`);
  };
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
  const selectedAccessMeta = useMemo(() => {
    if (selectedAccessProfile === 'empresa') return AUTH_PROFILE_META.empresa;
    if (selectedAccessProfile === 'tecnico') return AUTH_PROFILE_META.tecnico;
    return null;
  }, [selectedAccessProfile]);
  const agendaBaseDate = startOfDay(new Date());
  const agendaTodayKey = formatDateLocal(agendaBaseDate);
  const agendaTomorrowKey = formatDateLocal(addDays(agendaBaseDate, 1));
  const agendaTodayTime = agendaBaseDate.getTime();
  const agendaNextWindowEndTime = addDays(agendaBaseDate, 7).getTime();
  const agendaWeekStart = startOfAgendaWeek(addDays(agendaBaseDate, agendaWeekOffset * 7));
  const agendaWeekEnd = addDays(agendaWeekStart, 6);
  const agendaWeekDays = Array.from({ length: 7 }, (_, index) => addDays(agendaWeekStart, index));
  const agendaWeekLabel = `${agendaWeekStart.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })} - ${agendaWeekEnd.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
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
  const agendaOverview = useMemo(() => {
    let unscheduled = 0;
    let activeToday = 0;
    let nextDays = 0;
    let past = 0;
    let totalAmount = 0;

    agendaJobs.forEach((quote) => {
      totalAmount += toAmountValue(quote.total_amount);
      const start = parseDateLocal(getDatePart(quote.start_date));
      const end = parseDateLocal(getDatePart(quote.end_date)) || start;

      if (!start) {
        unscheduled += 1;
        return;
      }

      const startTime = start.getTime();
      const endTime = (end || start).getTime();

      if (endTime < agendaTodayTime) {
        past += 1;
        return;
      }

      if (startTime <= agendaTodayTime && endTime >= agendaTodayTime) {
        activeToday += 1;
        return;
      }

      if (startTime <= agendaNextWindowEndTime) {
        nextDays += 1;
      }
    });

    return {
      total: agendaJobs.length,
      unscheduled,
      activeToday,
      nextDays,
      past,
      totalAmount,
    };
  }, [agendaJobs, agendaNextWindowEndTime, agendaTodayTime]);
  const agendaSections = useMemo(
    () =>
      agendaJobs.reduce(
        (acc, quote) => {
          const start = parseDateLocal(getDatePart(quote.start_date));
          const end = parseDateLocal(getDatePart(quote.end_date)) || start;

          if (!start) {
            acc.unscheduled.push(quote);
            return acc;
          }

          const startTime = start.getTime();
          const endTime = (end || start).getTime();

          if (endTime < agendaTodayTime) {
            acc.past.push(quote);
            return acc;
          }

          if (startTime <= agendaTodayTime && endTime >= agendaTodayTime) {
            acc.today.push(quote);
            return acc;
          }

          if (startTime <= agendaNextWindowEndTime) {
            acc.nextDays.push(quote);
            return acc;
          }

          acc.later.push(quote);
          return acc;
        },
        {
          unscheduled: [] as QuoteRow[],
          today: [] as QuoteRow[],
          nextDays: [] as QuoteRow[],
          later: [] as QuoteRow[],
          past: [] as QuoteRow[],
        }
      ),
    [agendaJobs, agendaNextWindowEndTime, agendaTodayTime]
  );
  const agendaCalendarDays = useMemo(
    () =>
      agendaWeekDays.map((day) => {
        const dayKey = formatDateLocal(day);
        const dayTime = startOfDay(day).getTime();
        const items = agendaJobs.filter((quote) => {
          const start = parseDateLocal(getDatePart(quote.start_date));
          if (!start) return false;
          const end = parseDateLocal(getDatePart(quote.end_date)) || start;
          return startOfDay(start).getTime() <= dayTime && startOfDay(end).getTime() >= dayTime;
        });
        return {
          key: dayKey,
          date: day,
          items,
          isToday: isSameDay(day, agendaBaseDate),
        };
      }),
    [agendaBaseDate, agendaJobs, agendaWeekDays]
  );
  const filteredQuotes = useMemo(() => {
    if (quoteFilter === 'all') return quotes;
    return quotes.filter((quote) => quoteHasStatusGroup(quote.status, quoteFilter));
  }, [quotes, quoteFilter]);

  const handleOpenViewer = () => {
    const id = extractQuoteId(viewerInput);
    if (!id || !isUuid(id)) {
      setViewerError('Ingresa un ID valido o pega un link correcto.');
      setViewerUrl(null);
      return;
    }
    setViewerError('');
    setViewerUrl(buildQuotePreviewLink(id));
    setActiveQuoteId(id);
  };

  const handleViewQuote = (quote: QuoteRow) => {
    const nextUrl = buildQuotePreviewLink(quote.id);
    setActiveQuoteId(quote.id);
    setViewerInput(buildQuoteLink(quote.id));
    setViewerUrl(nextUrl);
    setViewerError('');
    setActiveTab('visualizador');
  };

  const handleViewerQuoteNavigation = (quote: QuoteRow | null) => {
    if (!quote) return;
    const nextUrl = buildQuotePreviewLink(quote.id);
    setActiveQuoteId(quote.id);
    setViewerInput(buildQuoteLink(quote.id));
    setViewerUrl(nextUrl);
    setViewerError('');
  };

  const handleShowQuotes = (filter: QuoteFilter) => {
    setQuoteFilter(filter);
    setActiveTab('presupuestos');
  };

  const handleStatusChange = async (quoteId: string, nextStatus: string) => {
    try {
      if (!session?.access_token) {
        throw new Error('No autenticado.');
      }

      const response = await fetch(`/api/tecnico/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; quote?: QuoteRow } | null;
      if (!response.ok) {
        throw new Error(payload?.error || 'No pudimos actualizar el estado.');
      }
      if (!payload?.quote?.id) {
        throw new Error('No se pudo actualizar el estado. Revisa permisos o políticas de seguridad.');
      }
      setQuotes((prev) =>
        prev.map((quote) => (quote.id === quoteId ? normalizeQuoteRow({ ...quote, ...payload.quote }) : quote))
      );
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      alert(error?.message || 'No pudimos actualizar el estado.');
    }
  };

  const notifyAccountWelcomeWhatsapp = async (
    accessToken?: string | null,
    audience: 'tecnico' | 'empresa' = selectedAccessProfile === 'empresa' ? 'empresa' : 'tecnico',
    source = 'technical_profile_save'
  ) => {
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
        body: JSON.stringify({ audience, source }),
      });
      if (!response.ok) return false;
      const payload = (await response.json().catch(() => null)) as { sent?: boolean } | null;
      return payload?.sent === true;
    } catch (error) {
      console.warn('No se pudo enviar el WhatsApp de bienvenida.', error);
      return false;
    } finally {
      welcomeWhatsAppNoticeInFlightRef.current = false;
    }
  };

  const notifyTechnicianRegistrationWhatsapp = async () => {
    if (!session?.access_token || !session?.user?.id) return;
    if (registrationWhatsAppNoticeInFlightRef.current) return;
    registrationWhatsAppNoticeInFlightRef.current = true;

    try {
      const response = await fetch('/api/tecnico/registration-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ source: 'profile_save' }),
      });

      if (!response.ok) return;

      const payload = (await response.json().catch(() => null)) as { sent?: boolean } | null;
      if (payload?.sent) {
        setProfileMessage((current) =>
          current ? `${current} Tambien te enviamos un WhatsApp.` : 'Te enviamos un WhatsApp con el estado del alta.'
        );
        await fetchNotifications(session.user.id);
      }
    } catch (error) {
      console.warn('No se pudo enviar el aviso de WhatsApp del registro tecnico.', error);
    } finally {
      registrationWhatsAppNoticeInFlightRef.current = false;
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
    lastAttemptedProfileSignatureRef.current = autoSaveSignature;

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
      
      // Use only the exact point confirmed in the picker/map.
      let serviceLat: number | null = null;
      let serviceLng: number | null = null;
      let serviceLocationName: string | null = null;
      let serviceLocationPrecision: string = 'exact';
      const typedAddress = String(profileForm.address || '').trim();
      
      if (technicianLocationResult?.isValid && technicianLocationResult.precision === 'exact') {
        serviceLat = technicianLocationResult.lat;
        serviceLng = technicianLocationResult.lng;
        serviceLocationName = technicianLocationResult.displayName;
        serviceLocationPrecision = technicianLocationResult.precision;
      } else {
        throw new Error('Elige y confirma en el mapa el punto exacto donde quieres aparecer.');
      }
      
      if (effectiveProfilePublished && !serviceLat && !serviceLng) {
        throw new Error('Completa tu ubicación en el mapa para publicar en la vidriera.');
      }

      const normalizedServiceLocationName = String(serviceLocationName || '').trim();
      const effectiveAddress =
        normalizedServiceLocationName && normalizedServiceLocationName !== GENERIC_MAP_LOCATION_LABEL
          ? normalizedServiceLocationName
          : typedAddress;

      const basePayload = {
        id: session.user.id,
        full_name: profileForm.fullName,
        business_name: profileForm.businessName,
        email: profileForm.email || session.user.email,
        phone: profileForm.phone,
        country: profileForm.country,
        company_address: effectiveAddress,
        address: effectiveAddress,
        city: profileForm.city,
        service_city: profileForm.city || null,
        service_province: profileForm.province || null,
        coverage_area: coverageAreaLabel,
        working_hours: serializedWorkingHours,
        references_summary: profileForm.bio.trim() || null,
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
        banner_url: profileForm.bannerUrl,
        company_logo_url: profileForm.companyLogoUrl,
        avatar_url: profileForm.avatarUrl,
        logo_shape: profileForm.logoShape,
      };
      const payloadWithGeo = {
        ...basePayload,
        service_lat: serviceLat,
        service_lng: serviceLng,
        service_location_name: serviceLocationName,
        service_location_precision: serviceLocationPrecision,
        service_radius_km: COVERAGE_RADIUS_KM,
      };

      const extractMissingProfileColumn = (error: { code?: string; message?: string } | null | undefined) => {
        const message = String(error?.message || '');
        const code = String(error?.code || '');
        if (!message) return '';
        if (code !== 'PGRST204' && !message.toLowerCase().includes("column of 'profiles'")) return '';
        const match = message.match(/Could not find the '([^']+)' column of 'profiles'/i);
        return match?.[1] || '';
      };

      const upsertProfileWithSchemaFallback = async (initialPayload: Record<string, any>) => {
        const attemptPayload: Record<string, any> = { ...initialPayload };
        const maxAttempts = Math.max(1, Object.keys(attemptPayload).length + 1);

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const result = await supabase.from('profiles').upsert(attemptPayload, { onConflict: 'id' }).select().maybeSingle();
          if (!result.error) return result;

          const missingColumn = extractMissingProfileColumn(result.error);
          if (!missingColumn || !Object.prototype.hasOwnProperty.call(attemptPayload, missingColumn)) {
            return result;
          }

          delete attemptPayload[missingColumn];
        }

        return supabase.from('profiles').upsert({ id: session.user.id }, { onConflict: 'id' }).select().maybeSingle();
      };

      let { data, error } = await upsertProfileWithSchemaFallback(payloadWithGeo as Record<string, any>);
      if (error) throw error;

      if (data) {
        setProfile(data);
      }
      const nextAccessGranted = data?.access_granted ?? profile?.access_granted;
      lastPersistedProfileSignatureRef.current = autoSaveSignature;
      lastAttemptedProfileSignatureRef.current = autoSaveSignature;
      setAutoSaveState('saved');
      if (autoSaveMessageTimerRef.current !== null) {
        window.clearTimeout(autoSaveMessageTimerRef.current);
        autoSaveMessageTimerRef.current = null;
      }

      if (!silent) {
        setProfileMessage(
          nextAccessGranted === true
            ? 'Perfil actualizado con tu punto en el mapa.'
            : 'Perfil enviado a revisión. Te avisaremos cuando esté habilitado.'
        );
      } else {
        setAutoSaveMessage('Guardado automatico.');
        autoSaveMessageTimerRef.current = window.setTimeout(() => {
          setAutoSaveMessage('');
          setAutoSaveState('idle');
        }, 1800);
      }

      if (refreshNearby && nextAccessGranted === true) {
        await fetchNearbyRequests();
      }
      if (!silent) {
        await notifyTechnicianRegistrationWhatsapp();
        await notifyAccountWelcomeWhatsapp(
          session.access_token,
          selectedAccessProfile === 'empresa' ? 'empresa' : 'tecnico',
          'technical_profile_save'
        );
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

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!session?.user?.id) {
      setProfileMessage('Inicia sesion para subir un banner.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Solo se permiten imagenes.');
      return;
    }
    setUploadingBanner(true);
    setProfileMessage('');
    try {
      const storagePath = `${session.user.id}/profile/banner-${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('urbanfix-assets').upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from('urbanfix-assets').getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;
      const { data, error } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl })
        .eq('id', session.user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      setProfileForm((prev) => ({ ...prev, bannerUrl: publicUrl }));
      setProfileMessage('Banner actualizado.');
    } catch (error: any) {
      console.error('Error subiendo banner:', error);
      setProfileMessage('No pudimos subir el banner.');
    } finally {
      setUploadingBanner(false);
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
    if (!confirm(`¿Eliminar el presupuesto de ${quote.client_name || 'este cliente'}? Esta acción no se puede deshacer.`)) {
      return;
    }
      try {
        if (!session?.access_token) {
          throw new Error('No autenticado.');
        }

        setDeletingQuoteId(quote.id);
        const response = await fetch(`/api/tecnico/quotes/${quote.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || 'No pudimos eliminar el presupuesto.');
        }

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

  const getQuoteFeedbackLink = async (quoteId?: string) => {
    const targetId = quoteId || activeQuoteId;
    if (!targetId) {
      throw new Error('Selecciona un presupuesto para generar el link de calificacion.');
    }
    if (!session?.access_token) {
      throw new Error('Inicia sesion para generar links de calificacion.');
    }

    const response = await fetch(`/api/tecnico/quotes/${targetId}/feedback-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.error || 'No pudimos generar el link de calificacion.'));
    }

    const url = String(payload?.url || '').trim();
    if (!url) {
      throw new Error('No pudimos generar el link de calificacion.');
    }

    return {
      url,
      alreadyReviewed: Boolean(payload?.alreadyReviewed),
    };
  };

  const copyQuoteFeedbackLink = async (quoteId?: string) => {
    const { url, alreadyReviewed } = await getQuoteFeedbackLink(quoteId);
    try {
      if (!navigator?.clipboard?.writeText) throw new Error('Clipboard no disponible');
      await navigator.clipboard.writeText(url);
      return { ok: true, url, alreadyReviewed };
    } catch (error) {
      return { ok: false, url, alreadyReviewed };
    }
  };

  const handleSave = async (nextStatus: 'draft' | 'sent') => {
    if (savingRef.current || isSaving) return null;
    savingRef.current = true;
    if (!session?.user?.id) {
      setFormError('Inicia sesion para guardar el presupuesto.');
      savingRef.current = false;
      return null;
    }
    const preparedItems = mergeQuoteMaterialItems(
      items.map((item) => mergeItemWithMasterItem(item, { fillNotesFromMaster: true }))
    );
    const cleanedItems = preparedItems.filter((item) => item.description.trim());
    const isDraft = nextStatus === 'draft';
    if (!isDraft) {
      if (!clientName.trim()) {
        setFormError('Ingresa el nombre del cliente.');
        setOpenQuoteStep('client');
        savingRef.current = false;
        return null;
      }
      if (!geoSelected) {
        setFormError('Confirma la ubicacion en el mapa.');
        setOpenQuoteStep('client');
        savingRef.current = false;
        return null;
      }
      if (cleanedItems.length === 0 || total <= 0) {
        setFormError('Agrega al menos un item con importe.');
        setOpenQuoteStep('items');
        savingRef.current = false;
        return null;
      }
    }
    const itemsSignature = buildItemsSignature(cleanedItems);
    const shouldSyncItems = !activeQuoteId || itemsSignature !== lastSavedItemsSignatureRef.current;

    setIsSaving(true);
    setFormError('');
    setInfoMessage('');
    try {
      const quotePayload = {
        client_name: clientName.trim() || null,
        client_address: clientAddress.trim() || geoSelected?.display_name || null,
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

        if (cleanedItems.length > 0) {
          const itemsPayload = cleanedItems.map((item) => ({
            quote_id: quoteId,
            description: item.description,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            metadata: {
              type: item.type,
              unit: item.unit || null,
              work_area: item.workArea?.trim() || null,
              item_images:
                item.itemImages && item.itemImages.length > 0
                  ? item.itemImages.map((image) => ({
                      id: image.id,
                      url: image.url,
                      name: image.name,
                      file_type: image.fileType || null,
                      storage_path: image.storagePath || null,
                      uploaded_at: image.uploadedAt || null,
                      source: image.source || 'item-upload',
                      source_attachment_id: image.sourceAttachmentId || null,
                    }))
                  : [],
              technical_notes: normalizeTechnicalNotes(item.technicalNotes) || null,
              master_item_id: item.masterItemId || null,
              master_item_category: item.masterItemCategory || null,
              master_item_source_ref: item.masterItemSourceRef || null,
              sync_group_id: item.syncGroupId || null,
              sync_role: item.syncRole || null,
              sync_driver_id: item.syncDriverId || null,
              sync_quantity_per_unit: item.syncQuantityPerUnit || null,
              sync_sources: normalizeQuoteItemSyncSources(item.syncSources || []).map((source) => ({
                sync_group_id: source.syncGroupId || null,
                sync_driver_id: source.syncDriverId,
                sync_quantity_per_unit: source.syncQuantityPerUnit,
              })),
            },
          }));
          const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload);
          if (itemsError) throw itemsError;
        }
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
      setItems(preparedItems);
      setInfoMessage(postSaveMessage);
      lastSavedItemsSignatureRef.current = itemsSignature;
      lastSavedItemsCountRef.current = cleanedItems.length;
      return quoteId || null;
    } catch (error: any) {
      setFormError(error?.message || 'No pudimos guardar el presupuesto.');
      return null;
    } finally {
      setIsSaving(false);
      savingRef.current = false;
    }
  };

  const handleReviewQuote = async () => {
    setFormError('');
    setInfoMessage('');
    const quoteId = await handleSave('draft');
    if (!quoteId) return;
    const url = buildQuoteLink(quoteId);
    const windowRef = window.open(url, 'quoteWindow', 'popup=yes,width=1200,height=800,noopener,noreferrer');
    if (windowRef) {
      windowRef.focus();
    }
    setInfoMessage(`Link del cliente: ${url}`);
  };

  const handleCopyLink = async (quoteId?: string) => {
    const result = await copyQuoteLink(quoteId);
    if (!result.url) return;
    setInfoMessage(result.ok ? 'Link copiado al portapapeles.' : `Link: ${result.url}`);
  };

  const handleCopyFeedbackLink = async (quoteId?: string) => {
    try {
      const result = await copyQuoteFeedbackLink(quoteId);
      if (!result.url) return;
      setInfoMessage(
        result.ok
          ? result.alreadyReviewed
            ? 'Link de calificacion copiado. Ese cliente ya puede editar su resena con el mismo link.'
            : 'Link de calificacion copiado al portapapeles.'
          : `Link de calificacion: ${result.url}`
      );
    } catch (error: any) {
      setInfoMessage(error?.message || 'No pudimos generar el link de calificacion.');
    }
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
    clearAuthAccessProfileIntent();
    await supabase.auth.signOut();
    void syncAuthAccessTokenCookie(null);
    setSession(null);
    setLoadingProfile(false);
    setProfile(null);
    setProfileLoadError('');
    setProfileHydrated(false);
    setSelectedAccessProfile(null);
    setQuickRegisterMode(false);
    setAutoGoogleStarted(false);
    setAuthMode('login');
    setAuthError('');
    setAuthNotice('');
    setGoogleAuthLoading(false);
    setShowAuthPassword(false);
    setEmail('');
    setPassword('');
    setFullName('');
    setBusinessName('');
    setAuthWhatsapp('');
    resetForm();
  };

  const handleGoogleLogin = async () => {
    if (googleAuthLoading) return;
    setAuthError('');
    setAuthNotice('');
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      return;
    }
    setGoogleAuthLoading(true);
    if (selectedAccessProfile) {
      setAuthAccessProfileIntent(selectedAccessProfile);
    } else {
      clearAuthAccessProfileIntent();
    }
    const redirectTo = `${window.location.origin}/tecnicos`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setAuthError(getFriendlyAuthErrorMessage(error, 'google'));
      setGoogleAuthLoading(false);
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
    if (!hasSupabaseConfig) {
      setAuthError(supabaseConfigError);
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Ingresa tu correo para recuperar la contraseña.');
      return;
    }
    setSendingRecovery(true);
    try {
      const redirectTo = `${window.location.origin}/tecnicos`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) throw error;
      setAuthNotice('Te enviamos un correo para recuperar tu contraseña.');
    } catch (error: any) {
      setAuthError(getFriendlyAuthErrorMessage(error, 'recovery'));
    } finally {
      setSendingRecovery(false);
    }
  };

  const handleUpdatePassword = async () => {
    setRecoveryError('');
    setRecoveryMessage('');
    if (!session?.user) {
      setRecoveryError('La sesión de recuperación no está activa. Abre el enlace del correo nuevamente.');
      return;
    }
    const nextPassword = recoveryPassword.trim();
    const confirmPassword = recoveryConfirm.trim();
    if (!nextPassword) {
      setRecoveryError('Ingresa una nueva contraseña.');
      return;
    }
    const recoveryPasswordPolicyError = getPasswordPolicyError(nextPassword);
    if (recoveryPasswordPolicyError) {
      setRecoveryError(recoveryPasswordPolicyError);
      return;
    }
    if (nextPassword !== confirmPassword) {
      setRecoveryError('Las contraseñas no coinciden.');
      return;
    }
    setUpdatingRecovery(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw error;
      setRecoveryMessage('Listo. Tu contraseña fue actualizada.');
      setRecoveryPassword('');
      setRecoveryConfirm('');
    } catch (error: any) {
      setRecoveryError(error?.message || 'No pudimos actualizar la contraseña.');
    } finally {
      setUpdatingRecovery(false);
    }
  };

  const technicalRegisterMissing = useMemo(() => {
    if (authMode !== 'register') return [];
    const missing: string[] = [];
    if (!fullName.trim()) missing.push('nombre completo');
    if (!businessName.trim()) {
      missing.push(selectedAccessProfile === 'empresa' ? 'nombre de la empresa' : 'nombre del negocio');
    }
    if (!isWhatsappLike(authWhatsapp.trim())) missing.push('WhatsApp valido');
    return missing;
  }, [authMode, authWhatsapp, businessName, fullName, selectedAccessProfile]);

  const technicalRegisterBlocked = technicalRegisterMissing.length > 0;

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
      const normalizedAuthWhatsapp = authWhatsapp.trim();
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
      if (technicalRegisterBlocked) {
        throw new Error(`Completa estos datos para crear la cuenta: ${technicalRegisterMissing.join(', ')}.`);
      }
      if (selectedAccessProfile) {
        setAuthAccessProfileIntent(selectedAccessProfile);
      } else {
        clearAuthAccessProfileIntent();
      }
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
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
        const normalizedFullName = fullName.trim();
        const normalizedBusinessName = businessName.trim();
        const accessProfile = selectedAccessProfile === 'empresa' ? 'empresa' : 'tecnico';
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: safeEmail,
          password,
          options: {
            data: {
              full_name: normalizedFullName,
              business_name: normalizedBusinessName,
              phone: normalizedAuthWhatsapp,
              user_type: accessProfile,
              profile: accessProfile,
            },
          },
        });
        if (error) throw error;
        const welcomeSent = signUpData?.session?.access_token
          ? await notifyAccountWelcomeWhatsapp(signUpData.session.access_token, accessProfile, 'technical_register')
          : false;
        setAuthNotice(
          signUpData?.session
            ? welcomeSent
              ? 'Cuenta creada. Ya puedes completar tu perfil. Te enviamos un WhatsApp de bienvenida.'
              : 'Cuenta creada. Ya puedes completar tu perfil, cargar rubros y publicar tu vidriera.'
            : 'Cuenta creada. Revisa tu correo para confirmar y luego entra: el perfil base se preparará al iniciar sesión.'
        );
        setPassword('');
      }
    } catch (error: any) {
      setAuthError(getFriendlyAuthErrorMessage(error, authMode));
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user || activeTab !== 'soporte') return;
    if (isBetaAdmin) {
      fetchSupportUsers();
    }
    fetchSupportMessages();
  }, [activeTab, session?.user?.id, isBetaAdmin, activeSupportUserId]);

  useEffect(() => {
    if (activeTab !== 'soporte') return;
    supportMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeTab, supportMessages.length, supportLoading]);

  const profileRequiredMissing = useMemo(() => {
    const missing: string[] = [];
    const full = String(profile?.full_name || '').trim();
    const business = String(profile?.business_name || '').trim();
    const phone = String(profile?.phone || '').trim();
    const specialties = parseSpecialties(profile?.specialties || '');
    const hasWhatsapp = isWhatsappLike(phone);
    const hasExactMapPoint = Boolean(technicianLocationResult?.isValid && technicianLocationResult?.precision === 'exact');
    if (!full) missing.push('Nombre y apellido');
    if (!business) missing.push('Nombre del negocio');
    if (!hasWhatsapp) missing.push('WhatsApp');
    if (specialties.length === 0) missing.push('Rubro');
    if (!hasExactMapPoint) missing.push('Ubicacion en el mapa');
    return missing;
  }, [profile?.business_name, profile?.full_name, profile?.phone, profile?.specialties, technicianLocationResult?.isValid, technicianLocationResult?.precision]);

  const hasResolvedBaseAddress = useMemo(() => {
    const locationLabel = String(technicianLocationResult?.displayName || '').trim();
    return Boolean(
      locationLabel &&
        locationLabel !== GENERIC_MAP_LOCATION_LABEL &&
        technicianLocationResult?.isValid &&
        technicianLocationResult?.precision === 'exact'
    );
  }, [technicianLocationResult?.displayName, technicianLocationResult?.isValid, technicianLocationResult?.precision]);

  const selectedSpecialties = useMemo(() => parseSpecialties(profileForm.specialties), [profileForm.specialties]);

  const formRequiredMissing = useMemo(() => {
    const missing: string[] = [];
    const hasContact = isWhatsappLike(profileForm.phone.trim());
    if (!profileForm.fullName.trim()) missing.push('Nombre y apellido');
    if (!profileForm.businessName.trim()) missing.push('Nombre del negocio');
    if (!hasContact) missing.push('WhatsApp');
    if (selectedSpecialties.length === 0) missing.push('Rubro');
    if (!hasResolvedBaseAddress) missing.push('Ubicacion en el mapa');
    return missing;
  }, [hasResolvedBaseAddress, profileForm.businessName, profileForm.fullName, profileForm.phone, selectedSpecialties.length]);

  const formHasContactChannel = isWhatsappLike(profileForm.phone.trim());
  const canSaveRequiredProfile =
    Boolean(profileForm.fullName.trim()) &&
    Boolean(profileForm.businessName.trim()) &&
    formHasContactChannel &&
    selectedSpecialties.length > 0 &&
    hasResolvedBaseAddress;
  const hasWorkZoneForShowcase = hasResolvedBaseAddress;
  const requiredProfileSteps = useMemo(
    () => [
      {
        key: 'identity',
        label: 'Identidad',
        detail: 'Nombre y negocio',
        done: Boolean(profileForm.fullName.trim()) && Boolean(profileForm.businessName.trim()),
        icon: User,
      },
      {
        key: 'contact',
        label: 'Contacto',
        detail: 'WhatsApp',
        done: formHasContactChannel,
        icon: MessageCircle,
      },
      {
        key: 'specialty',
        label: 'Rubro',
        detail: 'Oficio principal',
        done: selectedSpecialties.length > 0,
        icon: Wrench,
      },
      {
        key: 'location',
        label: 'Ubicacion',
        detail: 'Punto exacto',
        done: hasResolvedBaseAddress,
        icon: MapPinned,
      },
    ],
    [formHasContactChannel, hasResolvedBaseAddress, profileForm.businessName, profileForm.fullName, selectedSpecialties.length]
  );
  const requiredProfileDoneCount = useMemo(
    () => requiredProfileSteps.filter((step) => step.done).length,
    [requiredProfileSteps]
  );
  const requiredProfileProgress = useMemo(() => {
    if (!requiredProfileSteps.length) return 0;
    return Math.round((requiredProfileDoneCount / requiredProfileSteps.length) * 100);
  }, [requiredProfileDoneCount, requiredProfileSteps.length]);

  const selectedSpecialtiesSet = useMemo(
    () => new Set(selectedSpecialties.map((item) => normalizeTextForParsing(item))),
    [selectedSpecialties]
  );
  const profileChecklistItems = useMemo(
    () => [
      { key: 'fullName', label: 'Nombre y apellido', done: Boolean(profileForm.fullName.trim()) },
      { key: 'businessName', label: 'Nombre del negocio', done: Boolean(profileForm.businessName.trim()) },
      { key: 'contact', label: 'WhatsApp', done: formHasContactChannel },
      { key: 'zone', label: 'Ubicacion exacta', done: hasResolvedBaseAddress },
      { key: 'specialties', label: 'Rubros cargados', done: selectedSpecialties.length > 0 },
      { key: 'branding', label: 'Foto o logo', done: Boolean(profileForm.avatarUrl.trim() || profileForm.companyLogoUrl.trim()) },
      { key: 'social', label: 'Red social', done: Boolean(toSafeUrl(profileForm.facebookUrl) || toSafeUrl(profileForm.instagramUrl)) },
      { key: 'published', label: 'Publicado en vidriera', done: Boolean(profileForm.profilePublished) },
    ],
    [
      profileForm.avatarUrl,
      profileForm.businessName,
      profileForm.companyLogoUrl,
      profileForm.facebookUrl,
      profileForm.fullName,
      profileForm.instagramUrl,
      profileForm.phone,
      profileForm.profilePublished,
      formHasContactChannel,
      hasResolvedBaseAddress,
      selectedSpecialties.length,
    ]
  );
  const profileChecklistPending = useMemo(
    () => profileChecklistItems.filter((item) => !item.done),
    [profileChecklistItems]
  );
  const profileCompletionPercent = useMemo(() => {
    if (!profileChecklistItems.length) return 0;
    const completed = profileChecklistItems.filter((item) => item.done).length;
    return Math.round((completed / profileChecklistItems.length) * 100);
  }, [profileChecklistItems]);
  const lobbySetupSteps = useMemo(
    () => [
      {
        key: 'profile',
        title: 'Completa tu perfil base',
        description: 'Nombre, negocio, WhatsApp, zona exacta y rubros para operar sin friccion.',
        done: canSaveRequiredProfile && selectedSpecialties.length > 0,
      },
      {
        key: 'quotes',
        title: 'Carga tu primer presupuesto',
        description: 'Empieza a cotizar para construir facturación, seguimiento y cobros.',
        done: quotes.length > 0,
      },
      {
        key: 'showcase',
        title: 'Activa tu vidriera publica',
        description: 'Publica tu perfil para aparecer en la vidriera y el mapa de tecnicos.',
        done: Boolean(profileForm.profilePublished),
      },
    ],
    [canSaveRequiredProfile, profileForm.profilePublished, quotes.length, selectedSpecialties.length]
  );
  const lobbySetupCompleted = useMemo(() => lobbySetupSteps.filter((item) => item.done).length, [lobbySetupSteps]);
  const lobbySetupPercent = useMemo(() => {
    if (!lobbySetupSteps.length) return 0;
    return Math.round((lobbySetupCompleted / lobbySetupSteps.length) * 100);
  }, [lobbySetupCompleted, lobbySetupSteps]);
  const shouldShowLobbyOnboarding = lobbySetupPercent < 100;
  const lobbyPrimarySetupStep = useMemo(
    () => lobbySetupSteps.find((item) => !item.done) || lobbySetupSteps[0] || null,
    [lobbySetupSteps]
  );
  const technicianHomeName = useMemo(() => {
    const rawName =
      profileForm.businessName ||
      profile?.business_name ||
      profileForm.fullName ||
      profile?.full_name ||
      session?.user?.email ||
      'Panel técnico';
    return rawName.trim();
  }, [profile?.business_name, profile?.full_name, profileForm.businessName, profileForm.fullName, session?.user?.email]);
  const technicianTodayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    []
  );
  const technicianMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    []
  );
  const technicianHomeMapPoint = useMemo(() => {
    const profileLat = toFiniteCoordinate(profile?.service_lat);
    const profileLon = toFiniteCoordinate(profile?.service_lng);
    if (profileLat !== null && profileLon !== null) {
      return {
        lat: profileLat,
        lon: profileLon,
        label: profile?.coverage_area || profileForm.coverageArea || profileForm.city || 'Ubicación de trabajo',
      };
    }

    const formLocation = profileForm.locationPickerResult as LocationPickerResult | null;
    const formLat = toFiniteCoordinate(formLocation?.lat);
    const formLon = toFiniteCoordinate(formLocation?.lng);
    if (formLat !== null && formLon !== null) {
      return {
        lat: formLat,
        lon: formLon,
        label: formLocation?.displayName || profileForm.coverageArea || profileForm.city || 'Ubicación de trabajo',
      };
    }

    if (isDesignPreview) {
      return {
        lat: -34.603722,
        lon: -58.381592,
        label: profileForm.coverageArea || profileForm.city || 'Buenos Aires',
      };
    }

    return null;
  }, [
    isDesignPreview,
    profile?.coverage_area,
    profile?.service_lat,
    profile?.service_lng,
    profileForm.city,
    profileForm.coverageArea,
    profileForm.locationPickerResult,
  ]);
  const technicianHomeMapUrl = useMemo(
    () => (technicianHomeMapPoint ? buildOsmEmbedUrl(technicianHomeMapPoint.lat, technicianHomeMapPoint.lon) : ''),
    [technicianHomeMapPoint]
  );
  const technicianStatusWindow = useMemo(() => {
    const now = new Date();
    const monthQuotes = quotes.filter((quote) => {
      const createdAt = new Date(quote.created_at);
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });
    const monthPaidAmount = monthQuotes.reduce((acc, quote) => {
      const status = normalizeStatusValue(quote.status);
      return quoteHasStatusGroup(status, 'paid') ? acc + toAmountValue(quote.total_amount) : acc;
    }, 0);
    const nextAction =
      quoteStats.pending > 0
        ? 'Responder pendientes'
        : quoteStats.approved > 0
          ? 'Coordinar aprobados'
          : profileCompletionPercent < 100
            ? 'Completar perfil'
            : 'Crear presupuesto';
    const actionTab = (
      quoteStats.pending > 0 || quoteStats.approved > 0
        ? 'presupuestos'
        : profileCompletionPercent < 100
          ? 'perfil'
          : 'nuevo'
    ) as 'presupuestos' | 'perfil' | 'nuevo';
    const actionLabel =
      quoteStats.pending > 0
        ? 'Ver pendientes'
        : quoteStats.approved > 0
          ? 'Ver aprobados'
          : profileCompletionPercent < 100
            ? 'Completar perfil'
            : 'Crear presupuesto';
    const actionHint =
      quoteStats.pending > 0
        ? `${quoteStats.pending} ${quoteStats.pending === 1 ? 'cliente espera' : 'clientes esperan'} una respuesta`
        : quoteStats.approved > 0
          ? `${quoteStats.approved} ${quoteStats.approved === 1 ? 'trabajo aprobado' : 'trabajos aprobados'} para ejecutar`
          : profileCompletionPercent < 100
            ? `Tu perfil está al ${profileCompletionPercent}%`
            : 'No tenés bloqueos operativos';

    return {
      actionLabel,
      actionTab,
      actionHint,
      monthPaidAmount,
      nextAction,
      pendingLabel: quoteStats.pending === 1 ? 'pendiente' : 'pendientes',
    };
  }, [profileCompletionPercent, quoteStats.approved, quoteStats.pending, quotes]);

  const handleSpecialtyToggle = (specialty: string) => {
    setProfileForm((prev) => ({
      ...prev,
      specialties: toggleSpecialty(prev.specialties, specialty),
    }));
  };

  const handleSpecialtySelect = (specialty: string) => {
    const selected = specialty.trim();
    if (!selected) return;
    setProfileForm((prev) => ({
      ...prev,
      specialties: upsertSpecialty(prev.specialties, selected),
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
      if (!hasWorkZoneForShowcase) {
        setProfileMessage('Para aparecer en vidriera debes cargar direccion o ciudad/zona de trabajo.');
        return;
      }
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Vas a aparecer en la vidriera publica de tecnicos. ¿Confirmas publicacion?');
        if (!confirmed) {
          setProfileMessage('Publicacion cancelada.');
          return;
        }
      }
      setProfileForm((prev) => ({ ...prev, profilePublished: true }));
      const published = await persistProfile({ silent: false, refreshNearby: false, publishProfile: true });
      if (!published) {
        setProfileForm((prev) => ({ ...prev, profilePublished: false }));
        return;
      }
      setProfileMessage('Perfil publicado en vidriera.');
      return;
    }
    await handleCopyPublicProfileLink();
  };

  const handleSharePublicProfileWhatsApp = () => {
    if (!publicProfileUrl) {
      setProfileMessage('No pudimos generar el link publico.');
      return;
    }
    if (typeof window === 'undefined') return;
    const text = encodeURIComponent(
      `Mira mi perfil profesional en UrbanFix: ${publicProfileUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleSharePublicProfileFacebook = () => {
    if (!publicProfileUrl) {
      setProfileMessage('No pudimos generar el link publico.');
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
    const displayName =
      String(
        profileForm.businessName || profileForm.fullName || profile?.business_name || profile?.full_name || 'Tecnico UrbanFix'
      ).trim() || 'Tecnico UrbanFix';
    return `${window.location.origin}${buildTechnicianPath(session.user.id, displayName)}`;
  }, [profile?.business_name, profile?.full_name, profileForm.businessName, profileForm.fullName, session?.user?.id]);
  const publicShowcaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/vidriera`;
  }, []);

  useEffect(() => {
    const profileId = session?.user?.id || profile?.id || '';
    if (!profileId) {
      setPublicProfileReviewStats({ rating: null, reviewsCount: 0, commentsCount: 0 });
      return;
    }
    if (activeTab !== 'perfil' || profilePanelTab !== 'preview') return;

    let cancelled = false;
    const loadPublicReviewStats = async () => {
      try {
        const response = await fetch(`/api/tecnicos/${profileId}/comments`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
        const ratingValue = Number(payload?.rating);
        setPublicProfileReviewStats({
          rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : null,
          reviewsCount: Math.max(0, Number(payload?.reviewsCount || 0)),
          commentsCount: reviews.filter((review: { comment?: unknown }) => String(review?.comment || '').trim()).length,
        });
      } catch {
        // Keep saved counters visible if the comments endpoint is temporarily unavailable.
      }
    };

    loadPublicReviewStats();
    return () => {
      cancelled = true;
    };
  }, [activeTab, profile?.id, profilePanelTab, session?.user?.id]);

  const publicProfilePreview = useMemo(() => {
    const profileId = session?.user?.id || profile?.id || '';
    const displayName =
      String(profileForm.businessName || profileForm.fullName || profile?.business_name || profile?.full_name || 'Técnico UrbanFix').trim() ||
      'Técnico UrbanFix';
    const fullName = String(profileForm.fullName || profile?.full_name || '').trim();
    const displayInitial = displayName.slice(0, 1).toUpperCase() || 'U';
    const specialties = parseSpecialties(profileForm.specialties).slice(0, 12);
    const badges = parseProfileBadges(profile?.achievement_badges).slice(0, 8);
    const likesCount = Math.max(0, Number(profile?.public_likes_count || 0));
    const savedRating = Number(profile?.public_rating || 0);
    const liveRating = Number(publicProfileReviewStats.rating || 0);
    const rating = liveRating > 0 ? liveRating : savedRating;
    const reviewsCount = Math.max(0, Number(publicProfileReviewStats.reviewsCount || profile?.public_reviews_count || 0));
    const commentsCount = Math.max(0, Number(publicProfileReviewStats.commentsCount || 0));
    const completedJobsRaw = Number(profile?.completed_jobs_total);
    const hasRating = Number.isFinite(rating) && rating > 0;
    const hasCompletedJobs = Number.isFinite(completedJobsRaw) && completedJobsRaw > 0;
    const acceptedQuoteCount = quotes.filter((quote) => quoteIsBillable(quote.status)).length;
    const completedJobsCount = Math.max(hasCompletedJobs ? Math.floor(completedJobsRaw) : 0, acceptedQuoteCount);
    const quoteCount = Math.max(0, Number(quoteStats.total || 0));
    const presentationText =
      String(profileForm.bio || profile?.references_summary || '').trim();
    const heroSummary =
      presentationText.length > 150 ? `${presentationText.slice(0, 147).trimEnd()}...` : presentationText;
    const avatarImageUrl = String(profileForm.avatarUrl || profileForm.companyLogoUrl || '').trim();
    const companyBannerUrl = String(profileForm.bannerUrl || profileForm.companyLogoUrl || profileForm.avatarUrl || '').trim();
    const whatsappLink = buildProfileWhatsappLink(profileForm.phone);
    const socialLinks = [
      { label: 'Facebook', href: toSafeUrl(profileForm.facebookUrl), icon: 'facebook' },
      { label: 'Instagram', href: toSafeUrl(profileForm.instagramUrl), icon: 'instagram' },
    ].filter((entry) => Boolean(entry.href));
    const coverageHeroLabel = profileForm.city || coverageAreaLabel || '';
    const availabilityLabel = 'A coordinar';
    const availabilityToneClass = 'border-white/15 bg-white/[0.06] text-white/72';
    const metricCards = [
      {
        label: 'Reputaci\u00f3n',
        value: hasRating ? rating.toFixed(1) : '0.0',
        suffix: '/5',
      },
      {
        label: 'Rese\u00f1as',
        value: reviewsCount.toString(),
      },
      {
        label: 'Comentarios',
        value: commentsCount.toString(),
      },
      {
        label: 'Trabajos',
        value: completedJobsCount.toString(),
      },
      {
        label: 'Presupuestos',
        value: quoteCount.toString(),
      },
      {
        label: 'Me gusta',
        value: likesCount.toString(),
      },
    ];
    return {
      avatarImageUrl,
      availabilityLabel,
      availabilityToneClass,
      badges,
      companyBannerUrl,
      coverageHeroLabel,
      displayInitial,
      displayName,
      facebookFeedEmbedUrl: buildFacebookTimelineEmbedUrl(profileForm.facebookUrl),
      fullName,
      heroSummary,
      instagramPostEmbedUrl: buildInstagramEmbedUrl(profileForm.instagramUrl),
      likesCount,
      metricCards,
      profileId,
      commentsCount,
      reviewsCount,
      shareUrl: publicProfileUrl,
      socialLinks,
      specialties,
      workingHoursLabel,
      whatsappLink,
    };
  }, [
    coverageAreaLabel,
    profile?.achievement_badges,
    profile?.business_name,
    profile?.completed_jobs_total,
    profile?.full_name,
    profile?.id,
    profile?.public_likes_count,
    profile?.public_rating,
    profile?.public_reviews_count,
    profile?.references_summary,
    publicProfileReviewStats.commentsCount,
    publicProfileReviewStats.rating,
    publicProfileReviewStats.reviewsCount,
    quotes,
    quoteStats.total,
    profileForm.avatarUrl,
    profileForm.bannerUrl,
    profileForm.bio,
    profileForm.businessName,
    profileForm.city,
    profileForm.companyLogoUrl,
    profileForm.facebookUrl,
    profileForm.fullName,
    profileForm.instagramUrl,
    profileForm.phone,
    profileForm.specialties,
    publicProfileUrl,
    session?.user?.id,
    workingHoursLabel,
  ]);
  const autoSaveSignature = useMemo(
    () =>
      JSON.stringify({
        fullName: profileForm.fullName.trim(),
        businessName: profileForm.businessName.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        country: profileForm.country.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        coverageArea: coverageAreaLabel,
        workingHours: buildWorkingHoursPayload(workingHoursConfig),
        bio: profileForm.bio.trim(),
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
        bannerUrl: profileForm.bannerUrl.trim(),
        logoShape: profileForm.logoShape,
        technicianLocation: technicianLocationResult ? {
          lat: technicianLocationResult.lat,
          lng: technicianLocationResult.lng,
          displayName: technicianLocationResult.displayName,
          precision: technicianLocationResult.precision,
        } : null,
      }),
    [
      bankAccountType,
      certificationFiles,
      coverageAreaLabel,
      profileForm.address,
      profileForm.avatarUrl,
      profileForm.bankAlias,
      profileForm.bio,
      profileForm.businessName,
      profileForm.certifications,
      profileForm.city,
      profileForm.country,
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
      technicianLocationResult,
      workingHoursConfig,
    ]
  );

  useEffect(() => {
    if (!session?.user?.id || !profileHydrated || autoSaveBootstrapped || profileRequiredMissing.length > 0) return;
    lastPersistedProfileSignatureRef.current = autoSaveSignature;
    setAutoSaveBootstrapped(true);
    setAutoSaveState('idle');
    setAutoSaveMessage('');
  }, [autoSaveBootstrapped, autoSaveSignature, profileHydrated, profileRequiredMissing.length, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || !autoSaveBootstrapped) return;
    if (profileRequiredMissing.length > 0) {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setAutoSaveState('idle');
      setAutoSaveMessage('');
      return;
    }
    if (profilePersistInFlightRef.current) return;
    if (autoSaveSignature === lastPersistedProfileSignatureRef.current) return;
    if (autoSaveSignature === lastAttemptedProfileSignatureRef.current) return;

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      lastAttemptedProfileSignatureRef.current = autoSaveSignature;
      persistProfile({ silent: true, refreshNearby: false });
    }, 900);

    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    autoSaveBootstrapped,
    autoSaveSignature,
    profilePersistTick,
    profileRequiredMissing.length,
    session?.user?.id,
    technicianLocationResult,
  ]);

  const sessionMediaOverlays = session?.user ? (
    <>
      {postLoginVideoVisible && postLoginVideoAvailable && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black" aria-hidden="true">
          <video
            ref={postLoginVideoRef}
            src={POST_LOGIN_VIDEO_URL}
            poster={ACCESS_VIDEO_POSTER_URL}
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

  if (loadingSession && !isDesignPreview) {
    return (
      <>
        <AuthHashHandler />
        <PublicTopNav activeHref="/tecnicos" sticky />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-muted)] flex items-center justify-center`}
        >
          <UrbanFixBrandLoader label="Cargando UrbanFix" />
        </div>
      </>
    );
  }

  if (session?.user && (adminGateStatus === 'checking' || loadingProfile)) {
    return (
      <>
        <AuthHashHandler />
        <PublicTopNav activeHref="/tecnicos" sticky />
        {sessionMediaOverlays}
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-muted)] flex items-center justify-center`}
        >
          <UrbanFixBrandLoader label={adminGateStatus === 'checking' ? 'Validando acceso' : 'Cargando perfil'} />
        </div>
      </>
    );
  }

  if (session?.user && profileLoadError) {
    return (
      <>
        <AuthHashHandler />
        <PublicTopNav activeHref="/tecnicos" sticky />
        {sessionMediaOverlays}
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)] flex items-center justify-center`}
        >
          <div className={`${authSurfaceClass} max-w-lg border-rose-200`}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-rose-500">Perfil técnico</p>
            <h1 className="mt-2 text-2xl font-bold text-[color:var(--ui-ink)]">No pudimos abrir tu perfil</h1>
            <p className="mt-3 text-sm text-[color:var(--ui-muted)]">{profileLoadError}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl bg-[color:var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/72 px-4 py-3 text-sm font-semibold text-[color:var(--ui-ink)] transition hover:border-[color:var(--ui-accent-soft)]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (session?.user && isBetaAdmin) {
    return (
      <>
        <AuthHashHandler />
        <PublicTopNav activeHref="/tecnicos" sticky />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)] flex items-center justify-center`}
        >
          <div className={`${authSurfaceClass} max-w-lg text-center`}>
            <h1 className="text-2xl font-bold text-[color:var(--ui-ink)]">Acceso administrativo</h1>
            <p className="mt-3 text-sm text-[color:var(--ui-muted)]">
              Tu cuenta está configurada como admin. Te llevamos al panel de control.
            </p>
            <a
              href="/admin"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--ui-accent)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:opacity-95"
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
        <PublicTopNav activeHref="/tecnicos" sticky />
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
                    className={`${authLogoFrameClass} ${logoPresentation.frame} ${logoPresentation.padding} ${
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
                      <img src="/icon-48.png" alt="UrbanFix logo" className="h-10 w-10" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ui-muted)]">UrbanFix</p>
                    <p className="text-sm font-semibold text-[color:var(--ui-ink)]">Panel técnico</p>
                  </div>
                </div>
                <h1 className="text-5xl font-black text-[color:var(--ui-ink)] md:text-6xl">Restablecer contraseña</h1>
                <p className="text-base text-[color:var(--ui-muted)] md:text-lg">
                  Define una nueva contraseña para volver a acceder a tu cuenta.
                </p>
                <button
                  type="button"
                  onClick={exitRecoveryMode}
                  className={authSecondaryButtonClass}
                >
                  Volver al inicio
                </button>
              </div>

              <div className={authSurfaceClass}>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-[color:var(--ui-ink)]">Nueva contraseña</h2>
                  <p className="text-sm text-[color:var(--ui-muted)]">Ingresa tu nueva contraseña para finalizar.</p>
                </div>

                {!session?.user && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    La sesión de recuperación no está activa. Abre el enlace del correo nuevamente.
                  </div>
                )}

                {session?.user && (
                  <>
                    <div className="mt-6 space-y-3">
                      <input
                        value={recoveryPassword}
                        onChange={(event) => setRecoveryPassword(event.target.value)}
                        type="password"
                        placeholder="Nueva contraseña"
                        className={authInputClass.replace('mt-2 ', '')}
                      />
                      <input
                        value={recoveryConfirm}
                        onChange={(event) => setRecoveryConfirm(event.target.value)}
                        type="password"
                        placeholder="Repetir contraseña"
                        className={authInputClass.replace('mt-2 ', '')}
                      />
                    </div>

                    {recoveryError && <p className="mt-4 text-xs text-amber-600">{recoveryError}</p>}
                    {recoveryMessage && <p className="mt-4 text-xs text-emerald-600">{recoveryMessage}</p>}

                    {!recoveryMessage && (
                      <button
                        type="button"
                        onClick={handleUpdatePassword}
                        disabled={updatingRecovery}
                        className={`mt-5 ${authPrimaryButtonClass}`}
                      >
                          {updatingRecovery ? 'Actualizando...' : 'Guardar nueva contraseña'}
                      </button>
                    )}

                    {recoveryMessage && (
                      <button
                        type="button"
                        onClick={exitRecoveryMode}
                        className={`mt-5 ${authPrimaryButtonClass}`}
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

  if (session?.user && profileHydrated && profile && profileRequiredMissing.length > 0) {
    return (
      <>
        <AuthHashHandler />
        <PublicTopNav activeHref="/tecnicos" sticky />
        {sessionMediaOverlays}
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[color:var(--ui-bg)] text-[color:var(--ui-ink)]`}
        >
          <div className="relative overflow-hidden bg-[linear-gradient(180deg,#ebe8df_0%,#f7f4ee_50%,#e8edf0_100%)]">
            <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6 lg:py-12">
              <section className="w-full overflow-hidden rounded-[30px] border border-white/80 bg-white/[0.94] shadow-[0_26px_78px_-60px_rgba(15,23,42,0.48)] backdrop-blur">
                <div className="border-b border-slate-200/70 px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#ff8f1f]/25 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a4a00]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#ff8f1f]" />
                        Registro tecnico
                      </span>
                      <h1 className={`${spaceGrotesk.className} mt-3 text-3xl font-bold tracking-tight text-[#180f24] sm:text-4xl`}>
                        Datos clave
                      </h1>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        Identifica tu negocio, WhatsApp, rubro y punto exacto de trabajo.
                      </p>
                    </div>
                    <div className="w-full sm:max-w-[210px]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Progreso</p>
                        <p className="text-sm font-black text-[#180f24]">
                          {requiredProfileDoneCount}/{requiredProfileSteps.length}
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#ff8f1f,#ffd09a,#2a0338)] transition-[width] duration-500"
                          style={{ width: `${requiredProfileProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {requiredProfileSteps.map((step) => {
                      const StepIcon = step.icon;
                      return (
                        <div
                          key={step.key}
                          className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                            step.done
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              step.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <StepIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-semibold">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="px-5 py-5 sm:px-6">
                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                    <div className="relative h-28 overflow-hidden bg-slate-100 sm:h-32">
                      {profileForm.bannerUrl ? (
                        <img src={profileForm.bannerUrl} alt="Portada del perfil" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#f5efe6)]">
                          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Banner opcional
                          </span>
                        </div>
                      )}
                      {profileForm.bannerUrl && (
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.18))]" />
                      )}
                      <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-[#180f24] shadow-sm transition hover:border-[#ff8f1f]/40 hover:bg-white">
                        {uploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                        {uploadingBanner ? 'Subiendo...' : 'Banner'}
                        <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="px-4 pb-4 sm:px-5">
                      <div className="-mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex min-w-0 flex-1 items-end gap-3">
                          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[22px] border-[4px] border-white bg-slate-100 shadow-sm">
                            {profileForm.avatarUrl ? (
                              <img src={profileForm.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                            ) : profileForm.companyLogoUrl ? (
                              <img src={profileForm.companyLogoUrl} alt="Logo del negocio" className="h-full w-full object-contain p-2.5" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xl font-black text-slate-500">
                                {(profileForm.fullName || profileForm.businessName || 'U')[0]?.toUpperCase()}
                              </div>
                            )}
                            <label
                              title="Subir foto de perfil"
                              className="absolute bottom-1 right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338] shadow-sm transition hover:scale-105"
                            >
                              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            </label>
                          </div>

                          <div className="min-w-0 pb-1">
                            <p className={`${spaceGrotesk.className} truncate text-xl font-bold text-[#180f24]`}>
                              {profileForm.businessName || 'Tu negocio'}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {profileForm.fullName || 'Tu nombre'}{profileForm.email ? ` · ${profileForm.email}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-[#ff8f1f]/45">
                            {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <User className="h-3.5 w-3.5" />}
                            {uploadingAvatar ? 'Subiendo...' : 'Foto'}
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                          </label>
                          <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-500 transition hover:border-[#ff8f1f]/35 hover:text-slate-700">
                            {uploadingCompanyLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />}
                            {uploadingCompanyLogo ? 'Subiendo...' : 'Logo'}
                            <input type="file" accept="image/*" onChange={handleCompanyLogoUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#2a0338] text-white shadow-[0_16px_34px_-24px_rgba(42,3,56,0.85)]">
                        <User className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Datos publicos</p>
                        <p className="text-sm font-bold text-[#180f24]">Identidad y contacto</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--ui-muted)]">Nombre y apellido</label>
                      <input
                        value={profileForm.fullName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        className={authInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--ui-muted)]">Nombre del negocio</label>
                      <input
                        value={profileForm.businessName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, businessName: event.target.value }))
                        }
                        className={authInputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--ui-muted)]">Mail de contacto</label>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                        type="email"
                        placeholder="tu@email.com"
                        className={authInputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[color:var(--ui-muted)]">WhatsApp de contacto</label>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="+54 9 ..."
                        className={authInputClass}
                      />
                    </div>
                  </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200/70 pt-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ff8f1f] text-[#2a0338] shadow-[0_16px_34px_-24px_rgba(255,143,31,0.85)]">
                        <MapPinned className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Zona de trabajo</p>
                        <p className="text-sm font-bold text-[#180f24]">Localidad, calle y pin exacto</p>
                      </div>
                    </div>

                    <div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--ui-muted)]">Pais</label>
                        <select
                          value={profileForm.country}
                          onChange={(event) => handleCountryChange(event.target.value)}
                          className={authInputClass}
                        >
                          {COUNTRY_NAMES.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[color:var(--ui-muted)]">{provinceFieldLabel}</label>
                        <select
                          value={profileForm.province}
                          onChange={(event) => handleProvinceChange(event.target.value)}
                          className={authInputClass}
                        >
                          <option value="">Seleccionar {provinceFieldLabel.toLowerCase()}</option>
                          {provinceOptions.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[color:var(--ui-muted)]">Localidad / partido</label>
                    <LocalitySelect
                      country={profileForm.country}
                      province={profileForm.province}
                      value={profileForm.city}
                      onChange={handleCityChange}
                      selectClassName={authInputClass}
                      helperClassName="mt-2 text-[11px] text-[color:var(--ui-muted)]"
                    />
                  </div>

                  <div>
                    <TechnicianLocationPicker
                      value={technicianLocationResult}
                      query={profileForm.address}
                      onQueryChange={handleTechnicianAddressQueryChange}
                      onChange={handleTechnicianLocationChange}
                      coverageRadiusKm={technicianRadiusKm}
                      countryHint={profileForm.country}
                      cityHint={profileForm.city}
                      provinceHint={profileForm.province}
                      label="Ubicacion de trabajo"
                      description="Elige la localidad arriba. Luego escribe solo calle y altura, busca la direccion y ajusta el pin."
                      required={false}
                    />
                    </div>
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
                    className={authPrimaryButtonClass}
                  >
                    {profileSaving ? 'Guardando...' : 'Guardar datos clave'}
                  </button>

                  {profileMessage && <p className="text-xs text-[color:var(--ui-muted)]">{profileMessage}</p>}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={authSecondaryButtonBlockClass}
                  >
                    Cerrar sesión
                  </button>
                </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (!session?.user && !isDesignPreview) {
    return (
      <>
        <AuthHashHandler />
        <PublicTopNav activeHref="/tecnicos" sticky />
        <div
          style={activeThemeStyles}
          data-ui-theme={uiTheme}
          className={`ufx-theme-scope ${manrope.className} min-h-screen bg-[#16031f] text-white`}
        >
          <div className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#16031f_0%,#21002f_52%,#14031c_100%)]"
            />

            <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
              <section
                className={`w-full backdrop-blur ${
                  selectedAccessProfile
                    ? 'rounded-[32px] border border-white/[0.16] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.055)_48%,rgba(255,143,31,0.10))] p-4 text-white shadow-[0_44px_120px_-64px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16)] sm:p-5'
                    : 'rounded-[32px] border border-white/[0.16] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.055)_48%,rgba(255,143,31,0.10))] p-4 text-white shadow-[0_44px_120px_-64px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16)] sm:p-5'
                }`}
              >
                {!selectedAccessProfile ? (
                  <div className={`space-y-3 ${accessTransitionProfile ? 'ufx-auth-selector-exit' : 'ufx-auth-view-enter'}`}>
                    {AUTH_ROLE_SELECTOR_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isTransitionTarget = accessTransitionProfile === option.profile;
                      const isTransitionDimmed = Boolean(accessTransitionProfile) && !isTransitionTarget;
                      return (
                        <button
                          key={option.profile}
                          type="button"
                          disabled={Boolean(accessTransitionProfile)}
                          onClick={() => handleAccessProfileSelect(option.profile)}
                          className={`group relative w-full overflow-hidden rounded-[24px] border border-white/[0.12] bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.045))] px-4 py-4 text-left shadow-[0_22px_54px_-42px_rgba(0,0,0,0.95)] transition duration-300 hover:-translate-y-0.5 hover:border-[#ffb35e]/[0.52] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.17),rgba(255,255,255,0.07))] hover:shadow-[0_26px_62px_-42px_rgba(255,143,31,0.7)] disabled:cursor-default ${
                            isTransitionTarget
                              ? 'scale-[1.015] border-[#ffcf93]/60 bg-[linear-gradient(135deg,rgba(255,143,31,0.18),rgba(255,255,255,0.08))] shadow-[0_28px_72px_-42px_rgba(255,143,31,0.9)]'
                              : ''
                          } ${isTransitionDimmed ? 'scale-[0.985] opacity-40 blur-[1px]' : ''}`}
                        >
                          <div className="absolute inset-y-0 left-0 w-1 rounded-full bg-gradient-to-b from-[#ff8f1f] via-[#ffcf93] to-white/[0.18]" />
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.32] to-transparent"
                          />
                          <div className="relative flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.14] bg-[#fffdf9] shadow-[0_16px_30px_-24px_rgba(255,255,255,0.9)]">
                              <Icon className={`h-5 w-5 ${option.iconClassName}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-white">{option.title}</p>
                                <span className="rounded-full border border-white/[0.12] bg-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.58]">
                                  {option.badge}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className="group/info relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.045] text-white/[0.62] transition hover:border-[#ffcf93]/50 hover:bg-white/[0.10] hover:text-[#ffcf93]"
                                aria-label={`Info sobre ${option.title}`}
                                title={option.info}
                              >
                                <Info className="h-4 w-4" />
                                <span
                                  role="tooltip"
                                  className="pointer-events-none absolute right-full top-1/2 z-30 mr-2 hidden w-[min(72vw,240px)] -translate-y-1/2 rounded-2xl border border-[#ffcf93]/40 bg-[#fffdf9] px-3 py-2 text-[11px] font-medium leading-5 text-[#2a0338] opacity-0 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.7)] transition duration-200 group-hover/info:opacity-100 sm:block"
                                >
                                  {option.info}
                                </span>
                              </span>
                              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.06] text-[#ffcf93] transition group-hover:translate-x-0.5 group-hover:border-[#ffcf93]/50 group-hover:bg-[#ff8f1f]/[0.12]">
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ufx-auth-view-enter">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleBackToProfileSelector}
                        aria-label="Volver al selector de perfiles"
                        title="Volver al selector de perfiles"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.06] text-[#ffcf93] transition hover:border-[#ffcf93]/50 hover:bg-[#ff8f1f]/[0.12] hover:text-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.72]">
                        {selectedAccessProfile === 'empresa' ? (
                          <Building2 className="h-3.5 w-3.5 text-[#ffcf93]" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5 text-[#ffcf93]" />
                        )}
                        {selectedAccessMeta?.panelLabel || 'Acceso'}
                      </span>
                    </div>

                    {entryPrompt && (
                      <div className="mb-4 rounded-[22px] border border-[#ffcf93]/40 bg-[#ff8f1f]/[0.12] px-4 py-3 text-sm text-[#ffe2bd]">
                        <p className="mt-1 leading-6">{entryPrompt}</p>
                      </div>
                    )}

                    <div className="rounded-[28px] border border-[#eadfce]/70 bg-[#fffdf9] p-4 text-[#180f24] shadow-[0_28px_76px_-50px_rgba(0,0,0,0.92)] sm:p-5">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={googleAuthLoading || authLoading}
                          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[15px] font-semibold text-slate-700 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.46)] transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                        >
                          {googleAuthLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-[#2a0338] sm:h-4 sm:w-4" />
                          ) : (
                            <GoogleMark className="h-5 w-5" />
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
                                setQuickRegisterMode(false);
                                setAuthError('');
                                setAuthNotice('');
                                setShowAuthPassword(false);
                              }}
                              className={`relative z-10 min-h-10 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              authMode === 'login'
                                ? 'text-white'
                                : 'text-slate-500 hover:bg-white hover:text-slate-900'
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
                                : 'text-slate-500 hover:bg-white hover:text-slate-900'
                            }`}
                          >
                            Crear cuenta
                          </button>
                        </div>

                        {authMode === 'register' && (
                          <div className="mt-4 space-y-3">
                            <div className="relative">
                              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted)]" />
                              <input
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                placeholder="Nombre completo"
                                autoComplete="name"
                                className={authIconInputClass.replace('mt-2 ', '')}
                              />
                            </div>
                            <div className="relative">
                              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted)]" />
                              <input
                                value={businessName}
                                onChange={(event) => setBusinessName(event.target.value)}
                                placeholder={selectedAccessProfile === 'empresa' ? 'Nombre de la empresa' : 'Nombre del negocio'}
                                autoComplete="organization"
                                className={authIconInputClass.replace('mt-2 ', '')}
                              />
                            </div>
                            <div className="relative">
                              <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted)]" />
                              <input
                                value={authWhatsapp}
                                onChange={(event) => setAuthWhatsapp(event.target.value)}
                                placeholder="WhatsApp de contacto"
                                inputMode="tel"
                                autoComplete="tel"
                                className={authIconInputClass.replace('mt-2 ', '')}
                              />
                            </div>
                            <p className="text-[11px] leading-5 text-slate-500">
                              Para crear la cuenta necesitamos nombre, negocio y WhatsApp. Luego completas rubros, zona exacta y datos comerciales dentro del panel.
                            </p>
                            {technicalRegisterMissing.length > 0 && (
                              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                                Falta completar: {technicalRegisterMissing.join(', ')}.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-4 space-y-3">
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted)]" />
                            <input
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              type="email"
                              placeholder="Correo"
                              autoComplete="email"
                              className={authIconInputClass.replace('mt-2 ', '')}
                            />
                          </div>
                          <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted)]" />
                            <input
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              type={showAuthPassword ? 'text' : 'password'}
                              placeholder="Contrasena"
                              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                              className={authIconInputClass.replace('mt-2 ', '').replace('pr-4', 'pr-12')}
                            />
                            <button
                              type="button"
                              onClick={() => setShowAuthPassword((current) => !current)}
                              aria-label={showAuthPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
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
                              {sendingRecovery ? 'Enviando correo...' : 'Olvidaste tu contrasena?'}
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
                          disabled={authLoading || googleAuthLoading || technicalRegisterBlocked}
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
                  </div>
                )}
              </section>
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
      <PublicTopNav activeHref="/tecnicos" sticky />
      <div
        className={`relative overflow-hidden ${
          activeTab === 'operativo'
            ? 'bg-slate-950'
            : activeTab === 'perfil' && profilePanelTab === 'preview'
              ? 'bg-[#21002f]'
            : 'bg-[linear-gradient(180deg,#ebe8df_0%,#f7f6f1_38%,#e9edf0_100%)]'
        }`}
      >
        <div className="absolute left-0 top-0 bottom-0 hidden w-[74px] bg-[linear-gradient(180deg,#17031f_0%,#250331_48%,#13021a_100%)] lg:block" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(42,3,56,0.10)_0%,rgba(42,3,56,0.04)_12%,rgba(255,255,255,0)_34%)]" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(24,15,36,0.08),rgba(24,15,36,0))]" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(0deg,rgba(15,23,42,0.08),rgba(15,23,42,0))]" />

        <div
          className={
            isFullBleedContent
              ? 'relative mx-auto flex w-full max-w-none gap-0 px-0 pb-0 pt-0 lg:pl-[74px]'
              : 'relative mx-auto flex w-full max-w-none gap-6 px-4 pb-36 pt-8 md:px-6 lg:pb-12 lg:pl-[96px]'
          }
        >
          <div className={isFullBleedContent ? 'contents' : 'hidden w-[74px] shrink-0 lg:block'}>
            <aside
              aria-label="Navegación técnica"
              onMouseEnter={() => setIsDesktopNavExpanded(true)}
              onMouseLeave={() => setIsDesktopNavExpanded(false)}
              className={`fixed left-0 top-[57px] z-40 hidden h-[calc(100vh-57px)] overflow-hidden border-r border-white/[0.08] bg-[linear-gradient(180deg,#17031f_0%,#250331_48%,#13021a_100%)] shadow-[14px_0_44px_-42px_rgba(0,0,0,0.9),inset_-1px_0_0_rgba(255,255,255,0.05)] transition-[width] duration-300 lg:flex ${
                isDesktopNavExpanded ? 'w-[222px]' : 'w-[74px]'
              }`}
            >
              <div className="flex w-full flex-col">
                <div className={`${isDesktopNavExpanded ? 'px-3 pb-2 pt-4' : 'px-2 pb-2 pt-4'}`}>
                  <div
                    className={`flex items-center ${
                      isDesktopNavExpanded
                        ? 'gap-3 rounded-[18px] px-2.5 py-2'
                        : 'h-10 w-10 justify-center rounded-[14px]'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-[#ffcf93]/25 bg-[#ff8f1f] text-sm font-black text-[#2a0338] shadow-[0_14px_28px_-22px_rgba(255,143,31,0.9)]">
                      UF
                    </span>
                    {isDesktopNavExpanded && (
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-white">{technicianSidebarAccountLabel}</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-white/[0.42]">Panel técnico</p>
                      </div>
                    )}
                  </div>
                </div>

                <nav className={`flex-1 overflow-y-auto ${isDesktopNavExpanded ? 'px-2.5 py-2' : 'px-2 py-2'}`}>
                  <div className="flex flex-col gap-0.5">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeNavKey === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={isActive}
                          title={!isDesktopNavExpanded ? item.label : undefined}
                          onClick={() => {
                            setActiveTab(item.key);
                            if (item.key === 'presupuestos') setQuoteFilter('all');
                          }}
                          className={`group relative flex items-center transition duration-200 ${
                            isDesktopNavExpanded
                              ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                              : 'h-10 w-10 justify-center rounded-[14px]'
                          } ${
                            isActive
                              ? 'bg-white/[0.075] text-white'
                              : 'text-white/[0.58] hover:bg-white/[0.055] hover:text-white'
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#ff8f1f]" />
                          )}
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] transition ${
                              isActive
                                ? 'text-[#ff9c1a]'
                                : 'bg-white/[0.055] text-white/[0.68] group-hover:bg-white/[0.09] group-hover:text-white'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          {isDesktopNavExpanded && (
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{item.label}</span>
                          )}
                          {item.key === 'notificaciones' && unreadNotifications > 0 && (
                            <span
                              className={`rounded-full bg-[#ef4444] text-[10px] font-bold text-white shadow-sm ${
                                isDesktopNavExpanded ? 'px-2 py-0.5' : 'absolute right-0 top-0 min-w-4 px-1 py-[1px]'
                              }`}
                            >
                              {unreadNotifications}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </nav>

                <div className={`${isDesktopNavExpanded ? 'px-2.5 pb-3 pt-2.5' : 'px-2 pb-3 pt-2.5'} border-t border-white/[0.08]`}>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      title={!isDesktopNavExpanded ? 'Configuración' : undefined}
                      onClick={() => setActiveTab('perfil')}
                      className={`group relative flex items-center text-white/[0.76] transition hover:bg-white/[0.075] hover:text-white ${
                        isDesktopNavExpanded
                          ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                          : 'h-10 w-10 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.055] text-white/[0.68] transition group-hover:bg-white/[0.09] group-hover:text-white">
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
                      className={`group relative flex items-center text-white/[0.82] transition hover:bg-[#ff8f1f]/[0.12] hover:text-white ${
                        isDesktopNavExpanded
                          ? 'min-h-10 w-full gap-2.5 rounded-[14px] px-2.5 text-left'
                          : 'h-10 w-10 justify-center rounded-[14px]'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#ff8f1f] text-[#2a0338] shadow-[0_12px_24px_-18px_rgba(255,140,26,0.9)] transition group-hover:brightness-105">
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
            <nav
              aria-label="Navegación principal móvil"
              className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 rounded-[24px] border border-white/[0.10] bg-[rgba(35,5,47,0.92)] p-1.5 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.86),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-300 lg:hidden ${
                isMobileDockShown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+1.25rem)] opacity-0'
              }`}
            >
              {isMobileToolsOpen && (
                <div className="absolute inset-x-2 bottom-[calc(100%+0.6rem)] rounded-[22px] border border-white/[0.10] bg-[rgba(31,5,42,0.96)] p-2.5 shadow-[0_22px_54px_-32px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.46]">Herramientas</p>
                    <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/[0.58]">
                      {quotes.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {mobileSecondaryNavItems.map((item) => {
                      const isActive = activeNavKey === item.key;
                      const Icon = item.icon;
                      const compactLabel =
                        item.key === 'visualizador'
                          ? 'Ver'
                          : item.key === 'notificaciones'
                            ? 'Alertas'
                            : item.label;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setActiveTab(item.key);
                            setIsMobileToolsOpen(false);
                            if (item.key === 'presupuestos') setQuoteFilter('all');
                          }}
                          className={`flex min-h-10 items-center gap-2 rounded-[16px] px-3 text-left text-xs font-semibold transition ${
                            isActive
                              ? 'bg-white/[0.13] text-[#ffcf93] shadow-[inset_0_0_0_1px_rgba(255,207,147,0.24)]'
                              : 'bg-white/[0.055] text-white/[0.82] hover:bg-white/[0.10] hover:text-white'
                          }`}
                        >
                          <Icon className={isActive ? 'h-4 w-4 shrink-0 text-[#ffcf93]' : 'h-4 w-4 shrink-0 text-white/[0.62]'} />
                          <span className="min-w-0 flex-1 truncate">{compactLabel}</span>
                          {item.key === 'notificaciones' && unreadNotifications > 0 && (
                            <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-[10px] font-semibold text-white">
                              {unreadNotifications}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_38px] gap-0.5">
                {mobilePrimaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNavKey === item.key;
                  const mobileLabel =
                    item.key === 'lobby'
                      ? 'Panel'
                      : item.key === 'operativo'
                        ? 'Mapa'
                        : item.key === 'presupuestos'
                          ? 'Presup.'
                          : item.label;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveTab(item.key);
                        setIsMobileToolsOpen(false);
                        if (item.key === 'presupuestos') setQuoteFilter('all');
                      }}
                      className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[18px] px-1 text-[10px] font-semibold transition ${
                        isActive
                          ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,143,31,0.18)]'
                          : 'text-white/[0.58] hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className={isActive ? 'h-4 w-4 text-[#ff9c1a]' : 'h-4 w-4'} />
                      <span className="max-w-full truncate">{mobileLabel}</span>
                      {isActive && <span className="absolute bottom-1.5 h-1 w-4 rounded-full bg-[#ff8f1f]" />}
                    </button>
                    );
                  })}
                <button
                  type="button"
                  aria-expanded={isMobileToolsOpen}
                  aria-label="Más herramientas"
                  onClick={() => setIsMobileToolsOpen((prev) => !prev)}
                  className={`relative flex min-h-[56px] items-center justify-center rounded-[18px] px-1 transition ${
                    isMobileToolsOpen || isMobileSecondaryActive
                      ? 'bg-white/[0.08] text-[#ff9c1a] shadow-[inset_0_0_0_1px_rgba(255,143,31,0.18)]'
                      : 'text-white/[0.58] hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <MoreVertical className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ef4444]" />
                  )}
                </button>
              </div>
            </nav>

            <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] right-4 z-[60] flex flex-col items-end gap-3 lg:hidden">
              {isMobileFloatingMenuOpen && (
                <div className="w-[min(19.5rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-white/[0.10] bg-[rgba(35,5,47,0.96)] p-2.5 shadow-[0_24px_58px_-30px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.46]">Menú técnico</p>
                      <p className="mt-0.5 truncate text-[12px] font-semibold text-white/[0.78]">
                        {technicianSidebarAccountLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Cerrar menú"
                      onClick={() => setIsMobileFloatingMenuOpen(false)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.07] text-white/[0.72] transition hover:bg-white/[0.12] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="max-h-[min(62vh,28rem)] overflow-y-auto pr-0.5">
                    <div className="grid gap-1">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNavKey === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => {
                              setActiveTab(item.key);
                              setIsMobileFloatingMenuOpen(false);
                              setIsMobileToolsOpen(false);
                              if (item.key === 'presupuestos') setQuoteFilter('all');
                            }}
                            className={`flex min-h-11 items-center gap-2.5 rounded-[16px] px-3 text-left text-[13px] font-semibold transition ${
                              isActive
                                ? 'bg-white/[0.13] text-[#ffcf93] shadow-[inset_0_0_0_1px_rgba(255,207,147,0.24)]'
                                : 'text-white/[0.78] hover:bg-white/[0.075] hover:text-white'
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] ${
                                isActive ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-white/[0.06] text-white/[0.64]'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.key === 'notificaciones' && unreadNotifications > 0 && (
                              <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-[10px] font-semibold text-white">
                                {unreadNotifications}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 border-t border-white/[0.08] pt-2">
                      <a
                        href={publicProfileUrl || (session?.user?.id ? `/tecnico/${session.user.id}` : '/tecnicos?tab=perfil')}
                        onClick={() => setIsMobileFloatingMenuOpen(false)}
                        className="flex min-h-11 items-center gap-2.5 rounded-[16px] px-3 text-[13px] font-semibold text-white/[0.78] transition hover:bg-white/[0.075] hover:text-white"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.06] text-white/[0.64]">
                          <Store className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Perfil público</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('perfil');
                          setIsMobileFloatingMenuOpen(false);
                          setIsMobileToolsOpen(false);
                        }}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-[16px] px-3 text-left text-[13px] font-semibold text-white/[0.78] transition hover:bg-white/[0.075] hover:text-white"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.06] text-white/[0.64]">
                          <Settings className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Configuración</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileFloatingMenuOpen(false);
                          void handleLogout();
                        }}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-[16px] px-3 text-left text-[13px] font-semibold text-white/[0.88] transition hover:bg-[#ff8f1f]/[0.12] hover:text-white"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[#ff8f1f] text-[#2a0338]">
                          <LogOut className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                aria-label={isMobileFloatingMenuOpen ? 'Cerrar menú técnico' : 'Abrir menú técnico'}
                aria-expanded={isMobileFloatingMenuOpen}
                onClick={() => {
                  setIsMobileFloatingMenuOpen((prev) => !prev);
                  setIsMobileToolsOpen(false);
                }}
                className={`flex h-14 items-center gap-2 rounded-full border px-4 text-sm font-black shadow-[0_18px_42px_-24px_rgba(0,0,0,0.86)] backdrop-blur-xl transition ${
                  isMobileFloatingMenuOpen
                    ? 'border-[#ffcf93]/35 bg-[#ff8f1f] text-[#2a0338]'
                    : 'border-white/[0.12] bg-[rgba(35,5,47,0.94)] text-white'
                }`}
              >
                {isMobileFloatingMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span>Menú</span>
              </button>
            </div>

            <main className={isFullBleedContent ? 'relative w-full pt-0' : 'relative pt-6'}>
              {isProfileUnderReview && (
                <section className="mb-5 overflow-hidden rounded-[28px] border border-[#ffcf93]/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.9))] p-4 shadow-[0_22px_62px_-46px_rgba(42,3,56,0.62)] sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#ff8f1f]/25 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a4a15] shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#ff8f1f]" />
                        Perfil en revisión
                      </span>
                      <h2 className={`${spaceGrotesk.className} mt-3 text-2xl font-bold tracking-tight text-[#180f24]`}>
                        Ya podés preparar tu operación
                      </h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                        Tu perfil está cargado y UrbanFix lo está revisando. Mientras tanto podés crear presupuestos,
                        ordenar clientes y completar detalles; las solicitudes cercanas y la vidriera pública se habilitan
                        cuando quede aprobado.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('perfil')}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#ff8f1f]/35 bg-white px-4 text-xs font-semibold text-[#2a0338] shadow-sm transition hover:border-[#ff8f1f]/60 hover:bg-[#fff7ed]"
                      >
                        Revisar perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2a0338] px-4 text-xs font-semibold text-white shadow-[0_18px_38px_-26px_rgba(42,3,56,0.9)] transition hover:-translate-y-0.5 hover:bg-[#3a094a]"
                      >
                        Verificar estado
                      </button>
                    </div>
                  </div>
                </section>
              )}
              <section className={isFullBleedContent ? 'space-y-0' : 'space-y-6'}>
            {(activeTab === 'lobby' || activeTab === 'operativo') && (
              <div className={activeTab === 'operativo' ? 'space-y-0' : 'space-y-6'}>
                {activeTab === 'lobby' && (
                  <>
                    <div className="px-1 sm:px-2">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ff8f1f] shadow-[0_0_0_4px_rgba(255,143,31,0.10)]" />
                          Hoy, {technicianTodayLabel}
                        </div>
                        <h1 className={`${spaceGrotesk.className} mt-3 max-w-4xl text-4xl font-bold leading-[1.03] text-[#180f24] sm:text-5xl lg:text-[2.75rem]`}>
                          Bienvenido, {technicianHomeName}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                          Este es tu estado de hoy: pendientes, balance y el próximo paso para avanzar.
                        </p>
                      </div>
                    </div>

                    <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)] sm:p-6">
                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {[
                          { label: 'Pendientes', value: quoteStats.pending, hint: technicianStatusWindow.pendingLabel, tone: 'bg-[#ff8f1f]' },
                          { label: 'Aprobados', value: quoteStats.approved, hint: 'listos', tone: 'bg-emerald-500' },
                          { label: 'Balance mes', value: formatCurrency(technicianStatusWindow.monthPaidAmount), hint: technicianMonthLabel, tone: 'bg-[#2a0338]' },
                          { label: 'Perfil', value: `${profileCompletionPercent}%`, hint: profileForm.profilePublished ? 'visible' : 'por publicar', tone: 'bg-slate-400' },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex min-h-[108px] flex-col items-center justify-center rounded-[22px] border border-slate-200/90 bg-white px-3 py-5 text-center shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42),inset_0_1px_0_rgba(255,255,255,0.86)] sm:px-4"
                          >
                            <span className={`mb-3 h-1 w-8 rounded-full ${item.tone}`} />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                            <p className={`${spaceGrotesk.className} mt-2 max-w-full truncate text-3xl font-bold leading-none text-[#180f24]`}>
                              {item.value}
                            </p>
                            <p className="mt-2 max-w-full truncate text-xs text-slate-500">{item.hint}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.38)]">
                            <div className="flex min-h-[86px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  Acción recomendada
                                </p>
                                <p className={`${spaceGrotesk.className} mt-1 text-lg font-bold text-[#180f24]`}>
                                  {technicianStatusWindow.nextAction}
                                </p>
                                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{technicianStatusWindow.actionHint}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveTab(technicianStatusWindow.actionTab)}
                                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#2a0338] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_38px_-26px_rgba(42,3,56,0.9)] transition hover:-translate-y-0.5 hover:bg-[#3a094a]"
                              >
                                {technicianStatusWindow.actionLabel}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.38)]">
                            <div className="flex min-h-[88px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                  Configuración inicial
                                </p>
                                <p className={`${spaceGrotesk.className} mt-1 text-lg font-bold text-slate-900`}>
                                  {shouldShowLobbyOnboarding && lobbyPrimarySetupStep
                                    ? lobbyPrimarySetupStep.title
                                    : 'Tu panel ya está listo para operar'}
                                </p>
                                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                                  {shouldShowLobbyOnboarding && lobbyPrimarySetupStep
                                    ? lobbyPrimarySetupStep.description
                                    : 'Puedes seguir optimizando presupuestos, agenda y presencia pública.'}
                                </p>
                              </div>
                              <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#2a0338]">
                                {lobbySetupCompleted}/{lobbySetupSteps.length} completo
                              </span>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#ff8f1f,#ffd09a,#2a0338)] transition-[width] duration-500"
                                style={{ width: `${lobbySetupPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="relative min-h-[250px] overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_22px_50px_-38px_rgba(15,23,42,0.48),inset_0_1px_0_rgba(255,255,255,0.78)]">
                          {technicianHomeMapPoint && technicianHomeMapUrl ? (
                            <>
                              <iframe
                                title={`Ubicación de ${technicianHomeName}`}
                                src={technicianHomeMapUrl}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full border-0 grayscale-[0.08] saturate-[0.92]"
                              />
                              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0)_40%,rgba(24,15,36,0.12))]" />
                              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/88 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2a0338] shadow-[0_16px_36px_-24px_rgba(42,3,56,0.58)] backdrop-blur">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338]">
                                  <MapPinned className="h-3.5 w-3.5" strokeWidth={2.2} />
                                </span>
                                Ubicación técnica
                              </div>
                              <div className="absolute bottom-3 left-3 right-3 rounded-[17px] border border-white/72 bg-white/88 px-3 py-2 shadow-[0_16px_34px_-28px_rgba(42,3,56,0.62)] backdrop-blur">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                                  <p className="min-w-0 max-w-[180px] truncate text-sm font-semibold text-[#180f24]">{technicianHomeName}</p>
                                  <p className="min-w-0 max-w-[140px] truncate text-xs text-slate-500">{technicianHomeMapPoint.label}</p>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  <span className="rounded-full border border-[#eadfce] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2a0338]">
                                    Zona activa
                                  </span>
                                  <span className="rounded-full border border-[#ffcf93] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-semibold text-[#8a4a07]">
                                    {profileForm.profilePublished ? 'Visible en vidriera' : 'Pendiente de publicar'}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveTab('perfil')}
                              className="flex h-full min-h-[250px] w-full flex-col items-start justify-between p-5 text-left transition hover:bg-white/45"
                            >
                              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338] shadow-[0_18px_38px_-28px_rgba(255,143,31,0.9)]">
                                <MapPinned className="h-5 w-5" strokeWidth={2.1} />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold text-[#180f24]">Ubicación pendiente</span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">
                                  Completa tu punto en el mapa para aparecer en la vidriera y ordenar trabajos por zona.
                                </span>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </section>

                    <section className="px-1 py-2 sm:px-2">
                      <div className="grid grid-cols-2 gap-x-7 gap-y-10 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-8">
                        <button
                          type="button"
                          aria-label="Nuevo presupuesto"
                          onClick={startNewQuote}
                          className="group relative flex min-h-[148px] w-full items-start justify-center text-center focus:outline-none"
                        >
                          <span className="relative z-10 flex aspect-square w-[104px] items-center justify-center overflow-visible rounded-full border border-[#ffbd73] bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.38),rgba(255,255,255,0)_28%),linear-gradient(145deg,#ffad56_0%,#ff8f1f_52%,#e77700_100%)] text-[#2a0338] shadow-[0_22px_42px_-24px_rgba(255,143,31,0.95),inset_0_1px_0_rgba(255,255,255,0.52),inset_0_-14px_26px_rgba(138,74,7,0.13)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:shadow-[0_30px_60px_-30px_rgba(255,143,31,0.95),inset_0_1px_0_rgba(255,255,255,0.58),inset_0_-14px_26px_rgba(138,74,7,0.16)] group-hover:ring-8 group-hover:ring-[#ff8f1f]/10 group-focus-visible:ring-4 group-focus-visible:ring-[#ffcf93]/55 sm:w-[116px]">
                            <span className="absolute inset-[20px] rounded-full bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.35),rgba(255,255,255,0.16)_45%,rgba(255,255,255,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition duration-300 group-hover:scale-110 group-hover:bg-white/24" />
                            <FilePlus className="relative z-10 h-11 w-11 -rotate-[7deg] transition duration-300 ease-out group-hover:-rotate-[2deg] group-hover:scale-110" strokeWidth={1.75} />
                            <span className="absolute -bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-[#2a0338]/10 bg-[#2a0338] px-3 py-1.5 text-[12px] font-semibold leading-none text-white shadow-[0_14px_26px_-18px_rgba(42,3,56,0.9)] [letter-spacing:0] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_30px_-18px_rgba(42,3,56,0.95)]">
                              Nuevo presupuesto
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label="Mapa operativo"
                          onClick={() => setActiveTab('operativo')}
                          className="group relative flex min-h-[148px] w-full items-start justify-center text-center focus:outline-none"
                        >
                          <span className="relative z-10 flex aspect-square w-[104px] items-center justify-center overflow-visible rounded-full border border-slate-200 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.96),rgba(255,255,255,0)_32%),linear-gradient(145deg,#ffffff_0%,#fffdf8_52%,#f3f0ea_100%)] text-slate-700 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(42,3,56,0.045)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:border-[#ffcf93] group-hover:shadow-[0_30px_58px_-34px_rgba(15,23,42,0.62),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(255,143,31,0.075)] group-hover:ring-8 group-hover:ring-[#ff8f1f]/10 group-focus-visible:ring-4 group-focus-visible:ring-[#ffcf93]/45 sm:w-[116px]">
                            <span className="absolute inset-[20px] rounded-full bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.95),rgba(248,250,252,0.92)_48%,rgba(241,245,249,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fff3e6]" />
                            <MapPinned className="relative z-10 h-10 w-10 -rotate-[7deg] transition duration-300 ease-out group-hover:-rotate-[2deg] group-hover:scale-110" strokeWidth={1.75} />
                            <span className="absolute -bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold leading-none text-[#180f24] shadow-[0_14px_26px_-20px_rgba(15,23,42,0.55)] [letter-spacing:0] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#ffcf93] group-hover:shadow-[0_18px_30px_-22px_rgba(15,23,42,0.7)]">
                              Mapa operativo
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label="Ajustar perfil"
                          onClick={() => setActiveTab('perfil')}
                          className="group relative flex min-h-[148px] w-full items-start justify-center text-center focus:outline-none"
                        >
                          <span className="relative z-10 flex aspect-square w-[104px] items-center justify-center overflow-visible rounded-full border border-slate-200 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.96),rgba(255,255,255,0)_32%),linear-gradient(145deg,#ffffff_0%,#fffdf8_52%,#f3f0ea_100%)] text-slate-700 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(42,3,56,0.045)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:border-[#ffcf93] group-hover:shadow-[0_30px_58px_-34px_rgba(15,23,42,0.62),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(255,143,31,0.075)] group-hover:ring-8 group-hover:ring-[#ff8f1f]/10 group-focus-visible:ring-4 group-focus-visible:ring-[#ffcf93]/45 sm:w-[116px]">
                            <span className="absolute inset-[20px] rounded-full bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.95),rgba(248,250,252,0.92)_48%,rgba(241,245,249,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fff3e6]" />
                            <UserCog className="relative z-10 h-10 w-10 -rotate-[7deg] transition duration-300 ease-out group-hover:-rotate-[2deg] group-hover:scale-110" strokeWidth={1.75} />
                            <span className="absolute -bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold leading-none text-[#180f24] shadow-[0_14px_26px_-20px_rgba(15,23,42,0.55)] [letter-spacing:0] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#ffcf93] group-hover:shadow-[0_18px_30px_-22px_rgba(15,23,42,0.7)]">
                              Ajustar perfil
                            </span>
                          </span>
                        </button>

                        {publicProfileUrl ? (
                          <a
                            href={publicProfileUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Ver vidriera"
                            className="group relative flex min-h-[148px] w-full items-start justify-center text-center focus:outline-none"
                          >
                            <span className="relative z-10 flex aspect-square w-[104px] items-center justify-center overflow-visible rounded-full border border-slate-200 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.96),rgba(255,255,255,0)_32%),linear-gradient(145deg,#ffffff_0%,#fffdf8_52%,#f3f0ea_100%)] text-slate-700 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(42,3,56,0.045)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:border-[#ffcf93] group-hover:shadow-[0_30px_58px_-34px_rgba(15,23,42,0.62),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(255,143,31,0.075)] group-hover:ring-8 group-hover:ring-[#ff8f1f]/10 group-focus-visible:ring-4 group-focus-visible:ring-[#ffcf93]/45 sm:w-[116px]">
                              <span className="absolute inset-[20px] rounded-full bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.95),rgba(248,250,252,0.92)_48%,rgba(241,245,249,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fff3e6]" />
                              <Store className="relative z-10 h-10 w-10 -rotate-[7deg] transition duration-300 ease-out group-hover:-rotate-[2deg] group-hover:scale-110" strokeWidth={1.75} />
                              <span className="absolute -bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold leading-none text-[#180f24] shadow-[0_14px_26px_-20px_rgba(15,23,42,0.55)] [letter-spacing:0] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#ffcf93] group-hover:shadow-[0_18px_30px_-22px_rgba(15,23,42,0.7)]">
                                Ver vidriera
                              </span>
                            </span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            aria-label="Preparar vidriera"
                            onClick={() => setActiveTab('perfil')}
                            className="group relative flex min-h-[148px] w-full items-start justify-center text-center focus:outline-none"
                          >
                            <span className="relative z-10 flex aspect-square w-[104px] items-center justify-center overflow-visible rounded-full border border-slate-200 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.96),rgba(255,255,255,0)_32%),linear-gradient(145deg,#ffffff_0%,#fffdf8_52%,#f3f0ea_100%)] text-slate-700 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(42,3,56,0.045)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:border-[#ffcf93] group-hover:shadow-[0_30px_58px_-34px_rgba(15,23,42,0.62),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-12px_24px_rgba(255,143,31,0.075)] group-hover:ring-8 group-hover:ring-[#ff8f1f]/10 group-focus-visible:ring-4 group-focus-visible:ring-[#ffcf93]/45 sm:w-[116px]">
                              <span className="absolute inset-[20px] rounded-full bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.95),rgba(248,250,252,0.92)_48%,rgba(241,245,249,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fff3e6]" />
                              <Store className="relative z-10 h-10 w-10 -rotate-[7deg] transition duration-300 ease-out group-hover:-rotate-[2deg] group-hover:scale-110" strokeWidth={1.75} />
                              <span className="absolute -bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold leading-none text-[#180f24] shadow-[0_14px_26px_-20px_rgba(15,23,42,0.55)] [letter-spacing:0] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#ffcf93] group-hover:shadow-[0_18px_30px_-22px_rgba(15,23,42,0.7)]">
                                Preparar vidriera
                              </span>
                            </span>
                          </button>
                        )}
                      </div>
                    </section>

                    <section className="space-y-6">
                      <div className="space-y-6">
                        <div className="rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)] sm:p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-2xl">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Clientes</p>
                              <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
                                Clientes y zonas activas
                              </h2>
                            </div>
                            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
                              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Mapeados</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{clientHistorySummary.located}</p>
                              </div>
                              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Clientes</p>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{clientHistorySummary.clients}</p>
                              </div>
                              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Movimientos</p>
                                <p className="mt-2 text-2xl font-semibold text-[#2a0338]">{clientHistorySummary.movements}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {clientHistoryFilterOptions.map((option) => {
                              const active = clientHistoryFilter === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => setClientHistoryFilter(option.id)}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                    active
                                      ? 'border-[#ff8f1f] bg-[#ff8f1f] text-[#2a0338] shadow-[0_16px_30px_-24px_rgba(255,143,31,0.9)]'
                                      : 'border-slate-200 bg-white text-slate-500 hover:border-[#ffcf93] hover:text-slate-900'
                                  }`}
                                >
                                  <span>{option.label}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/55' : 'bg-slate-100'}`}>
                                    {option.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(380px,1.14fr)]">
                            <div className="space-y-3">
                              {filteredClientHistory.length === 0 && (
                                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                  No hay clientes en este filtro todavía.
                                </div>
                              )}
                              {filteredClientHistory.slice(0, 5).map((client) => {
                                const selected = selectedClientKey === client.key;
                                const pendingClient = client.quotes.some((quote) => quoteNeedsFollowUp(quote.status));
                                const paidClient = client.paidCount > 0;
                                return (
                                  <div
                                    key={client.key}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedClientKey(client.key)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setSelectedClientKey(client.key);
                                      }
                                    }}
                                    className={`group flex w-full items-center justify-between gap-4 rounded-[24px] border px-4 py-4 text-left transition ${
                                      selected
                                        ? 'border-[#ff8f1f] bg-[#fff8ef] shadow-[0_22px_42px_-34px_rgba(255,143,31,0.9)]'
                                        : 'border-slate-200 bg-white hover:border-[#ffcf93] hover:bg-[#fffaf4]'
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      <span
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase shadow-[0_18px_34px_-26px_rgba(42,3,56,0.9)] ${
                                          selected ? 'bg-[#ff8f1f] text-[#2a0338]' : 'bg-[#2a0338] text-white'
                                        }`}
                                      >
                                        {client.name.slice(0, 2)}
                                      </span>
                                      <span className="min-w-0">
                                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                                          <span className="truncate text-base font-semibold text-slate-900">{client.name}</span>
                                          {client.locationCount > 0 ? (
                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                              ubicación
                                            </span>
                                          ) : null}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                          {client.quotes.length} {client.quotes.length === 1 ? 'movimiento' : 'movimientos'} · último {client.lastDateLabel}
                                        </span>
                                        <span className="mt-1 block text-[11px] text-slate-400">
                                          Desde {client.firstDateLabel}
                                          {pendingClient ? ' · requiere seguimiento' : paidClient ? ' · trabajo cobrado' : ''}
                                        </span>
                                      </span>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-sm font-semibold text-slate-900">${client.totalAmount.toLocaleString('es-AR')}</p>
                                      <span
                                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                          paidClient
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : pendingClient
                                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                                              : 'border-slate-200 bg-slate-50 text-slate-500'
                                        }`}
                                      >
                                        {client.latestStatusLabel}
                                      </span>
                                      {client.latestQuote ? (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            loadQuote(client.latestQuote);
                                          }}
                                          className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-[#ffcf93] hover:text-slate-900"
                                        >
                                          Ver
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {visibleClientZonePoints.length > 0 ? (
                              <TechnicianClientHistoryMap
                                points={visibleClientZonePoints}
                                selectedPointId={selectedClientKey}
                                onSelectPoint={(pointId) => {
                                  setSelectedClientKey(pointId);
                                }}
                                onOpenMap={() => setActiveTab('operativo')}
                              />
                            ) : (
                              <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('perfil')}
                                  className="flex h-full min-h-[360px] w-full flex-col items-start justify-between p-5 text-left transition hover:bg-white/45"
                                >
                                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338] shadow-[0_18px_38px_-28px_rgba(255,143,31,0.9)]">
                                    <MapPinned className="h-5 w-5" strokeWidth={2.1} />
                                  </span>
                                  <span>
                                    <span className="block text-sm font-semibold text-[#180f24]">Sin zonas mapeadas</span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                      Para mapear clientes con precisión, cada presupuesto necesita ubicación confirmada.
                                    </span>
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)] sm:p-6">
                          <div className="relative flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="inline-flex rounded-full border border-[#ffcf93] bg-[#fff8ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a4a07]">
                                Facturación
                              </p>
                              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Caja, cobro y mano de obra</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                                {financeTimelineMode === 'weekly' ? '6 + 2 semanas' : financeTimelineMode === 'yearly' ? '6 + 2 años' : '6 + 2 meses'}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                                Último {financeOverview.latestActiveMonth.label.toUpperCase()}
                              </span>
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                {financeOverview.collectionRate}% cobrado
                              </span>
                            </div>
                          </div>

                          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="group rounded-[26px] border border-slate-200 bg-white/92 px-4 py-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-40px_rgba(15,23,42,0.52)]">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                  <span className="h-2 w-2 rounded-full bg-slate-900" />
                                  Total
                                </div>
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_28px_-20px_rgba(15,23,42,0.9)]">
                                  <FileText className="h-4 w-4" strokeWidth={1.9} />
                                </span>
                              </div>
                              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{formatDashboardMoney(quoteStats.amount)}</p>
                              <p className="mt-1 text-xs text-slate-500">{quoteStats.total} presupuestos cargados.</p>
                            </div>
                            <div className="group rounded-[26px] border border-[#ffd7a3] bg-[linear-gradient(145deg,#fffdf9,#fff2df)] px-4 py-4 shadow-[0_18px_42px_-34px_rgba(245,158,11,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-40px_rgba(245,158,11,0.65)]">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-600">
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                  Cobrado
                                </div>
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff8f1f] text-[#2a0338] shadow-[0_14px_28px_-20px_rgba(245,158,11,0.9)]">
                                  <CreditCard className="h-4 w-4" strokeWidth={1.9} />
                                </span>
                              </div>
                              <p className="mt-3 text-2xl font-semibold tracking-tight text-amber-700">{formatDashboardMoney(quoteStats.paidAmount)}</p>
                              <p className="mt-1 text-xs text-amber-700/70">{quoteStats.paid} presupuestos cobrados.</p>
                            </div>
                            <div className="group rounded-[26px] border border-emerald-200 bg-[linear-gradient(145deg,#fbfffd,#eafbf1)] px-4 py-4 shadow-[0_18px_42px_-34px_rgba(16,185,129,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_-40px_rgba(16,185,129,0.65)]">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-600">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Mano de obra
                                </div>
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_14px_28px_-20px_rgba(16,185,129,0.9)]">
                                  <Tag className="h-4 w-4" strokeWidth={1.9} />
                                </span>
                              </div>
                              <p className="mt-3 text-2xl font-semibold tracking-tight text-emerald-700">{formatDashboardMoney(quoteStats.profitAmount)}</p>
                              <p className="mt-1 text-xs text-emerald-700/70">{financeOverview.laborRate}% del cobro confirmado.</p>
                            </div>
                          </div>

                          <div className="relative mt-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{financeTimelineTitle}</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  Mejor periodo: {financeOverview.bestMonth.label.toUpperCase()} · {formatDashboardMoney(financeOverview.bestMonth.quotes)}
                                  {financeTimelineOffset !== 0 ? (
                                    <span className="font-medium text-slate-400"> · {financeTimelinePositionLabel}</span>
                                  ) : null}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                                <span className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                                  {financeTimelineModeOptions.map((option) => {
                                    const active = financeTimelineMode === option.id;
                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                          setFinanceTimelineMode(option.id);
                                          setFinanceTimelineOffset(0);
                                          setActiveFinancePointKey(null);
                                        }}
                                        className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                                          active
                                            ? 'bg-[#2a0338] text-white shadow-[0_12px_24px_-18px_rgba(42,3,56,0.9)]'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">
                                  <span className="h-2 w-2 rounded-full bg-slate-900" />
                                  Presupuestos
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-1 shadow-sm">
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                  Cobrados
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 shadow-sm">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Mano de obra
                                </span>
                              </div>
                            </div>
                            <div
                              className="relative mt-4 cursor-grab select-none touch-pan-y active:cursor-grabbing"
                              onPointerDown={handleFinanceTimelinePointerDown}
                              onPointerMove={handleFinanceTimelinePointerMove}
                              onPointerUp={handleFinanceTimelinePointerEnd}
                              onPointerCancel={handleFinanceTimelinePointerEnd}
                              onClick={() => setActiveFinancePointKey(null)}
                              aria-label="Arrastra hacia los lados para mover la linea de tiempo"
                            >
                              <div className="pointer-events-none absolute left-1 top-1/2 z-20 h-16 w-1.5 -translate-y-1/2 rounded-full bg-slate-300/80 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.7)] md:h-20" />
                              <div className="pointer-events-none absolute right-1 top-1/2 z-20 h-16 w-1.5 -translate-y-1/2 rounded-full bg-slate-300/80 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.7)] md:h-20" />
                              <svg
                                viewBox={`0 0 ${financeChart.width} ${financeChart.height}`}
                                className="h-[250px] w-full overflow-visible"
                                role="img"
                                aria-label="Grafico de facturacion con seis meses reales y dos proximos"
                              >
                              <defs>
                                <linearGradient id="ufx-finance-quotes-area" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stopColor="#0F172A" stopOpacity="0.12" />
                                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="ufx-finance-quotes-line" x1="0" x2="1" y1="0" y2="0">
                                  <stop offset="0%" stopColor="#334155" />
                                  <stop offset="100%" stopColor="#0F172A" />
                                </linearGradient>
                                <linearGradient id="ufx-finance-paid-line" x1="0" x2="1" y1="0" y2="0">
                                  <stop offset="0%" stopColor="#FBBF24" />
                                  <stop offset="100%" stopColor="#D97706" />
                                </linearGradient>
                                <linearGradient id="ufx-finance-profit-line" x1="0" x2="1" y1="0" y2="0">
                                  <stop offset="0%" stopColor="#34D399" />
                                  <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                                <filter id="ufx-finance-line-shadow" x="-10%" y="-20%" width="120%" height="140%">
                                  <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0f172a" floodOpacity="0.12" />
                                </filter>
                              </defs>
                              <rect
                                x={financeChart.plotLeft}
                                y={financeChart.padding.top}
                                width={financeChart.plotRight - financeChart.plotLeft}
                                height={financeChart.plotBottom - financeChart.padding.top}
                                rx="18"
                                fill="#ffffff"
                                opacity="0.56"
                              />
                              {financeChart.gridLines.map((line) => (
                                <g key={`grid-${line.label}`}>
                                  <line
                                    x1={financeChart.plotLeft}
                                    x2={financeChart.plotRight}
                                    y1={line.y}
                                    y2={line.y}
                                    stroke="#E2E8F0"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={financeChart.plotLeft - 10}
                                    y={line.y + 4}
                                    textAnchor="end"
                                    className="fill-slate-400 text-[10px] font-semibold"
                                  >
                                    {line.label}
                                  </text>
                                </g>
                              ))}
                              {financeSeries.map((item, index) => {
                                const point = financeChart.quotesPoints[index];
                                return (
                                  <g key={`month-${item.key}`}>
                                    <line
                                      x1={point.x}
                                      x2={point.x}
                                      y1={financeChart.padding.top}
                                      y2={financeChart.plotBottom}
                                      stroke={item.isFuture ? '#E5E7EB' : '#F1F5F9'}
                                      strokeWidth="1"
                                      strokeDasharray={item.isFuture ? '5 7' : undefined}
                                    />
                                    <text
                                      x={point.x}
                                      y={financeChart.height - 8}
                                      textAnchor="middle"
                                      className={`text-[10px] font-semibold uppercase ${item.isFuture ? 'fill-slate-300' : 'fill-slate-400'}`}
                                    >
                                      {item.label}
                                    </text>
                                  </g>
                                );
                              })}
                              <path d={financeChart.quotesAreaPath} fill="url(#ufx-finance-quotes-area)" />
                              <g filter="url(#ufx-finance-line-shadow)">
                                <path d={financeChart.quotesPath} fill="none" stroke="url(#ufx-finance-quotes-line)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d={financeChart.paidPath} fill="none" stroke="url(#ufx-finance-paid-line)" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d={financeChart.profitPath} fill="none" stroke="url(#ufx-finance-profit-line)" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
                              </g>
                              {financeChart.quotesPoints.map((point, index) => {
                                const hasQuotes = point.hasValue && point.quoteRefs.length > 0;
                                const active = activeFinancePointKey === point.key;
                                const quoteBadge =
                                  point.quoteRefs.length === 1 ? `#${point.quoteRefs[0].number}` : `${point.quoteRefs.length} pres.`;
                                const badgeWidth = Math.max(48, quoteBadge.length * 6.3 + 16);
                                const badgeX = Math.min(
                                  financeChart.width - badgeWidth - 8,
                                  Math.max(8, point.x - badgeWidth / 2)
                                );
                                const badgeY = Math.max(6, point.y - 31);
                                return (
                                  <g
                                    key={`q-${index}`}
                                    role={hasQuotes ? 'button' : undefined}
                                    tabIndex={hasQuotes ? 0 : -1}
                                    className={hasQuotes ? 'cursor-pointer outline-none' : undefined}
                                    onPointerDown={(event) => {
                                      if (!hasQuotes) return;
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      if (!hasQuotes) return;
                                      event.stopPropagation();
                                      setActiveFinancePointKey((current) => (current === point.key ? null : point.key));
                                    }}
                                    onKeyDown={(event) => {
                                      if (!hasQuotes) return;
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setActiveFinancePointKey((current) => (current === point.key ? null : point.key));
                                      }
                                    }}
                                    aria-label={
                                      hasQuotes
                                        ? `${point.label}: ${point.quoteRefs.length} presupuestos asignados`
                                        : undefined
                                    }
                                  >
                                    {point.hasValue ? (
                                      <>
                                        <circle cx={point.x} cy={point.y} r="17" fill="transparent" />
                                        {point.value > 0 ? <circle cx={point.x} cy={point.y} r={active ? '12' : '9'} fill="#0F172A" opacity={active ? '0.12' : '0.08'} /> : null}
                                        <circle cx={point.x} cy={point.y} r={active ? '5.5' : '4'} fill="#0F172A" stroke="#fff" strokeWidth="2" />
                                        {hasQuotes ? (
                                          <g>
                                            <rect
                                              x={badgeX}
                                              y={badgeY}
                                              width={badgeWidth}
                                              height="20"
                                              rx="10"
                                              fill={active ? '#2A0338' : '#FFFFFF'}
                                              stroke={active ? '#2A0338' : '#E2E8F0'}
                                              strokeWidth="1"
                                            />
                                            <text
                                              x={badgeX + badgeWidth / 2}
                                              y={badgeY + 13.5}
                                              textAnchor="middle"
                                              className={`text-[9px] font-bold ${active ? 'fill-white' : 'fill-slate-700'}`}
                                            >
                                              {quoteBadge}
                                            </text>
                                          </g>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </g>
                                );
                              })}
                              {financeChart.paidPoints.map((point, index) => (
                                <g key={`a-${index}`}>
                                  {point.hasValue ? (
                                    <>
                                      {point.value > 0 ? <circle cx={point.x} cy={point.y} r="8" fill="#F59E0B" opacity="0.1" /> : null}
                                      <circle cx={point.x} cy={point.y} r="3.5" fill="#F59E0B" stroke="#fff" strokeWidth="2" />
                                    </>
                                  ) : null}
                                </g>
                              ))}
                              {financeChart.profitPoints.map((point, index) => (
                                <g key={`p-${index}`}>
                                  {point.hasValue ? (
                                    <>
                                      {point.value > 0 ? <circle cx={point.x} cy={point.y} r="8" fill="#10B981" opacity="0.1" /> : null}
                                      <circle cx={point.x} cy={point.y} r="3.5" fill="#10B981" stroke="#fff" strokeWidth="2" />
                                    </>
                                  ) : null}
                                </g>
                              ))}
                              </svg>
                              {activeFinancePoint ? (
                                <div
                                  className="pointer-events-auto absolute z-30 w-[min(320px,calc(100%-1rem))] rounded-[24px] border border-slate-200 bg-white/96 p-3 text-left shadow-[0_28px_70px_-35px_rgba(15,23,42,0.55)] backdrop-blur"
                                  style={{
                                    left: `${Math.min(82, Math.max(18, activeFinancePoint.xPercent))}%`,
                                    top: `${
                                      activeFinancePoint.yPercent < 42
                                        ? Math.min(76, activeFinancePoint.yPercent + 8)
                                        : Math.max(12, activeFinancePoint.yPercent - 4)
                                    }%`,
                                    transform: activeFinancePoint.yPercent < 42 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                                  }}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                        {activeFinancePoint.label.toUpperCase()} · {activeFinancePoint.quoteRefs.length} presupuestos
                                      </p>
                                      <p className="mt-1 text-base font-semibold text-slate-950">
                                        {formatDashboardMoney(activeFinancePoint.quotes)}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setActiveFinancePointKey(null)}
                                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                                      aria-label="Cerrar detalle del punto"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold">
                                    <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">
                                      Cobrado
                                      <span className="mt-0.5 block text-xs text-emerald-900">
                                        {formatDashboardMoney(activeFinancePoint.paid)}
                                      </span>
                                    </div>
                                    <div className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-700">
                                      Pendiente
                                      <span className="mt-0.5 block text-xs text-amber-900">
                                        {formatDashboardMoney(activeFinancePoint.pendingAmount)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-3 space-y-1.5">
                                    {activeFinancePoint.quoteRefs.slice(0, 4).map((quoteRef) => (
                                      <div
                                        key={`finance-tooltip-${quoteRef.id}`}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-[11px] font-bold text-slate-900">
                                            #{quoteRef.number} · {quoteRef.clientName}
                                          </p>
                                          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                            {quoteRef.dateLabel} · {quoteRef.statusLabel}
                                          </p>
                                        </div>
                                        <span className="shrink-0 text-[11px] font-bold text-slate-950">
                                          {formatDashboardMoney(quoteRef.amount)}
                                        </span>
                                      </div>
                                    ))}
                                    {activeFinancePoint.quoteRefs.length > 4 ? (
                                      <p className="px-1 text-[10px] font-semibold text-slate-400">
                                        +{activeFinancePoint.quoteRefs.length - 4} presupuestos mas en este periodo
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                    </section>
                  </>
                )}

                {activeTab === 'operativo' && (
                <div className="relative min-h-[calc(100dvh-57px)] overflow-hidden bg-slate-950">
                  <div className="absolute left-3 right-3 top-3 z-30 rounded-[20px] border border-white/80 bg-white/92 px-3 py-2 shadow-[0_22px_58px_-42px_rgba(15,23,42,0.75)] backdrop-blur-xl sm:left-5 sm:right-5 sm:top-5 sm:px-4 xl:left-6 xl:right-6">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="mr-auto min-w-[10rem]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Mapa operativo</p>
                      <p className="text-sm font-bold text-slate-900">{filteredNearbyRequests.length} solicitudes visibles</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setDashboardMapFilter('all')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          dashboardMapFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        Todo {dashboardRequestPoints.length + dashboardJobPoints.length}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardMapFilter('jobs')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          dashboardMapFilter === 'jobs'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        Trabajos {dashboardJobPoints.length}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardMapFilter('requests')}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          dashboardMapFilter === 'requests'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        Solicitudes {dashboardRequestPoints.length}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={fetchNearbyRequests}
                      disabled={loadingNearbyRequests || isProfileUnderReview}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isProfileUnderReview ? 'En revisión' : loadingNearbyRequests ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>
                  {isProfileUnderReview && (
                    <p className="mt-2 text-[11px] font-semibold text-[#7a4a15]">
                      Solicitudes por zona disponibles cuando UrbanFix apruebe el perfil.
                    </p>
                  )}
                  {nearbyRequestsWarning && <p className="mt-2 text-[11px] font-semibold text-amber-700">{nearbyRequestsWarning}</p>}
                  {nearbyRequestsError && <p className="mt-2 text-[11px] font-semibold text-rose-600">{nearbyRequestsError}</p>}
                  </div>

                  <div className="relative h-[calc(100dvh-57px)] min-h-[680px]">
                    <div className="absolute inset-0 overflow-hidden bg-slate-900">
                      {dashboardMapPoints.length > 0 || dashboardMapCenterPoint ? (
                        <TechnicianOperationalMap
                          points={dashboardMapPoints}
                          selectedPointId={dashboardMapSelectedId}
                          fallbackCenter={dashboardMapCenterPoint}
                          onSelectPoint={setDashboardMapSelectedId}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
                          No hay puntos geolocalizados todavia. Carga ubicaciones en tus trabajos o actualiza solicitudes.
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-4 left-3 right-3 z-40 max-h-[54dvh] overflow-y-auto rounded-[24px] border border-white/80 bg-white/92 p-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.78)] backdrop-blur-xl sm:left-5 sm:right-5 xl:bottom-5 xl:left-6 xl:right-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Solicitud</p>
                          <p className="text-sm font-bold text-slate-900">
                            {activeNearbyRequest ? `${activeNearbyRequestIndex + 1} de ${filteredNearbyRequests.length}` : 'Sin solicitudes'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Solicitud anterior"
                            onClick={() => showNearbyRequestAt(activeNearbyRequestIndex - 1)}
                            disabled={filteredNearbyRequests.length <= 1}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Solicitud siguiente"
                            onClick={() => showNearbyRequestAt(activeNearbyRequestIndex + 1)}
                            disabled={filteredNearbyRequests.length <= 1}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {activeNearbyRequest ? (
                        (() => {
                          const request = activeNearbyRequest;
                          const isSelected = dashboardSelectedMapPoint?.id === `request:${request.id}`;
                          const offerDraft = getRequestOfferDraft(request);
                          const isOfferEditorOpen = offerEditorRequestId === request.id;
                          const isSubmittingOffer = submittingOfferRequestId === request.id;
                          const offerStatus = String(request.my_quote_status || 'pending').toLowerCase();
                          const offerSuccess = offerSuccessByRequestId[request.id] || '';
                          const offerError = offerErrorByRequestId[request.id] || '';
                          const savedResponseType = normalizeRequestResponseType(request.my_response_type);
                          const isAppliedToRequest = offerStatus === 'submitted' && savedResponseType === 'application';
                          const offerStatusLabel = isAppliedToRequest ? 'Ya postulado' : requestQuoteStatusLabel(offerStatus);
                          const offerStatusBadgeClass = isAppliedToRequest
                            ? 'bg-emerald-100 text-emerald-700'
                            : requestQuoteStatusClass(offerStatus);
                          const hasDirectQuoteValues =
                            request.my_price_ars !== null &&
                            request.my_price_ars !== undefined &&
                            request.my_eta_hours !== null &&
                            request.my_eta_hours !== undefined;
                          const hasApplicationValues =
                            request.my_visit_eta_hours !== null &&
                            request.my_visit_eta_hours !== undefined &&
                            Boolean(String(request.my_response_message || '').trim());
                          const hasResponseValues = hasDirectQuoteValues || hasApplicationValues;
                          const responseSummary = hasApplicationValues
                            ? `Postulacion: ${Math.round(Number(request.my_visit_eta_hours || 0))} h · ${String(
                                request.my_response_message || ''
                              ).trim()}`
                            : hasDirectQuoteValues
                              ? `Cotizacion: ${formatCurrency(Number(request.my_price_ars || 0))} · ETA ${Math.round(
                                  Number(request.my_eta_hours || 0)
                                )} h`
                              : '';
                          const requestDescription = String(request.description || '').trim();
                          const preferredWindow = String(request.preferred_window || '').trim();
                          const requestPhotoCount = Array.isArray(request.photo_urls) ? request.photo_urls.length : 0;
                          const clientName = String(request.client_name || '').trim() || 'Cliente UrbanFix';
                          const clientAvatarUrl = String(request.client_avatar_url || '').trim();

                          return (
                            <div
                              className={`mt-3 grid gap-3 rounded-2xl border bg-white p-3 text-slate-700 transition xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] ${
                                isSelected ? 'border-[#ff8f1f] shadow-[0_0_0_3px_rgba(255,143,31,0.14)]' : 'border-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setDashboardMapFilter('requests');
                                  setDashboardMapSelectedId(`request:${request.id}`);
                                }}
                                className="w-full min-w-0 text-left"
                              >
                                <div className="mb-3 flex items-center gap-2.5">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-xs font-bold text-white ring-2 ring-white shadow-sm">
                                    {clientAvatarUrl ? (
                                      <img src={clientAvatarUrl} alt={`Foto de ${clientName}`} className="h-full w-full object-cover" />
                                    ) : (
                                      getClientInitials(clientName)
                                    )}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold text-slate-900">{clientName}</span>
                                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                      Cliente
                                    </span>
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="min-w-0 flex-1 text-base font-bold leading-5 text-slate-900">{request.title}</p>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyBadgeClass(request.urgency)}`}>
                                    {request.urgency}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  {request.category} · Zona: {requestPublicZoneLabel(request)}
                                </p>
                                {requestDescription && (
                                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600 xl:line-clamp-2">
                                    {requestDescription}
                                  </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                                  <span>Ubicacion protegida</span>
                                  <span>Fecha: {new Date(request.created_at).toLocaleDateString('es-AR')}</span>
                                  {preferredWindow && <span>Preferencia: {preferredWindow}</span>}
                                  {requestPhotoCount > 0 && <span>Fotos: {requestPhotoCount}</span>}
                                </div>
                              </button>

                              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                      Postulacion al trabajo
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${offerStatusBadgeClass}`}>
                                        {offerStatusLabel}
                                      </span>
                                      {hasResponseValues && (
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                          {requestResponseTypeLabel(savedResponseType)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRequestOfferEditor(request)}
                                    className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                                  >
                                    {isOfferEditorOpen ? 'Cancelar' : isAppliedToRequest ? 'Editar postulacion' : 'Postularme'}
                                  </button>
                                </div>

                                {responseSummary && (
                                  <p className="mt-2 rounded-lg bg-white px-2 py-1.5 text-[11px] font-semibold leading-5 text-slate-700">
                                    {responseSummary}
                                  </p>
                                )}
                                {request.my_quote_updated_at && hasResponseValues && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    Ultima respuesta: {new Date(request.my_quote_updated_at).toLocaleString('es-AR')}
                                  </p>
                                )}
                                {offerSuccess && <p className="mt-1 text-[11px] font-semibold text-emerald-600">{offerSuccess}</p>}
                                {offerError && <p className="mt-1 text-[11px] font-semibold text-rose-600">{offerError}</p>}

                                {isOfferEditorOpen && (
                                  <>
                                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold leading-5 text-slate-600">
                                      El cliente vera tu disponibilidad y este mensaje en su perfil.
                                    </p>
                                    <div className="mt-2 grid gap-2">
                                      <label className="text-[11px] font-semibold text-slate-600">
                                        Puedo coordinar en
                                        <input
                                          value={offerDraft.visitEtaHours}
                                          onChange={(event) =>
                                            handleRequestOfferDraftChange(request, 'visitEtaHours', event.target.value)
                                          }
                                          inputMode="numeric"
                                          placeholder="Horas"
                                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                                        />
                                      </label>
                                      <label className="text-[11px] font-semibold text-slate-600">
                                        Mensaje para el cliente
                                        <textarea
                                          value={offerDraft.message}
                                          onChange={(event) =>
                                            handleRequestOfferDraftChange(request, 'message', event.target.value)
                                          }
                                          rows={3}
                                          placeholder={DEFAULT_REQUEST_APPLICATION_MESSAGE}
                                          className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-400"
                                        />
                                      </label>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitRequestOffer(request)}
                                      disabled={isSubmittingOffer}
                                      className="mt-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {isSubmittingOffer ? 'Enviando...' : 'Postularme para este trabajo'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-xs text-slate-500">
                          No hay solicitudes para mostrar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}

              </div>
            )}

            {activeTab === 'nuevo' && (
              <section className="space-y-5">
                <div className="flex flex-col gap-4 px-1 sm:px-0 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                        <FilePlus className="h-3.5 w-3.5 text-[#ff8a18]" />
                        Presupuestador
                      </div>
                    <h2 className={`${spaceGrotesk.className} mt-3 text-3xl font-black leading-tight text-slate-950 sm:text-4xl`}>
                        Nuevo presupuesto
                      </h2>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm ring-1 ring-slate-200">
                          {completedQuoteSteps}/4 pasos
                        </span>
                      <span className={`rounded-full px-3 py-1 shadow-sm ring-1 ${
                        quoteClientReady
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-white text-slate-500 ring-slate-200'
                      }`}>
                          {quoteClientReady ? 'Ubicacion lista' : 'Falta ubicacion'}
                        </span>
                      <span className={`rounded-full px-3 py-1 shadow-sm ring-1 ${
                        quoteItemsReady
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-white text-slate-500 ring-slate-200'
                      }`}>
                          {validQuoteItems.length} items
                        </span>
                      </div>
                    </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('presupuestos')}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 lg:w-auto"
                      >
                        Volver a presupuestos
                      </button>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-3">
                    {showQuoteDraftPrompt && draftQuotes.length > 0 && !activeQuoteId && (
                      <div className="rounded-[26px] border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-100">
                              <FileText className="h-3.5 w-3.5" />
                              Borradores guardados
                            </div>
                            <h3 className={`${spaceGrotesk.className} mt-3 text-xl font-black text-slate-950`}>
                              Queres retomar uno?
                            </h3>
                            <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-slate-600">
                              Abrimos un presupuesto limpio. Si alguno de estos borradores corresponde, podes retomarlo.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowQuoteDraftPrompt(false)}
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-amber-300 hover:text-slate-950"
                          >
                            Seguir nuevo
                          </button>
                        </div>
                        <div className="mt-4 grid gap-2">
                          {draftQuotes.slice(0, 3).map((draft) => (
                            <button
                              key={draft.id}
                              type="button"
                              onClick={() => void loadQuote(draft, 'nuevo')}
                              className="flex w-full flex-col gap-2 rounded-[18px] border border-white bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-slate-950">
                                  {draft.client_name || 'Cliente sin nombre'}
                                </span>
                                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                  {getQuoteAddress(draft) || 'Sin direccion'} · {formatCurrency(toAmountValue(draft.total_amount))}
                                </span>
                              </span>
                              <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">
                                Retomar
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <details
                      open={openQuoteStep === 'client'}
                      className={`group overflow-hidden rounded-[26px] border bg-white shadow-sm transition ${
                        openQuoteStep === 'client' ? 'border-[#ff8a18]/35 shadow-[0_22px_54px_-42px_rgba(255,138,24,0.9)]' : 'border-slate-200'
                      }`}
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenQuoteStep('client');
                        }}
                        className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                            quoteClientReady ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-950 text-white'
                          }`}>
                            1
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Paso 1</p>
                            <h3 className="text-base font-black text-slate-950">Cliente y ubicacion</h3>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {clientName.trim() || clientAddress.trim()
                                ? `${clientName.trim() || 'Cliente'} - ${geoSelected?.display_name || clientAddress || 'direccion pendiente'}`
                                : 'Nombre, direccion y punto en mapa.'}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
                          quoteClientReady ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {geoSelected ? 'Confirmado' : clientAddress.trim() ? 'Revisar' : 'Pendiente'}
                        </span>
                      </summary>
                      <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Cliente</label>
                            <input
                              value={clientName}
                              onChange={(event) => setClientName(event.target.value)}
                              placeholder="Nombre y apellido"
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600">Dirección del trabajo</label>
                            <input
                              value={clientAddress}
                              onChange={(event) => handleQuoteAddressChange(event.target.value)}
                              onFocus={() => {
                                if (geoResults.length > 0 && !geoSelected) {
                                  setGeoError('');
                                }
                              }}
                              placeholder="Calle, número y localidad. Ej: Coronel Bogado 2556"
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                          </div>
                        </div>

                        {!geoSelected && clientAddress.trim().length >= 3 && (
                          <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_-30px_rgba(15,23,42,0.65)]">
                            <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Selecciona una direccion
                            </div>
                            {geoLoading && geoResults.length === 0 && (
                              <div className="px-4 py-3 text-sm font-semibold text-slate-500">
                                Buscando direcciones...
                              </div>
                            )}
                            {!geoLoading && geoResults.length === 0 && (
                              <div className="px-4 py-3 text-sm font-semibold text-slate-500">
                                No encontramos opciones. Agrega localidad o provincia.
                              </div>
                            )}
                            {geoResults.map((result) => (
                              <button
                                key={`${result.lat}-${result.lon}`}
                                type="button"
                                onClick={() => handleSelectGeo(result)}
                                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-emerald-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-slate-900">
                                    {result.primary_label || result.display_name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                                    {result.secondary_label || result.full_display_name || result.display_name}
                                  </span>
                                  {result.detail_label ? (
                                    <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                      {result.detail_label}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                  {result.accuracy_label || 'Usar'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleGeocodeSearch()}
                            disabled={geoLoading}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {geoLoading ? 'Buscando...' : 'Buscar otra vez'}
                          </button>
                          {geoSelected && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                              Punto confirmado
                            </span>
                          )}
                          {!geoSelected && geoLoading && (
                            <span className="text-[11px] font-semibold text-slate-500">Buscando opciones...</span>
                          )}
                        </div>
                        {geoError && <p className="mt-2 text-xs font-semibold text-rose-500">{geoError}</p>}
                        {geoSelected && geoMapUrl && (
                          <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
                            <iframe
                              title="Mapa de ubicacion"
                              src={geoMapUrl}
                              className="h-56 w-full border-0"
                              loading="lazy"
                            />
                            <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500">
                              <span className="truncate">Vista previa de la ubicación</span>
                              <a
                                href={buildOsmLink(geoSelected.lat, geoSelected.lon)}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 font-semibold text-slate-700 transition hover:text-slate-900"
                              >
                                Abrir mapa
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>

                    <details
                      open={openQuoteStep === 'items'}
                      className={`group overflow-hidden rounded-[26px] border bg-white shadow-sm transition ${
                        openQuoteStep === 'items' ? 'border-[#ff8a18]/35 shadow-[0_22px_54px_-42px_rgba(255,138,24,0.9)]' : 'border-slate-200'
                      }`}
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenQuoteStep('items');
                        }}
                        className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                            laborItems.length > 0 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-950 text-white'
                          }`}>
                            2
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Paso 2</p>
                            <h3 className="text-base font-black text-slate-950">Mano de obra</h3>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {laborItems.length > 0
                                ? `${laborItems.length} items - ${formatCurrency(laborSubtotal)}`
                                : 'Trabajo, medidas y cómputo.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                            laborItems.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {laborItems.length} items
                          </span>
                        </div>
                      </summary>
                      <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5">
                        <div className="flex flex-col gap-3">
                        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                          <div className="px-3 py-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-slate-950">Elegí cómo cargar</h4>
                              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                Calculá por medidas, buscá un precio o agregá una tarea simple.
                              </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:w-auto">
                              <button
                                type="button"
                                onClick={() => setQuoteLaborLoadMode('catalog')}
                                className={`rounded-2xl px-4 py-2 text-xs font-black transition ${
                                  quoteLaborLoadMode === 'catalog'
                                    ? 'bg-slate-950 text-white shadow-sm'
                                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white'
                                }`}
                              >
                                Catálogo
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuoteLaborLoadMode('calculator')}
                                className={`rounded-2xl px-4 py-2 text-xs font-black transition ${
                                  quoteLaborLoadMode === 'calculator'
                                    ? 'bg-slate-950 text-white shadow-sm'
                                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white'
                                }`}
                              >
                                Calculadora x m
                              </button>
                            </div>
                          </div>

                          {quoteLaborLoadMode === 'calculator' && (
                            <label className="mt-3 block max-w-md text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Tipo de cálculo
                              <select
                                value={quoteWorkEstimatorMode}
                                onChange={(event) =>
                                  handleQuoteWorkEstimatorModeChange(event.target.value as QuoteWorkEstimatorMode)
                                }
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm outline-none transition hover:bg-slate-800 focus:border-slate-400"
                              >
                                {QUOTE_ESTIMATOR_OPTIONS.map((option) => (
                                  <option key={option.key} value={option.key}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          </div>

                          {quoteLaborLoadMode === 'calculator' && quoteWorkEstimatorMode === 'revoques' && (
                            <div className="grid gap-4 border-t border-slate-100 p-3 lg:grid-cols-[minmax(0,1.45fr)_280px]">
                              <div className="rounded-[22px] border border-white bg-white p-4 shadow-sm">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Tipo de revoque
                                    </label>
                                    <select
                                      value={revoqueForm.workType}
                                      onChange={(event) => {
                                        const workType = event.target.value as RevoqueWorkTypeKey;
                                        const suggested = formatSuggestedPriceInput(
                                          getMasterItemSuggestedPrice(
                                            resolveTemplateLaborMasterItem(
                                              laborMasterItems,
                                              REVOQUE_LABOR_LOOKUPS[workType]
                                            )
                                          )
                                        );
                                        const shouldReplaceLaborPrice = shouldReplaceSuggestedPriceInput(
                                          revoqueForm.laborPrice,
                                          revoqueSuggestedLaborInput,
                                          revoqueLaborMasterItem
                                        );
                                        updateRevoqueForm({
                                          workType,
                                          laborPrice: shouldReplaceLaborPrice
                                            ? suggested
                                            : revoqueForm.laborPrice,
                                          cementBagPrice: revoqueSuggestedMaterialInputs.cementBagPrice || revoqueForm.cementBagPrice,
                                          limeBagPrice: revoqueSuggestedMaterialInputs.limeBagPrice || revoqueForm.limeBagPrice,
                                          sandM3Price: revoqueSuggestedMaterialInputs.sandM3Price || revoqueForm.sandM3Price,
                                          waterproofLiterPrice:
                                            revoqueSuggestedMaterialInputs.waterproofLiterPrice ||
                                            revoqueForm.waterproofLiterPrice,
                                        });
                                      }}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                                    >
                                      {REVOQUE_WORK_TYPES.map((option) => (
                                        <option key={option.key} value={option.key}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Superficie directa (m2)
                                    </label>
                                    <input
                                      value={revoqueForm.surfaceM2}
                                      inputMode="decimal"
                                      onChange={(event) => updateRevoqueForm({ surfaceM2: event.target.value })}
                                      placeholder="Ej: 42"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Descuento aberturas (m2)
                                    </label>
                                    <input
                                      value={revoqueForm.openingsM2}
                                      inputMode="decimal"
                                      onChange={(event) => updateRevoqueForm({ openingsM2: event.target.value })}
                                      placeholder="Puertas / ventanas"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Metros lineales
                                    </label>
                                    <input
                                      value={revoqueForm.linearMeters}
                                      inputMode="decimal"
                                      onChange={(event) => updateRevoqueForm({ linearMeters: event.target.value })}
                                      placeholder="Si no cargas m2"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Alto promedio
                                    </label>
                                    <input
                                      value={revoqueForm.heightMeters}
                                      inputMode="decimal"
                                      onChange={(event) => updateRevoqueForm({ heightMeters: event.target.value })}
                                      placeholder="Ej: 2,60"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Mano de obra / m2
                                    </label>
                                    <input
                                      value={revoqueForm.laborPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updateRevoqueForm({ laborPrice: event.target.value })}
                                      placeholder={loadingMasterItems ? 'Buscando en base...' : '$ por m2'}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                      {revoqueLaborMasterItem
                                        ? `Base de precios: ${revoqueLaborMasterItem.name}`
                                        : loadingMasterItems
                                          ? 'Buscando valor sugerido...'
                                          : 'Sin precio sugerido para este tipo.'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Materiales / m2 manual
                                    </label>
                                    <input
                                      value={revoqueForm.materialPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updateRevoqueForm({ materialPrice: event.target.value })}
                                      placeholder="Si no usas calculo"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                </div>
                                <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                        Materiales automaticos
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Se calculan por {revoqueNetSurface} m2 y unidad de compra.
                                      </p>
                                    </div>
                                    <label className="block w-24 text-[11px] font-semibold text-slate-500">
                                      Desp. %
                                      <input
                                        value={revoqueForm.materialWastePercent}
                                        inputMode="decimal"
                                        onChange={(event) =>
                                          updateRevoqueForm({ materialWastePercent: event.target.value })
                                        }
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {([
                                      { field: 'cementBagPrice', label: 'Cemento', placeholder: '$ bolsa' },
                                      { field: 'limeBagPrice', label: 'Cal', placeholder: '$ bolsa' },
                                      { field: 'sandM3Price', label: 'Arena', placeholder: '$ m3' },
                                      { field: 'waterproofLiterPrice', label: 'Hidrofugo', placeholder: '$ litro' },
                                    ] as Array<{
                                      field: RevoqueMaterialPriceField;
                                      label: string;
                                      placeholder: string;
                                    }>).map((material) => {
                                      const estimateLine = revoqueMaterialLines.find(
                                        (line) => line.priceField === material.field
                                      );
                                      const quantityLabel =
                                        estimateLine && estimateLine.quantity > 0
                                          ? `${formatMeasureValue(estimateLine.quantity)} ${estimateLine.unit}`
                                          : 'Sin cantidad';
                                      const unitPrice = toNumber(revoqueForm[material.field]);
                                      return (
                                        <label
                                          key={material.field}
                                          className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 sm:grid-cols-[minmax(0,1fr)_118px] sm:items-center"
                                        >
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm font-black text-slate-950">
                                              {material.label}
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                              {quantityLabel}
                                              {unitPrice > 0 ? ` · ${formatCurrency(unitPrice)}` : ' · pendiente'}
                                            </span>
                                          </span>
                                          <input
                                            value={revoqueForm[material.field]}
                                            inputMode="decimal"
                                            onChange={(event) =>
                                              updateRevoqueForm({ [material.field]: event.target.value } as Partial<RevoqueEstimatorForm>)
                                            }
                                            placeholder={revoqueSuggestedMaterialInputs[material.field] || material.placeholder}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-700 outline-none focus:border-slate-400"
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  Revoques
                                </p>
                                <h5 className="mt-1 text-base font-black text-slate-950">
                                  {selectedRevoqueType.shortLabel}
                                </h5>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                  {selectedRevoqueType.detail}
                                </p>
                                <div className={`mt-4 rounded-2xl border px-3 py-3 ${getEstimatorCatalogCheckClass(revoqueCatalogCheck.status)}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                                        Base de precios
                                      </p>
                                      <p className="mt-1 text-sm font-black">{revoqueCatalogCheck.label}</p>
                                      <p className="mt-1 text-[11px] font-semibold opacity-75">{revoqueCatalogCheck.detail}</p>
                                      {revoqueCatalogCheck.sourceLabel && (
                                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                                          {revoqueCatalogCheck.sourceLabel}
                                          {revoqueCatalogCheck.updatedAtLabel ? ` · ${revoqueCatalogCheck.updatedAtLabel}` : ''}
                                        </p>
                                      )}
                                    </div>
                                    {revoqueCatalogCheck.status === 'manual' && (
                                      <button
                                        type="button"
                                        onClick={handleRefreshRevoqueCatalogPrices}
                                        className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black text-slate-900 ring-1 ring-black/5 transition hover:bg-white"
                                      >
                                        Actualizar
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Superficie neta</span>
                                    <span className="font-black text-slate-950">{revoqueNetSurface} m2</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Mano de obra</span>
                                    <span className="font-black text-slate-950">{formatCurrency(revoqueLaborTotal)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Materiales</span>
                                    <span className="font-black text-slate-950">{formatCurrency(revoqueMaterialTotal)}</span>
                                  </div>
                                </div>
                                {revoqueUsesAutoMaterials && (
                                  <div className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-3">
                                    {revoqueMaterialLines
                                      .filter((material) => material.quantity > 0)
                                      .map((material) => (
                                        <div
                                          key={`revoque-material-${material.key}`}
                                          className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500"
                                        >
                                          <span className="truncate">
                                            {material.label} - {formatMeasureValue(material.quantity)} {material.unit}
                                          </span>
                                          <span className="shrink-0 font-black text-slate-900">
                                            {material.unitPrice > 0 ? formatCurrency(material.total) : 'Precio pendiente'}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                                <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-white">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                                    Total estimado
                                  </p>
                                  <p className={`${spaceGrotesk.className} mt-1 text-2xl font-black`}>
                                    {formatCurrency(revoqueEstimatedTotal)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleApplyRevoqueTemplate}
                                  disabled={!revoqueReady}
                                  className="mt-3 w-full rounded-2xl bg-[#ff8a18] px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-[#ff9d3d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  Agregar al detalle
                                </button>
                              </div>
                            </div>
                          )}

                          {quoteLaborLoadMode === 'calculator' && quoteWorkEstimatorMode === 'mamposteria' && (
                            <div className="grid gap-4 border-t border-slate-100 p-3 lg:grid-cols-[minmax(0,1.45fr)_280px]">
                              <div className="rounded-[22px] border border-white bg-white p-4 shadow-sm">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Tipo de mamposteria
                                    </label>
                                    <select
                                      value={mamposteriaForm.workType}
                                      onChange={(event) => {
                                        const workType = event.target.value as MamposteriaWorkTypeKey;
                                        const suggested = formatSuggestedPriceInput(
                                          getMasterItemSuggestedPrice(
                                            resolveTemplateLaborMasterItem(
                                              laborMasterItems,
                                              MAMPOSTERIA_LABOR_LOOKUPS[workType]
                                            )
                                          )
                                        );
                                        const suggestedBrick = formatSuggestedPriceInput(
                                          getMasterItemSuggestedPrice(
                                            resolveTemplateMaterialMasterItem(
                                              materialMasterItems,
                                              MAMPOSTERIA_BRICK_PRICE_LOOKUPS[workType]
                                            )
                                          )
                                        );
                                        const shouldReplaceBrickPrice =
                                          shouldReplaceSuggestedPriceInput(
                                            mamposteriaForm.brickUnitPrice,
                                            mamposteriaSuggestedMaterialInputs.brickUnitPrice,
                                            mamposteriaMaterialMasterItems.brickUnitPrice
                                          );
                                        const shouldReplaceLaborPrice = shouldReplaceSuggestedPriceInput(
                                          mamposteriaForm.laborPrice,
                                          mamposteriaSuggestedLaborInput,
                                          mamposteriaLaborMasterItem
                                        );
                                        updateMamposteriaForm({
                                          workType,
                                          laborPrice: shouldReplaceLaborPrice
                                            ? suggested
                                            : mamposteriaForm.laborPrice,
                                          brickUnitPrice: shouldReplaceBrickPrice
                                            ? suggestedBrick || mamposteriaForm.brickUnitPrice
                                            : mamposteriaForm.brickUnitPrice,
                                          cementBagPrice:
                                            mamposteriaSuggestedMaterialInputs.cementBagPrice ||
                                            mamposteriaForm.cementBagPrice,
                                          limeBagPrice:
                                            mamposteriaSuggestedMaterialInputs.limeBagPrice ||
                                            mamposteriaForm.limeBagPrice,
                                          sandM3Price:
                                            mamposteriaSuggestedMaterialInputs.sandM3Price ||
                                            mamposteriaForm.sandM3Price,
                                        });
                                      }}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                                    >
                                      {MAMPOSTERIA_WORK_TYPES.map((option) => (
                                        <option key={option.key} value={option.key}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Superficie de muro (m2)
                                    </label>
                                    <input
                                      value={mamposteriaForm.surfaceM2}
                                      inputMode="decimal"
                                      onChange={(event) => updateMamposteriaForm({ surfaceM2: event.target.value })}
                                      placeholder="Ej: 35"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Descuento aberturas (m2)
                                    </label>
                                    <input
                                      value={mamposteriaForm.openingsM2}
                                      inputMode="decimal"
                                      onChange={(event) => updateMamposteriaForm({ openingsM2: event.target.value })}
                                      placeholder="Puertas / ventanas"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Metros lineales
                                    </label>
                                    <input
                                      value={mamposteriaForm.linearMeters}
                                      inputMode="decimal"
                                      onChange={(event) => updateMamposteriaForm({ linearMeters: event.target.value })}
                                      placeholder="Si no cargas m2"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Alto del muro
                                    </label>
                                    <input
                                      value={mamposteriaForm.heightMeters}
                                      inputMode="decimal"
                                      onChange={(event) => updateMamposteriaForm({ heightMeters: event.target.value })}
                                      placeholder="Ej: 2,60"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Mano de obra / m2
                                    </label>
                                    <input
                                      value={mamposteriaForm.laborPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updateMamposteriaForm({ laborPrice: event.target.value })}
                                      placeholder={loadingMasterItems ? 'Buscando en base...' : '$ por m2'}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                      {mamposteriaLaborMasterItem
                                        ? `Base de precios: ${mamposteriaLaborMasterItem.name}`
                                        : loadingMasterItems
                                          ? 'Buscando valor sugerido...'
                                          : 'Sin precio sugerido para este tipo.'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Materiales / m2 manual
                                    </label>
                                    <input
                                      value={mamposteriaForm.materialPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updateMamposteriaForm({ materialPrice: event.target.value })}
                                      placeholder="Si no usas calculo"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </div>
                                </div>
                                <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                        Materiales automaticos
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Se calculan por {mamposteriaNetSurface} m2 y unidad de compra.
                                      </p>
                                    </div>
                                    <label className="block w-24 text-[11px] font-semibold text-slate-500">
                                      Desp. %
                                      <input
                                        value={mamposteriaForm.materialWastePercent}
                                        inputMode="decimal"
                                        onChange={(event) =>
                                          updateMamposteriaForm({ materialWastePercent: event.target.value })
                                        }
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {([
                                      { field: 'brickUnitPrice', label: 'Ladrillo / bloque', placeholder: '$ unidad' },
                                      { field: 'cementBagPrice', label: 'Cemento', placeholder: '$ bolsa' },
                                      { field: 'limeBagPrice', label: 'Cal', placeholder: '$ bolsa' },
                                      { field: 'sandM3Price', label: 'Arena', placeholder: '$ m3' },
                                    ] as Array<{
                                      field: MamposteriaMaterialPriceField;
                                      label: string;
                                      placeholder: string;
                                    }>).map((material) => {
                                      const estimateLine = mamposteriaMaterialLines.find(
                                        (line) => line.priceField === material.field
                                      );
                                      const quantityLabel =
                                        estimateLine && estimateLine.quantity > 0
                                          ? `${formatMeasureValue(estimateLine.quantity)} ${estimateLine.unit}`
                                          : 'Sin cantidad';
                                      const unitPrice = toNumber(mamposteriaForm[material.field]);
                                      return (
                                        <label
                                          key={material.field}
                                          className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 sm:grid-cols-[minmax(0,1fr)_118px] sm:items-center"
                                        >
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm font-black text-slate-950">
                                              {material.label}
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                              {quantityLabel}
                                              {unitPrice > 0 ? ` · ${formatCurrency(unitPrice)}` : ' · pendiente'}
                                            </span>
                                          </span>
                                          <input
                                            value={mamposteriaForm[material.field]}
                                            inputMode="decimal"
                                            onChange={(event) =>
                                              updateMamposteriaForm({
                                                [material.field]: event.target.value,
                                              } as Partial<MamposteriaEstimatorForm>)
                                            }
                                            placeholder={
                                              mamposteriaSuggestedMaterialInputs[material.field] || material.placeholder
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm text-slate-700 outline-none focus:border-slate-400"
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  Mamposteria
                                </p>
                                <h5 className="mt-1 text-base font-black text-slate-950">
                                  {selectedMamposteriaType.shortLabel}
                                </h5>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                  {selectedMamposteriaType.detail}
                                </p>
                                <div className={`mt-4 rounded-2xl border px-3 py-3 ${getEstimatorCatalogCheckClass(mamposteriaCatalogCheck.status)}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                                        Base de precios
                                      </p>
                                      <p className="mt-1 text-sm font-black">{mamposteriaCatalogCheck.label}</p>
                                      <p className="mt-1 text-[11px] font-semibold opacity-75">{mamposteriaCatalogCheck.detail}</p>
                                      {mamposteriaCatalogCheck.sourceLabel && (
                                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                                          {mamposteriaCatalogCheck.sourceLabel}
                                          {mamposteriaCatalogCheck.updatedAtLabel
                                            ? ` · ${mamposteriaCatalogCheck.updatedAtLabel}`
                                            : ''}
                                        </p>
                                      )}
                                    </div>
                                    {mamposteriaCatalogCheck.status === 'manual' && (
                                      <button
                                        type="button"
                                        onClick={handleRefreshMamposteriaCatalogPrices}
                                        className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black text-slate-900 ring-1 ring-black/5 transition hover:bg-white"
                                      >
                                        Actualizar
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Superficie neta</span>
                                    <span className="font-black text-slate-950">{mamposteriaNetSurface} m2</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Mano de obra</span>
                                    <span className="font-black text-slate-950">
                                      {formatCurrency(mamposteriaLaborTotal)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Materiales</span>
                                    <span className="font-black text-slate-950">
                                      {formatCurrency(mamposteriaMaterialTotal)}
                                    </span>
                                  </div>
                                </div>
                                {mamposteriaUsesAutoMaterials && (
                                  <div className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-3">
                                    {mamposteriaMaterialLines
                                      .filter((material) => material.quantity > 0)
                                      .map((material) => (
                                        <div
                                          key={`mamposteria-material-${material.key}`}
                                          className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500"
                                        >
                                          <span className="truncate">
                                            {material.label} - {formatMeasureValue(material.quantity)} {material.unit}
                                          </span>
                                          <span className="shrink-0 font-black text-slate-900">
                                            {material.unitPrice > 0 ? formatCurrency(material.total) : 'Precio pendiente'}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                                <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-white">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                                    Total estimado
                                  </p>
                                  <p className={`${spaceGrotesk.className} mt-1 text-2xl font-black`}>
                                    {formatCurrency(mamposteriaEstimatedTotal)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleApplyMamposteriaTemplate}
                                  disabled={!mamposteriaReady}
                                  className="mt-3 w-full rounded-2xl bg-[#ff8a18] px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-[#ff9d3d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  Agregar al detalle
                                </button>
                              </div>
                            </div>
                          )}

                          {quoteLaborLoadMode === 'calculator' && quoteWorkEstimatorMode === 'pisos' && (
                            <div className="grid gap-4 border-t border-slate-100 p-3 lg:grid-cols-[minmax(0,1.45fr)_280px]">
                              <div className="rounded-[22px] border border-white bg-white p-4 shadow-sm">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-500">
                                      Tipo de piso
                                    </label>
                                    <select
                                      value={pisoForm.workType}
                                      onChange={(event) => {
                                        const workType = event.target.value as PisoWorkTypeKey;
                                        const suggested = formatSuggestedPriceInput(
                                          getMasterItemSuggestedPrice(
                                            resolveTemplateLaborMasterItem(laborMasterItems, PISO_LABOR_LOOKUPS[workType])
                                          )
                                        );
                                        updatePisoForm({
                                          workType,
                                          laborPrice: shouldReplaceSuggestedPriceInput(
                                            pisoForm.laborPrice,
                                            pisoSuggestedLaborInput,
                                            pisoLaborMasterItem
                                          )
                                            ? suggested
                                            : pisoForm.laborPrice,
                                          tileM2Price: pisoSuggestedMaterialInputs.tileM2Price || pisoForm.tileM2Price,
                                          adhesiveBagPrice:
                                            pisoSuggestedMaterialInputs.adhesiveBagPrice || pisoForm.adhesiveBagPrice,
                                          groutKgPrice: pisoSuggestedMaterialInputs.groutKgPrice || pisoForm.groutKgPrice,
                                        });
                                      }}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                                    >
                                      {PISO_WORK_TYPES.map((option) => (
                                        <option key={option.key} value={option.key}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Superficie (m2)
                                    <input
                                      value={pisoForm.surfaceM2}
                                      inputMode="decimal"
                                      onChange={(event) => updatePisoForm({ surfaceM2: event.target.value })}
                                      placeholder="Ej: 24"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Mano de obra / m2
                                    <input
                                      value={pisoForm.laborPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updatePisoForm({ laborPrice: event.target.value })}
                                      placeholder={pisoSuggestedLaborInput || '$ por m2'}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Materiales / m2 manual
                                    <input
                                      value={pisoForm.materialPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updatePisoForm({ materialPrice: event.target.value })}
                                      placeholder="Si no usas calculo"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Desperdicio %
                                    <input
                                      value={pisoForm.materialWastePercent}
                                      inputMode="decimal"
                                      onChange={(event) => updatePisoForm({ materialWastePercent: event.target.value })}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                </div>
                                <div className="mt-4 grid gap-2 md:grid-cols-3">
                                  {([
                                    { field: 'tileM2Price', label: 'Piso / revestimiento', placeholder: '$ m2' },
                                    { field: 'adhesiveBagPrice', label: 'Pegamento', placeholder: '$ bolsa' },
                                    { field: 'groutKgPrice', label: 'Pastina', placeholder: '$ kg' },
                                  ] as Array<{ field: PisoMaterialPriceField; label: string; placeholder: string }>).map(
                                    (material) => (
                                      <label key={material.field} className="block text-[11px] font-semibold text-slate-500">
                                        {material.label}
                                        <input
                                          value={pisoForm[material.field]}
                                          inputMode="decimal"
                                          onChange={(event) =>
                                            updatePisoForm({ [material.field]: event.target.value } as Partial<PisoEstimatorForm>)
                                          }
                                          placeholder={pisoSuggestedMaterialInputs[material.field] || material.placeholder}
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                        />
                                      </label>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pisos</p>
                                <h5 className="mt-1 text-base font-black text-slate-950">{selectedPisoType.shortLabel}</h5>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{selectedPisoType.detail}</p>
                                <div className={`mt-4 rounded-2xl border px-3 py-3 ${getEstimatorCatalogCheckClass(pisoCatalogCheck.status)}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">Base de precios</p>
                                      <p className="mt-1 text-sm font-black">{pisoCatalogCheck.label}</p>
                                      <p className="mt-1 text-[11px] font-semibold opacity-75">{pisoCatalogCheck.detail}</p>
                                    </div>
                                    {pisoCatalogCheck.status === 'manual' && (
                                      <button
                                        type="button"
                                        onClick={handleRefreshPisoCatalogPrices}
                                        className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black text-slate-900 ring-1 ring-black/5 transition hover:bg-white"
                                      >
                                        Actualizar
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Superficie</span>
                                    <span className="font-black text-slate-950">{pisoSurface} m2</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Mano de obra</span>
                                    <span className="font-black text-slate-950">{formatCurrency(pisoLaborTotal)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Materiales</span>
                                    <span className="font-black text-slate-950">{formatCurrency(pisoMaterialTotal)}</span>
                                  </div>
                                </div>
                                {pisoUsesAutoMaterials && (
                                  <div className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-3">
                                    {pisoMaterialLines.map((material) => (
                                      <div key={`piso-material-${material.key}`} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                                        <span className="truncate">{material.label} - {formatMeasureValue(material.quantity)} {material.unit}</span>
                                        <span className="shrink-0 font-black text-slate-900">
                                          {material.unitPrice > 0 ? formatCurrency(material.total) : 'Precio pendiente'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-white">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Total estimado</p>
                                  <p className={`${spaceGrotesk.className} mt-1 text-2xl font-black`}>{formatCurrency(pisoEstimatedTotal)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleApplyPisoTemplate}
                                  disabled={!pisoReady}
                                  className="mt-3 w-full rounded-2xl bg-[#ff8a18] px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-[#ff9d3d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  Agregar al detalle
                                </button>
                              </div>
                            </div>
                          )}

                          {quoteLaborLoadMode === 'calculator' && quoteWorkEstimatorMode === 'pintura' && (
                            <div className="grid gap-4 border-t border-slate-100 p-3 lg:grid-cols-[minmax(0,1.45fr)_280px]">
                              <div className="rounded-[22px] border border-white bg-white p-4 shadow-sm">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-500">Tipo de pintura</label>
                                    <select
                                      value={pinturaForm.workType}
                                      onChange={(event) => {
                                        const workType = event.target.value as PinturaWorkTypeKey;
                                        const suggested = formatSuggestedPriceInput(
                                          getMasterItemSuggestedPrice(
                                            resolveTemplateLaborMasterItem(laborMasterItems, PINTURA_LABOR_LOOKUPS[workType])
                                          )
                                        );
                                        updatePinturaForm({
                                          workType,
                                          laborPrice: shouldReplaceSuggestedPriceInput(
                                            pinturaForm.laborPrice,
                                            pinturaSuggestedLaborInput,
                                            pinturaLaborMasterItem
                                          )
                                            ? suggested
                                            : pinturaForm.laborPrice,
                                          paintLiterPrice:
                                            pinturaSuggestedMaterialInputs.paintLiterPrice || pinturaForm.paintLiterPrice,
                                          primerLiterPrice:
                                            pinturaSuggestedMaterialInputs.primerLiterPrice || pinturaForm.primerLiterPrice,
                                          puttyKgPrice:
                                            pinturaSuggestedMaterialInputs.puttyKgPrice || pinturaForm.puttyKgPrice,
                                        });
                                      }}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                                    >
                                      {PINTURA_WORK_TYPES.map((option) => (
                                        <option key={option.key} value={option.key}>{option.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Superficie (m2)
                                    <input
                                      value={pinturaForm.surfaceM2}
                                      inputMode="decimal"
                                      onChange={(event) => updatePinturaForm({ surfaceM2: event.target.value })}
                                      placeholder="Ej: 60"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Cantidad de manos
                                    <input
                                      value={pinturaForm.coats}
                                      inputMode="decimal"
                                      onChange={(event) => updatePinturaForm({ coats: event.target.value })}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Mano de obra / m2
                                    <input
                                      value={pinturaForm.laborPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updatePinturaForm({ laborPrice: event.target.value })}
                                      placeholder={pinturaSuggestedLaborInput || '$ por m2'}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Materiales / m2 manual
                                    <input
                                      value={pinturaForm.materialPrice}
                                      inputMode="decimal"
                                      onChange={(event) => updatePinturaForm({ materialPrice: event.target.value })}
                                      placeholder="Si no usas calculo"
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Desperdicio %
                                    <input
                                      value={pinturaForm.materialWastePercent}
                                      inputMode="decimal"
                                      onChange={(event) => updatePinturaForm({ materialWastePercent: event.target.value })}
                                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                    />
                                  </label>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={pinturaForm.includePrimer}
                                      onChange={(event) => updatePinturaForm({ includePrimer: event.target.checked })}
                                    />
                                    Fijador
                                  </label>
                                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={pinturaForm.includePutty}
                                      onChange={(event) => updatePinturaForm({ includePutty: event.target.checked })}
                                    />
                                    Enduido
                                  </label>
                                </div>
                                <div className="mt-4 grid gap-2 md:grid-cols-3">
                                  {([
                                    { field: 'paintLiterPrice', label: 'Pintura', placeholder: '$ litro' },
                                    { field: 'primerLiterPrice', label: 'Fijador', placeholder: '$ litro' },
                                    { field: 'puttyKgPrice', label: 'Enduido', placeholder: '$ kg' },
                                  ] as Array<{ field: PinturaMaterialPriceField; label: string; placeholder: string }>).map(
                                    (material) => (
                                      <label key={material.field} className="block text-[11px] font-semibold text-slate-500">
                                        {material.label}
                                        <input
                                          value={pinturaForm[material.field]}
                                          inputMode="decimal"
                                          onChange={(event) =>
                                            updatePinturaForm({ [material.field]: event.target.value } as Partial<PinturaEstimatorForm>)
                                          }
                                          placeholder={pinturaSuggestedMaterialInputs[material.field] || material.placeholder}
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                        />
                                      </label>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pintura</p>
                                <h5 className="mt-1 text-base font-black text-slate-950">{selectedPinturaType.shortLabel}</h5>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{selectedPinturaType.detail}</p>
                                <div className={`mt-4 rounded-2xl border px-3 py-3 ${getEstimatorCatalogCheckClass(pinturaCatalogCheck.status)}`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">Base de precios</p>
                                      <p className="mt-1 text-sm font-black">{pinturaCatalogCheck.label}</p>
                                      <p className="mt-1 text-[11px] font-semibold opacity-75">{pinturaCatalogCheck.detail}</p>
                                    </div>
                                    {pinturaCatalogCheck.status === 'manual' && (
                                      <button
                                        type="button"
                                        onClick={handleRefreshPinturaCatalogPrices}
                                        className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-black text-slate-900 ring-1 ring-black/5 transition hover:bg-white"
                                      >
                                        Actualizar
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Superficie</span>
                                    <span className="font-black text-slate-950">{pinturaSurface} m2</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Mano de obra</span>
                                    <span className="font-black text-slate-950">{formatCurrency(pinturaLaborTotal)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span>Materiales</span>
                                    <span className="font-black text-slate-950">{formatCurrency(pinturaMaterialTotal)}</span>
                                  </div>
                                </div>
                                {pinturaUsesAutoMaterials && (
                                  <div className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-3">
                                    {pinturaMaterialLines.map((material) => (
                                      <div key={`pintura-material-${material.key}`} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                                        <span className="truncate">{material.label} - {formatMeasureValue(material.quantity)} {material.unit}</span>
                                        <span className="shrink-0 font-black text-slate-900">
                                          {material.unitPrice > 0 ? formatCurrency(material.total) : 'Precio pendiente'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-white">
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Total estimado</p>
                                  <p className={`${spaceGrotesk.className} mt-1 text-2xl font-black`}>{formatCurrency(pinturaEstimatedTotal)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleApplyPinturaTemplate}
                                  disabled={!pinturaReady}
                                  className="mt-3 w-full rounded-2xl bg-[#ff8a18] px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-[#ff9d3d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  Agregar al detalle
                                </button>
                              </div>
                            </div>
                          )}

                        {quoteLaborLoadMode === 'catalog' && (
                        <div className="border-t border-slate-100">
                          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-slate-950">Valores de MO</h4>
                              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                                {laborMasterItems.length} valores activos.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                                {laborMasterItems.length} valores
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
                            <label className="relative block">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                value={quoteCatalogSearch}
                                onChange={(event) => setQuoteCatalogSearch(event.target.value)}
                                placeholder="Buscar tarea o rubro"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                              />
                            </label>
                            <select
                              value={quoteCatalogCategory}
                              onChange={(event) => setQuoteCatalogCategory(event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                            >
                              <option value="all">Todos los rubros</option>
                              {quoteLaborCatalogCategories.map((category) => (
                                <option key={category} value={category}>
                                  {formatRubroLabel(category)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="max-h-80 overflow-y-auto border-t border-slate-100">
                            {loadingMasterItems && (
                              <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Actualizando valores...
                              </div>
                            )}
                            {!loadingMasterItems && filteredQuoteLaborCatalogItems.length === 0 && (
                              <div className="px-4 py-4 text-sm font-semibold text-slate-500">
                                No hay valores de MO para esa medicion.
                              </div>
                            )}
                            {!loadingMasterItems &&
                              filteredQuoteLaborCatalogItems.map((item) => {
                                const rubro = resolveMasterRubro(item);
                                const basePrice = getMasterItemBasePrice(item);
                                const activePrice = getMasterItemSuggestedPrice(item);
                                const hasLaborUpdate =
                                  item.type === 'labor' && basePrice > 0 && activePrice > 0 && !pricesAreEquivalent(basePrice, activePrice);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => addMasterItemToQuote(item)}
                                    className="grid w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_120px_130px]"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-black text-slate-950">
                                        {item.name}
                                      </span>
                                      <span className="mt-1 block truncate text-[11px] font-semibold text-slate-500">
                                        {formatRubroLabel(rubro)}
                                        {item.unit ? ` - ${item.unit}` : ''}
                                        {item.source_ref ? ` - ${formatCatalogSourceLabel(item.source_ref)}` : ''}
                                      </span>
                                    </span>
                                    <span className="self-center rounded-full bg-slate-100 px-3 py-1 text-center text-[11px] font-black text-slate-600">
                                      {item.unit || 'unidad'}
                                    </span>
                                    <span className="self-center rounded-2xl bg-slate-950 px-3 py-1.5 text-center text-[11px] font-black text-white">
                                      <span className="block">{formatCurrency(activePrice)}</span>
                                      {hasLaborUpdate && (
                                        <span className="mt-0.5 block text-[9px] font-semibold text-white/55">
                                          base {formatCurrency(basePrice)}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                        )}

                        </div>

                        <div ref={quoteItemsEditorRef} className="hidden">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900">Mano de obra cargada</p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {laborItems.length > 0
                                ? `${laborItems.length} tareas - ${formatCurrency(laborSubtotal)}`
                                : 'Agrega la primera tarea.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddItem('labor')}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-slate-800"
                            >
                              <FilePlus className="h-3.5 w-3.5" />
                              Agregar
                            </button>
                          </div>
                        </div>
                        </div>
                        {laborItems.length > 0 && (
                        <div className="space-y-3">
                          {([
                            {
                              key: 'labor',
                              items: laborItems,
                              subtotal: laborSubtotal,
                              empty: 'Agrega una tarea o elige un precio del catalogo.',
                            },
                          ] as const).map((group) => (
                            <section
                              key={group.key}
                              className="space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Detalle</p>
                                  <h4 className="text-sm font-black text-slate-950">
                                    {group.items.length > 0 ? 'Tareas' : 'Sin tareas cargadas'}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                                    {group.items.length} item{group.items.length === 1 ? '' : 's'}
                                  </span>
                                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                                    {formatCurrency(group.subtotal)}
                                  </span>
                                </div>
                              </div>
                              {group.items.length === 0 ? (
                                <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
                                  {group.empty}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {group.items.map((item, groupItemIndex) => {
                            const itemTotal = item.quantity * item.unitPrice;
                            const itemHasPendingPrice = item.type === 'material' && item.unitPrice <= 0;
                            const isEditingItem = editingQuoteItemId === item.id;
                            const itemSummary = [
                              item.workArea?.trim(),
                              `${formatMeasureValue(item.quantity)}${item.unit ? ` ${item.unit}` : ''}`,
                              itemHasPendingPrice ? 'Precio pendiente' : formatCurrency(item.unitPrice),
                            ]
                              .filter(Boolean)
                              .join(' - ');
                            const itemImages = item.itemImages || [];
                            const isUploadingItemImages = uploadingItemImageId === item.id;
                            const itemCanReceiveImages = itemImages.length < QUOTE_ITEM_MAX_IMAGES;
                            const reusableQuoteImages = quoteImageAttachments.filter(
                              (file) =>
                                !itemImages.some(
                                  (image) => image.sourceAttachmentId === file.id || image.url === file.file_url
                                )
                            );
                            return (
                            <div key={item.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white">
                                    {groupItemIndex + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                      {item.type === 'material' ? 'Material' : 'Mano de obra'}
                                    </p>
                                    <p className="truncate text-sm font-black text-slate-950">
                                      {item.description.trim() || 'Item sin descripcion'}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                                      {itemSummary}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                                      itemHasPendingPrice
                                        ? 'bg-amber-50 text-amber-700 ring-amber-100'
                                        : 'bg-white text-slate-900 ring-slate-200'
                                    }`}
                                  >
                                    {itemHasPendingPrice ? 'Precio pendiente' : formatCurrency(itemTotal)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuoteItemId(isEditingItem ? '' : item.id)}
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 transition ${
                                      isEditingItem
                                        ? 'bg-slate-950 text-white ring-slate-950'
                                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {isEditingItem ? 'Listo' : 'Editar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </div>
                              {isEditingItem && (
                              <div className="p-4">
                              <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_90px_130px_150px]">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500">Ítem</label>
                                  <input
                                    value={item.description}
                                    onChange={(event) => handleItemUpdate(item.id, { description: event.target.value })}
                                    placeholder="Ej: Reparación de pérdida"
                                    list={item.type === 'labor' ? 'labor-master-items' : undefined}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500">
                                    Descripción / sector
                                  </label>
                                  <input
                                    value={item.workArea || ''}
                                    onChange={(event) => handleItemUpdate(item.id, { workArea: event.target.value })}
                                    placeholder="Pared 1, escalera, baño"
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500">Cant.</label>
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
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500">Precio unit.</label>
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
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500">Tipo</label>
                                  <select
                                    value={item.type}
                                    onChange={(event) =>
                                      handleItemUpdate(item.id, { type: event.target.value as 'labor' | 'material' })
                                    }
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:border-slate-400"
                                  >
                                    <option value="labor">Mano de obra</option>
                                    <option value="material">Material</option>
                                  </select>
                                </div>
                              </div>
                              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                      Imagenes del sector
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {itemImages.length > 0
                                        ? `${itemImages.length} imagen(es) asignada(s)`
                                        : 'Agrega fotos para mostrar donde aplica este item.'}
                                    </p>
                                  </div>
                                  <label
                                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[11px] font-black shadow-sm transition ${
                                      isUploadingItemImages
                                        ? 'bg-slate-200 text-slate-500'
                                        : 'bg-slate-950 text-white hover:bg-slate-800'
                                    }`}
                                  >
                                    {isUploadingItemImages ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ImagePlus className="h-3.5 w-3.5" />
                                    )}
                                    {isUploadingItemImages ? 'Subiendo' : 'Agregar'}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      disabled={isUploadingItemImages}
                                      onChange={(event) => handleItemImageUpload(item.id, event)}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                                {quoteImageAttachments.length > 0 && (
                                  <details className="group mt-3 rounded-2xl border border-slate-200 bg-white">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                                      <span>Usar fotos adjuntas</span>
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] tracking-normal text-slate-500">
                                        {reusableQuoteImages.length} disponibles
                                        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                                      </span>
                                    </summary>
                                    <div className="border-t border-slate-100 p-3">
                                      {!itemCanReceiveImages ? (
                                        <p className="text-xs font-semibold text-slate-500">
                                          Este item ya tiene el maximo de imagenes.
                                        </p>
                                      ) : reusableQuoteImages.length === 0 ? (
                                        <p className="text-xs font-semibold text-slate-500">
                                          Todas las fotos adjuntas ya estan asignadas a este item.
                                        </p>
                                      ) : (
                                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                          {reusableQuoteImages.map((file) => (
                                            <button
                                              key={file.id}
                                              type="button"
                                              onClick={() => handleAssignAttachmentToItem(item.id, file)}
                                              className="group/attachment overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left shadow-sm transition hover:border-slate-300 hover:bg-white"
                                            >
                                              <img
                                                src={file.file_url}
                                                alt={file.file_name || 'Foto adjunta'}
                                                className="h-20 w-full object-cover"
                                              />
                                              <div className="flex items-center justify-between gap-2 px-2 py-2">
                                                <span className="truncate text-[10px] font-semibold text-slate-500">
                                                  {file.file_name || 'Foto'}
                                                </span>
                                                <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white">
                                                  Asignar
                                                </span>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                                {itemImages.length > 0 && (
                                  <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                    {itemImages.map((image) => {
                                      const deleteKey = `${item.id}:${image.id}`;
                                      return (
                                        <div
                                          key={image.id}
                                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                        >
                                          <a href={image.url} target="_blank" rel="noreferrer">
                                            <img
                                              src={image.url}
                                              alt={image.name || 'Imagen del sector'}
                                              className="h-24 w-full object-cover"
                                            />
                                          </a>
                                          <div className="flex items-center justify-between gap-2 px-2 py-2">
                                            <span className="truncate text-[10px] font-semibold text-slate-500">
                                              {image.name || 'Sector'}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => void handleItemImageRemove(item.id, image)}
                                              disabled={deletingItemImageId === deleteKey}
                                              className="rounded-full bg-rose-50 p-1 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                              aria-label="Quitar imagen"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <details className="group mt-3 rounded-xl bg-white ring-1 ring-slate-100">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    <span>Especificación técnica</span>
                                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                                  </summary>
                                  <div className="border-t border-slate-100 p-3">
                                    <textarea
                                      value={item.technicalNotes || ''}
                                      onChange={(event) => handleItemUpdate(item.id, { technicalNotes: event.target.value })}
                                      placeholder="Detalle técnico, criterio de medición, preparación o terminación."
                                      rows={4}
                                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                    />
                                  </div>
                                </details>
                              </div>
                              )}
                            </div>
                            );
                                  })}
                                </div>
                              )}
                            </section>
                          ))}
                          <datalist id="labor-master-items">
                            {laborMasterItems.map((laborItem) => (
                              <option key={laborItem.id} value={getMasterItemChoiceValue(laborItem)} />
                            ))}
                          </datalist>
                        </div>
                        )}
                      </div>
                    </details>

                    <details
                      open={openQuoteStep === 'materials'}
                      className={`group overflow-hidden rounded-[26px] border bg-white shadow-sm transition ${
                        openQuoteStep === 'materials' ? 'border-[#ff8a18]/35 shadow-[0_22px_54px_-42px_rgba(255,138,24,0.9)]' : 'border-slate-200'
                      }`}
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenQuoteStep('materials');
                        }}
                        className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                            quoteMaterialsReady ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-950 text-white'
                          }`}>
                            3
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Paso 3</p>
                            <h3 className="text-base font-black text-slate-950">Materiales</h3>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {materialItems.length > 0
                                ? `${materialItems.length} items - ${formatCurrency(materialSubtotal)}`
                                : 'Insumos manuales o calculados.'}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
                          materialItems.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {materialItems.length} items
                        </span>
                      </summary>
                      <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">Items de materiales</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Total materiales: {formatCurrency(materialSubtotal)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItem('material')}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-slate-800"
                          >
                            <FilePlus className="h-3.5 w-3.5" />
                            Material
                          </button>
                        </div>

                        <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/70 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Insumos
                              </p>
                              <h4 className="text-sm font-black text-slate-950">Materiales</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                                {materialItems.length} item{materialItems.length === 1 ? '' : 's'}
                              </span>
                              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                                {formatCurrency(materialSubtotal)}
                              </span>
                            </div>
                          </div>
                          {materialItems.length === 0 ? (
                            <div className="m-3 rounded-[20px] border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
                              Agrega materiales manuales o desde el cómputo automático.
                            </div>
                          ) : (
                            <div className="space-y-3 p-3">
                              {materialItems.map((item, materialIndex) => {
                                const itemTotal = item.quantity * item.unitPrice;
                                const itemHasPendingPrice = item.unitPrice <= 0;
                                const isEditingItem = editingQuoteItemId === item.id;
                                const itemSummary = [
                                  item.workArea?.trim(),
                                  `${formatMeasureValue(item.quantity)}${item.unit ? ` ${item.unit}` : ''}`,
                                  itemHasPendingPrice ? 'Precio pendiente' : formatCurrency(item.unitPrice),
                                ]
                                  .filter(Boolean)
                                  .join(' - ');
                                return (
                                  <div key={item.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white">
                                          {materialIndex + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                            Material
                                          </p>
                                          <p className="truncate text-sm font-black text-slate-950">
                                            {item.description.trim() || 'Material sin descripcion'}
                                          </p>
                                          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                                            {itemSummary}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2">
                                        <span
                                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                                            itemHasPendingPrice
                                              ? 'bg-amber-50 text-amber-700 ring-amber-100'
                                              : 'bg-white text-slate-900 ring-slate-200'
                                          }`}
                                        >
                                          {itemHasPendingPrice ? 'Precio pendiente' : formatCurrency(itemTotal)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingQuoteItemId(isEditingItem ? '' : item.id)}
                                          className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 transition ${
                                            isEditingItem
                                              ? 'bg-slate-950 text-white ring-slate-950'
                                              : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                                          }`}
                                        >
                                          {isEditingItem ? 'Listo' : 'Editar'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveItem(item.id)}
                                          className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </div>
                                    {isEditingItem && (
                                    <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_90px_130px_150px]">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">Item</label>
                                        <input
                                          value={item.description}
                                          onChange={(event) => handleItemUpdate(item.id, { description: event.target.value })}
                                          placeholder="Ej: Cemento 50 kg"
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">
                                          Descripcion / sector
                                        </label>
                                        <input
                                          value={item.workArea || ''}
                                          onChange={(event) => handleItemUpdate(item.id, { workArea: event.target.value })}
                                          placeholder="Pared 1, escalera, bano"
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">Cant.</label>
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
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">Precio unit.</label>
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
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-500">Tipo</label>
                                        <select
                                          value={item.type}
                                          onChange={(event) =>
                                            handleItemUpdate(item.id, { type: event.target.value as 'labor' | 'material' })
                                          }
                                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:border-slate-400"
                                        >
                                          <option value="labor">Mano de obra</option>
                                          <option value="material">Material</option>
                                        </select>
                                      </div>
                                    </div>
                                    )}
                                    {isEditingItem && (
                                      <details className="group mx-4 mb-4 rounded-xl bg-white ring-1 ring-slate-100">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                          <span>Especificación técnica</span>
                                          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                                        </summary>
                                        <div className="border-t border-slate-100 p-3">
                                          <textarea
                                            value={item.technicalNotes || ''}
                                            onChange={(event) => handleItemUpdate(item.id, { technicalNotes: event.target.value })}
                                            placeholder="Detalle técnico, criterio de medición, preparación o terminación."
                                            rows={4}
                                            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                                          />
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>
                      </div>
                    </details>

                    <details
                      open={openQuoteStep === 'settings'}
                      className={`group overflow-hidden rounded-[26px] border bg-white shadow-sm transition ${
                        openQuoteStep === 'settings' ? 'border-[#ff8a18]/35 shadow-[0_22px_54px_-42px_rgba(255,138,24,0.9)]' : 'border-slate-200'
                      }`}
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenQuoteStep('settings');
                        }}
                        className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                            quoteSettingsReady ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-950 text-white'
                          }`}>
                            4
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Paso 4</p>
                            <h3 className="text-base font-black text-slate-950">Ajustes y adjuntos</h3>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {discountPercent > 0 ? `${discountPercent.toFixed(0)}% descuento` : applyTax ? 'IVA activo' : 'Sin descuentos extra'}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                          {applyTax ? 'IVA activo' : 'Sin IVA'}
                        </span>
                      </summary>
                      <div className="grid gap-4 border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 lg:grid-cols-2">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Ajustes</p>
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
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
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

                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Adjuntos</p>
                          {!activeQuoteId && (
                            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                              Guarda el presupuesto para adjuntar fotos o documentos.
                            </p>
                          )}
                          {activeQuoteId && (
                            <div className="mt-3 space-y-3">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleAttachmentUpload}
                                disabled={uploadingAttachments}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"
                              />
                              {attachments.length === 0 && (
                                <p className="text-xs text-slate-500">Aún no hay fotos adjuntas.</p>
                              )}
                              {attachments.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {attachments.map((file) => {
                                    const isImage = isImageAttachment(file);
                                    return (
                                      <div key={file.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                    </details>
                  </div>

                  <aside className="xl:sticky xl:top-5 xl:self-start">
                    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_76px_-48px_rgba(15,23,42,0.8)]">
                      <div className="bg-[#120819] px-5 py-5 text-white">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Total final</p>
                            <p className={`${spaceGrotesk.className} mt-2 text-4xl font-black leading-none`}>
                              {formatCurrency(total)}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${
                            quoteReadyToSend ? 'bg-emerald-400/18 text-emerald-100' : 'bg-white/10 text-white/65'
                          }`}>
                            {quoteReadyToSend ? 'Listo' : 'Incompleto'}
                          </span>
                        </div>
                        <p className="mt-3 truncate text-xs font-semibold text-white/60">
                          {clientName.trim() || 'Cliente sin cargar'}
                        </p>
                      </div>
                      <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Mano de obra</span>
                          <span className="font-black text-slate-950">{formatCurrency(laborSubtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Materiales</span>
                          <span className="font-black text-slate-950">{formatCurrency(materialSubtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Descuento ({discountPercent.toFixed(0)}%)</span>
                          <span className="font-black text-slate-950">-{formatCurrency(discountAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>IVA 21%</span>
                          <span className="font-black text-slate-950">{formatCurrency(taxAmount)}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 px-5 py-4">
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={handleReviewQuote}
                            disabled={isSaving}
                            aria-label="Ver presupuesto"
                            title="Ver presupuesto"
                            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSave('draft')}
                            disabled={isSaving}
                            aria-label="Guardar borrador"
                            title="Guardar borrador"
                            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-800 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSave('sent')}
                            disabled={isSaving || !quoteReadyToSend}
                            aria-label="Enviar al cliente"
                            title="Enviar al cliente"
                            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setQuoteActionsOpen((open) => !open)}
                              aria-label="Mas acciones"
                              title="Mas acciones"
                              className={`inline-flex h-12 w-full items-center justify-center rounded-2xl border text-slate-800 transition hover:border-slate-400 hover:text-slate-950 ${
                                quoteActionsOpen ? 'border-slate-400 bg-slate-100' : 'border-slate-300 bg-white'
                              }`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {quoteActionsOpen && (
                              <div className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.65)]">
                                <button
                                  type="button"
                                  onClick={handleRefreshQuoteValues}
                                  disabled={loadingMasterItems}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-black text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  <RefreshCw className={`h-4 w-4 ${loadingMasterItems ? 'animate-spin' : ''}`} />
                                  Actualizar valores
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {!quoteReadyToSend && (
                          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                            El borrador se puede guardar ahora. Para enviar, revisa los puntos pendientes.
                          </p>
                        )}
                        {formError && <p className="mt-3 text-xs font-semibold text-rose-500">{formError}</p>}
                        {infoMessage && <p className="mt-3 text-xs font-semibold text-emerald-600">{infoMessage}</p>}
                      </div>
                    </div>
                  </aside>
                </div>
              </section>
            )}

            {activeTab === 'presupuestos' && (
              <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_22px_58px_-46px_rgba(15,23,42,0.42)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Presupuestos</p>
                    <h2 className={`${spaceGrotesk.className} mt-1 text-2xl font-bold leading-tight text-[#180f24]`}>
                      Seguimiento
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredQuotes.length} de {quoteStats.total} en vista
                      {quoteFilter !== 'all' ? ` · ${activeQuoteFilterLabel}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewQuote}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#020617] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#111827]"
                  >
                    <FilePlus className="h-4 w-4" />
                    Nuevo
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-200 md:grid-cols-4">
                  {[
                    { label: 'Total', value: formatCompactDashboardMoney(quoteStats.amount), hint: `${quoteStats.total} cargados` },
                    { label: 'Pendientes', value: quoteStats.pending, hint: 'por responder' },
                    { label: 'Aprobados', value: quoteStats.approved + quoteStats.scheduled + quoteStats.in_progress, hint: 'activos' },
                    { label: 'Cobrados', value: formatCompactDashboardMoney(quoteStats.paidAmount), hint: `${quoteStats.paid} cerrados` },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className={`${spaceGrotesk.className} mt-1 truncate text-xl font-bold text-[#180f24]`}>{item.value}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{item.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-1 sm:max-w-[320px]">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Filtrar por estado
                  </label>
                  <select
                    value={quoteFilter}
                    onChange={(event) => setQuoteFilter(event.target.value as QuoteFilter)}
                    className="h-11 rounded-[14px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#020617]"
                  >
                    {quoteFilterOptions.map((filter) => (
                      <option key={filter.key} value={filter.key}>
                        {filter.label} ({getQuoteFilterCount(filter.key)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
                  {filteredQuotes.length === 0 && (
                    <div className="bg-slate-50 p-8 text-center">
                      <p className={`${spaceGrotesk.className} text-lg font-bold text-slate-900`}>Sin presupuestos</p>
                      <p className="mt-1 text-sm text-slate-500">Cambia el filtro o crea uno nuevo.</p>
                      <button
                        type="button"
                        onClick={startNewQuote}
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#020617] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#111827]"
                      >
                        <FilePlus className="h-4 w-4" />
                        Crear presupuesto
                      </button>
                    </div>
                  )}
                  {filteredQuotes.map((quote) => {
                    const info = getQuoteStatusInfo(quote.status);
                    const canShareFeedbackLink = canShareQuoteFeedback(quote.status);
                    const quoteAddress = getQuoteAddress(quote);
                    const clientInitial = (quote.client_name || 'P').trim().slice(0, 1).toUpperCase() || 'P';
                    return (
                      <article
                        key={quote.id}
                        className={`border-b border-slate-200 bg-white p-3 transition last:border-b-0 hover:bg-slate-50 sm:p-4 ${
                          activeQuoteId === quote.id ? 'bg-[#fffaf4]' : ''
                        }`}
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_230px] lg:items-center">
                          <div className="flex min-w-0 gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#180f24] text-xs font-black text-white">
                              {clientInitial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  {getQuoteDisplayNumber(quote)}
                                </p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${info.className}`}>
                                  {info.label}
                                </span>
                              </div>
                              <h3 className={`${spaceGrotesk.className} mt-1 truncate text-base font-bold text-[#180f24]`}>
                                {quote.client_name || 'Presupuesto sin cliente'}
                              </h3>
                              <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500">
                                {quoteAddress || 'Sin dirección confirmada'} · {new Date(quote.created_at).toLocaleDateString('es-AR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
                            <p className={`${spaceGrotesk.className} text-lg font-bold text-slate-900`}>
                              {formatCurrency(toAmountValue(quote.total_amount))}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 lg:w-[230px]">
                            <select
                              value={normalizeStatusValue(quote.status)}
                              onChange={(event) => handleStatusChange(quote.id, event.target.value)}
                              className="col-span-2 h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none transition hover:border-slate-300"
                            >
                              {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleViewQuote(quote)}
                              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditQuote(quote)}
                              className="h-9 w-full rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            {canShareFeedbackLink && (
                              <button
                                type="button"
                                onClick={() => handleCopyFeedbackLink(quote.id)}
                                className="h-9 w-full rounded-full border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                              >
                                Calificación
                              </button>
                            )}
                            {!canShareFeedbackLink && <span aria-hidden="true" className="hidden lg:block" />}
                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(quote)}
                              disabled={deletingQuoteId === quote.id}
                              className={`h-9 w-full rounded-full px-3 text-[11px] font-semibold transition ${
                                deletingQuoteId === quote.id
                                  ? 'cursor-not-allowed bg-rose-50 text-rose-300'
                                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              }`}
                            >
                              {deletingQuoteId === quote.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === 'visualizador' &&
              (() => {
                const previewUrl = viewerUrl || (activeQuoteId ? buildQuotePreviewLink(activeQuoteId) : '');
                const activeQuoteInfo = activeQuote ? getQuoteStatusInfo(activeQuote.status) : null;
                const activeQuoteInitial =
                  (activeQuote?.client_name || 'P').trim().slice(0, 1).toUpperCase() || 'P';

                return (
                  <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_58px_-46px_rgba(15,23,42,0.42)]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab('presupuestos')}
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Volver
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewerQuoteNavigation(previousViewerQuote)}
                            disabled={!previousViewerQuote}
                            aria-label="Presupuesto anterior"
                            className={`flex h-9 w-9 items-center justify-center rounded-full border text-slate-700 transition ${
                              previousViewerQuote
                                ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                            }`}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewerQuoteNavigation(nextViewerQuote)}
                            disabled={!nextViewerQuote}
                            aria-label="Presupuesto siguiente"
                            className={`flex h-9 w-9 items-center justify-center rounded-full border text-slate-700 transition ${
                              nextViewerQuote
                                ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                            }`}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                        {activeQuote ? (
                          <>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#180f24] text-xs font-black text-white">
                              {activeQuoteInitial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  {getQuoteDisplayNumber(activeQuote)}
                                </p>
                                {activeQuoteInfo && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${activeQuoteInfo.className}`}>
                                    {activeQuoteInfo.label}
                                  </span>
                                )}
                              </div>
                              <p className={`${spaceGrotesk.className} truncate text-base font-bold text-[#180f24]`}>
                                {activeQuote.client_name || 'Presupuesto sin cliente'} · {formatCurrency(toAmountValue(activeQuote.total_amount))}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-slate-500">Selecciona un presupuesto desde el listado</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {previewUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                            className="h-9 rounded-full bg-[#020617] px-3 text-xs font-semibold text-white transition hover:bg-[#111827]"
                          >
                            Abrir
                          </button>
                        )}
                        {activeQuoteId && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(activeQuoteId)}
                            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Copiar link
                          </button>
                        )}
                        {activeQuote && (
                          <button
                            type="button"
                            onClick={() => startEditQuote(activeQuote)}
                            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                        )}
                        {activeQuote && canShareQuoteFeedback(activeQuote.status) && (
                          <button
                            type="button"
                            onClick={() => handleCopyFeedbackLink(activeQuote.id)}
                            className="h-9 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                          >
                            Calificación
                          </button>
                        )}
                        {infoMessage && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                            {infoMessage}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-100 p-3 lg:p-4">
                      {previewUrl ? (
                        <div className="h-full min-h-[720px] overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                          <iframe title="Visualizador de presupuesto" src={previewUrl} className="h-full min-h-[720px] w-full" />
                        </div>
                      ) : (
                        <div className="flex min-h-[720px] items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-white text-center">
                          <div className="max-w-sm px-6">
                            <Eye className="mx-auto h-8 w-8 text-slate-300" />
                            <p className={`${spaceGrotesk.className} mt-3 text-lg font-bold text-slate-900`}>
                              Elige un presupuesto
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Abre uno desde Presupuestos para revisar la vista del cliente.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}

            {activeTab === 'agenda' && (
              <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_58px_-46px_rgba(15,23,42,0.42)]">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Agenda</p>
                    <h2 className={`${spaceGrotesk.className} mt-1 text-2xl font-bold text-[#180f24]`}>
                      Calendario semanal
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{agendaWeekLabel}</p>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAgendaWeekOffset((prev) => prev - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        aria-label="Semana anterior"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgendaWeekOffset(0)}
                        className="h-9 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgendaWeekOffset((prev) => prev + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        aria-label="Semana siguiente"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'all' as const, label: `Todos ${agendaCounts.all}` },
                        { key: 'pending' as const, label: `Sin fecha ${agendaCounts.pending}` },
                        { key: 'scheduled' as const, label: `Programados ${agendaCounts.scheduled}` },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAgendaFilter(item.key)}
                          className={`h-9 rounded-full px-3 text-xs font-semibold transition ${
                            agendaFilter === item.key
                              ? 'bg-[#020617] text-white'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-0 bg-slate-100 lg:grid-cols-[300px_minmax(0,1fr)]">
                  <aside className="border-b border-slate-200 bg-white p-4 lg:border-b-0 lg:border-r">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={agendaSearch}
                        onChange={(event) => setAgendaSearch(event.target.value)}
                        placeholder="Buscar cliente o dirección"
                        className="h-11 w-full rounded-[14px] border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#020617]"
                      />
                    </div>

                    {scheduleMessage && (
                      <p className="mt-3 rounded-[14px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                        {scheduleMessage}
                      </p>
                    )}

                    <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sin fecha</p>
                          <p className="mt-1 text-sm font-bold text-slate-900">{agendaSections.unscheduled.length} pendientes</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {agendaSections.unscheduled.length === 0 && (
                          <p className="rounded-[14px] bg-white px-3 py-3 text-xs text-slate-500">
                            No hay trabajos pendientes de fecha.
                          </p>
                        )}
                        {agendaSections.unscheduled.map((quote) => {
                          const startValue = getDatePart(quote.start_date);
                          const isSaving = scheduleSavingId === quote.id;

                          return (
                            <div key={quote.id} className="rounded-[16px] border border-slate-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">
                                    {quote.client_name || 'Presupuesto'}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                    {getQuoteAddress(quote) || 'Sin dirección'}
                                  </p>
                                </div>
                                <p className="shrink-0 text-xs font-bold text-slate-900">
                                  {formatCompactDashboardMoney(toAmountValue(quote.total_amount))}
                                </p>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => commitQuoteSchedule(quote.id, agendaTodayKey, agendaTodayKey)}
                                  disabled={isSaving}
                                  className="h-8 rounded-full bg-[#020617] px-3 text-[11px] font-semibold text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Hoy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => commitQuoteSchedule(quote.id, agendaTomorrowKey, agendaTomorrowKey)}
                                  disabled={isSaving}
                                  className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Mañana
                                </button>
                                <input
                                  type="date"
                                  value={startValue}
                                  disabled={isSaving}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (!value) {
                                      commitQuoteSchedule(quote.id, null, null);
                                      return;
                                    }
                                    commitQuoteSchedule(quote.id, value, value);
                                  }}
                                  className="col-span-2 h-9 rounded-[12px] border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-[#020617] disabled:bg-slate-50 disabled:text-slate-400"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </aside>

                  <div className="min-w-0 p-3 lg:p-4">
                    <div className="overflow-x-auto rounded-[18px] border border-slate-200 bg-white">
                      <div className="grid min-w-[980px] grid-cols-7 border-b border-slate-200 bg-white">
                        {agendaCalendarDays.map((day) => (
                          <div
                            key={day.key}
                            className={`border-r border-slate-200 px-3 py-3 last:border-r-0 ${
                              day.isToday ? 'bg-[#fff7ed]' : ''
                            }`}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {day.date.toLocaleDateString('es-AR', { weekday: 'short' })}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className={`${spaceGrotesk.className} text-2xl font-bold text-[#180f24]`}>
                                {day.date.getDate()}
                              </p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                {day.items.length}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid min-h-[620px] min-w-[980px] grid-cols-7 bg-slate-100">
                        {agendaCalendarDays.map((day) => (
                          <div
                            key={day.key}
                            className={`min-h-[620px] border-r border-slate-200 p-2 last:border-r-0 ${
                              day.isToday ? 'bg-[#fff7ed]' : 'bg-white'
                            }`}
                          >
                            <div className="space-y-2">
                              {day.items.length === 0 && (
                                <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                                  Libre
                                </div>
                              )}
                              {day.items.map((quote) => {
                                const startValue = getDatePart(quote.start_date);
                                const endValue = getDatePart(quote.end_date);
                                const statusInfo = getQuoteStatusInfo(quote.status);
                                const isSaving = scheduleSavingId === quote.id;

                                return (
                                  <div
                                    key={`${day.key}-${quote.id}`}
                                    className="rounded-[16px] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-100"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}>
                                          {statusInfo.label}
                                        </span>
                                        <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                                          {quote.client_name || 'Presupuesto'}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleViewQuote(quote)}
                                        className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white"
                                      >
                                        Ver
                                      </button>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                      {getQuoteAddress(quote) || 'Sin dirección'}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">
                                      <span className="rounded-full bg-slate-100 px-2 py-1">
                                        {formatCompactDashboardMoney(toAmountValue(quote.total_amount))}
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-2 py-1">
                                        {formatAgendaRangeLabel(startValue, endValue)}
                                      </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                      <input
                                        type="date"
                                        value={startValue}
                                        disabled={isSaving}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          if (!value) {
                                            commitQuoteSchedule(quote.id, null, null);
                                            return;
                                          }

                                          const nextStartDate = parseDateLocal(value);
                                          const prevStartDate = parseDateLocal(startValue);
                                          const prevEndDate = parseDateLocal(endValue);
                                          if (!nextStartDate) return;

                                          const duration =
                                            prevStartDate && prevEndDate
                                              ? Math.max(0, diffCalendarDays(prevStartDate, prevEndDate))
                                              : 0;
                                          const nextEndDate = prevEndDate ? addDays(nextStartDate, duration) : null;

                                          commitQuoteSchedule(
                                            quote.id,
                                            formatDateLocal(nextStartDate),
                                            nextEndDate ? formatDateLocal(nextEndDate) : null
                                          );
                                        }}
                                        className="h-8 rounded-[10px] border border-slate-200 px-2 text-[11px] text-slate-600 outline-none focus:border-[#020617] disabled:bg-slate-50"
                                      />
                                      <input
                                        type="date"
                                        value={endValue}
                                        min={startValue || undefined}
                                        disabled={isSaving || !startValue}
                                        onChange={(event) => {
                                          if (!startValue) return;
                                          const value = event.target.value;
                                          if (!value) {
                                            commitQuoteSchedule(quote.id, startValue, null);
                                            return;
                                          }

                                          const currentStartDate = parseDateLocal(startValue);
                                          const nextEndDate = parseDateLocal(value);
                                          if (!currentStartDate || !nextEndDate) return;

                                          const safeEndDate =
                                            nextEndDate.getTime() < currentStartDate.getTime()
                                              ? currentStartDate
                                              : nextEndDate;

                                          commitQuoteSchedule(quote.id, startValue, formatDateLocal(safeEndDate));
                                        }}
                                        className="h-8 rounded-[10px] border border-slate-200 px-2 text-[11px] text-slate-600 outline-none focus:border-[#020617] disabled:bg-slate-50"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => commitQuoteSchedule(quote.id, null, null)}
                                        disabled={isSaving || (!quote.start_date && !quote.end_date)}
                                        className="col-span-2 h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Quitar del calendario
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {false && activeTab === 'agenda' && (
              <div className="rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)] sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Agenda</p>
                <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Agenda operativa</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Organiza trabajos aprobados, separa lo urgente y define rangos de ejecucion sin salir del panel.
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Si el trabajo ya tenia duracion, la mantenemos al mover la fecha de inicio.
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

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      key: 'visible',
                      label: 'Trabajos visibles',
                      value: agendaOverview.total,
                      hint: 'Aprobados listos para coordinar',
                      className: 'border-slate-200 bg-slate-50',
                    },
                    {
                      key: 'pending',
                      label: 'Por agendar',
                      value: agendaOverview.unscheduled,
                      hint: 'Todavia sin fecha de inicio',
                      className: 'border-amber-200 bg-amber-50',
                    },
                    {
                      key: 'today',
                      label: 'Activos hoy',
                      value: agendaOverview.activeToday,
                      hint: `Base ${formatAgendaDateLabel(agendaTodayKey)}`,
                      className: 'border-emerald-200 bg-emerald-50',
                    },
                    {
                      key: 'amount',
                      label: 'Monto visible',
                      value: formatCurrency(agendaOverview.totalAmount),
                      hint:
                        agendaOverview.past > 0
                          ? `${agendaOverview.past} con fecha pasada`
                          : `${agendaOverview.nextDays} en los proximos 7 dias`,
                      className: 'border-sky-200 bg-sky-50',
                    },
                  ].map((card) => (
                    <div
                      key={card.key}
                      className={`rounded-3xl border px-4 py-4 shadow-sm shadow-slate-100/70 ${card.className}`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-6">
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

                  {agendaSections.unscheduled.length > 0 && (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700">Por agendar</p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">
                            Trabajos listos para poner en agenda
                          </h3>
                          <p className="text-sm text-slate-600">
                            Asigna una fecha rapida o define el inicio manualmente.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
                          {agendaSections.unscheduled.length} pendientes
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-2">
                        {agendaSections.unscheduled.map((quote) => {
                          const startValue = getDatePart(quote.start_date);
                          const isSaving = scheduleSavingId === quote.id;

                          return (
                            <div
                              key={quote.id}
                              className="rounded-3xl border border-amber-200 bg-white/90 p-4 shadow-sm shadow-amber-100/60"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {quote.client_name || 'Presupuesto'}
                                    </p>
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold text-amber-700">
                                      Sin fecha
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {getQuoteAddress(quote) || 'Sin direccion'} ·{' '}
                                    {new Date(quote.created_at).toLocaleDateString('es-AR')}
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right">
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">
                                    Presupuesto
                                  </p>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatCurrency(toAmountValue(quote.total_amount))}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => commitQuoteSchedule(quote.id, agendaTodayKey, agendaTodayKey)}
                                  disabled={isSaving}
                                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Hoy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => commitQuoteSchedule(quote.id, agendaTomorrowKey, agendaTomorrowKey)}
                                  disabled={isSaving}
                                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Manana
                                </button>
                                <div className="flex min-w-[180px] flex-1 flex-col gap-1 sm:flex-none">
                                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Fecha de inicio
                                  </label>
                                  <input
                                    type="date"
                                    value={startValue}
                                    disabled={isSaving}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      if (!value) {
                                        commitQuoteSchedule(quote.id, null, null);
                                        return;
                                      }
                                      commitQuoteSchedule(quote.id, value, value);
                                    }}
                                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-amber-400 disabled:bg-slate-50 disabled:text-slate-400"
                                  />
                                </div>
                                {isSaving && <span className="text-xs font-semibold text-slate-400">Guardando...</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {[
                    {
                      key: 'today',
                      title: 'Hoy',
                      description: 'Trabajos que estan en curso o empiezan hoy.',
                      items: agendaSections.today,
                      className: 'border-emerald-200 bg-emerald-50/60',
                      badgeClassName: 'bg-emerald-100 text-emerald-700',
                    },
                    {
                      key: 'nextDays',
                      title: 'Proximos 7 dias',
                      description: 'Lo que entra en ventana corta para planificacion semanal.',
                      items: agendaSections.nextDays,
                      className: 'border-sky-200 bg-sky-50/60',
                      badgeClassName: 'bg-sky-100 text-sky-700',
                    },
                    {
                      key: 'later',
                      title: 'Mas adelante',
                      description: 'Trabajos ya calendarizados fuera de la proxima semana.',
                      items: agendaSections.later,
                      className: 'border-slate-200 bg-slate-50',
                      badgeClassName: 'bg-slate-200 text-slate-700',
                    },
                    {
                      key: 'past',
                      title: 'Fechas pasadas',
                      description: 'Trabajos que siguen abiertos con rango vencido.',
                      items: agendaSections.past,
                      className: 'border-rose-200 bg-rose-50/60',
                      badgeClassName: 'bg-rose-100 text-rose-700',
                    },
                  ].map((section) => {
                    if (section.items.length === 0) return null;

                    return (
                      <div key={section.key} className={`rounded-3xl border p-5 ${section.className}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{section.title}</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{section.description}</h3>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${section.badgeClassName}`}>
                            {section.items.length} trabajos
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {section.items.map((quote) => {
                            const startValue = getDatePart(quote.start_date);
                            const endValue = getDatePart(quote.end_date);
                            const start = parseDateLocal(startValue);
                            const end = parseDateLocal(endValue);
                            const durationDays = start && end ? Math.max(0, diffCalendarDays(start, end)) : 0;
                            const isSaving = scheduleSavingId === quote.id;
                            const statusInfo = getQuoteStatusInfo(quote.status);

                            return (
                              <div
                                key={quote.id}
                                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/70"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-900">
                                        {quote.client_name || 'Presupuesto'}
                                      </p>
                                      <span
                                        className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusInfo.className}`}
                                      >
                                        {statusInfo.label}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {getQuoteAddress(quote) || 'Sin direccion'} ·{' '}
                                      {new Date(quote.created_at).toLocaleDateString('es-AR')}
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-800">
                                      {formatAgendaRangeLabel(startValue, endValue)}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                      <span className="rounded-full bg-slate-100 px-3 py-1">
                                        Monto {formatCurrency(toAmountValue(quote.total_amount))}
                                      </span>
                                      <span className="rounded-full bg-slate-100 px-3 py-1">
                                        {endValue
                                          ? `Duracion ${durationDays + 1} dia${durationDays === 0 ? '' : 's'}`
                                          : 'Sin fecha de cierre'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Inicio</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {formatAgendaDateLabel(startValue)}
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                      {endValue ? `Fin ${formatAgendaDateLabel(endValue)}` : 'Fin a confirmar'}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-end gap-2">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Inicio
                                    </label>
                                    <input
                                      type="date"
                                      value={startValue}
                                      disabled={isSaving}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        if (!value) {
                                          commitQuoteSchedule(quote.id, null, null);
                                          return;
                                        }

                                        const nextStartDate = parseDateLocal(value);
                                        const prevStartDate = parseDateLocal(startValue);
                                        const prevEndDate = parseDateLocal(endValue);
                                        if (!nextStartDate) return;

                                        const duration =
                                          prevStartDate && prevEndDate
                                            ? Math.max(0, diffCalendarDays(prevStartDate, prevEndDate))
                                            : 0;
                                        const nextEndDate = prevEndDate ? addDays(nextStartDate, duration) : null;

                                        commitQuoteSchedule(
                                          quote.id,
                                          formatDateLocal(nextStartDate),
                                          nextEndDate ? formatDateLocal(nextEndDate) : null
                                        );
                                      }}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      Fin
                                    </label>
                                    <input
                                      type="date"
                                      value={endValue}
                                      min={startValue || undefined}
                                      disabled={isSaving || !startValue}
                                      onChange={(event) => {
                                        if (!startValue) return;
                                        const value = event.target.value;
                                        if (!value) {
                                          commitQuoteSchedule(quote.id, startValue, null);
                                          return;
                                        }

                                        const currentStartDate = parseDateLocal(startValue);
                                        const nextEndDate = parseDateLocal(value);
                                        if (!currentStartDate || !nextEndDate) return;

                                        const safeEndDate =
                                          nextEndDate.getTime() < currentStartDate.getTime()
                                            ? currentStartDate
                                            : nextEndDate;

                                        commitQuoteSchedule(
                                          quote.id,
                                          startValue,
                                          formatDateLocal(safeEndDate)
                                        );
                                      }}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => commitQuoteSchedule(quote.id, null, null)}
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
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === 'historial' && (
              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[#f7f9fc] shadow-[0_30px_86px_-58px_rgba(15,23,42,0.62)]">
                <div className="relative overflow-hidden bg-[#180f24] px-5 py-6 text-white sm:px-6">
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,143,31,0.34),transparent_50%)]" />
                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                        Facturación
                      </p>
                      <h2 className={`${spaceGrotesk.className} mt-2 text-3xl font-black tracking-tight sm:text-4xl`}>
                        Control de caja
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm text-white/62">
                        Cobros, trabajos activos y rendimiento mensual en una sola vista.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
                      <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                          Cobrado
                        </p>
                        <p className={`${spaceGrotesk.className} mt-2 text-2xl font-black`}>
                          {formatDashboardMoney(quoteStats.paidAmount)}
                        </p>
                        <p className="mt-1 text-xs text-white/50">{quoteStats.paid} cerrados</p>
                      </div>
                      <div className="rounded-[22px] border border-[#ff8f1f]/35 bg-[#ff8f1f] p-4 text-[#180f24] shadow-[0_18px_48px_-30px_rgba(255,143,31,0.9)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#180f24]/55">
                          Por cobrar
                        </p>
                        <p className={`${spaceGrotesk.className} mt-2 text-2xl font-black`}>
                          {formatDashboardMoney(billingOpenAmount)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#180f24]/65">
                          {billingOpenQuotes.length} activos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid border-b border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: 'Total 12 meses',
                      value: formatDashboardMoney(billingTotals.total),
                      hint: `${billingRecentQuotes.length} movimientos visibles`,
                    },
                    {
                      label: 'Mes actual',
                      value: formatDashboardMoney(billingLastMonth.total),
                      hint: billingLastMonth.label.toUpperCase(),
                    },
                    {
                      label: 'Promedio',
                      value: formatDashboardMoney(billingTotals.average),
                      hint: 'mensual',
                    },
                    {
                      label: 'Mejor mes',
                      value: formatDashboardMoney(billingBestMonth.total),
                      hint: billingBestMonth.label.toUpperCase(),
                    },
                  ].map((item) => (
                    <div key={item.label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                      <p className={`${spaceGrotesk.className} mt-2 truncate text-2xl font-black text-[#180f24]`}>
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{item.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)] sm:p-5">
                  <div className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Rendimiento
                        </p>
                        <h3 className={`${spaceGrotesk.className} mt-1 text-xl font-bold text-[#180f24]`}>
                          Últimos 12 meses
                        </h3>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        Total {formatDashboardMoney(billingTotals.total)}
                      </div>
                    </div>

                    <div className="mt-5 flex h-64 items-end gap-2 overflow-x-auto rounded-[22px] bg-slate-50 px-3 py-4">
                      {billingMonthlySeries.map((item) => {
                        const height = Math.min(
                          100,
                          Math.max(item.total > 0 ? 10 : 4, Math.round((item.total / maxMonthlyBilling) * 100))
                        );
                        const isBestMonth = item.key === billingBestMonth.key && item.total > 0;
                        return (
                          <div key={item.key} className="flex min-w-[52px] flex-1 flex-col items-center justify-end gap-2">
                            <div className="flex h-44 w-full max-w-[34px] items-end rounded-full bg-white shadow-inner ring-1 ring-slate-100">
                              <div
                                title={`${item.label}: ${formatCurrency(item.total)}`}
                                className={`w-full rounded-full transition ${
                                  isBestMonth
                                    ? 'bg-[#ff8f1f] shadow-[0_0_22px_rgba(255,143,31,0.45)]'
                                    : item.total > 0
                                      ? 'bg-[#2a0338]'
                                      : 'bg-slate-200'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hidden">
                    <div className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Estado de cobro
                      </p>
                      <div className="mt-4 space-y-4">
                        {[
                          {
                            label: 'Cobrado',
                            amount: quoteStats.paidAmount,
                            percent: billingProgress.paidPercent,
                            color: 'bg-emerald-500',
                            count: quoteStats.paid,
                          },
                          {
                            label: 'Por cobrar',
                            amount: billingOpenAmount,
                            percent: billingProgress.openPercent,
                            color: 'bg-[#ff8f1f]',
                            count: billingOpenQuotes.length,
                          },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-[#180f24]">{item.label}</p>
                                <p className="text-xs text-slate-500">{item.count} presupuestos</p>
                              </div>
                              <p className={`${spaceGrotesk.className} text-lg font-black text-slate-900`}>
                                {formatDashboardMoney(item.amount)}
                              </p>
                            </div>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Resumen anual
                      </p>
                      <div className="mt-3 space-y-2">
                        {billingYearSeries.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            Aún no hay facturación registrada.
                          </div>
                        )}
                        {billingYearSeries.slice(0, 4).map((item) => (
                          <div key={item.year} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                            <span className="text-sm font-bold text-slate-800">{item.year}</span>
                            <span className="text-sm font-black text-[#180f24]">
                              {formatDashboardMoney(item.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Movimientos
                      </p>
                      <h3 className={`${spaceGrotesk.className} mt-1 text-xl font-bold text-[#180f24]`}>
                        Presupuestos facturables
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={startNewQuote}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#020617] px-4 text-xs font-semibold text-white transition hover:bg-[#111827]"
                    >
                      <FilePlus className="h-4 w-4" />
                      Nuevo presupuesto
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
                    {billingRecentQuotes.length === 0 && (
                      <div className="bg-slate-50 p-8 text-center">
                        <p className={`${spaceGrotesk.className} text-lg font-bold text-slate-900`}>
                          Sin movimientos facturables
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Los presupuestos aprobados, programados, finalizados o cobrados aparecerán acá.
                        </p>
                      </div>
                    )}
                    {billingRecentQuotes.map((quote) => {
                      const info = getQuoteStatusInfo(quote.status);
                      const quoteAddress = getQuoteAddress(quote);
                      const amount = toAmountValue(quote.total_amount);
                      return (
                        <article
                          key={quote.id}
                          className="grid gap-3 border-b border-slate-200 bg-white p-4 last:border-b-0 hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_150px_180px] lg:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${info.className}`}>
                                {info.label}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                {getQuoteDisplayNumber(quote)}
                              </span>
                            </div>
                            <h4 className={`${spaceGrotesk.className} mt-2 truncate text-base font-bold text-[#180f24]`}>
                              {quote.client_name || 'Presupuesto sin cliente'}
                            </h4>
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                              {quoteAddress || 'Sin dirección'} · {new Date(quote.created_at).toLocaleDateString('es-AR')}
                            </p>
                          </div>

                          <div className="lg:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Monto
                            </p>
                            <p className={`${spaceGrotesk.className} mt-1 text-lg font-black text-slate-950`}>
                              {formatCurrency(amount)}
                            </p>
                          </div>

                          <div className="flex gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => handleViewQuote(quote)}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditQuote(quote)}
                              className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'notificaciones' && (
              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_22px_58px_-46px_rgba(15,23,42,0.42)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Notificaciones</p>
                    <h2 className={`${spaceGrotesk.className} mt-1 text-2xl font-bold leading-tight text-[#180f24]`}>
                      Centro de avisos
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {notificationStats.unread > 0
                        ? `${notificationStats.unread} pendientes de revisar`
                        : 'Todo revisado por ahora'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    disabled={notificationStats.unread === 0}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Marcar todo como leído
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-200 md:grid-cols-4">
                  {[
                    { label: 'Total', value: notificationStats.all, hint: 'avisos' },
                    { label: 'No leídas', value: notificationStats.unread, hint: 'pendientes' },
                    { label: 'Presupuestos', value: notificationStats.quote, hint: 'movimientos' },
                    { label: 'Agenda', value: notificationStats.agenda, hint: 'fechas' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                      <p className={`${spaceGrotesk.className} mt-1 text-xl font-bold text-[#180f24]`}>{item.value}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: 'all' as const, label: 'Todas', count: notificationStats.all },
                    { key: 'unread' as const, label: 'No leídas', count: notificationStats.unread },
                    { key: 'quote' as const, label: 'Presupuestos', count: notificationStats.quote },
                    { key: 'agenda' as const, label: 'Agenda', count: notificationStats.agenda },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setNotificationFilter(item.key)}
                      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                        notificationFilter === item.key
                          ? 'border-[#020617] bg-[#020617] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={notificationFilter === item.key ? 'text-white/70' : 'text-slate-400'}>
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200">
                  {loadingNotifications && (
                    <div className="bg-slate-50 p-6 text-sm text-slate-500">Cargando notificaciones...</div>
                  )}
                  {!loadingNotifications && notificationsError && (
                    <div className="bg-amber-50 p-6 text-sm text-amber-700">{notificationsError}</div>
                  )}
                  {!loadingNotifications && !notificationsError && notifications.length === 0 && (
                    <div className="bg-slate-50 p-8 text-center">
                      <Bell className="mx-auto h-8 w-8 text-slate-300" />
                      <p className={`${spaceGrotesk.className} mt-3 text-lg font-bold text-slate-900`}>
                        Sin notificaciones
                      </p>
                      <p className="mt-1 text-sm text-slate-500">Los avisos de presupuestos y agenda van a aparecer acá.</p>
                    </div>
                  )}
                  {!loadingNotifications &&
                    !notificationsError &&
                    notifications.length > 0 &&
                    filteredNotifications.length === 0 && (
                      <div className="bg-slate-50 p-8 text-center">
                        <p className={`${spaceGrotesk.className} text-lg font-bold text-slate-900`}>Sin avisos en esta vista</p>
                        <p className="mt-1 text-sm text-slate-500">Cambia el filtro para ver otros movimientos.</p>
                      </div>
                    )}
                  {filteredNotifications.map((notif) => {
                    const group = getNotificationGroup(notif);
                    const isUnread = !notif.read_at;
                    const hasQuoteTarget = Boolean(notif?.data?.quote_id);
                    const Icon = group === 'agenda' ? Calendar : group === 'quote' ? FileText : Bell;
                    const toneClass =
                      group === 'agenda'
                        ? 'bg-teal-50 text-teal-700'
                        : group === 'quote'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-slate-100 text-slate-600';

                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => handleOpenNotification(notif)}
                        className={`w-full border-b border-slate-200 p-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                          isUnread ? 'bg-[#fffaf4]' : 'bg-white'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${toneClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className={`${spaceGrotesk.className} truncate text-base font-bold text-[#180f24]`}>
                                  {notif.title || 'Notificación'}
                                </p>
                                {isUnread && (
                                  <span className="rounded-full bg-[#ff8f1f]/15 px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
                                    Nueva
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-slate-400">
                                {formatNotificationDate(notif.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{notif.body}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {group === 'agenda' ? 'Agenda' : group === 'quote' ? 'Presupuesto' : 'General'}
                              </span>
                              {hasQuoteTarget && (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                  Abrir presupuesto
                                </span>
                              )}
                              {notif.read_at && (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-400 ring-1 ring-slate-200">
                                  Leída
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === 'soporte' && (
              <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_34px_90px_-48px_rgba(15,23,42,0.55)]">
                <div
                  className={`grid min-h-[640px] ${
                    isBetaAdmin ? 'lg:grid-cols-[320px,1fr]' : 'grid-cols-1'
                  }`}
                >
                  {isBetaAdmin && (
                    <aside className="border-b border-slate-200 bg-slate-950 text-white lg:border-b-0 lg:border-r">
                      <div className="border-b border-white/10 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Soporte</p>
                            <h2 className="mt-1 text-lg font-semibold">Conversaciones</h2>
                          </div>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                            {supportUsers.length}
                          </span>
                        </div>
                      </div>

                      <div className="max-h-[560px] overflow-y-auto p-3">
                        {supportUsers.length === 0 && (
                          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                            Aun no hay mensajes.
                          </div>
                        )}
                        {supportUsers.map((user) => (
                          <button
                            key={user.userId}
                            type="button"
                            onClick={() => setActiveSupportUserId(user.userId)}
                            className={`flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition ${
                              activeSupportUserId === user.userId
                                ? 'border-white/25 bg-white text-slate-950 shadow-sm'
                                : 'border-transparent text-white/70 hover:border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                                activeSupportUserId === user.userId
                                  ? 'bg-slate-950 text-white'
                                  : 'bg-white/10 text-white'
                              }`}
                            >
                              {getClientInitials(user.label)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{user.label}</span>
                              <span
                                className={`mt-0.5 block truncate text-xs ${
                                  activeSupportUserId === user.userId ? 'text-slate-500' : 'text-white/40'
                                }`}
                              >
                                {user.lastMessage?.body || 'Sin mensajes'}
                              </span>
                            </span>
                            <span
                              className={`text-[10px] font-semibold ${
                                activeSupportUserId === user.userId ? 'text-slate-400' : 'text-white/40'
                              }`}
                            >
                              {formatNotificationDate(user.lastMessage?.created_at)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </aside>
                  )}

                  <div className="flex min-h-[640px] flex-col bg-[#f7f9fc]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2a0338] text-sm font-bold text-white shadow-sm">
                          {isBetaAdmin ? getClientInitials(activeSupportLabel) : 'UF'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Soporte beta</p>
                          <h2 className="truncate text-lg font-semibold text-slate-950">
                            {isBetaAdmin ? activeSupportLabel : 'UrbanFix'}
                          </h2>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 sm:inline-flex">
                          Canal activo
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isBetaAdmin) fetchSupportUsers();
                            fetchSupportMessages();
                          }}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Actualizar
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                      {supportLoading && (
                        <div className="flex items-center justify-center py-12 text-sm font-semibold text-slate-400">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cargando mensajes
                        </div>
                      )}
                      {!supportLoading && supportMessages.length === 0 && (
                        <div className="mx-auto mt-16 max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-sm">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <MessageCircle className="h-5 w-5" />
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-950">Sin mensajes</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Escribe abajo y queda registrado en esta conversacion.
                          </p>
                        </div>
                      )}
                      {!supportLoading &&
                        supportMessages.map((msg) => {
                          const isOwn = msg.sender_id === session?.user?.id;
                          const bubbleLabel = isOwn
                            ? 'Vos'
                            : isBetaAdmin
                              ? activeSupportLabel
                              : 'Soporte UrbanFix';
                          return (
                            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {!isOwn && (
                                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#2a0338] text-xs font-bold text-white shadow-sm">
                                  {isBetaAdmin ? getClientInitials(activeSupportLabel) : 'UF'}
                                </span>
                              )}
                              <div
                                className={`max-w-[min(720px,82%)] rounded-[24px] px-4 py-3 text-sm shadow-sm ${
                                  isOwn
                                    ? 'rounded-br-md bg-slate-950 text-white'
                                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                                }`}
                              >
                                <div className="mb-1 flex items-center justify-between gap-4">
                                  <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isOwn ? 'text-white/40' : 'text-slate-400'}`}>
                                    {bubbleLabel}
                                  </span>
                                  <span className={`text-[10px] ${isOwn ? 'text-white/40' : 'text-slate-400'}`}>
                                    {formatNotificationDate(msg.created_at)}
                                  </span>
                                </div>
                                {msg.body && <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>}
                                {Array.isArray(msg.image_urls) && msg.image_urls.length > 0 && (
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {msg.image_urls.map((url: string, index: number) => (
                                      <a
                                        key={`${msg.id}-img-${index}`}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-2xl border border-white/20 bg-white/5"
                                      >
                                        <img
                                          src={url}
                                          alt="Adjunto"
                                          className="h-36 w-full object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isOwn && (
                                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-bold text-slate-950 shadow-sm ring-1 ring-slate-200">
                                  {getClientInitials(profile?.business_name || profile?.full_name || session?.user?.email || 'Yo')}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      <div ref={supportMessagesEndRef} />
                    </div>

                    <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
                      {supportAttachments.length > 0 && (
                        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                          {supportAttachments.map((item, index) => (
                            <div
                              key={`${item.previewUrl}-${index}`}
                              className="group relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                            >
                              <img src={item.previewUrl} alt="Adjunto" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveSupportImage(index)}
                                className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1 text-slate-600 shadow-sm transition hover:bg-white"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-2 shadow-inner">
                        <button
                          type="button"
                          onClick={() => supportFileInputRef.current?.click()}
                          className="mb-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200 transition hover:text-slate-950"
                          aria-label="Adjuntar imagen"
                        >
                          <ImagePlus className="h-5 w-5" />
                        </button>
                        <textarea
                          value={supportDraft}
                          onChange={(event) => setSupportDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              handleSendSupportMessage();
                            }
                          }}
                          placeholder="Escribe tu mensaje"
                          className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-2 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={handleSendSupportMessage}
                          disabled={
                            supportLoading ||
                            (isBetaAdmin && !activeSupportUserId) ||
                            (!supportDraft.trim() && supportAttachments.length === 0)
                          }
                          className="mb-1 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {supportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          Enviar
                        </button>
                      </div>
                      <input
                        ref={supportFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSupportImageSelect}
                        className="hidden"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>Hasta {SUPPORT_MAX_IMAGES} imagenes por mensaje.</span>
                        {supportError && <span className="font-semibold text-rose-500">{supportError}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'perfil' && (
              <div
                className={
                  profilePanelTab === 'preview'
                    ? 'min-h-[calc(100dvh-57px)] bg-[#21002f]'
                    : 'overflow-hidden rounded-[32px] border border-slate-200 bg-[#f5f7fb] shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)]'
                }
              >
                {profilePanelTab !== 'preview' && (
                  <>
                    <div className="relative overflow-hidden bg-[#16051f] px-5 py-4 text-white sm:px-6">
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,143,31,0.32),transparent_54%)]" />
                      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                            Perfil público
                          </p>
                          <h2 className={`${spaceGrotesk.className} mt-1 text-2xl font-black tracking-tight sm:text-3xl`}>
                            Editor del perfil
                          </h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setProfilePanelTab('preview')}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white/88 transition hover:border-white/45 hover:bg-white/20"
                          >
                            Ver como cliente
                          </button>
                          <button
                            type="button"
                            onClick={handleProfileSave}
                            disabled={profileSaving}
                            className="inline-flex h-10 items-center justify-center rounded-full bg-[#ff8f1f] px-5 text-xs font-black text-[#18051f] shadow-[0_18px_48px_-28px_rgba(255,143,31,0.9)] transition hover:bg-[#ffa748] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/50"
                          >
                            {profileSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {profilePanelTab === 'preview' ? (
                  <div className={`${spaceGrotesk.className} min-h-[calc(100dvh-57px)] overflow-hidden bg-[#21002f] text-white`}>
                    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#21002f]/88 px-4 py-3 backdrop-blur-xl sm:px-6">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setProfilePanelTab('editor')}
                            className="rounded-full bg-[#ff8f1f] px-4 py-2 text-xs font-bold text-[#2a0338] transition hover:bg-[#ffa748]"
                          >
                            Editar perfil
                          </button>
                          {publicProfileUrl && (
                            <a
                              href={publicProfileUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="rounded-full border border-white/25 px-4 py-2 text-xs font-bold text-white/88 transition hover:border-white hover:text-white"
                            >
                              Abrir link real
                            </a>
                          )}
                      </div>
                    </div>

                    <div className="relative overflow-hidden">
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,143,31,0.14),transparent_45%),radial-gradient(circle_at_88%_22%,rgba(87,36,128,0.38),transparent_48%)]" />
                      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                        <section className="overflow-hidden rounded-[32px] border border-white/15 bg-white/[0.04] shadow-[0_35px_110px_-70px_rgba(0,0,0,1)]">
                          <div className="relative h-44 sm:h-56 lg:h-64">
                            {publicProfilePreview.companyBannerUrl ? (
                              <>
                                <img
                                  src={publicProfilePreview.companyBannerUrl}
                                  alt={`Banner de ${publicProfilePreview.displayName}`}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,0,47,0.28)_0%,rgba(33,0,47,0.08)_44%,rgba(33,0,47,0.24)_100%)]" />
                              </>
                            ) : (
                              <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,rgba(255,143,31,0.35),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,0.28),transparent_40%),linear-gradient(120deg,#240033_0%,#2a0541_45%,#1d012a_100%)]" />
                            )}
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,0,47,0)_0%,rgba(33,0,47,0.12)_58%,rgba(33,0,47,0.54)_100%)]" />
                          </div>

                          <div className="relative -mt-16 px-5 pb-6 sm:-mt-20 sm:px-8 sm:pb-8">
                            <div className="ufx-tech-card ufx-tech-card--soft relative min-h-[340px] space-y-5 p-5 pb-20 pt-16 sm:p-6 sm:pb-20 sm:pt-6 lg:min-h-[360px]">
                              <ProfileVisitCounter
                                profileId={publicProfilePreview.profileId}
                                recordVisit={false}
                                className="!absolute !right-4 !top-4 !z-10 max-w-[calc(100%-2rem)] bg-black/[0.24] sm:!right-6 sm:!top-6"
                              />
                              <div className="!absolute !bottom-4 !right-4 !z-10 flex max-w-[calc(100%-2rem)] items-center gap-2.5 sm:!bottom-6 sm:!right-6">
                                <ProfileLikeButton
                                  profileId={publicProfilePreview.profileId}
                                  initialCount={publicProfilePreview.likesCount}
                                  iconOnly
                                />
                                <ProfileReviewComments
                                  profileId={publicProfilePreview.profileId}
                                  initialCount={publicProfilePreview.commentsCount}
                                />
                                <ProfileShareActions
                                  profileId={publicProfilePreview.profileId}
                                  shareUrl={publicProfilePreview.shareUrl}
                                  title={publicProfilePreview.displayName}
                                />
                              </div>
                              <div className="flex flex-wrap items-end gap-4 sm:gap-5">
                                <div className="h-28 w-28 overflow-hidden rounded-3xl border border-white/35 bg-[#2a0640] shadow-[0_20px_60px_-28px_rgba(0,0,0,0.95)] ring-4 ring-[#ff8f1f]/35 sm:h-36 sm:w-36">
                                  {publicProfilePreview.avatarImageUrl ? (
                                    <img
                                      src={publicProfilePreview.avatarImageUrl}
                                      alt={`Foto de ${publicProfilePreview.displayName}`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white/90">
                                      {publicProfilePreview.displayInitial}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-3 pb-1">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                                        {publicProfilePreview.displayName}
                                      </h1>
                                      {publicProfilePreview.coverageHeroLabel && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/72">
                                          <MapPinned className="h-3.5 w-3.5 text-[#ff8f1f]" />
                                          {publicProfilePreview.coverageHeroLabel}
                                        </span>
                                      )}
                                    </div>
                                    {publicProfilePreview.fullName && publicProfilePreview.fullName !== publicProfilePreview.displayName && (
                                      <p className="text-sm text-white/80">{publicProfilePreview.fullName}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 pt-2">
                                      <span
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${publicProfilePreview.availabilityToneClass}`}
                                      >
                                        {publicProfilePreview.availabilityLabel}
                                      </span>
                                      <span className="text-xs leading-5 text-white/62">
                                        {publicProfilePreview.workingHoursLabel}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                      {publicProfilePreview.whatsappLink ? (
                                        <a
                                          href={publicProfilePreview.whatsappLink}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          aria-label="Contactar por WhatsApp"
                                          title="WhatsApp"
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-105 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
                                        >
                                          <WhatsAppBrandIcon className="h-8 w-8" />
                                        </a>
                                      ) : null}
                                      {publicProfilePreview.socialLinks.map((entry) => (
                                        <a
                                          key={entry.label}
                                          href={String(entry.href)}
                                          target="_blank"
                                          rel="noreferrer noopener"
                                          aria-label={`Abrir ${entry.label}`}
                                          title={entry.label}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-105 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
                                        >
                                          {entry.icon === 'facebook' ? (
                                            <FacebookBrandIcon className="h-8 w-8" />
                                          ) : (
                                            <InstagramBrandIcon className="h-8 w-8" />
                                          )}
                                        </a>
                                      ))}
                                    </div>
                                  </div>

                                </div>
                              </div>

                              {publicProfilePreview.heroSummary && (
                                <div className="rounded-3xl border border-white/12 bg-black/18 p-4 sm:p-5">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Bio</p>
                                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/82 sm:text-base">
                                    {publicProfilePreview.heroSummary}
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2">
                                {publicProfilePreview.specialties.length > 0 ? (
                                  publicProfilePreview.specialties.slice(0, 8).map((specialty) => (
                                    <span
                                      key={specialty}
                                      className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/85"
                                    >
                                      {specialty}
                                    </span>
                                  ))
                                ) : null}
                              </div>
                            </div>

                          </div>
                        </section>

                        <section>
                          <article className="ufx-tech-card overflow-hidden">
                            <div className="grid lg:grid-cols-[minmax(180px,0.38fr)_minmax(0,1.62fr)]">
                              <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Resumen</p>
                                <h2 className="mt-2 text-2xl font-semibold text-white">Indicadores</h2>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 sm:divide-x sm:divide-white/10">
                                {publicProfilePreview.metricCards.map((item) => (
                                  <div key={item.label} className="border-b border-white/10 p-5 last:border-b-0 sm:border-b-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                                      {item.label}
                                    </p>
                                    <p className="mt-3 flex items-baseline gap-1 text-3xl font-black text-white sm:text-4xl">
                                      <span>{item.value}</span>
                                      {'suffix' in item && item.suffix ? (
                                        <span className="text-xs font-semibold text-white/45">{item.suffix}</span>
                                      ) : null}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </article>
                        </section>

                        {publicProfilePreview.badges.length > 0 && (
                          <section className="grid gap-4">
                            <article className="ufx-tech-card ufx-tech-card--soft p-5 sm:p-6">
                              <h2 className="text-2xl font-semibold text-white">Insignias</h2>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {publicProfilePreview.badges.map((badge) => (
                                  <span
                                    key={badge}
                                    className="rounded-full border border-[#ff8f1f]/55 bg-[#ff8f1f]/12 px-3 py-1.5 text-xs font-medium text-[#ffd6a6]"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            </article>
                          </section>
                        )}

                        {(publicProfilePreview.facebookFeedEmbedUrl || publicProfilePreview.instagramPostEmbedUrl) && (
                          <section className="grid gap-4 xl:grid-cols-2">
                            {publicProfilePreview.facebookFeedEmbedUrl && (
                              <article className="ufx-tech-card p-5 sm:p-6">
                                <h2 className="text-2xl font-semibold text-white">Facebook</h2>
                                <iframe
                                  title="Publicaciones Facebook del técnico"
                                  src={publicProfilePreview.facebookFeedEmbedUrl}
                                  className="mt-4 h-[360px] w-full rounded-[24px] border-0 bg-white"
                                  loading="lazy"
                                  allow="encrypted-media"
                                />
                              </article>
                            )}

                            {publicProfilePreview.instagramPostEmbedUrl && (
                              <article className="ufx-tech-card p-5 sm:p-6">
                                <h2 className="text-2xl font-semibold text-white">Instagram</h2>
                                <iframe
                                  title="Publicaciones Instagram del técnico"
                                  src={publicProfilePreview.instagramPostEmbedUrl}
                                  className="mt-4 h-[360px] w-full rounded-[24px] border-0 bg-white"
                                  loading="lazy"
                                  allow="encrypted-media"
                                />
                              </article>
                            )}
                          </section>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>

                <div className="mx-5 mt-5 grid gap-5 pb-6 sm:mx-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
                  <div className="lg:col-span-2">
                    <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_22px_68px_-54px_rgba(15,23,42,0.75)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Foto, logo y portada
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                            {Math.max(0, 5 - formRequiredMissing.length)}/5 base
                          </span>
                          {formRequiredMissing.length > 0 && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                              Falta {formRequiredMissing.length}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                            {profileForm.bannerUrl ? (
                              <img src={profileForm.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                            ) : null}
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.36)_100%)]" />
                            <div className="absolute inset-x-3 top-3 flex justify-between gap-2">
                              <span className="rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white/90">
                                Portada del perfil
                              </span>
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-white">
                                <ImagePlus className="h-4 w-4" />
                                {uploadingBanner ? 'Subiendo...' : 'Subir banner'}
                                <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                              </label>
                            </div>
                            {!profileForm.bannerUrl && (
                              <div className="absolute inset-x-6 bottom-5 text-center sm:text-left">
                                <p className="text-lg font-semibold text-white">Banner del perfil</p>
                                <p className="mt-1 text-sm text-white/75">Imagen horizontal para la portada del perfil publico.</p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 px-6 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-sm">
                                {profileForm.avatarUrl ? (
                                  <img src={profileForm.avatarUrl} alt="Foto" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                                    {(profileForm.fullName || profileForm.businessName || 'U')[0]?.toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-slate-900">
                                  {profileForm.businessName || 'Tu negocio'}
                                </p>
                                <p className="truncate text-sm text-slate-500">{profileForm.fullName || 'Tu nombre'}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800">
                                <ImagePlus className="h-4 w-4" />
                                {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                              </label>
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800">
                                <ImagePlus className="h-4 w-4" />
                                {uploadingCompanyLogo ? 'Subiendo...' : 'Subir logo'}
                                <input type="file" accept="image/*" onChange={handleCompanyLogoUpload} className="hidden" />
                              </label>
                              <select
                                value={profileForm.logoShape}
                                onChange={(event) =>
                                  setProfileForm((prev) => ({ ...prev, logoShape: event.target.value }))
                                }
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 outline-none transition focus:border-slate-400"
                              >
                                <option value="auto">Logo: auto</option>
                                <option value="round">Logo: redondo</option>
                                <option value="square">Logo: cuadrado</option>
                                <option value="rect">Logo: rectangular</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                              Datos principales
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold normal-case tracking-normal text-slate-500">
                                Visible
                              </span>
                            </summary>
                            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                              Nombre y apellido
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Visible
                              </span>
                            </label>
                            <input
                              value={profileForm.fullName}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                              Nombre del negocio
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Principal
                              </span>
                            </label>
                            <input
                              value={profileForm.businessName}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, businessName: event.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                              Email
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Interno
                              </span>
                            </label>
                            <input
                              value={profileForm.email}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                              WhatsApp de contacto
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                                Cliente
                              </span>
                            </label>
                            <input
                              value={profileForm.phone}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                              Bio pública
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Visible
                              </span>
                            </label>
                            <textarea
                              value={profileForm.bio}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                              rows={4}
                              maxLength={420}
                              placeholder="Contá en pocas líneas quién sos, qué trabajos hacés y por qué pueden confiar en vos."
                              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                              <span>Se muestra en el encabezado del link público.</span>
                              <span>{profileForm.bio.length}/420</span>
                            </div>
                          </details>
                          <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                              Cobertura y horarios
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold normal-case tracking-normal text-slate-500">
                                Operativo
                              </span>
                            </summary>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600">Pais</label>
                                <select
                                  value={profileForm.country}
                                  onChange={(event) => handleCountryChange(event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                                >
                                  {COUNTRY_NAMES.map((country) => (
                                    <option key={country} value={country}>
                                      {country}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600">{provinceFieldLabel}</label>
                                <select
                                  value={profileForm.province}
                                  onChange={(event) => handleProvinceChange(event.target.value)}
                                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                                >
                                  <option value="">Seleccionar {provinceFieldLabel.toLowerCase()}</option>
                                  {provinceOptions.map((province) => (
                                    <option key={province} value={province}>
                                      {province}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <label className="mt-4 block text-xs font-semibold text-slate-600">Localidad / partido</label>
                            <LocalitySelect
                              country={profileForm.country}
                              province={profileForm.province}
                              value={profileForm.city}
                              onChange={handleCityChange}
                              selectClassName="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                              helperClassName="mt-2 text-xs text-slate-500"
                            />
                            <div className="mt-3">
                              <TechnicianLocationPicker
                                value={technicianLocationResult}
                                query={profileForm.address}
                                onQueryChange={handleTechnicianAddressQueryChange}
                                onChange={handleTechnicianLocationChange}
                                coverageRadiusKm={technicianRadiusKm}
                                countryHint={profileForm.country}
                                cityHint={profileForm.city}
                                provinceHint={profileForm.province}
                                label="Direccion base"
                                description="Usamos este punto para mostrarte solicitudes cercanas. El cliente no necesita ver tu direccion exacta."
                                required={profileForm.profilePublished}
                                error={
                                  profileForm.profilePublished && !hasResolvedBaseAddress
                                    ? 'Confirma tu punto exacto en el mapa para publicar en la vidriera'
                                    : undefined
                                }
                              />
                            </div>
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">Solicitudes en radio de {COVERAGE_RADIUS_KM} km</p>
                              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                {coverageAreaLabel}
                              </p>
                            </div>
                            <label className="mt-4 block text-xs font-semibold text-slate-600">Horarios de atencion</label>
                            <div className="mt-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
                              <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                                Resumen: {workingHoursLabel}
                              </p>
                            </div>
                          </details>
                          <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                              Especialidades
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold normal-case tracking-normal text-slate-500">
                                {selectedSpecialties.length} rubros
                              </span>
                            </summary>
                            <label className="mt-4 block text-xs font-semibold text-slate-600">Rubros que ofreces</label>
                            <select
                              value=""
                              onChange={(event) => handleSpecialtySelect(event.target.value)}
                              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            >
                              <option value="">Agregar rubro</option>
                              {TECH_SPECIALTY_OPTIONS.slice()
                                .sort((a, b) => a.localeCompare(b, 'es'))
                                .map((specialty) => {
                                  const isSelected = selectedSpecialtiesSet.has(normalizeTextForParsing(specialty));
                                  return (
                                    <option key={specialty} value={specialty} disabled={isSelected}>
                                      {isSelected ? `${specialty} - seleccionado` : specialty}
                                    </option>
                                  );
                                })}
                            </select>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold text-slate-600">
                                  Seleccionados ({selectedSpecialties.length})
                                </p>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                  Click para quitar
                                </span>
                              </div>
                              {selectedSpecialties.length === 0 ? (
                                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
                                  Aun no seleccionaste rubros.
                                </p>
                              ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedSpecialties.map((specialty) => (
                                    <button
                                      key={specialty}
                                      type="button"
                                      onClick={() => handleSpecialtyToggle(specialty)}
                                      className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                                    >
                                      {specialty}
                                      <X className="h-3 w-3" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                                No encuentro mi rubro
                              </summary>
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
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddCustomSpecialty}
                                  className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                >
                                  Agregar
                                </button>
                              </div>
                            </details>
                            <label className="mt-4 block text-xs font-semibold text-slate-600">Certificaciones</label>
                            <textarea
                              value={profileForm.certifications}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, certifications: event.target.value }))}
                              rows={3}
                              placeholder="Ej: Matricula, cursos, seguro, referencias o habilitaciones."
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
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
                              <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[11px] font-semibold text-slate-600">Archivos adjuntos</p>
                                {certificationFiles.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2"
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
                          </details>
                          <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                              Redes y visibilidad
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold normal-case tracking-normal text-slate-500">
                                Público
                              </span>
                            </summary>
                            <label className="mt-4 block text-xs font-semibold text-slate-600">Facebook (pagina)</label>
                            <input
                              value={profileForm.facebookUrl}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, facebookUrl: event.target.value }))}
                              placeholder="https://www.facebook.com/tu.pagina"
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <label className="mt-4 block text-xs font-semibold text-slate-600">Instagram (perfil o post)</label>
                            <input
                              value={profileForm.instagramUrl}
                              onChange={(event) => setProfileForm((prev) => ({ ...prev, instagramUrl: event.target.value }))}
                              placeholder="https://www.instagram.com/tuusuario o /p/..."
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                            />
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handlePublishProfile}
                                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                              >
                                {profileForm.profilePublished ? 'Visible en vidriera - copiar link' : 'PUBLICAR EN VIDRIERA'}
                              </button>
                              {publicProfileUrl && (
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
                            </div>
                            <div className="mt-4 grid gap-3 xl:grid-cols-2">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
                                    Pega un link de Instagram para mostrarlo en tu perfil.
                                  </p>
                                )}
                              </div>
                            </div>
                          </details>
                          <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                              Datos comerciales
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold normal-case tracking-normal text-slate-500">
                                Privado
                              </span>
                            </summary>
                            <label className="mt-4 block text-xs font-semibold text-slate-600">CUIT / CUIL</label>
                            <input
                              value={formatTaxId(profileForm.taxId)}
                              onChange={(event) =>
                                setProfileForm((prev) => ({ ...prev, taxId: normalizeTaxId(event.target.value) }))
                              }
                              placeholder="20-12345678-3"
                              inputMode="numeric"
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
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
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
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
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomPaymentMethod}
                                className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                Agregar
                              </button>
                            </div>
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
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
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
                          </details>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_52px_-46px_rgba(15,23,42,0.65)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Datos principales
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          Visible
                        </span>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Nombre y apellido
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Visible
                        </span>
                      </label>
                      <input
                        value={profileForm.fullName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Aparece debajo del nombre comercial.</p>
                      <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Nombre del negocio
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Principal
                        </span>
                      </label>
                      <input
                        value={profileForm.businessName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, businessName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Es el titulo grande del perfil visible.</p>
                      <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Email
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Interno
                        </span>
                      </label>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Se usa para cuenta y presupuestos. El contacto principal es WhatsApp.</p>
                      <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        WhatsApp de contacto
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                          Cliente
                        </span>
                      </label>
                      <input
                        value={profileForm.phone}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Activa el boton de contacto del perfil publico.</p>
                      <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Bio pública
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Visible
                        </span>
                      </label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                        rows={4}
                        maxLength={420}
                        placeholder="Contá en pocas líneas quién sos, qué trabajos hacés y por qué pueden confiar en vos."
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                        <span>Se muestra en el encabezado del link público.</span>
                        <span>{profileForm.bio.length}/420</span>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_52px_-46px_rgba(15,23,42,0.65)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Cobertura y horarios
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          Operativo
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600">Pais</label>
                          <select
                            value={profileForm.country}
                            onChange={(event) => handleCountryChange(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                          >
                            {COUNTRY_NAMES.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] text-slate-500">Base para ordenar provincias y localidades.</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600">{provinceFieldLabel}</label>
                          <select
                            value={profileForm.province}
                            onChange={(event) => handleProvinceChange(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                          >
                            <option value="">Seleccionar {provinceFieldLabel.toLowerCase()}</option>
                            {provinceOptions.map((province) => (
                              <option key={province} value={province}>
                                {province}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[11px] text-slate-500">Ayuda a ubicarte en la vidriera correcta.</p>
                        </div>
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Localidad / partido</label>
                      <LocalitySelect
                        country={profileForm.country}
                        province={profileForm.province}
                        value={profileForm.city}
                        onChange={handleCityChange}
                        selectClassName="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                        helperClassName="mt-2 text-xs text-slate-500"
                      />
                      <div className="mt-3">
                        <TechnicianLocationPicker
                          value={technicianLocationResult}
                          query={profileForm.address}
                          onQueryChange={handleTechnicianAddressQueryChange}
                          onChange={handleTechnicianLocationChange}
                          coverageRadiusKm={technicianRadiusKm}
                          countryHint={profileForm.country}
                          cityHint={profileForm.city}
                          provinceHint={profileForm.province}
                          label="Direccion base"
                          description="Usamos este punto para mostrarte solicitudes cercanas. El cliente no necesita ver tu direccion exacta."
                          required={profileForm.profilePublished}
                          error={
                            profileForm.profilePublished && !hasResolvedBaseAddress
                              ? 'Confirma tu punto exacto en el mapa para publicar en la vidriera'
                              : undefined
                          }
                        />
                      </div>

                      <label className="mt-4 block text-xs font-semibold text-slate-600">Zona de cobertura</label>
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Solicitudes en radio de {COVERAGE_RADIUS_KM} km</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Mostramos trabajos cercanos a tu ubicacion base sin exponer tu direccion exacta.
                        </p>
                        <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          {coverageAreaLabel}
                        </p>
                      </div>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Horarios de atencion</label>
                      <div className="mt-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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

                  <div className="hidden">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_52px_-46px_rgba(15,23,42,0.65)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Especialidades
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {selectedSpecialties.length} rubros
                        </span>
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Rubros que ofreces</label>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Elegi desde la lista y se agregan abajo.
                      </p>
                      <select
                        value=""
                        onChange={(event) => handleSpecialtySelect(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      >
                        <option value="">Agregar rubro</option>
                        {TECH_SPECIALTY_OPTIONS.slice()
                          .sort((a, b) => a.localeCompare(b, 'es'))
                          .map((specialty) => {
                            const isSelected = selectedSpecialtiesSet.has(normalizeTextForParsing(specialty));
                            return (
                              <option key={specialty} value={specialty} disabled={isSelected}>
                                {isSelected ? `${specialty} - seleccionado` : specialty}
                              </option>
                            );
                          })}
                      </select>

                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-slate-600">
                            Seleccionados ({selectedSpecialties.length})
                          </p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            Click para quitar
                          </span>
                        </div>
                        {selectedSpecialties.length === 0 ? (
                          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            Aun no seleccionaste rubros.
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedSpecialties.map((specialty) => (
                              <button
                                key={specialty}
                                type="button"
                                onClick={() => handleSpecialtyToggle(specialty)}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                {specialty}
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                          No encuentro mi rubro
                        </summary>
                        <p className="mt-2 text-[11px] text-slate-500">Usalo solo si no existe en la lista principal.</p>
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
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSpecialty}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Agregar
                          </button>
                        </div>
                      </details>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Certificaciones</label>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Matriculas, cursos, habilitaciones o datos que sumen confianza.
                      </p>
                      <textarea
                        value={profileForm.certifications}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, certifications: event.target.value }))}
                        rows={3}
                        placeholder="Ej: Matricula, cursos, seguro, referencias o habilitaciones."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
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

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_52px_-46px_rgba(15,23,42,0.65)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Redes y visibilidad
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          Público
                        </span>
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-slate-600">Facebook (pagina)</label>
                      <input
                        value={profileForm.facebookUrl}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, facebookUrl: event.target.value }))}
                        placeholder="https://www.facebook.com/tu.pagina"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Se muestra como canal activo si el link es valido.</p>
                      <label className="mt-4 block text-xs font-semibold text-slate-600">Instagram (perfil o post)</label>
                      <input
                        value={profileForm.instagramUrl}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, instagramUrl: event.target.value }))}
                        placeholder="https://www.instagram.com/tuusuario o /p/..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">Ideal para mostrar trabajos, reels o publicaciones recientes.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePublishProfile}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          {profileForm.profilePublished ? 'Visible en vidriera - copiar link' : 'PUBLICAR EN VIDRIERA'}
                        </button>
                        {publicProfileUrl && (
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
                          ? 'Tu perfil esta visible en vidriera publica.'
                          : 'Tu link publico ya funciona. Para vidriera, debes cargar direccion/zona y confirmar publicacion.'}
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

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_52px_-46px_rgba(15,23,42,0.65)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Datos comerciales
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          Privado
                        </span>
                      </div>
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
                      <p className="mt-1 text-[11px] text-slate-500">Ayuda a preparar presupuestos y comprobantes correctamente.</p>

                      <label className="mt-4 block text-xs font-semibold text-slate-600">Metodo de pago</label>
                      <p className="mt-1 text-[11px] text-slate-500">Opciones que podes aceptar cuando el cliente aprueba un trabajo.</p>
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
                      <p className="mt-1 text-[11px] text-slate-500">Dato privado para coordinar pagos si el trabajo avanza.</p>
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

                <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/90 px-5 py-4 shadow-[0_-18px_42px_-36px_rgba(15,23,42,0.7)] backdrop-blur sm:px-6">
                  <button
                    type="button"
                    onClick={handlePublishProfile}
                    className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    {profileForm.profilePublished ? 'Copiar link publico' : 'PUBLICAR EN VIDRIERA'}
                  </button>
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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
              <div className="rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_32px_82px_-44px_rgba(15,23,42,0.48)] sm:p-6">
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
                  {filteredMasterItems.map((item) => {
                    const basePrice = getMasterItemBasePrice(item);
                    const activePrice = getMasterItemSuggestedPrice(item);
                    const hasLaborUpdate =
                      item.type === 'labor' && basePrice > 0 && activePrice > 0 && !pricesAreEquivalent(basePrice, activePrice);
                    return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="min-w-[240px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p title={getMasterItemChoiceValue(item)} className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </p>
                          {item.technical_notes && (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                              {getMasterItemTechnicalBadge(item)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatRubroLabel(resolveMasterRubro(item))}
                          {item.source_ref ? ` | ${item.source_ref}` : ''}
                        </p>
                        {item.technical_notes && (
                          <p className="mt-2 max-w-2xl whitespace-pre-wrap text-xs leading-5 text-slate-600">
                            <span className="font-semibold text-slate-700">Especificacion tecnica:</span> {item.technical_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(activePrice)}
                          {hasLaborUpdate && (
                            <span className="block text-[10px] font-semibold text-slate-400">
                              base {formatCurrency(basePrice)}
                            </span>
                          )}
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
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </main>
          </div>
        </div>
        {sessionMediaOverlays}
      </div>
    </div>
  );
}



