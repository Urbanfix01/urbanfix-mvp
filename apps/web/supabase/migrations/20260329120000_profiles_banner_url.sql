-- Dedicated banner image for public technician profiles
-- Safe to run multiple times

alter table if exists public.profiles
  add column if not exists banner_url text;