-- Reemplaza la RPC para aprobar presupuestos y asegura permisos de ejecucion
create or replace function approve_quote(quote_id uuid)
returns quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row quotes;
begin
  update quotes
  set status = 'approved',
      updated_at = now()
  where id = quote_id
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'No se pudo actualizar el presupuesto.';
  end if;

  return updated_row;
end;
$$;

grant execute on function approve_quote(uuid) to anon, authenticated;
