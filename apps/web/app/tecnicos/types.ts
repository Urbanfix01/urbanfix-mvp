import type { LucideIcon } from 'lucide-react';

export type QuoteRow = {
  id: string;
  client_name: string | null;
  client_address: string | null;
  address?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  total_amount: number | null;
  tax_rate: number | null;
  discount_percent?: number | null;
  status: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  quote_items?: QuoteItemRow[];
};

export type ItemForm = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'material';
  unit?: string;
  workArea?: string;
  itemImages?: ItemImageForm[];
  technicalNotes?: string;
  masterItemId?: string;
  masterItemCategory?: string;
  masterItemSourceRef?: string;
  syncGroupId?: string;
  syncRole?: 'driver' | 'dependent';
  syncDriverId?: string;
  syncQuantityPerUnit?: number;
  syncSources?: QuoteItemSyncSource[];
};

export type QuoteItemSyncSource = {
  syncGroupId?: string;
  syncDriverId: string;
  syncQuantityPerUnit: number;
};

export type ItemImageForm = {
  id: string;
  url: string;
  name: string;
  fileType?: string;
  storagePath?: string | null;
  uploadedAt?: string;
  source?: 'item-upload' | 'quote-attachment';
  sourceAttachmentId?: string | null;
};

export type QuoteItemRow = {
  id?: string;
  description?: string;
  unit_price?: number | null;
  quantity?: number | null;
  metadata?: any;
};

export type AttachmentRow = {
  id: string;
  quote_id: string;
  user_id?: string | null;
  file_url: string;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  read_at?: string | null;
  created_at?: string | null;
};

export type MasterItemRow = {
  id: string;
  name: string;
  type: 'labor' | 'material';
  suggested_price: number | null;
  category: string | null;
  source_ref?: string | null;
  technical_notes?: string | null;
  unit?: string | null;
};

export type GeoResult = {
  display_name: string;
  full_display_name?: string;
  primary_label?: string;
  secondary_label?: string;
  detail_label?: string;
  accuracy_label?: string;
  locality?: string;
  province?: string;
  precision?: 'exact' | 'approx';
  lat: number;
  lon: number;
};

export type NavItem = {
  key:
    | 'lobby'
    | 'operativo'
    | 'nuevo'
    | 'presupuestos'
    | 'visualizador'
    | 'agenda'
    | 'notificaciones'
    | 'soporte'
    | 'historial'
    | 'perfil'
    | 'precios';
  label: string;
  hint: string;
  short: string;
  icon: LucideIcon;
};

export type AccessProfile = 'tecnico' | 'empresa' | 'cliente';
