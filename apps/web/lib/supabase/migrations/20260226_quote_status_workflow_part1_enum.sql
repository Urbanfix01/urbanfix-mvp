-- Parte 1: preparar enum de estados (ejecutar primero)
-- Importante: este bloque no crea funciones que usen valores nuevos.

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
