do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'quote_status_enum'
  ) then
    execute 'alter type public.quote_status_enum add value if not exists ''scheduled''';
    execute 'alter type public.quote_status_enum add value if not exists ''in_progress''';
    execute 'alter type public.quote_status_enum add value if not exists ''rejected''';
    execute 'alter type public.quote_status_enum add value if not exists ''discarded''';
    execute 'alter type public.quote_status_enum add value if not exists ''cancelled''';
    execute 'alter type public.quote_status_enum add value if not exists ''expired''';
  end if;
end $$;
