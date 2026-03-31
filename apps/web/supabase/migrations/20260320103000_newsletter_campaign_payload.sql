alter table if exists public.newsletter_campaigns
  add column if not exists hero_image_url text,
  add column if not exists hero_image_alt text,
  add column if not exists quick_links jsonb not null default '[]'::jsonb;
