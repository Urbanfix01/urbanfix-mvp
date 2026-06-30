-- Hardening from Supabase Advisors:
-- public buckets can serve object URLs without broad SELECT policies on storage.objects.
-- Removing these policies prevents clients from listing all files in public buckets.

drop policy if exists U&"Logos son p\00FAblicos" on storage.objects;
drop policy if exists "Public Access Assets" on storage.objects;
drop policy if exists "Public Access to Images" on storage.objects;
