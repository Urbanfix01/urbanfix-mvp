-- Politicas para que el tecnico pueda editar sus presupuestos
alter table quotes enable row level security;

drop policy if exists "Users insert own quotes" on quotes;
drop policy if exists "Users update own quotes" on quotes;
drop policy if exists "Users delete own quotes" on quotes;

create policy "Users insert own quotes"
  on quotes for insert
  with check (auth.uid() = user_id);

create policy "Users update own quotes"
  on quotes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own quotes"
  on quotes for delete
  using (auth.uid() = user_id);
