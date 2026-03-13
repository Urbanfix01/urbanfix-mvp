create extension if not exists pgcrypto;
alter table if exists public.profiles
  add column if not exists profile_published boolean default true,
  add column if not exists public_likes_count integer not null default 0,
  add column if not exists work_photo_urls text[] not null default '{}'::text[];
update public.profiles
set
  profile_published = coalesce(profile_published, true),
  public_likes_count = coalesce(public_likes_count, 0),
  work_photo_urls = coalesce(work_photo_urls, '{}'::text[]);
do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  begin
    alter table public.profiles
      alter column profile_published set default true,
      alter column profile_published set not null,
      alter column public_likes_count set default 0,
      alter column public_likes_count set not null,
      alter column work_photo_urls set default '{}'::text[],
      alter column work_photo_urls set not null;
  exception
    when undefined_column then null;
  end;

  begin
    alter table public.profiles
      add constraint profiles_public_likes_count_nonneg_chk
      check (public_likes_count >= 0);
  exception
    when duplicate_object then null;
  end;
end $$;
create table if not exists public.profile_likes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  session_key text,
  created_at timestamptz not null default now(),
  constraint profile_likes_identity_chk check (user_id is not null or coalesce(session_key, '') <> '')
);
create unique index if not exists profile_likes_profile_user_uidx
  on public.profile_likes (profile_id, user_id)
  where user_id is not null;
create unique index if not exists profile_likes_profile_session_uidx
  on public.profile_likes (profile_id, session_key)
  where session_key is not null;
create index if not exists profile_likes_profile_created_idx
  on public.profile_likes (profile_id, created_at desc);
create or replace function public.sync_profile_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
begin
  target_profile_id := coalesce(new.profile_id, old.profile_id);

  if target_profile_id is not null then
    update public.profiles
    set public_likes_count = (
      select count(*)
      from public.profile_likes
      where profile_id = target_profile_id
    )
    where id = target_profile_id;
  end if;

  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_sync_profile_like_count on public.profile_likes;
create trigger trg_sync_profile_like_count
after insert or delete or update of profile_id
on public.profile_likes
for each row
execute function public.sync_profile_like_count();
update public.profiles p
set public_likes_count = coalesce(l.likes_count, 0)
from (
  select profile_id, count(*)::integer as likes_count
  from public.profile_likes
  group by profile_id
) l
where p.id = l.profile_id;
update public.profiles
set public_likes_count = 0
where public_likes_count is null;
