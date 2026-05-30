-- Baseline access columns used by admin review and public visibility gates.
-- New profiles remain blocked until an admin grants access.

alter table if exists public.profiles
  add column if not exists access_granted boolean not null default false,
  add column if not exists access_granted_at timestamptz;

alter table if exists public.profiles
  alter column access_granted set default false;

update public.profiles
set access_granted = false
where access_granted is null;
