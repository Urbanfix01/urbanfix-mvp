-- Likes publicos para perfiles tecnicos
-- Safe to run multiple times

create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists public_likes_count integer not null default 0;

create table if not exists public.profile_likes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete cascade,
  session_key text null,
  created_at timestamptz not null default now(),
  constraint profile_likes_actor_chk check (
    user_id is not null or (session_key is not null and length(trim(session_key)) > 0)
  )
);

create unique index if not exists profile_likes_profile_user_uidx
  on public.profile_likes (profile_id, user_id)
  where user_id is not null;

create unique index if not exists profile_likes_profile_session_uidx
  on public.profile_likes (profile_id, session_key)
  where session_key is not null;

create index if not exists profile_likes_profile_idx
  on public.profile_likes (profile_id);

create or replace function public.sync_profile_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile uuid;
begin
  target_profile := coalesce(new.profile_id, old.profile_id);

  if target_profile is null then
    return coalesce(new, old);
  end if;

  update public.profiles p
  set public_likes_count = (
    select count(*)::int
    from public.profile_likes l
    where l.profile_id = target_profile
  )
  where p.id = target_profile;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_profile_likes_sync_count on public.profile_likes;

create trigger trg_profile_likes_sync_count
after insert or delete
on public.profile_likes
for each row
execute function public.sync_profile_likes_count();

update public.profiles p
set public_likes_count = coalesce(l.likes_count, 0)
from (
  select profile_id, count(*)::int as likes_count
  from public.profile_likes
  group by profile_id
) l
where p.id = l.profile_id;

update public.profiles
set public_likes_count = 0
where public_likes_count is null;

alter table public.profile_likes enable row level security;

drop policy if exists "Public read profile likes" on public.profile_likes;
create policy "Public read profile likes"
  on public.profile_likes for select
  using (true);

drop policy if exists "Users insert own profile likes" on public.profile_likes;
create policy "Users insert own profile likes"
  on public.profile_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own profile likes" on public.profile_likes;
create policy "Users delete own profile likes"
  on public.profile_likes for delete
  using (auth.uid() = user_id);
