create table if not exists public.flow_diagram_states (
  diagram_key text primary key,
  nodes jsonb not null default '[]'::jsonb,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists flow_diagram_states_updated_at_idx
  on public.flow_diagram_states(updated_at desc);

create or replace function public.flow_diagram_states_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_flow_diagram_states_set_updated_at on public.flow_diagram_states;

create trigger trg_flow_diagram_states_set_updated_at
before update on public.flow_diagram_states
for each row
execute function public.flow_diagram_states_set_updated_at();

alter table public.flow_diagram_states enable row level security;
