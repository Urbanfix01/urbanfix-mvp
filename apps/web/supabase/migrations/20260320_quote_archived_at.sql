alter table public.quotes
  add column if not exists archived_at timestamptz;
create index if not exists idx_quotes_archived_at
  on public.quotes (archived_at desc);
