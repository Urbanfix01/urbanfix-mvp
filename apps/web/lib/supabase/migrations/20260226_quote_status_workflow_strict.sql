-- Flujo estricto de estados de presupuestos:
-- - mode='process': solo transiciones permitidas del flujo cliente-tecnico.
-- - mode='manual': permite override manual del tecnico.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'quote_status_enum'
  ) then
    execute $sql$
      create type public.quote_status_enum as enum (
        'draft',
        'sent',
        'revision_requested',
        'approved',
        'scheduled',
        'in_progress',
        'completed',
        'paid',
        'cancelled'
      )
    $sql$;
  end if;
end
$$;

alter type public.quote_status_enum add value if not exists 'sent';
alter type public.quote_status_enum add value if not exists 'revision_requested';
alter type public.quote_status_enum add value if not exists 'scheduled';
alter type public.quote_status_enum add value if not exists 'in_progress';
alter type public.quote_status_enum add value if not exists 'cancelled';

create table if not exists public.quote_status_history (
  id bigint generated always as identity primary key,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  from_status public.quote_status_enum not null,
  to_status public.quote_status_enum not null,
  transition_mode text not null check (transition_mode in ('process', 'manual')),
  note text null,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);

grant select on table public.quote_status_history to authenticated;

create index if not exists quote_status_history_quote_created_idx
  on public.quote_status_history (quote_id, created_at desc);

alter table public.quote_status_history enable row level security;

drop policy if exists "Users select own quote status history" on public.quote_status_history;
create policy "Users select own quote status history"
  on public.quote_status_history
  for select
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_status_history.quote_id
        and q.user_id = auth.uid()
    )
  );

drop function if exists public.canonical_quote_status(text);

create or replace function public.canonical_quote_status(p_status text)
returns text
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  normalized := lower(trim(coalesce(p_status, '')));

  if normalized = '' or normalized in ('draft', 'borrador') then
    return 'draft';
  end if;
  if normalized in ('sent', 'presented', 'presentado', 'pending', 'pendiente', 'client_review') then
    return 'sent';
  end if;
  if normalized in ('revision_requested', 'revision', 'changes_requested', 'cambios_solicitados', 'rework') then
    return 'revision_requested';
  end if;
  if normalized in ('approved', 'aprobado', 'accepted') then
    return 'approved';
  end if;
  if normalized in ('scheduled', 'programado', 'agendado') then
    return 'scheduled';
  end if;
  if normalized in ('in_progress', 'inprogress', 'en_progreso', 'working') then
    return 'in_progress';
  end if;
  if normalized in ('completed', 'completado', 'finalizado', 'finalizados') then
    return 'completed';
  end if;
  if normalized in ('paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged') then
    return 'paid';
  end if;
  if normalized in ('cancelled', 'canceled', 'cancelado', 'rechazado', 'rejected') then
    return 'cancelled';
  end if;

  raise exception 'Estado invalido: %', p_status;
end;
$$;

drop function if exists public.quote_process_transition_allowed(public.quote_status_enum, public.quote_status_enum);
drop function if exists public.quote_process_transition_allowed(text, text);

create or replace function public.quote_process_transition_allowed(
  p_current text,
  p_next text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_current = p_next then true
    when p_current = 'draft' and p_next = 'sent' then true
    when p_current = 'sent' and p_next in ('approved', 'revision_requested', 'cancelled') then true
    when p_current = 'revision_requested' and p_next in ('sent', 'cancelled') then true
    when p_current = 'approved' and p_next in ('scheduled', 'cancelled') then true
    when p_current = 'scheduled' and p_next in ('in_progress', 'cancelled') then true
    when p_current = 'in_progress' and p_next in ('completed', 'cancelled') then true
    when p_current = 'completed' and p_next = 'paid' then true
    else false
  end;
$$;

drop function if exists public.update_quote_status(uuid, text);

create or replace function public.update_quote_status(
  quote_id uuid,
  next_status text,
  mode text default 'process',
  note text default null
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.quotes;
  current_status text;
  desired_status text;
  mode_value text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  mode_value := lower(trim(coalesce(mode, '')));
  if mode_value not in ('process', 'manual') then
    raise exception 'Modo invalido: %', mode;
  end if;

  select q.*
    into current_row
  from public.quotes q
  where q.id = quote_id
  for update;

  if current_row.id is null then
    raise exception 'Presupuesto no encontrado.';
  end if;

  if current_row.user_id is distinct from auth.uid() then
    raise exception 'No autorizado.';
  end if;

  current_status := public.canonical_quote_status(current_row.status::text);
  desired_status := public.canonical_quote_status(next_status);

  if mode_value = 'process'
     and not public.quote_process_transition_allowed(current_status, desired_status) then
    raise exception 'Transicion invalida en modo process: % -> %', current_status, desired_status;
  end if;

  if current_status = desired_status then
    return current_row;
  end if;

  update public.quotes
  set status = desired_status::public.quote_status_enum,
      updated_at = now(),
      completed_at = case
        when desired_status = 'completed' and completed_at is null then now()
        else completed_at
      end
  where id = quote_id
  returning * into current_row;

  insert into public.quote_status_history (
    quote_id,
    from_status,
    to_status,
    transition_mode,
    note,
    actor_id
  ) values (
    quote_id,
    current_status::public.quote_status_enum,
    desired_status::public.quote_status_enum,
    mode_value,
    note,
    auth.uid()
  );

  return current_row;
end;
$$;

grant execute on function public.update_quote_status(uuid, text, text, text) to authenticated;
