alter table if exists public.profiles
  add column if not exists facebook_url text;

alter table if exists public.profiles
  add column if not exists instagram_url text;

alter table if exists public.profiles
  add column if not exists profile_published boolean;

alter table if exists public.profiles
  add column if not exists profile_published_at timestamptz;

update public.profiles
set profile_published = false
where profile_published is null;

alter table if exists public.profiles
  alter column profile_published set default false;

alter table if exists public.profiles
  alter column profile_published set not null;

create index if not exists idx_profiles_profile_published
  on public.profiles (profile_published)
  where profile_published = true;
