create extension if not exists pgcrypto;

create table if not exists public.roadmap_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done', 'blocked')),
  area text not null default 'web' check (area in ('web', 'mobile', 'backend', 'ops')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  owner text,
  eta_date date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roadmap_feedback (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmap_updates(id) on delete cascade,
  body text not null,
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists roadmap_updates_status_idx on public.roadmap_updates(status);
create index if not exists roadmap_updates_area_idx on public.roadmap_updates(area);
create index if not exists roadmap_updates_created_at_idx on public.roadmap_updates(created_at desc);
create index if not exists roadmap_feedback_roadmap_id_idx on public.roadmap_feedback(roadmap_id);
create index if not exists roadmap_feedback_created_at_idx on public.roadmap_feedback(created_at desc);

create or replace function public.roadmap_updates_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_roadmap_updates_set_updated_at on public.roadmap_updates;

create trigger trg_roadmap_updates_set_updated_at
before update on public.roadmap_updates
for each row
execute function public.roadmap_updates_set_updated_at();

alter table public.roadmap_updates enable row level security;
alter table public.roadmap_feedback enable row level security;
