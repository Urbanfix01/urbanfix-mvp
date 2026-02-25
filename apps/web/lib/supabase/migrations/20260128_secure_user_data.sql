-- Seguridad por usuario + acceso publico controlado
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_attachments enable row level security;
alter table public.profiles enable row level security;

-- Quotes: solo el propietario puede leer
drop policy if exists "Users select own quotes" on public.quotes;
create policy "Users select own quotes"
  on public.quotes for select
  using (auth.uid() = user_id);

-- Quote items: solo el propietario del presupuesto puede leer
drop policy if exists "Users select own quote items" on public.quote_items;
create policy "Users select own quote items"
  on public.quote_items for select
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and q.user_id = auth.uid()
    )
  );

-- Adjuntos: quitar lectura publica y permitir solo al propietario
drop policy if exists "Public Read Quote Attachments" on public.quote_attachments;
drop policy if exists "Users select own quote attachments" on public.quote_attachments;
create policy "Users select own quote attachments"
  on public.quote_attachments for select
  using (auth.uid() = user_id);

-- Profiles: cada usuario solo ve/edita su perfil
drop policy if exists "Users select own profiles" on public.profiles;
drop policy if exists "Users update own profiles" on public.profiles;
drop policy if exists "Users insert own profiles" on public.profiles;

create policy "Users select own profiles"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profiles"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users insert own profiles"
  on public.profiles for insert
  with check (auth.uid() = id);

-- RPC publico para visualizar un presupuesto por link (sin exponer listados)
create or replace function public.get_public_quote_bundle(quote_id uuid)
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
  status_text text;
begin
  select * into q from public.quotes where id = quote_id;
  if q.id is null then
    raise exception 'Presupuesto no encontrado.';
  end if;

  status_text := lower(q.status::text);
  if status_text in ('draft', 'borrador') then
    raise exception 'Presupuesto no disponible.';
  end if;

  select * into p from public.profiles where id = q.user_id;

  select coalesce(jsonb_agg(to_jsonb(qi.*)), '[]'::jsonb)
    into items
  from public.quote_items qi
  where qi.quote_id = quote_id;

  select coalesce(jsonb_agg(to_jsonb(qa.*) order by qa.created_at desc), '[]'::jsonb)
    into attachments
  from public.quote_attachments qa
  where qa.quote_id = quote_id;

  return jsonb_build_object(
    'quote', to_jsonb(q),
    'profile', to_jsonb(p),
    'items', items,
    'attachments', attachments
  );
end;
$$;

grant execute on function public.get_public_quote_bundle(uuid) to anon, authenticated;
