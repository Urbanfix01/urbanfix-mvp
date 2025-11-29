/**
 * src/types/database.ts
 * Definición HÍBRIDA: Lógica de Negocio + Infraestructura Supabase
 */

// --- 1. TUS DEFINICIONES DE NEGOCIO (Respetando tu código actual) ---

// Enum idéntico al creado en SQL (item_type_enum)
export type ItemType = 'labor' | 'material' | 'consumable';

export interface MasterItem {
  id: string; // UUID
  name: string;
  type: ItemType;
  suggested_price: number; 
  source_ref?: string | null; 
  created_at?: string;
}

export interface BlueprintComponent {
  blueprint_id: string;
  item_id: string;
  quantity: number;
  is_removable: boolean; 
  // Relación opcional (Join)
  master_items?: MasterItem; 
}

export interface ServiceBlueprint {
  id: string;
  name: string; 
  description?: string | null;
  // Relación opcional (Join)
  blueprint_components?: BlueprintComponent[];
}

// --- 2. INFRAESTRUCTURA SUPABASE (Lo que le faltaba para conectar) ---

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Esta interfaz conecta tus tipos con las tablas reales de la DB
export interface Database {
  public: {
    Tables: {
      master_items: {
        Row: MasterItem;
        Insert: Omit<MasterItem, 'id' | 'created_at'>;
        Update: Partial<Omit<MasterItem, 'id' | 'created_at'>>;
      };
      service_blueprints: {
        Row: ServiceBlueprint;
        Insert: Omit<ServiceBlueprint, 'id' | 'blueprint_components'>; 
        Update: Partial<Omit<ServiceBlueprint, 'id' | 'blueprint_components'>>;
      };
      blueprint_components: {
        Row: BlueprintComponent;
        Insert: Omit<BlueprintComponent, 'master_items'>; // No insertamos el objeto anidado, solo los IDs
        Update: Partial<Omit<BlueprintComponent, 'master_items'>>;
      };
    };
  };
}