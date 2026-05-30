alter table if exists public.quotes
  add column if not exists location_address text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;
