do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'quote_status_enum'
  ) then
    execute 'alter type public.quote_status_enum add value if not exists ''draft''';
    execute 'alter type public.quote_status_enum add value if not exists ''pending''';
    execute 'alter type public.quote_status_enum add value if not exists ''sent''';
    execute 'alter type public.quote_status_enum add value if not exists ''presented''';
    execute 'alter type public.quote_status_enum add value if not exists ''approved''';
    execute 'alter type public.quote_status_enum add value if not exists ''scheduled''';
    execute 'alter type public.quote_status_enum add value if not exists ''in_progress''';
    execute 'alter type public.quote_status_enum add value if not exists ''completed''';
    execute 'alter type public.quote_status_enum add value if not exists ''paid''';
    execute 'alter type public.quote_status_enum add value if not exists ''rejected''';
    execute 'alter type public.quote_status_enum add value if not exists ''discarded''';
    execute 'alter type public.quote_status_enum add value if not exists ''cancelled''';
    execute 'alter type public.quote_status_enum add value if not exists ''expired''';
  end if;
end $$;

drop function if exists public.update_quote_status(uuid, text);

create or replace function public.update_quote_status(
  quote_id uuid,
  next_status text,
  mode text default 'manual',
  note text default null
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.quotes;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  update public.quotes
  set status = next_status::public.quote_status_enum,
      updated_at = now()
  where id = quote_id
    and (user_id = auth.uid() or user_id is null)
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'No se pudo actualizar el estado.';
  end if;

  return updated_row;
end;
$$;

grant execute on function public.update_quote_status(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
