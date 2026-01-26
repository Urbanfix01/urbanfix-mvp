-- Políticas para que el técnico pueda editar items del presupuesto sin duplicar
alter table quote_items enable row level security;

drop policy if exists "Users insert own quote items" on quote_items;
drop policy if exists "Users update own quote items" on quote_items;
drop policy if exists "Users delete own quote items" on quote_items;

create policy "Users insert own quote items"
  on quote_items for insert
  with check (
    exists (
      select 1 from quotes q
      where q.id = quote_items.quote_id
        and q.user_id = auth.uid()
    )
  );

create policy "Users update own quote items"
  on quote_items for update
  using (
    exists (
      select 1 from quotes q
      where q.id = quote_items.quote_id
        and q.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from quotes q
      where q.id = quote_items.quote_id
        and q.user_id = auth.uid()
    )
  );

create policy "Users delete own quote items"
  on quote_items for delete
  using (
    exists (
      select 1 from quotes q
      where q.id = quote_items.quote_id
        and q.user_id = auth.uid()
    )
  );
