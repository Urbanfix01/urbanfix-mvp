-- Master items: active flag for managing price list entries
-- (Safe to run multiple times)

alter table if exists public.master_items
  add column if not exists active boolean not null default true;

create index if not exists master_items_type_active_idx
  on public.master_items (type, active);

