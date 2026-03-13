alter table public.quotes
  add column if not exists paid_at timestamptz;

create index if not exists idx_quotes_paid_at
  on public.quotes (paid_at desc);

update public.quotes
set paid_at = coalesce(paid_at, updated_at)
where paid_at is null
  and lower(coalesce(status::text, '')) in ('paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged');

create or replace function public.update_quote_status(quote_id uuid, next_status text)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.quotes;
  normalized_next_status text := lower(trim(coalesce(next_status, '')));
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  update public.quotes as q
  set status = next_status::public.quote_status_enum,
      updated_at = now(),
      paid_at = case
        when normalized_next_status in ('paid', 'cobrado', 'cobrados', 'pagado', 'pagados', 'charged')
          then coalesce(q.paid_at, now())
        else null
      end
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
