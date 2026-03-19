-- Master items: observaciones tecnicas por rubro/item
-- Permite guardar consideraciones tecnicas sin mezclarlas con el precio.

alter table if exists public.master_items
  add column if not exists technical_notes text;
