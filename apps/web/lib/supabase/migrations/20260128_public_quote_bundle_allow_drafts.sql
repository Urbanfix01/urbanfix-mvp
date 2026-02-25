-- Permitir ver presupuestos borradores/computo en links publicos
create or replace function public.get_public_quote_bundle(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
  p public.profiles;
  items jsonb;
  attachments jsonb;
begin
  select * into q from public.quotes where id = p_quote_id;
  if q.id is null then
    raise exception 'Presupuesto no encontrado.';
  end if;

  select * into p from public.profiles where id = q.user_id;

  select coalesce(jsonb_agg(to_jsonb(qi.*)), '[]'::jsonb)
    into items
  from public.quote_items qi
  where qi.quote_id = p_quote_id;

  select coalesce(jsonb_agg(to_jsonb(qa.*) order by qa.created_at desc), '[]'::jsonb)
    into attachments
  from public.quote_attachments qa
  where qa.quote_id = p_quote_id;

  return jsonb_build_object(
    'quote', to_jsonb(q),
    'profile', to_jsonb(p),
    'items', items,
    'attachments', attachments
  );
end;
$$;

grant execute on function public.get_public_quote_bundle(uuid) to anon, authenticated;
