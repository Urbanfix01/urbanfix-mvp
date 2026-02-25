alter table public.quotes
  add column if not exists discount_percent numeric default 0;
