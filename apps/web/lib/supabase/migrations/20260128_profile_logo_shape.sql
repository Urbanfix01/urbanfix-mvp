-- Formato de logo: auto | round | square | rect
alter table public.profiles
  add column if not exists logo_shape text;
