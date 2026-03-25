alter table if exists public.client_requests
  add column if not exists province text;

alter table if exists public.client_requests
  add column if not exists radius_km integer not null default 20;

alter table if exists public.client_requests
  add column if not exists location_lat double precision;

alter table if exists public.client_requests
  add column if not exists location_lng double precision;

alter table if exists public.client_requests
  add column if not exists photo_urls text[] not null default '{}'::text[];

alter table if exists public.client_request_matches
  add column if not exists response_type text;

alter table if exists public.client_request_matches
  add column if not exists response_message text;

alter table if exists public.client_request_matches
  add column if not exists visit_eta_hours integer;

alter table if exists public.client_request_matches
  add column if not exists quote_id uuid references public.quotes(id) on delete set null;

do $$
begin
  begin
    alter table public.client_request_matches
      add constraint client_request_matches_response_type_chk
      check (response_type is null or response_type in ('application', 'direct_quote'));
  exception
    when duplicate_object then null;
  end;
end $$;

create index if not exists idx_client_request_matches_quote
  on public.client_request_matches (quote_id);

alter table if exists public.quotes
  add column if not exists client_request_id uuid references public.client_requests(id) on delete set null;

alter table if exists public.quotes
  add column if not exists client_request_match_id uuid references public.client_request_matches(id) on delete set null;

create index if not exists idx_quotes_client_request
  on public.quotes (client_request_id);

create index if not exists idx_quotes_client_request_match
  on public.quotes (client_request_match_id);
