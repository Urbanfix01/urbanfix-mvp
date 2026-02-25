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
};

export type GeoResult = {
  display_name: string;
  lat: number;
  lon: number;
};

export type NavItem = {
  key:
    | 'lobby'
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