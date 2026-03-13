create extension if not exists pgcrypto;

alter table if exists public.quotes
  add column if not exists client_request_id uuid,
  add column if not exists client_request_match_id uuid;

do $$
begin
  if to_regclass('public.quotes') is null then
    return;
  end if;

  begin
    alter table public.quotes
      add constraint quotes_client_request_id_fkey
      foreign key (client_request_id)
      references public.client_requests(id)
      on delete set null;
  exception
    when duplicate_object then null;
  end;

  begin
    alter table public.quotes
      add constraint quotes_client_request_match_id_fkey
      foreign key (client_request_match_id)
      references public.client_request_matches(id)
      on delete set null;
  exception
    when duplicate_object then null;
  end;
end $$;

create index if not exists idx_quotes_client_request_id
  on public.quotes (client_request_id);

create index if not exists idx_quotes_client_request_match_id
  on public.quotes (client_request_match_id);

create table if not exists public.client_request_feedback (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null references public.client_requests(id) on delete cascade,
  client_request_match_id uuid references public.client_request_matches(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  client_id uuid not null references auth.users(id) on delete cascade,
  technician_id uuid not null references public.profiles(id) on delete cascade,
  technician_name_snapshot text,
  client_name_snapshot text,
  rating integer not null,
  comment text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_request_feedback_rating_chk check (rating between 1 and 5),
  constraint client_request_feedback_comment_chk check (char_length(btrim(comment)) >= 6),
  constraint client_request_feedback_unique_per_request unique (client_request_id, client_id)
);

create index if not exists idx_client_request_feedback_client_request
  on public.client_request_feedback (client_request_id, updated_at desc);

create index if not exists idx_client_request_feedback_technician_public
  on public.client_request_feedback (technician_id, is_public, updated_at desc);

create index if not exists idx_client_request_feedback_client
  on public.client_request_feedback (client_id, updated_at desc);

create or replace function public.client_request_feedback_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_request_feedback_touch_updated_at on public.client_request_feedback;

create trigger trg_client_request_feedback_touch_updated_at
before update on public.client_request_feedback
for each row
execute function public.client_request_feedback_touch_updated_at();

alter table public.client_request_feedback enable row level security;

drop policy if exists "Client request feedback select own" on public.client_request_feedback;
create policy "Client request feedback select own"
  on public.client_request_feedback
  for select
  using (auth.uid() = client_id or auth.uid() = technician_id);

drop policy if exists "Client request feedback insert own" on public.client_request_feedback;
create policy "Client request feedback insert own"
  on public.client_request_feedback
  for insert
  with check (auth.uid() = client_id);

drop policy if exists "Client request feedback update own" on public.client_request_feedback;
create policy "Client request feedback update own"
  on public.client_request_feedback
  for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);
