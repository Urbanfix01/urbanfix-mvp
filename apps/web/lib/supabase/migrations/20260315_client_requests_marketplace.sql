-- Client profile marketplace and direct requests (web + mobile)

create extension if not exists pgcrypto;

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  address text not null,
  city text,
  description text not null,
  urgency text not null default 'media' check (urgency in ('baja', 'media', 'alta')),
  preferred_window text,
  mode text not null default 'marketplace' check (mode in ('marketplace', 'direct')),
  status text not null default 'published' check (
    status in ('published', 'matched', 'quoted', 'direct_sent', 'selected', 'scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  target_technician_id uuid references public.profiles(id) on delete set null,
  target_technician_name text,
  target_technician_phone text,
  assigned_technician_id uuid references public.profiles(id) on delete set null,
  assigned_technician_name text,
  assigned_technician_phone text,
  direct_expires_at timestamptz,
  selected_match_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.client_requests(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  technician_name text not null,
  technician_phone text,
  technician_specialty text,
  technician_city text,
  technician_rating numeric(3,2),
  score integer not null default 0,
  quote_status text not null default 'pending' check (quote_status in ('pending', 'submitted', 'accepted', 'rejected')),
  price_ars numeric,
  eta_hours integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, technician_id)
);

create table if not exists public.client_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.client_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_requests_client_updated
  on public.client_requests (client_id, updated_at desc);

create index if not exists idx_client_request_matches_request
  on public.client_request_matches (request_id, score desc, created_at desc);

create index if not exists idx_client_request_events_request
  on public.client_request_events (request_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'client_requests'
      and constraint_name = 'client_requests_selected_match_fkey'
  ) then
    alter table public.client_requests
      add constraint client_requests_selected_match_fkey
      foreign key (selected_match_id)
      references public.client_request_matches(id)
      on delete set null;
  end if;
end $$;

create or replace function public.client_request_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_requests_touch_updated_at on public.client_requests;
create trigger trg_client_requests_touch_updated_at
before update on public.client_requests
for each row execute function public.client_request_touch_updated_at();

drop trigger if exists trg_client_request_matches_touch_updated_at on public.client_request_matches;
create trigger trg_client_request_matches_touch_updated_at
before update on public.client_request_matches
for each row execute function public.client_request_touch_updated_at();

alter table public.client_requests enable row level security;
alter table public.client_request_matches enable row level security;
alter table public.client_request_events enable row level security;

drop policy if exists "Client requests select own" on public.client_requests;
create policy "Client requests select own"
  on public.client_requests
  for select
  using (auth.uid() = client_id);

drop policy if exists "Client requests insert own" on public.client_requests;
create policy "Client requests insert own"
  on public.client_requests
  for insert
  with check (auth.uid() = client_id);

drop policy if exists "Client requests update own" on public.client_requests;
create policy "Client requests update own"
  on public.client_requests
  for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

drop policy if exists "Client requests delete own" on public.client_requests;
create policy "Client requests delete own"
  on public.client_requests
  for delete
  using (auth.uid() = client_id);

drop policy if exists "Client request matches select own" on public.client_request_matches;
create policy "Client request matches select own"
  on public.client_request_matches
  for select
  using (
    exists (
      select 1
      from public.client_requests r
      where r.id = client_request_matches.request_id
        and r.client_id = auth.uid()
    )
  );

drop policy if exists "Client request events select own" on public.client_request_events;
create policy "Client request events select own"
  on public.client_request_events
  for select
  using (
    exists (
      select 1
      from public.client_requests r
      where r.id = client_request_events.request_id
        and r.client_id = auth.uid()
    )
  );

drop policy if exists "Client request events insert own" on public.client_request_events;
create policy "Client request events insert own"
  on public.client_request_events
  for insert
  with check (
    exists (
      select 1
      from public.client_requests r
      where r.id = client_request_events.request_id
        and r.client_id = auth.uid()
    )
  );
