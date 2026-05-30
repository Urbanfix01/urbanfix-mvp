-- Campos extra para perfil de tecnicos
alter table public.profiles
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists coverage_area text,
  add column if not exists working_hours text,
  add column if not exists specialties text,
  add column if not exists certifications text,
  add column if not exists tax_id text,
  add column if not exists tax_status text,
  add column if not exists payment_method text,
  add column if not exists bank_alias text,
  add column if not exists default_currency text,
  add column if not exists default_tax_rate numeric,
  add column if not exists default_discount numeric,
  add column if not exists avatar_url text;
