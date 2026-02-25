-- Agenda de tecnicos: fechas de inicio y fin para trabajos aprobados
alter table public.quotes
  add column if not exists start_date date,
  add column if not exists end_date date;
