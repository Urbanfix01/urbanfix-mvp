-- Tabla de adjuntos para presupuestos
create table if not exists quote_attachments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  user_id uuid not null,
  file_url text not null,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists quote_attachments_quote_id_idx on quote_attachments (quote_id);

alter table quote_attachments enable row level security;

drop policy if exists "Public Read Quote Attachments" on quote_attachments;
drop policy if exists "Insert Quote Attachments" on quote_attachments;
drop policy if exists "Delete Quote Attachments" on quote_attachments;

create policy "Public Read Quote Attachments"
on quote_attachments for select
using (true);

create policy "Insert Quote Attachments"
on quote_attachments for insert
with check (auth.uid() = user_id);

create policy "Delete Quote Attachments"
on quote_attachments for delete
using (auth.uid() = user_id);
