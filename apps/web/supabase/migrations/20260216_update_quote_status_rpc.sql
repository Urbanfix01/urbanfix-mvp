-- RPC para actualizar el estado del presupuesto con validacion de propietario
create or replace function public.update_quote_status(quote_id uuid, next_status text)
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

grant execute on function public.update_quote_status(uuid, text) to authenticated;
