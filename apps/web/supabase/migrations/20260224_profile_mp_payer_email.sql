-- MercadoPago payer email (optional override)

alter table public.profiles
  add column if not exists mp_payer_email text;
