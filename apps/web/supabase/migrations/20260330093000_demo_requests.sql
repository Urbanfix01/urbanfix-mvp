create extension if not exists pgcrypto;

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'download-page',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'closed')),
  full_name text not null,
  email text not null,
  phone text null,
  company_name text null,
  role text null,
  city text null,
  team_size text null,
  platform_interest text null,
  use_case text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);

create index if not exists demo_requests_email_idx
  on public.demo_requests (email);

alter table public.demo_requests enable row level security;

create or replace function public.touch_demo_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_demo_requests_updated_at on public.demo_requests;

create trigger touch_demo_requests_updated_at
before update on public.demo_requests
for each row execute function public.touch_demo_requests_updated_at();