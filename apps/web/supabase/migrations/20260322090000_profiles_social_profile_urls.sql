alter table if exists public.profiles
  add column if not exists instagram_profile_url text,
  add column if not exists facebook_profile_url text;

update public.profiles
set instagram_profile_url = instagram_post_url
where coalesce(trim(instagram_profile_url), '') = ''
  and coalesce(trim(instagram_post_url), '') <> ''
  and instagram_post_url ~* '^https?://(www\.)?instagram\.com/[^/?#]+/?$';

update public.profiles
set facebook_profile_url = facebook_post_url
where coalesce(trim(facebook_profile_url), '') = ''
  and coalesce(trim(facebook_post_url), '') <> ''
  and facebook_post_url ~* '^https?://((www|m)\.)?facebook\.com/[^/?#]+/?$';
