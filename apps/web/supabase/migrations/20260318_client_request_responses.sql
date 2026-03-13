alter table public.client_requests
  add column if not exists province text,
  add column if not exists radius_km integer not null default 20,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists photo_urls text[];
alter table public.client_request_matches
  add column if not exists response_type text,
  add column if not exists response_message text,
  add column if not exists visit_eta_hours integer,
  add column if not exists submitted_at timestamptz;
update public.client_request_matches
set
  response_type = case
    when coalesce(response_type, '') <> '' then response_type
    when price_ars is not null then 'direct_quote'
    else null
  end,
  submitted_at = coalesce(submitted_at, updated_at)
where quote_status = 'submitted';
