-- Ensure profile branding/contact fields exist for onboarding + templates
-- (Safe to run multiple times)

alter table if exists public.profiles
  add column if not exists company_logo_url text,
  add column if not exists company_address text,
  add column if not exists phone text,
  add column if not exists full_name text,
  add column if not exists business_name text;

