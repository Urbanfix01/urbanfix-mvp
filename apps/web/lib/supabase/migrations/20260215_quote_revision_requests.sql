-- RPC para solicitar revisiones de items en presupuestos (cliente publico)
create or replace function request_quote_revision(quote_id uuid, items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  client_name text;
  items_count int;
begin
  select user_id, client_name
    into target_user_id, client_name
  from quotes
  where id = quote_id;

  if target_user_id is null then
    raise exception 'Quote not found';
  end if;

  items_count := case
    when items is null then 0
    when jsonb_typeof(items) = 'array' then jsonb_array_length(items)
    else 0
  end;

  insert into notifications (user_id, type, title, body, data)
  values (
    target_user_id,
    'quote_revision_request',
    'Solicitud de revision',
    case
      when items_count = 0 then 'El cliente solicito revisar el presupuesto.'
      when items_count = 1 then 'El cliente marco 1 item para revisar.'
      else 'El cliente marco ' || items_count || ' items para revisar.'
    end,
    jsonb_build_object(
      'quote_id', quote_id,
      'client_name', client_name,
      'items', coalesce(items, '[]'::jsonb),
      'requested_at', now()
    )
  );
end;
$$;

grant execute on function request_quote_revision(uuid, jsonb) to anon, authenticated;
