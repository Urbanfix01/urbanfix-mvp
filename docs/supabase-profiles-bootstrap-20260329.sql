-- UrbanFix
-- Bootstrap / repair de profiles para que el alta, edición y publicación de perfiles funcione bien.
-- Seguro para ejecutar varias veces en Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists business_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists address text,
  add column if not exists company_address text,
  add column if not exists city text,
  add column if not exists coverage_area text,
  add column if not exists working_hours text,
  add column if not exists specialties text,
  add column if not exists certifications text,
  add column if not exists tax_id text,
  add column if not exists tax_status text,
  add column if not exists payment_method text,
  add column if not exists bank_alias text,
  add column if not exists default_currency text,
  add column if not exists default_tax_rate numeric,
  add column if not exists default_discount numeric,
  add column if not exists avatar_url text,
  add column if not exists company_logo_url text,
  add column if not exists logo_shape text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists access_granted boolean default false,
  add column if not exists access_granted_at timestamptz,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists mp_payer_email text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_seen_path text,
  add column if not exists service_lat double precision,
  add column if not exists service_lng double precision,
  add column if not exists service_location_name text,
  add column if not exists service_location_precision text,
  add column if not exists service_radius_km integer default 20,
  add column if not exists service_province text,
  add column if not exists service_district text,
  add column if not exists service_city text,
  add column if not exists coverage_zones text[] default '{}'::text[],
  add column if not exists profile_published boolean default false,
  add column if not exists profile_published_at timestamptz,
  add column if not exists public_rating numeric(3,2),
  add column if not exists public_reviews_count integer default 0,
  add column if not exists completed_jobs_total integer default 0,
  add column if not exists references_summary text,
  add column if not exists client_recommendations text,
  add column if not exists achievement_badges text[] default '{}'::text[],
  add column if not exists public_likes_count integer default 0;

alter table if exists public.profiles
  alter column access_granted set default false,
  alter column service_radius_km set default 20,
  alter column profile_published set default false,
  alter column public_reviews_count set default 0,
  alter column completed_jobs_total set default 0,
  alter column public_likes_count set default 0,
  alter column coverage_zones set default '{}'::text[],
  alter column achievement_badges set default '{}'::text[];

update public.profiles
set
  access_granted = coalesce(access_granted, false),
  service_radius_km = coalesce(service_radius_km, 20),
  profile_published = coalesce(profile_published, false),
  public_reviews_count = coalesce(public_reviews_count, 0),
  completed_jobs_total = coalesce(completed_jobs_total, 0),
  public_likes_count = coalesce(public_likes_count, 0),
  coverage_zones = coalesce(coverage_zones, '{}'::text[]),
  achievement_badges = coalesce(achievement_badges, '{}'::text[])
where true;

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  update public.profiles
  set service_city = city
  where (service_city is null or service_city = '')
    and city is not null
    and city <> '';

  begin
    alter table public.profiles
      add constraint profiles_public_rating_range_chk
      check (public_rating is null or (public_rating >= 0 and public_rating <= 5));
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_public_reviews_count_nonneg_chk
      check (public_reviews_count >= 0);
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_completed_jobs_total_nonneg_chk
      check (completed_jobs_total >= 0);
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_service_location_precision_chk
      check (service_location_precision is null or service_location_precision in ('exact', 'approx'));
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_logo_shape_chk
      check (logo_shape is null or logo_shape in ('auto', 'round', 'square', 'rect'));
  exception
    when duplicate_object then null;
  end;
end $$;

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at desc);

create index if not exists profiles_profile_published_idx
  on public.profiles (profile_published);

create index if not exists profiles_service_coords_idx
  on public.profiles (service_lat, service_lng);

alter table public.profiles enable row level security;

drop policy if exists "Public Read Profiles" on public.profiles;
drop policy if exists "Public read published profiles" on public.profiles;
drop policy if exists "Users select own profiles" on public.profiles;
drop policy if exists "Users update own profiles" on public.profiles;
drop policy if exists "Users insert own profiles" on public.profiles;

create policy "Users select own profiles"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profiles"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users insert own profiles"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Public read published profiles"
  on public.profiles for select
  using (coalesce(access_granted, false) = true and coalesce(profile_published, false) = true);

create table if not exists public.access_codes (
  code text primary key,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  note text
);

alter table public.access_codes enable row level security;

drop trigger if exists require_access_code on auth.users;

create or replace function public.redeem_access_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  valid boolean;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  if p_code is null or trim(p_code) = '' then
    raise exception 'Codigo requerido';
  end if;

  select true into valid
  from public.access_codes
  where upper(code) = upper(trim(p_code))
    and active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if not valid then
    raise exception 'Codigo de acceso invalido';
  end if;

  insert into public.profiles (id, access_granted, access_granted_at)
  values (uid, true, now())
  on conflict (id)
  do update set access_granted = true, access_granted_at = now();

  return true;
end;
$$;

grant execute on function public.redeem_access_code(text) to authenticated;

create or replace function public.start_free_trial()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = uid
      and trial_started_at is not null
  ) then
    raise exception 'La prueba gratuita ya fue utilizada';
  end if;

  insert into public.profiles (id, trial_started_at, trial_ends_at)
  values (uid, now(), now() + interval '7 days')
  on conflict (id)
  do update set
    trial_started_at = coalesce(public.profiles.trial_started_at, now()),
    trial_ends_at = now() + interval '7 days';

  return true;
end;
$$;

grant execute on function public.start_free_trial() to authenticated;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'revoke update (access_granted, access_granted_at) on public.profiles from authenticated';
    execute 'revoke update (access_granted, access_granted_at) on public.profiles from anon';
  end if;
end $$;

-- Si vas a usar likes públicos en perfiles, ejecuta además la migración específica:
-- apps/web/lib/supabase/migrations/20260317_profile_likes.sql