-- Comunidad UrbanFix: comentarios reales por publicacion.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_avatar_url text null,
  body text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_post_comments_body_len_chk check (length(trim(body)) >= 2)
);

create index if not exists community_post_comments_post_idx
  on public.community_post_comments (post_id, created_at asc);

create index if not exists community_post_comments_author_idx
  on public.community_post_comments (author_id, created_at desc);

create or replace function public.touch_community_post_comments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_community_post_comments_updated_at on public.community_post_comments;

create trigger trg_touch_community_post_comments_updated_at
before update on public.community_post_comments
for each row
execute function public.touch_community_post_comments_updated_at();

create or replace function public.sync_community_post_comments_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
      set comments_count = comments_count + 1
      where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
      set comments_count = greatest(0, comments_count - 1)
      where id = old.post_id;
    return old;
  elsif tg_op = 'UPDATE' and old.is_published is distinct from new.is_published then
    update public.community_posts
      set comments_count = greatest(0, comments_count + case when new.is_published then 1 else -1 end)
      where id = new.post_id;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_community_post_comments_count_insert on public.community_post_comments;
drop trigger if exists trg_sync_community_post_comments_count_delete on public.community_post_comments;
drop trigger if exists trg_sync_community_post_comments_count_update on public.community_post_comments;

create trigger trg_sync_community_post_comments_count_insert
after insert on public.community_post_comments
for each row
when (new.is_published = true)
execute function public.sync_community_post_comments_count();

create trigger trg_sync_community_post_comments_count_delete
after delete on public.community_post_comments
for each row
when (old.is_published = true)
execute function public.sync_community_post_comments_count();

create trigger trg_sync_community_post_comments_count_update
after update of is_published on public.community_post_comments
for each row
execute function public.sync_community_post_comments_count();

alter table public.community_post_comments enable row level security;

drop policy if exists "Public read published community comments" on public.community_post_comments;
create policy "Public read published community comments"
  on public.community_post_comments for select
  using (is_published = true);

drop policy if exists "Users insert own community comments" on public.community_post_comments;
create policy "Users insert own community comments"
  on public.community_post_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Users update own community comments" on public.community_post_comments;
create policy "Users update own community comments"
  on public.community_post_comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Users delete own community comments" on public.community_post_comments;
create policy "Users delete own community comments"
  on public.community_post_comments for delete
  to authenticated
  using (auth.uid() = author_id);

grant select on public.community_post_comments to anon, authenticated;
grant insert, update, delete on public.community_post_comments to authenticated;

notify pgrst, 'reload schema';
