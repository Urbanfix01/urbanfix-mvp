-- Comunidad UrbanFix: me gusta reales por publicacion.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.community_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists community_post_likes_post_user_uidx
  on public.community_post_likes (post_id, user_id);

create index if not exists community_post_likes_post_idx
  on public.community_post_likes (post_id);

create index if not exists community_post_likes_user_idx
  on public.community_post_likes (user_id, created_at desc);

create or replace function public.sync_community_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post uuid;
begin
  target_post := coalesce(new.post_id, old.post_id);

  if target_post is null then
    return coalesce(new, old);
  end if;

  update public.community_posts p
  set likes_count = (
    select count(*)::int
    from public.community_post_likes l
    where l.post_id = target_post
  )
  where p.id = target_post;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_community_post_likes_count on public.community_post_likes;

create trigger trg_sync_community_post_likes_count
after insert or delete
on public.community_post_likes
for each row
execute function public.sync_community_post_likes_count();

update public.community_posts p
set likes_count = coalesce(l.likes_count, 0)
from (
  select post_id, count(*)::int as likes_count
  from public.community_post_likes
  group by post_id
) l
where p.id = l.post_id;

update public.community_posts
set likes_count = 0
where likes_count is null;

alter table public.community_post_likes enable row level security;

drop policy if exists "Public read community post likes" on public.community_post_likes;
create policy "Public read community post likes"
  on public.community_post_likes for select
  using (true);

drop policy if exists "Users insert own community post likes" on public.community_post_likes;
create policy "Users insert own community post likes"
  on public.community_post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own community post likes" on public.community_post_likes;
create policy "Users delete own community post likes"
  on public.community_post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

grant select on public.community_post_likes to anon, authenticated;
grant insert, delete on public.community_post_likes to authenticated;

revoke execute on function public.sync_community_post_likes_count() from public, anon, authenticated;

notify pgrst, 'reload schema';
