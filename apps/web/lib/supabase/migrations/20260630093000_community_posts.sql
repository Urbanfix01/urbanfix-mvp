-- Comunidad UrbanFix: posteos y publicidades de tecnicos/empresas
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text not null default 'tecnico',
  author_avatar_url text null,
  post_type text not null default 'post',
  title text null,
  body text not null,
  category text null,
  location text null,
  coordinates jsonb null,
  contact_url text null,
  tags text[] not null default '{}',
  media_items jsonb not null default '[]'::jsonb,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_author_role_chk check (author_role in ('tecnico', 'empresa')),
  constraint community_posts_post_type_chk check (post_type in ('post', 'publicidad')),
  constraint community_posts_body_len_chk check (length(trim(body)) >= 4),
  constraint community_posts_likes_nonneg_chk check (likes_count >= 0),
  constraint community_posts_comments_nonneg_chk check (comments_count >= 0)
);

alter table if exists public.community_posts
  add column if not exists media_items jsonb not null default '[]'::jsonb;

alter table if exists public.community_posts
  add column if not exists coordinates jsonb null;

create index if not exists community_posts_published_created_idx
  on public.community_posts (is_published, created_at desc);

create index if not exists community_posts_author_idx
  on public.community_posts (author_id, created_at desc);

create index if not exists community_posts_type_idx
  on public.community_posts (post_type, created_at desc);

create or replace function public.touch_community_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_community_posts_updated_at on public.community_posts;

create trigger trg_touch_community_posts_updated_at
before update on public.community_posts
for each row
execute function public.touch_community_posts_updated_at();

alter table public.community_posts enable row level security;

drop policy if exists "Public read published community posts" on public.community_posts;
create policy "Public read published community posts"
  on public.community_posts for select
  using (is_published = true);

drop policy if exists "Users insert own community posts" on public.community_posts;
create policy "Users insert own community posts"
  on public.community_posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Users update own community posts" on public.community_posts;
create policy "Users update own community posts"
  on public.community_posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Users delete own community posts" on public.community_posts;
create policy "Users delete own community posts"
  on public.community_posts for delete
  to authenticated
  using (auth.uid() = author_id);

grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;

notify pgrst, 'reload schema';
