-- Hotfix RLS para quote_items:
-- Evita bloqueos al insertar items cuando existen politicas viejas/conflictivas.

alter table public.quote_items enable row level security;

grant select, insert, update, delete on table public.quote_items to authenticated;

create or replace function public.auth_user_owns_quote(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quotes q
    where q.id = p_quote_id
      and q.user_id = auth.uid()
  );
$$;

grant execute on function public.auth_user_owns_quote(uuid) to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quote_items'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
  loop
    execute format('drop policy if exists %I on public.quote_items', p.policyname);
  end loop;
end;
$$;

drop policy if exists "Users select own quote items" on public.quote_items;
create policy "Users select own quote items"
  on public.quote_items
  for select
  to authenticated
  using (public.auth_user_owns_quote(quote_id));

create policy "Users insert own quote items"
  on public.quote_items
  for insert
  to authenticated
  with check (public.auth_user_owns_quote(quote_id));

create policy "Users update own quote items"
  on public.quote_items
  for update
  to authenticated
  using (public.auth_user_owns_quote(quote_id))
  with check (public.auth_user_owns_quote(quote_id));

create policy "Users delete own quote items"
  on public.quote_items
  for delete
  to authenticated
  using (public.auth_user_owns_quote(quote_id));
