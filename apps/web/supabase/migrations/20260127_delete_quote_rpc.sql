-- RPC para eliminar presupuesto y sus dependencias
create or replace function public.delete_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  select user_id into owner_id
  from quotes
  where id = p_quote_id;

  if owner_id is null then
    -- permitir limpieza de presupuestos huérfanos solo para usuarios autenticados
    -- (si no existe el presupuesto, lanza error igual)
    if not exists (select 1 from quotes where id = p_quote_id) then
      raise exception 'Presupuesto no encontrado.';
    end if;
  elsif owner_id <> auth.uid() then
    raise exception 'No autorizado.';
  end if;

  delete from quote_items where quote_id = p_quote_id;
  delete from quote_attachments where quote_id = p_quote_id;
  delete from quotes where id = p_quote_id;
end;
$$;

grant execute on function public.delete_quote(uuid) to authenticated;
