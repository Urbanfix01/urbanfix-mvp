alter table public.analytics_events
  add column if not exists event_name text,
  add column if not exists event_context jsonb not null default '{}'::jsonb;

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name, created_at desc)
  where event_name is not null;

create index if not exists analytics_events_funnel_created_idx
  on public.analytics_events (created_at desc)
  where event_type = 'funnel';
