alter table if exists public.profiles
  add column if not exists instagram_post_url text,
  add column if not exists facebook_post_url text;
