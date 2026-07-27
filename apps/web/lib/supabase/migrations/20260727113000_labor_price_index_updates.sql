create table if not exists public.labor_price_index_updates (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'INDEC',
  source_url text not null,
  source_series text not null default 'icc_mano_obra',
  period_label text not null,
  previous_period_label text,
  index_value numeric,
  previous_index_value numeric,
  monthly_percent numeric not null,
  multiplier numeric not null,
  status text not null default 'applying',
  item_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint labor_price_index_updates_status_check
    check (status in ('preview', 'applying', 'applied', 'partial', 'failed'))
);

create unique index if not exists labor_price_index_updates_applied_period_idx
  on public.labor_price_index_updates (source_series, period_label)
  where status = 'applied';

create table if not exists public.labor_price_item_updates (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.labor_price_index_updates(id) on delete cascade,
  master_item_id uuid not null references public.master_items(id) on delete cascade,
  old_price numeric not null,
  suggested_price numeric not null,
  applied_price numeric,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists labor_price_item_updates_update_id_idx
  on public.labor_price_item_updates (update_id);

create index if not exists labor_price_item_updates_master_item_id_idx
  on public.labor_price_item_updates (master_item_id);

alter table public.labor_price_index_updates enable row level security;
alter table public.labor_price_item_updates enable row level security;
