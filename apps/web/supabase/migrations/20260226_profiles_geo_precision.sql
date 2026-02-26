-- Structured geo fields for technician visibility and matching
-- Safe to run multiple times

alter table if exists public.profiles
  add column if not exists service_province text,
  add column if not exists service_district text,
  add column if not exists service_city text,
  add column if not exists coverage_zones text[] not null default '{}';

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  update public.profiles
  set service_city = city
  where (service_city is null or service_city = '')
    and city is not null
    and city <> '';
exception
  when undefined_column then
    null;
end $$;
